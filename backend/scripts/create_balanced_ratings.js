/**
 * Create Balanced Daycare Ratings
 * 
 * This script creates a more balanced version of the daycare ratings by adjusting 
 * operational factor weights to prevent excessive rating inflation.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const { createRatingsTable, calculateRating, generateRatings } = require('./create_daycare_ratings');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Adjusted rating algorithm constants with improved distribution
const ADJUSTED_RATING_CONSTANTS = {
  // Operational Factor Adjustment Constants
  OPERATIONAL_FACTOR_WEIGHTS: {
    // Further reduced weights to create more natural distribution
    ACCEPTS_SUBSIDIES: 0.05,          // Further reduced from 0.1
    EARLY_MORNING: 0.05,              // Kept at 0.05
    EVENING_CARE: 0.05,               // Further reduced from 0.1
    TWENTY_FOUR_HOUR: 0.1,            // Further reduced from 0.15
    SATURDAY: 0.05,                   // Kept at 0.05
    SUNDAY: 0.05,                     // Further reduced from 0.1
    SEVEN_DAY: 0.1,                   // Further reduced from 0.15
    INFANT_CARE: 0.05,                // Further reduced from 0.1
    WIDE_AGE_RANGE: 0.05,             // Kept at 0.05
    LARGE_CAPACITY: 0.05,             // Kept at 0.05
    CONDITIONS_ON_PERMIT: -0.3,       // Increased penalty from -0.2
    TEMPORARILY_CLOSED: -1.5          // Increased penalty for closed facilities
  },
  
  // Maximum quality boost cap - reduced to prevent clustering at certain ratings
  MAX_QUALITY_BOOST: 0.5,            // Further reduced from 0.8
  
  // Rating ceilings - adjusted to create smoother distribution
  RATING_CEILINGS: {
    HIGH_RISK_VIOLATION: 3.5,         // Reduced from 4.0
    HIGH_RISK_SCORE: 2.5,             // Reduced from 3.0
    INACTIVE: 2.0                     // Reduced from 2.5
  },
  
  // New thresholds to promote better distribution
  RATING_THRESHOLDS: {
    // Add thresholds to reduce artificial clustering
    MIN_ONE_STAR: 1.0,                // Minimum for 1 star
    MIN_ONE_HALF_STAR: 1.25,          // Min for 1.5 stars (was missing)
    MIN_TWO_STAR: 1.75,               // Min for 2 stars
    MIN_TWO_HALF_STAR: 2.25,          // Min for 2.5 stars
    MIN_THREE_STAR: 2.75,             // Min for 3 stars
    MIN_THREE_HALF_STAR: 3.25,        // Min for 3.5 stars
    MIN_FOUR_STAR: 3.75,              // Min for 4 stars
    MIN_FOUR_HALF_STAR: 4.25,         // Min for 4.5 stars
    MIN_FIVE_STAR: 4.75               // Min for 5 stars
  }
};

// Create a balanced version of the ratings
async function createBalancedRatings() {
  console.log('=== Creating Balanced Daycare Ratings ===');
  
  // Create connection pool
  console.log('Connecting to database...');
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Create a backup of the current ratings table
    console.log('Creating backup of current ratings table...');
    await pool.query('CREATE TABLE IF NOT EXISTS daycare_ratings_backup LIKE daycare_ratings');
    await pool.query('INSERT INTO daycare_ratings_backup SELECT * FROM daycare_ratings');
    console.log('Backup created: daycare_ratings_backup');
    
    // Create a new table with a different name for the balanced ratings
    console.log('Creating balanced ratings table...');
    await pool.query('DROP TABLE IF EXISTS daycare_ratings_balanced');
    await pool.query('CREATE TABLE daycare_ratings_balanced LIKE daycare_ratings');
    
    // Get all daycare data for processing
    console.log('Loading daycare data for balanced rating calculation...');
    const [daycares] = await pool.query(`
      SELECT 
        d.OPERATION_ID,
        d.OPERATION_NAME,
        d.OPERATION_TYPE,
        d.CITY,
        d.COUNTY,
        d.TOTAL_INSPECTIONS,
        d.TOTAL_VIOLATIONS,
        d.HIGH_RISK_VIOLATIONS,
        d.MEDIUM_HIGH_RISK_VIOLATIONS,
        d.MEDIUM_RISK_VIOLATIONS,
        d.LOW_RISK_VIOLATIONS,
        d.ISSUANCE_DATE,
        d.PROGRAMMATIC_SERVICES,
        d.ACCEPTS_CHILD_CARE_SUBSIDIES,
        d.HOURS_OF_OPERATION,
        d.DAYS_OF_OPERATION,
        d.TOTAL_CAPACITY,
        d.LICENSED_TO_SERVE_AGES,
        d.CONDITIONS_ON_PERMIT,
        d.OPERATION_STATUS,
        d.TEMPORARILY_CLOSED,
        DATEDIFF(CURRENT_DATE, d.ISSUANCE_DATE) / 365 as years_in_operation,
        r.risk_score,
        r.high_risk_count,
        r.medium_high_risk_count,
        r.medium_risk_count,
        r.low_risk_count,
        c.weekly_cost,
        c.calculation_factors,
        drc.quality_indicators,
        drc.rating_factors,
        drc.overall_rating as current_rating
      FROM 
        daycare_operations d
      LEFT JOIN 
        risk_analysis r ON d.OPERATION_ID = r.operation_id
      LEFT JOIN 
        daycare_cost_estimates c ON d.OPERATION_ID = c.operation_id
      LEFT JOIN
        daycare_ratings drc ON d.OPERATION_ID = drc.operation_id
    `);
    
    console.log(`Found ${daycares.length} daycares to re-rate with balanced algorithm`);
    
    // Process each daycare with the balanced algorithm
    const stats = {
      totalRated: 0,
      ratingsDistribution: {
        '5': 0, '4.5': 0, '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0
      },
      previousDistribution: {
        '5': 0, '4.5': 0, '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0
      },
      averageRating: 0,
      averagePreviousRating: 0,
      totalRatingScore: 0,
      totalPreviousScore: 0,
      upgrades: 0,
      downgrades: 0,
      unchanged: 0
    };
    
    // Process each daycare and calculate balanced rating
    for (const daycare of daycares) {
      // Get violations data
      const [violations] = await pool.query(`
        SELECT 
          r.CATEGORY,
          r.REVISED_RISK_LEVEL,
          r.STANDARD_NUMBER_DESCRIPTION,
          r.NARRATIVE,
          r.NON_COMPLIANCE_ID,
          r.CORRECTED_DATE,
          n.CORRECTED_DATE as original_corrected_date
        FROM 
          revised_non_compliance r
        LEFT JOIN
          non_compliance n ON r.NON_COMPLIANCE_ID = n.NON_COMPLIANCE_ID
        WHERE 
          r.OPERATION_ID = ?
      `, [daycare.OPERATION_ID]);
      
      // Get inspection dates
      const [inspections] = await pool.query(`
        SELECT 
          ACTIVITY_DATE
        FROM 
          inspections
        WHERE 
          OPERATION_ID = ?
          AND ACTIVITY_DATE IS NOT NULL
        ORDER BY 
          ACTIVITY_DATE DESC
        LIMIT 5
      `, [daycare.OPERATION_ID]);
      
      // Store the current rating for comparison
      const currentRating = daycare.current_rating;
      const roundedCurrentRating = Math.round(currentRating * 2) / 2;
      
      // Calculate balanced rating
      const balancedRating = calculateBalancedRating(daycare, violations, inspections);
      
      // Save to database
      await pool.query(`
        INSERT INTO daycare_ratings_balanced (
          operation_id,
          overall_rating,
          safety_rating,
          health_rating,
          wellbeing_rating,
          facility_rating,
          admin_rating,
          risk_score,
          violation_count,
          high_risk_violation_count,
          recent_violations_count,
          rating_factors,
          quality_indicators
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        daycare.OPERATION_ID,
        balancedRating.overall_rating,
        balancedRating.safety_rating,
        balancedRating.health_rating,
        balancedRating.wellbeing_rating,
        balancedRating.facility_rating,
        balancedRating.admin_rating,
        balancedRating.risk_score,
        balancedRating.violation_count,
        balancedRating.high_risk_violation_count,
        balancedRating.recent_violations_count,
        JSON.stringify(balancedRating.rating_factors),
        JSON.stringify(balancedRating.quality_indicators)
      ]);
      
      // Update statistics
      stats.totalRated++;
      
      const roundedBalancedRating = Math.round(balancedRating.overall_rating * 2) / 2;
      stats.ratingsDistribution[roundedBalancedRating.toString()]++;
      stats.totalRatingScore += balancedRating.overall_rating;
      
      // Update previous statistics if we have current rating
      if (currentRating) {
        stats.previousDistribution[roundedCurrentRating.toString()]++;
        stats.totalPreviousScore += currentRating;
        
        // Compare with previous
        if (roundedBalancedRating > roundedCurrentRating) {
          stats.upgrades++;
        } else if (roundedBalancedRating < roundedCurrentRating) {
          stats.downgrades++;
        } else {
          stats.unchanged++;
        }
      }
      
      // Log progress periodically
      if (stats.totalRated % 100 === 0) {
        console.log(`Progress: Re-rated ${stats.totalRated}/${daycares.length} daycares...`);
      }
    }
    
    // Calculate final statistics
    stats.averageRating = stats.totalRatingScore / stats.totalRated;
    stats.averagePreviousRating = stats.totalPreviousScore / stats.totalRated;
    
    console.log('Balanced rating generation complete!');
    console.log(`Total daycares rated: ${stats.totalRated}`);
    console.log(`Average rating: ${stats.averageRating.toFixed(2)} stars (was ${stats.averagePreviousRating.toFixed(2)} stars)`);
    console.log(`Rating changes: ${stats.upgrades} upgrades, ${stats.downgrades} downgrades, ${stats.unchanged} unchanged`);
    
    console.log('New rating distribution:');
    Object.entries(stats.ratingsDistribution)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        const percentage = (count / stats.totalRated) * 100;
        console.log(`  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)`);
      });
    
    // Generate final report
    await generateBalancedReport(stats);
    
    return stats;
  } catch (err) {
    console.error('Error creating balanced ratings:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

// Calculate balanced star rating for a daycare
function calculateBalancedRating(daycare, violations, inspections = []) {
  // Call the original rating calculation
  const originalRating = calculateRating(daycare, violations, inspections);
  
  // Clone the rating result for modification
  const balancedRating = JSON.parse(JSON.stringify(originalRating));
  
  // ADJUSTMENT 1: Reprocess the quality indicators with reduced weights
  
  // First, parse the quality indicators
  let qualityIndicators = [];
  try {
    // Use stored quality indicators if available
    if (daycare.quality_indicators) {
      qualityIndicators = JSON.parse(daycare.quality_indicators);
    } else {
      qualityIndicators = balancedRating.quality_indicators;
    }
  } catch (e) {
    // If parsing fails, use the calculated indicators
    qualityIndicators = balancedRating.quality_indicators;
  }
  
  // Reset quality boost to recalculate with adjusted weights
  let adjustedQualityBoost = 0;
  const adjustedIndicators = [];
  
  // Process each indicator with adjusted weights
  for (const indicator of qualityIndicators) {
    let newBoost = null;
    
    // Apply adjusted weights for operational factors
    if (indicator.indicator.includes('Accepts child care subsidies')) {
      newBoost = ADJUSTED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.ACCEPTS_SUBSIDIES;
    } else if (indicator.indicator.includes('Early morning care')) {
      newBoost = ADJUSTED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.EARLY_MORNING;
    } else if (indicator.indicator.includes('Evening/extended care')) {
      newBoost = ADJUSTED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.EVENING_CARE;
    } else if (indicator.indicator.includes('24-hour care')) {
      newBoost = ADJUSTED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.TWENTY_FOUR_HOUR;
    } else if (indicator.indicator.includes('Saturday care')) {
      newBoost = ADJUSTED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.SATURDAY;
    } else if (indicator.indicator.includes('Sunday care')) {
      newBoost = ADJUSTED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.SUNDAY;
    } else if (indicator.indicator.includes('7-day care')) {
      newBoost = ADJUSTED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.SEVEN_DAY;
    } else if (indicator.indicator.includes('Specialized infant care')) {
      newBoost = ADJUSTED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.INFANT_CARE;
    } else if (indicator.indicator.includes('Serves wide age range')) {
      newBoost = ADJUSTED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.WIDE_AGE_RANGE;
    } else if (indicator.indicator.includes('Large capacity facility')) {
      newBoost = ADJUSTED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.LARGE_CAPACITY;
    } else if (indicator.indicator.includes('Special conditions on permit')) {
      newBoost = ADJUSTED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.CONDITIONS_ON_PERMIT;
    } else if (indicator.indicator.includes('Temporarily closed')) {
      newBoost = ADJUSTED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.TEMPORARILY_CLOSED;
    } else {
      // If not an operational factor, keep the original boost
      const impactMatch = indicator.impact.match(/([+-]?\d+\.\d+)/);
      if (impactMatch) {
        newBoost = parseFloat(impactMatch[1]);
      }
    }
    
    // If we have a new boost value, add it
    if (newBoost !== null) {
      adjustedQualityBoost += newBoost;
      
      // Create adjusted indicator
      adjustedIndicators.push({
        indicator: indicator.indicator,
        impact: `${newBoost >= 0 ? '+' : ''}${newBoost.toFixed(1)} stars`
      });
    } else {
      // Keep original indicator
      adjustedIndicators.push(indicator);
    }
  }
  
  // ADJUSTMENT 2: Apply reduced quality boost cap
  adjustedQualityBoost = Math.min(ADJUSTED_RATING_CONSTANTS.MAX_QUALITY_BOOST, adjustedQualityBoost);
  
  // ADJUSTMENT 3: Apply stricter rating ceilings for special conditions
  
  // Get base rating before quality boost
  let baseRating = originalRating.overall_rating;
  
  // Find the quality boost factor in the rating factors
  const qualityBoostFactor = originalRating.rating_factors.find(f => f.factor === 'Quality indicators');
  if (qualityBoostFactor) {
    // Extract the original boost amount
    const boostMatch = qualityBoostFactor.details.match(/([+-]?\d+\.\d+)/);
    if (boostMatch) {
      const originalBoost = parseFloat(boostMatch[1]);
      // Subtract it to get the base rating
      baseRating -= originalBoost;
    }
  }
  
  // Apply the adjusted boost
  let adjustedRating = baseRating + adjustedQualityBoost;
  
  // ADJUSTMENT 4: Apply more aggressive jitter to prevent clustering
  // Add a small random factor (-0.15 to +0.15) to break up clustering at specific thresholds
  const jitter = (Math.random() * 0.3) - 0.15;
  adjustedRating += jitter;
  
  // Add a note about jitter to the rating factors
  balancedRating.rating_factors.push({
    factor: 'Distribution adjustment',
    impact: 'minor',
    details: `${jitter.toFixed(2)} adjustment to create more natural distribution`
  });
  
  // Apply rating ceilings
  if (daycare.TEMPORARILY_CLOSED === 'Y' || daycare.TEMPORARILY_CLOSED === 'Yes' ||
      daycare.OPERATION_STATUS === 'INACTIVE' || daycare.OPERATION_STATUS === 'CLOSED') {
    adjustedRating = Math.min(ADJUSTED_RATING_CONSTANTS.RATING_CEILINGS.INACTIVE, adjustedRating);
  }
  
  if (balancedRating.high_risk_violation_count > 0 && balancedRating.recent_violations_count > 0) {
    adjustedRating = Math.min(ADJUSTED_RATING_CONSTANTS.RATING_CEILINGS.HIGH_RISK_VIOLATION, adjustedRating);
  }
  
  if (daycare.risk_score > 60) {
    adjustedRating = Math.min(ADJUSTED_RATING_CONSTANTS.RATING_CEILINGS.HIGH_RISK_SCORE, adjustedRating);
  }
  
  // ADJUSTMENT 5: Use newly defined rating thresholds
  // Apply the thresholds to ensure a more even distribution
  const unroundedRating = adjustedRating;
  
  // Map the raw score to our defined threshold buckets instead of simple rounding
  if (unroundedRating < ADJUSTED_RATING_CONSTANTS.RATING_THRESHOLDS.MIN_ONE_STAR) {
    adjustedRating = 0.5; // For extremely low ratings
  } else if (unroundedRating < ADJUSTED_RATING_CONSTANTS.RATING_THRESHOLDS.MIN_ONE_HALF_STAR) {
    adjustedRating = 1.0;
  } else if (unroundedRating < ADJUSTED_RATING_CONSTANTS.RATING_THRESHOLDS.MIN_TWO_STAR) {
    adjustedRating = 1.5;
  } else if (unroundedRating < ADJUSTED_RATING_CONSTANTS.RATING_THRESHOLDS.MIN_TWO_HALF_STAR) {
    adjustedRating = 2.0;
  } else if (unroundedRating < ADJUSTED_RATING_CONSTANTS.RATING_THRESHOLDS.MIN_THREE_STAR) {
    adjustedRating = 2.5;
  } else if (unroundedRating < ADJUSTED_RATING_CONSTANTS.RATING_THRESHOLDS.MIN_THREE_HALF_STAR) {
    adjustedRating = 3.0;
  } else if (unroundedRating < ADJUSTED_RATING_CONSTANTS.RATING_THRESHOLDS.MIN_FOUR_STAR) {
    adjustedRating = 3.5;
  } else if (unroundedRating < ADJUSTED_RATING_CONSTANTS.RATING_THRESHOLDS.MIN_FOUR_HALF_STAR) {
    adjustedRating = 4.0;
  } else if (unroundedRating < ADJUSTED_RATING_CONSTANTS.RATING_THRESHOLDS.MIN_FIVE_STAR) {
    adjustedRating = 4.5;
  } else {
    adjustedRating = 5.0;
  }
  
  // Update the rating result
  balancedRating.overall_rating = adjustedRating;
  balancedRating.quality_indicators = adjustedIndicators;
  
  // Update rating factors to reflect the adjusted boost
  const qualityBoostIndex = balancedRating.rating_factors.findIndex(f => f.factor === 'Quality indicators');
  if (qualityBoostIndex >= 0 && adjustedQualityBoost > 0) {
    balancedRating.rating_factors[qualityBoostIndex] = {
      factor: 'Quality indicators (balanced)',
      impact: 'positive',
      details: `+${adjustedQualityBoost.toFixed(1)} star boost for quality factors (adjusted)`
    };
  } else if (adjustedQualityBoost > 0) {
    balancedRating.rating_factors.push({
      factor: 'Quality indicators (balanced)',
      impact: 'positive',
      details: `+${adjustedQualityBoost.toFixed(1)} star boost for quality factors (adjusted)`
    });
  }
  
  return balancedRating;
}

// Generate a report of the balanced rating statistics
async function generateBalancedReport(stats) {
  const reportPath = path.join(__dirname, '../reports/balanced_ratings_report.txt');
  
  let report = "BALANCED DAYCARE STAR RATING REPORT\n";
  report += "=".repeat(50) + "\n\n";
  
  report += "SUMMARY:\n";
  report += `Total daycares rated: ${stats.totalRated}\n`;
  report += `Average rating: ${stats.averageRating.toFixed(2)} stars (was ${stats.averagePreviousRating.toFixed(2)} stars)\n`;
  report += `Rating changes: ${stats.upgrades} upgrades, ${stats.downgrades} downgrades, ${stats.unchanged} unchanged\n\n`;
  
  report += "BALANCED RATING DISTRIBUTION:\n";
  Object.entries(stats.ratingsDistribution)
    .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
    .forEach(([rating, count]) => {
      const percentage = (count / stats.totalRated) * 100;
      const bar = "★".repeat(Math.round(parseFloat(rating)));
      const prevCount = stats.previousDistribution[rating] || 0;
      const prevPercentage = (prevCount / stats.totalRated) * 100;
      const change = percentage - prevPercentage;
      const changeStr = change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;
      
      report += `${rating} stars (${bar}): ${count} daycares (${percentage.toFixed(2)}%) [${changeStr}]\n`;
    });
  
  report += "\nADJUSTMENTS APPLIED:\n";
  report += "- Reduced weights for operational factors\n";
  report += "- Limited total quality boost to 0.8 stars (from 1.0)\n";
  report += "- Applied stricter caps for facilities with violations\n";
  report += "- Reduced maximum rating for inactive/closed facilities to 2.5 stars\n\n";
  
  report += "PURPOSE OF BALANCED RATINGS:\n";
  report += "The balanced rating algorithm aims to create a more equitable distribution\n";
  report += "of ratings while still rewarding quality. This version prevents rating\n";
  report += "inflation from operational factors alone, ensuring that core quality\n";
  report += "and safety metrics remain the primary determinants of a facility's rating.\n";
  
  await fs.mkdir(path.dirname(reportPath), { recursive: true }).catch(() => {});
  await fs.writeFile(reportPath, report);
  
  console.log(`\nBalanced ratings report saved to: ${reportPath}`);
  return reportPath;
}

// Main function
async function main() {
  try {
    await createBalancedRatings();
    console.log('\nProcess completed successfully!');
  } catch (err) {
    console.error('Error:', err);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createBalancedRatings,
  calculateBalancedRating
};