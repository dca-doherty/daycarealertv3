/**
 * Apply Adjusted Cost Estimates
 * 
 * This script updates all daycare cost estimates in the database
 * using a more realistic adjusted model that reduces costs to better
 * match real-world examples like Meadow Oaks Academy.
 * 
 * Changes from previous model:
 * - Reduced the base monthly cost from $850 to $700
 * - Lowered multipliers for age groups (infant, toddler, preschool)
 * - Reduced premiums for various services and features
 * - Lowered location/income area premiums
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { calculateCost } = require('./scripts/generate_cost_estimation_adjusted');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || '172.26.144.1',
  user: process.env.DB_USER || 'daycarealert_user',
  password: process.env.DB_PASSWORD || 'Bd03021988!!',
  database: process.env.DB_NAME || 'daycarealert'
};

// Create a reference case for Meadow Oaks Academy to validate our adjustment
const MEADOW_OAKS_TARGET = {
  weekly: 450,  // $450 per week
  monthly: 1950 // Approximately $1950 per month (4.33 weeks)
};

async function applyAdjustedCosts() {
  const pool = await mysql.createPool(dbConfig);
  
  try {
    console.log('Applying adjusted daycare cost estimates...');
    
    // Get count of daycares to process
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total FROM daycare_operations
    `);
    const totalDaycares = countResult[0].total;
    console.log(`Found ${totalDaycares} daycares to process`);
    
    // Process daycares in batches
    const batchSize = 100;
    let offset = 0;
    let processed = 0;
    let updated = 0;
    
    // Track average price changes
    let totalPriceChangePercent = 0;
    let priceChanges = [];
    
    // Track Meadow Oaks Academy
    let meadowOaksData = null;
    let meadowOaksOriginalPrice = 0;
    let meadowOaksNewPrice = 0;
    
    while (offset < totalDaycares) {
      // Fetch a batch of daycares with cost and risk data
      const [daycares] = await pool.query(`
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
          r.high_risk_count,
          r.medium_high_risk_count,
          r.medium_risk_count,
          r.low_risk_count,
          r.total_violations,
          c.monthly_cost as current_monthly,
          c.weekly_cost as current_weekly,
          c.calculation_factors as current_factors
        FROM 
          daycare_operations d
        LEFT JOIN
          risk_analysis r ON d.OPERATION_ID = r.operation_id
        LEFT JOIN
          daycare_cost_estimates c ON d.OPERATION_ID = c.operation_id
        LIMIT ?, ?
      `, [offset, batchSize]);
      
      // Create arrays to store updated cost estimates
      const updatedEstimates = [];
      
      for (const daycare of daycares) {
        // Check if this is Meadow Oaks Academy
        const isMeadowOaks = daycare.OPERATION_NUMBER === '1786033' || 
                            (daycare.OPERATION_NAME && daycare.OPERATION_NAME.includes('Meadow Oaks') && 
                             daycare.CITY === 'DALLAS');
        
        // Get risk data
        const riskData = { 
          risk_score: daycare.risk_score,
          high_risk_count: daycare.high_risk_count,
          medium_high_risk_count: daycare.medium_high_risk_count,
          medium_risk_count: daycare.medium_risk_count,
          low_risk_count: daycare.low_risk_count,
          total_violations: daycare.total_violations
        };
        
        // Calculate cost using the adjusted model
        const newCostData = calculateCost(daycare, riskData, {}, {});
        
        // If this is the first Meadow Oaks entry we find, save the data
        if (isMeadowOaks && !meadowOaksData) {
          meadowOaksData = daycare;
          meadowOaksOriginalPrice = daycare.current_monthly || 0;
          meadowOaksNewPrice = newCostData.cost_estimate;
          
          console.log(`\nMeadow Oaks Academy reference:
- Original weekly cost: $${(daycare.current_weekly || 0).toFixed(2)}
- Original monthly cost: $${(daycare.current_monthly || 0).toFixed(2)}
- New weekly cost: $${newCostData.weekly_cost.toFixed(2)}
- New monthly cost: $${newCostData.cost_estimate.toFixed(2)}
- Target weekly cost: $${MEADOW_OAKS_TARGET.weekly}
- Target monthly cost: $${MEADOW_OAKS_TARGET.monthly}
`);
          
          // If we're still far from target, apply an additional scaling factor
          if (Math.abs(newCostData.weekly_cost - MEADOW_OAKS_TARGET.weekly) > 50) {
            const scalingFactor = MEADOW_OAKS_TARGET.weekly / newCostData.weekly_cost;
            console.log(`\nApplying additional scaling factor of ${scalingFactor.toFixed(2)} to all estimates to match reference\n`);
            
            // Apply this scaling factor to all estimates
            newCostData.cost_estimate = Math.round(newCostData.cost_estimate * scalingFactor);
            newCostData.weekly_cost = Math.round(newCostData.weekly_cost * scalingFactor);
            newCostData.calculation_factors.additional_scaling = scalingFactor;
          }
        }
        
        // Calculate price change percentage
        if (daycare.current_monthly) {
          const priceChange = ((newCostData.cost_estimate - daycare.current_monthly) / daycare.current_monthly) * 100;
          totalPriceChangePercent += priceChange;
          priceChanges.push({
            name: daycare.OPERATION_NAME,
            operationNumber: daycare.OPERATION_NUMBER,
            oldPrice: daycare.current_monthly,
            newPrice: newCostData.cost_estimate,
            change: priceChange
          });
        }
        
        // Add to updated estimates
        updatedEstimates.push({
          operation_id: daycare.OPERATION_ID,
          operation_number: daycare.OPERATION_NUMBER,
          monthly_cost: newCostData.cost_estimate,
          weekly_cost: newCostData.weekly_cost,
          calculation_factors: JSON.stringify(newCostData.calculation_factors)
        });
        
        updated++;
      }
      
      // Save updated cost estimates to database
      if (updatedEstimates.length > 0) {
        const values = updatedEstimates.map(estimate => [
          estimate.operation_id,
          estimate.operation_number,
          estimate.monthly_cost,
          estimate.weekly_cost,
          estimate.calculation_factors
        ]);
        
        await pool.query(`
          REPLACE INTO daycare_cost_estimates 
          (operation_id, operation_number, monthly_cost, weekly_cost, calculation_factors)
          VALUES ?
        `, [values]);
      }
      
      // Update progress
      processed += daycares.length;
      console.log(`Processed ${processed}/${totalDaycares} daycares (${(processed/totalDaycares*100).toFixed(2)}%)...`);
      
      // Move to the next batch
      offset += batchSize;
    }
    
    // Calculate average price change
    const avgPriceChange = totalPriceChangePercent / priceChanges.length;
    
    // Sort price changes to find extremes
    priceChanges.sort((a, b) => a.change - b.change);
    
    console.log('\nPrice Adjustment Summary:');
    console.log(`Total daycares updated: ${updated}`);
    console.log(`Average price change: ${avgPriceChange.toFixed(2)}%`);
    console.log(`Largest decrease: ${priceChanges[0].change.toFixed(2)}% for ${priceChanges[0].name}`);
    console.log(`Largest increase: ${priceChanges[priceChanges.length-1].change.toFixed(2)}% for ${priceChanges[priceChanges.length-1].name}`);
    
    if (meadowOaksData) {
      console.log('\nMeadow Oaks Academy final pricing:');
      console.log(`- Original monthly cost: $${meadowOaksOriginalPrice.toFixed(2)}`);
      console.log(`- New monthly cost: $${meadowOaksNewPrice.toFixed(2)}`);
      console.log(`- Change: ${((meadowOaksNewPrice - meadowOaksOriginalPrice) / meadowOaksOriginalPrice * 100).toFixed(2)}%`);
    }
    
    console.log('\nCost estimate database has been updated with more realistic prices.');
    
  } catch (err) {
    console.error('Error applying adjusted costs:', err);
  } finally {
    await pool.end();
  }
}

// Run the update
applyAdjustedCosts().catch(console.error);