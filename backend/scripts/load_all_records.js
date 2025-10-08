/**
 * Load ALL Records from API
 * 
 * This script loads the entire dataset from a Texas API into a MySQL table.
 * It's configurable to work with different datasets and will keep going until all records are loaded.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const axios = require('axios');

// Configuration - CHANGE THESE VALUES as needed
const DATASET_CONFIG = {
  // For daycare operations data
  'daycares': {
    datasetId: 'bc5r-88dy',
    tableName: 'daycare_operations',
    uniqueKey: 'operation_number',
    fields: [
      { apiField: 'operation_id', dbField: 'OPERATION_ID', isDate: false },
      { apiField: 'operation_number', dbField: 'OPERATION_NUMBER', isDate: false },
      { apiField: 'operation_name', dbField: 'OPERATION_NAME', isDate: false },
      { apiField: 'operation_type', dbField: 'OPERATION_TYPE', isDate: false },
      { apiField: 'location_address', dbField: 'LOCATION_ADDRESS', isDate: false },
      { apiField: 'mailing_address', dbField: 'MAILING_ADDRESS', isDate: false },
      { apiField: 'address_line', dbField: 'ADDRESS_LINE', isDate: false },
      { apiField: 'city', dbField: 'CITY', isDate: false },
      { apiField: 'state', dbField: 'STATE', isDate: false },
      { apiField: 'zipcode', dbField: 'ZIP', isDate: false },
      { apiField: 'county', dbField: 'COUNTY', isDate: false },
      { apiField: 'phone_number', dbField: 'PHONE_NUMBER', isDate: false },
      { apiField: 'email_address', dbField: 'EMAIL_ADDRESS', isDate: false },
      { apiField: 'website_address', dbField: 'WEBSITE_ADDRESS', isDate: false },
      { apiField: 'hours_of_operation', dbField: 'HOURS_OF_OPERATION', isDate: false },
      { apiField: 'days_of_operation', dbField: 'DAYS_OF_OPERATION', isDate: false },
      { apiField: 'administrator_director_name', dbField: 'ADMINISTRATOR_DIRECTOR_NAME', isDate: false },
      { apiField: 'type_of_issuance', dbField: 'TYPE_OF_ISSUANCE', isDate: false },
      { apiField: 'issuance_date', dbField: 'ISSUANCE_DATE', isDate: true },
      { apiField: 'conditions_on_permit', dbField: 'CONDITIONS_ON_PERMIT', isDate: false },
      { apiField: 'total_capacity', dbField: 'TOTAL_CAPACITY', isDate: false },
      { apiField: 'open_foster_homes', dbField: 'OPEN_FOSTER_HOMES', isDate: false },
      { apiField: 'open_branch_offices', dbField: 'OPEN_BRANCH_OFFICES', isDate: false },
      { apiField: 'licensed_to_serve_ages', dbField: 'LICENSED_TO_SERVE_AGES', isDate: false },
      { apiField: 'corrective_action', dbField: 'CORRECTIVE_ACTION', isDate: false },
      { apiField: 'adverse_action', dbField: 'ADVERSE_ACTION', isDate: false },
      { apiField: 'accepts_child_care_subsidies', dbField: 'ACCEPTS_CHILD_CARE_SUBSIDIES', isDate: false },
      { apiField: 'temporarily_closed', dbField: 'TEMPORARILY_CLOSED', isDate: false },
      { apiField: 'operation_status', dbField: 'OPERATION_STATUS', isDate: false },
      { apiField: 'programmatic_services', dbField: 'PROGRAMMATIC_SERVICES', isDate: false },
      { apiField: 'deficiency_high', dbField: 'DEFICIENCY_HIGH', isDate: false },
      { apiField: 'deficiency_medium_high', dbField: 'DEFICIENCY_MEDIUM_HIGH', isDate: false },
      { apiField: 'deficiency_medium', dbField: 'DEFICIENCY_MEDIUM', isDate: false },
      { apiField: 'deficiency_medium_low', dbField: 'DEFICIENCY_MEDIUM_LOW', isDate: false },
      { apiField: 'deficiency_low', dbField: 'DEFICIENCY_LOW', isDate: false },
      { apiField: 'total_inspections', dbField: 'TOTAL_INSPECTIONS', isDate: false },
      { apiField: 'total_assessments', dbField: 'TOTAL_ASSESSMENTS', isDate: false },
      { apiField: 'total_reports', dbField: 'TOTAL_REPORTS', isDate: false },
      { apiField: 'total_self_reports', dbField: 'TOTAL_SELF_REPORTS', isDate: false }
    ],
    tableDefinition: `
      CREATE TABLE IF NOT EXISTS daycare_operations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        OPERATION_ID VARCHAR(50),
        OPERATION_TYPE VARCHAR(100),
        OPERATION_NUMBER VARCHAR(50) NOT NULL UNIQUE,
        OPERATION_NAME VARCHAR(255) NOT NULL,
        LOCATION_ADDRESS VARCHAR(255),
        MAILING_ADDRESS VARCHAR(255),
        PHONE_NUMBER VARCHAR(20),
        COUNTY VARCHAR(100),
        WEBSITE_ADDRESS VARCHAR(255),
        ADMINISTRATOR_DIRECTOR_NAME VARCHAR(255),
        TYPE_OF_ISSUANCE VARCHAR(100),
        ISSUANCE_DATE DATE,
        CONDITIONS_ON_PERMIT VARCHAR(10),
        ACCEPTS_CHILD_CARE_SUBSIDIES VARCHAR(10),
        HOURS_OF_OPERATION VARCHAR(255),
        DAYS_OF_OPERATION VARCHAR(255),
        TOTAL_CAPACITY INT,
        OPEN_FOSTER_HOMES INT,
        OPEN_BRANCH_OFFICES INT,
        LICENSED_TO_SERVE_AGES VARCHAR(255),
        CORRECTIVE_ACTION VARCHAR(10),
        ADVERSE_ACTION VARCHAR(10),
        TEMPORARILY_CLOSED VARCHAR(10),
        PROGRAMMATIC_SERVICES TEXT,
        DEFICIENCY_HIGH INT,
        DEFICIENCY_MEDIUM_HIGH INT,
        DEFICIENCY_MEDIUM INT,
        DEFICIENCY_MEDIUM_LOW INT,
        DEFICIENCY_LOW INT,
        TOTAL_INSPECTIONS INT,
        TOTAL_ASSESSMENTS INT,
        TOTAL_REPORTS INT,
        TOTAL_SELF_REPORTS INT,
        EMAIL_ADDRESS VARCHAR(255),
        OPERATION_STATUS VARCHAR(10),
        ADDRESS_LINE VARCHAR(255),
        CITY VARCHAR(100),
        STATE VARCHAR(50),
        ZIP VARCHAR(15),
        HIGH_RISK_VIOLATIONS INT DEFAULT 0,
        MEDIUM_HIGH_RISK_VIOLATIONS INT DEFAULT 0,
        MEDIUM_RISK_VIOLATIONS INT DEFAULT 0,
        LOW_RISK_VIOLATIONS INT DEFAULT 0,
        TOTAL_VIOLATIONS INT DEFAULT 0,
        LAST_INSPECTION_DATE DATE,
        LAST_UPDATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (CITY),
        INDEX (OPERATION_TYPE),
        INDEX (COUNTY)
      )
    `,
    updateDaycares: false  // No need to update other tables
  },
  
  // For violations/non-compliance data
  'violations': {
    datasetId: 'tqgd-mf4x',
    tableName: 'non_compliance',
    uniqueKey: 'non_compliance_id',
    fields: [
      { apiField: 'non_compliance_id', dbField: 'NON_COMPLIANCE_ID', isDate: false },
      { apiField: 'operation_id', dbField: 'OPERATION_ID', isDate: false },
      { apiField: 'activity_id', dbField: 'ACTIVITY_ID', isDate: false },
      { apiField: 'section_id', dbField: 'SECTION_ID', isDate: false },
      { apiField: 'standard_number_description', dbField: 'STANDARD_NUMBER_DESCRIPTION', isDate: false },
      { apiField: 'standard_risk_level', dbField: 'STANDARD_RISK_LEVEL', isDate: false },
      { apiField: 'narrative', dbField: 'NARRATIVE', isDate: false },
      { apiField: 'technical_assistance_given', dbField: 'TECHNICAL_ASSISTANCE_GIVEN', isDate: false },
      { apiField: 'corrected_at_inspection', dbField: 'CORRECTED_AT_INSPECTION', isDate: false },
      { apiField: 'corrected_date', dbField: 'CORRECTED_DATE', isDate: true },
      { apiField: 'date_correction_verified', dbField: 'DATE_CORRECTION_VERIFIED', isDate: true },
      { apiField: 'activity_date', dbField: 'ACTIVITY_DATE', isDate: true }
    ],
    tableDefinition: `
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
    `,
    updateDaycares: true,
    updateDaycaresSql: `
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
    `
  },
  
  // For inspections data
  'inspections': {
    datasetId: 'm5q4-3y3d',
    tableName: 'inspections',
    uniqueKey: 'activity_id',
    fields: [
      { apiField: 'operation_id', dbField: 'OPERATION_ID', isDate: false },
      { apiField: 'activity_id', dbField: 'ACTIVITY_ID', isDate: false },
      { apiField: 'activity_date', dbField: 'ACTIVITY_DATE', isDate: true },
      { apiField: 'activity_type', dbField: 'ACTIVITY_TYPE', isDate: false },
      { apiField: 'violation_found', dbField: 'VIOLATION_FOUND', isDate: false }
    ],
    tableDefinition: `
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
    `,
    updateDaycares: true,
    updateDaycaresSql: `
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
    `
  }
};

// Script configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://data.texas.gov/resource';
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN || 'XLZk8nhCZvuJ9UooaKbfng3ed';
const BATCH_SIZE = 1000;    // API limit is 1000 per request
const QUERY_DELAY = 500;    // Delay between API requests (ms)
const START_OFFSET = 0;     // Where to start loading (for resuming a previous run)

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

// Sleep function to add delay between API calls
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Ask which dataset to load
async function promptForDataset() {
  const datasets = Object.keys(DATASET_CONFIG);
  
  if (process.argv.length > 2) {
    const requestedDataset = process.argv[2].toLowerCase();
    if (datasets.includes(requestedDataset)) {
      return requestedDataset;
    }
    console.log(`Invalid dataset: ${requestedDataset}`);
  }
  
  console.log('\nAvailable datasets:');
  datasets.forEach((name, index) => {
    console.log(`  ${index + 1}. ${name} (${DATASET_CONFIG[name].datasetId})`);
  });
  
  // Default to the first dataset
  console.log(`\nUsing default dataset: ${datasets[0]}`);
  return datasets[0];
}

// Create the database table if it doesn't exist
async function setupDatabase(pool, config) {
  console.log(`Verifying ${config.tableName} table exists...`);
  
  try {
    // First check if the table already exists
    const [tables] = await pool.query(
      `SHOW TABLES LIKE '${config.tableName}'`
    );
    
    if (tables.length > 0) {
      console.log(`Table ${config.tableName} already exists, checking columns...`);
      
      // Get existing columns
      const [columns] = await pool.query(
        `DESCRIBE ${config.tableName}`
      );
      
      // Create a set of existing column names
      const existingColumns = new Set(columns.map(col => col.Field));
      
      // Filter fields to only include those that exist in the table
      config.fields = config.fields.filter(field => {
        const exists = existingColumns.has(field.dbField);
        if (!exists) {
          console.log(`WARNING: Column ${field.dbField} does not exist in table ${config.tableName} and will be skipped`);
        }
        return exists;
      });
      
      console.log(`Will import data for ${config.fields.length} fields that exist in the table`);
    } else {
      // Table doesn't exist, create it
      console.log(`Table ${config.tableName} doesn't exist, creating it...`);
      await pool.query(config.tableDefinition);
      console.log(`Table ${config.tableName} created successfully`);
    }
  } catch (err) {
    console.error(`Error setting up database for ${config.tableName}:`, err.message);
    // Create the table anyway as a fallback
    try {
      await pool.query(config.tableDefinition);
    } catch (createErr) {
      console.error(`Error creating table ${config.tableName}:`, createErr.message);
    }
  }
  
  console.log('Database setup complete');
}

// Get the total count of records in the dataset
async function getRecordCount(datasetId) {
  try {
    const response = await api.get(`/${datasetId}.json`, {
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

// Load a batch of records
async function loadRecordsBatch(pool, config, offset) {
  const { datasetId, tableName, uniqueKey, fields } = config;
  
  console.log(`Loading batch at offset ${offset}...`);
  
  try {
    // Add delay to avoid hitting API rate limits
    await sleep(QUERY_DELAY);
    
    // Make the API request
    const response = await api.get(`/${datasetId}.json`, {
      params: {
        $limit: BATCH_SIZE,
        $offset: offset,
        $order: uniqueKey  // Order by the unique key for consistent pagination
      }
    });
    
    const records = response.data;
    console.log(`Fetched ${records.length} records`);
    
    if (records.length === 0) {
      return { count: 0, hasMore: false };
    }
    
    // Insert the records into the database
    const connection = await pool.getConnection();
    let insertedCount = 0;
    
    try {
      // Process each record
      for (const record of records) {
        try {
          // Map API response to database fields
          const recordData = {};
          
          // Process each field mapping
          fields.forEach(({ apiField, dbField, isDate }) => {
            if (record[apiField] !== undefined) {
              recordData[dbField] = isDate && record[apiField] 
                ? new Date(record[apiField]) 
                : record[apiField];
            } else {
              recordData[dbField] = null;
            }
          });
          
          // Insert or update the record
          const dbFields = Object.keys(recordData);
          const placeholders = Array(dbFields.length).fill('?').join(', ');
          const updateClauses = dbFields.map(field => `${field}=VALUES(${field})`).join(', ');
          
          const sql = `
            INSERT INTO ${tableName} (${dbFields.join(', ')})
            VALUES (${placeholders})
            ON DUPLICATE KEY UPDATE ${updateClauses}
          `;
          
          await connection.query(sql, Object.values(recordData));
          insertedCount++;
        } catch (err) {
          console.error(`Error processing record: ${err.message}`);
        }
      }
      
      console.log(`Inserted/updated ${insertedCount} records`);
      return { 
        count: insertedCount,
        hasMore: records.length === BATCH_SIZE
      };
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(`Error loading batch at offset ${offset}:`, err.message);
    return { count: 0, hasMore: true }; // Assume there might be more to try
  }
}

// Update daycare records with data from the loaded table
async function updateDaycareRecords(pool, config) {
  console.log(`Updating daycare records with ${config.tableName} data...`);
  
  try {
    // Run the update query
    const [result] = await pool.query(config.updateDaycaresSql);
    
    console.log(`Updated ${result.affectedRows} daycare records`);
    
    // Count how many operation IDs don't match daycares
    const [missingResult] = await pool.query(`
      SELECT COUNT(DISTINCT t.OPERATION_ID) as count
      FROM ${config.tableName} t
      LEFT JOIN daycare_operations d ON t.OPERATION_ID = d.OPERATION_NUMBER
      WHERE d.OPERATION_NUMBER IS NULL
    `);
    
    const missingCount = missingResult[0].count;
    console.log(`Found ${missingCount} operation IDs that don't match any daycare in the database`);
    
    return { 
      updatedCount: result.affectedRows,
      missingCount 
    };
  } catch (err) {
    console.error(`Error updating daycare records:`, err.message);
    return { updatedCount: 0, missingCount: 0 };
  }
}

// Main function
async function main() {
  // Determine which dataset to load
  const datasetName = await promptForDataset();
  const config = DATASET_CONFIG[datasetName];
  
  console.log(`\nStarting ${datasetName} data loading process...`);
  
  // Create connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Setup database
    await setupDatabase(pool, config);
    
    // Get total record count
    const totalRecordCount = await getRecordCount(config.datasetId);
    console.log(`Total records in dataset: ${totalRecordCount}`);
    
    // Load records in batches
    let offset = START_OFFSET;
    let totalLoaded = 0;
    let hasMore = true;
    
    // Calculate total batches
    const totalBatches = Math.ceil(totalRecordCount / BATCH_SIZE);
    
    while (hasMore) {
      const result = await loadRecordsBatch(pool, config, offset);
      
      if (result.count > 0) {
        totalLoaded += result.count;
        const currentBatch = Math.floor(offset / BATCH_SIZE) + 1;
        console.log(`Progress: ${totalLoaded} records loaded (${currentBatch}/${totalBatches} batches, ${Math.round(offset / totalRecordCount * 100)}%)`);
      }
      
      // Move to next batch
      offset += BATCH_SIZE;
      hasMore = result.hasMore;
      
      // If we got nothing, we might just need to try the next batch
      if (result.count === 0 && hasMore) {
        console.log(`No records returned at offset ${offset - BATCH_SIZE}, trying next batch`);
      }
    }
    
    console.log(`\n${datasetName} data loading completed. Total records loaded: ${totalLoaded}`);
    
    // Update daycare records
    if (totalLoaded > 0 && config.updateDaycares) {
      await updateDaycareRecords(pool, config);
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