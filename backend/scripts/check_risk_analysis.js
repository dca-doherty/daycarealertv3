/**
 * Check Risk Analysis Script
 * 
 * This script provides an overview of the risk analysis data
 * and statistics about the daycares in the database.
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

async function checkRiskAnalysisData() {
  console.log('Checking risk analysis data...');
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // 1. Check coverage - compare total daycares vs risk analyses
    const [daycareRows] = await pool.query('SELECT COUNT(*) as total FROM daycare_operations');
    const totalDaycares = daycareRows[0].total;
    
    const [riskRows] = await pool.query('SELECT COUNT(*) as total FROM risk_analysis');
    const totalRiskAnalyses = riskRows[0].total;
    
    console.log('=== Coverage Analysis ===');
    console.log(`Total daycares in database: ${totalDaycares}`);
    console.log(`Total risk analyses in database: ${totalRiskAnalyses}`);
    console.log(`Coverage percentage: ${((totalRiskAnalyses/totalDaycares)*100).toFixed(2)}%`);
    
    // 2. Check risk score distribution
    const [riskDistribution] = await pool.query(`
      SELECT 
        CASE 
          WHEN risk_score >= 70 THEN 'Critical Risk (70-100)' 
          WHEN risk_score >= 50 THEN 'High Risk (50-69)' 
          WHEN risk_score >= 30 THEN 'Medium Risk (30-49)' 
          WHEN risk_score >= 10 THEN 'Low Risk (10-29)' 
          ELSE 'Minimal Risk (0-9)' 
        END as risk_category,
        COUNT(*) as count,
        ROUND(COUNT(*) / ${totalRiskAnalyses} * 100, 2) as percentage
      FROM risk_analysis
      GROUP BY risk_category
      ORDER BY MIN(risk_score) DESC
    `);
    
    console.log('\n=== Risk Score Distribution ===');
    console.table(riskDistribution);
    
    // 3. Check violation metrics
    const [violationMetrics] = await pool.query(`
      SELECT 
        SUM(total_violations) as total_violations,
        SUM(high_risk_count) as high_risk_violations,
        SUM(medium_high_risk_count) as medium_high_violations,
        SUM(medium_risk_count) as medium_violations,
        SUM(low_risk_count) as low_violations,
        SUM(adverse_actions_count) as adverse_actions,
        ROUND(AVG(risk_score), 2) as avg_risk_score,
        MAX(risk_score) as max_risk_score
      FROM risk_analysis
    `);
    
    console.log('\n=== Violation Metrics ===');
    console.log(`Total violations across all daycares: ${violationMetrics[0].total_violations}`);
    console.log(`High risk violations: ${violationMetrics[0].high_risk_violations}`);
    console.log(`Medium-high risk violations: ${violationMetrics[0].medium_high_violations}`);
    console.log(`Medium risk violations: ${violationMetrics[0].medium_violations}`);
    console.log(`Low risk violations: ${violationMetrics[0].low_violations}`);
    console.log(`Operations with adverse actions: ${violationMetrics[0].adverse_actions}`);
    console.log(`Average risk score: ${violationMetrics[0].avg_risk_score}`);
    console.log(`Maximum risk score: ${violationMetrics[0].max_risk_score}`);
    
    // 4. Check risk factors data
    const [riskFactorsData] = await pool.query(`
      SELECT 
        COUNT(*) as total_risk_analyses,
        SUM(CASE WHEN JSON_LENGTH(risk_factors) > 0 THEN 1 ELSE 0 END) as with_risk_factors,
        SUM(CASE WHEN JSON_LENGTH(risk_factors) = 0 THEN 1 ELSE 0 END) as without_risk_factors,
        SUM(CASE WHEN JSON_LENGTH(parent_recommendations) > 0 THEN 1 ELSE 0 END) as with_recommendations
      FROM risk_analysis
    `);
    
    const riskFactors = riskFactorsData[0];
    
    console.log('\n=== Risk Factors Data ===');
    console.log(`Risk analyses with risk factors: ${riskFactors.with_risk_factors} (${((riskFactors.with_risk_factors/riskFactors.total_risk_analyses)*100).toFixed(2)}%)`);
    console.log(`Risk analyses without risk factors: ${riskFactors.without_risk_factors} (${((riskFactors.without_risk_factors/riskFactors.total_risk_analyses)*100).toFixed(2)}%)`);
    console.log(`Risk analyses with recommendations: ${riskFactors.with_recommendations} (${((riskFactors.with_recommendations/riskFactors.total_risk_analyses)*100).toFixed(2)}%)`);
    
    // 5. List top 10 highest risk daycares
    const [highRiskDaycares] = await pool.query(`
      SELECT 
        r.operation_id,
        d.OPERATION_NAME,
        d.OPERATION_TYPE,
        d.CITY,
        r.risk_score,
        r.total_violations,
        r.high_risk_count,
        r.last_analysis_date
      FROM 
        risk_analysis r
      JOIN 
        daycare_operations d ON r.operation_id = d.OPERATION_NUMBER
      ORDER BY 
        r.risk_score DESC
      LIMIT 10
    `);
    
    console.log('\n=== Top 10 Highest Risk Daycares ===');
    console.table(highRiskDaycares);
    
    // 6. Check most recent analysis date
    const [dateData] = await pool.query(`
      SELECT 
        MIN(last_analysis_date) as oldest_analysis,
        MAX(last_analysis_date) as newest_analysis,
        DATEDIFF(MAX(last_analysis_date), MIN(last_analysis_date)) as date_range_days
      FROM risk_analysis
    `);
    
    console.log('\n=== Analysis Date Information ===');
    console.log(`Oldest analysis date: ${dateData[0].oldest_analysis}`);
    console.log(`Newest analysis date: ${dateData[0].newest_analysis}`);
    console.log(`Date range: ${dateData[0].date_range_days} days`);
    
  } catch (err) {
    console.error('Error checking risk analysis data:', err);
  } finally {
    await pool.end();
    console.log('\nCheck completed.');
  }
}

// Run the script
checkRiskAnalysisData().catch(console.error);