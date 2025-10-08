/**
 * Monitor Non-Compliance Changes
 * 
 * This script monitors the non_compliance table for changes over time.
 * It can be run daily or weekly to track new violations, updated violations,
 * and generate reports on changes since the last check.
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
const STATE_FILE = path.join(REPORTS_DIR, 'non_compliance_monitor_state.json');
const DEFAULT_DAYS = 7; // Default to look 7 days back
const DAYS = process.argv[2] ? parseInt(process.argv[2]) : DEFAULT_DAYS;

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

// Load previous state
async function loadPreviousState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    // If file doesn't exist, return default state
    return {
      lastRunDate: null,
      totalRecords: 0,
      latestActivityDate: null,
      knownViolations: {} // Map of NON_COMPLIANCE_ID to last known state
    };
  }
}

// Save current state
async function saveState(state) {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// Main function
async function main() {
  console.log(`=== Non-Compliance Change Monitor (${DAYS} days) ===`);
  
  // Ensure reports directory exists
  await ensureDirectoryExists();
  
  // Get current date and format it
  const currentDate = new Date();
  const formattedDate = getFormattedDate(currentDate);
  
  // Connect to database
  console.log('Connecting to database...');
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Load previous state
    const prevState = await loadPreviousState();
    console.log(`Previous check: ${prevState.lastRunDate || 'Never'}`);
    
    // Prepare new state
    const newState = {
      lastRunDate: formattedDate,
      totalRecords: 0,
      latestActivityDate: prevState.latestActivityDate,
      knownViolations: { ...prevState.knownViolations }
    };
    
    // Get current statistics
    const [countResult] = await pool.query('SELECT COUNT(*) as count FROM non_compliance');
    const totalRecords = countResult[0].count;
    newState.totalRecords = totalRecords;
    
    console.log(`Total violations in database: ${totalRecords}`);
    
    // Calculate the date range for recent violations
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - DAYS);
    const lookbackDateStr = getFormattedDate(lookbackDate);
    
    // Get recent violations
    const [recentViolations] = await pool.query(`
      SELECT NON_COMPLIANCE_ID, OPERATION_ID, ACTIVITY_DATE, 
             STANDARD_RISK_LEVEL, STANDARD_NUMBER_DESCRIPTION, NARRATIVE,
             CORRECTED_AT_INSPECTION, LAST_UPDATED
      FROM non_compliance
      WHERE ACTIVITY_DATE >= ? OR LAST_UPDATED >= ?
      ORDER BY ACTIVITY_DATE DESC, LAST_UPDATED DESC
    `, [lookbackDateStr, lookbackDateStr]);
    
    console.log(`Found ${recentViolations.length} violations in the last ${DAYS} days`);
    
    // Categorize changes
    const newViolations = [];
    const updatedViolations = [];
    
    // Find the most recent activity date
    let latestActivityDate = prevState.latestActivityDate;
    
    // Process each violation
    for (const violation of recentViolations) {
      const violationId = violation.NON_COMPLIANCE_ID;
      const activityDate = violation.ACTIVITY_DATE ? new Date(violation.ACTIVITY_DATE) : null;
      
      // Update latest activity date if needed
      if (activityDate && (!latestActivityDate || activityDate > new Date(latestActivityDate))) {
        latestActivityDate = getFormattedDate(activityDate);
      }
      
      // Check if this is a new or updated violation
      if (!prevState.knownViolations[violationId]) {
        newViolations.push(violation);
      } else {
        // Compare with previous state to see if updated
        const prevViolation = prevState.knownViolations[violationId];
        if (
          violation.CORRECTED_AT_INSPECTION !== prevViolation.CORRECTED_AT_INSPECTION ||
          (violation.LAST_UPDATED && new Date(violation.LAST_UPDATED) > new Date(prevViolation.LAST_UPDATED))
        ) {
          updatedViolations.push({
            current: violation,
            previous: prevViolation
          });
        }
      }
      
      // Update known violations
      newState.knownViolations[violationId] = {
        OPERATION_ID: violation.OPERATION_ID,
        ACTIVITY_DATE: violation.ACTIVITY_DATE,
        STANDARD_RISK_LEVEL: violation.STANDARD_RISK_LEVEL,
        CORRECTED_AT_INSPECTION: violation.CORRECTED_AT_INSPECTION,
        LAST_UPDATED: violation.LAST_UPDATED
      };
    }
    
    newState.latestActivityDate = latestActivityDate;
    
    // Get daycare details for the violations
    if (newViolations.length > 0 || updatedViolations.length > 0) {
      const operationIds = [...new Set([
        ...newViolations.map(v => v.OPERATION_ID),
        ...updatedViolations.map(v => v.current.OPERATION_ID)
      ])];
      
      const [daycares] = await pool.query(`
        SELECT OPERATION_NUMBER, OPERATION_NAME, CITY, COUNTY
        FROM daycare_operations
        WHERE OPERATION_NUMBER IN (?)
      `, [operationIds]);
      
      // Create a map for easy lookup
      const daycareMap = {};
      for (const daycare of daycares) {
        daycareMap[daycare.OPERATION_NUMBER] = daycare;
      }
      
      // Generate report
      const reportContent = generateReport(
        formattedDate, 
        prevState.lastRunDate, 
        totalRecords, 
        newViolations, 
        updatedViolations, 
        daycareMap
      );
      
      // Save report
      const reportFile = path.join(REPORTS_DIR, `non_compliance_changes_${formattedDate}.txt`);
      await fs.writeFile(reportFile, reportContent, 'utf8');
      
      console.log(`\nReport generated: ${reportFile}`);
      console.log(`\n${reportContent}`);
    } else {
      console.log('\nNo changes detected since last check.');
    }
    
    // Save the new state
    await saveState(newState);
    
    console.log('\nMonitoring complete!');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

// Generate a readable report
function generateReport(date, lastRunDate, totalRecords, newViolations, updatedViolations, daycareMap) {
  let report = `=== Non-Compliance Violations Report (${date}) ===\n\n`;
  
  report += `Previous check: ${lastRunDate || 'Never'}\n`;
  report += `Total violations in database: ${totalRecords}\n\n`;
  
  // New violations
  report += `NEW VIOLATIONS (${newViolations.length}):\n`;
  report += '-------------------\n';
  
  if (newViolations.length === 0) {
    report += 'No new violations found.\n';
  } else {
    for (const violation of newViolations) {
      const daycare = daycareMap[violation.OPERATION_ID] || { OPERATION_NAME: 'Unknown', CITY: 'Unknown' };
      report += `ID: ${violation.NON_COMPLIANCE_ID}\n`;
      report += `Daycare: ${daycare.OPERATION_NAME} (${violation.OPERATION_ID})\n`;
      report += `Location: ${daycare.CITY}, ${daycare.COUNTY || 'TX'}\n`;
      report += `Date: ${violation.ACTIVITY_DATE ? new Date(violation.ACTIVITY_DATE).toLocaleDateString() : 'Unknown'}\n`;
      report += `Risk Level: ${violation.STANDARD_RISK_LEVEL || 'Not specified'}\n`;
      report += `Standard: ${violation.STANDARD_NUMBER_DESCRIPTION || 'Not specified'}\n`;
      report += `Description: ${violation.NARRATIVE || 'No description provided'}\n`;
      report += `Corrected at inspection: ${violation.CORRECTED_AT_INSPECTION || 'No'}\n`;
      report += '-------------------\n';
    }
  }
  
  // Updated violations
  report += `\nUPDATED VIOLATIONS (${updatedViolations.length}):\n`;
  report += '-------------------\n';
  
  if (updatedViolations.length === 0) {
    report += 'No updated violations found.\n';
  } else {
    for (const { current, previous } of updatedViolations) {
      const daycare = daycareMap[current.OPERATION_ID] || { OPERATION_NAME: 'Unknown', CITY: 'Unknown' };
      report += `ID: ${current.NON_COMPLIANCE_ID}\n`;
      report += `Daycare: ${daycare.OPERATION_NAME} (${current.OPERATION_ID})\n`;
      report += `Location: ${daycare.CITY}, ${daycare.COUNTY || 'TX'}\n`;
      report += `Date: ${current.ACTIVITY_DATE ? new Date(current.ACTIVITY_DATE).toLocaleDateString() : 'Unknown'}\n`;
      report += `Risk Level: ${current.STANDARD_RISK_LEVEL || 'Not specified'}\n`;
      
      if (previous.CORRECTED_AT_INSPECTION !== current.CORRECTED_AT_INSPECTION) {
        report += `Correction status changed: ${previous.CORRECTED_AT_INSPECTION || 'No'} -> ${current.CORRECTED_AT_INSPECTION || 'No'}\n`;
      }
      
      if (previous.LAST_UPDATED !== current.LAST_UPDATED) {
        report += `Last updated: ${new Date(current.LAST_UPDATED).toLocaleString()}\n`;
      }
      
      report += '-------------------\n';
    }
  }
  
  // Summary section
  report += `\nSUMMARY:\n`;
  report += `- Total new violations: ${newViolations.length}\n`;
  report += `- Total updated violations: ${updatedViolations.length}\n`;
  
  return report;
}

// Run the script
main().catch(console.error);