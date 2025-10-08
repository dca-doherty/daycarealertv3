/**
 * Fix Montessori Cost Estimates
 * 
 * This script specifically adjusts the cost estimates for Montessori schools
 * to better align with market rates, especially for Meadow Oaks Academy.
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

async function fixMontesorriEstimates() {
  const pool = await mysql.createPool(dbConfig);
  
  try {
    console.log('Fixing Montessori school cost estimates...');
    
    // 1. Add a premium multiplier for Montessori schools based on market data
    const montessoriMultiplier = 1.4; // 40% premium
    
    // Find all Montessori schools
    const [montessoriSchools] = await pool.query(`
      SELECT 
        d.OPERATION_ID,
        d.OPERATION_NUMBER,
        d.OPERATION_NAME,
        d.OPERATION_TYPE,
        d.CITY,
        d.COUNTY,
        c.monthly_cost,
        c.weekly_cost,
        c.calculation_factors
      FROM 
        daycare_operations d
      JOIN 
        daycare_cost_estimates c ON d.OPERATION_ID = c.operation_id
      WHERE 
        d.OPERATION_TYPE LIKE '%Montessori%' 
        OR d.OPERATION_NAME LIKE '%Montessori%'
        OR d.PROGRAMMATIC_SERVICES LIKE '%montessori%'
    `);
    
    console.log(`Found ${montessoriSchools.length} Montessori schools to adjust`);
    
    // Update each Montessori school with the premium multiplier
    for (const school of montessoriSchools) {
      // Parse calculation factors
      let factors = {};
      try {
        factors = JSON.parse(school.calculation_factors);
      } catch (e) {
        console.warn(`Could not parse calculation factors for ${school.OPERATION_NAME}`);
        continue;
      }
      
      // Apply Montessori premium
      const newMonthly = Math.round(parseFloat(school.monthly_cost) * montessoriMultiplier);
      const newWeekly = Math.round(newMonthly / 4.33);
      
      // Update factors
      factors.montessori_premium = montessoriMultiplier;
      
      // Update in database
      await pool.query(`
        UPDATE daycare_cost_estimates
        SET 
          monthly_cost = ?,
          weekly_cost = ?,
          calculation_factors = ?
        WHERE operation_id = ?
      `, [newMonthly, newWeekly, JSON.stringify(factors), school.OPERATION_ID]);
    }
    
    console.log('Successfully updated all Montessori schools with premium pricing');
    
    // 2. Special fix for Meadow Oaks Academy
    const meadowOaksWeekly = 425; // $425/week as reported
    const meadowOaksMonthly = meadowOaksWeekly * 4.33; // Convert to monthly
    
    const [meadowOaksResults] = await pool.query(`
      UPDATE daycare_cost_estimates c
      JOIN daycare_operations d ON c.operation_id = d.OPERATION_ID
      SET 
        c.monthly_cost = ?,
        c.weekly_cost = ?,
        c.calculation_factors = JSON_SET(
          c.calculation_factors, 
          '$.manual_override', true,
          '$.override_reason', 'Adjusted to match actual reported price'
        )
      WHERE 
        d.OPERATION_NUMBER = '1786033' 
        OR (d.OPERATION_NAME = 'Meadow Oaks Academy' AND d.CITY = 'DALLAS')
    `, [meadowOaksMonthly, meadowOaksWeekly]);
    
    console.log(`Fixed Meadow Oaks Academy (Dallas) with actual rate of $${meadowOaksWeekly}/week`);
    
    // Verify our fixes
    const [fixedSchools] = await pool.query(`
      SELECT 
        d.OPERATION_NAME,
        d.CITY,
        d.COUNTY,
        c.monthly_cost,
        c.weekly_cost
      FROM 
        daycare_operations d
      JOIN 
        daycare_cost_estimates c ON d.OPERATION_ID = c.operation_id
      WHERE 
        (d.OPERATION_TYPE LIKE '%Montessori%' 
         OR d.OPERATION_NAME LIKE '%Montessori%'
         OR d.PROGRAMMATIC_SERVICES LIKE '%montessori%')
        AND d.COUNTY = 'DALLAS'
      ORDER BY 
        c.weekly_cost DESC
      LIMIT 10
    `);
    
    console.log('\nUpdated Montessori School Prices:');
    console.table(fixedSchools);
    
  } catch (err) {
    console.error('Error fixing Montessori estimates:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
fixMontesorriEstimates().catch(console.error);