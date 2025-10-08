/**
 * Load Violations Data Script
 * 
 * This script specifically loads non-compliance (violations) data from the Texas API
 * into your MySQL database using the correct field mappings.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://data.texas.gov/resource';
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN || 'XLZk8nhCZvuJ9UooaKbfng3ed';
const VIOLATIONS_DATASET = 'tqgd-mf4x';  // This is the correct dataset ID
const BATCH_SIZE = 100;
const DAYCARES_TO_PROCESS = 20;  // Increase this as needed

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'daycarealert',
  connectionLimit: 10
};

// Initialize API client
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-App-Token': APP_TOKEN
  }
});

async function main() {
  console.log('Starting violations data loading process...');
  
  const pool = mysql.createPool(dbConfig);
  
  try {
    console.log('Verifying non_compliance table exists...');
    
    // Create non_compliance table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS non_compliance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        NON_COMPLIANCE_ID VARCHAR(255),
        OPERATION_ID VARCHAR(50) NOT NULL,
        ACTIVITY_ID VARCHAR(50),
        SECTION_ID VARCHAR(50),
        STANDARD_NUMBER_DESCRIPTION TEXT,
        STANDARD_RISK_LEVEL VARCHAR(50),
        NARRATIVE TEXT,
        TECHNICAL_ASSISTANCE_GIVEN VARCHAR(10),
        CORRECTED_AT_INSPECTION VARCHAR(10),
        CORRECTED_DATE DATE,
        DATE_CORRECTION_VERIFIED DATE,
        ACTIVITY_DATE DATE,
        LAST_UPDATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (OPERATION_ID),
        INDEX (STANDARD_RISK_LEVEL)
      )
    `);
    
    console.log('Getting list of daycares...');
    
    // Get list of daycares to process
    const [daycares] = await pool.query(
      `SELECT OPERATION_NUMBER FROM daycare_operations 
       ORDER BY RAND() LIMIT ${DAYCARES_TO_PROCESS}`
    );
    
    console.log(`Found ${daycares.length} daycares to process`);
    
    let totalViolations = 0;
    
    // Process each daycare
    for (let i = 0; i < daycares.length; i++) {
      const daycare = daycares[i];
      const operationNumber = daycare.OPERATION_NUMBER;
      
      console.log(`Processing daycare ${i+1}/${daycares.length}: ${operationNumber}`);
      
      try {
        // Query the API using operation_id (verified to be the correct field name)
        const response = await api.get(`/${VIOLATIONS_DATASET}.json`, {
          params: {
            operation_id: operationNumber,
            $limit: 500
          }
        });
        
        const violations = response.data;
        console.log(`Found ${violations.length} violations for daycare ${operationNumber}`);
        
        if (violations.length > 0) {
          // Insert each violation into the database
          const connection = await pool.getConnection();
          
          try {
            for (const violation of violations) {
              try {
                // Map API response to database fields
                const violationData = {
                  NON_COMPLIANCE_ID: violation.non_compliance_id,
                  OPERATION_ID: violation.operation_id,
                  ACTIVITY_ID: violation.activity_id,
                  SECTION_ID: violation.section_id,
                  STANDARD_NUMBER_DESCRIPTION: violation.standard_number_description,
                  STANDARD_RISK_LEVEL: violation.standard_risk_level,
                  NARRATIVE: violation.narrative,
                  TECHNICAL_ASSISTANCE_GIVEN: violation.technical_assistance_given,
                  CORRECTED_AT_INSPECTION: violation.corrected_at_inspection,
                  CORRECTED_DATE: violation.corrected_date ? new Date(violation.corrected_date) : null,
                  DATE_CORRECTION_VERIFIED: violation.date_correction_verified ? new Date(violation.date_correction_verified) : null,
                  ACTIVITY_DATE: violation.activity_date ? new Date(violation.activity_date) : null
                };
                
                // Check if this violation already exists
                const [existing] = await connection.query(
                  'SELECT id FROM non_compliance WHERE NON_COMPLIANCE_ID = ?',
                  [violation.non_compliance_id]
                );
                
                if (existing.length > 0) {
                  // Update existing record
                  const fields = Object.keys(violationData)
                    .map(key => `${key} = ?`)
                    .join(', ');
                  
                  await connection.query(
                    `UPDATE non_compliance SET ${fields} WHERE NON_COMPLIANCE_ID = ?`,
                    [...Object.values(violationData), violation.non_compliance_id]
                  );
                } else {
                  // Insert new record
                  const fields = Object.keys(violationData).join(', ');
                  const placeholders = Object.keys(violationData).map(() => '?').join(', ');
                  
                  await connection.query(
                    `INSERT INTO non_compliance (${fields}) VALUES (${placeholders})`,
                    Object.values(violationData)
                  );
                }
              } catch (err) {
                console.error(`Error processing violation ${violation.non_compliance_id}:`, err.message);
              }
            }
            
            // Update violation counts
            await updateViolationCounts(operationNumber, connection);
            
            totalViolations += violations.length;
          } finally {
            connection.release();
          }
        }
      } catch (err) {
        console.error(`Error fetching violations for daycare ${operationNumber}:`, err.message);
      }
    }
    
    console.log(`Violations data loading completed. Total violations loaded: ${totalViolations}`);
  } catch (err) {
    console.error('Error in data loading process:', err);
  } finally {
    pool.end();
  }
}

async function updateViolationCounts(operationNumber, connection) {
  try {
    // Count violations by risk level
    const [violationCounts] = await connection.query(
      `SELECT 
        COUNT(CASE WHEN STANDARD_RISK_LEVEL = 'High' THEN 1 END) as high_risk,
        COUNT(CASE WHEN STANDARD_RISK_LEVEL = 'Medium High' THEN 1 END) as medium_high_risk,
        COUNT(CASE WHEN STANDARD_RISK_LEVEL = 'Medium' THEN 1 END) as medium_risk,
        COUNT(CASE WHEN STANDARD_RISK_LEVEL = 'Medium Low' OR STANDARD_RISK_LEVEL = 'Low' THEN 1 END) as low_risk,
        COUNT(*) as total
      FROM non_compliance
      WHERE OPERATION_ID = ?`,
      [operationNumber]
    );
    
    if (violationCounts.length > 0) {
      const counts = violationCounts[0];
      
      // Update daycare_operations table with violation counts
      await connection.query(
        `UPDATE daycare_operations SET
          HIGH_RISK_VIOLATIONS = ?,
          MEDIUM_HIGH_RISK_VIOLATIONS = ?,
          MEDIUM_RISK_VIOLATIONS = ?,
          LOW_RISK_VIOLATIONS = ?,
          TOTAL_VIOLATIONS = ?
        WHERE OPERATION_NUMBER = ?`,
        [
          counts.high_risk || 0,
          counts.medium_high_risk || 0,
          counts.medium_risk || 0,
          counts.low_risk || 0,
          counts.total || 0,
          operationNumber
        ]
      );
      
      console.log(`Updated violation counts for daycare ${operationNumber}: ${counts.total} total violations`);
    }
  } catch (err) {
    console.error(`Error updating violation counts for daycare ${operationNumber}:`, err.message);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});