/**
 * Update Optimized Daycare Ratings
 * 
 * This script updates the daycare ratings using the optimized boolean fields
 * in the daycare_finder table. It creates a more consistent rating based on
 * the program indicators and age groups.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Rating constants - Adjusted for full 0-5 distribution
const RATING_CONSTANTS = {
  // Base rating for a daycare - neutral midpoint to create full range
  BASE_RATING: 2.5,
  
  // Rating adjustments for violations - more significant penalties
  VIOLATION_PENALTIES: {
    high_risk: -1.0,        // Each high risk violation
    many_violations: -0.8,  // Daycares with many violations (>10)
    recent_violations: -0.7  // Recent violations
  },
  
  // Rating adjustments for positive features - moderate boosts
  FEATURE_BONUSES: {
    accredited: 0.5,      // Accredited facilities
    special_needs: 0.3,   // Accommodates special needs
    experienced: 0.3,     // Facilities operating >5 years
    diverse_programs: 0.3, // Offers diverse program types
    meals_provided: 0.2,  // Provides meals
    transportation: 0.1,  // Provides transportation
    infant_care: 0.2      // Provides infant care (harder to find)
  },
  
  // Maximum rating boost from features - capped to prevent too many 5.0s
  MAX_FEATURE_BOOST: 1.0,
  
  // Rating ceilings and floors
  RATING_CEILINGS: {
    HIGH_RISK_VIOLATION: 3.0,  // Cap for facilities with high-risk violations
    HIGH_RISK_SCORE: 2.0,      // Cap for facilities with risk score > 60
    INACTIVE: 1.5              // Cap for inactive/closed facilities
  },
  
  // Minimum ratings
  INACTIVE_MINIMUM: 0.5,       // Minimum for inactive facilities
  CLOSED_MINIMUM: 0.0          // Permanently closed facilities
};

// Calculate diversity of programs score (0-1)
function calculateProgramDiversity(daycare) {
  const programFields = [
    'has_school_age_care',
    'has_before_school_care',
    'has_after_school_care',
    'has_meals_provided',
    'has_snacks_provided',
    'has_drop_in_care',
    'has_part_time_care',
    'has_transportation_school',
    'has_field_trips',
    'has_accredited',
    'has_skill_classes',
    'has_special_needs',
    'has_night_care',
    'has_weekend_care',
    'has_get_well_care'
  ];
  
  // Count how many program types are offered
  let count = 0;
  for (const field of programFields) {
    if (daycare[field] === 1) {
      count++;
    }
  }
  
  // Calculate diversity score (0-1)
  // Score is higher if more program types are offered
  return Math.min(1, count / 8); // 8+ program types = maximum diversity
}

// Calculate age diversity score (0-1)
function calculateAgeDiversity(daycare) {
  const ageFields = [
    'serves_infant',
    'serves_toddler',
    'serves_preschool',
    'serves_school_age'
  ];
  
  // Count how many age groups are served
  let count = 0;
  for (const field of ageFields) {
    if (daycare[field] === 1) {
      count++;
    }
  }
  
  // Calculate diversity score (0-1)
  return count / ageFields.length;
}

// Calculate subcategory ratings
function calculateSubcategoryRatings(daycare, baseRating) {
  // Calculate subcategory ratings starting from the base rating
  let safety = baseRating;
  let health = baseRating;
  let wellbeing = baseRating;
  let facility = baseRating;
  let admin = baseRating;
  
  // Adjust based on risk score and violations
  if (daycare.risk_score > 0) {
    // Higher risk scores affect safety and health more than other subcategories
    safety -= (daycare.risk_score / 100);
    health -= (daycare.risk_score / 120);
  }
  
  if (daycare.high_risk_violation_count > 0) {
    safety -= Math.min(1, daycare.high_risk_violation_count * 0.3);
    health -= Math.min(0.8, daycare.high_risk_violation_count * 0.2);
  }
  
  // Adjust based on program features
  if (daycare.has_meals_provided === 1) {
    health += 0.3;
    wellbeing += 0.2;
  }
  
  if (daycare.has_special_needs === 1) {
    wellbeing += 0.4;
    facility += 0.2;
  }
  
  if (daycare.has_transportation_school === 1) {
    safety -= 0.1; // Slight safety concern with transportation
    admin += 0.3; // But good administrative capability
  }
  
  if (daycare.has_accredited === 1) {
    admin += 0.5;
    facility += 0.3;
    safety += 0.2;
    health += 0.2;
    wellbeing += 0.2;
  }
  
  // Program diversity helps wellbeing
  const programDiversity = calculateProgramDiversity(daycare);
  wellbeing += programDiversity * 0.5;
  
  // Apply age diversity bonus to facility rating
  const ageDiversity = calculateAgeDiversity(daycare);
  facility += ageDiversity * 0.3;
  
  // Years in operation affects admin rating
  if (daycare.years_in_operation > 5) {
    admin += Math.min(0.5, daycare.years_in_operation / 20);
  }
  
  // Cap subcategory ratings between 1 and 5 (will be scaled to 1-10 later)
  return {
    safety: Math.max(1, Math.min(5, safety)),
    health: Math.max(1, Math.min(5, health)),
    wellbeing: Math.max(1, Math.min(5, wellbeing)),
    facility: Math.max(1, Math.min(5, facility)),
    admin: Math.max(1, Math.min(5, admin))
  };
}

// Calculate the overall rating for a daycare
function calculateRating(daycare) {
  // Start with base rating
  let rating = RATING_CONSTANTS.BASE_RATING;
  const ratingFactors = [];
  
  // 1. Apply violation penalties - More progressive penalties for worse violations
  if (daycare.high_risk_violation_count > 0) {
    // More significant penalty for multiple high-risk violations
    const penalty = Math.min(2.0, daycare.high_risk_violation_count * RATING_CONSTANTS.VIOLATION_PENALTIES.high_risk);
    rating -= penalty;
    
    ratingFactors.push({
      factor: 'High risk violations',
      impact: 'negative',
      details: `-${penalty.toFixed(1)} stars (${daycare.high_risk_violation_count} violations)`
    });
  }
  
  // Progressive penalty based on violation count
  if (daycare.violation_count > 0) {
    // Calculate penalty based on violation count tiers
    let penalty = 0;
    if (daycare.violation_count > 30) {
      penalty = RATING_CONSTANTS.VIOLATION_PENALTIES.many_violations * 2.0;
    } else if (daycare.violation_count > 20) {
      penalty = RATING_CONSTANTS.VIOLATION_PENALTIES.many_violations * 1.5;
    } else if (daycare.violation_count > 10) {
      penalty = RATING_CONSTANTS.VIOLATION_PENALTIES.many_violations;
    } else if (daycare.violation_count > 5) {
      penalty = RATING_CONSTANTS.VIOLATION_PENALTIES.many_violations * 0.5;
    }
    
    if (penalty > 0) {
      rating -= penalty;
      
      ratingFactors.push({
        factor: 'Many violations',
        impact: 'negative',
        details: `-${penalty.toFixed(1)} stars (${daycare.violation_count} total violations)`
      });
    }
  }
  
  // Recent violations are especially concerning
  if (daycare.recent_violations_count > 0) {
    const penalty = Math.min(1.0, daycare.recent_violations_count * RATING_CONSTANTS.VIOLATION_PENALTIES.recent_violations / 2);
    rating -= penalty;
    
    ratingFactors.push({
      factor: 'Recent violations',
      impact: 'negative',
      details: `-${penalty.toFixed(1)} stars (${daycare.recent_violations_count} recent violations)`
    });
  }
  
  // Additional penalty for risk score
  if (daycare.risk_score > 30) {
    const riskPenalty = Math.min(0.8, (daycare.risk_score - 30) / 100);
    rating -= riskPenalty;
    
    ratingFactors.push({
      factor: 'High risk score',
      impact: 'negative',
      details: `-${riskPenalty.toFixed(1)} stars (risk score: ${daycare.risk_score})`
    });
  }
  
  // 2. Apply feature bonuses (up to maximum)
  let totalBonus = 0;
  const qualityIndicators = [];
  
  // Accreditation bonus
  if (daycare.has_accredited === 1) {
    const bonus = RATING_CONSTANTS.FEATURE_BONUSES.accredited;
    totalBonus += bonus;
    
    qualityIndicators.push({
      indicator: 'Accredited facility',
      impact: `+${bonus.toFixed(1)} stars`
    });
  }
  
  // Special needs accommodation
  if (daycare.has_special_needs === 1) {
    const bonus = RATING_CONSTANTS.FEATURE_BONUSES.special_needs;
    totalBonus += bonus;
    
    qualityIndicators.push({
      indicator: 'Accommodates special needs',
      impact: `+${bonus.toFixed(1)} stars`
    });
  }
  
  // Experience bonus
  if (daycare.years_in_operation >= 5) {
    const bonus = RATING_CONSTANTS.FEATURE_BONUSES.experienced;
    totalBonus += bonus;
    
    qualityIndicators.push({
      indicator: 'Experienced provider (5+ years)',
      impact: `+${bonus.toFixed(1)} stars`
    });
  }
  
  // Program diversity bonus
  const programDiversity = calculateProgramDiversity(daycare);
  if (programDiversity > 0.5) {
    const bonus = RATING_CONSTANTS.FEATURE_BONUSES.diverse_programs;
    totalBonus += bonus;
    
    qualityIndicators.push({
      indicator: 'Diverse program offerings',
      impact: `+${bonus.toFixed(1)} stars`
    });
  }
  
  // Meals provided
  if (daycare.has_meals_provided === 1) {
    const bonus = RATING_CONSTANTS.FEATURE_BONUSES.meals_provided;
    totalBonus += bonus;
    
    qualityIndicators.push({
      indicator: 'Provides meals',
      impact: `+${bonus.toFixed(1)} stars`
    });
  }
  
  // Transportation
  if (daycare.has_transportation_school === 1) {
    const bonus = RATING_CONSTANTS.FEATURE_BONUSES.transportation;
    totalBonus += bonus;
    
    qualityIndicators.push({
      indicator: 'Provides transportation',
      impact: `+${bonus.toFixed(1)} stars`
    });
  }
  
  // Infant care
  if (daycare.serves_infant === 1) {
    const bonus = RATING_CONSTANTS.FEATURE_BONUSES.infant_care;
    totalBonus += bonus;
    
    qualityIndicators.push({
      indicator: 'Provides infant care',
      impact: `+${bonus.toFixed(1)} stars`
    });
  }
  
  // Cap the total bonus
  totalBonus = Math.min(RATING_CONSTANTS.MAX_FEATURE_BOOST, totalBonus);
  
  // Add the bonus to rating
  rating += totalBonus;
  
  ratingFactors.push({
    factor: 'Quality indicators',
    impact: 'positive',
    details: `+${totalBonus.toFixed(1)} star boost for quality factors`
  });
  
  // 3. Apply rating adjustments for full 0-5 range distribution
  let finalRating = rating;
  
  // Distribute ratings across the full range using a more aggressive algorithm
  
  // Handle inactive and closed facilities
  if (daycare.operation_status === 'INACTIVE') {
    // Inactive facilities get capped at a low rating
    finalRating = Math.min(RATING_CONSTANTS.RATING_CEILINGS.INACTIVE, finalRating);
    // Ensure they have at least the minimum inactive rating
    finalRating = Math.max(RATING_CONSTANTS.INACTIVE_MINIMUM, finalRating);
    
    ratingFactors.push({
      factor: 'Inactive status',
      impact: 'negative',
      details: `Rating adjusted to ${finalRating.toFixed(1)} due to inactive status`
    });
  } else if (daycare.operation_status === 'CLOSED' || daycare.temporarily_closed === 'Y') {
    // Closed facilities get very low ratings
    finalRating = Math.min(RATING_CONSTANTS.INACTIVE_MINIMUM, finalRating);
    // Completely closed facilities can be 0.0
    if (daycare.operation_status === 'CLOSED') {
      finalRating = RATING_CONSTANTS.CLOSED_MINIMUM;
    }
    
    ratingFactors.push({
      factor: 'Closed status',
      impact: 'negative',
      details: `Rating set to ${finalRating.toFixed(1)} due to closed status`
    });
  } else {
    // For active facilities, apply tiered adjustments based on risk and violations
    
    // High risk violations - severe penalty for multiple high risk violations
    if (daycare.high_risk_violation_count > 2) {
      // More severe cap for multiple high-risk violations
      finalRating = Math.min(1.5, finalRating);
      
      ratingFactors.push({
        factor: 'Severe risk violations',
        impact: 'negative',
        details: `Rating capped at ${finalRating.toFixed(1)} due to multiple high-risk violations`
      });
    } else if (daycare.high_risk_violation_count > 0) {
      // Cap for any high-risk violations
      if (daycare.recent_violations_count > 0) {
        finalRating = Math.min(RATING_CONSTANTS.RATING_CEILINGS.HIGH_RISK_VIOLATION, finalRating);
      } else {
        finalRating = Math.min(RATING_CONSTANTS.RATING_CEILINGS.HIGH_RISK_VIOLATION + 0.5, finalRating);
      }
      
      ratingFactors.push({
        factor: 'High risk violations',
        impact: 'negative',
        details: `Rating capped at ${finalRating.toFixed(1)} due to high-risk violations`
      });
    }
    
    // Progressive capping based on risk score - more aggressive to use full scale
    if (daycare.risk_score > 80) {
      // Very high risk
      finalRating = Math.min(1.0, finalRating);
      
      ratingFactors.push({
        factor: 'Very high risk score',
        impact: 'negative',
        details: `Rating capped at ${finalRating.toFixed(1)} due to very high risk score (${daycare.risk_score})`
      });
    } else if (daycare.risk_score > 60) {
      // High risk
      finalRating = Math.min(RATING_CONSTANTS.RATING_CEILINGS.HIGH_RISK_SCORE, finalRating);
      
      ratingFactors.push({
        factor: 'High risk score',
        impact: 'negative',
        details: `Rating capped at ${finalRating.toFixed(1)} due to high risk score (${daycare.risk_score})`
      });
    } else if (daycare.risk_score > 40) {
      // Moderate risk
      finalRating = Math.min(RATING_CONSTANTS.RATING_CEILINGS.HIGH_RISK_SCORE + 1.0, finalRating);
      
      ratingFactors.push({
        factor: 'Moderate risk score',
        impact: 'negative',
        details: `Rating capped at ${finalRating.toFixed(1)} due to moderate risk score (${daycare.risk_score})`
      });
    }
    
    // Apply a heavier penalty for extremely high violation counts
    if (daycare.violation_count > 20) {
      finalRating = Math.min(2.0, finalRating);
      
      ratingFactors.push({
        factor: 'Extremely high violation count',
        impact: 'negative',
        details: `Rating capped at ${finalRating.toFixed(1)} due to extremely high violation count (${daycare.violation_count})`
      });
    }
    
    // Scale down top ratings to create more distribution
    if (finalRating > 4.0) {
      // Apply a more dramatic downward curve to the top ratings
      const adjustment = Math.min(1.0, (finalRating - 4.0) * 0.5);
      finalRating -= adjustment;
      
      if (adjustment > 0.2) {
        ratingFactors.push({
          factor: 'Rating adjustment',
          impact: 'negative',
          details: `Rating adjusted by -${adjustment.toFixed(1)} for better distribution`
        });
      }
    }
    
    // Ensure we have more ratings in the 2.5-3.5 range by compressing the scale slightly
    if (finalRating > 3.5 && finalRating < 4.0) {
      finalRating = 3.5 + (finalRating - 3.5) * 0.7;
    }
  }
  
  // Final adjustments to utilize full 0-5 range
  
  // Allow excellent providers to get 5.0 scores (top ~1%)
  if (daycare.high_risk_violation_count === 0 && 
      daycare.violation_count < 5 && 
      daycare.risk_score < 20 &&
      daycare.has_accredited === 1 &&
      finalRating > 3.4) {
    finalRating = 5.0;
    
    ratingFactors.push({
      factor: 'Exceptional provider',
      impact: 'positive',
      details: `Rating set to 5.0 for exemplary safety record and accreditation`
    });
  }
  
  // Allow very good providers to get 4.0-4.5 scores (next ~5%)
  else if (daycare.high_risk_violation_count === 0 && 
      daycare.violation_count < 10 && 
      daycare.risk_score < 30 &&
      (daycare.has_accredited === 1 || daycare.years_in_operation > 5) &&
      finalRating > 3.2) {
    // Determine if they get 4.0 or 4.5 based on violation count
    finalRating = (daycare.violation_count < 7) ? 4.5 : 4.0;
    
    ratingFactors.push({
      factor: 'Excellent provider',
      impact: 'positive',
      details: `Rating set to ${finalRating.toFixed(1)} for strong safety record and quality indicators`
    });
  }
  
  // Give 0.0 ratings to permanently closed facilities or those with extreme violations
  if (daycare.operation_status === 'CLOSED' || 
      (daycare.high_risk_violation_count > 3 && daycare.risk_score > 90)) {
    finalRating = 0.0;
    
    ratingFactors.push({
      factor: 'Closed or unsafe facility',
      impact: 'negative',
      details: 'Rating set to 0.0 due to closure or extreme safety concerns'
    });
  }
  
  // Ensure ratings stay within 0-5 range
  finalRating = Math.max(0, Math.min(5, finalRating));
  
  // No need to round here, will be scaled and rounded when returning
  
  // Calculate subcategory ratings
  const subcategoryRatings = calculateSubcategoryRatings(daycare, rating);
  
  // Keep overall rating on 0-5 scale but scale subcategories to 1-10 range
  // Cap overall rating at 5.0
  const cappedRating = Math.min(5.0, finalRating);
  
  // Scale subcategory ratings to 1-10 range (multiply by 2 since base calculations use 1-5 scale)
  const scaledSafetyRating = Math.min(10.0, subcategoryRatings.safety * 2);
  const scaledHealthRating = Math.min(10.0, subcategoryRatings.health * 2);
  const scaledWellbeingRating = Math.min(10.0, subcategoryRatings.wellbeing * 2);
  const scaledFacilityRating = Math.min(10.0, subcategoryRatings.facility * 2);
  const scaledAdminRating = Math.min(10.0, subcategoryRatings.admin * 2);
  
  // Round to nearest 0.5 for all ratings
  const roundedRating = Math.round(cappedRating * 2) / 2;
  const roundedSafetyRating = Math.round(scaledSafetyRating * 2) / 2;
  const roundedHealthRating = Math.round(scaledHealthRating * 2) / 2;
  const roundedWellbeingRating = Math.round(scaledWellbeingRating * 2) / 2;
  const roundedFacilityRating = Math.round(scaledFacilityRating * 2) / 2;
  const roundedAdminRating = Math.round(scaledAdminRating * 2) / 2;
  
  // Create complete rating result with properly scaled 1-10 ratings
  return {
    overall_rating: roundedRating,
    safety_rating: roundedSafetyRating,
    health_rating: roundedHealthRating,
    wellbeing_rating: roundedWellbeingRating,
    facility_rating: roundedFacilityRating,
    admin_rating: roundedAdminRating,
    risk_score: daycare.risk_score || 0,
    violation_count: daycare.violation_count || 0,
    high_risk_violation_count: daycare.high_risk_violation_count || 0,
    recent_violations_count: daycare.recent_violations_count || 0,
    rating_factors: ratingFactors,
    quality_indicators: qualityIndicators
  };
}

// Update the daycare_ratings_balanced table and daycare_finder ratings fields
async function updateRatings() {
  console.log('Starting optimized ratings update...');
  
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Get all daycares with needed fields
    console.log('Loading daycare data for rating calculations...');
    const [daycares] = await pool.query(`
      SELECT 
        operation_id,
        operation_number,
        operation_name,
        operation_type,
        county,
        total_capacity,
        years_in_operation,
        risk_score,
        violation_count,
        high_risk_violation_count,
        recent_violations_count,
        operation_status,
        temporarily_closed,
        
        serves_infant,
        serves_toddler,
        serves_preschool,
        serves_school_age,
        
        has_school_age_care,
        has_before_school_care,
        has_after_school_care,
        has_meals_provided,
        has_snacks_provided,
        has_drop_in_care,
        has_part_time_care,
        has_transportation_school,
        has_field_trips,
        has_accredited,
        has_skill_classes,
        has_special_needs,
        has_night_care,
        has_weekend_care,
        has_get_well_care
      FROM 
        daycare_finder
    `);
    
    console.log(`Found ${daycares.length} daycares for rating calculation`);
    
    // Create stats for rating distribution (0-5 scale for overall rating)
    const stats = {
      totalRated: 0,
      ratingsDistribution: {
        '5': 0, '4.5': 0, '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0, '0.5': 0, '0': 0
      },
      totalRatingScore: 0
    };
    
    let totalUpdated = 0;
    
    // Process in batches for better performance
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < daycares.length; i += BATCH_SIZE) {
      const batch = daycares.slice(i, i + BATCH_SIZE);
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        for (const daycare of batch) {
          // Calculate the rating
          const ratingData = calculateRating(daycare);
          
          // Update the daycare_ratings_balanced table
          await connection.query(`
            REPLACE INTO daycare_ratings_balanced (
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
            daycare.operation_id,
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
            JSON.stringify(ratingData.rating_factors),
            JSON.stringify(ratingData.quality_indicators)
          ]);
          
          // Update the daycare_finder table
          await connection.query(`
            UPDATE daycare_finder
            SET 
              overall_rating = ?,
              safety_rating = ?,
              health_rating = ?,
              wellbeing_rating = ?,
              facility_rating = ?,
              admin_rating = ?
            WHERE operation_id = ?
          `, [
            ratingData.overall_rating,
            ratingData.safety_rating,
            ratingData.health_rating,
            ratingData.wellbeing_rating,
            ratingData.facility_rating,
            ratingData.admin_rating,
            daycare.operation_id
          ]);
          
          // Update statistics
          stats.totalRated++;
          
          const roundedRating = ratingData.overall_rating.toString();
          stats.ratingsDistribution[roundedRating] = (stats.ratingsDistribution[roundedRating] || 0) + 1;
          stats.totalRatingScore += ratingData.overall_rating;
        }
        
        await connection.commit();
        totalUpdated += batch.length;
        
        // Log progress
        console.log(`Updated ${totalUpdated}/${daycares.length} records (${Math.round(totalUpdated/daycares.length*100)}%)`);
      } catch (err) {
        await connection.rollback();
        console.error('Error processing batch:', err);
      } finally {
        connection.release();
      }
    }
    
    // Calculate average rating
    stats.averageRating = stats.totalRatingScore / stats.totalRated;
    
    console.log('\nRating Statistics:');
    console.log(`Total daycares rated: ${stats.totalRated}`);
    console.log(`Average rating: ${stats.averageRating.toFixed(2)} stars`);
    
    console.log('\nRating distribution:');
    Object.entries(stats.ratingsDistribution)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        if (count > 0) {
          const percentage = (count / stats.totalRated) * 100;
          console.log(`  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)`);
        }
      });
    
    // Sample some rating results for verification
    const [samples] = await pool.query(`
      SELECT 
        operation_id, 
        operation_name, 
        overall_rating,
        safety_rating,
        health_rating,
        wellbeing_rating,
        facility_rating,
        admin_rating
      FROM 
        daycare_finder
      WHERE overall_rating IS NOT NULL
      ORDER BY overall_rating DESC
      LIMIT 5
    `);
    
    console.log('\nHighest Rated Samples:');
    samples.forEach((sample, i) => {
      console.log(`${i+1}. ${sample.operation_name}: ${sample.overall_rating} stars`);
      console.log(`   Safety: ${sample.safety_rating}, Health: ${sample.health_rating}, Wellbeing: ${sample.wellbeing_rating}, Facility: ${sample.facility_rating}, Admin: ${sample.admin_rating}`);
    });
    
    return totalUpdated;
  } catch (err) {
    console.error('Error in ratings update process:', err);
    return 0;
  } finally {
    await pool.end();
  }
}

// Main function
async function main() {
  console.log('Starting optimized ratings update process...');
  
  const updatedCount = await updateRatings();
  
  console.log(`\nProcess completed successfully! Updated ${updatedCount} records.`);
}

// Run the script
if (require.main === module) {
  main().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

module.exports = {
  calculateRating,
  updateRatings
};