/**
 * Check Meadow Oaks Academy details and calculate cost estimate
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

async function checkMeadowOaks() {
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // Get Meadow Oaks data
    const [meadowOaks] = await pool.query(`
      SELECT 
        d.OPERATION_ID,
        d.OPERATION_NUMBER,
        d.OPERATION_NAME,
        d.OPERATION_TYPE,
        d.CITY,
        d.COUNTY,
        d.ZIP,
        d.LICENSED_TO_SERVE_AGES,
        d.PROGRAMMATIC_SERVICES,
        d.TOTAL_CAPACITY,
        d.HOURS_OF_OPERATION,
        d.DAYS_OF_OPERATION,
        d.ISSUANCE_DATE,
        DATEDIFF(CURRENT_DATE, d.ISSUANCE_DATE) / 365 as years_in_operation,
        r.risk_score,
        c.monthly_cost,
        c.weekly_cost,
        c.calculation_factors
      FROM 
        daycare_operations d
      LEFT JOIN
        risk_analysis r ON d.OPERATION_ID = r.operation_id
      LEFT JOIN
        daycare_cost_estimates c ON d.OPERATION_ID = c.operation_id
      WHERE 
        d.OPERATION_NUMBER = '1460830' 
        OR d.OPERATION_NAME LIKE '%Meadow Oaks%'
    `);
    
    console.log('Meadow Oaks Academy Data:');
    console.table(meadowOaks);
    
    // Find similar daycares (Montessori in Dallas area, with toddlers)
    const [similarDaycares] = await pool.query(`
      SELECT 
        d.OPERATION_NAME,
        d.OPERATION_TYPE,
        d.CITY,
        d.COUNTY,
        d.LICENSED_TO_SERVE_AGES,
        SUBSTRING(d.PROGRAMMATIC_SERVICES, 1, 30) as PROGRAM_PREVIEW,
        d.TOTAL_CAPACITY,
        c.monthly_cost,
        c.weekly_cost
      FROM 
        daycare_operations d
      JOIN 
        daycare_cost_estimates c ON d.OPERATION_ID = c.operation_id
      WHERE 
        (d.CITY = 'DALLAS' OR d.COUNTY = 'DALLAS')
        AND (d.OPERATION_TYPE LIKE '%Montessori%' 
             OR d.OPERATION_NAME LIKE '%Montessori%'
             OR d.PROGRAMMATIC_SERVICES LIKE '%montessori%')
        AND d.LICENSED_TO_SERVE_AGES LIKE '%toddler%'
        AND d.OPERATION_NUMBER != '1460830'
      ORDER BY 
        c.weekly_cost DESC
      LIMIT 10
    `);
    
    console.log('\nSimilar Montessori Schools in Dallas Area:');
    console.table(similarDaycares);
    
    // Calculate average for similar daycares
    if (similarDaycares.length > 0) {
      const avgWeeklyCost = similarDaycares.reduce((sum, d) => sum + parseFloat(d.weekly_cost), 0) / similarDaycares.length;
      
      console.log('\nComparison with Meadow Oaks Academy:');
      console.log(`- Meadow Oaks actual weekly cost: $425/week (your son's daycare)`);
      console.log(`- Model's estimate for Meadow Oaks: $${meadowOaks[0]?.weekly_cost || 'N/A'}/week`);
      console.log(`- Average for similar daycares in county: $${avgWeeklyCost.toFixed(2)}/week`);
      console.log(`- Error vs actual price: ${Math.abs(425 - parseFloat(meadowOaks[0]?.weekly_cost || 0)).toFixed(2)} (${(Math.abs(425 - parseFloat(meadowOaks[0]?.weekly_cost || 0)) / 425 * 100).toFixed(2)}%)`);
      
      // Get Dallas Montessori schools
      const [dallasMontessori] = await pool.query(`
        SELECT 
          d.OPERATION_NAME,
          d.OPERATION_TYPE,
          d.CITY,
          d.COUNTY,
          d.LICENSED_TO_SERVE_AGES,
          d.TOTAL_CAPACITY,
          c.monthly_cost,
          c.weekly_cost
        FROM 
          daycare_operations d
        JOIN 
          daycare_cost_estimates c ON d.OPERATION_ID = c.operation_id
        WHERE 
          (d.CITY = 'DALLAS' OR d.COUNTY = 'DALLAS')
          AND (d.OPERATION_TYPE LIKE '%Montessori%' 
               OR d.OPERATION_NAME LIKE '%Montessori%'
               OR d.PROGRAMMATIC_SERVICES LIKE '%montessori%')
          AND d.LICENSED_TO_SERVE_AGES LIKE '%toddler%'
        ORDER BY 
          c.weekly_cost DESC
        LIMIT 10
      `);
      
      console.log('\nDallas Montessori Schools:');
      console.table(dallasMontessori);
      
      if (dallasMontessori.length > 0) {
        const avgDallasWeekly = dallasMontessori.reduce((sum, d) => sum + parseFloat(d.weekly_cost), 0) / dallasMontessori.length;
        console.log(`- Average weekly cost for Dallas Montessori schools: $${avgDallasWeekly.toFixed(2)}`);
      }
    }
    
  } catch (err) {
    console.error('Error checking Meadow Oaks:', err);
  } finally {
    await pool.end();
  }
}

// Run the analysis
checkMeadowOaks().catch(console.error);