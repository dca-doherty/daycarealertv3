/**
 * Load ALL Violations Data Script - Fixed Version
 * 
 * This script loads violations from the Texas API with better error handling
 * and query optimization to avoid API limits.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://data.texas.gov/resource';
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN || 'XLZk8nhCZvuJ9UooaKbfng3ed';
const VIOLATIONS_DATASET = 'tqgd-mf4x';  // This is the correct dataset ID
const BATCH_SIZE = 500;    // Smaller batch size to avoid API limits
const QUERY_DELAY = 500;   // Milliseconds to wait between API requests

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

// Create the non_compliance table if it doesn't exist
async function setupDatabase(pool) {
  console.log('Verifying non_compliance table exists...');
  
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
  console.log('Database setup complete');
}

// Sleep function to add delay between API calls
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get the total count of violations in the dataset
async function getViolationCount() {
  try {
    const response = await api.get(`/${VIOLATIONS_DATASET}.json`, {
      params: {
        $select: 'COUNT(*) as count'
      }
    });
    
    if (response.data && response.data.length > 0) {
      return parseInt(response.data[0].count, 10);
    }
    
    return 0;
  } catch (err) {
    console.error('Error getting violation count:', err.message);
    return 0;
  }
}

// Load violations by year ranges to avoid API limits
async function loadViolationsByYear(pool, year) {
  console.log(`Loading violations for year ${year}...`);
  
  try {
    // Create a date range for this year
    const startDate = `${year}-01-01T00:00:00.000`;
    const endDate = `${year}-12-31T23:59:59.999`;
    
    const whereClause = `activity_date between '${startDate}' and '${endDate}'`;
    
    // Get count for this year
    const countResponse = await api.get(`/${VIOLATIONS_DATASET}.json`, {
      params: {
        $select: 'COUNT(*) as count',
        $where: whereClause
      }
    });
    
    const yearCount = countResponse.data[0].count ? parseInt(countResponse.data[0].count, 10) : 0;
    console.log(`Found ${yearCount} violations for year ${year}`);
    
    if (yearCount === 0) {
      return 0;
    }
    
    // Process in batches
    let offset = 0;
    let totalForYear = 0;
    let hasMore = true;
    
    while (hasMore && offset < yearCount) {
      console.log(`Loading batch for year ${year}, offset ${offset}...`);
      
      // Add a delay to avoid hitting API rate limits
      await sleep(QUERY_DELAY);
      
      const response = await api.get(`/${VIOLATIONS_DATASET}.json`, {
        params: {
          $where: whereClause,
          $limit: BATCH_SIZE,
          $offset: offset,
          $order: 'activity_date DESC'
        }
      });
      
      const violations = response.data;
      console.log(`Fetched ${violations.length} violations`);
      
      if (violations.length === 0) {
        break;
      }
      
      // Insert violations into database
      const connection = await pool.getConnection();
      let insertedCount = 0;
      
      try {
        // Use transactions for better performance
        await connection.beginTransaction();
        
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
            
            insertedCount++;
          } catch (err) {
            console.error(`Error processing violation ${violation.non_compliance_id}:`, err.message);
          }
        }
        
        // Commit the transaction
        await connection.commit();
        console.log(`Inserted/updated ${insertedCount} violations for year ${year}`);
        
        totalForYear += insertedCount;
        offset += violations.length;
        
        // Check if we have more to process
        hasMore = violations.length === BATCH_SIZE;
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    }
    
    console.log(`Completed loading for year ${year}: ${totalForYear} violations loaded`);
    return totalForYear;
  } catch (err) {
    console.error(`Error loading violations for year ${year}:`, err.message);
    return 0;
  }
}

// Load violations by all operation IDs
async function loadViolationsByOperationId(pool) {
  console.log('\nGetting list of operation IDs...');
  
  try {
    // Get a list of operation IDs from the API
    const response = await api.get(`/${VIOLATIONS_DATASET}.json`, {
      params: {
        $select: 'DISTINCT operation_id',
        $limit: 5000
      }
    });
    
    const operationIds = response.data.map(item => item.operation_id);
    console.log(`Found ${operationIds.length} unique operation IDs`);
    
    let totalLoaded = 0;
    
    // Process each operation ID
    for (let i = 0; i < operationIds.length; i++) {
      const operationId = operationIds[i];
      
      console.log(`Processing operation ID ${i+1}/${operationIds.length}: ${operationId}`);
      
      try {
        // Add a delay to avoid hitting API rate limits
        await sleep(QUERY_DELAY);
        
        // Get violations for this operation ID
        const violationsResponse = await api.get(`/${VIOLATIONS_DATASET}.json`, {
          params: {
            operation_id: operationId,
            $limit: BATCH_SIZE
          }
        });
        
        const violations = violationsResponse.data;
        console.log(`Found ${violations.length} violations for operation ID ${operationId}`);
        
        if (violations.length === 0) {
          continue;
        }
        
        // Insert violations into database
        const connection = await pool.getConnection();
        let insertedCount = 0;
        
        try {
          // Use transactions for better performance
          await connection.beginTransaction();
          
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
              
              insertedCount++;
            } catch (err) {
              console.error(`Error processing violation ${violation.non_compliance_id}:`, err.message);
            }
          }
          
          // Commit the transaction
          await connection.commit();
          console.log(`Inserted/updated ${insertedCount} violations for operation ID ${operationId}`);
          
          totalLoaded += insertedCount;
        } catch (err) {
          await connection.rollback();
          throw err;
        } finally {
          connection.release();
        }
      } catch (err) {
        console.error(`Error processing operation ID ${operationId}:`, err.message);
      }
    }
    
    console.log(`Completed loading by operation ID: ${totalLoaded} violations loaded`);
    return totalLoaded;
  } catch (err) {
    console.error('Error loading violations by operation ID:', err.message);
    return 0;
  }
}

// Update violation counts for daycares
async function updateViolationCounts(pool) {
  console.log('Updating daycare violation counts...');
  
  const connection = await pool.getConnection();
  try {
    // Find all unique operation IDs in the violations table
    const [operationIds] = await connection.query(
      'SELECT DISTINCT OPERATION_ID FROM non_compliance'
    );
    
    console.log(`Found ${operationIds.length} unique operation IDs with violations`);
    
    let updatedCount = 0;
    let missingCount = 0;
    
    // Process each operation ID
    for (const { OPERATION_ID } of operationIds) {
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
          [OPERATION_ID]
        );
        
        if (violationCounts.length > 0) {
          const counts = violationCounts[0];
          
          // Check if this operation ID exists in our daycare table
          const [daycare] = await connection.query(
            'SELECT OPERATION_NUMBER FROM daycare_operations WHERE OPERATION_NUMBER = ?',
            [OPERATION_ID]
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
                OPERATION_ID
              ]
            );
            
            updatedCount++;
          } else {
            missingCount++;
          }
        }
      } catch (err) {
        console.error(`Error updating counts for operation ID ${OPERATION_ID}:`, err.message);
      }
    }
    
    console.log(`Updated violation counts for ${updatedCount} daycares`);
    console.log(`Found ${missingCount} operation IDs that don't match any daycare in the database`);
    
    return { updatedCount, missingCount };
  } finally {
    connection.release();
  }
}

// Main function
async function main() {
  console.log('Starting improved violations data loading process...');
  
  // Create connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Setup database
    await setupDatabase(pool);
    
    // Get total count in the dataset
    const totalCount = await getViolationCount();
    console.log(`Total violations in dataset: ${totalCount}`);
    
    // Load violations by year ranges (better for API limits)
    let totalLoaded = 0;
    
    // Process recent years first
    const currentYear = new Date().getFullYear();
    const yearsToProcess = [];
    
    // Add current year and past 5 years
    for (let year = currentYear; year >= currentYear - 5; year--) {
      yearsToProcess.push(year);
    }
    
    console.log(`Processing years: ${yearsToProcess.join(', ')}`);
    
    // Load violations by year
    for (const year of yearsToProcess) {
      const yearCount = await loadViolationsByYear(pool, year);
      totalLoaded += yearCount;
      console.log(`Progress: ${totalLoaded} total violations loaded so far`);
    }
    
    // If we didn't get all the data, try operation ID approach
    if (totalLoaded < totalCount * 0.8) { // If we got less than 80% of the data
      console.log('Trying operation ID approach to get more violations...');
      const moreLoaded = await loadViolationsByOperationId(pool);
      totalLoaded += moreLoaded;
    }
    
    console.log(`\nViolations data loading completed. Total violations loaded: ${totalLoaded}`);
    
    // Update daycare records with violation counts
    if (totalLoaded > 0) {
      await updateViolationCounts(pool);
    }
    
    // Close the pool
    await pool.end();
    
    console.log('\nProcess completed successfully!');
  } catch (err) {
    console.error('Error in data loading process:', err);
    
    // Try to close the pool on error
    try {
      await pool.end();
    } catch (e) {
      // Ignore pool closing errors
    }
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});