/**
 * Load Violations Data - Basic Reliable Version
 * 
 * This script loads violations from the Texas API using a simple, reliable approach
 * that avoids complex filters that might cause API errors.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://data.texas.gov/resource';
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN || 'XLZk8nhCZvuJ9UooaKbfng3ed';
const VIOLATIONS_DATASET = 'tqgd-mf4x';  // This is the correct dataset ID
const BATCH_SIZE = 500;     // Smaller batch size to avoid API limits
const QUERY_DELAY = 1000;   // Delay between API requests (ms)
const MAX_RECORDS = 50000;  // Maximum number of records to attempt to load

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
      UNIQUE KEY (NON_COMPLIANCE_ID),
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

// Load violations in small batches
async function loadViolationsBatch(pool, offset) {
  console.log(`Loading violations batch at offset ${offset}...`);
  
  try {
    // Add delay to avoid hitting API rate limits
    await sleep(QUERY_DELAY);
    
    // Make the API request
    const response = await api.get(`/${VIOLATIONS_DATASET}.json`, {
      params: {
        $limit: BATCH_SIZE,
        $offset: offset,
        $order: 'non_compliance_id'
      }
    });
    
    const violations = response.data;
    console.log(`Fetched ${violations.length} violations`);
    
    if (violations.length === 0) {
      return { count: 0, hasMore: false };
    }
    
    // Insert the violations into the database
    const connection = await pool.getConnection();
    let insertedCount = 0;
    
    try {
      // Process each violation
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
          
          // Insert or update the violation
          const fields = Object.keys(violationData);
          const placeholders = Array(fields.length).fill('?').join(', ');
          const updateClauses = fields.map(field => `${field}=VALUES(${field})`).join(', ');
          
          const sql = `
            INSERT INTO non_compliance (${fields.join(', ')})
            VALUES (${placeholders})
            ON DUPLICATE KEY UPDATE ${updateClauses}
          `;
          
          await connection.query(sql, Object.values(violationData));
          insertedCount++;
        } catch (err) {
          console.error(`Error processing violation ${violation.non_compliance_id}:`, err.message);
        }
      }
      
      console.log(`Inserted/updated ${insertedCount} violations`);
      return { 
        count: insertedCount,
        hasMore: violations.length === BATCH_SIZE
      };
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(`Error loading batch at offset ${offset}:`, err.message);
    return { count: 0, hasMore: true }; // Assume there might be more to try
  }
}

// Update violation counts for daycares
async function updateViolationCounts(pool) {
  console.log('Updating daycare violation counts...');
  
  try {
    // Get a count of distinct operation IDs in the violations table
    const [countResult] = await pool.query(
      'SELECT COUNT(DISTINCT OPERATION_ID) as count FROM non_compliance'
    );
    
    const operationIdCount = countResult[0].count;
    console.log(`Found ${operationIdCount} unique operation IDs with violations`);
    
    // Update all daycares with a single query
    const [result] = await pool.query(`
      UPDATE daycare_operations d
      JOIN (
        SELECT 
          OPERATION_ID,
          COUNT(CASE WHEN STANDARD_RISK_LEVEL = 'High' THEN 1 END) as high_risk,
          COUNT(CASE WHEN STANDARD_RISK_LEVEL = 'Medium High' THEN 1 END) as medium_high_risk,
          COUNT(CASE WHEN STANDARD_RISK_LEVEL = 'Medium' THEN 1 END) as medium_risk,
          COUNT(CASE WHEN STANDARD_RISK_LEVEL = 'Medium Low' OR STANDARD_RISK_LEVEL = 'Low' THEN 1 END) as low_risk,
          COUNT(*) as total
        FROM non_compliance
        GROUP BY OPERATION_ID
      ) v ON d.OPERATION_NUMBER = v.OPERATION_ID
      SET 
        d.HIGH_RISK_VIOLATIONS = v.high_risk,
        d.MEDIUM_HIGH_RISK_VIOLATIONS = v.medium_high_risk,
        d.MEDIUM_RISK_VIOLATIONS = v.medium_risk,
        d.LOW_RISK_VIOLATIONS = v.low_risk,
        d.TOTAL_VIOLATIONS = v.total
    `);
    
    console.log(`Updated violation counts for ${result.affectedRows} daycares`);
    
    // Count how many operation IDs don't match daycares
    const [missingResult] = await pool.query(`
      SELECT COUNT(DISTINCT n.OPERATION_ID) as count
      FROM non_compliance n
      LEFT JOIN daycare_operations d ON n.OPERATION_ID = d.OPERATION_NUMBER
      WHERE d.OPERATION_NUMBER IS NULL
    `);
    
    const missingCount = missingResult[0].count;
    console.log(`Found ${missingCount} operation IDs that don't match any daycare in the database`);
    
    return { 
      updatedCount: result.affectedRows,
      missingCount 
    };
  } catch (err) {
    console.error('Error updating violation counts:', err.message);
    return { updatedCount: 0, missingCount: 0 };
  }
}

// Main function
async function main() {
  console.log('Starting basic violations data loading process...');
  
  // Create connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Setup database
    await setupDatabase(pool);
    
    // Load violations in batches
    let offset = 0;
    let totalLoaded = 0;
    let hasMore = true;
    
    while (hasMore && offset < MAX_RECORDS) {
      const result = await loadViolationsBatch(pool, offset);
      
      if (result.count > 0) {
        totalLoaded += result.count;
        console.log(`Progress: ${totalLoaded} total violations loaded (${offset} processed so far)`);
      }
      
      // Move to next batch
      offset += BATCH_SIZE;
      hasMore = result.hasMore;
      
      // If we got nothing, we might just need to try the next batch
      if (result.count === 0 && hasMore) {
        console.log(`No violations returned at offset ${offset - BATCH_SIZE}, trying next batch`);
      }
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