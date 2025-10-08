/**
 * Generate Optimized Daycare Cost Estimation
 * 
 * This script generates cost estimates using the optimized boolean fields in the daycare_finder table
 * rather than parsing text fields. This approach is more efficient and accurate.
 * 
 * It updates both the daycare_cost_estimates table (keeping compatibility) and the
 * daycare_finder table's cost fields directly.
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

// Base cost factors
const BASE_MONTHLY_COST = 850;  // Baseline monthly cost

// Age-related cost multipliers
const AGE_MULTIPLIERS = {
  infant: 1.7,      // Infants (0-17 months) cost 70% more
  toddler: 1.35,    // Toddlers (18-35 months) cost 35% more
  preschool: 1.15,  // Preschool (3-5 years) cost 15% more
  schoolAge: 1.0    // School age children (6+ years) baseline cost
};

// Service-based cost adjustments (percentages)
const SERVICE_ADJUSTMENTS = {
  transportation: 8,         // Transportation service
  meals: 7,                  // Meals provided
  specialNeeds: 18,          // Special needs accommodations
  montessori: 25,            // Montessori curriculum
  religious: 5,              // Religious programs
  afterSchool: 3,            // After school programs
  extendedHours: 10,         // Extended hours (early/late)
  fieldTrips: 3,             // Field trips
  weekendCare: 8,            // Weekend care
  nightCare: 15,             // Night care
  dropInCare: 5,             // Drop-in care
  skillClasses: 8,           // Skill classes
  accredited: 10             // Accredited programs
};

// Operation type cost multipliers
const TYPE_MULTIPLIERS = {
  'Licensed Child Care Center': 1.0,    // baseline
  'Licensed Child-Care Home': 1.1,      // slightly higher costs for more personalized care
  'Licensed Child-Care Home (Group)': 1.05,
  'Registered Child-Care Home': 0.95,
  'Before or After-School Program': 0.75,
  'School-Age Program': 0.75,
  'Listed Family Home': 0.9,
  'Small Employer-Based Child Care': 0.95,
  'Temporary Shelter Child Care': 0.9,
  'Child-Placing Agency': 1.1,
  'Montessori': 1.35,       // Premium for Montessori programs
  'Early Head Start': 0.8,  // Reduced as these are subsidized
  'Head Start Program': 0.8 // Reduced as these are subsidized
};

// Risk score cost adjustments (discount for high-risk facilities)
const RISK_ADJUSTMENTS = [
  { threshold: 70, discount: 18 },   // High risk (18% discount)
  { threshold: 40, discount: 12 },   // Medium high risk (12% discount)
  { threshold: 20, discount: 6 },    // Medium risk (6% discount)
  { threshold: 10, discount: 0 },    // Low risk (no discount)
  { threshold: 0, premium: 6 }       // Very low risk (6% premium)
];

// Experience-based adjustments
const EXPERIENCE_ADJUSTMENTS = [
  { years: 0, adjustment: -8 },    // New facilities (8% discount)
  { years: 2, adjustment: 0 },     // 2-5 years (baseline)
  { years: 5, adjustment: 4 },     // 5-10 years (4% premium)
  { years: 10, adjustment: 6 },    // 10-15 years (6% premium)
  { years: 15, adjustment: 10 }    // 15+ years (10% premium)
];

// County/city median income categories (hardcoded for demo - in production would use Zillow data)
const LOCATION_ADJUSTMENTS = {
  'HARRIS': 18,      // Upper middle income
  'DALLAS': 18,      // Upper middle income
  'TRAVIS': 30,      // High income (Austin)
  'BEXAR': 0,        // Middle income (San Antonio)
  'TARRANT': 12,     // Upper middle income
  'COLLIN': 30,      // High income
  'DENTON': 18,      // Upper middle income
  'FORT BEND': 18,   // Upper middle income
  'MONTGOMERY': 18,  // Upper middle income
  'WILLIAMSON': 18,  // Upper middle income
  'EL PASO': -12,    // Lower middle income
  'GALVESTON': 0,    // Middle income
  'BRAZORIA': 0,     // Middle income
  'HAYS': 12,        // Upper middle income
  'NUECES': -12,     // Lower middle income
  'BELL': -12,       // Lower middle income
  'JEFFERSON': -25,  // Low income
  'SMITH': -12,      // Lower middle income
  'WEBB': -25,       // Low income
  'MCLENNAN': -12,   // Lower middle income
  'LUBBOCK': -12     // Lower middle income
};

// Default to middle income if county not found
const DEFAULT_LOCATION_ADJUSTMENT = 0;

// Capacity-based adjustments - economies of scale
function getCapacityAdjustment(capacity) {
  if (!capacity) return 0;
  
  if (capacity < 12) return 15;       // Small facilities (<12 children) - higher costs per child
  if (capacity < 25) return 8;        // Small-medium (12-24 children)
  if (capacity < 50) return 0;        // Medium (25-49 children) - baseline
  if (capacity < 100) return -8;      // Medium-large (50-99 children)
  return -15;                         // Large facilities (100+ children)
}

// Get the youngest age group using the age indicator fields
function getYoungestAgeGroup(ageFields) {
  if (ageFields.serves_infant) return 'infant';
  if (ageFields.serves_toddler) return 'toddler';
  if (ageFields.serves_preschool) return 'preschool';
  if (ageFields.serves_school_age) return 'schoolAge';
  return 'schoolAge'; // Default if no age groups specified
}

// Calculate service adjustment factor using boolean indicator fields
function calculateServiceAdjustment(programFields) {
  let adjustment = 0;
  let serviceFeatures = [];
  
  // Add adjustments for each service
  if (programFields.has_transportation_school) {
    adjustment += SERVICE_ADJUSTMENTS.transportation;
    serviceFeatures.push('transportation');
  }
  
  if (programFields.has_meals_provided) {
    adjustment += SERVICE_ADJUSTMENTS.meals;
    serviceFeatures.push('meals');
  }
  
  if (programFields.has_special_needs) {
    adjustment += SERVICE_ADJUSTMENTS.specialNeeds;
    serviceFeatures.push('special_needs');
  }
  
  // Consider early/late hours as extended hours
  if (programFields.has_before_school_care || programFields.has_after_school_care) {
    adjustment += SERVICE_ADJUSTMENTS.extendedHours;
    serviceFeatures.push(programFields.has_before_school_care ? 'early_drop' : 'late_pick');
  }
  
  if (programFields.has_field_trips) {
    adjustment += SERVICE_ADJUSTMENTS.fieldTrips;
    serviceFeatures.push('field_trips');
  }
  
  if (programFields.has_weekend_care) {
    adjustment += SERVICE_ADJUSTMENTS.weekendCare;
    serviceFeatures.push('weekend_care');
  }
  
  if (programFields.has_night_care) {
    adjustment += SERVICE_ADJUSTMENTS.nightCare;
    serviceFeatures.push('night_care');
  }
  
  if (programFields.has_drop_in_care) {
    adjustment += SERVICE_ADJUSTMENTS.dropInCare;
    serviceFeatures.push('drop_in_care');
  }
  
  if (programFields.has_skill_classes) {
    adjustment += SERVICE_ADJUSTMENTS.skillClasses;
    serviceFeatures.push('skill_classes');
  }
  
  if (programFields.has_accredited) {
    adjustment += SERVICE_ADJUSTMENTS.accredited;
    serviceFeatures.push('accredited');
  }
  
  return { adjustment, serviceFeatures };
}

// Calculate cost estimate for a daycare
function calculateCost(daycare) {
  // Start with base cost
  let cost = BASE_MONTHLY_COST;
  
  // 1. Age-based adjustment (youngest age served)
  const ageFields = {
    serves_infant: daycare.serves_infant === 1,
    serves_toddler: daycare.serves_toddler === 1,
    serves_preschool: daycare.serves_preschool === 1,
    serves_school_age: daycare.serves_school_age === 1
  };
  
  const youngestAge = getYoungestAgeGroup(ageFields);
  cost *= AGE_MULTIPLIERS[youngestAge];
  
  // 2. Adjust by operation type
  const operationType = daycare.operation_type || 'Licensed Child Care Center';
  const typeMultiplier = TYPE_MULTIPLIERS[operationType] || 1.0;
  cost *= typeMultiplier;
  
  // 3. Service-based adjustment using program indicator fields
  const programFields = {
    has_school_age_care: daycare.has_school_age_care === 1,
    has_before_school_care: daycare.has_before_school_care === 1,
    has_after_school_care: daycare.has_after_school_care === 1,
    has_meals_provided: daycare.has_meals_provided === 1,
    has_snacks_provided: daycare.has_snacks_provided === 1,
    has_drop_in_care: daycare.has_drop_in_care === 1,
    has_part_time_care: daycare.has_part_time_care === 1,
    has_transportation_school: daycare.has_transportation_school === 1,
    has_field_trips: daycare.has_field_trips === 1,
    has_accredited: daycare.has_accredited === 1,
    has_skill_classes: daycare.has_skill_classes === 1,
    has_special_needs: daycare.has_special_needs === 1,
    has_night_care: daycare.has_night_care === 1,
    has_weekend_care: daycare.has_weekend_care === 1,
    has_get_well_care: daycare.has_get_well_care === 1
  };
  
  const { adjustment: serviceAdjustment, serviceFeatures } = calculateServiceAdjustment(programFields);
  cost *= (1 + (serviceAdjustment / 100));
  
  // 4. Risk score adjustment
  let riskAdjustment = 0;
  if (daycare.risk_score !== null && daycare.risk_score !== undefined) {
    // Find the appropriate risk adjustment
    for (const risk of RISK_ADJUSTMENTS) {
      if (daycare.risk_score >= risk.threshold) {
        riskAdjustment = risk.discount ? -risk.discount : (risk.premium || 0);
        break;
      }
    }
  }
  cost *= (1 + (riskAdjustment / 100));
  
  // 5. Experience adjustment
  let experienceAdjustment = 0;
  if (daycare.years_in_operation !== null && daycare.years_in_operation !== undefined) {
    // Find the appropriate experience adjustment
    for (const exp of EXPERIENCE_ADJUSTMENTS) {
      if (daycare.years_in_operation >= exp.years) {
        experienceAdjustment = exp.adjustment;
      } else {
        break;
      }
    }
  }
  cost *= (1 + (experienceAdjustment / 100));
  
  // 6. Location/county-based adjustment
  const locationAdjustment = LOCATION_ADJUSTMENTS[daycare.county] || DEFAULT_LOCATION_ADJUSTMENT;
  cost *= (1 + (locationAdjustment / 100));
  
  // 7. Capacity-based adjustment
  const capacityAdjustment = getCapacityAdjustment(daycare.total_capacity);
  cost *= (1 + (capacityAdjustment / 100));
  
  // 8. Store calculation factors for transparency
  const factors = {
    base_cost: BASE_MONTHLY_COST,
    age_group: youngestAge,
    age_multiplier: AGE_MULTIPLIERS[youngestAge],
    operation_type: operationType,
    type_multiplier: typeMultiplier,
    service_adjustment: serviceAdjustment,
    service_features: serviceFeatures,
    risk_score: daycare.risk_score || 0,
    risk_adjustment: riskAdjustment,
    experience_years: daycare.years_in_operation || 0,
    experience_adjustment: experienceAdjustment,
    location_category: daycare.county,
    location_adjustment: locationAdjustment,
    capacity: daycare.total_capacity || 0,
    capacity_adjustment: capacityAdjustment
  };
  
  // Round to nearest dollar
  return {
    monthly_cost: Math.round(cost),
    weekly_cost: Math.round(cost / 4.33),  // Weekly equivalent
    calculation_factors: factors
  };
}

// Update both the daycare_cost_estimates and daycare_finder tables
async function updateCostEstimates() {
  console.log('Starting optimized cost estimation update...');
  
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Get all daycares with the needed fields from daycare_finder
    console.log('Loading daycare data for cost estimation...');
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
    
    console.log(`Found ${daycares.length} daycares for cost estimation`);
    
    let totalUpdated = 0;
    
    // Process in batches for better performance
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < daycares.length; i += BATCH_SIZE) {
      const batch = daycares.slice(i, i + BATCH_SIZE);
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        for (const daycare of batch) {
          // Calculate the cost estimate
          const costData = calculateCost(daycare);
          
          // Update the daycare_cost_estimates table
          await connection.query(`
            REPLACE INTO daycare_cost_estimates 
            (operation_id, operation_number, monthly_cost, weekly_cost, calculation_factors)
            VALUES (?, ?, ?, ?, ?)
          `, [
            daycare.operation_id,
            daycare.operation_number,
            costData.monthly_cost,
            costData.weekly_cost,
            JSON.stringify(costData.calculation_factors)
          ]);
          
          // Update the daycare_finder table
          await connection.query(`
            UPDATE daycare_finder
            SET 
              monthly_cost = ?,
              weekly_cost = ?
            WHERE operation_id = ?
          `, [
            costData.monthly_cost,
            costData.weekly_cost,
            daycare.operation_id
          ]);
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
    
    // Calculate statistics
    const [stats] = await pool.query(`
      SELECT 
        MIN(monthly_cost) as min_cost,
        MAX(monthly_cost) as max_cost,
        AVG(monthly_cost) as avg_cost,
        COUNT(*) as count
      FROM daycare_finder
      WHERE monthly_cost IS NOT NULL
    `);
    
    console.log('\nCost Estimation Statistics:');
    console.log(`Total records updated: ${totalUpdated}`);
    if (stats.length > 0) {
      console.log(`Minimum monthly cost: $${stats[0].min_cost}`);
      console.log(`Maximum monthly cost: $${stats[0].max_cost}`);
      console.log(`Average monthly cost: $${stats[0].avg_cost.toFixed(2)}`);
    }
    
    // Sample some cost estimates for verification
    const [samples] = await pool.query(`
      SELECT 
        operation_id, 
        operation_name, 
        monthly_cost, 
        weekly_cost
      FROM 
        daycare_finder
      WHERE monthly_cost IS NOT NULL
      ORDER BY monthly_cost ASC
      LIMIT 5
    `);
    
    console.log('\nLowest Cost Samples:');
    samples.forEach((sample, i) => {
      console.log(`${i+1}. ${sample.operation_name}: $${sample.monthly_cost}/month ($${sample.weekly_cost}/week)`);
    });
    
    const [highSamples] = await pool.query(`
      SELECT 
        operation_id, 
        operation_name, 
        monthly_cost, 
        weekly_cost
      FROM 
        daycare_finder
      WHERE monthly_cost IS NOT NULL
      ORDER BY monthly_cost DESC
      LIMIT 5
    `);
    
    console.log('\nHighest Cost Samples:');
    highSamples.forEach((sample, i) => {
      console.log(`${i+1}. ${sample.operation_name}: $${sample.monthly_cost}/month ($${sample.weekly_cost}/week)`);
    });
    
    return totalUpdated;
  } catch (err) {
    console.error('Error in cost estimation process:', err);
    return 0;
  } finally {
    await pool.end();
  }
}

// Main function
async function main() {
  console.log('Starting optimized cost estimation process...');
  
  const updatedCount = await updateCostEstimates();
  
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
  calculateCost,
  updateCostEstimates
};