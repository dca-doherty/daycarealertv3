/**
 * Moderate Cost Adjustment Script
 * 
 * This script makes a more moderate adjustment to daycare cost estimates
 * to better reflect real-world prices without going too high.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || '172.26.144.1',
  user: process.env.DB_USER || 'daycarealert_user',
  password: process.env.DB_PASSWORD || 'Bd03021988!!',
  database: process.env.DB_NAME || 'daycarealert'
};

// A more moderate multiplier - increases prices but not as dramatically
const MODERATE_MULTIPLIER = 1.2; // 20% increase

async function adjustCosts() {
  const pool = await mysql.createPool(dbConfig);
  
  try {
    console.log('\nApplying moderate cost adjustment to make estimates more accurate...');
    
    // Get stats on current costs
    const [beforeStats] = await pool.query(`
      SELECT 
        MIN(monthly_cost) as min_cost,
        MAX(monthly_cost) as max_cost,
        AVG(monthly_cost) as avg_cost,
        COUNT(*) as count
      FROM daycare_cost_estimates
    `);
    
    console.log('\nBefore adjustment:');
    console.log(`- Total estimates: ${beforeStats[0].count}`);
    console.log(`- Minimum monthly cost: $${beforeStats[0].min_cost}`);
    console.log(`- Maximum monthly cost: $${beforeStats[0].max_cost}`);
    console.log(`- Average monthly cost: $${Math.round(beforeStats[0].avg_cost)}`);
    
    // Get Meadow Oaks for reference
    const [meadowBefore] = await pool.query(`
      SELECT c.monthly_cost, c.weekly_cost
      FROM daycare_operations d
      JOIN daycare_cost_estimates c ON d.OPERATION_ID = c.operation_id
      WHERE (d.OPERATION_NUMBER = '1786033' OR d.OPERATION_NAME LIKE '%Meadow Oaks%') AND d.CITY = 'DALLAS'
      LIMIT 1
    `);
    
    if (meadowBefore.length > 0) {
      console.log(`- Meadow Oaks Academy: $${meadowBefore[0].monthly_cost}/month ($${meadowBefore[0].weekly_cost}/week)`);
    }
    
    // Apply a moderate adjustment to all costs
    const [updateResult] = await pool.query(`
      UPDATE daycare_cost_estimates
      SET 
        monthly_cost = ROUND(monthly_cost * ?),
        weekly_cost = ROUND(weekly_cost * ?)
    `, [MODERATE_MULTIPLIER, MODERATE_MULTIPLIER]);
    
    console.log(`\nUpdated ${updateResult.affectedRows} cost estimates with a ${MODERATE_MULTIPLIER}x multiplier`);
    
    // Get stats after the change
    const [afterStats] = await pool.query(`
      SELECT 
        MIN(monthly_cost) as min_cost,
        MAX(monthly_cost) as max_cost,
        AVG(monthly_cost) as avg_cost,
        COUNT(*) as count
      FROM daycare_cost_estimates
    `);
    
    console.log('\nAfter adjustment:');
    console.log(`- Minimum monthly cost: $${afterStats[0].min_cost}`);
    console.log(`- Maximum monthly cost: $${afterStats[0].max_cost}`);
    console.log(`- Average monthly cost: $${Math.round(afterStats[0].avg_cost)}`);
    
    // Get Meadow Oaks again for comparison
    const [meadowAfter] = await pool.query(`
      SELECT c.monthly_cost, c.weekly_cost
      FROM daycare_operations d
      JOIN daycare_cost_estimates c ON d.OPERATION_ID = c.operation_id
      WHERE (d.OPERATION_NUMBER = '1786033' OR d.OPERATION_NAME LIKE '%Meadow Oaks%') AND d.CITY = 'DALLAS'
      LIMIT 1
    `);
    
    if (meadowAfter.length > 0) {
      console.log(`- Meadow Oaks Academy: $${meadowAfter[0].monthly_cost}/month ($${meadowAfter[0].weekly_cost}/week)`);
    }
    
    // Get some sample daycares after adjustment
    const [samples] = await pool.query(`
      SELECT d.OPERATION_NAME, d.OPERATION_TYPE, c.monthly_cost, c.weekly_cost
      FROM daycare_operations d
      JOIN daycare_cost_estimates c ON d.OPERATION_ID = c.operation_id
      ORDER BY RAND()
      LIMIT 5
    `);
    
    console.log('\nRandom Sample Daycares After Adjustment:');
    samples.forEach((s, i) => {
      console.log(`${i+1}. ${s.OPERATION_NAME} (${s.OPERATION_TYPE}): $${s.monthly_cost}/month ($${s.weekly_cost}/week)`);
    });
    
    console.log('\nCost adjustment completed successfully!');
    
  } catch (err) {
    console.error('Error adjusting costs:', err);
  } finally {
    await pool.end();
  }
}

// Run the adjustment
console.log('DaycareAlert - Moderate Cost Adjustment Script');
adjustCosts().catch(console.error);