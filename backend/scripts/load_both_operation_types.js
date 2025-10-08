/**
 * API Data Loader for Both Operation Types
 * Modified to load both "Licensed Center" and "Licensed Child-Care Home" types
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

// Modify loadDaycares function to load both operation types
async function loadDaycares() {
  try {
    console.log('Loading daycare data from Texas API...');
    
    // Define the operation types to load
    const operationTypes = ['Licensed Center', 'Licensed Child-Care Home'];
    let totalLoaded = 0;
    
    // Process each operation type
    for (const operationType of operationTypes) {
      console.log(`Processing operation type: ${operationType}`);
      
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        // Fetch batch of daycares
        console.log(`Fetching ${operationType} daycares (offset: ${offset}, limit: ${BATCH_SIZE})...`);
        const response = await api.get(`/${DAYCARE_DATASET}.json`, {
          params: {
            $limit: BATCH_SIZE,
            $offset: offset,
            $where: `operation_type='${operationType}' AND temporarily_closed='NO'`
          }
        });
        
        const daycares = response.data;
        console.log(`Fetched ${daycares.length} daycares of type ${operationType}`);
        
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
              // Extract coordinates if available
              const latitude = daycare.latitude || daycare.geo_lat || null;
              const longitude = daycare.longitude || daycare.geo_lng || daycare.geo_lon || null;
              
              const daycareData = {
                OPERATION_NUMBER: daycare.operation_number,
                OPERATION_NAME: daycare.operation_name,
                OPERATION_TYPE: daycare.operation_type,
                LOCATION_ADDRESS: daycare.street_address || daycare.location_address,
                CITY: daycare.city,
                STATE: daycare.state || 'TX',
                ZIP: daycare.zip,
                latitude: latitude,
                longitude: longitude,
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
                TEMPORARILY_CLOSED: daycare.temporarily_closed,
                OPERATION_ID: daycare.operation_id,
                MAILING_ADDRESS: daycare.mailing_address,
                TYPE_OF_ISSUANCE: daycare.type_of_issuance,
                CONDITIONS_ON_PERMIT: daycare.conditions_on_permit,
                OPEN_FOSTER_HOMES: daycare.open_foster_homes,
                OPEN_BRANCH_OFFICES: daycare.open_branch_offices,
                LICENSED_TO_SERVE_AGES: daycare.licensed_to_serve_ages,
                CORRECTIVE_ACTION: daycare.corrective_action,
                ADVERSE_ACTION: daycare.adverse_action,
                PROGRAMMATIC_SERVICES: daycare.programmatic_services,
                PROGRAMS_PROVIDED: daycare.programs_provided
              };
              
              if (existingDaycares.length > 0) {
                // Update existing record
                const fields = Object.keys(daycareData)
                  .filter(key => daycareData[key] !== null && daycareData[key] !== undefined)
                  .map(key => `${key} = ?`)
                  .join(', ');
                
                await connection.query(
                  `UPDATE daycare_operations SET ${fields} WHERE OPERATION_NUMBER = ?`,
                  [
                    ...Object.keys(daycareData)
                      .filter(key => daycareData[key] !== null && daycareData[key] !== undefined)
                      .map(key => daycareData[key]),
                    daycare.operation_number
                  ]
                );
              } else {
                // Insert new record
                const validFields = Object.keys(daycareData)
                  .filter(key => daycareData[key] !== null && daycareData[key] !== undefined);
                  
                const fields = validFields.join(', ');
                const placeholders = validFields.map(() => '?').join(', ');
                
                await connection.query(
                  `INSERT INTO daycare_operations (${fields}) VALUES (${placeholders})`,
                  validFields.map(key => daycareData[key])
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
        } finally {
          connection.release();
        }
      }
    }
    
    console.log(`Daycare data loading completed. Total records loaded: ${totalLoaded}`);
    return true;
  } catch (error) {
    console.error('Error loading daycare data:', error);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('Starting modified API data loader for BOTH operation types...');
    
    // Only run the modified loadDaycares function
    const daycareResult = await loadDaycares();
    if (!daycareResult) {
      console.error('Daycare data loading failed');
    } else {
      console.log('Successfully loaded both Licensed Center and Licensed Child-Care Home data');
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
