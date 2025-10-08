/**
 * Check updated cost estimates
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkResults() {
  // Database configuration
  const dbConfig = {
    host: process.env.DB_HOST || '172.26.144.1',
    user: process.env.DB_USER || 'daycarealert_user',
    password: process.env.DB_PASSWORD || 'Bd03021988!!',
    database: process.env.DB_NAME || 'daycarealert'
  };

  const pool = await mysql.createPool(dbConfig);

  try {
    // Check Meadow Oaks Academy record
    console.log('Checking Meadow Oaks Academy:');
    const [meadowOaks] = await pool.query(`
      SELECT 
        d.OPERATION_NAME, 
        d.OPERATION_NUMBER,
        c.monthly_cost, 
        c.weekly_cost, 
        c.calculation_factors
      FROM 
        daycare_cost_estimates c
      JOIN 
        daycare_operations d ON c.operation_id = d.OPERATION_ID  
      WHERE 
        d.OPERATION_NUMBER = '1786033' 
        OR (d.OPERATION_NAME LIKE '%Meadow Oaks%' AND d.CITY = 'DALLAS')
      LIMIT 1
    `);
    
    if (meadowOaks.length > 0) {
      console.log(`Name: ${meadowOaks[0].OPERATION_NAME}`);
      console.log(`Monthly Cost: $${meadowOaks[0].monthly_cost}`);
      console.log(`Weekly Cost: $${meadowOaks[0].weekly_cost}`);
      
      try {
        let factors;
        if (typeof meadowOaks[0].calculation_factors === 'string') {
          factors = JSON.parse(meadowOaks[0].calculation_factors);
        } else {
          factors = meadowOaks[0].calculation_factors;
        }
        console.log('Manual override:', factors.manual_override ? 'Yes' : 'No');
        if (factors.override_reason) {
          console.log('Override reason:', factors.override_reason);
        }
      } catch (e) {
        console.log('Error parsing calculation factors:', e.message);
      }
    } else {
      console.log('Meadow Oaks Academy not found');
    }
    
    // Get random sample of premium daycares
    console.log('\nSample of Montessori daycares:');
    const [montessori] = await pool.query(`
      SELECT 
        d.OPERATION_NAME, 
        d.CITY,
        c.monthly_cost, 
        c.weekly_cost
      FROM 
        daycare_cost_estimates c
      JOIN 
        daycare_operations d ON c.operation_id = d.OPERATION_ID  
      WHERE 
        (d.OPERATION_TYPE LIKE '%Montessori%' OR d.OPERATION_NAME LIKE '%Montessori%')
      ORDER BY c.weekly_cost DESC
      LIMIT 5
    `);
    
    console.log(montessori);
    
    // Check distribution of prices
    console.log('\nPrice Distribution Statistics:');
    const [stats] = await pool.query(`
      SELECT
        MIN(weekly_cost) as min_weekly,
        MAX(weekly_cost) as max_weekly,
        AVG(weekly_cost) as avg_weekly,
        MIN(monthly_cost) as min_monthly,
        MAX(monthly_cost) as max_monthly,
        AVG(monthly_cost) as avg_monthly
      FROM daycare_cost_estimates
    `);
    
    if (stats.length > 0) {
      console.log(`Weekly Cost Range: $${stats[0].min_weekly} - $${stats[0].max_weekly}`);
      console.log(`Average Weekly Cost: $${Number(stats[0].avg_weekly).toFixed(2)}`);
      console.log(`Monthly Cost Range: $${stats[0].min_monthly} - $${stats[0].max_monthly}`);
      console.log(`Average Monthly Cost: $${Number(stats[0].avg_monthly).toFixed(2)}`);
    }
    
    // Check daycares with premium prices
    console.log('\nTop 10 Most Expensive Daycares:');
    const [premium] = await pool.query(`
      SELECT 
        d.OPERATION_NAME, 
        d.CITY,
        d.COUNTY,
        d.OPERATION_TYPE,
        c.monthly_cost, 
        c.weekly_cost
      FROM 
        daycare_cost_estimates c
      JOIN 
        daycare_operations d ON c.operation_id = d.OPERATION_ID  
      ORDER BY c.weekly_cost DESC
      LIMIT 10
    `);
    
    console.log(premium);
  } catch (err) {
    console.error('Error checking results:', err);
  } finally {
    await pool.end();
  }
}

// Run the check
checkResults().catch(console.error);