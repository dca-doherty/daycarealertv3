/**
 * Check Montessori statistics
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkMontessori() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || '172.26.144.1',
    user: process.env.DB_USER || 'daycarealert_user',
    password: process.env.DB_PASSWORD || 'Bd03021988!!',
    database: process.env.DB_NAME || 'daycarealert'
  });

  try {
    // Get stats for Montessori daycares
    const [montessoriStats] = await pool.query(`
      SELECT 
        COUNT(*) as count,
        MIN(c.weekly_cost) as min_weekly,
        MAX(c.weekly_cost) as max_weekly,
        AVG(c.weekly_cost) as avg_weekly,
        MIN(c.monthly_cost) as min_monthly,
        MAX(c.monthly_cost) as max_monthly,
        AVG(c.monthly_cost) as avg_monthly
      FROM 
        daycare_cost_estimates c
      JOIN 
        daycare_operations d ON c.operation_id = d.OPERATION_ID  
      WHERE 
        (d.OPERATION_TYPE LIKE '%Montessori%' OR d.OPERATION_NAME LIKE '%Montessori%')
    `);
    
    console.log('Montessori Schools Summary:');
    console.log(`Total Montessori schools: ${montessoriStats[0].count}`);
    console.log(`Weekly Cost Range: $${montessoriStats[0].min_weekly} - $${montessoriStats[0].max_weekly}`);
    console.log(`Average Weekly Cost: $${Number(montessoriStats[0].avg_weekly).toFixed(2)}`);
    console.log(`Monthly Cost Range: $${montessoriStats[0].min_monthly} - $${montessoriStats[0].max_monthly}`);
    console.log(`Average Monthly Cost: $${Number(montessoriStats[0].avg_monthly).toFixed(2)}`);
    
    // Compare to regular daycares
    const [regularStats] = await pool.query(`
      SELECT 
        COUNT(*) as count,
        AVG(c.weekly_cost) as avg_weekly,
        AVG(c.monthly_cost) as avg_monthly
      FROM 
        daycare_cost_estimates c
      JOIN 
        daycare_operations d ON c.operation_id = d.OPERATION_ID  
      WHERE 
        (d.OPERATION_TYPE NOT LIKE '%Montessori%' AND d.OPERATION_NAME NOT LIKE '%Montessori%')
    `);
    
    console.log('\nRegular Daycares (Non-Montessori):');
    console.log(`Total regular daycares: ${regularStats[0].count}`);
    console.log(`Average Weekly Cost: $${Number(regularStats[0].avg_weekly).toFixed(2)}`);
    console.log(`Average Monthly Cost: $${Number(regularStats[0].avg_monthly).toFixed(2)}`);
    
    // Calculate premium percentage
    const montessoriAvg = Number(montessoriStats[0].avg_monthly);
    const regularAvg = Number(regularStats[0].avg_monthly);
    const premiumPercentage = ((montessoriAvg - regularAvg) / regularAvg) * 100;
    
    console.log(`\nMontessori Premium: ${premiumPercentage.toFixed(2)}%`);
    
    // Get Montessori schools in Dallas area
    const [dallasMontessori] = await pool.query(`
      SELECT 
        COUNT(*) as count,
        AVG(c.weekly_cost) as avg_weekly,
        AVG(c.monthly_cost) as avg_monthly
      FROM 
        daycare_cost_estimates c
      JOIN 
        daycare_operations d ON c.operation_id = d.OPERATION_ID  
      WHERE 
        (d.OPERATION_TYPE LIKE '%Montessori%' OR d.OPERATION_NAME LIKE '%Montessori%')
        AND (d.COUNTY = 'DALLAS' OR d.CITY = 'DALLAS')
    `);
    
    console.log('\nDallas Montessori Schools:');
    console.log(`Total Dallas Montessori schools: ${dallasMontessori[0].count}`);
    console.log(`Average Weekly Cost: $${Number(dallasMontessori[0].avg_weekly).toFixed(2)}`);
    console.log(`Average Monthly Cost: $${Number(dallasMontessori[0].avg_monthly).toFixed(2)}`);
    
    // Compare to Meadow Oaks
    const [meadowOaks] = await pool.query(`
      SELECT 
        c.weekly_cost,
        c.monthly_cost
      FROM 
        daycare_cost_estimates c
      JOIN 
        daycare_operations d ON c.operation_id = d.OPERATION_ID  
      WHERE 
        d.OPERATION_NUMBER = '1786033'
    `);
    
    if (meadowOaks.length > 0) {
      console.log('\nMeadow Oaks Academy Comparison:');
      console.log(`Meadow Oaks weekly cost: $${meadowOaks[0].weekly_cost}`);
      console.log(`Dallas Montessori average: $${Number(dallasMontessori[0].avg_weekly).toFixed(2)}`);
      console.log(`Difference: $${(Number(meadowOaks[0].weekly_cost) - Number(dallasMontessori[0].avg_weekly)).toFixed(2)}`);
      const percentDiff = ((Number(meadowOaks[0].weekly_cost) - Number(dallasMontessori[0].avg_weekly)) / Number(dallasMontessori[0].avg_weekly)) * 100;
      console.log(`Percentage difference: ${percentDiff.toFixed(2)}%`);
    }
  } catch (err) {
    console.error('Error checking results:', err);
  } finally {
    await pool.end();
  }
}

// Run the check
checkMontessori().catch(console.error);