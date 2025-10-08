#!/usr/bin/env node

/**
 * Update Daycare Ratings (Production Server Version)
 * 
 * This script updates both daycare_ratings and daycare_ratings_balanced tables
 * using the Unix socket connection method.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration using Unix socket for production server
const dbConfig = {
  socketPath: '/var/run/mysqld/mysqld.sock',  // Unix socket path
  user: 'root',
  password: 'Bd03021988!!',
  database: 'daycarealert',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Rating algorithm constants
const RATING_CONSTANTS = {
  // Risk score thresholds for base rating - adjusted to create more balanced distribution
  RISK_SCORE_THRESHOLDS: [
    { threshold: 5, baseRating: 5.0 },    // Extremely low risk (5 stars)
    { threshold: 15, baseRating: 4.5 },   // Very low risk (4.5 stars)
    { threshold: 25, baseRating: 4.0 },   // Low risk (4 stars)
    { threshold: 35, baseRating: 3.5 },   // Low-moderate risk (3.5 stars)
    { threshold: 45, baseRating: 3.0 },   // Moderate risk (3 stars)
    { threshold: 55, baseRating: 2.5 },   // Moderate-high risk (2.5 stars)
    { threshold: 70, baseRating: 2.0 },   // High risk (2 stars)
    { threshold: 85, baseRating: 1.5 },   // Very high risk (1.5 stars)
    { threshold: Infinity, baseRating: 1.0 }  // Extremely high risk (1 star)
  ],

  // Category weights for calculating category-specific scores
  CATEGORY_WEIGHTS: {
    'Safety': 2.0,              // Most important - direct safety impact
    'Child Well-being': 1.5,    // Very important for child development
    'Health': 1.5,              // Very important for child health
    'Sleep/Rest': 1.2,          // Important for infant safety especially
    'Transportation': 1.0,      // Important when provided
    'Facility': 0.8,            // Moderate importance
    'Administrative': 0.6,      // Increased importance (staff qualifications)
    'Paperwork': 0.4,           // Documentation of compliance
    'Nutrition': 1.0,           // Added for nutrition and meals
    'Physical Activity': 0.8    // Added for physical development
  },

  // Risk level weights for calculating violations impact
  RISK_LEVEL_WEIGHTS: {
    'High': 1.5,            
    'Medium High': 1.0,     
    'Medium': 0.6,          
    'Medium Low': 0.3,      
    'Low': 0.15             
  },

  // Time recency factors (more recent violations count more)
  TIME_RECENCY_FACTOR: {
    RECENT_3_MONTHS: 1.0,      // Last 3 months: full weight
    RECENT_6_MONTHS: 0.8,      // 3-6 months: 80% weight
    RECENT_12_MONTHS: 0.6,     // 6-12 months: 60% weight
    RECENT_24_MONTHS: 0.3,     // 12-24 months: 30% weight
    OLDER: 0.1                 // Older than 24 months: 10% weight
  }
};

// Constants for balanced ratings
const BALANCED_RATING_CONSTANTS = {
  // Operational Factor Adjustment Constants
  OPERATIONAL_FACTOR_WEIGHTS: {
    ACCEPTS_SUBSIDIES: 0.05,          
    EARLY_MORNING: 0.05,              
    EVENING_CARE: 0.05,               
    TWENTY_FOUR_HOUR: 0.1,            
    SATURDAY: 0.05,                   
    SUNDAY: 0.05,                     
    SEVEN_DAY: 0.1,                   
    INFANT_CARE: 0.05,                
    WIDE_AGE_RANGE: 0.05,             
    LARGE_CAPACITY: 0.05,             
    CONDITIONS_ON_PERMIT: -0.3,       
    TEMPORARILY_CLOSED: -1.5          
  },
  
  // Maximum quality boost cap
  MAX_QUALITY_BOOST: 0.5,
  
  // Rating ceilings
  RATING_CEILINGS: {
    HIGH_RISK_VIOLATION: 3.5,
    HIGH_RISK_SCORE: 2.5,
    INACTIVE: 2.0
  },
  
  // Rating thresholds
  RATING_THRESHOLDS: {
    MIN_ONE_STAR: 1.0,
    MIN_ONE_HALF_STAR: 1.25,
    MIN_TWO_STAR: 1.75,
    MIN_TWO_HALF_STAR: 2.25,
    MIN_THREE_STAR: 2.75,
    MIN_THREE_HALF_STAR: 3.25,
    MIN_FOUR_STAR: 3.75,
    MIN_FOUR_HALF_STAR: 4.25,
    MIN_FIVE_STAR: 4.75
  }
};

// Create/update the daycare_ratings table
async function createRatingsTable(pool) {
  console.log('Checking daycare_ratings table...');
  
  try {
    // First check if the table already exists
    const [tables] = await pool.query("SHOW TABLES LIKE 'daycare_ratings'");
    
    if (tables.length === 0) {
      console.log('Creating daycare_ratings table...');
      await pool.query(`
        CREATE TABLE daycare_ratings (
          id INT NOT NULL AUTO_INCREMENT,
          operation_id VARCHAR(50) NOT NULL,
          overall_rating DECIMAL(2,1) NOT NULL,
          
          /* Original category ratings */
          safety_rating DECIMAL(2,1),
          health_rating DECIMAL(2,1),
          wellbeing_rating DECIMAL(2,1),
          facility_rating DECIMAL(2,1),
          admin_rating DECIMAL(2,1),
          
          /* New subcategory ratings on 1-10 scale */
          safety_compliance_score DECIMAL(3,1),
          operational_quality_score DECIMAL(3,1),
          educational_programming_score DECIMAL(3,1),
          staff_qualifications_score DECIMAL(3,1),
          
          /* Original fields */
          risk_score DECIMAL(5,2),
          violation_count INT DEFAULT 0,
          high_risk_violation_count INT DEFAULT 0,
          recent_violations_count INT DEFAULT 0,
          rating_factors TEXT,
          quality_indicators TEXT,
          
          /* Additional data for tiered display */
          subcategory_data TEXT,
          
          last_updated TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY (operation_id),
          INDEX (overall_rating),
          INDEX (safety_rating),
          INDEX (health_rating),
          INDEX (safety_compliance_score),
          INDEX (operational_quality_score)
        )
      `);
      console.log('Table created successfully!');
    } else {
      console.log('daycare_ratings table already exists, creating backup...');
      // Create a backup of the current table
      await pool.query('DROP TABLE IF EXISTS daycare_ratings_backup');
      await pool.query('CREATE TABLE daycare_ratings_backup LIKE daycare_ratings');
      await pool.query('INSERT INTO daycare_ratings_backup SELECT * FROM daycare_ratings');
      console.log('Backup created successfully!');
      
      // Truncate the current table
      await pool.query('TRUNCATE TABLE daycare_ratings');
      console.log('Existing table cleared, ready for new data');
    }
    
    return true;
  } catch (err) {
    console.error('Error managing daycare_ratings table:', err.message);
    return false;
  }
}

// Create/update the daycare_ratings_balanced table
async function createBalancedRatingsTable(pool) {
  console.log('Checking daycare_ratings_balanced table...');
  
  try {
    // First check if the table already exists
    const [tables] = await pool.query("SHOW TABLES LIKE 'daycare_ratings_balanced'");
    
    if (tables.length === 0) {
      console.log('Creating daycare_ratings_balanced table...');
      await pool.query(`
        CREATE TABLE daycare_ratings_balanced (
          id INT NOT NULL AUTO_INCREMENT,
          operation_id VARCHAR(50) NOT NULL,
          overall_rating DECIMAL(3,1) NOT NULL,
          
          /* Original category ratings */
          safety_rating DECIMAL(3,1),
          health_rating DECIMAL(3,1),
          wellbeing_rating DECIMAL(3,1),
          facility_rating DECIMAL(3,1),
          admin_rating DECIMAL(3,1),
          
          /* Original fields */
          risk_score DECIMAL(5,2),
          violation_count INT DEFAULT 0,
          high_risk_violation_count INT DEFAULT 0,
          recent_violations_count INT DEFAULT 0,
          rating_factors TEXT,
          quality_indicators TEXT,
          
          last_updated TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY (operation_id),
          INDEX (overall_rating),
          INDEX (safety_rating),
          INDEX (health_rating)
        )
      `);
      console.log('Table created successfully!');
    } else {
      console.log('daycare_ratings_balanced table already exists, creating backup...');
      // Create a backup of the current table
      await pool.query('DROP TABLE IF EXISTS daycare_ratings_balanced_backup');
      await pool.query('CREATE TABLE daycare_ratings_balanced_backup LIKE daycare_ratings_balanced');
      await pool.query('INSERT INTO daycare_ratings_balanced_backup SELECT * FROM daycare_ratings_balanced');
      console.log('Backup created successfully!');
      
      // Truncate the current table
      await pool.query('TRUNCATE TABLE daycare_ratings_balanced');
      console.log('Existing table cleared, ready for new data');
    }
    
    return true;
  } catch (err) {
    console.error('Error managing daycare_ratings_balanced table:', err.message);
    return false;
  }
}

// Process all daycares for ratings
async function generateRatings(pool) {
  console.log('Generating daycare ratings...');
  
  try {
    // Get list of all daycares with related data including operational factors
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
        r.low_risk_count
      FROM 
        daycare_operations d
      LEFT JOIN 
        risk_analysis r ON d.OPERATION_ID = r.operation_id
    `);
    
    console.log(`Found ${daycares.length} daycares to rate`);
    
    // Track rating statistics
    const stats = {
      totalRated: 0,
      standardRatings: {
        '5': 0, '4.5': 0, '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0
      },
      balancedRatings: {
        '5': 0, '4.5': 0, '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0
      },
      avgStandardRating: 0,
      avgBalancedRating: 0,
      totalStandardScore: 0,
      totalBalancedScore: 0
    };
    
    // Process daycares in batches to avoid memory issues
    const batchSize = 500;
    const totalBatches = Math.ceil(daycares.length / batchSize);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * batchSize;
      const endIdx = Math.min((batchIndex + 1) * batchSize, daycares.length);
      
      console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (records ${startIdx + 1}-${endIdx})`);
      
      // Process daycares in this batch
      for (let i = startIdx; i < endIdx; i++) {
        const daycare = daycares[i];
        
        // Skip if missing required data
        if (!daycare.OPERATION_ID) {
          console.log(`Skipping daycare with missing OPERATION_ID`);
          continue;
        }
        
        // Get violation data for this daycare
        const [violations] = await pool.query(`
          SELECT 
            r.CATEGORY,
            r.REVISED_RISK_LEVEL,
            r.STANDARD_NUMBER_DESCRIPTION,
            r.NARRATIVE,
            r.ACTIVITY_DATE,
            r.CORRECTED_DATE
          FROM 
            revised_non_compliance r
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
        
        // Calculate ratings
        const standardRating = calculateStandardRating(daycare, violations, inspections);
        const balancedRating = calculateBalancedRating(daycare, violations, inspections, standardRating);
        
        // Save ratings to database
        await saveRatingToDB(pool, daycare.OPERATION_ID, standardRating, 'daycare_ratings');
        await saveRatingToDB(pool, daycare.OPERATION_ID, balancedRating, 'daycare_ratings_balanced');
        
        // Update statistics
        stats.totalRated++;
        
        const roundedStandardRating = Math.round(standardRating.overall_rating * 2) / 2;
        const roundedBalancedRating = Math.round(balancedRating.overall_rating * 2) / 2;
        
        // Track distribution
        stats.standardRatings[roundedStandardRating.toString()]++;
        stats.balancedRatings[roundedBalancedRating.toString()]++;
        
        stats.totalStandardScore += standardRating.overall_rating;
        stats.totalBalancedScore += balancedRating.overall_rating;
        
        // Log progress periodically
        if ((i - startIdx + 1) % 100 === 0 || i === endIdx - 1) {
          console.log(`Batch progress: Processed ${i - startIdx + 1}/${endIdx - startIdx} daycares...`);
        }
      }
      
      // Add a small delay between batches to allow garbage collection
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Calculate final statistics
    stats.avgStandardRating = stats.totalStandardScore / stats.totalRated;
    stats.avgBalancedRating = stats.totalBalancedScore / stats.totalRated;
    
    console.log('\nRating generation complete!');
    console.log(`Total daycares rated: ${stats.totalRated}`);
    console.log(`Average standard rating: ${stats.avgStandardRating.toFixed(2)} stars`);
    console.log(`Average balanced rating: ${stats.avgBalancedRating.toFixed(2)} stars`);
    
    console.log('\nStandard rating distribution:');
    Object.entries(stats.standardRatings)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        if (count > 0) {
          const percentage = (count / stats.totalRated) * 100;
          console.log(`  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)`);
        }
      });
    
    console.log('\nBalanced rating distribution:');
    Object.entries(stats.balancedRatings)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        if (count > 0) {
          const percentage = (count / stats.totalRated) * 100;
          console.log(`  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)`);
        }
      });
    
    return stats;
  } catch (err) {
    console.error('Error generating ratings:', err);
    throw err;
  }
}

// Calculate standard rating for a daycare
function calculateStandardRating(daycare, violations, inspections) {
  // Initialize rating object
  const rating = {
    overall_rating: 3.0, // Default is 3 stars if no data
    safety_rating: null,
    health_rating: null,
    wellbeing_rating: null,
    facility_rating: null,
    admin_rating: null,
    risk_score: daycare.risk_score || 0,
    violation_count: violations.length,
    high_risk_violation_count: 0,
    recent_violations_count: 0,
    rating_factors: [],
    quality_indicators: [],
    safety_compliance_score: null,
    operational_quality_score: null,
    educational_programming_score: null,
    staff_qualifications_score: null,
    subcategory_data: null
  };
  
  // Count recent and high-risk violations
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  violations.forEach(violation => {
    // Count high risk violations
    if (violation.REVISED_RISK_LEVEL === 'High') {
      rating.high_risk_violation_count++;
    }
    
    // Count recent violations
    if (violation.ACTIVITY_DATE) {
      const activityDate = new Date(violation.ACTIVITY_DATE);
      if (!isNaN(activityDate.getTime()) && activityDate >= oneYearAgo) {
        rating.recent_violations_count++;
      }
    }
  });
  
  // Calculate base rating from risk score
  if (daycare.risk_score !== null && daycare.risk_score !== undefined) {
    // Find appropriate base rating from thresholds
    for (const { threshold, baseRating } of RATING_CONSTANTS.RISK_SCORE_THRESHOLDS) {
      if (daycare.risk_score <= threshold) {
        rating.overall_rating = baseRating;
        break;
      }
    }
    
    // Track reasoning for this rating
    rating.rating_factors.push({
      factor: 'Base risk score',
      impact: 'primary',
      details: `Risk score of ${typeof daycare.risk_score === 'number' ? daycare.risk_score.toFixed(2) : daycare.risk_score} corresponds to a ${rating.overall_rating} star base rating`
    });
  } else {
    // No risk score, use violation counts as fallback
    const highViolations = daycare.HIGH_RISK_VIOLATIONS || 0;
    const medHighViolations = daycare.MEDIUM_HIGH_RISK_VIOLATIONS || 0;
    const medViolations = daycare.MEDIUM_RISK_VIOLATIONS || 0;
    
    // Simple algorithm based on violation counts
    if (highViolations > 5 || (highViolations + medHighViolations) > 10) {
      rating.overall_rating = 1.0;
    } else if (highViolations > 2 || (highViolations + medHighViolations) > 5) {
      rating.overall_rating = 2.0;
    } else if (highViolations > 0 || medHighViolations > 2 || medViolations > 5) {
      rating.overall_rating = 3.0;
    } else if (medHighViolations > 0 || medViolations > 2) {
      rating.overall_rating = 4.0;
    } else {
      rating.overall_rating = 5.0;
    }
    
    // Track reasoning for this rating
    rating.rating_factors.push({
      factor: 'Violation counts',
      impact: 'primary',
      details: `${highViolations} high, ${medHighViolations} medium-high, and ${medViolations} medium risk violations`
    });
  }
  
  // Create quality indicators based on operational factors
  let qualityBoost = 0;
  const qualityIndicators = [];
  
  // Check operational factors
  
  // Accept subsidies
  if (daycare.ACCEPTS_CHILD_CARE_SUBSIDIES === 'Y' || daycare.ACCEPTS_CHILD_CARE_SUBSIDIES === 'Yes') {
    const subsidyBoost = 0.1;
    qualityBoost += subsidyBoost;
    qualityIndicators.push({
      indicator: 'Accepts child care subsidies',
      impact: `+${subsidyBoost.toFixed(2)} stars`,
      category: 'operational'
    });
  }
  
  // Check for extended hours of operation
  if (daycare.HOURS_OF_OPERATION) {
    const hours = daycare.HOURS_OF_OPERATION.toUpperCase();
    
    // Check for early morning care
    if (hours.includes('5:') || hours.includes('6:00') || hours.includes('6:15')) {
      const earlyHoursBoost = 0.05;
      qualityBoost += earlyHoursBoost;
      qualityIndicators.push({
        indicator: 'Early morning care available',
        impact: `+${earlyHoursBoost.toFixed(2)} stars`,
        category: 'operational'
      });
    }
    
    // Check for late evening care
    if (hours.includes('7:') || hours.includes('8:') || hours.includes('9:') || 
        hours.includes('10:') || hours.includes('11:') || hours.includes('12 AM')) {
      const lateHoursBoost = 0.1;
      qualityBoost += lateHoursBoost;
      qualityIndicators.push({
        indicator: 'Evening/extended care available',
        impact: `+${lateHoursBoost.toFixed(2)} stars`,
        category: 'operational'
      });
    }
    
    // Check for 24-hour care
    if (hours.includes('24 HOUR') || hours.includes('24-HOUR') || hours.includes('24/7')) {
      const allDayBoost = 0.15;
      qualityBoost += allDayBoost;
      qualityIndicators.push({
        indicator: '24-hour care available',
        impact: `+${allDayBoost.toFixed(2)} stars`,
        category: 'operational'
      });
    }
  }
  
  // Check for weekend operation
  if (daycare.DAYS_OF_OPERATION) {
    const days = daycare.DAYS_OF_OPERATION.toUpperCase();
    
    // Check for Saturday operation
    if (days.includes('SATURDAY') || days.includes('SAT')) {
      const saturdayBoost = 0.05;
      qualityBoost += saturdayBoost;
      qualityIndicators.push({
        indicator: 'Saturday care available',
        impact: `+${saturdayBoost.toFixed(2)} stars`,
        category: 'operational'
      });
    }
    
    // Check for Sunday operation
    if (days.includes('SUNDAY') || days.includes('SUN')) {
      const sundayBoost = 0.1;
      qualityBoost += sundayBoost;
      qualityIndicators.push({
        indicator: 'Sunday care available',
        impact: `+${sundayBoost.toFixed(2)} stars`,
        category: 'operational'
      });
    }
    
    // Check for 7-day operation
    if (days.includes('7 DAY') || days.includes('SEVEN DAY') || days.includes('EVERYDAY')) {
      const allWeekBoost = 0.15;
      qualityBoost += allWeekBoost;
      qualityIndicators.push({
        indicator: '7-day care available',
        impact: `+${allWeekBoost.toFixed(2)} stars`,
        category: 'operational'
      });
    }
  }
  
  // Check for special conditions (negative factor)
  if (daycare.CONDITIONS_ON_PERMIT === 'Y' || daycare.CONDITIONS_ON_PERMIT === 'Yes') {
    const conditionsPenalty = -0.3;
    qualityBoost += conditionsPenalty;
    qualityIndicators.push({
      indicator: 'Special conditions on permit',
      impact: `${conditionsPenalty.toFixed(1)} stars`,
      category: 'operational'
    });
  }
  
  // Check capacity
  if (daycare.TOTAL_CAPACITY) {
    const capacity = parseInt(daycare.TOTAL_CAPACITY, 10);
    if (!isNaN(capacity) && capacity > 100) {
      const largeCapacityBoost = 0.05;
      qualityBoost += largeCapacityBoost;
      qualityIndicators.push({
        indicator: 'Large capacity facility',
        impact: `+${largeCapacityBoost.toFixed(2)} stars`,
        category: 'operational'
      });
    }
  }
  
  // Special age-group offerings
  if (daycare.LICENSED_TO_SERVE_AGES) {
    const ageGroups = daycare.LICENSED_TO_SERVE_AGES.toUpperCase();
    
    // Check for infant care
    if (ageGroups.includes('INFANT') || ageGroups.includes('0-17 MONTHS')) {
      const infantCareBoost = 0.1;
      qualityBoost += infantCareBoost;
      qualityIndicators.push({
        indicator: 'Specialized infant care',
        impact: `+${infantCareBoost.toFixed(2)} stars`,
        category: 'operational'
      });
    }
    
    // Check for broad age range
    if ((ageGroups.includes('INFANT') || ageGroups.includes('0-17')) && 
        (ageGroups.includes('SCHOOL') || ageGroups.includes('5 YEARS'))) {
      const ageRangeBoost = 0.05;
      qualityBoost += ageRangeBoost;
      qualityIndicators.push({
        indicator: 'Serves wide age range',
        impact: `+${ageRangeBoost.toFixed(2)} stars`,
        category: 'operational'
      });
    }
  }
  
  // Check programmatic services for quality features (curriculum, etc.)
  if (daycare.PROGRAMMATIC_SERVICES) {
    const services = daycare.PROGRAMMATIC_SERVICES.toUpperCase();
    
    // Check for premium curriculum methods
    const curriculumTypes = {
      'MONTESSORI': 0.4,
      'REGGIO EMILIA': 0.4,
      'WALDORF': 0.4,
      'STEM': 0.3,
      'STEAM': 0.3,
      'BILINGUAL': 0.3
    };
    
    Object.entries(curriculumTypes).forEach(([curriculum, boost]) => {
      if (services.includes(curriculum)) {
        qualityBoost += boost;
        qualityIndicators.push({
          indicator: `${curriculum.charAt(0) + curriculum.slice(1).toLowerCase()} curriculum`,
          impact: `+${boost.toFixed(1)} stars`
        });
      }
    });
    
    // Check for accreditations
    const accreditations = {
      'NAEYC': 0.5,
      'TEXAS RISING STAR': 0.5,
      'ACCREDITED': 0.3
    };
    
    Object.entries(accreditations).forEach(([accreditation, boost]) => {
      if (services.includes(accreditation)) {
        qualityBoost += boost;
        qualityIndicators.push({
          indicator: `${accreditation.charAt(0) + accreditation.slice(1).toLowerCase()} accreditation`,
          impact: `+${boost.toFixed(1)} stars`
        });
      }
    });
  }
  
  // Experience boost for long-established daycares
  if (daycare.years_in_operation > 10) {
    const experienceBoost = Math.min(0.3, (daycare.years_in_operation - 10) * 0.02);
    qualityBoost += experienceBoost;
    qualityIndicators.push({
      indicator: `${Math.round(daycare.years_in_operation)} years experience`,
      impact: `+${experienceBoost.toFixed(1)} stars`
    });
  }
  
  // Cap the total quality boost at 1.0 stars
  qualityBoost = Math.min(1.0, qualityBoost);
  
  // Apply the boost to the overall rating
  if (qualityBoost !== 0) {
    const originalRating = rating.overall_rating;
    rating.overall_rating = Math.min(5.0, Math.max(1.0, originalRating + qualityBoost));
    
    // Track this adjustment
    rating.rating_factors.push({
      factor: 'Quality indicators',
      impact: qualityBoost > 0 ? 'positive' : 'negative',
      details: `${qualityBoost > 0 ? '+' : ''}${qualityBoost.toFixed(1)} star ${qualityBoost > 0 ? 'boost' : 'penalty'} for quality factors`
    });
  }
  
  // Save quality indicators to result
  rating.quality_indicators = qualityIndicators;
  
  // Final adjustments for specific conditions
  
  // If temporarily closed, cap rating
  if (daycare.TEMPORARILY_CLOSED === 'Y' || daycare.TEMPORARILY_CLOSED === 'Yes' ||
      daycare.OPERATION_STATUS === 'INACTIVE' || daycare.OPERATION_STATUS === 'CLOSED') {
    const originalRating = rating.overall_rating;
    rating.overall_rating = Math.min(2.5, originalRating);
    
    if (originalRating > 2.5) {
      rating.rating_factors.push({
        factor: 'Temporarily closed',
        impact: 'major negative',
        details: 'Maximum rating capped at 2.5 due to facility being temporarily closed or inactive'
      });
    }
  }
  
  // Recent serious violations can cap the maximum rating
  if (rating.high_risk_violation_count > 0 && rating.recent_violations_count > 0) {
    const originalRating = rating.overall_rating;
    rating.overall_rating = Math.min(4.0, originalRating);
    
    if (originalRating > 4.0) {
      rating.rating_factors.push({
        factor: 'Recent high-risk violations',
        impact: 'negative',
        details: 'Maximum rating capped at 4.0 due to recent serious violations'
      });
    }
  }
  
  // Very high-risk daycares can't exceed 3 stars
  if (daycare.risk_score > 60) {
    const originalRating = rating.overall_rating;
    rating.overall_rating = Math.min(3.0, originalRating);
    
    if (originalRating > 3.0) {
      rating.rating_factors.push({
        factor: 'High overall risk',
        impact: 'major negative',
        details: 'Maximum rating capped at 3.0 due to significant risk factors'
      });
    }
  }
  
  // Finally, round to nearest 0.5
  rating.overall_rating = Math.round(rating.overall_rating * 2) / 2;
  
  // Add subcategory scores (simplified version)
  rating.safety_compliance_score = calculateSubcategoryScore(daycare, 'safety', rating);
  rating.operational_quality_score = calculateSubcategoryScore(daycare, 'operational', rating);
  rating.educational_programming_score = calculateSubcategoryScore(daycare, 'educational', rating);
  rating.staff_qualifications_score = calculateSubcategoryScore(daycare, 'staff', rating);
  
  // Create subcategory data for API
  rating.subcategory_data = JSON.stringify({
    scores: {
      safety_compliance: rating.safety_compliance_score,
      operational_quality: rating.operational_quality_score,
      educational_programming: rating.educational_programming_score,
      staff_qualifications: rating.staff_qualifications_score
    },
    descriptions: {
      safety_compliance: "Measures regulatory compliance and safety factors including violation history, risk scores, and safety protocols.",
      operational_quality: "Evaluates hours of operation, weekend availability, subsidy acceptance, and other operational conveniences.",
      educational_programming: "Assesses curriculum quality, accreditations, and educational approach based on available information.",
      staff_qualifications: "Examines staff credentials, training levels, and professional development opportunities."
    }
  });
  
  return rating;
}

// Calculate balanced rating for a daycare
function calculateBalancedRating(daycare, violations, inspections, standardRating) {
  // Clone the standard rating to create a balanced version
  const balancedRating = JSON.parse(JSON.stringify(standardRating));
  
  // Reset the overall rating to the base score
  // First identify the quality boost from rating factors
  let baseRating = balancedRating.overall_rating;
  let qualityBoost = 0;
  
  const qualityBoostFactor = balancedRating.rating_factors.find(f => f.factor === 'Quality indicators');
  if (qualityBoostFactor) {
    // Extract the original boost amount
    const boostMatch = qualityBoostFactor.details.match(/([+-]?\d+\.\d+)/);
    if (boostMatch) {
      qualityBoost = parseFloat(boostMatch[1]);
      // Subtract it to get the base rating before boosting
      baseRating -= qualityBoost;
    }
  }
  
  // Recalculate quality boost with more balanced weights
  let adjustedQualityBoost = 0;
  const adjustedIndicators = [];
  
  // Process each indicator with adjusted weights
  for (const indicator of balancedRating.quality_indicators) {
    let newBoost = null;
    
    // Apply adjusted weights for operational factors
    if (indicator.indicator.includes('Accepts child care subsidies')) {
      newBoost = BALANCED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.ACCEPTS_SUBSIDIES;
    } else if (indicator.indicator.includes('Early morning care')) {
      newBoost = BALANCED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.EARLY_MORNING;
    } else if (indicator.indicator.includes('Evening/extended care')) {
      newBoost = BALANCED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.EVENING_CARE;
    } else if (indicator.indicator.includes('24-hour care')) {
      newBoost = BALANCED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.TWENTY_FOUR_HOUR;
    } else if (indicator.indicator.includes('Saturday care')) {
      newBoost = BALANCED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.SATURDAY;
    } else if (indicator.indicator.includes('Sunday care')) {
      newBoost = BALANCED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.SUNDAY;
    } else if (indicator.indicator.includes('7-day care')) {
      newBoost = BALANCED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.SEVEN_DAY;
    } else if (indicator.indicator.includes('Specialized infant care')) {
      newBoost = BALANCED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.INFANT_CARE;
    } else if (indicator.indicator.includes('Serves wide age range')) {
      newBoost = BALANCED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.WIDE_AGE_RANGE;
    } else if (indicator.indicator.includes('Large capacity facility')) {
      newBoost = BALANCED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.LARGE_CAPACITY;
    } else if (indicator.indicator.includes('Special conditions on permit')) {
      newBoost = BALANCED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.CONDITIONS_ON_PERMIT;
    } else if (indicator.indicator.includes('Temporarily closed')) {
      newBoost = BALANCED_RATING_CONSTANTS.OPERATIONAL_FACTOR_WEIGHTS.TEMPORARILY_CLOSED;
    } else {
      // For non-operational factors, reduce them by 25%
      const impactMatch = indicator.impact.match(/([+-]?\d+\.\d+)/);
      if (impactMatch) {
        newBoost = parseFloat(impactMatch[1]) * 0.75;
      }
    }
    
    // If we have a new boost value, add it
    if (newBoost !== null) {
      adjustedQualityBoost += newBoost;
      
      // Create adjusted indicator
      adjustedIndicators.push({
        indicator: indicator.indicator,
        impact: `${newBoost >= 0 ? '+' : ''}${newBoost.toFixed(2)} stars`,
        category: indicator.category
      });
    } else {
      // Keep original indicator
      adjustedIndicators.push(indicator);
    }
  }
  
  // Apply maximum quality boost cap
  adjustedQualityBoost = Math.min(BALANCED_RATING_CONSTANTS.MAX_QUALITY_BOOST, adjustedQualityBoost);
  
  // Apply adjusted quality boost to base rating
  let adjustedRating = baseRating + adjustedQualityBoost;
  
  // Apply rating ceilings
  if (daycare.TEMPORARILY_CLOSED === 'Y' || daycare.TEMPORARILY_CLOSED === 'Yes' ||
      daycare.OPERATION_STATUS === 'INACTIVE' || daycare.OPERATION_STATUS === 'CLOSED') {
    adjustedRating = Math.min(BALANCED_RATING_CONSTANTS.RATING_CEILINGS.INACTIVE, adjustedRating);
  }
  
  if (balancedRating.high_risk_violation_count > 0 && balancedRating.recent_violations_count > 0) {
    adjustedRating = Math.min(BALANCED_RATING_CONSTANTS.RATING_CEILINGS.HIGH_RISK_VIOLATION, adjustedRating);
  }
  
  if (daycare.risk_score > 60) {
    adjustedRating = Math.min(BALANCED_RATING_CONSTANTS.RATING_CEILINGS.HIGH_RISK_SCORE, adjustedRating);
  }
  
  // Apply rating thresholds for even distribution
  let finalRating;
  
  if (adjustedRating < BALANCED_RATING_CONSTANTS.RATING_THRESHOLDS.MIN_ONE_STAR) {
    finalRating = 0.5; // For extremely poor ratings
  } else if (adjustedRating < BALANCED_RATING_CONSTANTS.RATING_THRESHOLDS.MIN_ONE_HALF_STAR) {
    finalRating = 1.0;
  } else if (adjustedRating < BALANCED_RATING_CONSTANTS.RATING_THRESHOLDS.MIN_TWO_STAR) {
    finalRating = 1.5;
  } else if (adjustedRating < BALANCED_RATING_CONSTANTS.RATING_THRESHOLDS.MIN_TWO_HALF_STAR) {
    finalRating = 2.0;
  } else if (adjustedRating < BALANCED_RATING_CONSTANTS.RATING_THRESHOLDS.MIN_THREE_STAR) {
    finalRating = 2.5;
  } else if (adjustedRating < BALANCED_RATING_CONSTANTS.RATING_THRESHOLDS.MIN_THREE_HALF_STAR) {
    finalRating = 3.0;
  } else if (adjustedRating < BALANCED_RATING_CONSTANTS.RATING_THRESHOLDS.MIN_FOUR_STAR) {
    finalRating = 3.5;
  } else if (adjustedRating < BALANCED_RATING_CONSTANTS.RATING_THRESHOLDS.MIN_FOUR_HALF_STAR) {
    finalRating = 4.0;
  } else if (adjustedRating < BALANCED_RATING_CONSTANTS.RATING_THRESHOLDS.MIN_FIVE_STAR) {
    finalRating = 4.5;
  } else {
    finalRating = 5.0;
  }
  
  // Update the rating result
  balancedRating.overall_rating = finalRating;
  balancedRating.quality_indicators = adjustedIndicators;
  
  // Update rating factors to reflect the adjusted boost
  const qualityFactorIndex = balancedRating.rating_factors.findIndex(f => f.factor === 'Quality indicators');
  if (qualityFactorIndex >= 0 && adjustedQualityBoost !== 0) {
    balancedRating.rating_factors[qualityFactorIndex] = {
      factor: 'Quality indicators (balanced)',
      impact: adjustedQualityBoost > 0 ? 'positive' : 'negative',
      details: `${adjustedQualityBoost > 0 ? '+' : ''}${adjustedQualityBoost.toFixed(2)} star ${adjustedQualityBoost > 0 ? 'boost' : 'penalty'} for quality factors (balanced scale)`
    };
  } else if (adjustedQualityBoost !== 0) {
    balancedRating.rating_factors.push({
      factor: 'Quality indicators (balanced)',
      impact: adjustedQualityBoost > 0 ? 'positive' : 'negative',
      details: `${adjustedQualityBoost > 0 ? '+' : ''}${adjustedQualityBoost.toFixed(2)} star ${adjustedQualityBoost > 0 ? 'boost' : 'penalty'} for quality factors (balanced scale)`
    });
  }
  
  // Add balanced distribution note
  balancedRating.rating_factors.push({
    factor: 'Balanced distribution',
    impact: 'informational',
    details: 'Rating adjusted to create more balanced distribution across all daycares'
  });
  
  return balancedRating;
}

// Calculate subcategory scores (1-10 scale)
function calculateSubcategoryScore(daycare, category, rating) {
  let score = 5.0; // Start with midpoint
  
  switch (category) {
    case 'safety':
      // Base on risk score and violations
      if (daycare.risk_score) {
        // Convert risk score (0-100+) to 1-10 scale (inverse relationship)
        score = Math.max(1, 10 - (daycare.risk_score / 10));
      } else {
        // Adjust based on violation counts
        score -= (rating.high_risk_violation_count * 1.5);
        score -= (rating.violation_count - rating.high_risk_violation_count) * 0.5;
      }
      break;
      
    case 'operational':
      // Based on operational indicators
      rating.quality_indicators.forEach(indicator => {
        if (indicator.category === 'operational') {
          const impactMatch = indicator.impact.match(/([+-]?\d+\.\d+)/);
          if (impactMatch) {
            const boostValue = parseFloat(impactMatch[1]) * 5; // Convert to 10-point scale
            score += boostValue;
          }
        }
      });
      
      // Adjust for operational status
      if (daycare.TEMPORARILY_CLOSED === 'Y' || daycare.OPERATION_STATUS === 'INACTIVE') {
        score = Math.max(1, score - 5);
      }
      break;
      
    case 'educational':
      // Look for educational keywords in programmatic services
      if (daycare.PROGRAMMATIC_SERVICES) {
        const services = daycare.PROGRAMMATIC_SERVICES.toUpperCase();
        
        // Check for premium curriculum methods
        const curriculumKeywords = [
          'MONTESSORI', 'REGGIO', 'WALDORF', 'STEM', 'STEAM', 'BILINGUAL',
          'CURRICULUM', 'EDUCATION', 'LEARNING', 'DEVELOPMENT', 'ACADEMIC'
        ];
        
        curriculumKeywords.forEach(keyword => {
          if (services.includes(keyword)) {
            score += 0.5;
          }
        });
      }
      
      // Look for educational indicators
      rating.quality_indicators.forEach(indicator => {
        if (indicator.indicator.includes('curriculum') || 
            indicator.indicator.includes('accreditation')) {
          const impactMatch = indicator.impact.match(/([+-]?\d+\.\d+)/);
          if (impactMatch) {
            const boostValue = parseFloat(impactMatch[1]) * 5; // Convert to 10-point scale
            score += boostValue;
          }
        }
      });
      break;
      
    case 'staff':
      // Look for staff qualification keywords in programmatic services
      if (daycare.PROGRAMMATIC_SERVICES) {
        const services = daycare.PROGRAMMATIC_SERVICES.toUpperCase();
        
        // Check for staff qualifications
        const staffKeywords = [
          'CERTIFIED', 'DEGREE', 'TEACHER', 'QUALIFIED', 'TRAINED', 
          'EXPERIENCED', 'PROFESSIONAL', 'EDUCATION'
        ];
        
        staffKeywords.forEach(keyword => {
          if (services.includes(keyword)) {
            score += 0.5;
          }
        });
      }
      
      // Experience factor
      if (daycare.years_in_operation > 5) {
        score += Math.min(2, (daycare.years_in_operation - 5) * 0.2);
      }
      break;
  }
  
  // Ensure score is within 1-10 range and round to one decimal
  return Math.round(Math.max(1, Math.min(10, score)) * 10) / 10;
}

// Save rating data to database
async function saveRatingToDB(pool, operationId, ratingData, tableName) {
  try {
    // Prepare data for insertion
    const ratingFactorsJson = JSON.stringify(ratingData.rating_factors || []);
    const qualityIndicatorsJson = JSON.stringify(ratingData.quality_indicators || []);
    
    // Query structure depends on which table we're updating
    if (tableName === 'daycare_ratings') {
      await pool.query(`
        INSERT INTO daycare_ratings (
          operation_id,
          overall_rating,
          safety_rating,
          health_rating,
          wellbeing_rating,
          facility_rating,
          admin_rating,
          safety_compliance_score,
          operational_quality_score,
          educational_programming_score,
          staff_qualifications_score,
          risk_score,
          violation_count,
          high_risk_violation_count,
          recent_violations_count,
          rating_factors,
          quality_indicators,
          subcategory_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          overall_rating = VALUES(overall_rating),
          safety_rating = VALUES(safety_rating),
          health_rating = VALUES(health_rating),
          wellbeing_rating = VALUES(wellbeing_rating),
          facility_rating = VALUES(facility_rating),
          admin_rating = VALUES(admin_rating),
          safety_compliance_score = VALUES(safety_compliance_score),
          operational_quality_score = VALUES(operational_quality_score),
          educational_programming_score = VALUES(educational_programming_score),
          staff_qualifications_score = VALUES(staff_qualifications_score),
          risk_score = VALUES(risk_score),
          violation_count = VALUES(violation_count),
          high_risk_violation_count = VALUES(high_risk_violation_count),
          recent_violations_count = VALUES(recent_violations_count),
          rating_factors = VALUES(rating_factors),
          quality_indicators = VALUES(quality_indicators),
          subcategory_data = VALUES(subcategory_data),
          last_updated = CURRENT_TIMESTAMP
      `, [
        operationId,
        ratingData.overall_rating,
        ratingData.safety_rating,
        ratingData.health_rating,
        ratingData.wellbeing_rating,
        ratingData.facility_rating,
        ratingData.admin_rating,
        ratingData.safety_compliance_score,
        ratingData.operational_quality_score,
        ratingData.educational_programming_score,
        ratingData.staff_qualifications_score,
        ratingData.risk_score,
        ratingData.violation_count,
        ratingData.high_risk_violation_count,
        ratingData.recent_violations_count,
        ratingFactorsJson,
        qualityIndicatorsJson,
        ratingData.subcategory_data
      ]);
    } else if (tableName === 'daycare_ratings_balanced') {
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
        ON DUPLICATE KEY UPDATE
          overall_rating = VALUES(overall_rating),
          safety_rating = VALUES(safety_rating),
          health_rating = VALUES(health_rating),
          wellbeing_rating = VALUES(wellbeing_rating),
          facility_rating = VALUES(facility_rating),
          admin_rating = VALUES(admin_rating),
          risk_score = VALUES(risk_score),
          violation_count = VALUES(violation_count),
          high_risk_violation_count = VALUES(high_risk_violation_count),
          recent_violations_count = VALUES(recent_violations_count),
          rating_factors = VALUES(rating_factors),
          quality_indicators = VALUES(quality_indicators),
          last_updated = CURRENT_TIMESTAMP
      `, [
        operationId,
        ratingData.overall_rating,
        ratingData.safety_rating,
        ratingData.health_rating,
        ratingData.wellbeing_rating,
        ratingData.facility_rating,
        ratingData.admin_rating,
        ratingData.risk_score,
        ratingData.violation_count,
        ratingData.high_risk_violation_count,
        ratingData.recent_violations_count,
        ratingFactorsJson,
        qualityIndicatorsJson
      ]);
    } else {
      throw new Error(`Unknown table name: ${tableName}`);
    }
    
    return true;
  } catch (err) {
    console.error(`Error saving rating for operation ${operationId} to ${tableName}:`, err.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('=== Updating Daycare Ratings Tables ===');
  
  // Create connection pool
  console.log('Connecting to database...');
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Check database connection
    console.log('Testing database connection...');
    await pool.query('SELECT 1');
    console.log('Database connection successful');
    
    // Create/update the ratings tables
    await createRatingsTable(pool);
    await createBalancedRatingsTable(pool);
    
    // Generate ratings for all daycares
    console.log('Generating ratings for all daycares...');
    const stats = await generateRatings(pool);
    
    console.log('\nProcess completed successfully!');
  } catch (err) {
    console.error('Error updating daycare ratings:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}
