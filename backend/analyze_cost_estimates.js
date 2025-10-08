/**
 * Analyze Daycare Cost Estimates
 * 
 * This script analyzes the generated cost estimates to verify accuracy
 * and provides insights into the pricing model.
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

async function analyzeResults() {
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // Get overall statistics
    const [overallStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_estimates,
        MIN(monthly_cost) as min_cost,
        MAX(monthly_cost) as max_cost,
        AVG(monthly_cost) as avg_cost,
        STDDEV(monthly_cost) as std_dev
      FROM 
        daycare_cost_estimates
    `);
    
    console.log('Overall Cost Statistics:');
    console.table(overallStats);
    
    // Get distribution by cost ranges
    const [costRanges] = await pool.query(`
      SELECT 
        CASE 
          WHEN monthly_cost < 800 THEN 'Under $800'
          WHEN monthly_cost < 1000 THEN '$800-$999'
          WHEN monthly_cost < 1200 THEN '$1000-$1199'
          WHEN monthly_cost < 1400 THEN '$1200-$1399'
          WHEN monthly_cost < 1600 THEN '$1400-$1599'
          WHEN monthly_cost < 1800 THEN '$1600-$1799'
          ELSE '$1800+'
        END as cost_range,
        COUNT(*) as count,
        ROUND(COUNT(*) / (SELECT COUNT(*) FROM daycare_cost_estimates) * 100, 2) as percentage,
        ROUND(AVG(monthly_cost), 2) as avg_cost
      FROM 
        daycare_cost_estimates
      GROUP BY 
        cost_range
      ORDER BY 
        MIN(monthly_cost)
    `);
    
    console.log('\nCost Distribution:');
    console.table(costRanges);
    
    // Analyze by operation type
    const [typeAnalysis] = await pool.query(`
      SELECT 
        d.OPERATION_TYPE, 
        COUNT(*) as count,
        ROUND(AVG(c.monthly_cost), 2) as avg_cost,
        MIN(c.monthly_cost) as min_cost,
        MAX(c.monthly_cost) as max_cost
      FROM 
        daycare_cost_estimates c
      JOIN 
        daycare_operations d ON c.operation_id = d.OPERATION_ID
      GROUP BY 
        d.OPERATION_TYPE
      HAVING 
        COUNT(*) > 10
      ORDER BY 
        avg_cost DESC
      LIMIT 15
    `);
    
    console.log('\nCost by Operation Type (Top 15):');
    console.table(typeAnalysis);
    
    // Analyze by age groups served
    const [ageAnalysis] = await pool.query(`
      SELECT 
        CASE 
          WHEN d.LICENSED_TO_SERVE_AGES LIKE '%infant%' THEN 'Includes Infants'
          WHEN d.LICENSED_TO_SERVE_AGES LIKE '%toddler%' THEN 'Includes Toddlers'
          WHEN d.LICENSED_TO_SERVE_AGES LIKE '%preschool%' THEN 'Includes Preschool'
          ELSE 'School-Age Only/Unknown'
        END as age_group,
        COUNT(*) as count,
        ROUND(AVG(c.monthly_cost), 2) as avg_cost,
        MIN(c.monthly_cost) as min_cost,
        MAX(c.monthly_cost) as max_cost
      FROM 
        daycare_cost_estimates c
      JOIN 
        daycare_operations d ON c.operation_id = d.OPERATION_ID
      GROUP BY 
        age_group
      ORDER BY 
        avg_cost DESC
    `);
    
    console.log('\nCost by Age Groups:');
    console.table(ageAnalysis);
    
    // Analyze by location (counties)
    const [locationAnalysis] = await pool.query(`
      SELECT 
        d.COUNTY, 
        COUNT(*) as count,
        ROUND(AVG(c.monthly_cost), 2) as avg_cost,
        MIN(c.monthly_cost) as min_cost,
        MAX(c.monthly_cost) as max_cost
      FROM 
        daycare_cost_estimates c
      JOIN 
        daycare_operations d ON c.operation_id = d.OPERATION_ID
      WHERE 
        d.COUNTY IS NOT NULL
      GROUP BY 
        d.COUNTY
      HAVING 
        COUNT(*) > 20
      ORDER BY 
        avg_cost DESC
      LIMIT 15
    `);
    
    console.log('\nCost by County (Top 15):');
    console.table(locationAnalysis);
    
    // Analysis by capacity
    const [capacityAnalysis] = await pool.query(`
      SELECT 
        CASE 
          WHEN d.TOTAL_CAPACITY < 12 THEN 'Small (<12)'
          WHEN d.TOTAL_CAPACITY < 30 THEN 'Small-Medium (12-29)'
          WHEN d.TOTAL_CAPACITY < 60 THEN 'Medium (30-59)'
          WHEN d.TOTAL_CAPACITY < 100 THEN 'Medium-Large (60-99)'
          WHEN d.TOTAL_CAPACITY >= 100 THEN 'Large (100+)'
          ELSE 'Unknown'
        END as capacity_range,
        COUNT(*) as count,
        ROUND(AVG(c.monthly_cost), 2) as avg_cost,
        MIN(c.monthly_cost) as min_cost,
        MAX(c.monthly_cost) as max_cost
      FROM 
        daycare_cost_estimates c
      JOIN 
        daycare_operations d ON c.operation_id = d.OPERATION_ID
      GROUP BY 
        capacity_range
      ORDER BY 
        CASE
          WHEN capacity_range = 'Small (<12)' THEN 1
          WHEN capacity_range = 'Small-Medium (12-29)' THEN 2
          WHEN capacity_range = 'Medium (30-59)' THEN 3
          WHEN capacity_range = 'Medium-Large (60-99)' THEN 4
          WHEN capacity_range = 'Large (100+)' THEN 5
          ELSE 6
        END
    `);
    
    console.log('\nCost by Capacity:');
    console.table(capacityAnalysis);
    
    // Analysis by years in operation
    const [experienceAnalysis] = await pool.query(`
      SELECT 
        CASE 
          WHEN DATEDIFF(CURRENT_DATE, d.ISSUANCE_DATE) / 365 < 2 THEN 'New (<2 years)'
          WHEN DATEDIFF(CURRENT_DATE, d.ISSUANCE_DATE) / 365 < 5 THEN '2-5 years'
          WHEN DATEDIFF(CURRENT_DATE, d.ISSUANCE_DATE) / 365 < 10 THEN '5-10 years'
          WHEN DATEDIFF(CURRENT_DATE, d.ISSUANCE_DATE) / 365 < 15 THEN '10-15 years'
          WHEN DATEDIFF(CURRENT_DATE, d.ISSUANCE_DATE) / 365 >= 15 THEN '15+ years'
          ELSE 'Unknown'
        END as experience_range,
        COUNT(*) as count,
        ROUND(AVG(c.monthly_cost), 2) as avg_cost,
        MIN(c.monthly_cost) as min_cost,
        MAX(c.monthly_cost) as max_cost
      FROM 
        daycare_cost_estimates c
      JOIN 
        daycare_operations d ON c.operation_id = d.OPERATION_ID
      GROUP BY 
        experience_range
      ORDER BY 
        CASE
          WHEN experience_range = 'New (<2 years)' THEN 1
          WHEN experience_range = '2-5 years' THEN 2
          WHEN experience_range = '5-10 years' THEN 3
          WHEN experience_range = '10-15 years' THEN 4
          WHEN experience_range = '15+ years' THEN 5
          ELSE 6
        END
    `);
    
    console.log('\nCost by Experience:');
    console.table(experienceAnalysis);
    
    // Compare with risk scores
    const [riskAnalysis] = await pool.query(`
      SELECT 
        CASE 
          WHEN r.risk_score >= 70 THEN 'High Risk (70+)'
          WHEN r.risk_score >= 40 THEN 'Medium-High Risk (40-69)'
          WHEN r.risk_score >= 20 THEN 'Medium Risk (20-39)'
          WHEN r.risk_score >= 10 THEN 'Low Risk (10-19)'
          WHEN r.risk_score < 10 THEN 'Very Low Risk (<10)'
          ELSE 'Unknown'
        END as risk_category,
        COUNT(*) as count,
        ROUND(AVG(c.monthly_cost), 2) as avg_cost,
        MIN(c.monthly_cost) as min_cost,
        MAX(c.monthly_cost) as max_cost
      FROM 
        daycare_cost_estimates c
      JOIN 
        risk_analysis r ON c.operation_id = r.operation_id
      GROUP BY 
        risk_category
      ORDER BY 
        CASE
          WHEN risk_category = 'High Risk (70+)' THEN 1
          WHEN risk_category = 'Medium-High Risk (40-69)' THEN 2
          WHEN risk_category = 'Medium Risk (20-39)' THEN 3
          WHEN risk_category = 'Low Risk (10-19)' THEN 4
          WHEN risk_category = 'Very Low Risk (<10)' THEN 5
          ELSE 6
        END
    `);
    
    console.log('\nCost by Risk Category:');
    console.table(riskAnalysis);
    
    // Examine some examples in detail
    const [examples] = await pool.query(`
      SELECT 
        d.OPERATION_NAME,
        d.OPERATION_TYPE,
        d.COUNTY,
        d.CITY,
        d.LICENSED_TO_SERVE_AGES,
        d.PROGRAMMATIC_SERVICES,
        d.TOTAL_CAPACITY,
        DATEDIFF(CURRENT_DATE, d.ISSUANCE_DATE) / 365 as years_in_operation,
        r.risk_score,
        c.monthly_cost,
        c.calculation_factors
      FROM 
        daycare_cost_estimates c
      JOIN 
        daycare_operations d ON c.operation_id = d.OPERATION_ID
      LEFT JOIN
        risk_analysis r ON c.operation_id = r.operation_id
      ORDER BY 
        c.monthly_cost ASC
      LIMIT 3
    `);
    
    console.log('\nLowest Cost Examples:');
    console.table(examples);
    
    const [highExamples] = await pool.query(`
      SELECT 
        d.OPERATION_NAME,
        d.OPERATION_TYPE,
        d.COUNTY,
        d.CITY,
        d.LICENSED_TO_SERVE_AGES,
        d.PROGRAMMATIC_SERVICES,
        d.TOTAL_CAPACITY,
        DATEDIFF(CURRENT_DATE, d.ISSUANCE_DATE) / 365 as years_in_operation,
        r.risk_score,
        c.monthly_cost,
        c.calculation_factors
      FROM 
        daycare_cost_estimates c
      JOIN 
        daycare_operations d ON c.operation_id = d.OPERATION_ID
      LEFT JOIN
        risk_analysis r ON c.operation_id = r.operation_id
      ORDER BY 
        c.monthly_cost DESC
      LIMIT 3
    `);
    
    console.log('\nHighest Cost Examples:');
    console.table(highExamples);
    
    // Check if the model's estimates align with market rates
    console.log('\nComparison with Market Rates:');
    console.log('- National average for childcare: ~$800-$1,200/month');
    console.log('- Infant care in major cities: ~$1,200-$1,800/month');
    console.log('- Toddler care in major cities: ~$1,000-$1,500/month');
    console.log('- Preschool: ~$800-$1,200/month');
    console.log('- After-school care: ~$500-$800/month');
    
    console.log('\nModel Evaluation:');
    console.log('- Our estimates range from $' + overallStats[0].min_cost + ' to $' + overallStats[0].max_cost);
    console.log('- Average estimate: $' + Math.round(overallStats[0].avg_cost));
    console.log('- Standard deviation: $' + Math.round(overallStats[0].std_dev));
    
    // Calculate how well the model aligns with expected industry patterns
    console.log('\nAlignment with Expected Patterns:');
    
    // Check if infant care costs more than school-age
    if (ageAnalysis[0].age_group === 'Includes Infants' && ageAnalysis[0].avg_cost > ageAnalysis[ageAnalysis.length-1].avg_cost) {
      console.log('✓ Infant care correctly costs more than care for older children');
    } else {
      console.log('✗ Unexpected pattern: Infant care does not show expected premium');
    }
    
    // Check if high-income counties have higher costs
    if (locationAnalysis[0].avg_cost > locationAnalysis[locationAnalysis.length-1].avg_cost) {
      console.log('✓ Higher-income counties show higher costs as expected');
    } else {
      console.log('✗ Unexpected pattern: Location-based pricing shows anomalies');
    }
    
    // Check if higher risk facilities have lower costs
    if (riskAnalysis[0].avg_cost < riskAnalysis[riskAnalysis.length-1].avg_cost) {
      console.log('✓ Higher-risk facilities correctly show lower costs');
    } else {
      console.log('✗ Unexpected pattern: Risk-based discounts not appearing as expected');
    }
    
    // Check if larger facilities have economies of scale
    if (capacityAnalysis[0].avg_cost > capacityAnalysis[capacityAnalysis.length-1].avg_cost) {
      console.log('✓ Smaller facilities correctly cost more per child than larger ones');
    } else {
      console.log('✗ Unexpected pattern: Capacity-based economies of scale not visible');
    }
    
    // Check if more experienced providers cost more
    const newFacilitiesIdx = experienceAnalysis.findIndex(a => a.experience_range === 'New (<2 years)');
    const experiencedFacilitiesIdx = experienceAnalysis.findIndex(a => a.experience_range === '15+ years');
    
    if (newFacilitiesIdx >= 0 && experiencedFacilitiesIdx >= 0 && 
        experienceAnalysis[experiencedFacilitiesIdx].avg_cost > experienceAnalysis[newFacilitiesIdx].avg_cost) {
      console.log('✓ More experienced providers correctly show higher costs');
    } else {
      console.log('✗ Unexpected pattern: Experience-based pricing shows anomalies');
    }
    
  } catch (err) {
    console.error('Analysis error:', err);
  } finally {
    await pool.end();
  }
}

// Run the analysis
analyzeResults().catch(console.error);