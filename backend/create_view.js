/**
 * Create Database View
 * 
 * This script creates a database view to make it easier to query
 * the revised non-compliance data.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

async function createView() {
  console.log('Creating database view...');
  
  // Create connection pool
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // Drop view if it exists
    await pool.query('DROP VIEW IF EXISTS violation_risk_comparison');
    
    // Create the view
    const createViewSQL = `
      CREATE VIEW violation_risk_comparison AS 
      SELECT 
        r.id,
        r.NON_COMPLIANCE_ID,
        r.OPERATION_ID,
        d.OPERATION_NAME,
        d.CITY,
        r.ACTIVITY_DATE,
        r.STANDARD_NUMBER_DESCRIPTION,
        r.STANDARD_RISK_LEVEL as ORIGINAL_RISK_LEVEL,
        r.REVISED_RISK_LEVEL,
        r.CATEGORY,
        CASE
          WHEN r.STANDARD_RISK_LEVEL = r.REVISED_RISK_LEVEL THEN 'Unchanged'
          WHEN r.STANDARD_RISK_LEVEL > r.REVISED_RISK_LEVEL THEN 'Downgraded'
          ELSE 'Upgraded'
        END as RISK_CHANGE_TYPE,
        r.NARRATIVE,
        r.CORRECTED_AT_INSPECTION
      FROM 
        revised_non_compliance r
      LEFT JOIN
        daycare_operations d ON r.OPERATION_ID = d.OPERATION_NUMBER
    `;
    
    await pool.query(createViewSQL);
    console.log('View created successfully!');
    
    // Test the view
    const [result] = await pool.query('SELECT COUNT(*) as count FROM violation_risk_comparison');
    console.log(`View is working! Contains ${result[0].count} records`);
    
  } catch (err) {
    console.error('Error creating view:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
createView().catch(console.error);