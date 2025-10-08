/**
 * Load Violations Data with Parallel Processing
 * 
 * This script loads violations from the Texas API using parallel processing
 * for much faster performance.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://data.texas.gov/resource';
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN || 'XLZk8nhCZvuJ9UooaKbfng3ed';
const VIOLATIONS_DATASET = 'tqgd-mf4x';  // This is the correct dataset ID
const BATCH_SIZE = 1000;    // Batch size for API requests
const PARALLEL_REQUESTS = 5; // Number of parallel operations
const QUERY_DELAY = 50;     // Milliseconds to wait between API requests
const MAX_YEARS_TO_PROCESS = 10; // Max number of years to process

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'daycarealert',
  connectionLimit: 20 // Increased for parallel processing
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

// Insert violations into database (optimized batch insert)
async function insertViolations(pool, violations) {
  if (!violations.length) return 0;
  
  const connection = await pool.getConnection();
  let insertedCount = 0;
  
  try {
    // Use transactions for better performance
    await connection.beginTransaction();
    
    // Prepare batch insert values
    const placeholders = [];
    const values = [];
    
    for (const violation of violations) {
      try {
        // Map API response to database fields
        const mappedData = [
          violation.non_compliance_id,
          violation.operation_id,
          violation.activity_id,
          violation.section_id,
          violation.standard_number_description,
          violation.standard_risk_level,
          violation.narrative,
          violation.technical_assistance_given,
          violation.corrected_at_inspection,
          violation.corrected_date ? new Date(violation.corrected_date) : null,
          violation.date_correction_verified ? new Date(violation.date_correction_verified) : null,
          violation.activity_date ? new Date(violation.activity_date) : null
        ];
        
        placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        values.push(...mappedData);
        insertedCount++;
      } catch (err) {
        console.error(`Error preparing violation ${violation.non_compliance_id}:`, err.message);
      }
    }
    
    if (placeholders.length > 0) {
      // Create INSERT ... ON DUPLICATE KEY UPDATE statement
      const fields = [
        'NON_COMPLIANCE_ID', 'OPERATION_ID', 'ACTIVITY_ID', 'SECTION_ID',
        'STANDARD_NUMBER_DESCRIPTION', 'STANDARD_RISK_LEVEL', 'NARRATIVE',
        'TECHNICAL_ASSISTANCE_GIVEN', 'CORRECTED_AT_INSPECTION',
        'CORRECTED_DATE', 'DATE_CORRECTION_VERIFIED', 'ACTIVITY_DATE'
      ];
      
      const updateClauses = fields.map((field, index) => {
        if (index === 0) return ''; // Skip the first field (NON_COMPLIANCE_ID) as it's the key
        return `${field} = VALUES(${field})`;
      }).filter(Boolean).join(', ');
      
      const sql = `
        INSERT INTO non_compliance (
          ${fields.join(', ')}
        ) VALUES ${placeholders.join(', ')}
        ON DUPLICATE KEY UPDATE ${updateClauses}
      `;
      
      await connection.query(sql, values);
    }
    
    // Commit the transaction
    await connection.commit();
    return insertedCount;
  } catch (err) {
    await connection.rollback();
    console.error('Error inserting violations batch:', err.message);
    return 0;
  } finally {
    connection.release();
  }
}

// Load violations for a specific year
async function loadViolationsForYear(pool, year) {
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
    
    // Calculate the number of batches needed
    const totalBatches = Math.ceil(yearCount / BATCH_SIZE);
    console.log(`Will process ${totalBatches} batches for year ${year}`);
    
    let totalForYear = 0;
    let processedBatches = 0;
    
    // Process each batch
    const promises = [];
    for (let offset = 0; offset < yearCount; offset += BATCH_SIZE) {
      // Limit the number of concurrent requests
      if (promises.length >= PARALLEL_REQUESTS) {
        await Promise.any(promises.map(p => p.catch(e => e)));
        // Remove completed promises
        const completedIndex = await Promise.race(
          promises.map((p, index) => p.then(() => index).catch(() => -1))
        );
        if (completedIndex >= 0) {
          promises.splice(completedIndex, 1);
        }
      }
      
      // Add a slight delay to avoid hitting API rate limits
      await sleep(QUERY_DELAY);
      
      // Load this batch
      const batchPromise = (async () => {
        try {
          const response = await api.get(`/${VIOLATIONS_DATASET}.json`, {
            params: {
              $where: whereClause,
              $limit: BATCH_SIZE,
              $offset: offset,
              $order: 'activity_date DESC'
            }
          });
          
          const violations = response.data;
          console.log(`Fetched ${violations.length} violations for year ${year}, batch ${processedBatches + 1}/${totalBatches}`);
          
          if (violations.length === 0) {
            return 0;
          }
          
          // Insert the violations
          const inserted = await insertViolations(pool, violations);
          console.log(`Inserted ${inserted} violations for year ${year}, batch ${processedBatches + 1}/${totalBatches}`);
          
          processedBatches++;
          return inserted;
        } catch (err) {
          console.error(`Error loading batch for year ${year}, offset ${offset}:`, err.message);
          return 0;
        }
      })();
      
      promises.push(batchPromise);
      
      // Accumulate results
      batchPromise.then(count => {
        totalForYear += count;
      });
    }
    
    // Wait for all remaining promises to complete
    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
    
    console.log(`Completed loading for year ${year}: ${totalForYear} violations loaded`);
    return totalForYear;
  } catch (err) {
    console.error(`Error loading violations for year ${year}:`, err.message);
    return 0;
  }
}

// Process years in parallel
async function processYearsInParallel(pool, years) {
  console.log(`Processing years in parallel: ${years.join(', ')}`);
  
  // Process each year (limit concurrency to avoid overwhelming the API)
  const concurrencyLimit = 3; // Process up to 3 years at once
  let activePromises = 0;
  let totalLoaded = 0;
  
  for (let i = 0; i < years.length; i++) {
    // Wait if we've reached the concurrency limit
    while (activePromises >= concurrencyLimit) {
      await sleep(500);
    }
    
    const year = years[i];
    activePromises++;
    
    // Process this year
    loadViolationsForYear(pool, year).then(count => {
      totalLoaded += count;
      activePromises--;
      console.log(`Progress: ${totalLoaded} total violations loaded so far (${activePromises} years still processing)`);
    }).catch(err => {
      activePromises--;
      console.error(`Error processing year ${year}:`, err.message);
    });
    
    // Small delay between starting years
    await sleep(2000);
  }
  
  // Wait for all years to complete
  while (activePromises > 0) {
    await sleep(1000);
  }
  
  console.log(`All years processed. Total loaded: ${totalLoaded}`);
  return totalLoaded;
}

// Update violation counts for daycares
async function updateViolationCounts(pool) {
  console.log('Updating daycare violation counts...');
  
  try {
    // First get a count of distinct operation IDs
    const [countResult] = await pool.query(
      'SELECT COUNT(DISTINCT OPERATION_ID) as count FROM non_compliance'
    );
    
    const operationIdCount = countResult[0].count;
    console.log(`Found ${operationIdCount} unique operation IDs with violations`);
    
    // Faster method: update all daycares with a single aggregated query
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
    
    // Count how many operation IDs with violations don't match daycares
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
  console.log('Starting parallel violations data loading process...');
  
  // Create connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Setup database
    await setupDatabase(pool);
    
    // Get total count in the dataset
    const totalCount = await getViolationCount();
    console.log(`Total violations in dataset: ${totalCount}`);
    
    // Generate years to process
    const currentYear = new Date().getFullYear();
    const yearsToProcess = [];
    
    // Add current year and past years
    for (let year = currentYear; year >= currentYear - MAX_YEARS_TO_PROCESS; year--) {
      yearsToProcess.push(year);
    }
    
    console.log(`Will process years: ${yearsToProcess.join(', ')}`);
    
    // Process all years
    const totalLoaded = await processYearsInParallel(pool, yearsToProcess);
    
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