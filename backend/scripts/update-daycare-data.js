/**
 * API Data Updater
 * Updates data for both "Licensed Center" and "Licensed Child-Care Home" types
 * Preserves existing records including latitude/longitude
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const axios = require('axios');

// Create direct connection to MySQL
const pool = mysql.createPool({
  socketPath: '/var/run/mysqld/mysqld.sock',  // MySQL Unix socket
  user: 'root',
  password: 'Bd03021988!!',
  database: 'daycarealert',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://data.texas.gov/resource';
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN || 'XLZk8nhCZvuJ9UooaKbfng3ed';

// Dataset endpoints
const DATASETS = {
  operations: 'bc5r-88dy.json',
  inspections: 'm5q4-3y3d.json',
  nonCompliance: 'tqgd-mf4x.json'
};

// Format date for MySQL
const formatDate = (dateString) => {
  if (!dateString) return null;
  return dateString.split('T')[0];
};

// Format datetime for MySQL
const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return null;
  return dateTimeString.replace('T', ' ').split('.')[0];
};

// Initialize API client
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-App-Token': APP_TOKEN
  }
});

// Function to fetch data from API with pagination
async function* fetchPaginatedData(dataset, query = {}) {
  const limit = 1000;
  let offset = 0;
  let hasMoreData = true;
  
  while (hasMoreData) {
    const url = `${dataset}`;
    console.log(`Fetching ${url} with offset ${offset}...`);
    
    try {
      const response = await api.get(url, {
        params: {
          $limit: limit,
          $offset: offset,
          ...query
        }
      });
      
      const data = response.data;
      
      if (data.length === 0) {
        hasMoreData = false;
      } else {
        yield data;
        offset += limit;
      }
    } catch (error) {
      console.error(`Error fetching data from ${url}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      hasMoreData = false;
    }
  }
}

// Update daycare operations data
async function updateDaycareOperations() {
  console.log('Updating daycare operations data...');
  
  // Get a dedicated connection for transaction
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get existing operations with ID, latitude, and longitude to preserve them
    const [existingOperations] = await connection.query(
      'SELECT id, OPERATION_ID, latitude, longitude FROM daycare_operations'
    );
    
    const existingOperationsMap = new Map();
    existingOperations.forEach(op => {
      existingOperationsMap.set(op.OPERATION_ID, {
        id: op.id,
        latitude: op.latitude,
        longitude: op.longitude
      });
    });
    
    console.log(`Found ${existingOperationsMap.size} existing operations`);
    
    let insertCount = 0;
    let updateCount = 0;
    
    // Filter for Licensed Centers and Licensed Child-Care Homes
    const query = {
      $where: "operation_type='Licensed Center' OR operation_type='Licensed Child-Care Home'"
    };
    
    for await (const batch of fetchPaginatedData(DATASETS.operations, query)) {
      console.log(`Processing batch of ${batch.length} operations`);
      
      for (const operation of batch) {
        try {
          const operationId = operation.operation_id;
          
          // Skip if not a center or home (additional safety check)
          if (operation.operation_type !== 'Licensed Center' && 
              operation.operation_type !== 'Licensed Child-Care Home') {
            continue;
          }
          
          const operationData = {
            OPERATION_NUMBER: operation.operation_number || null,
            OPERATION_NAME: operation.operation_name || null,
            OPERATION_TYPE: operation.operation_type || null,
            LOCATION_ADDRESS: operation.location_address || null,
            CITY: operation.city || null,
            STATE: operation.state || null,
            ZIP: operation.zipcode || null,
            COUNTY: operation.county || null,
            PHONE_NUMBER: operation.phone_number || null,
            EMAIL_ADDRESS: operation.email_address || null,
            WEBSITE_ADDRESS: operation.website_address || null,
            HOURS_OF_OPERATION: operation.hours_of_operation || null,
            DAYS_OF_OPERATION: operation.days_of_operation || null,
            ISSUANCE_DATE: formatDate(operation.issuance_date),
            TOTAL_CAPACITY: operation.total_capacity || null,
            ADMINISTRATOR_DIRECTOR_NAME: operation.administrator_director_name || null,
            OPERATION_STATUS: operation.operation_status || null,
            ACCEPTS_CHILD_CARE_SUBSIDIES: operation.accepts_child_care_subsidies || null,
            TEMPORARILY_CLOSED: operation.temporarily_closed || null,
            HIGH_RISK_VIOLATIONS: operation.deficiency_high || 0,
            MEDIUM_HIGH_RISK_VIOLATIONS: operation.deficiency_medium_high || 0,
            MEDIUM_RISK_VIOLATIONS: operation.deficiency_medium || 0,
            MEDIUM_LOW_RISK_VIOLATIONS: operation.deficiency_medium_low || 0,
            LOW_RISK_VIOLATIONS: operation.deficiency_low || 0,
            TOTAL_VIOLATIONS: (
              parseInt(operation.deficiency_high || 0) + 
              parseInt(operation.deficiency_medium_high || 0) + 
              parseInt(operation.deficiency_medium || 0) + 
              parseInt(operation.deficiency_medium_low || 0) + 
              parseInt(operation.deficiency_low || 0)
            ),
            MAILING_ADDRESS: operation.mailing_address || null,
            TYPE_OF_ISSUANCE: operation.type_of_issuance || null,
            CONDITIONS_ON_PERMIT: operation.conditions_on_permit || null,
            OPEN_FOSTER_HOMES: operation.open_foster_homes || null,
            OPEN_BRANCH_OFFICES: operation.open_branch_offices || null,
            LICENSED_TO_SERVE_AGES: operation.licensed_to_serve_ages || null,
            CORRECTIVE_ACTION: operation.corrective_action || null,
            ADVERSE_ACTION: operation.adverse_action || null,
            PROGRAMMATIC_SERVICES: operation.programmatic_services || null,
            PROGRAMS_PROVIDED: operation.programs_provided || null,
            DEFICIENCY_HIGH: operation.deficiency_high || 0,
            DEFICIENCY_MEDIUM_HIGH: operation.deficiency_medium_high || 0,
            DEFICIENCY_MEDIUM: operation.deficiency_medium || 0,
            DEFICIENCY_MEDIUM_LOW: operation.deficiency_medium_low || 0,
            DEFICIENCY_LOW: operation.deficiency_low || 0,
            TOTAL_INSPECTIONS: operation.total_inspections || 0,
            TOTAL_ASSESSMENTS: operation.total_assessments || 0,
            TOTAL_REPORTS: operation.total_reports || 0,
            TOTAL_SELF_REPORTS: operation.total_self_reports || 0,
            ADDRESS_LINE: operation.address_line || null,
            OPERATION_ID: operationId,
            LAST_UPDATED: new Date()
          };
          
          // Check if operation exists
          if (existingOperationsMap.has(operationId)) {
            const existingData = existingOperationsMap.get(operationId);
            
            // Preserve latitude and longitude if they exist
            if (existingData.latitude !== null && existingData.longitude !== null) {
              operationData.latitude = existingData.latitude;
              operationData.longitude = existingData.longitude;
            }
            
            // Filter out null/undefined values for update
            const validEntries = Object.entries(operationData)
              .filter(([_, value]) => value !== null && value !== undefined);
            
            const updateFields = validEntries
              .map(([key, _]) => `${key} = ?`)
              .join(', ');
            
            const updateValues = validEntries.map(([_, value]) => value);
            
            await connection.query(
              `UPDATE daycare_operations SET ${updateFields} WHERE id = ?`,
              [...updateValues, existingData.id]
            );
            
            updateCount++;
          } else {
            // Filter out null/undefined values for insert
            const validEntries = Object.entries(operationData)
              .filter(([_, value]) => value !== null && value !== undefined);
            
            const fields = validEntries.map(([key, _]) => key).join(', ');
            const placeholders = validEntries.map(() => '?').join(', ');
            const insertValues = validEntries.map(([_, value]) => value);
            
            await connection.query(
              `INSERT INTO daycare_operations (${fields}) VALUES (${placeholders})`,
              insertValues
            );
            
            insertCount++;
          }
        } catch (error) {
          console.error(`Error processing operation ${operation.operation_id}:`, error.message);
        }
      }
    }
    
    await connection.commit();
    console.log(`Daycare operations updated: ${insertCount} inserted, ${updateCount} updated`);
  } catch (error) {
    await connection.rollback();
    console.error('Error in updateDaycareOperations:', error.message);
  } finally {
    connection.release();
  }
}

// Update inspection data
async function updateInspections() {
  console.log('Updating inspections data...');
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get valid operation IDs
    const [operations] = await connection.query(
      `SELECT OPERATION_ID 
       FROM daycare_operations 
       WHERE OPERATION_TYPE IN ('Licensed Center', 'Licensed Child-Care Home')`
    );
    
    const validOperationIds = new Set(operations.map(op => op.OPERATION_ID));
    console.log(`Found ${validOperationIds.size} valid operations`);
    
    // Get existing activity IDs with their primary keys
    const [existingActivities] = await connection.query('SELECT id, ACTIVITY_ID FROM inspections');
    
    const existingActivityMap = new Map();
    existingActivities.forEach(act => {
      existingActivityMap.set(act.ACTIVITY_ID, act.id);
    });
    
    console.log(`Found ${existingActivityMap.size} existing inspection activities`);
    
    let insertCount = 0;
    let skipCount = 0;
    
    for await (const batch of fetchPaginatedData(DATASETS.inspections)) {
      console.log(`Processing batch of ${batch.length} inspections`);
      
      for (const inspection of batch) {
        try {
          const activityId = inspection.activity_id;
          
          // Skip if not a valid operation
          if (!validOperationIds.has(inspection.operation_id)) {
            skipCount++;
            continue;
          }
          
          // Skip if already exists
          if (existingActivityMap.has(activityId)) {
            skipCount++;
            continue;
          }
          
          const inspectionData = {
            OPERATION_ID: inspection.operation_id,
            ACTIVITY_ID: activityId,
            ACTIVITY_DATE: formatDateTime(inspection.activity_date),
            ACTIVITY_TYPE: inspection.activity_type || null,
            VIOLATION_FOUND: inspection.violation_found || null,
            LAST_UPDATED: new Date()
          };
          
          // Filter out null/undefined values
          const validEntries = Object.entries(inspectionData)
            .filter(([_, value]) => value !== null && value !== undefined);
          
          const fields = validEntries.map(([key, _]) => key).join(', ');
          const placeholders = validEntries.map(() => '?').join(', ');
          const insertValues = validEntries.map(([_, value]) => value);
          
          await connection.query(
            `INSERT INTO inspections (${fields}) VALUES (${placeholders})`,
            insertValues
          );
          
          insertCount++;
          
          // Add to existing map to avoid duplicates in same batch
          existingActivityMap.set(activityId, 'new');
          
          // Update last inspection date in daycare_operations table
          if (inspection.activity_type === 'INSPECTION') {
            await connection.query(
              `UPDATE daycare_operations 
               SET LAST_INSPECTION_DATE = ? 
               WHERE OPERATION_ID = ? AND (LAST_INSPECTION_DATE IS NULL OR LAST_INSPECTION_DATE < ?)`,
              [formatDate(inspection.activity_date), inspection.operation_id, formatDate(inspection.activity_date)]
            );
          }
        } catch (error) {
          console.error(`Error processing inspection ${inspection.activity_id}:`, error.message);
        }
      }
    }
    
    await connection.commit();
    console.log(`Inspections updated: ${insertCount} inserted, ${skipCount} skipped`);
  } catch (error) {
    await connection.rollback();
    console.error('Error in updateInspections:', error.message);
  } finally {
    connection.release();
  }
}

// Update non-compliance data
async function updateNonCompliance() {
  console.log('Updating non-compliance data...');
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get valid operation IDs
    const [operations] = await connection.query(
      `SELECT OPERATION_ID 
       FROM daycare_operations 
       WHERE OPERATION_TYPE IN ('Licensed Center', 'Licensed Child-Care Home')`
    );
    
    const validOperationIds = new Set(operations.map(op => op.OPERATION_ID));
    console.log(`Found ${validOperationIds.size} valid operations`);
    
    // Get existing non-compliance IDs with their primary keys
    const [existingNonCompliances] = await connection.query('SELECT id, NON_COMPLIANCE_ID FROM non_compliance');
    
    const existingNonComplianceMap = new Map();
    existingNonCompliances.forEach(nc => {
      existingNonComplianceMap.set(nc.NON_COMPLIANCE_ID, nc.id);
    });
    
    console.log(`Found ${existingNonComplianceMap.size} existing non-compliance records`);
    
    let insertCount = 0;
    let skipCount = 0;
    
    for await (const batch of fetchPaginatedData(DATASETS.nonCompliance)) {
      console.log(`Processing batch of ${batch.length} non-compliance records`);
      
      for (const nonCompliance of batch) {
        try {
          const nonComplianceId = nonCompliance.non_compliance_id;
          
          // Skip if not a valid operation
          if (!validOperationIds.has(nonCompliance.operation_id)) {
            skipCount++;
            continue;
          }
          
          // Skip if already exists
          if (existingNonComplianceMap.has(nonComplianceId)) {
            skipCount++;
            continue;
          }
          
          // Get activity date from inspections table
          const [activityResult] = await connection.query(
            'SELECT ACTIVITY_DATE FROM inspections WHERE ACTIVITY_ID = ?',
            [nonCompliance.activity_id]
          );
          
          const activityDate = activityResult.length > 0 ? activityResult[0].ACTIVITY_DATE : null;
          
          const nonComplianceData = {
            NON_COMPLIANCE_ID: nonComplianceId,
            OPERATION_ID: nonCompliance.operation_id,
            ACTIVITY_ID: nonCompliance.activity_id,
            SECTION_ID: nonCompliance.section_id,
            STANDARD_NUMBER_DESCRIPTION: nonCompliance.standard_number_description || null,
            STANDARD_RISK_LEVEL: nonCompliance.standard_risk_level || null,
            NARRATIVE: nonCompliance.narrative || null,
            TECHNICAL_ASSISTANCE_GIVEN: nonCompliance.technical_assistance_given || null,
            CORRECTED_AT_INSPECTION: nonCompliance.corrected_at_inspection || null,
            CORRECTED_DATE: formatDate(nonCompliance.corrected_date),
            DATE_CORRECTION_VERIFIED: formatDate(nonCompliance.date_correction_verified),
            ACTIVITY_DATE: activityDate ? formatDate(activityDate) : null,
            LAST_UPDATED: new Date()
          };
          
          // Filter out null/undefined values
          const validEntries = Object.entries(nonComplianceData)
            .filter(([_, value]) => value !== null && value !== undefined);
          
          const fields = validEntries.map(([key, _]) => key).join(', ');
          const placeholders = validEntries.map(() => '?').join(', ');
          const insertValues = validEntries.map(([_, value]) => value);
          
          await connection.query(
            `INSERT INTO non_compliance (${fields}) VALUES (${placeholders})`,
            insertValues
          );
          
          insertCount++;
          
          // Add to existing map to avoid duplicates in same batch
          existingNonComplianceMap.set(nonComplianceId, 'new');
        } catch (error) {
          console.error(`Error processing non-compliance ${nonCompliance.non_compliance_id}:`, error.message);
        }
      }
    }
    
    await connection.commit();
    console.log(`Non-compliance data updated: ${insertCount} inserted, ${skipCount} skipped`);
  } catch (error) {
    await connection.rollback();
    console.error('Error in updateNonCompliance:', error.message);
  } finally {
    connection.release();
  }
}

// Function to update violation counts for operations
async function updateViolationCounts() {
  console.log('Updating violation counts for all operations...');
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get all operations
    const [operations] = await connection.query(
      `SELECT id, OPERATION_ID 
       FROM daycare_operations 
       WHERE OPERATION_TYPE IN ('Licensed Center', 'Licensed Child-Care Home')`
    );
    
    console.log(`Updating violation counts for ${operations.length} operations`);
    
    for (const operation of operations) {
      const operationId = operation.OPERATION_ID;
      
      // Count violations by risk level
      const [violations] = await connection.query(
        `SELECT 
           SUM(CASE WHEN STANDARD_RISK_LEVEL = 'High' THEN 1 ELSE 0 END) as high,
           SUM(CASE WHEN STANDARD_RISK_LEVEL = 'Medium High' THEN 1 ELSE 0 END) as medium_high,
           SUM(CASE WHEN STANDARD_RISK_LEVEL = 'Medium' THEN 1 ELSE 0 END) as medium,
           SUM(CASE WHEN STANDARD_RISK_LEVEL = 'Medium Low' THEN 1 ELSE 0 END) as medium_low,
           SUM(CASE WHEN STANDARD_RISK_LEVEL = 'Low' THEN 1 ELSE 0 END) as low
         FROM non_compliance
         WHERE OPERATION_ID = ?`,
        [operationId]
      );
      
      if (violations.length > 0) {
        const counts = violations[0];
        const total = (
          parseInt(counts.high || 0) +
          parseInt(counts.medium_high || 0) +
          parseInt(counts.medium || 0) +
          parseInt(counts.medium_low || 0) +
          parseInt(counts.low || 0)
        );
        
        await connection.query(
          `UPDATE daycare_operations
           SET HIGH_RISK_VIOLATIONS = ?,
               MEDIUM_HIGH_RISK_VIOLATIONS = ?,
               MEDIUM_RISK_VIOLATIONS = ?,
               MEDIUM_LOW_RISK_VIOLATIONS = ?,
               LOW_RISK_VIOLATIONS = ?,
               TOTAL_VIOLATIONS = ?
           WHERE id = ?`,
          [
            counts.high || 0,
            counts.medium_high || 0,
            counts.medium || 0,
            counts.medium_low || 0,
            counts.low || 0,
            total,
            operation.id
          ]
        );
      }
    }
    
    await connection.commit();
    console.log('Violation counts updated successfully');
  } catch (error) {
    await connection.rollback();
    console.error('Error updating violation counts:', error.message);
  } finally {
    connection.release();
  }
}

// Main function to run updates
async function main() {
  console.log('Starting data update process...');
  
  try {
    // Test database connection
    const connection = await pool.getConnection();
    try {
      await connection.query('SELECT 1');
      console.log('Database connection successful');
    } finally {
      connection.release();
    }
    
    // Update tables
    await updateDaycareOperations();
    await updateInspections();
    await updateNonCompliance();
    await updateViolationCounts();
    
    console.log('Data update process completed successfully');
  } catch (error) {
    console.error('Error in update process:', error.message);
    console.error(error.stack);
  }
}

// Run the main function
main();
