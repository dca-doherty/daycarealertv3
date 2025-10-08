/**
 * Create Comprehensive Daycare Operations Table
 * 
 * This script creates a complete daycare_operations table with ALL fields from the API.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'daycarealert',
  connectionLimit: 5
};

// Main function
async function main() {
  console.log('Creating comprehensive daycare_operations table...');
  
  // Create connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    // First check if the table exists
    const [tables] = await pool.query(
      `SHOW TABLES LIKE 'daycare_operations'`
    );
    
    // Decide what to do based on if the table exists
    if (tables.length > 0) {
      console.log('Table daycare_operations already exists. Adding any missing columns...');
      
      // Get existing columns
      const [columns] = await pool.query(
        `DESCRIBE daycare_operations`
      );
      
      // Create a set of existing column names
      const existingColumns = new Set(columns.map(col => col.Field));
      
      // List of all expected columns from the API
      const expectedColumns = [
        { name: 'OPERATION_ID', type: 'VARCHAR(50)' },
        { name: 'OPERATION_TYPE', type: 'VARCHAR(100)' },
        { name: 'OPERATION_NUMBER', type: 'VARCHAR(50)' },
        { name: 'OPERATION_NAME', type: 'VARCHAR(255)' },
        { name: 'LOCATION_ADDRESS', type: 'VARCHAR(255)' },
        { name: 'MAILING_ADDRESS', type: 'VARCHAR(255)' },
        { name: 'PHONE_NUMBER', type: 'VARCHAR(20)' },
        { name: 'COUNTY', type: 'VARCHAR(100)' },
        { name: 'WEBSITE_ADDRESS', type: 'VARCHAR(255)' },
        { name: 'ADMINISTRATOR_DIRECTOR_NAME', type: 'VARCHAR(255)' },
        { name: 'TYPE_OF_ISSUANCE', type: 'VARCHAR(100)' },
        { name: 'ISSUANCE_DATE', type: 'DATE' },
        { name: 'CONDITIONS_ON_PERMIT', type: 'VARCHAR(10)' },
        { name: 'ACCEPTS_CHILD_CARE_SUBSIDIES', type: 'VARCHAR(10)' },
        { name: 'HOURS_OF_OPERATION', type: 'VARCHAR(255)' },
        { name: 'DAYS_OF_OPERATION', type: 'VARCHAR(255)' },
        { name: 'TOTAL_CAPACITY', type: 'INT' },
        { name: 'OPEN_FOSTER_HOMES', type: 'INT' },
        { name: 'OPEN_BRANCH_OFFICES', type: 'INT' },
        { name: 'LICENSED_TO_SERVE_AGES', type: 'VARCHAR(255)' },
        { name: 'CORRECTIVE_ACTION', type: 'VARCHAR(10)' },
        { name: 'ADVERSE_ACTION', type: 'VARCHAR(10)' },
        { name: 'TEMPORARILY_CLOSED', type: 'VARCHAR(10)' },
        { name: 'PROGRAMMATIC_SERVICES', type: 'TEXT' },
        { name: 'DEFICIENCY_HIGH', type: 'INT' },
        { name: 'DEFICIENCY_MEDIUM_HIGH', type: 'INT' },
        { name: 'DEFICIENCY_MEDIUM', type: 'INT' },
        { name: 'DEFICIENCY_MEDIUM_LOW', type: 'INT' },
        { name: 'DEFICIENCY_LOW', type: 'INT' },
        { name: 'TOTAL_INSPECTIONS', type: 'INT' },
        { name: 'TOTAL_ASSESSMENTS', type: 'INT' },
        { name: 'TOTAL_REPORTS', type: 'INT' },
        { name: 'TOTAL_SELF_REPORTS', type: 'INT' },
        { name: 'EMAIL_ADDRESS', type: 'VARCHAR(255)' },
        { name: 'OPERATION_STATUS', type: 'VARCHAR(10)' },
        { name: 'ADDRESS_LINE', type: 'VARCHAR(255)' },
        { name: 'CITY', type: 'VARCHAR(100)' },
        { name: 'STATE', type: 'VARCHAR(50)' },
        { name: 'ZIP', type: 'VARCHAR(15)' },
        // Additional fields for our application
        { name: 'HIGH_RISK_VIOLATIONS', type: 'INT' },
        { name: 'MEDIUM_HIGH_RISK_VIOLATIONS', type: 'INT' },
        { name: 'MEDIUM_RISK_VIOLATIONS', type: 'INT' },
        { name: 'LOW_RISK_VIOLATIONS', type: 'INT' },
        { name: 'TOTAL_VIOLATIONS', type: 'INT' },
        { name: 'LAST_INSPECTION_DATE', type: 'DATE' },
        { name: 'LAST_UPDATED', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
      ];
      
      // Add missing columns
      for (const column of expectedColumns) {
        if (!existingColumns.has(column.name)) {
          console.log(`Adding missing column: ${column.name}`);
          await pool.query(
            `ALTER TABLE daycare_operations ADD COLUMN ${column.name} ${column.type}`
          );
        }
      }
      
      console.log('All missing columns have been added');
    } else {
      // Create the complete table from scratch
      console.log('Creating daycare_operations table from scratch...');
      
      await pool.query(`
        CREATE TABLE daycare_operations (
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
      `);
      
      console.log('Table daycare_operations created successfully');
    }
    
    // Now we need to update our load_all_records.js script to include these fields
    console.log('\nTable setup complete!');
    console.log('\nIMPORTANT: Now update your load_all_records.js script to include all these fields');
    console.log('Run the following command to load daycare data:');
    console.log('npm run load-api-data daycares');
    
    // Close the pool
    await pool.end();
  } catch (err) {
    console.error('Error setting up database:', err);
    
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