/**
 * API Data Loader for Non-Compliance (Violations) - Both Operation Types
 * This script loads violation data for both Licensed Centers and Licensed Child-Care Homes
 * FIXED version - handles OPERATION_NUMBER/OPERATION_ID properly
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const axios = require('axios');
const { pool } = require('../config/db');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://data.texas.gov/resource';
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN || 'XLZk8nhCZvuJ9UooaKbfng3ed';
const VIOLATIONS_DATASET = process.env.VIOLATIONS_DATASET || 'tqgd-mf4x';
const BATCH_SIZE = 100; // Process in smaller batches to avoid timeouts

// Initialize API client
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-App-Token': APP_TOKEN
  }
});

// Function to load non-compliance (violations) data
async function loadViolations() {
  try {
    console.log('Loading non-compliance data for both operation types...');
    
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
          // Fetch violations for this operation
          const response = await api.get(`/${VIOLATIONS_DATASET}.json`, {
            params: {
              $limit: 1000,
              operation_number: operationNumber
            }
          });
          
          const violations = response.data;
          
          if (violations && violations.length > 0) {
            console.log(`Found ${violations.length} violations for operation ${operationNumber}`);
            
            // Get a connection for database operations
            const connection = await pool.getConnection();
            try {
              await connection.beginTransaction();
              
              for (const violation of violations) {
                // Format dates properly
                let activityDate = null;
                if (violation.activity_date) {
                  try {
                    activityDate = new Date(violation.activity_date);
                    if (isNaN(activityDate.getTime())) {
                      activityDate = null;
                    }
                  } catch (e) {
                    activityDate = null;
                  }
                }
                
                let correctedDate = null;
                if (violation.corrected_date) {
                  try {
                    correctedDate = new Date(violation.corrected_date);
                    if (isNaN(correctedDate.getTime())) {
                      correctedDate = null;
                    }
                  } catch (e) {
                    correctedDate = null;
                  }
                }
                
                let dateVerified = null;
                if (violation.date_correction_verified) {
                  try {
                    dateVerified = new Date(violation.date_correction_verified);
                    if (isNaN(dateVerified.getTime())) {
                      dateVerified = null;
                    }
                  } catch (e) {
                    dateVerified = null;
                  }
                }
                
                // Generate a unique ID if not present
                const nonComplianceId = violation.non_compliance_id || 
                  `${operationNumber}_${violation.activity_id}_${Math.random().toString(36).substring(2, 15)}`;
                
                // Check if this violation already exists
                const [existingViolation] = await connection.query(
                  'SELECT NON_COMPLIANCE_ID FROM non_compliance WHERE NON_COMPLIANCE_ID = ?',
                  [nonComplianceId]
                );
                
                if (existingViolation.length === 0) {
                  // Insert new violation - use operationNumber for OPERATION_ID field
                  await connection.query(
                    `INSERT INTO non_compliance (
                      NON_COMPLIANCE_ID,
                      OPERATION_ID,
                      ACTIVITY_ID,
                      SECTION_ID,
                      STANDARD_NUMBER_DESCRIPTION,
                      STANDARD_RISK_LEVEL,
                      NARRATIVE,
                      TECHNICAL_ASSISTANCE_GIVEN,
                      CORRECTED_AT_INSPECTION,
                      CORRECTED_DATE,
                      DATE_CORRECTION_VERIFIED,
                      ACTIVITY_DATE
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                      nonComplianceId,
                      operationNumber,  // This is the key field mapping
                      violation.activity_id,
                      violation.section_id,
                      violation.standard_number_description,
                      violation.standard_risk_level,
                      violation.narrative,
                      violation.technical_assistance_given,
                      violation.corrected_at_inspection,
                      correctedDate,
                      dateVerified,
                      activityDate
                    ]
                  );
                  totalLoaded++;
                } else {
                  // Update existing violation
                  await connection.query(
                    `UPDATE non_compliance SET
                      OPERATION_ID = ?,
                      ACTIVITY_ID = ?,
                      SECTION_ID = ?,
                      STANDARD_NUMBER_DESCRIPTION = ?,
                      STANDARD_RISK_LEVEL = ?,
                      NARRATIVE = ?,
                      TECHNICAL_ASSISTANCE_GIVEN = ?,
                      CORRECTED_AT_INSPECTION = ?,
                      CORRECTED_DATE = ?,
                      DATE_CORRECTION_VERIFIED = ?,
                      ACTIVITY_DATE = ?
                    WHERE NON_COMPLIANCE_ID = ?`,
                    [
                      operationNumber,  // This is the key field mapping
                      violation.activity_id,
                      violation.section_id,
                      violation.standard_number_description,
                      violation.standard_risk_level,
                      violation.narrative,
                      violation.technical_assistance_given,
                      violation.corrected_at_inspection,
                      correctedDate,
                      dateVerified,
                      activityDate,
                      nonComplianceId
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
          console.error(`Error fetching violations for operation ${operationNumber}:`, apiError.message);
        }
        
        // Log progress every 50 operations
        if (totalProcessed % 50 === 0 || totalProcessed === operations.length) {
          console.log(`Progress: ${totalProcessed}/${operations.length} operations processed, ${totalLoaded} violations loaded`);
        }
      }
    }
    
    console.log(`Completed loading violations. Processed ${totalProcessed} operations, loaded ${totalLoaded} violations.`);
    return true;
  } catch (error) {
    console.error('Error loading violation data:', error);
    return false;
  }
}

// Function to update violation counts in the daycare_operations table
async function updateViolationCounts() {
  try {
    console.log('Updating violation counts for all operations...');
    
    // Get operations with violations - use OPERATION_NUMBER to match daycare_operations table
    const [operations] = await pool.query(
      `SELECT DISTINCT o.OPERATION_NUMBER 
       FROM daycare_operations o
       JOIN non_compliance n ON o.OPERATION_NUMBER = n.OPERATION_ID`
    );
    
    console.log(`Found ${operations.length} operations with violations to update`);
    
    let updatedCount = 0;
    
    // Process each operation
    const connection = await pool.getConnection();
    try {
      for (const operation of operations) {
        const operationNumber = operation.OPERATION_NUMBER;
        
        // Count violations by risk level
        const [counts] = await connection.query(
          `SELECT 
            COUNT(CASE WHEN STANDARD_RISK_LEVEL = 'High' THEN 1 END) as high_risk,
            COUNT(CASE WHEN STANDARD_RISK_LEVEL = 'Medium High' THEN 1 END) as medium_high_risk,
            COUNT(CASE WHEN STANDARD_RISK_LEVEL = 'Medium' THEN 1 END) as medium_risk,
            COUNT(CASE WHEN STANDARD_RISK_LEVEL = 'Medium Low' THEN 1 END) as medium_low_risk,
            COUNT(CASE WHEN STANDARD_RISK_LEVEL = 'Low' THEN 1 END) as low_risk,
            COUNT(*) as total
          FROM non_compliance
          WHERE OPERATION_ID = ?`,
          [operationNumber]
        );
        
        if (counts.length > 0) {
          const count = counts[0];
          
          // Update the counts
          await connection.query(
            `UPDATE daycare_operations SET
              HIGH_RISK_VIOLATIONS = ?,
              MEDIUM_HIGH_RISK_VIOLATIONS = ?,
              MEDIUM_RISK_VIOLATIONS = ?,
              MEDIUM_LOW_RISK_VIOLATIONS = ?,
              LOW_RISK_VIOLATIONS = ?,
              TOTAL_VIOLATIONS = ?
            WHERE OPERATION_NUMBER = ?`,
            [
              count.high_risk || 0,
              count.medium_high_risk || 0,
              count.medium_risk || 0,
              count.medium_low_risk || 0,
              count.low_risk || 0,
              count.total || 0,
              operationNumber
            ]
          );
          
          updatedCount++;
          
          // Log progress every 100 operations
          if (updatedCount % 100 === 0) {
            console.log(`Updated counts for ${updatedCount}/${operations.length} operations`);
          }
        }
      }
    } finally {
      connection.release();
    }
    
    console.log(`Completed updating violation counts for ${updatedCount} operations`);
    return true;
  } catch (error) {
    console.error('Error updating violation counts:', error);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('Starting non-compliance data loading for both operation types...');
    
    // Load violations
    const violationsResult = await loadViolations();
    
    if (violationsResult) {
      console.log('Successfully loaded violation data for both operation types');
      
      // Update violation counts
      const countsResult = await updateViolationCounts();
      
      if (countsResult) {
        console.log('Successfully updated violation counts');
      } else {
        console.error('Failed to update violation counts');
      }
    } else {
      console.error('Failed to load violation data');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
main();
