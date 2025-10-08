/**
 * Load Inspection Data
 * 
 * This script loads inspection data from the Texas API into a MySQL table.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://data.texas.gov/resource';
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN || 'XLZk8nhCZvuJ9UooaKbfng3ed';
const INSPECTIONS_DATASET = 'm5q4-3y3d';  // The inspections dataset ID
const BATCH_SIZE = 500;     // Batch size for API requests
const QUERY_DELAY = 1000;   // Delay between API requests (ms)
const MAX_RECORDS = 50000;  // Maximum number of records to load

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

// Create the inspections table if it doesn't exist
async function setupDatabase(pool) {
  console.log('Verifying inspections table exists...');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inspections (
      id INT AUTO_INCREMENT PRIMARY KEY,
      OPERATION_ID VARCHAR(50) NOT NULL,
      ACTIVITY_ID VARCHAR(50) NOT NULL,
      ACTIVITY_DATE DATETIME,
      ACTIVITY_TYPE VARCHAR(50),
      VIOLATION_FOUND VARCHAR(20),
      LAST_UPDATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY (ACTIVITY_ID),
      INDEX (OPERATION_ID),
      INDEX (ACTIVITY_DATE),
      INDEX (ACTIVITY_TYPE)
    )
  `);
  console.log('Database setup complete');
}

// Sleep function to add delay between API calls
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Load inspections in batches
async function loadInspectionsBatch(pool, offset) {
  console.log(`Loading inspections batch at offset ${offset}...`);
  
  try {
    // Add delay to avoid hitting API rate limits
    await sleep(QUERY_DELAY);
    
    // Make the API request
    const response = await api.get(`/${INSPECTIONS_DATASET}.json`, {
      params: {
        $limit: BATCH_SIZE,
        $offset: offset,
        $order: 'activity_id'
      }
    });
    
    const inspections = response.data;
    console.log(`Fetched ${inspections.length} inspections`);
    
    if (inspections.length === 0) {
      return { count: 0, hasMore: false };
    }
    
    // Insert the inspections into the database
    const connection = await pool.getConnection();
    let insertedCount = 0;
    
    try {
      // Process each inspection
      for (const inspection of inspections) {
        try {
          // Map API response to database fields
          const inspectionData = {
            OPERATION_ID: inspection.operation_id,
            ACTIVITY_ID: inspection.activity_id,
            ACTIVITY_DATE: inspection.activity_date ? new Date(inspection.activity_date) : null,
            ACTIVITY_TYPE: inspection.activity_type,
            VIOLATION_FOUND: inspection.violation_found
          };
          
          // Insert or update the inspection
          const fields = Object.keys(inspectionData);
          const placeholders = Array(fields.length).fill('?').join(', ');
          const updateClauses = fields.map(field => `${field}=VALUES(${field})`).join(', ');
          
          const sql = `
            INSERT INTO inspections (${fields.join(', ')})
            VALUES (${placeholders})
            ON DUPLICATE KEY UPDATE ${updateClauses}
          `;
          
          await connection.query(sql, Object.values(inspectionData));
          insertedCount++;
        } catch (err) {
          console.error(`Error processing inspection ${inspection.activity_id}:`, err.message);
        }
      }
      
      console.log(`Inserted/updated ${insertedCount} inspections`);
      return { 
        count: insertedCount,
        hasMore: inspections.length === BATCH_SIZE
      };
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(`Error loading batch at offset ${offset}:`, err.message);
    return { count: 0, hasMore: true }; // Assume there might be more to try
  }
}

// Update inspection counts for daycares
async function updateInspectionCounts(pool) {
  console.log('Updating daycare inspection counts...');
  
  try {
    // Get a count of distinct operation IDs in the inspections table
    const [countResult] = await pool.query(
      'SELECT COUNT(DISTINCT OPERATION_ID) as count FROM inspections'
    );
    
    const operationIdCount = countResult[0].count;
    console.log(`Found ${operationIdCount} unique operation IDs with inspections`);
    
    // Add total_inspections column to daycare_operations if it doesn't exist
    await pool.query(`
      ALTER TABLE daycare_operations 
      ADD COLUMN IF NOT EXISTS TOTAL_INSPECTIONS INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS LAST_INSPECTION_DATE DATE DEFAULT NULL
    `);
    
    // Update all daycares with a single query
    const [result] = await pool.query(`
      UPDATE daycare_operations d
      JOIN (
        SELECT 
          OPERATION_ID,
          COUNT(*) as total_inspections,
          MAX(ACTIVITY_DATE) as last_inspection_date
        FROM inspections
        WHERE ACTIVITY_TYPE = 'INSPECTION'
        GROUP BY OPERATION_ID
      ) i ON d.OPERATION_NUMBER = i.OPERATION_ID
      SET 
        d.TOTAL_INSPECTIONS = i.total_inspections,
        d.LAST_INSPECTION_DATE = i.last_inspection_date
    `);
    
    console.log(`Updated inspection counts for ${result.affectedRows} daycares`);
    
    // Count how many operation IDs don't match daycares
    const [missingResult] = await pool.query(`
      SELECT COUNT(DISTINCT i.OPERATION_ID) as count
      FROM inspections i
      LEFT JOIN daycare_operations d ON i.OPERATION_ID = d.OPERATION_NUMBER
      WHERE d.OPERATION_NUMBER IS NULL
    `);
    
    const missingCount = missingResult[0].count;
    console.log(`Found ${missingCount} operation IDs that don't match any daycare in the database`);
    
    return { 
      updatedCount: result.affectedRows,
      missingCount 
    };
  } catch (err) {
    console.error('Error updating inspection counts:', err.message);
    return { updatedCount: 0, missingCount: 0 };
  }
}

// Main function
async function main() {
  console.log('Starting inspection data loading process...');
  
  // Create connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Setup database
    await setupDatabase(pool);
    
    // Load inspections in batches
    let offset = 0;
    let totalLoaded = 0;
    let hasMore = true;
    
    while (hasMore && offset < MAX_RECORDS) {
      const result = await loadInspectionsBatch(pool, offset);
      
      if (result.count > 0) {
        totalLoaded += result.count;
        console.log(`Progress: ${totalLoaded} total inspections loaded (${offset} processed so far)`);
      }
      
      // Move to next batch
      offset += BATCH_SIZE;
      hasMore = result.hasMore;
      
      // If we got nothing, we might just need to try the next batch
      if (result.count === 0 && hasMore) {
        console.log(`No inspections returned at offset ${offset - BATCH_SIZE}, trying next batch`);
      }
    }
    
    console.log(`\nInspection data loading completed. Total inspections loaded: ${totalLoaded}`);
    
    // Update daycare records with inspection counts
    if (totalLoaded > 0) {
      await updateInspectionCounts(pool);
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