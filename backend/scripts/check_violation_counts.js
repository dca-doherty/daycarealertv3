/**
 * Check Violation Counts Script
 * 
 * This script checks that the violation counts in the risk_analysis table
 * match the values in the daycare_operations table.
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

async function checkViolationCounts() {
  console.log('Checking violation counts...');
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // Count daycares with violations in daycare_operations
    const [daycareRows] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM daycare_operations 
      WHERE TOTAL_VIOLATIONS > 0
    `);
    
    const daycareWithViolations = daycareRows[0].count;
    
    // Count risk analyses with total_violations > 0
    const [riskRows] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM risk_analysis 
      WHERE total_violations > 0
    `);
    
    const riskWithViolations = riskRows[0].count;
    
    console.log('=== Violation Counts Analysis ===');
    console.log(`Daycares with violations in daycare_operations: ${daycareWithViolations}`);
    console.log(`Risk analyses with total_violations > 0: ${riskWithViolations}`);
    
    // Get total violation numbers by type
    const [daycareTotals] = await pool.query(`
      SELECT 
        SUM(TOTAL_VIOLATIONS) as total_violations,
        SUM(HIGH_RISK_VIOLATIONS) as high_risk,
        SUM(MEDIUM_HIGH_RISK_VIOLATIONS) as medium_high_risk,
        SUM(MEDIUM_RISK_VIOLATIONS) as medium_risk,
        SUM(LOW_RISK_VIOLATIONS) as low_risk
      FROM daycare_operations
    `);
    
    const [riskTotals] = await pool.query(`
      SELECT 
        SUM(total_violations) as total_violations,
        SUM(high_risk_count) as high_risk,
        SUM(medium_high_risk_count) as medium_high_risk,
        SUM(medium_risk_count) as medium_risk,
        SUM(low_risk_count) as low_risk
      FROM risk_analysis
    `);
    
    console.log('\n=== Total Violation Counts ===');
    console.log('From daycare_operations table:');
    console.table(daycareTotals);
    console.log('From risk_analysis table:');
    console.table(riskTotals);
    
    // Check for mismatches
    const [mismatchRows] = await pool.query(`
      SELECT COUNT(*) as count
      FROM daycare_operations d
      JOIN risk_analysis r ON d.OPERATION_NUMBER = r.operation_id
      WHERE 
        d.TOTAL_VIOLATIONS != r.total_violations OR
        d.HIGH_RISK_VIOLATIONS != r.high_risk_count OR
        d.MEDIUM_HIGH_RISK_VIOLATIONS != r.medium_high_risk_count OR
        d.MEDIUM_RISK_VIOLATIONS != r.medium_risk_count OR
        d.LOW_RISK_VIOLATIONS != r.low_risk_count
    `);
    
    const mismatchCount = mismatchRows[0].count;
    console.log(`\nMismatches between daycare_operations and risk_analysis: ${mismatchCount}`);
    
    if (mismatchCount > 0) {
      // Get a sample of mismatches
      const [sampleRows] = await pool.query(`
        SELECT 
          d.OPERATION_NUMBER, 
          d.OPERATION_NAME,
          d.TOTAL_VIOLATIONS as daycare_total,
          r.total_violations as risk_total,
          d.HIGH_RISK_VIOLATIONS as daycare_high,
          r.high_risk_count as risk_high,
          d.MEDIUM_HIGH_RISK_VIOLATIONS as daycare_med_high,
          r.medium_high_risk_count as risk_med_high,
          d.MEDIUM_RISK_VIOLATIONS as daycare_med,
          r.medium_risk_count as risk_med,
          d.LOW_RISK_VIOLATIONS as daycare_low,
          r.low_risk_count as risk_low
        FROM 
          daycare_operations d
        JOIN
          risk_analysis r ON d.OPERATION_NUMBER = r.operation_id
        WHERE 
          d.TOTAL_VIOLATIONS != r.total_violations OR
          d.HIGH_RISK_VIOLATIONS != r.high_risk_count OR
          d.MEDIUM_HIGH_RISK_VIOLATIONS != r.medium_high_risk_count OR
          d.MEDIUM_RISK_VIOLATIONS != r.medium_risk_count OR
          d.LOW_RISK_VIOLATIONS != r.low_risk_count
        LIMIT 10
      `);
      
      console.log('\n=== Sample of Mismatches ===');
      console.table(sampleRows);
      
      // Fix mismatches if requested
      const shouldFix = process.argv.includes('--fix');
      if (shouldFix) {
        console.log('\nFixing violation count mismatches...');
        
        // Update risk_analysis based on daycare_operations
        await pool.query(`
          UPDATE risk_analysis r
          JOIN daycare_operations d ON r.operation_id = d.OPERATION_NUMBER
          SET 
            r.total_violations = d.TOTAL_VIOLATIONS,
            r.high_risk_count = d.HIGH_RISK_VIOLATIONS,
            r.medium_high_risk_count = d.MEDIUM_HIGH_RISK_VIOLATIONS,
            r.medium_risk_count = d.MEDIUM_RISK_VIOLATIONS,
            r.low_risk_count = d.LOW_RISK_VIOLATIONS
          WHERE 
            d.TOTAL_VIOLATIONS != r.total_violations OR
            d.HIGH_RISK_VIOLATIONS != r.high_risk_count OR
            d.MEDIUM_HIGH_RISK_VIOLATIONS != r.medium_high_risk_count OR
            d.MEDIUM_RISK_VIOLATIONS != r.medium_risk_count OR
            d.LOW_RISK_VIOLATIONS != r.low_risk_count
        `);
        
        console.log('Mismatches fixed successfully!');
        
        // Verify the fix
        const [verifyRows] = await pool.query(`
          SELECT COUNT(*) as count
          FROM daycare_operations d
          JOIN risk_analysis r ON d.OPERATION_NUMBER = r.operation_id
          WHERE 
            d.TOTAL_VIOLATIONS != r.total_violations OR
            d.HIGH_RISK_VIOLATIONS != r.high_risk_count OR
            d.MEDIUM_HIGH_RISK_VIOLATIONS != r.medium_high_risk_count OR
            d.MEDIUM_RISK_VIOLATIONS != r.medium_risk_count OR
            d.LOW_RISK_VIOLATIONS != r.low_risk_count
        `);
        
        console.log(`Remaining mismatches after fix: ${verifyRows[0].count}`);
      } else {
        console.log('\nTo fix these mismatches, run: node scripts/check_violation_counts.js --fix');
      }
    }
    
  } catch (err) {
    console.error('Error checking violation counts:', err);
  } finally {
    await pool.end();
    console.log('\nViolation counts check completed.');
  }
}

// Run the script
checkViolationCounts().catch(console.error);