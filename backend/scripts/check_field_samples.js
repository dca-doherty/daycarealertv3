/**
 * Check Field Samples
 * 
 * This script queries and displays sample values for various fields to help
 * determine common patterns and field structures
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

async function checkFieldSamples() {
  console.log('Checking field samples from daycare_finder table...');
  
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Sample licensed_to_serve_ages values
    console.log('\n=== LICENSED TO SERVE AGES SAMPLES ===');
    const [ageRanges] = await pool.query(`
      SELECT DISTINCT licensed_to_serve_ages 
      FROM daycare_finder 
      WHERE licensed_to_serve_ages IS NOT NULL 
      LIMIT 20
    `);
    
    ageRanges.forEach((record, index) => {
      console.log(`${index + 1}. ${record.licensed_to_serve_ages}`);
    });
    
    // Count common age categories
    console.log('\n=== AGE CATEGORY COUNTS ===');
    const ageCategories = [
      'Infant', 'Toddler', 'Pre-Kindergarten', 'Pre-School', 'School', 
      '0-12', '0-5'
    ];
    
    for (const category of ageCategories) {
      const [result] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM daycare_finder 
        WHERE licensed_to_serve_ages LIKE ?
      `, [`%${category}%`]);
      
      console.log(`${category}: ${result[0].count} records`);
    }
    
    // Sample programs_provided values
    console.log('\n=== PROGRAMS PROVIDED SAMPLES ===');
    const [programs] = await pool.query(`
      SELECT DISTINCT programs_provided 
      FROM daycare_finder 
      WHERE programs_provided IS NOT NULL 
      LIMIT 20
    `);
    
    programs.forEach((record, index) => {
      console.log(`${index + 1}. ${record.programs_provided}`);
    });
    
    // Count field usage for fields we're considering removing
    console.log('\n=== FIELD USAGE COUNTS ===');
    const fieldsToCheck = [
      'cost_age_group', 'cost_age_multiplier', 'cost_operation_type_multiplier',
      'cost_service_adjustment', 'cost_risk_adjustment', 'cost_experience_adjustment',
      'cost_location_adjustment', 'cost_capacity_adjustment', 'cost_hours_adjustment',
      'cost_accreditation_adjustment', 'cost_education_adjustment', 'cost_curriculum_adjustment',
      'quality_transportation', 'quality_meals_provided', 'quality_special_needs',
      'quality_language_immersion', 'quality_montessori', 'quality_religious',
      'quality_afterschool', 'quality_summer_programs', 'quality_enrichment',
      'quality_early_drop', 'quality_late_pick'
    ];
    
    for (const field of fieldsToCheck) {
      const [result] = await pool.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN ${field} IS NOT NULL THEN 1 ELSE 0 END) as non_null,
          SUM(CASE WHEN ${field} = TRUE THEN 1 ELSE 0 END) as true_values
        FROM daycare_finder
      `);
      
      const data = result[0];
      const nonNullPercent = ((data.non_null / data.total) * 100).toFixed(2);
      const truePercent = ((data.true_values / data.total) * 100).toFixed(2);
      
      console.log(`${field}: ${data.non_null}/${data.total} non-null (${nonNullPercent}%), ${data.true_values} true values (${truePercent}%)`);
    }
    
    // Check existing program indicator fields
    console.log('\n=== PROGRAM INDICATOR FIELD USAGE ===');
    const programIndicators = [
      'has_school_age_care', 'has_before_school_care', 'has_after_school_care',
      'has_meals_provided', 'has_snacks_provided', 'has_drop_in_care',
      'has_part_time_care', 'has_transportation_school', 'has_field_trips',
      'has_accredited', 'has_skill_classes', 'has_special_needs', 'has_night_care'
    ];
    
    for (const field of programIndicators) {
      const [result] = await pool.query(`
        SELECT 
          SUM(CASE WHEN ${field} = TRUE THEN 1 ELSE 0 END) as true_count
        FROM daycare_finder
      `);
      
      console.log(`${field}: ${result[0].true_count} true values`);
    }
    
    // Check what program types might be missing indicator fields
    console.log('\n=== CHECKING FOR MISSING PROGRAM TYPES ===');
    const [uniquePrograms] = await pool.query(`
      SELECT DISTINCT programs_provided
      FROM daycare_finder
      WHERE programs_provided IS NOT NULL
    `);
    
    // Extract unique program types from the comma-separated lists
    const allProgramTypes = new Set();
    uniquePrograms.forEach(record => {
      if (record.programs_provided) {
        const programs = record.programs_provided.split(',').map(p => p.trim());
        programs.forEach(program => {
          if (program && program.length > 0) {
            allProgramTypes.add(program);
          }
        });
      }
    });
    
    console.log('Unique program types found:');
    console.log(Array.from(allProgramTypes).sort().join('\n'));
    
    return {
      ageRanges: ageRanges.map(r => r.licensed_to_serve_ages),
      uniqueProgramTypes: Array.from(allProgramTypes)
    };
  } catch (err) {
    console.error('Error checking field samples:', err);
    return { ageRanges: [], uniqueProgramTypes: [] };
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  checkFieldSamples().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

module.exports = { checkFieldSamples };