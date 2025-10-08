// Script to import CSV data into the database
require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const { pool } = require('./config/db');
const path = require('path');

// Path to CSV files
const daycareCsvPath = path.resolve('/home/dohertyb/daycarealert/HHSC_CCL_Daycare_and_Residential_Operations_Data_20250320.csv');
const inspectionCsvPath = path.resolve('/home/dohertyb/daycarealert/HHSC_CCL_Inspection_Investigation_Assessment_Data_20250320.csv');

// Count for progress reporting
let processedDaycares = 0;
let importedDaycares = 0;
let processedInspections = 0;
let importedInspections = 0;

// Helper to clean and prepare a string for SQL insertion
const cleanString = (str) => {
  if (str === undefined || str === null) return null;
  if (typeof str !== 'string') return str;
  return str.replace(/'/g, "''").trim();
};

// Import daycare data
async function importDaycareData() {
  console.log('Starting daycare data import...');
  
  try {
    const results = [];
    let rowCount = 0;
    
    // First, count total rows for progress reporting
    fs.createReadStream(daycareCsvPath)
      .pipe(csv())
      .on('data', () => rowCount++)
      .on('end', () => {
        console.log(`Total daycare records to process: ${rowCount}`);
      });
      
    // Create a stream to read the CSV file
    fs.createReadStream(daycareCsvPath)
      .pipe(csv())
      .on('data', async (data) => {
        // Only import Licensed Center type operations
        if (data.OPERATION_TYPE === 'Licensed Center') {
          try {
            // Check if operation already exists
            const [existingDaycares] = await pool.execute(
              'SELECT id FROM daycares WHERE operation_number = ?',
              [data.OPERATION_NUMBER]
            );
            
            if (existingDaycares.length === 0) {
              // Prepare data for insertion
              const insertQuery = `
                INSERT INTO daycares (
                  operation_number, operation_name, operation_type, 
                  location_address, address, city, state, zip_code, county,
                  phone_number, email, website_address, hours_of_operation,
                  days_of_operation, issue_date, programs_provided,
                  licensed_to_serve_ages, total_capacity, accepts_financial_assistance,
                  high_risk_violations, medium_high_risk_violations, 
                  medium_risk_violations, low_risk_violations,
                  total_inspections_2yr
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `;
              
              const params = [
                data.OPERATION_NUMBER,
                cleanString(data.OPERATION_NAME),
                cleanString(data.OPERATION_TYPE),
                cleanString(data.LOCATION_ADDRESS),
                cleanString(data.ADDRESS_LINE),
                cleanString(data.CITY),
                cleanString(data.STATE),
                cleanString(data.ZIPCODE),
                cleanString(data.COUNTY),
                cleanString(data.PHONE_NUMBER),
                cleanString(data.email_address),
                cleanString(data.WEBSITE_ADDRESS),
                cleanString(data.HOURS_OF_OPERATION),
                cleanString(data.DAYS_OF_OPERATION),
                data.ISSUANCE_DATE ? new Date(data.ISSUANCE_DATE) : null,
                cleanString(data.PROGRAMS_PROVIDED),
                cleanString(data.LICENSED_TO_SERVE_AGES),
                data.TOTAL_CAPACITY ? parseInt(data.TOTAL_CAPACITY, 10) : null,
                data.ACCEPTS_CHILD_CARE_SUBSIDIES === 'Y' ? 1 : 0,
                data.DEFICIENCY_HIGH ? parseInt(data.DEFICIENCY_HIGH, 10) : 0,
                data.DEFICIENCY_MEDIUM_HIGH ? parseInt(data.DEFICIENCY_MEDIUM_HIGH, 10) : 0,
                data.DEFICIENCY_MEDIUM ? parseInt(data.DEFICIENCY_MEDIUM, 10) : 0,
                data.DEFICIENCY_LOW ? parseInt(data.DEFICIENCY_LOW, 10) : 0,
                data.TOTAL_INSPECTIONS ? parseInt(data.TOTAL_INSPECTIONS, 10) : 0
              ];
              
              // Execute the insertion
              await pool.execute(insertQuery, params);
              importedDaycares++;
            }
            
            processedDaycares++;
            
            // Report progress every 100 records
            if (processedDaycares % 100 === 0) {
              console.log(`Processed ${processedDaycares} daycare records, imported ${importedDaycares}`);
            }
          } catch (error) {
            console.error(`Error importing daycare record ${data.OPERATION_NUMBER}:`, error);
          }
        }
      })
      .on('end', () => {
        console.log(`Daycare import complete. Processed ${processedDaycares} records, imported ${importedDaycares} new records.`);
      });
  } catch (error) {
    console.error('Error importing daycare data:', error);
  }
}

// Import inspection data
async function importInspectionData() {
  console.log('Starting inspection data import...');
  
  try {
    const results = [];
    let rowCount = 0;
    
    // First, count total rows for progress reporting
    fs.createReadStream(inspectionCsvPath)
      .pipe(csv())
      .on('data', () => rowCount++)
      .on('end', () => {
        console.log(`Total inspection records to process: ${rowCount}`);
      });
      
    // Create a stream to read the CSV file
    fs.createReadStream(inspectionCsvPath)
      .pipe(csv())
      .on('data', async (data) => {
        try {
          // Check if daycare exists in our database
          const [existingDaycares] = await pool.execute(
            'SELECT id FROM daycares WHERE operation_number = ?',
            [data.OPERATION_ID]
          );
          
          // Only import records for daycares we have in our database
          if (existingDaycares.length > 0) {
            // Check if inspection already exists
            const [existingInspections] = await pool.execute(
              'SELECT id FROM inspections WHERE inspection_id = ?',
              [data.ACTIVITY_ID]
            );
            
            if (existingInspections.length === 0) {
              // Prepare data for insertion
              const insertQuery = `
                INSERT INTO inspections (
                  inspection_id, operation_number, inspection_type, 
                  inspection_date, result, violations_found
                ) VALUES (?, ?, ?, ?, ?, ?)
              `;
              
              const params = [
                data.ACTIVITY_ID,
                data.OPERATION_ID,
                cleanString(data.ACTIVITY_TYPE),
                data.ACTIVITY_DATE ? new Date(data.ACTIVITY_DATE) : null,
                cleanString(data.ACTIVITY_TYPE),
                data.VIOLATION_FOUND === 'Y' ? 1 : 0
              ];
              
              // Execute the insertion
              await pool.execute(insertQuery, params);
              importedInspections++;
            }
            
            processedInspections++;
            
            // Report progress every 100 records
            if (processedInspections % 100 === 0) {
              console.log(`Processed ${processedInspections} inspection records, imported ${importedInspections}`);
            }
          }
        } catch (error) {
          console.error(`Error importing inspection record ${data.ACTIVITY_ID}:`, error);
        }
      })
      .on('end', () => {
        console.log(`Inspection import complete. Processed ${processedInspections} records, imported ${importedInspections} new records.`);
      });
  } catch (error) {
    console.error('Error importing inspection data:', error);
  }
}

// Run the import
async function runImport() {
  try {
    // Import daycare data first, then inspection data
    console.log('Starting data import process...');
    await importDaycareData();
    await importInspectionData();
    console.log('Import process completed!');
  } catch (error) {
    console.error('Error in import process:', error);
  }
}

// Run import if script is run directly
if (require.main === module) {
  // Check if csv-parser is installed
  try {
    require.resolve('csv-parser');
    
    // Run the import
    runImport();
  } catch (error) {
    console.error('csv-parser package is not installed. Please run "npm install csv-parser" first.');
    process.exit(1);
  }
}

module.exports = { importDaycareData, importInspectionData, runImport };