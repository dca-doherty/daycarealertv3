/**
 * Update Daycare Operations Violation Counts
 * 
 * This script updates the violation counts in the daycare_operations table
 * based on data from the revised_non_compliance table.
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

async function updateViolationCounts() {
  console.log('Updating violation counts in daycare_operations...');
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // First get a list of operation IDs that have violations in revised_non_compliance
    const [operationsWithViolations] = await pool.query(`
      SELECT DISTINCT OPERATION_ID
      FROM revised_non_compliance
    `);
    
    console.log(`Found ${operationsWithViolations.length} operations with violations in revised_non_compliance table`);
    
    // For each operation, calculate violation counts and update daycare_operations
    let updatedCount = 0;
    
    for (const { OPERATION_ID } of operationsWithViolations) {
      // Get violation counts by risk level
      const [violationCounts] = await pool.query(`
        SELECT 
          COUNT(*) as total_violations,
          SUM(CASE WHEN REVISED_RISK_LEVEL = 'High' THEN 1 ELSE 0 END) as high_risk,
          SUM(CASE WHEN REVISED_RISK_LEVEL = 'Medium High' THEN 1 ELSE 0 END) as medium_high_risk,
          SUM(CASE WHEN REVISED_RISK_LEVEL = 'Medium' THEN 1 ELSE 0 END) as medium_risk,
          SUM(CASE WHEN REVISED_RISK_LEVEL IN ('Medium Low', 'Low') THEN 1 ELSE 0 END) as low_risk
        FROM revised_non_compliance
        WHERE OPERATION_ID = ?
      `, [OPERATION_ID]);
      
      const counts = violationCounts[0];
      
      // Update the daycare_operations table
      const [updateResult] = await pool.query(`
        UPDATE daycare_operations
        SET 
          TOTAL_VIOLATIONS = ?,
          HIGH_RISK_VIOLATIONS = ?,
          MEDIUM_HIGH_RISK_VIOLATIONS = ?,
          MEDIUM_RISK_VIOLATIONS = ?,
          LOW_RISK_VIOLATIONS = ?
        WHERE OPERATION_NUMBER = ?
      `, [
        counts.total_violations,
        counts.high_risk,
        counts.medium_high_risk,
        counts.medium_risk,
        counts.low_risk,
        OPERATION_ID
      ]);
      
      if (updateResult.affectedRows > 0) {
        updatedCount++;
        
        // Log progress every 10 updates
        if (updatedCount % 10 === 0) {
          console.log(`Updated ${updatedCount}/${operationsWithViolations.length} operations...`);
        }
      }
    }
    
    console.log(`\nUpdate complete! Updated violation counts for ${updatedCount} operations.`);
    
    // Verify the update
    const [totals] = await pool.query(`
      SELECT 
        SUM(TOTAL_VIOLATIONS) as total,
        SUM(HIGH_RISK_VIOLATIONS) as high,
        SUM(MEDIUM_HIGH_RISK_VIOLATIONS) as medium_high,
        SUM(MEDIUM_RISK_VIOLATIONS) as medium,
        SUM(LOW_RISK_VIOLATIONS) as low
      FROM daycare_operations
    `);
    
    console.log('\n=== Updated Violation Counts in daycare_operations ===');
    console.log(`Total violations: ${totals[0].total}`);
    console.log(`High risk violations: ${totals[0].high}`);
    console.log(`Medium-high risk violations: ${totals[0].medium_high}`);
    console.log(`Medium risk violations: ${totals[0].medium}`);
    console.log(`Low risk violations: ${totals[0].low}`);
    
  } catch (err) {
    console.error('Error updating violation counts:', err);
  } finally {
    await pool.end();
    console.log('\nOperation completed.');
  }
}

// Run the script
updateViolationCounts().catch(console.error);