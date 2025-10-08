/**
 * Fix Risk Analysis Operation IDs
 * 
 * This script fixes the operation_id field in the risk_analysis table.
 * Currently, risk_analysis.operation_id contains the OPERATION_NUMBER from daycare_operations,
 * but it should contain the actual OPERATION_ID from daycare_operations,
 * which is the same ID used in revised_non_compliance.
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

async function fixRiskAnalysisOperationIds() {
  console.log('Fixing risk_analysis operation_id values...');
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // Check current state
    const [sampleBefore] = await pool.query(`
      SELECT 
        r.operation_id AS risk_analysis_operation_id,
        d.OPERATION_NUMBER,
        d.OPERATION_ID AS daycare_operations_id,
        (SELECT COUNT(*) FROM revised_non_compliance nc WHERE nc.OPERATION_ID = d.OPERATION_ID) AS violation_count
      FROM 
        risk_analysis r
      JOIN
        daycare_operations d ON r.operation_id = d.OPERATION_NUMBER
      LIMIT 5
    `);
    
    console.log('Current state (before fix):');
    console.table(sampleBefore);
    
    // Create a backup of the risk_analysis table
    console.log('Creating backup of risk_analysis table...');
    await pool.query('DROP TABLE IF EXISTS risk_analysis_backup');
    await pool.query('CREATE TABLE risk_analysis_backup LIKE risk_analysis');
    await pool.query('INSERT INTO risk_analysis_backup SELECT * FROM risk_analysis');
    
    // Create a new table for the corrected data
    console.log('Creating risk_analysis_fixed table with corrected structure...');
    await pool.query('DROP TABLE IF EXISTS risk_analysis_fixed');
    await pool.query(`
      CREATE TABLE risk_analysis_fixed (
        id INT NOT NULL AUTO_INCREMENT,
        operation_id VARCHAR(50) NOT NULL,
        analysis_summary TEXT,
        risk_factors JSON,
        parent_recommendations JSON,
        total_violations INT DEFAULT 0,
        high_risk_count INT DEFAULT 0,
        medium_high_risk_count INT DEFAULT 0,
        medium_risk_count INT DEFAULT 0,
        low_risk_count INT DEFAULT 0,
        adverse_actions_count INT DEFAULT 0,
        risk_score DECIMAL(5,2),
        last_analysis_date DATE,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      )
    `);
    
    // Copy data with corrected operation_id values
    console.log('Copying data with corrected operation_id values...');
    const [insertResult] = await pool.query(`
      INSERT INTO risk_analysis_fixed (
        operation_id,
        analysis_summary,
        risk_factors,
        parent_recommendations,
        total_violations,
        high_risk_count,
        medium_high_risk_count,
        medium_risk_count,
        low_risk_count,
        adverse_actions_count,
        risk_score,
        last_analysis_date,
        last_updated
      )
      SELECT 
        d.OPERATION_ID,
        r.analysis_summary,
        r.risk_factors,
        r.parent_recommendations,
        r.total_violations,
        r.high_risk_count,
        r.medium_high_risk_count,
        r.medium_risk_count,
        r.low_risk_count,
        r.adverse_actions_count,
        r.risk_score,
        r.last_analysis_date,
        r.last_updated
      FROM 
        risk_analysis r
      JOIN 
        daycare_operations d ON r.operation_id = d.OPERATION_NUMBER
    `);
    
    console.log(`Inserted ${insertResult.affectedRows} records with corrected operation_id values`);
    
    // Check for duplicates
    const [duplicates] = await pool.query(`
      SELECT 
        operation_id, 
        COUNT(*) as count
      FROM 
        risk_analysis_fixed
      GROUP BY 
        operation_id
      HAVING 
        COUNT(*) > 1
    `);
    
    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate operation_ids in risk_analysis_fixed`);
      
      // Create a temporary table to store the IDs to keep (latest record for each operation_id)
      console.log('Handling duplicates...');
      await pool.query('DROP TABLE IF EXISTS ids_to_keep');
      await pool.query(`
        CREATE TABLE ids_to_keep AS
        SELECT MAX(id) as id
        FROM risk_analysis_fixed
        GROUP BY operation_id
      `);
      
      // Delete all rows except the ones with the latest ID for each operation_id
      const [deleteResult] = await pool.query(`
        DELETE FROM risk_analysis_fixed
        WHERE id NOT IN (SELECT id FROM ids_to_keep)
      `);
      
      console.log(`Deleted ${deleteResult.affectedRows} duplicate records`);
      
      // Drop temporary table
      await pool.query('DROP TABLE IF EXISTS ids_to_keep');
    }
    
    // Add UNIQUE constraint on operation_id
    console.log('Adding UNIQUE constraint on operation_id...');
    await pool.query('ALTER TABLE risk_analysis_fixed ADD UNIQUE KEY (operation_id)');
    
    // Swap tables
    console.log('Swapping tables...');
    await pool.query('DROP TABLE IF EXISTS risk_analysis_old');
    await pool.query('RENAME TABLE risk_analysis TO risk_analysis_old');
    await pool.query('RENAME TABLE risk_analysis_fixed TO risk_analysis');
    
    // Verify fix
    const [sampleAfter] = await pool.query(`
      SELECT 
        r.operation_id AS risk_analysis_operation_id,
        d.OPERATION_NUMBER,
        d.OPERATION_ID AS daycare_operations_id,
        (SELECT COUNT(*) FROM revised_non_compliance nc WHERE nc.OPERATION_ID = d.OPERATION_ID) AS violation_count
      FROM 
        risk_analysis r
      JOIN
        daycare_operations d ON r.operation_id = d.OPERATION_ID
      LIMIT 5
    `);
    
    console.log('After fix (risk_analysis now joined on OPERATION_ID):');
    console.table(sampleAfter);
    
    // Check counts
    const [finalCount] = await pool.query('SELECT COUNT(*) as count FROM risk_analysis');
    const [daycareCount] = await pool.query('SELECT COUNT(*) as count FROM daycare_operations');
    
    console.log(`\nFixed risk_analysis table now has ${finalCount[0].count} records`);
    console.log(`Total daycare_operations: ${daycareCount[0].count}`);
    console.log(`Coverage: ${((finalCount[0].count / daycareCount[0].count) * 100).toFixed(2)}%`);
    
    // Sample a few high-risk daycares to verify
    const [highRiskSample] = await pool.query(`
      SELECT 
        r.operation_id,
        d.OPERATION_NUMBER,
        d.OPERATION_NAME,
        d.OPERATION_TYPE,
        r.risk_score,
        r.total_violations,
        (SELECT COUNT(*) FROM revised_non_compliance nc WHERE nc.OPERATION_ID = r.operation_id) AS actual_violations
      FROM 
        risk_analysis r
      JOIN
        daycare_operations d ON r.operation_id = d.OPERATION_ID
      WHERE 
        r.risk_score > 20
      ORDER BY 
        r.risk_score DESC
      LIMIT 5
    `);
    
    console.log('\nSample of high-risk daycares:');
    console.table(highRiskSample);
    
  } catch (err) {
    console.error('Error fixing risk_analysis operation_ids:', err);
  } finally {
    await pool.end();
    console.log('\nOperation completed.');
  }
}

// Run the script
fixRiskAnalysisOperationIds().catch(console.error);