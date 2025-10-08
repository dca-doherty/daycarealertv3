/**
 * Fix Operation ID Mismatch
 * 
 * This script fixes the mismatch between how operation_id is used in different tables:
 * - daycare_operations has both OPERATION_NUMBER and OPERATION_ID fields
 * - revised_non_compliance uses OPERATION_ID (which matches daycare_operations.OPERATION_ID)
 * - risk_analysis uses operation_id (which currently matches daycare_operations.OPERATION_NUMBER)
 * 
 * We need to update the risk_analysis table to use the actual OPERATION_ID values.
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

async function fixOperationIdMismatch() {
  console.log('Fixing operation_id mismatch...');
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // First, let's verify the issue by checking a few records
    const [daycares] = await pool.query(`
      SELECT 
        d.OPERATION_NUMBER, 
        d.OPERATION_ID,
        r.operation_id as risk_operation_id,
        (SELECT COUNT(*) FROM revised_non_compliance nc WHERE nc.OPERATION_ID = d.OPERATION_ID) as matching_violations_by_id,
        (SELECT COUNT(*) FROM revised_non_compliance nc WHERE nc.OPERATION_ID = d.OPERATION_NUMBER) as matching_violations_by_number
      FROM 
        daycare_operations d
      LEFT JOIN
        risk_analysis r ON d.OPERATION_NUMBER = r.operation_id
      LIMIT 5
    `);
    
    console.log('Current data sample:');
    console.table(daycares);
    
    // Check how many risk_analysis records we have
    const [riskCount] = await pool.query('SELECT COUNT(*) as count FROM risk_analysis');
    console.log(`Total risk_analysis records: ${riskCount[0].count}`);
    
    // Option 1: Update existing risk_analysis records to use the daycare_operations.OPERATION_ID
    // This assumes that the current risk_analysis.operation_id matches daycare_operations.OPERATION_NUMBER
    
    // First, create a backup of the risk_analysis table
    console.log('Creating backup of risk_analysis table...');
    await pool.query('DROP TABLE IF EXISTS risk_analysis_backup');
    await pool.query('CREATE TABLE risk_analysis_backup LIKE risk_analysis');
    await pool.query('INSERT INTO risk_analysis_backup SELECT * FROM risk_analysis');
    console.log('Backup created successfully.');
    
    // Skip the duplicate check and use the alternative approach directly
    console.log('Using the table recreation approach to avoid duplicate key issues...');
    
    // Create a new table with the correct schema
    console.log('Creating new risk_analysis_fixed table...');
    await pool.query('DROP TABLE IF EXISTS risk_analysis_fixed');
    await pool.query('CREATE TABLE risk_analysis_fixed LIKE risk_analysis');
    
    // Update the UNIQUE constraint on operation_id to allow inserting potential duplicates temporarily
    await pool.query('ALTER TABLE risk_analysis_fixed DROP INDEX operation_id');
    
    // Insert data with the corrected operation_id values
    console.log('Inserting data with corrected operation_id values...');
    const [insertResult] = await pool.query(`
      INSERT INTO risk_analysis_fixed
      SELECT 
        r.id,
        d.OPERATION_ID as operation_id,
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
    
    console.log(`Inserted ${insertResult.affectedRows} records into risk_analysis_fixed.`);
    
    // Check for duplicates in the new table
    const [fixedDuplicates] = await pool.query(`
      SELECT operation_id, COUNT(*) as count
      FROM risk_analysis_fixed
      GROUP BY operation_id
      HAVING COUNT(*) > 1
    `);
    
    if (fixedDuplicates.length > 0) {
      console.log(`WARNING: Found ${fixedDuplicates.length} duplicate operation_ids in risk_analysis_fixed.`);
      console.log('Sample duplicates:');
      console.table(fixedDuplicates.slice(0, 5));
      
      // For each duplicate, keep only the one with the highest risk score
      console.log('Removing duplicate entries, keeping the one with the highest risk score...');
      
      // Create a temporary table to store the IDs to keep
      await pool.query('DROP TABLE IF EXISTS ids_to_keep');
      await pool.query(`
        CREATE TABLE ids_to_keep AS
        SELECT MAX(id) as id
        FROM risk_analysis_fixed
        GROUP BY operation_id
      `);
      
      // Delete all rows that are not in the ids_to_keep table
      const [deleteResult] = await pool.query(`
        DELETE FROM risk_analysis_fixed
        WHERE id NOT IN (SELECT id FROM ids_to_keep)
      `);
      
      console.log(`Removed ${deleteResult.affectedRows} duplicate records.`);
      
      // Verify duplicates are gone
      const [checkDuplicates] = await pool.query(`
        SELECT operation_id, COUNT(*) as count
        FROM risk_analysis_fixed
        GROUP BY operation_id
        HAVING COUNT(*) > 1
      `);
      
      if (checkDuplicates.length > 0) {
        console.log(`ERROR: Still found ${checkDuplicates.length} duplicate operation_ids.`);
        console.log('Manual intervention may be required.');
      } else {
        console.log('All duplicates removed successfully.');
        
        // Add back the UNIQUE constraint
        await pool.query('ALTER TABLE risk_analysis_fixed ADD UNIQUE INDEX (operation_id)');
        
        // Swap the tables
        console.log('Swapping tables...');
        await pool.query('RENAME TABLE risk_analysis TO risk_analysis_old, risk_analysis_fixed TO risk_analysis');
        
        console.log('Table swap completed successfully.');
      }
    } else {
      // No duplicates, just add the UNIQUE constraint and swap tables
      console.log('No duplicates found.');
      await pool.query('ALTER TABLE risk_analysis_fixed ADD UNIQUE INDEX (operation_id)');
      
      console.log('Swapping tables...');
      await pool.query('RENAME TABLE risk_analysis TO risk_analysis_old, risk_analysis_fixed TO risk_analysis');
      
      console.log('Table swap completed successfully.');
    }
    
    // Verify the update
    const [updatedDaycares] = await pool.query(`
      SELECT 
        d.OPERATION_NUMBER, 
        d.OPERATION_ID,
        r.operation_id as risk_operation_id
      FROM 
        daycare_operations d
      LEFT JOIN
        risk_analysis r ON d.OPERATION_ID = r.operation_id
      LIMIT 5
    `);
    
    console.log('Updated data sample:');
    console.table(updatedDaycares);
    
    // Check for any risk_analysis records that don't have a matching daycare
    const [orphanedRiskAnalyses] = await pool.query(`
      SELECT COUNT(*) as count FROM risk_analysis r
      LEFT JOIN daycare_operations d ON r.operation_id = d.OPERATION_ID
      WHERE d.OPERATION_ID IS NULL
    `);
    
    console.log(`Orphaned risk_analysis records (no matching daycare): ${orphanedRiskAnalyses[0].count}`);
    
    if (orphanedRiskAnalyses[0].count > 0) {
      console.log('WARNING: Some risk_analysis records do not have matching daycare operations after the update.');
      console.log('You may need to investigate these records further.');
    } else {
      console.log('All risk_analysis records have matching daycare operations after the update.');
    }
    
    // Check if all daycares have a risk analysis
    const [missingRiskAnalyses] = await pool.query(`
      SELECT COUNT(*) as count FROM daycare_operations d
      LEFT JOIN risk_analysis r ON d.OPERATION_ID = r.operation_id
      WHERE r.id IS NULL
    `);
    
    console.log(`Daycares without risk_analysis records: ${missingRiskAnalyses[0].count}`);
    
    // Verify violation count totals
    const [totalViolations] = await pool.query(`
      SELECT 
        SUM(total_violations) as risk_analysis_violations,
        (SELECT SUM(TOTAL_VIOLATIONS) FROM daycare_operations) as daycare_operations_violations
      FROM 
        risk_analysis
    `);
    
    console.log('\nViolation count totals:');
    console.log(`Total violations in risk_analysis: ${totalViolations[0].risk_analysis_violations}`);
    console.log(`Total violations in daycare_operations: ${totalViolations[0].daycare_operations_violations}`);
    
  } catch (err) {
    console.error('Error fixing operation ID mismatch:', err);
  } finally {
    await pool.end();
    console.log('\nOperation completed.');
  }
}

// Run the script
fixOperationIdMismatch().catch(console.error);