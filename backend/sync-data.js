// Consolidated data synchronization script
require('dotenv').config();
const mysql = require('mysql2/promise');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

// Database configuration from environment vars
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER, 
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// API configuration
const apiConfig = {
  baseUrl: process.env.API_BASE_URL || 'https://data.texas.gov/resource',
  daycaresDataset: process.env.DAYCARE_DATASET,
  violationsDataset: process.env.VIOLATIONS_DATASET,
  appToken: process.env.SOCRATA_APP_TOKEN,
  batchSize: process.env.BATCH_SIZE || 1000
};

// Database connection pool
const pool = mysql.createPool(dbConfig);

// Function to sync daycare data
async function syncDaycareData() {
  try {
    logger.info('Starting daycare data synchronization...');
    
    // Fetch data from API
    const url = `${apiConfig.baseUrl}/${apiConfig.daycaresDataset}.json`;
    const response = await axios.get(url, {
      headers: {
        'X-App-Token': apiConfig.appToken
      },
      params: {
        $limit: apiConfig.batchSize
      }
    });
    
    const daycares = response.data;
    logger.info(`Fetched ${daycares.length} daycares from API`);
    
    // Process and insert data
    for (const daycare of daycares) {
      try {
        await insertDaycareRecord(daycare);
      } catch (err) {
        logger.error(`Error inserting daycare (${daycare.operation_number}):`, err);
      }
    }
    
    logger.info('Daycare data synchronization completed');
    return true;
  } catch (error) {
    logger.error('Error syncing daycare data:', error);
    return false;
  }
}

// Function to insert a daycare record
async function insertDaycareRecord(daycare) {
  const connection = await pool.getConnection();
  try {
    // Check if daycare exists
    const [existingDaycares] = await connection.query(
      'SELECT * FROM daycares WHERE operation_number = ?',
      [daycare.operation_number]
    );
    
    if (existingDaycares.length > 0) {
      // Update existing record
      await connection.query(
        `UPDATE daycares SET 
           operation_name = ?, 
           operation_type = ?,
           address = ?,
           city = ?,
           state = ?,
           zip_code = ?,
           county = ?,
           phone_number = ?,
           total_capacity = ?,
           last_data_update = CURRENT_DATE
         WHERE operation_number = ?`,
        [
          daycare.operation_name,
          daycare.operation_type,
          daycare.street_address,
          daycare.city,
          daycare.state || 'TX',
          daycare.zip,
          daycare.county,
          daycare.phone,
          daycare.total_capacity,
          daycare.operation_number
        ]
      );
    } else {
      // Insert new record
      await connection.query(
        `INSERT INTO daycares (
           operation_number, operation_name, operation_type,
           address, city, state, zip_code, county,
           phone_number, total_capacity, last_data_update
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE)`,
        [
          daycare.operation_number,
          daycare.operation_name,
          daycare.operation_type,
          daycare.street_address,
          daycare.city,
          daycare.state || 'TX',
          daycare.zip,
          daycare.county,
          daycare.phone,
          daycare.total_capacity
        ]
      );
    }
  } finally {
    connection.release();
  }
}

// Function to sync violation data
async function syncViolationData() {
  try {
    logger.info('Starting violation data synchronization...');
    
    // Fetch data from API
    const url = `${apiConfig.baseUrl}/${apiConfig.violationsDataset}.json`;
    const response = await axios.get(url, {
      headers: {
        'X-App-Token': apiConfig.appToken
      },
      params: {
        $limit: apiConfig.batchSize
      }
    });
    
    const violations = response.data;
    logger.info(`Fetched ${violations.length} violations from API`);
    
    // Process and insert data
    for (const violation of violations) {
      try {
        await insertViolationRecord(violation);
      } catch (err) {
        logger.error(`Error inserting violation (${violation.standard_number}):`, err);
      }
    }
    
    logger.info('Violation data synchronization completed');
    return true;
  } catch (error) {
    logger.error('Error syncing violation data:', error);
    return false;
  }
}

// Function to insert a violation record
async function insertViolationRecord(violation) {
  const connection = await pool.getConnection();
  try {
    // Generate a unique violation ID if not present
    const violationId = violation.violation_id || 
      `${violation.operation_number}_${violation.standard_number}_${violation.violation_date}`;
      
    // Check if violation exists
    const [existingViolations] = await connection.query(
      'SELECT * FROM violations WHERE violation_id = ?',
      [violationId]
    );
    
    if (existingViolations.length > 0) {
      // Update existing record
      await connection.query(
        `UPDATE violations SET 
           risk_level = ?,
           violation_description = ?,
           standard_number = ?,
           standard_description = ?,
           violation_date = ?,
           corrected_date = ?
         WHERE violation_id = ?`,
        [
          violation.risk_level,
          violation.violation_description,
          violation.standard_number,
          violation.standard_description,
          violation.violation_date,
          violation.corrected_date,
          violationId
        ]
      );
    } else {
      // Insert new record
      await connection.query(
        `INSERT INTO violations (
           violation_id, operation_number, risk_level,
           violation_description, standard_number, standard_description,
           violation_date, corrected_date
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          violationId,
          violation.operation_number,
          violation.risk_level,
          violation.violation_description,
          violation.standard_number,
          violation.standard_description,
          violation.violation_date,
          violation.corrected_date
        ]
      );
    }
    
    // Update violation counts on daycare record
    await updateDaycareViolationCounts(violation.operation_number, connection);
  } finally {
    connection.release();
  }
}

// Function to update violation counts for a daycare
async function updateDaycareViolationCounts(operationNumber, connection) {
  const ownConnection = !connection;
  
  try {
    if (ownConnection) {
      connection = await pool.getConnection();
    }
    
    // Count violations by risk level
    const [violationCounts] = await connection.query(
      `SELECT 
         COUNT(CASE WHEN risk_level = 'High' THEN 1 END) as high_risk,
         COUNT(CASE WHEN risk_level = 'Medium High' THEN 1 END) as medium_high_risk,
         COUNT(CASE WHEN risk_level = 'Medium' THEN 1 END) as medium_risk,
         COUNT(CASE WHEN risk_level = 'Low' THEN 1 END) as low_risk,
         COUNT(*) as total
       FROM violations
       WHERE operation_number = ?`,
      [operationNumber]
    );
    
    if (violationCounts.length > 0) {
      const counts = violationCounts[0];
      
      // Update daycare record with counts
      await connection.query(
        `UPDATE daycares SET
           high_risk_violations = ?,
           medium_high_risk_violations = ?,
           medium_risk_violations = ?,
           low_risk_violations = ?,
           total_violations_2yr = ?
         WHERE operation_number = ?`,
        [
          counts.high_risk || 0,
          counts.medium_high_risk || 0,
          counts.medium_risk || 0,
          counts.low_risk || 0,
          counts.total || 0,
          operationNumber
        ]
      );
    }
  } finally {
    if (ownConnection && connection) {
      connection.release();
    }
  }
}

// Main function to run the full sync
async function runFullSync() {
  try {
    logger.info('Starting full data synchronization...');
    
    // Check database connection
    const connection = await pool.getConnection();
    connection.release();
    logger.info('Database connection successful');
    
    // Sync daycare data
    await syncDaycareData();
    
    // Sync violation data
    await syncViolationData();
    
    logger.info('Full data synchronization completed successfully');
    return true;
  } catch (error) {
    logger.error('Error running full sync:', error);
    return false;
  }
}

// Run the sync if this script is executed directly
if (require.main === module) {
  runFullSync()
    .then(success => {
      if (success) {
        logger.info('✅ Data synchronization completed successfully');
        process.exit(0);
      } else {
        logger.error('❌ Data synchronization failed');
        process.exit(1);
      }
    })
    .catch(err => {
      logger.error('Unexpected error during synchronization:', err);
      process.exit(1);
    });
}

module.exports = {
  syncDaycareData,
  syncViolationData,
  runFullSync
};
