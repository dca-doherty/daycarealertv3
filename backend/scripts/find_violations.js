/**
 * Find Violations Data Script
 * 
 * This script fetches sample violations from the API to find valid operation IDs,
 * then loads those specific daycares' violations into the database.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://data.texas.gov/resource';
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN || 'XLZk8nhCZvuJ9UooaKbfng3ed';
const VIOLATIONS_DATASET = 'tqgd-mf4x';  // This is the correct dataset ID
const SAMPLE_SIZE = 5000;  // Increased to get more operation IDs
const BATCH_SIZE = 1000;   // Process data in batches

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
  console.log('Starting violations data discovery process...');
  
  try {
    // Step 1: Fetch sample violations to find valid operation IDs
    console.log(`Fetching ${SAMPLE_SIZE} sample violations from the dataset...`);
    
    const response = await api.get(`/${VIOLATIONS_DATASET}.json`, {
      params: {
        $limit: SAMPLE_SIZE,
        $order: 'corrected_date DESC'  // Get recent ones
      }
    });
    
    const violations = response.data;
    console.log(`Found ${violations.length} sample violations`);
    
    if (violations.length === 0) {
      console.log('No violations found in the dataset. Check the dataset ID.');
      return;
    }
    
    // Extract unique operation IDs
    const operationIds = [...new Set(violations.map(v => v.operation_id))];
    console.log(`Found ${operationIds.length} unique operation IDs in the violations dataset:`);
    console.log(operationIds.slice(0, 10).join(', ') + (operationIds.length > 10 ? '...' : ''));
    
    // Print a sample violation to see its structure
    console.log('\nSample violation data:');
    console.log(JSON.stringify(violations[0], null, 2));
    
    // Create MySQL connection pool
    const pool = mysql.createPool(dbConfig);
    
    // Step 2: Verify non_compliance table exists
    console.log('\nVerifying non_compliance table exists...');
    
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
    
    // Step 3: Find which operation IDs exist in our daycare database
    console.log('\nChecking which operation IDs match daycares in our database...');
    
    const [matchingDaycares] = await pool.query(
      `SELECT OPERATION_NUMBER FROM daycare_operations 
       WHERE OPERATION_NUMBER IN (?)`,
      [operationIds]
    );
    
    console.log(`Found ${matchingDaycares.length} matching daycares in our database`);
    
    if (matchingDaycares.length === 0) {
      // If no matches, check if the format is different
      console.log('\nNo matches found. Checking if IDs need formatting...');
      
      // Try to extract the numeric part of sample daycare IDs
      const [someDaycares] = await pool.query(
        `SELECT OPERATION_NUMBER FROM daycare_operations LIMIT 5`
      );
      
      console.log('Sample daycare IDs in our database:');
      someDaycares.forEach(d => console.log(d.OPERATION_NUMBER));
      
      console.log('\nThis suggests the ID formats might be different.');
      console.log('Let\'s proceed by loading violations for the IDs we found anyway.');
    }
    
    // Step 4: Load violations for the operation IDs we found
    console.log('\nLoading violations for the identified operation IDs...');
    
    let totalViolations = 0;
    
    // Use the operation IDs from the samples even if they don't match our database
    for (let i = 0; i < operationIds.length; i++) {
      const operationId = operationIds[i];
      
      console.log(`Processing violations for operation ID ${i+1}/${operationIds.length}: ${operationId}`);
      
      try {
        // Get all violations for this operation ID
        const response = await api.get(`/${VIOLATIONS_DATASET}.json`, {
          params: {
            operation_id: operationId,
            $limit: 500
          }
        });
        
        const violations = response.data;
        console.log(`Found ${violations.length} violations for operation ID ${operationId}`);
        
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
            
            totalViolations += violations.length;
          } finally {
            connection.release();
          }
        }
      } catch (err) {
        console.error(`Error fetching violations for operation ID ${operationId}:`, err.message);
      }
    }
    
    console.log(`\nViolations data loading completed. Total violations loaded: ${totalViolations}`);
    
    // Step 5: Update daycare records with violation counts
    if (totalViolations > 0) {
      console.log('\nUpdating daycare violation counts...');
      
      const connection = await pool.getConnection();
      try {
        // Find daycares that have violations
        const [violationCounts] = await connection.query(`
          SELECT OPERATION_ID, 
            COUNT(CASE WHEN STANDARD_RISK_LEVEL = 'High' THEN 1 END) as high_risk,
            COUNT(CASE WHEN STANDARD_RISK_LEVEL = 'Medium High' THEN 1 END) as medium_high_risk,
            COUNT(CASE WHEN STANDARD_RISK_LEVEL = 'Medium' THEN 1 END) as medium_risk,
            COUNT(CASE WHEN STANDARD_RISK_LEVEL = 'Medium Low' OR STANDARD_RISK_LEVEL = 'Low' THEN 1 END) as low_risk,
            COUNT(*) as total
          FROM non_compliance
          GROUP BY OPERATION_ID
        `);
        
        console.log(`Found ${violationCounts.length} daycares with violations`);
        
        let updatedDaycares = 0;
        
        for (const counts of violationCounts) {
          try {
            // Check if this operation ID exists in our daycare table
            const [daycare] = await connection.query(
              'SELECT OPERATION_NUMBER FROM daycare_operations WHERE OPERATION_NUMBER = ?',
              [counts.OPERATION_ID]
            );
            
            if (daycare.length > 0) {
              // Update the daycare record
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
                  counts.OPERATION_ID
                ]
              );
              
              updatedDaycares++;
            }
          } catch (err) {
            console.error(`Error updating violation counts for operation ID ${counts.OPERATION_ID}:`, err.message);
          }
        }
        
        console.log(`Updated violation counts for ${updatedDaycares} daycares`);
      } finally {
        connection.release();
      }
    }
    
    // Close the pool
    await pool.end();
    
    console.log('\nProcess completed successfully!');
  } catch (err) {
    console.error('Error in data loading process:', err);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});