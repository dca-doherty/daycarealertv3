// Script to import inspections from CSV file
require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const { pool } = require('./config/db');
const path = require('path');

// Path to CSV files
const inspectionCsvPath = path.resolve('/home/dohertyb/daycarealert/HHSC_CCL_Inspection_Investigation_Assessment_Data_20250320.csv');

// Max records to import
const MAX_INSPECTIONS = 500;

// Count for progress reporting
let processedInspections = 0;
let importedInspections = 0;

// Helper to clean and prepare a string for SQL insertion
const cleanString = (str) => {
  if (str === undefined || str === null) return null;
  if (typeof str !== 'string') return str;
  return str.replace(/'/g, "''").trim();
};

// Import inspection data
async function importInspectionData() {
  console.log('Starting inspection data import...');
  
  try {
    // Get all daycare operation numbers for faster lookups
    const [daycares] = await pool.execute('SELECT operation_number FROM daycares');
    const daycareOperationNumbers = new Set(daycares.map(d => d.operation_number));
    
    console.log(`Found ${daycareOperationNumbers.size} operation numbers for lookup`);
    
    // Create a stream to read the CSV file
    return new Promise((resolve, reject) => {
      fs.createReadStream(inspectionCsvPath)
        .pipe(csv())
        .on('data', async (data) => {
          // Stop processing if we've reached our limit
          if (processedInspections >= MAX_INSPECTIONS) {
            return;
          }
          
          try {
            // Check if daycare exists in our database using the Set for faster lookup
            if (daycareOperationNumbers.has(data.OPERATION_ID)) {
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
              
              // Report progress every 10 records
              if (processedInspections % 10 === 0) {
                console.log(`Processed ${processedInspections} inspection records, imported ${importedInspections}`);
              }
            }
          } catch (error) {
            console.error(`Error importing inspection record ${data.ACTIVITY_ID}:`, error);
          }
        })
        .on('end', () => {
          console.log(`Inspection import complete. Processed ${processedInspections} records, imported ${importedInspections} new records.`);
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  } catch (error) {
    console.error('Error importing inspection data:', error);
  }
}

// Run the import
async function runImport() {
  try {
    console.log('Starting inspection data import process...');
    await importInspectionData();
    console.log('Import process completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error in import process:', error);
    process.exit(1);
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

module.exports = { importInspectionData, runImport };