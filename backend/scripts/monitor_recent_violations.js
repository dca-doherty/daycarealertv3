/**
 * Monitor Recent Violations
 * 
 * This script checks for recent violations in the non_compliance table
 * based on a specified time period (default: last 7 days).
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Configuration
const REPORTS_DIR = path.join(__dirname, '../reports');
const DEFAULT_DAYS = 7; // Default to look 7 days back
const DAYS = process.argv[2] ? parseInt(process.argv[2]) : DEFAULT_DAYS;
const LIMIT = process.argv[3] ? parseInt(process.argv[3]) : 10; // Default to showing 10 most recent

// Get the current date in YYYY-MM-DD format
function getFormattedDate(date) {
  return date.toISOString().split('T')[0];
}

// Make sure reports directory exists
async function ensureDirectoryExists() {
  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
  } catch (err) {
    console.error(`Error creating directory: ${err.message}`);
    throw err;
  }
}

// Main function
async function main() {
  console.log(`=== Recent Non-Compliance Violations (Last ${DAYS} days) ===`);
  
  // Ensure reports directory exists
  await ensureDirectoryExists();
  
  // Get current date and format it
  const currentDate = new Date();
  const formattedDate = getFormattedDate(currentDate);
  
  // Calculate the date range for recent violations
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - DAYS);
  const lookbackDateStr = getFormattedDate(lookbackDate);
  
  // Connect to database
  console.log('Connecting to database...');
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Get current statistics
    const [totalResult] = await pool.query('SELECT COUNT(*) as count FROM non_compliance');
    const totalRecords = totalResult[0].count;
    
    // Get summary statistics for recent records
    const [recentStats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN STANDARD_RISK_LEVEL = 'High' THEN 1 ELSE 0 END) as high_risk,
        SUM(CASE WHEN STANDARD_RISK_LEVEL = 'Medium High' THEN 1 ELSE 0 END) as medium_high_risk,
        SUM(CASE WHEN STANDARD_RISK_LEVEL = 'Medium' THEN 1 ELSE 0 END) as medium_risk,
        SUM(CASE WHEN STANDARD_RISK_LEVEL = 'Medium Low' OR STANDARD_RISK_LEVEL = 'Low' THEN 1 ELSE 0 END) as low_risk,
        COUNT(DISTINCT OPERATION_ID) as unique_daycares
      FROM non_compliance
      WHERE ACTIVITY_DATE >= ? OR LAST_UPDATED >= ?
    `, [lookbackDateStr, lookbackDateStr]);
    
    console.log(`Total violations in database: ${totalRecords}`);
    console.log(`Violations in the last ${DAYS} days: ${recentStats[0].total}`);
    console.log(`Unique daycares with violations: ${recentStats[0].unique_daycares}`);
    console.log(`High risk violations: ${recentStats[0].high_risk}`);
    console.log(`Medium high risk violations: ${recentStats[0].medium_high_risk}`);
    console.log(`Medium risk violations: ${recentStats[0].medium_risk}`);
    console.log(`Low risk violations: ${recentStats[0].low_risk}`);
    
    // Get most recent violations
    const [recentViolations] = await pool.query(`
      SELECT n.NON_COMPLIANCE_ID, n.OPERATION_ID, n.ACTIVITY_DATE, 
             n.STANDARD_RISK_LEVEL, n.STANDARD_NUMBER_DESCRIPTION, n.NARRATIVE,
             n.CORRECTED_AT_INSPECTION, n.LAST_UPDATED, 
             d.OPERATION_NAME, d.CITY, d.COUNTY
      FROM non_compliance n
      LEFT JOIN daycare_operations d ON n.OPERATION_ID = d.OPERATION_NUMBER
      WHERE n.ACTIVITY_DATE >= ? OR n.LAST_UPDATED >= ?
      ORDER BY n.ACTIVITY_DATE DESC, n.LAST_UPDATED DESC
      LIMIT ?
    `, [lookbackDateStr, lookbackDateStr, LIMIT]);
    
    console.log(`\nMost recent ${LIMIT} violations:`);
    console.log('-----------------------------------');
    
    // Generate report content
    let reportContent = `=== Recent Non-Compliance Violations (Last ${DAYS} days) ===\n`;
    reportContent += `Report Date: ${formattedDate}\n\n`;
    reportContent += `Total violations in database: ${totalRecords}\n`;
    reportContent += `Violations in the last ${DAYS} days: ${recentStats[0].total}\n`;
    reportContent += `Unique daycares with violations: ${recentStats[0].unique_daycares}\n`;
    reportContent += `High risk violations: ${recentStats[0].high_risk}\n`;
    reportContent += `Medium high risk violations: ${recentStats[0].medium_high_risk}\n`;
    reportContent += `Medium risk violations: ${recentStats[0].medium_risk}\n`;
    reportContent += `Low risk violations: ${recentStats[0].low_risk}\n\n`;
    
    reportContent += `MOST RECENT ${LIMIT} VIOLATIONS:\n`;
    reportContent += '-----------------------------------\n';
    
    // Process and display each violation
    for (const violation of recentViolations) {
      const daycareName = violation.OPERATION_NAME || 'Unknown';
      const city = violation.CITY || 'Unknown';
      const county = violation.COUNTY || 'TX';
      const activityDate = violation.ACTIVITY_DATE 
        ? new Date(violation.ACTIVITY_DATE).toLocaleDateString() 
        : 'Unknown';
      
      const details = `
ID: ${violation.NON_COMPLIANCE_ID}
Daycare: ${daycareName} (${violation.OPERATION_ID})
Location: ${city}, ${county}
Date: ${activityDate}
Risk Level: ${violation.STANDARD_RISK_LEVEL || 'Not specified'}
Standard: ${violation.STANDARD_NUMBER_DESCRIPTION || 'Not specified'}
Description: ${violation.NARRATIVE || 'No description provided'}
Corrected at inspection: ${violation.CORRECTED_AT_INSPECTION || 'No'}
Last Updated: ${new Date(violation.LAST_UPDATED).toLocaleString()}
-----------------------------------`;
      
      console.log(details);
      reportContent += details + '\n';
    }
    
    // Get violations by risk level
    const [riskBreakdown] = await pool.query(`
      SELECT 
        STANDARD_RISK_LEVEL, 
        COUNT(*) as count
      FROM non_compliance
      WHERE ACTIVITY_DATE >= ? OR LAST_UPDATED >= ?
      GROUP BY STANDARD_RISK_LEVEL
      ORDER BY 
        CASE 
          WHEN STANDARD_RISK_LEVEL = 'High' THEN 1
          WHEN STANDARD_RISK_LEVEL = 'Medium High' THEN 2
          WHEN STANDARD_RISK_LEVEL = 'Medium' THEN 3
          WHEN STANDARD_RISK_LEVEL = 'Medium Low' THEN 4
          WHEN STANDARD_RISK_LEVEL = 'Low' THEN 5
          ELSE 6
        END
    `, [lookbackDateStr, lookbackDateStr]);
    
    // Top daycares with violations
    const [topDaycares] = await pool.query(`
      SELECT 
        n.OPERATION_ID,
        d.OPERATION_NAME,
        d.CITY,
        COUNT(*) as violation_count,
        SUM(CASE WHEN n.STANDARD_RISK_LEVEL = 'High' THEN 1 ELSE 0 END) as high_count
      FROM non_compliance n
      LEFT JOIN daycare_operations d ON n.OPERATION_ID = d.OPERATION_NUMBER
      WHERE n.ACTIVITY_DATE >= ? OR n.LAST_UPDATED >= ?
      GROUP BY n.OPERATION_ID, d.OPERATION_NAME, d.CITY
      ORDER BY high_count DESC, violation_count DESC
      LIMIT 10
    `, [lookbackDateStr, lookbackDateStr]);
    
    // Add risk level breakdown to report
    reportContent += '\nVIOLATIONS BY RISK LEVEL:\n';
    reportContent += '-----------------------------------\n';
    for (const risk of riskBreakdown) {
      reportContent += `${risk.STANDARD_RISK_LEVEL || 'Unknown'}: ${risk.count}\n`;
    }
    
    // Add top daycares to report
    reportContent += '\nTOP DAYCARES WITH VIOLATIONS:\n';
    reportContent += '-----------------------------------\n';
    for (const daycare of topDaycares) {
      reportContent += `${daycare.OPERATION_NAME || 'Unknown'} (${daycare.OPERATION_ID})\n`;
      reportContent += `Location: ${daycare.CITY || 'Unknown'}\n`;
      reportContent += `Total Violations: ${daycare.violation_count}\n`;
      reportContent += `High Risk Violations: ${daycare.high_count}\n`;
      reportContent += '-----------------------------------\n';
    }
    
    // Save report
    const reportFile = path.join(REPORTS_DIR, `recent_violations_${formattedDate}.txt`);
    await fs.writeFile(reportFile, reportContent, 'utf8');
    
    console.log(`\nReport saved to: ${reportFile}`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(console.error);