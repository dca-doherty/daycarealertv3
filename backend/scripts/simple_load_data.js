/**
 * Simple API Data Loader
 * Creates just the tables needed for daycare data without dependencies
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://data.texas.gov/resource';
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN || 'XLZk8nhCZvuJ9UooaKbfng3ed';
const DAYCARE_DATASET = process.env.DAYCARE_DATASET || 'bc5r-88dy';
const VIOLATIONS_DATASET = process.env.VIOLATIONS_DATASET || 'tqgd-mf4x';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || 100, 10);

// Initialize API client
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-App-Token': APP_TOKEN
  }
});

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'daycarealert',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function setupDatabase() {
  let connection;
  
  try {
    // Create connection to MySQL server without database
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    
    console.log('Connected to MySQL server');
    
    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    console.log(`Database '${dbConfig.database}' created or verified`);
    
    // Switch to the database
    await connection.query(`USE ${dbConfig.database}`);
    
    // Create daycare_operations table for raw API data
    await connection.query(`
      CREATE TABLE IF NOT EXISTS daycare_operations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        OPERATION_NUMBER VARCHAR(50) NOT NULL UNIQUE,
        OPERATION_NAME VARCHAR(255) NOT NULL,
        OPERATION_TYPE VARCHAR(100),
        LOCATION_ADDRESS VARCHAR(255),
        CITY VARCHAR(100),
        STATE VARCHAR(50) DEFAULT 'TX',
        ZIP VARCHAR(15),
        COUNTY VARCHAR(100),
        PHONE_NUMBER VARCHAR(20),
        EMAIL_ADDRESS VARCHAR(255),
        WEBSITE_ADDRESS VARCHAR(255),
        HOURS_OF_OPERATION VARCHAR(255),
        DAYS_OF_OPERATION VARCHAR(255),
        ISSUANCE_DATE DATE,
        TOTAL_CAPACITY INT,
        ADMINISTRATOR_DIRECTOR_NAME VARCHAR(255),
        OPERATION_STATUS VARCHAR(10),
        ACCEPTS_CHILD_CARE_SUBSIDIES VARCHAR(10),
        TEMPORARILY_CLOSED VARCHAR(10),
        HIGH_RISK_VIOLATIONS INT DEFAULT 0,
        MEDIUM_HIGH_RISK_VIOLATIONS INT DEFAULT 0,
        MEDIUM_RISK_VIOLATIONS INT DEFAULT 0,
        LOW_RISK_VIOLATIONS INT DEFAULT 0,
        TOTAL_VIOLATIONS INT DEFAULT 0,
        LAST_UPDATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (CITY),
        INDEX (OPERATION_TYPE),
        INDEX (HIGH_RISK_VIOLATIONS, MEDIUM_HIGH_RISK_VIOLATIONS, LOW_RISK_VIOLATIONS)
      )
    `);
    console.log('Created daycare_operations table');
    
    // Create non_compliance table for violations
    await connection.query(`
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
    console.log('Created non_compliance table');
    
    console.log('Database setup completed successfully');
    return true;
  } catch (error) {
    console.error('Error setting up database:', error);
    return false;
  } finally {
    if (connection) await connection.end();
  }
}

async function loadDaycares() {
  // Create a connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    console.log('Loading daycare data from Texas API...');
    
    let offset = 0;
    let totalLoaded = 0;
    let hasMore = true;
    
    while (hasMore) {
      // Fetch batch of daycares
      console.log(`Fetching daycares (offset: ${offset}, limit: ${BATCH_SIZE})...`);
      try {
        const response = await api.get(`/${DAYCARE_DATASET}.json`, {
          params: {
            $limit: BATCH_SIZE,
            $offset: offset,
            $where: "operation_type='Licensed Center' AND temporarily_closed='NO'"
          }
        });
        
        const daycares = response.data;
        console.log(`Fetched ${daycares.length} daycares`);
        
        if (daycares.length === 0) {
          hasMore = false;
          break;
        }
        
        // Insert daycares into database
        const connection = await pool.getConnection();
        try {
          for (const daycare of daycares) {
            try {
              // Check if daycare exists
              const [existingDaycares] = await connection.query(
                'SELECT OPERATION_NUMBER FROM daycare_operations WHERE OPERATION_NUMBER = ?',
                [daycare.operation_number]
              );
              
              // Prepare data with consistent capitalization as in the database
              const daycareData = {
                OPERATION_NUMBER: daycare.operation_number,
                OPERATION_NAME: daycare.operation_name,
                OPERATION_TYPE: daycare.operation_type,
                LOCATION_ADDRESS: daycare.street_address || daycare.location_address,
                CITY: daycare.city,
                STATE: daycare.state || 'TX',
                ZIP: daycare.zip,
                COUNTY: daycare.county,
                PHONE_NUMBER: daycare.phone || daycare.phone_number,
                EMAIL_ADDRESS: daycare.email_address,
                WEBSITE_ADDRESS: daycare.website_address,
                HOURS_OF_OPERATION: daycare.hours_of_operation,
                DAYS_OF_OPERATION: daycare.days_of_operation,
                ISSUANCE_DATE: daycare.issue_date || daycare.issuance_date,
                TOTAL_CAPACITY: daycare.total_capacity,
                ADMINISTRATOR_DIRECTOR_NAME: daycare.administrator_director_name,
                OPERATION_STATUS: daycare.operation_status || 'Y',
                ACCEPTS_CHILD_CARE_SUBSIDIES: daycare.accepts_child_care_subsidies,
                TEMPORARILY_CLOSED: daycare.temporarily_closed
              };
              
              if (existingDaycares.length > 0) {
                // Update existing record
                const fields = Object.keys(daycareData)
                  .map(key => `${key} = ?`)
                  .join(', ');
                
                await connection.query(
                  `UPDATE daycare_operations SET ${fields} WHERE OPERATION_NUMBER = ?`,
                  [...Object.values(daycareData), daycare.operation_number]
                );
              } else {
                // Insert new record
                const fields = Object.keys(daycareData).join(', ');
                const placeholders = Object.keys(daycareData).map(() => '?').join(', ');
                
                await connection.query(
                  `INSERT INTO daycare_operations (${fields}) VALUES (${placeholders})`,
                  Object.values(daycareData)
                );
              }
            } catch (err) {
              console.error(`Error processing daycare (${daycare.operation_number}):`, err.message);
            }
          }
          
          totalLoaded += daycares.length;
          console.log(`Saved ${daycares.length} daycares to database (total: ${totalLoaded})`);
          
          // Move to next batch
          offset += BATCH_SIZE;
          
          // Stop if less than a full batch was returned
          if (daycares.length < BATCH_SIZE) {
            hasMore = false;
          }
        } finally {
          connection.release();
        }
      } catch (apiError) {
        console.error('Error fetching from API:', apiError.message);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log(`Daycare data loading completed. Total records loaded: ${totalLoaded}`);
    return true;
  } catch (error) {
    console.error('Error loading daycare data:', error);
    return false;
  } finally {
    pool.end();
  }
}

async function checkViolationsDataset() {
  try {
    console.log('Checking violations dataset structure...');
    
    // Get a sample record
    const response = await api.get(`/${VIOLATIONS_DATASET}.json`, {
      params: {
        $limit: 1
      }
    });
    
    if (response.data.length > 0) {
      const sample = response.data[0];
      console.log('Sample violation record fields:');
      console.log(Object.keys(sample));
      
      // Check for operation identifier field
      const hasOperationNumber = sample.hasOwnProperty('operation_number');
      const hasOperationId = sample.hasOwnProperty('operation_id');
      
      console.log(`Dataset has operation_number field: ${hasOperationNumber}`);
      console.log(`Dataset has operation_id field: ${hasOperationId}`);
      
      return {
        fieldFound: hasOperationNumber || hasOperationId,
        operationField: hasOperationNumber ? 'operation_number' : (hasOperationId ? 'operation_id' : null)
      };
    } else {
      console.log('No sample data found in violations dataset');
      return { fieldFound: false, operationField: null };
    }
  } catch (error) {
    console.error('Error checking violations dataset:', error.message);
    return { fieldFound: false, operationField: null };
  }
}

async function loadViolations() {
  // Create a connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    console.log('Loading violation data from Texas API...');
    
    // Check dataset structure first
    const datasetInfo = await checkViolationsDataset();
    console.log('Dataset info:', datasetInfo);
    
    // If we couldn't determine the structure, try a broader search
    const operationField = datasetInfo.operationField || 'operation_number';
    
    // Get a sample of daycare operation numbers
    const connection = await pool.getConnection();
    try {
      // Get the first 10 daycares for testing
      const [daycares] = await connection.query(
        'SELECT OPERATION_NUMBER FROM daycare_operations LIMIT 10'
      );
      
      console.log(`Found ${daycares.length} daycares to load violations for`);
      
      let totalLoaded = 0;
      
      // For each daycare, fetch and save its violations
      for (let i = 0; i < daycares.length; i++) {
        const daycare = daycares[i];
        const operationNumber = daycare.OPERATION_NUMBER;
        
        console.log(`Processing violations for daycare ${i+1}/${daycares.length}: ${operationNumber}`);
        
        try {
          console.log(`Trying to fetch violations using ${operationField} = ${operationNumber}`);
          
          // Try to fetch data with different approaches
          let response;
          
          try {
            // First approach: using identified field
            if (operationField) {
              const params = {
                $limit: 500
              };
              params[operationField] = operationNumber;
              
              response = await api.get(`/${VIOLATIONS_DATASET}.json`, { params });
            } else {
              throw new Error('No operation field identified');
            }
          } catch (err) {
            console.log('First approach failed, trying WHERE clause...');
            
            // Second approach: using a WHERE clause with both possible fields
            response = await api.get(`/${VIOLATIONS_DATASET}.json`, {
              params: {
                $where: `operation_number='${operationNumber}' OR operation_id='${operationNumber}'`,
                $limit: 500
              }
            });
          }
          
          const violations = response.data;
          console.log(`Fetched ${violations.length} violations for daycare ${operationNumber}`);
          
          if (violations.length > 0) {
            for (const violation of violations) {
              try {
                // Generate a unique violation ID if not present
                const violationId = violation.non_compliance_id || 
                  `${violation.operation_id || operationNumber}_${violation.activity_id}_${Math.random().toString(36).substr(2, 9)}`;
                
                // Prepare data with consistent capitalization as in the database
                const violationData = {
                  NON_COMPLIANCE_ID: violationId,
                  OPERATION_ID: violation.operation_id || operationNumber,
                  ACTIVITY_ID: violation.activity_id,
                  SECTION_ID: violation.section_id,
                  STANDARD_NUMBER_DESCRIPTION: violation.standard_number_description,
                  STANDARD_RISK_LEVEL: violation.standard_risk_level,
                  NARRATIVE: violation.narrative,
                  TECHNICAL_ASSISTANCE_GIVEN: violation.technical_assistance_given,
                  CORRECTED_AT_INSPECTION: violation.corrected_at_inspection,
                  CORRECTED_DATE: violation.corrected_date,
                  DATE_CORRECTION_VERIFIED: violation.date_correction_verified,
                  ACTIVITY_DATE: violation.activity_date
                };
                
                // Check if violation exists
                const [existingViolations] = await connection.query(
                  'SELECT NON_COMPLIANCE_ID FROM non_compliance WHERE NON_COMPLIANCE_ID = ?',
                  [violationId]
                );
                
                if (existingViolations.length > 0) {
                  // Update existing record
                  const fields = Object.keys(violationData)
                    .filter(key => key !== 'NON_COMPLIANCE_ID') // Don't update the ID
                    .map(key => `${key} = ?`)
                    .join(', ');
                  
                  await connection.query(
                    `UPDATE non_compliance SET ${fields} WHERE NON_COMPLIANCE_ID = ?`,
                    [
                      ...Object.keys(violationData)
                        .filter(key => key !== 'NON_COMPLIANCE_ID')
                        .map(key => violationData[key]),
                      violationId
                    ]
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
                console.error(`Error processing violation for daycare ${operationNumber}:`, err.message);
              }
            }
            
            totalLoaded += violations.length;
            console.log(`Saved ${violations.length} violations for daycare ${operationNumber}`);
            
            // Update violation counts
            await updateViolationCounts(operationNumber, connection);
          }
        } catch (apiError) {
          console.error(`Error fetching violations for daycare ${operationNumber}:`, apiError.message);
        }
      }
      
      console.log(`Violation data loading completed. Total records loaded: ${totalLoaded}`);
      return true;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error loading violation data:', error);
    return false;
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
      
      // Update daycare_operations table
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
      
      console.log(`Updated violation counts for daycare ${operationNumber}`);
    }
  } catch (error) {
    console.error(`Error updating violation counts for daycare ${operationNumber}:`, error);
  }
}

async function main() {
  try {
    console.log('Starting simple API data loading process...');
    
    // Step 1: Setup the database
    const dbSetup = await setupDatabase();
    if (!dbSetup) {
      console.error('Database setup failed, aborting');
      process.exit(1);
    }
    
    // Step 2: Load daycare data
    const daycareResult = await loadDaycares();
    if (!daycareResult) {
      console.error('Daycare data loading failed');
    }
    
    // Step 3: Load violation data (limit to 10 daycares for testing)
    const violationResult = await loadViolations();
    if (!violationResult) {
      console.error('Violation data loading failed');
    }
    
    console.log('API data loading completed');
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error during data loading:', error);
    process.exit(1);
  }
}

// Run the script
main();