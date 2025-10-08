/**
 * Update Daycare Finder Table
 * 
 * This script creates and populates the enhanced daycare_finder table that combines
 * information from daycare_operations, daycare_ratings_balanced, and daycare_cost_estimates
 * into a single table optimized for search and display.
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

// Main function to run the update
async function updateDaycareFinder() {
  console.log('Starting update of daycare_finder table...');
  
  // Create connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Create daycare_finder table
    console.log('Creating daycare_finder table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daycare_finder (
        id INT AUTO_INCREMENT PRIMARY KEY,
        operation_id VARCHAR(50) NOT NULL,
        operation_number VARCHAR(50) NOT NULL,
        
        -- Basic information
        operation_name VARCHAR(255) NOT NULL,
        operation_type VARCHAR(100),
        address VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(50) DEFAULT 'TX',
        zip_code VARCHAR(15),
        county VARCHAR(100),
        phone_number VARCHAR(20),
        email VARCHAR(255),
        website_address VARCHAR(255),
        
        -- Programs provided fields - previously missing
        programs_provided TEXT,
        accepts_subsidies BOOLEAN DEFAULT FALSE,
        
        -- Cost estimate fields - broken out from JSON
        monthly_cost DECIMAL(8,2),
        weekly_cost DECIMAL(8,2),
        cost_base_amount DECIMAL(8,2),
        cost_age_group VARCHAR(50),
        cost_age_multiplier DECIMAL(5,2),
        cost_operation_type_multiplier DECIMAL(5,2),
        cost_service_adjustment DECIMAL(5,2),
        cost_risk_adjustment DECIMAL(5,2),
        cost_experience_adjustment DECIMAL(5,2),
        cost_location_adjustment DECIMAL(5,2),
        cost_capacity_adjustment DECIMAL(5,2),
        cost_hours_adjustment DECIMAL(5,2),
        cost_accreditation_adjustment DECIMAL(5,2),
        cost_education_adjustment DECIMAL(5,2),
        cost_curriculum_adjustment DECIMAL(5,2),
        
        -- Daycare ratings fields - broken out from JSON
        overall_rating DECIMAL(3,1),
        safety_rating DECIMAL(3,1),
        health_rating DECIMAL(3,1),
        wellbeing_rating DECIMAL(3,1),
        facility_rating DECIMAL(3,1),
        admin_rating DECIMAL(3,1),
        
        -- Quality indicators - broken out from JSON
        quality_transportation BOOLEAN DEFAULT FALSE,
        quality_meals_provided BOOLEAN DEFAULT FALSE,
        quality_special_needs BOOLEAN DEFAULT FALSE,
        quality_language_immersion BOOLEAN DEFAULT FALSE,
        quality_montessori BOOLEAN DEFAULT FALSE,
        quality_religious BOOLEAN DEFAULT FALSE,
        quality_afterschool BOOLEAN DEFAULT FALSE,
        quality_summer_programs BOOLEAN DEFAULT FALSE,
        quality_enrichment BOOLEAN DEFAULT FALSE,
        quality_early_drop BOOLEAN DEFAULT FALSE,
        quality_late_pick BOOLEAN DEFAULT FALSE,
        
        -- Accreditation indicators
        accredited_naeyc BOOLEAN DEFAULT FALSE,
        accredited_necpa BOOLEAN DEFAULT FALSE,
        accredited_nafcc BOOLEAN DEFAULT FALSE,
        accredited_coa BOOLEAN DEFAULT FALSE,
        accredited_cognia BOOLEAN DEFAULT FALSE,
        accredited_apple BOOLEAN DEFAULT FALSE,
        accredited_tx_rising BOOLEAN DEFAULT FALSE,
        accredited_tx_school_ready BOOLEAN DEFAULT FALSE,
        
        -- Educational indicators
        education_cda BOOLEAN DEFAULT FALSE,
        education_associates BOOLEAN DEFAULT FALSE,
        education_bachelors BOOLEAN DEFAULT FALSE,
        education_masters BOOLEAN DEFAULT FALSE,
        education_montessori_cert BOOLEAN DEFAULT FALSE,
        
        -- Curriculum approaches
        curriculum_highscope BOOLEAN DEFAULT FALSE,
        curriculum_reggio BOOLEAN DEFAULT FALSE,
        curriculum_waldorf BOOLEAN DEFAULT FALSE,
        curriculum_banks BOOLEAN DEFAULT FALSE,
        curriculum_creative BOOLEAN DEFAULT FALSE,
        curriculum_project BOOLEAN DEFAULT FALSE,
        curriculum_emergent BOOLEAN DEFAULT FALSE,
        
        -- Risk and violation information
        risk_score DECIMAL(5,1),
        violation_count INT DEFAULT 0,
        high_risk_violation_count INT DEFAULT 0,
        recent_violations_count INT DEFAULT 0,
        
        -- Operational information
        hours_of_operation VARCHAR(255),
        days_of_operation VARCHAR(255),
        licensed_to_serve_ages VARCHAR(255),
        total_capacity INT,
        issuance_date DATE,
        years_in_operation DECIMAL(5,1),
        operation_status VARCHAR(50),
        temporarily_closed VARCHAR(10),
        conditions_on_permit VARCHAR(10),
        
        -- System fields
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Indices
        INDEX idx_operation_id (operation_id),
        INDEX idx_operation_number (operation_number),
        INDEX idx_city (city),
        INDEX idx_zip (zip_code),
        INDEX idx_county (county),
        INDEX idx_cost (monthly_cost),
        INDEX idx_rating (overall_rating),
        INDEX idx_risk (risk_score),
        INDEX idx_capacity (total_capacity),
        INDEX idx_location (city, county, zip_code)
      )
    `);
    
    // Create search_history table
    console.log('Creating search_history table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        search_query JSON,
        search_location VARCHAR(255),
        search_radius INT,
        search_filters JSON,
        search_results JSON,
        search_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // Truncate the table first
    console.log('Truncating daycare_finder table...');
    await pool.query('TRUNCATE TABLE daycare_finder');
    
    // Populate the table
    console.log('Populating daycare_finder table with base data...');
    await pool.query(`
      INSERT INTO daycare_finder (
        operation_id,
        operation_number,
        operation_name,
        operation_type,
        address,
        city,
        state,
        zip_code,
        county,
        phone_number,
        email,
        website_address,
        programs_provided,
        accepts_subsidies,
        monthly_cost,
        weekly_cost,
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
        hours_of_operation,
        days_of_operation,
        licensed_to_serve_ages,
        total_capacity,
        issuance_date,
        years_in_operation,
        operation_status,
        temporarily_closed,
        conditions_on_permit
      )
      SELECT 
        d.OPERATION_ID,
        d.OPERATION_NUMBER,
        d.OPERATION_NAME,
        d.OPERATION_TYPE,
        d.ADDRESS_LINE,
        d.CITY,
        d.STATE,
        d.ZIP,
        d.COUNTY,
        d.PHONE_NUMBER,
        d.EMAIL_ADDRESS,
        d.WEBSITE_ADDRESS,
        d.PROGRAMS_PROVIDED,
        CASE 
          WHEN d.ACCEPTS_CHILD_CARE_SUBSIDIES = 'Y' THEN TRUE 
          ELSE FALSE 
        END,
        c.monthly_cost,
        c.weekly_cost,
        r.overall_rating,
        r.safety_rating,
        r.health_rating,
        r.wellbeing_rating,
        r.facility_rating,
        r.admin_rating,
        r.risk_score,
        r.violation_count,
        r.high_risk_violation_count,
        r.recent_violations_count,
        d.HOURS_OF_OPERATION,
        d.DAYS_OF_OPERATION,
        d.LICENSED_TO_SERVE_AGES,
        d.TOTAL_CAPACITY,
        d.ISSUANCE_DATE,
        DATEDIFF(CURRENT_DATE, d.ISSUANCE_DATE) / 365.0,
        d.OPERATION_STATUS,
        d.TEMPORARILY_CLOSED,
        d.CONDITIONS_ON_PERMIT
      FROM 
        daycare_operations d
      LEFT JOIN 
        daycare_cost_estimates c ON d.OPERATION_ID = c.operation_id
      LEFT JOIN 
        daycare_ratings_balanced r ON d.OPERATION_ID = r.operation_id
    `);
    
    // Update cost calculation factors
    console.log('Updating cost calculation factors...');
    try {
      await pool.query(`
        UPDATE daycare_finder df
        JOIN daycare_cost_estimates ce ON df.operation_id = ce.operation_id
        SET 
          df.cost_base_amount = JSON_EXTRACT(ce.calculation_factors, '$.base_cost'),
          df.cost_age_group = JSON_UNQUOTE(JSON_EXTRACT(ce.calculation_factors, '$.age_group')),
          df.cost_age_multiplier = JSON_EXTRACT(ce.calculation_factors, '$.age_multiplier'),
          df.cost_operation_type_multiplier = JSON_EXTRACT(ce.calculation_factors, '$.type_multiplier'),
          df.cost_service_adjustment = JSON_EXTRACT(ce.calculation_factors, '$.service_adjustment'),
          df.cost_risk_adjustment = JSON_EXTRACT(ce.calculation_factors, '$.risk_adjustment'),
          df.cost_experience_adjustment = JSON_EXTRACT(ce.calculation_factors, '$.experience_adjustment'),
          df.cost_location_adjustment = JSON_EXTRACT(ce.calculation_factors, '$.location_adjustment'),
          df.cost_capacity_adjustment = JSON_EXTRACT(ce.calculation_factors, '$.capacity_adjustment'),
          df.cost_hours_adjustment = JSON_EXTRACT(ce.calculation_factors, '$.hours_adjustment'),
          df.cost_accreditation_adjustment = JSON_EXTRACT(ce.calculation_factors, '$.accreditation_adjustment'),
          df.cost_education_adjustment = JSON_EXTRACT(ce.calculation_factors, '$.education_adjustment'),
          df.cost_curriculum_adjustment = JSON_EXTRACT(ce.calculation_factors, '$.curriculum_adjustment')
      `);
    } catch (err) {
      console.error('Error updating cost factors, may be missing JSON fields:', err.message);
    }
    
    // Update quality indicators
    console.log('Updating quality indicators...');
    try {
      await pool.query(`
        UPDATE daycare_finder df
        JOIN daycare_cost_estimates ce ON df.operation_id = ce.operation_id
        SET 
          df.quality_transportation = JSON_CONTAINS(ce.calculation_factors, '"transportation"', '$.service_features'),
          df.quality_meals_provided = JSON_CONTAINS(ce.calculation_factors, '"meals"', '$.service_features'),
          df.quality_special_needs = JSON_CONTAINS(ce.calculation_factors, '"special_needs"', '$.service_features'),
          df.quality_language_immersion = JSON_CONTAINS(ce.calculation_factors, '"language_immersion"', '$.service_features'),
          df.quality_montessori = JSON_CONTAINS(ce.calculation_factors, '"montessori"', '$.service_features'),
          df.quality_religious = JSON_CONTAINS(ce.calculation_factors, '"religious"', '$.service_features'),
          df.quality_afterschool = JSON_CONTAINS(ce.calculation_factors, '"afterschool"', '$.service_features'),
          df.quality_summer_programs = JSON_CONTAINS(ce.calculation_factors, '"summer_programs"', '$.service_features'),
          df.quality_enrichment = JSON_CONTAINS(ce.calculation_factors, '"enrichment"', '$.service_features'),
          df.quality_early_drop = JSON_CONTAINS(ce.calculation_factors, '"early_drop"', '$.service_features'),
          df.quality_late_pick = JSON_CONTAINS(ce.calculation_factors, '"late_pick"', '$.service_features')
      `);
    } catch (err) {
      console.error('Error updating quality indicators, may be missing JSON fields:', err.message);
    }
    
    // Update accreditation indicators
    console.log('Updating accreditation indicators...');
    try {
      await pool.query(`
        UPDATE daycare_finder df
        JOIN daycare_cost_estimates ce ON df.operation_id = ce.operation_id
        SET 
          df.accredited_naeyc = JSON_CONTAINS(ce.calculation_factors, '"naeyc"', '$.accreditation_features'),
          df.accredited_necpa = JSON_CONTAINS(ce.calculation_factors, '"necpa"', '$.accreditation_features'),
          df.accredited_nafcc = JSON_CONTAINS(ce.calculation_factors, '"nafcc"', '$.accreditation_features'),
          df.accredited_coa = JSON_CONTAINS(ce.calculation_factors, '"coa"', '$.accreditation_features'),
          df.accredited_cognia = JSON_CONTAINS(ce.calculation_factors, '"cognia"', '$.accreditation_features'),
          df.accredited_apple = JSON_CONTAINS(ce.calculation_factors, '"apple"', '$.accreditation_features'),
          df.accredited_tx_rising = JSON_CONTAINS(ce.calculation_factors, '"txRising"', '$.accreditation_features'),
          df.accredited_tx_school_ready = JSON_CONTAINS(ce.calculation_factors, '"txSchoolReady"', '$.accreditation_features')
      `);
    } catch (err) {
      console.error('Error updating accreditation indicators, may be missing JSON fields:', err.message);
    }
    
    // Update education indicators
    console.log('Updating education indicators...');
    try {
      await pool.query(`
        UPDATE daycare_finder df
        JOIN daycare_cost_estimates ce ON df.operation_id = ce.operation_id
        SET 
          df.education_cda = JSON_CONTAINS(ce.calculation_factors, '"cda"', '$.education_features'),
          df.education_associates = JSON_CONTAINS(ce.calculation_factors, '"associates"', '$.education_features'),
          df.education_bachelors = JSON_CONTAINS(ce.calculation_factors, '"bachelors"', '$.education_features'),
          df.education_masters = JSON_CONTAINS(ce.calculation_factors, '"masters"', '$.education_features'),
          df.education_montessori_cert = JSON_CONTAINS(ce.calculation_factors, '"montessoriCert"', '$.education_features')
      `);
    } catch (err) {
      console.error('Error updating education indicators, may be missing JSON fields:', err.message);
    }
    
    // Update curriculum approaches
    console.log('Updating curriculum approaches...');
    try {
      await pool.query(`
        UPDATE daycare_finder df
        JOIN daycare_cost_estimates ce ON df.operation_id = ce.operation_id
        SET 
          df.curriculum_highscope = JSON_CONTAINS(ce.calculation_factors, '"highscope"', '$.curriculum_features'),
          df.curriculum_reggio = JSON_CONTAINS(ce.calculation_factors, '"reggio"', '$.curriculum_features'),
          df.curriculum_waldorf = JSON_CONTAINS(ce.calculation_factors, '"waldorf"', '$.curriculum_features'),
          df.curriculum_banks = JSON_CONTAINS(ce.calculation_factors, '"banks"', '$.curriculum_features'),
          df.curriculum_creative = JSON_CONTAINS(ce.calculation_factors, '"creativeCurriculum"', '$.curriculum_features'),
          df.curriculum_project = JSON_CONTAINS(ce.calculation_factors, '"projectApproach"', '$.curriculum_features'),
          df.curriculum_emergent = JSON_CONTAINS(ce.calculation_factors, '"emergent"', '$.curriculum_features')
      `);
    } catch (err) {
      console.error('Error updating curriculum approaches, may be missing JSON fields:', err.message);
    }
    
    // Check row count to confirm population
    const [countResult] = await pool.query('SELECT COUNT(*) as count FROM daycare_finder');
    console.log(`Daycare finder table populated with ${countResult[0].count} records.`);
    
    // Sample a few records to verify
    const [sampleRecords] = await pool.query(`
      SELECT 
        operation_id, 
        operation_name, 
        programs_provided,
        monthly_cost, 
        overall_rating, 
        risk_score
      FROM 
        daycare_finder 
      LIMIT 5
    `);
    
    console.log('\nSample records from daycare_finder:');
    sampleRecords.forEach((record, index) => {
      console.log(`\nRecord ${index + 1}:`);
      Object.entries(record).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    });
    
    console.log('\nDaycare finder table update completed successfully!');
    
    return { 
      success: true, 
      recordCount: countResult[0].count
    };
  } catch (err) {
    console.error('Error updating daycare finder table:', err);
    return { 
      success: false, 
      error: err.message
    };
  } finally {
    await pool.end();
  }
}

// Execute if run directly
if (require.main === module) {
  updateDaycareFinder()
    .then((result) => {
      if (result.success) {
        console.log(`Update completed with ${result.recordCount} records.`);
      } else {
        console.error(`Update failed: ${result.error}`);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}

module.exports = {
  updateDaycareFinder
};