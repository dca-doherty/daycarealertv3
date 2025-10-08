/**
 * Add programs_provided to daycare_operations table
 * 
 * This script updates the daycare_operations table to include the programs_provided field
 * from the Texas HHSC API. It's important because we need to use the programs_provided field
 * rather than programmatic_services for more accurate daycare finder results.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://data.texas.gov/resource';
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN || 'XLZk8nhCZvuJ9UooaKbfng3ed';
const DAYCARE_DATASET = process.env.DAYCARE_DATASET || 'bc5r-88dy';
const BATCH_SIZE = 1000;
const QUERY_DELAY = 500; // ms between API requests

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Initialize API client
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-App-Token': APP_TOKEN
  }
});

// Sleep function to add delay between API calls
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if programs_provided column exists in daycare_operations table
async function checkAndAddColumn() {
  console.log('Checking if programs_provided column exists...');
  
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Check if the column exists
    const [columns] = await pool.query('DESCRIBE daycare_operations');
    const existingColumns = columns.map(col => col.Field.toUpperCase());
    
    if (!existingColumns.includes('PROGRAMS_PROVIDED')) {
      console.log('Adding PROGRAMS_PROVIDED column to daycare_operations table...');
      await pool.query(`
        ALTER TABLE daycare_operations 
        ADD COLUMN PROGRAMS_PROVIDED TEXT AFTER PROGRAMMATIC_SERVICES
      `);
      console.log('Column added successfully');
      return true;
    } else {
      console.log('PROGRAMS_PROVIDED column already exists');
      return true;
    }
  } catch (err) {
    console.error('Error checking/adding column:', err);
    return false;
  } finally {
    await pool.end();
  }
}

// Get total number of records in API dataset
async function getRecordCount() {
  try {
    const response = await api.get(`/${DAYCARE_DATASET}.json`, {
      params: {
        $select: 'COUNT(*) as count'
      }
    });
    
    if (response.data && response.data.length > 0) {
      return parseInt(response.data[0].count, 10);
    }
    
    return 0;
  } catch (err) {
    console.error('Error getting record count:', err.message);
    return 0;
  }
}

// Fetch and update programs_provided values in batches
async function updateProgramsProvided() {
  console.log('Updating programs_provided field in daycare_operations table...');
  
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Get total record count
    const totalRecords = await getRecordCount();
    console.log(`Total records in API dataset: ${totalRecords}`);
    
    let offset = 0;
    let totalUpdated = 0;
    let hasMore = true;
    
    // Process in batches
    while (hasMore) {
      // Add delay to avoid hitting API rate limits
      await sleep(QUERY_DELAY);
      
      console.log(`Fetching batch at offset ${offset}...`);
      const response = await api.get(`/${DAYCARE_DATASET}.json`, {
        params: {
          $select: 'operation_id, operation_number, operation_name, programs_provided',
          $limit: BATCH_SIZE,
          $offset: offset
        }
      });
      
      const records = response.data;
      console.log(`Received ${records.length} records from API`);
      
      if (records.length === 0) {
        hasMore = false;
        break;
      }
      
      // Update database in a transaction
      const connection = await pool.getConnection();
      let batchUpdated = 0;
      
      try {
        await connection.beginTransaction();
        
        for (const record of records) {
          if (record.operation_number && record.programs_provided) {
            // Update the record in the database
            const [result] = await connection.query(
              'UPDATE daycare_operations SET PROGRAMS_PROVIDED = ? WHERE OPERATION_NUMBER = ?',
              [record.programs_provided, record.operation_number]
            );
            
            if (result.affectedRows > 0) {
              batchUpdated++;
            }
          }
        }
        
        await connection.commit();
        totalUpdated += batchUpdated;
        console.log(`Updated ${batchUpdated} records in this batch (total: ${totalUpdated})`);
      } catch (err) {
        await connection.rollback();
        console.error('Error updating batch:', err);
      } finally {
        connection.release();
      }
      
      // Move to next batch
      offset += BATCH_SIZE;
      
      // Stop if we got less than a full batch
      if (records.length < BATCH_SIZE) {
        hasMore = false;
      }
      
      // Log progress
      const progress = Math.min(100, Math.round((offset / totalRecords) * 100));
      console.log(`Progress: ${progress}% complete`);
    }
    
    console.log(`\nUpdate complete! Updated programs_provided for ${totalUpdated} records.`);
    
    // Check for records that still have null programs_provided
    const [nullRecords] = await pool.query(
      'SELECT COUNT(*) as count FROM daycare_operations WHERE PROGRAMS_PROVIDED IS NULL'
    );
    
    console.log(`Records with null programs_provided: ${nullRecords[0].count}`);
    
    return {
      totalUpdated,
      nullRecords: nullRecords[0].count
    };
  } catch (err) {
    console.error('Error in update process:', err);
    return { totalUpdated: 0, nullRecords: 0 };
  } finally {
    await pool.end();
  }
}

// Update daycare_finder table with programs_provided
async function updateDaycareFinder() {
  console.log('Updating programs_provided in daycare_finder table...');
  
  const pool = mysql.createPool(dbConfig);
  
  try {
    const [result] = await pool.query(`
      UPDATE daycare_finder df
      JOIN daycare_operations d ON df.operation_number = d.OPERATION_NUMBER
      SET df.programs_provided = d.PROGRAMS_PROVIDED
      WHERE df.programs_provided IS NULL
        AND d.PROGRAMS_PROVIDED IS NOT NULL
    `);
    
    console.log(`Updated ${result.affectedRows} records in daycare_finder table`);
    return result.affectedRows;
  } catch (err) {
    console.error('Error updating daycare_finder:', err);
    return 0;
  } finally {
    await pool.end();
  }
}

// Main function
async function main() {
  console.log('Starting programs_provided update process...');
  
  // Step 1: Check if column exists, add if needed
  const columnResult = await checkAndAddColumn();
  if (!columnResult) {
    console.error('Unable to proceed: Column check/add failed');
    process.exit(1);
  }
  
  // Step 2: Update programs_provided values from API
  const updateResult = await updateProgramsProvided();
  
  // Step 3: Update daycare_finder table if it exists
  try {
    const finderResult = await updateDaycareFinder();
    console.log(`Updated ${finderResult} records in daycare_finder table`);
  } catch (err) {
    console.log('Note: daycare_finder table may not exist yet. Run update_daycare_finder.js to create it.');
  }
  
  console.log('\nProcess completed successfully!');
}

// Run the script
if (require.main === module) {
  main().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

module.exports = {
  checkAndAddColumn,
  updateProgramsProvided,
  updateDaycareFinder
};