/**
 * Compare Cost Estimation Models
 * 
 * This script compares the results of the v2 and v3 cost estimation models
 * to highlight the impact of adding accreditation and other quality premiums.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { calculateCost: calculateCostV2 } = require('./scripts/generate_cost_estimation_v2');
const { 
  calculateCost: calculateCostV3,
  detectAccreditation,
  detectEducationCredentials,
  detectCurriculum
} = require('./scripts/generate_cost_estimation_v3');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

async function compareModels() {
  const pool = await mysql.createPool(dbConfig);
  
  try {
    console.log('Comparing cost estimation models v2 vs v3...');
    
    // Get a sample of daycares with programmatic services mentioned
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
        r.risk_score
      FROM 
        daycare_operations d
      LEFT JOIN
        risk_analysis r ON d.OPERATION_ID = r.operation_id
      WHERE 
        d.PROGRAMMATIC_SERVICES IS NOT NULL 
        AND d.PROGRAMMATIC_SERVICES != ''
      ORDER BY RAND()
      LIMIT 100
    `);
    
    console.log(`Found ${daycares.length} daycares for comparison`);
    
    // Compare the models for each daycare
    const results = [];
    let accreditedCount = 0;
    let educationCount = 0;
    let curriculumCount = 0;
    
    for (const daycare of daycares) {
      // Get risk data
      const riskData = { risk_score: daycare.risk_score };
      
      // Calculate cost using v2 model
      const costV2 = calculateCostV2(daycare, riskData, {}, {});
      
      // Calculate cost using v3 model
      const costV3 = calculateCostV3(daycare, riskData, {}, {});
      
      // Check for accreditation, education, curriculum
      const accreditations = detectAccreditation(daycare.PROGRAMMATIC_SERVICES);
      const educations = detectEducationCredentials(daycare.PROGRAMMATIC_SERVICES);
      const curricula = detectCurriculum(daycare.PROGRAMMATIC_SERVICES);
      
      if (accreditations.length > 0) accreditedCount++;
      if (educations.length > 0) educationCount++;
      if (curricula.length > 0) curriculumCount++;
      
      // Calculate difference
      const monthlyDiff = costV3.cost_estimate - costV2.cost_estimate;
      const weeklyDiff = costV3.weekly_cost - costV2.weekly_cost;
      const percentDiff = (monthlyDiff / costV2.cost_estimate) * 100;
      
      results.push({
        operation_name: daycare.OPERATION_NAME,
        operation_number: daycare.OPERATION_NUMBER,
        monthly_v2: costV2.cost_estimate,
        weekly_v2: costV2.weekly_cost,
        monthly_v3: costV3.cost_estimate,
        weekly_v3: costV3.weekly_cost,
        monthly_diff: monthlyDiff,
        weekly_diff: weeklyDiff,
        percent_diff: percentDiff,
        has_accreditation: accreditations.length > 0,
        accreditations: accreditations,
        has_education: educations.length > 0,
        educations: educations,
        has_curriculum: curricula.length > 0,
        curricula: curricula
      });
    }
    
    // Display results
    console.log('\nComparison Summary:');
    console.log(`Total daycares compared: ${results.length}`);
    console.log(`Daycares with detected accreditations: ${accreditedCount} (${Math.round(accreditedCount/results.length*100)}%)`);
    console.log(`Daycares with detected education credentials: ${educationCount} (${Math.round(educationCount/results.length*100)}%)`);
    console.log(`Daycares with detected curriculum approaches: ${curriculumCount} (${Math.round(curriculumCount/results.length*100)}%)`);
    
    // Calculate average differences
    const avgMonthlyDiff = results.reduce((sum, r) => sum + r.monthly_diff, 0) / results.length;
    const avgWeeklyDiff = results.reduce((sum, r) => sum + r.weekly_diff, 0) / results.length;
    const avgPercentDiff = results.reduce((sum, r) => sum + r.percent_diff, 0) / results.length;
    
    console.log(`\nAverage monthly difference: $${avgMonthlyDiff.toFixed(2)}`);
    console.log(`Average weekly difference: $${avgWeeklyDiff.toFixed(2)}`);
    console.log(`Average percent difference: ${avgPercentDiff.toFixed(2)}%`);
    
    // Show results for daycares with quality indicators
    const accreditedResults = results.filter(r => r.has_accreditation);
    const educationResults = results.filter(r => r.has_education);
    const curriculumResults = results.filter(r => r.has_curriculum);
    
    if (accreditedResults.length > 0) {
      const accreditedAvgDiff = accreditedResults.reduce((sum, r) => sum + r.monthly_diff, 0) / accreditedResults.length;
      const accreditedAvgPercent = accreditedResults.reduce((sum, r) => sum + r.percent_diff, 0) / accreditedResults.length;
      console.log(`\nDaycares with accreditation - Avg monthly difference: $${accreditedAvgDiff.toFixed(2)} (${accreditedAvgPercent.toFixed(2)}%)`);
    }
    
    if (educationResults.length > 0) {
      const educationAvgDiff = educationResults.reduce((sum, r) => sum + r.monthly_diff, 0) / educationResults.length;
      const educationAvgPercent = educationResults.reduce((sum, r) => sum + r.percent_diff, 0) / educationResults.length;
      console.log(`Daycares with education credentials - Avg monthly difference: $${educationAvgDiff.toFixed(2)} (${educationAvgPercent.toFixed(2)}%)`);
    }
    
    if (curriculumResults.length > 0) {
      const curriculumAvgDiff = curriculumResults.reduce((sum, r) => sum + r.monthly_diff, 0) / curriculumResults.length;
      const curriculumAvgPercent = curriculumResults.reduce((sum, r) => sum + r.percent_diff, 0) / curriculumResults.length;
      console.log(`Daycares with specialized curriculum - Avg monthly difference: $${curriculumAvgDiff.toFixed(2)} (${curriculumAvgPercent.toFixed(2)}%)`);
    }
    
    // Show top 10 daycares with the biggest differences
    console.log('\nTop 10 daycares with biggest price differences:');
    const topDiffs = [...results].sort((a, b) => b.monthly_diff - a.monthly_diff).slice(0, 10);
    
    topDiffs.forEach((result, idx) => {
      console.log(`${idx+1}. ${result.operation_name} (${result.operation_number}):`);
      console.log(`   - v2: $${result.monthly_v2}/month ($${result.weekly_v2}/week)`);
      console.log(`   - v3: $${result.monthly_v3}/month ($${result.weekly_v3}/week)`);
      console.log(`   - Difference: $${result.monthly_diff}/month (${result.percent_diff.toFixed(2)}%)`);
      
      if (result.accreditations.length > 0) {
        console.log(`   - Accreditations: ${result.accreditations.join(', ')}`);
      }
      
      if (result.educations.length > 0) {
        console.log(`   - Education credentials: ${result.educations.join(', ')}`);
      }
      
      if (result.curricula.length > 0) {
        console.log(`   - Curriculum approaches: ${result.curricula.join(', ')}`);
      }
      
      console.log('');
    });
    
    // Check for Meadow Oaks Academy
    const meadowOaks = results.find(r => 
      r.operation_name.toLowerCase().includes('meadow oaks') || 
      r.operation_number === '1786033'
    );
    
    if (meadowOaks) {
      console.log('\nMeadow Oaks Academy comparison:');
      console.log(`v2 estimate: $${meadowOaks.monthly_v2}/month ($${meadowOaks.weekly_v2}/week)`);
      console.log(`v3 estimate: $${meadowOaks.monthly_v3}/month ($${meadowOaks.weekly_v3}/week)`);
      console.log(`Difference: $${meadowOaks.monthly_diff}/month (${meadowOaks.percent_diff.toFixed(2)}%)`);
      
      if (meadowOaks.accreditations.length > 0) {
        console.log(`Accreditations: ${meadowOaks.accreditations.join(', ')}`);
      }
      
      if (meadowOaks.educations.length > 0) {
        console.log(`Education credentials: ${meadowOaks.educations.join(', ')}`);
      }
      
      if (meadowOaks.curricula.length > 0) {
        console.log(`Curriculum approaches: ${meadowOaks.curricula.join(', ')}`);
      }
    }
    
  } catch (err) {
    console.error('Error comparing cost models:', err);
  } finally {
    await pool.end();
  }
}

// Run the comparison
compareModels().catch(console.error);