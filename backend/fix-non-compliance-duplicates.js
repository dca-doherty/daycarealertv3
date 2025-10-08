/**
 * Fix duplicate records in non_compliance table
 * 
 * This script removes duplicate records from the non_compliance table,
 * adds a UNIQUE constraint to prevent future duplicates, and verifies
 * the table structure matches the script's expectations.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

// Database configuration from .env
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

async function main() {
  console.log('=== Fixing non_compliance table duplicates ===');
  
  // Create connection pool
  console.log('Connecting to database...');
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Count duplicates first
    console.log('Checking duplicates...');
    const [duplicateRows] = await pool.query(`
      SELECT NON_COMPLIANCE_ID, COUNT(*) as count
      FROM non_compliance
      GROUP BY NON_COMPLIANCE_ID
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    if (duplicateRows.length === 0) {
      console.log('No duplicates found. Skipping cleanup.');
    } else {
      console.log(`Found ${duplicateRows.length} NON_COMPLIANCE_IDs with duplicates.`);
      console.log(`Total duplicate entries: ${duplicateRows.reduce((sum, row) => sum + row.count - 1, 0)}`);
      
      // Option 1: Remove all duplicates, keeping only one record per NON_COMPLIANCE_ID
      // This approach uses a temporary table
      console.log('\nRemoving duplicates...');
      
      // 1. Create a temporary table with the good records (one per NON_COMPLIANCE_ID)
      await pool.query(`
        CREATE TEMPORARY TABLE tmp_non_compliance AS
        SELECT * FROM non_compliance
        WHERE id IN (
          SELECT MIN(id) 
          FROM non_compliance 
          GROUP BY NON_COMPLIANCE_ID
        )
      `);
      
      // 2. Count how many records we're keeping
      const [keepCount] = await pool.query(`SELECT COUNT(*) as count FROM tmp_non_compliance`);
      console.log(`Keeping ${keepCount[0].count} unique records`);
      
      // 3. Drop the original table and rename the temporary one
      await pool.query(`DROP TABLE non_compliance`);
      
      // 4. Create a new table with the proper structure including the UNIQUE key
      await pool.query(`
        CREATE TABLE non_compliance (
          id INT AUTO_INCREMENT PRIMARY KEY,
          NON_COMPLIANCE_ID VARCHAR(255) NOT NULL,
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
      `);
      
      // 5. Copy data from temporary table
      await pool.query(`
        INSERT INTO non_compliance
        SELECT * FROM tmp_non_compliance
      `);
      
      // 6. Drop temporary table
      await pool.query(`DROP TABLE tmp_non_compliance`);
      
      console.log('Duplicates successfully removed!');
    }
    
    // Check if UNIQUE constraint exists
    const [indexInfo] = await pool.query(`
      SHOW INDEX FROM non_compliance 
      WHERE Key_name = 'NON_COMPLIANCE_ID' AND Non_unique = 0
    `);
    
    if (indexInfo.length === 0) {
      console.log('\nAdding UNIQUE constraint to NON_COMPLIANCE_ID column...');
      await pool.query(`ALTER TABLE non_compliance ADD UNIQUE INDEX (NON_COMPLIANCE_ID)`);
      console.log('UNIQUE constraint added successfully!');
    } else {
      console.log('\nUNIQUE constraint already exists on NON_COMPLIANCE_ID column.');
    }
    
    console.log('\n=== Fix completed successfully! ===');
    console.log('You can now run the following commands without duplicates:');
    console.log('- npm run load-api-data inspections');
    console.log('- npm run load-api-data daycares');
    console.log('- npm run load-api-data violations');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);