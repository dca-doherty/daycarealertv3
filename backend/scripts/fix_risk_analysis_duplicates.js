/**
 * Fix Risk Analysis Duplicates
 * 
 * This script removes duplicate entries in the risk_analysis table
 * and ensures the UNIQUE constraint on operation_id exists.
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

async function fixRiskAnalysisDuplicates() {
  console.log('Fixing risk_analysis duplicates...');
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // Count total records
    const [totalCount] = await pool.query('SELECT COUNT(*) as count FROM risk_analysis');
    console.log(`Total records in risk_analysis: ${totalCount[0].count}`);
    
    // Count unique operation_ids
    const [uniqueCount] = await pool.query('SELECT COUNT(DISTINCT operation_id) as count FROM risk_analysis');
    console.log(`Unique operation_ids in risk_analysis: ${uniqueCount[0].count}`);
    
    // Check for duplicates
    const [duplicates] = await pool.query(`
      SELECT operation_id, COUNT(*) as count 
      FROM risk_analysis 
      GROUP BY operation_id 
      HAVING COUNT(*) > 1
    `);
    
    console.log(`Found ${duplicates.length} operation_ids with duplicates`);
    
    if (duplicates.length > 0) {
      console.log('Sample of duplicates:');
      console.table(duplicates.slice(0, 5));
      
      // Create a table with the IDs to keep (latest ID for each operation_id)
      console.log('Creating temporary table with IDs to keep...');
      await pool.query('DROP TABLE IF EXISTS ids_to_keep');
      await pool.query(`
        CREATE TABLE ids_to_keep AS
        SELECT MAX(id) as id
        FROM risk_analysis
        GROUP BY operation_id
      `);
      
      // Delete all rows except the ones with the latest ID for each operation_id
      console.log('Deleting duplicate records...');
      const [deleteResult] = await pool.query(`
        DELETE FROM risk_analysis
        WHERE id NOT IN (SELECT id FROM ids_to_keep)
      `);
      
      console.log(`Deleted ${deleteResult.affectedRows} duplicate records`);
      
      // Cleanup temporary table
      await pool.query('DROP TABLE IF EXISTS ids_to_keep');
    }
    
    // Check if UNIQUE constraint is missing
    const [indices] = await pool.query(`SHOW INDEX FROM risk_analysis WHERE Key_name = 'operation_id'`);
    
    if (indices.length === 0) {
      console.log('UNIQUE constraint on operation_id is missing, adding it...');
      
      // Before adding constraint, ensure no duplicates remain
      const [checkDuplicates] = await pool.query(`
        SELECT operation_id, COUNT(*) as count 
        FROM risk_analysis 
        GROUP BY operation_id 
        HAVING COUNT(*) > 1
      `);
      
      if (checkDuplicates.length > 0) {
        console.log(`ERROR: Still found ${checkDuplicates.length} duplicates, cannot add UNIQUE constraint.`);
      } else {
        // Add UNIQUE constraint
        await pool.query('ALTER TABLE risk_analysis ADD UNIQUE KEY (operation_id)');
        console.log('Added UNIQUE constraint successfully');
      }
    } else {
      console.log('UNIQUE constraint on operation_id already exists');
    }
    
    // Verify the fix
    const [finalCount] = await pool.query('SELECT COUNT(*) as count FROM risk_analysis');
    console.log(`Final record count in risk_analysis: ${finalCount[0].count}`);
    
    // Verify all daycares have a risk analysis
    const [daycareCount] = await pool.query('SELECT COUNT(*) as count FROM daycare_operations');
    console.log(`\nTotal daycares: ${daycareCount[0].count}`);
    console.log(`Risk analyses: ${finalCount[0].count}`);
    console.log(`Coverage: ${((finalCount[0].count / daycareCount[0].count) * 100).toFixed(2)}%`);
    
  } catch (err) {
    console.error('Error fixing risk_analysis duplicates:', err);
  } finally {
    await pool.end();
    console.log('\nOperation completed.');
  }
}

// Run the script
fixRiskAnalysisDuplicates().catch(console.error);