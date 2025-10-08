/**
 * API Data Loader for Inspections - Both Operation Types
 * This script loads inspection data for both Licensed Centers and Licensed Child-Care Homes
 * FIXED version - handles OPERATION_NUMBER/OPERATION_ID properly
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const axios = require('axios');
const { pool } = require('../config/db');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://data.texas.gov/resource';
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN || 'XLZk8nhCZvuJ9UooaKbfng3ed';
const INSPECTIONS_DATASET = process.env.INSPECTIONS_DATASET || 'cwsq-xwdj';
const BATCH_SIZE = 100; // Process in smaller batches to avoid timeouts

// Initialize API client
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-App-Token': APP_TOKEN
  }
});

// Function to load inspections data
async function loadInspections() {
  try {
    console.log('Loading inspection data for both operation types...');
    
    // Get operation numbers for both operation types
    const [operations] = await pool.query(
      `SELECT OPERATION_NUMBER 
       FROM daycare_operations 
       WHERE OPERATION_TYPE IN ('Licensed Center', 'Licensed Child-Care Home')`
    );
    
    console.log(`Found ${operations.length} operations to process`);
    
    // Process in batches
    let totalProcessed = 0;
    let totalLoaded = 0;
    
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      const batchOperations = operations.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(operations.length/BATCH_SIZE)} (${batchOperations.length} operations)`);
      
      // Process each operation
      for (const operation of batchOperations) {
        const operationNumber = operation.OPERATION_NUMBER;
        totalProcessed++;
        
        try {
          // Fetch inspections for this operation using operation_number in the API
          const response = await api.get(`/${INSPECTIONS_DATASET}.json`, {
            params: {
              $limit: 1000,
              operation_number: operationNumber,
              $select: "distinct activity_id, operation_number, activity_date, activity_type, violation_found"
            }
          });
          
          const inspections = response.data;
          
          if (inspections && inspections.length > 0) {
            console.log(`Found ${inspections.length} inspections for operation ${operationNumber}`);
            
            // Get a connection for database operations
            const connection = await pool.getConnection();
            try {
              await connection.beginTransaction();
              
              for (const inspection of inspections) {
                // Format dates properly
                let activityDate = null;
                if (inspection.activity_date) {
                  try {
                    activityDate = new Date(inspection.activity_date);
                    if (isNaN(activityDate.getTime())) {
                      activityDate = null;
                    }
                  } catch (e) {
                    activityDate = null;
                  }
                }
                
                // Check if this inspection already exists
                const [existingInspection] = await connection.query(
                  'SELECT ACTIVITY_ID FROM inspections WHERE ACTIVITY_ID = ?',
                  [inspection.activity_id]
                );
                
                if (existingInspection.length === 0) {
                  // Insert new inspection - use the operationNumber for the OPERATION_ID field
                  await connection.query(
                    `INSERT INTO inspections (
                      OPERATION_ID, 
                      ACTIVITY_ID,
                      ACTIVITY_DATE, 
                      ACTIVITY_TYPE, 
                      VIOLATION_FOUND
                    ) VALUES (?, ?, ?, ?, ?)`,
                    [
                      operationNumber,  // This is the key field mapping
                      inspection.activity_id,
                      activityDate,
                      inspection.activity_type,
                      inspection.violation_found
                    ]
                  );
                  totalLoaded++;
                } else {
                  // Update existing inspection
                  await connection.query(
                    `UPDATE inspections SET
                      OPERATION_ID = ?,
                      ACTIVITY_DATE = ?,
                      ACTIVITY_TYPE = ?,
                      VIOLATION_FOUND = ?
                    WHERE ACTIVITY_ID = ?`,
                    [
                      operationNumber,  // This is the key field mapping
                      activityDate,
                      inspection.activity_type,
                      inspection.violation_found,
                      inspection.activity_id
                    ]
                  );
                }
              }
              
              await connection.commit();
            } catch (dbError) {
              await connection.rollback();
              console.error(`Database error processing operation ${operationNumber}:`, dbError);
            } finally {
              connection.release();
            }
          }
        } catch (apiError) {
          console.error(`Error fetching inspections for operation ${operationNumber}:`, apiError.message);
        }
        
        // Log progress every 50 operations
        if (totalProcessed % 50 === 0 || totalProcessed === operations.length) {
          console.log(`Progress: ${totalProcessed}/${operations.length} operations processed, ${totalLoaded} inspections loaded`);
        }
      }
    }
    
    console.log(`Completed loading inspections. Processed ${totalProcessed} operations, loaded ${totalLoaded} inspections.`);
    return true;
  } catch (error) {
    console.error('Error loading inspection data:', error);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('Starting inspection data loading for both operation types...');
    const result = await loadInspections();
    
    if (result) {
      console.log('Successfully loaded inspection data for both operation types');
    } else {
      console.error('Failed to load inspection data');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
main();
