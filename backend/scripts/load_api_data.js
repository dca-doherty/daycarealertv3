/**
 * API Data Loader
 * This script creates the necessary tables in MySQL and loads data from the Texas API
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const axios = require('axios');
const { pool } = require('../config/db');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://data.texas.gov/resource';
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN || 'XLZk8nhCZvuJ9UooaKbfng3ed';
const DAYCARE_DATASET = process.env.DAYCARE_DATASET || 'bc5r-88dy';
const VIOLATIONS_DATASET = process.env.VIOLATIONS_DATASET || 'tqgd-mf4x';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || 1000, 10);

// Initialize API client
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-App-Token': APP_TOKEN
  }
});

// Step 1: Create database and tables
async function setupDatabase() {
  let connection;
  
  try {
    // Create connection to MySQL server
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });
    
    console.log('Connected to MySQL server');
    
    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'daycarealert'}`);
    console.log(`Database '${process.env.DB_NAME || 'daycarealert'}' created or verified`);
    
    // Switch to the database
    await connection.query(`USE ${process.env.DB_NAME || 'daycarealert'}`);
    
    // Load and execute schema.sql
    const schemaPath = path.join(__dirname, '../sql/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      console.log('Executing schema.sql...');
      
      // Split the SQL file into individual statements
      const statements = schemaSql
        .replace(/--.*$/gm, '') // Remove comments
        .split(';')
        .filter(stmt => stmt.trim() !== '');
      
      // Execute each statement individually
      for (const stmt of statements) {
        if (stmt.trim().toLowerCase().startsWith('use ')) {
          console.log('Skipping USE statement as we already selected the database');
          continue;
        }
        try {
          await connection.query(stmt);
        } catch (err) {
          console.log(`Warning: Error executing statement: ${err.message}`);
          console.log('Continuing with next statement...');
        }
      }
      
      console.log('Schema created successfully');
    } else {
      console.log('Schema file not found, creating tables manually...');
      
      // Create daycare_operations table (for the raw API data)
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
          LAST_UPDATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      // Create non_compliance table (for the raw violations data)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS non_compliance (
          id INT AUTO_INCREMENT PRIMARY KEY,
          NON_COMPLIANCE_ID VARCHAR(255) UNIQUE,
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
    }
    
    console.log('Database setup completed');
    return true;
  } catch (error) {
    console.error('Error setting up database:', error);
    return false;
  } finally {
    if (connection) await connection.end();
  }
}

// Step 2: Load daycares from API
async function loadDaycares() {
  try {
    console.log('Loading daycare data from Texas API...');
    
    // Check if daycares table exists
    let offset = 0;
    let totalLoaded = 0;
    let hasMore = true;
    
    while (hasMore) {
      // Fetch batch of daycares
      console.log(`Fetching daycares (offset: ${offset}, limit: ${BATCH_SIZE})...`);
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
        // Start transaction for better performance
        await connection.beginTransaction();
        
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
        
        // Commit transaction
        await connection.commit();
        totalLoaded += daycares.length;
        console.log(`Saved ${daycares.length} daycares to database (total: ${totalLoaded})`);
        
        // Move to next batch
        offset += BATCH_SIZE;
        
        // Stop if less than a full batch was returned
        if (daycares.length < BATCH_SIZE) {
          hasMore = false;
        }
      } catch (dbError) {
        await connection.rollback();
        console.error('Database error while loading daycares:', dbError);
        throw dbError;
      } finally {
        connection.release();
      }
    }
    
    console.log(`Daycare data loading completed. Total records loaded: ${totalLoaded}`);
    return true;
  } catch (error) {
    console.error('Error loading daycare data:', error);
    return false;
  }
}

// Step 3: Load violations from API
async function loadViolations() {
  try {
    console.log('Loading violation data from Texas API...');
    
    // Get a list of daycare operation numbers first
    const [daycares] = await pool.query(
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
        // Try with operation_id first
        let response = await api.get(`/${VIOLATIONS_DATASET}.json`, {
          params: {
            operation_id: operationNumber,
            $limit: 500
          }
        });
        
        // If no results, try with operation_number
        if (response.data.length === 0) {
          response = await api.get(`/${VIOLATIONS_DATASET}.json`, {
            params: {
              operation_number: operationNumber,
              $limit: 500
            }
          });
        }
        
        const violations = response.data;
        console.log(`Fetched ${violations.length} violations for daycare ${operationNumber}`);
        
        if (violations.length > 0) {
          const connection = await pool.getConnection();
          try {
            await connection.beginTransaction();
            
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
            
            await connection.commit();
            totalLoaded += violations.length;
          } catch (dbError) {
            await connection.rollback();
            console.error(`Database error while loading violations for ${operationNumber}:`, dbError);
          } finally {
            connection.release();
          }
        }
      } catch (apiError) {
        console.error(`Error fetching violations for daycare ${operationNumber}:`, apiError.message);
      }
    }
    
    console.log(`Violation data loading completed. Total records loaded: ${totalLoaded}`);
    return true;
  } catch (error) {
    console.error('Error loading violation data:', error);
    return false;
  }
}

// Step 4: Update daycare records with violation counts
async function updateViolationCounts() {
  try {
    console.log('Updating violation counts for daycares...');
    
    const connection = await pool.getConnection();
    try {
      // Get daycares with violations
      const [daycares] = await connection.query(
        'SELECT DISTINCT OPERATION_ID FROM non_compliance'
      );
      
      console.log(`Updating counts for ${daycares.length} daycares`);
      
      for (const daycare of daycares) {
        const operationNumber = daycare.OPERATION_ID;
        
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
            
            // Update both the standard tables if they exist
            try {
              // Update daycares table
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
            } catch (err) {
              console.log(`No daycares table found or error updating it: ${err.message}`);
            }
            
            // Update daycare_operations table
            try {
              // Add violation count columns if they don't exist
              await connection.query(`
                ALTER TABLE daycare_operations
                ADD COLUMN IF NOT EXISTS HIGH_RISK_VIOLATIONS INT DEFAULT 0,
                ADD COLUMN IF NOT EXISTS MEDIUM_HIGH_RISK_VIOLATIONS INT DEFAULT 0,
                ADD COLUMN IF NOT EXISTS MEDIUM_RISK_VIOLATIONS INT DEFAULT 0,
                ADD COLUMN IF NOT EXISTS LOW_RISK_VIOLATIONS INT DEFAULT 0,
                ADD COLUMN IF NOT EXISTS TOTAL_VIOLATIONS INT DEFAULT 0
              `);
              
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
            } catch (err) {
              console.error(`Error updating daycare_operations table: ${err.message}`);
            }
          }
        } catch (err) {
          console.error(`Error updating violation counts for daycare ${operationNumber}:`, err);
        }
      }
      
      console.log('Violation counts updated successfully');
      return true;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating violation counts:', error);
    return false;
  }
}

// Main function to run the data loading process
async function main() {
  try {
    console.log('Starting API data loading process...');
    
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
    
    // Step 4: Update violation counts
    if (daycareResult && violationResult) {
      await updateViolationCounts();
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