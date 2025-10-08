/**
 * Check Adverse Actions Script
 * 
 * This script checks the adverse_actions_count in the risk_analysis table
 * and compares it with the ADVERSE_ACTION field in daycare_operations.
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

async function checkAdverseActions() {
  console.log('Checking adverse actions data...');
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // Count total daycares with adverse actions in daycare_operations
    const [daycareRows] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM daycare_operations 
      WHERE ADVERSE_ACTION = 'Y'
    `);
    
    const adverseActionsInDaycareOps = daycareRows[0].count;
    
    // Count total risk analyses with adverse_actions_count > 0
    const [riskRows] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM risk_analysis 
      WHERE adverse_actions_count > 0
    `);
    
    const adverseActionsInRiskAnalysis = riskRows[0].count;
    
    console.log('=== Adverse Actions Analysis ===');
    console.log(`Daycares with adverse actions in daycare_operations: ${adverseActionsInDaycareOps}`);
    console.log(`Risk analyses with adverse_actions_count > 0: ${adverseActionsInRiskAnalysis}`);
    
    // Check for mismatches
    const [mismatchRows] = await pool.query(`
      SELECT COUNT(*) as count
      FROM daycare_operations d
      JOIN risk_analysis r ON d.OPERATION_NUMBER = r.operation_id
      WHERE 
        (d.ADVERSE_ACTION = 'Y' AND r.adverse_actions_count = 0)
        OR
        (d.ADVERSE_ACTION != 'Y' AND r.adverse_actions_count > 0)
    `);
    
    const mismatchCount = mismatchRows[0].count;
    console.log(`Mismatches between daycare_operations and risk_analysis: ${mismatchCount}`);
    
    // List daycares with adverse actions
    if (adverseActionsInDaycareOps > 0) {
      const [sampleRows] = await pool.query(`
        SELECT 
          d.OPERATION_NUMBER, 
          d.OPERATION_NAME, 
          d.OPERATION_TYPE,
          d.CITY,
          d.ADVERSE_ACTION,
          r.adverse_actions_count,
          r.risk_score
        FROM 
          daycare_operations d
        JOIN
          risk_analysis r ON d.OPERATION_NUMBER = r.operation_id
        WHERE 
          d.ADVERSE_ACTION = 'Y'
        ORDER BY r.risk_score DESC
        LIMIT 10
      `);
      
      console.log('\n=== Sample of Daycares with Adverse Actions ===');
      console.table(sampleRows);
    }
    
    // List mismatches if any
    if (mismatchCount > 0) {
      const [mismatchSampleRows] = await pool.query(`
        SELECT 
          d.OPERATION_NUMBER, 
          d.OPERATION_NAME,
          d.ADVERSE_ACTION,
          r.adverse_actions_count
        FROM 
          daycare_operations d
        JOIN
          risk_analysis r ON d.OPERATION_NUMBER = r.operation_id
        WHERE 
          (d.ADVERSE_ACTION = 'Y' AND r.adverse_actions_count = 0)
          OR
          (d.ADVERSE_ACTION != 'Y' AND r.adverse_actions_count > 0)
        LIMIT 10
      `);
      
      console.log('\n=== Sample of Mismatches ===');
      console.table(mismatchSampleRows);
      
      // Fix mismatches if needed
      const shouldFix = process.argv.includes('--fix');
      if (shouldFix) {
        console.log('\nFixing mismatches...');
        
        // Update adverse_actions_count based on daycare_operations.ADVERSE_ACTION
        await pool.query(`
          UPDATE risk_analysis r
          JOIN daycare_operations d ON r.operation_id = d.OPERATION_NUMBER
          SET r.adverse_actions_count = CASE WHEN d.ADVERSE_ACTION = 'Y' THEN 1 ELSE 0 END
          WHERE 
            (d.ADVERSE_ACTION = 'Y' AND r.adverse_actions_count = 0)
            OR
            (d.ADVERSE_ACTION != 'Y' AND r.adverse_actions_count > 0)
        `);
        
        console.log('Mismatches fixed successfully!');
        
        // Verify the fix
        const [verifyRows] = await pool.query(`
          SELECT COUNT(*) as count
          FROM daycare_operations d
          JOIN risk_analysis r ON d.OPERATION_NUMBER = r.operation_id
          WHERE 
            (d.ADVERSE_ACTION = 'Y' AND r.adverse_actions_count = 0)
            OR
            (d.ADVERSE_ACTION != 'Y' AND r.adverse_actions_count > 0)
        `);
        
        console.log(`Remaining mismatches after fix: ${verifyRows[0].count}`);
      } else {
        console.log('\nTo fix these mismatches, run: node scripts/check_adverse_actions.js --fix');
      }
    }
    
  } catch (err) {
    console.error('Error checking adverse actions:', err);
  } finally {
    await pool.end();
    console.log('\nAdverse actions check completed.');
  }
}

// Run the script
checkAdverseActions().catch(console.error);