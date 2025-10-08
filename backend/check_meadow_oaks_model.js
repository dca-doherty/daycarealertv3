/**
 * Check what Meadow Oaks Academy's price would be with just the model, without the override
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const path = require('path');
const { calculateCost } = require('./scripts/generate_cost_estimation_v2');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

async function checkMeadowOaksModelPrice() {
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // Get Meadow Oaks raw data
    const [meadowOaks] = await pool.query(`
      SELECT 
        d.*,
        DATEDIFF(CURRENT_DATE, d.ISSUANCE_DATE) / 365 as years_in_operation,
        r.risk_score,
        r.high_risk_count,
        r.medium_high_risk_count,
        r.medium_risk_count,
        r.low_risk_count,
        r.total_violations,
        c.monthly_cost as current_monthly_cost,
        c.weekly_cost as current_weekly_cost,
        c.calculation_factors
      FROM 
        daycare_operations d
      LEFT JOIN
        risk_analysis r ON d.OPERATION_ID = r.operation_id
      LEFT JOIN
        daycare_cost_estimates c ON d.OPERATION_ID = c.operation_id
      WHERE 
        d.OPERATION_NUMBER = '1786033' 
        OR (d.OPERATION_NAME = 'Meadow Oaks Academy' AND d.CITY = 'DALLAS')
      LIMIT 1
    `);
    
    if (meadowOaks.length === 0) {
      console.log('Could not find Meadow Oaks Academy');
      return;
    }
    
    const daycare = meadowOaks[0];
    
    // Get current actual price from database
    console.log('Current Price in Database:');
    console.log(`- Monthly: $${daycare.current_monthly_cost}`);
    console.log(`- Weekly: $${daycare.current_weekly_cost}`);
    console.log(`- This is the manually overridden price to match the actual reported $425/week`);
    
    console.log('\nRe-calculating using model WITHOUT the override:');
    
    // First try with just the standard model (no Montessori premium)
    const riskData = {
      risk_score: daycare.risk_score,
      high_risk_count: daycare.high_risk_count,
      medium_high_risk_count: daycare.medium_high_risk_count,
      medium_risk_count: daycare.medium_risk_count,
      low_risk_count: daycare.low_risk_count,
      total_violations: daycare.total_violations
    };
    
    // Basic cost calculation with no special adjustments
    const basicEstimate = calculateCost(daycare, riskData, {}, {});
    console.log('\nBase model estimate (no special adjustments):');
    console.log(`- Monthly: $${basicEstimate.cost_estimate}`);
    console.log(`- Weekly: $${basicEstimate.weekly_cost}`);
    console.log(`- Difference from actual: $${Math.abs(425 - basicEstimate.weekly_cost)} per week`);
    console.log(`- Error: ${((Math.abs(425 - basicEstimate.weekly_cost) / 425) * 100).toFixed(2)}%`);
    
    // Apply the Montessori multiplier of 1.4 manually
    const montessoriMultiplier = 1.4;
    const withMontessoriEstimate = {
      cost_estimate: Math.round(basicEstimate.cost_estimate * montessoriMultiplier),
      weekly_cost: Math.round(basicEstimate.weekly_cost * montessoriMultiplier)
    };
    
    console.log('\nWith Montessori premium (40% increase):');
    console.log(`- Monthly: $${withMontessoriEstimate.cost_estimate}`);
    console.log(`- Weekly: $${withMontessoriEstimate.weekly_cost}`);
    console.log(`- Difference from actual: $${Math.abs(425 - withMontessoriEstimate.weekly_cost)} per week`);
    console.log(`- Error: ${((Math.abs(425 - withMontessoriEstimate.weekly_cost) / 425) * 100).toFixed(2)}%`);
    
    // Get other Montessori schools in Dallas for comparison
    const [dallasMontessori] = await pool.query(`
      SELECT 
        d.OPERATION_NAME,
        d.CITY,
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
        AND d.OPERATION_ID != ?
      ORDER BY 
        c.weekly_cost DESC
      LIMIT 10
    `, [daycare.OPERATION_ID]);
    
    console.log('\nOther Dallas-area Montessori Schools:');
    console.table(dallasMontessori);
    
    const avgWeekly = dallasMontessori.reduce((sum, d) => sum + parseFloat(d.weekly_cost), 0) / dallasMontessori.length;
    console.log(`\nAverage weekly cost for Dallas Montessori schools: $${avgWeekly.toFixed(2)}`);
    console.log(`Difference from Meadow Oaks actual: $${Math.abs(425 - avgWeekly).toFixed(2)}`);
    console.log(`Error: ${((Math.abs(425 - avgWeekly) / 425) * 100).toFixed(2)}%`);
    
  } catch (err) {
    console.error('Error analyzing Meadow Oaks model price:', err);
  } finally {
    await pool.end();
  }
}

// Run the analysis
checkMeadowOaksModelPrice().catch(console.error);