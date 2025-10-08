#!/usr/bin/env node

/**
 * Track Violation Changes and Create Notification Queue
 * 
 * This script:
 * 1. Tracks new violations from the non_compliance table
 * 2. Records these changes in a violation_changes table
 * 3. Creates notification queue entries for users with alerts set up
 * 
 * It can be run daily via cron job to monitor for new violations.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration with support for production server
// Force production mode if run from /var/www directory path
const isProduction = process.env.NODE_ENV === 'production' || 
                     process.argv.includes('--production') || 
                     __dirname.includes('/var/www/');

const dbConfig = isProduction ? {
  // Production server configuration
  socketPath: '/var/run/mysqld/mysqld.sock',  // Unix socket path
  user: 'root',
  password: 'Bd03021988!!',
  database: 'daycarealert',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
} : {
  // Local development configuration
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Configuration
const REPORTS_DIR = path.join(__dirname, '../reports');
const STATE_FILE = path.join(REPORTS_DIR, 'violation_tracker_state.json');
const DEFAULT_DAYS = 7; // Default to look 7 days back if no previous state
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
      latestActivityDate: null,
      knownViolations: {} // Map of NON_COMPLIANCE_ID to last known state
    };
  }
}

// Save current state
async function saveState(state) {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// Create required database tables if they don't exist
async function ensureTablesExist(pool) {
  console.log('Ensuring required tables exist...');

  try {
    // Check if violation_changes table exists
    const [violationChangesTable] = await pool.query(`
      SHOW TABLES LIKE 'violation_changes'
    `);

    if (violationChangesTable.length === 0) {
      console.log('Creating violation_changes table...');
      await pool.query(`
        CREATE TABLE violation_changes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          non_compliance_id VARCHAR(255) NOT NULL,
          operation_id VARCHAR(50) NOT NULL,
          change_type ENUM('new', 'updated', 'corrected') NOT NULL,
          activity_date DATE,
          standard_risk_level VARCHAR(50),
          standard_number_description TEXT,
          narrative TEXT,
          corrected_at_inspection VARCHAR(10),
          corrected_date DATE,
          detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          processed BOOLEAN NOT NULL DEFAULT FALSE,
          notified_at TIMESTAMP NULL,
          INDEX idx_operation_id (operation_id),
          INDEX idx_detected_at (detected_at),
          INDEX idx_processed (processed),
          INDEX idx_non_compliance_id (non_compliance_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log('violation_changes table created.');
    }

    // Check if violation_notifications table exists
    const [violationNotificationsTable] = await pool.query(`
      SHOW TABLES LIKE 'violation_notifications'
    `);

    if (violationNotificationsTable.length === 0) {
      console.log('Creating violation_notifications table...');
      await pool.query(`
        CREATE TABLE violation_notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          violation_change_id INT NOT NULL,
          user_id INT NOT NULL,
          alert_id INT,
          sent_at TIMESTAMP NULL,
          delivery_status VARCHAR(50) DEFAULT 'pending',
          INDEX idx_violation_change_id (violation_change_id),
          INDEX idx_user_id (user_id),
          INDEX idx_alert_id (alert_id),
          FOREIGN KEY (violation_change_id) REFERENCES violation_changes(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log('violation_notifications table created.');
    }

    // Check if violation_summary table exists
    const [violationSummaryTable] = await pool.query(`
      SHOW TABLES LIKE 'violation_summary'
    `);

    if (violationSummaryTable.length === 0) {
      console.log('Creating violation_summary table...');
      await pool.query(`
        CREATE TABLE violation_summary (
          operation_id VARCHAR(50) PRIMARY KEY,
          total_violations INT NOT NULL DEFAULT 0,
          recent_violations INT NOT NULL DEFAULT 0,
          high_risk_violations INT NOT NULL DEFAULT 0,
          medium_high_violations INT NOT NULL DEFAULT 0,
          medium_violations INT NOT NULL DEFAULT 0,
          low_violations INT NOT NULL DEFAULT 0,
          last_violation_date DATE NULL,
          last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_last_violation (last_violation_date),
          INDEX idx_last_updated (last_updated)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log('violation_summary table created.');
    }

    return true;
  } catch (err) {
    console.error('Error ensuring tables exist:', err);
    throw err;
  }
}

// Update violation summary data
async function updateViolationSummary(pool) {
  console.log('Updating violation summary data...');

  try {
    // Get counts by operation_id and risk level
    await pool.query(`
      INSERT INTO violation_summary (
        operation_id, 
        total_violations,
        high_risk_violations,
        medium_high_violations,
        medium_violations,
        low_violations,
        last_violation_date
      )
      SELECT 
        OPERATION_ID,
        COUNT(*) as total,
        SUM(CASE WHEN STANDARD_RISK_LEVEL = 'High' THEN 1 ELSE 0 END) as high_risk,
        SUM(CASE WHEN STANDARD_RISK_LEVEL = 'Medium High' THEN 1 ELSE 0 END) as medium_high,
        SUM(CASE WHEN STANDARD_RISK_LEVEL = 'Medium' THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN STANDARD_RISK_LEVEL IN ('Medium Low', 'Low') THEN 1 ELSE 0 END) as low,
        MAX(ACTIVITY_DATE) as last_date
      FROM 
        non_compliance
      GROUP BY 
        OPERATION_ID
      ON DUPLICATE KEY UPDATE
        total_violations = VALUES(total_violations),
        high_risk_violations = VALUES(high_risk_violations),
        medium_high_violations = VALUES(medium_high_violations),
        medium_violations = VALUES(medium_violations),
        low_violations = VALUES(low_violations),
        last_violation_date = VALUES(last_violation_date)
    `);

    // Update recent violations count (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = getFormattedDate(ninetyDaysAgo);

    await pool.query(`
      UPDATE violation_summary vs
      SET recent_violations = (
        SELECT COUNT(*) 
        FROM non_compliance nc 
        WHERE nc.OPERATION_ID = vs.operation_id
        AND nc.ACTIVITY_DATE >= ?
      )
    `, [ninetyDaysAgoStr]);

    console.log('Violation summary data updated successfully.');
    
    // Get some stats to log
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_daycares,
        SUM(CASE WHEN total_violations > 0 THEN 1 ELSE 0 END) as daycares_with_violations,
        SUM(CASE WHEN recent_violations > 0 THEN 1 ELSE 0 END) as daycares_with_recent,
        SUM(total_violations) as total_violation_count,
        MAX(total_violations) as max_violations
      FROM 
        violation_summary
    `);

    console.log(`Summary stats: ${stats[0].total_daycares} daycares, ${stats[0].daycares_with_violations} with violations, ${stats[0].daycares_with_recent} with recent violations`);
    console.log(`Total violation count: ${stats[0].total_violation_count}, Max violations at one daycare: ${stats[0].max_violations}`);

  } catch (err) {
    console.error('Error updating violation summary:', err);
    throw err;
  }
}

// Record a violation change
async function recordViolationChange(pool, violationChange) {
  try {
    const [result] = await pool.query(`
      INSERT INTO violation_changes (
        non_compliance_id,
        operation_id,
        change_type,
        activity_date,
        standard_risk_level,
        standard_number_description,
        narrative,
        corrected_at_inspection,
        corrected_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      violationChange.NON_COMPLIANCE_ID,
      violationChange.OPERATION_ID,
      violationChange.change_type,
      violationChange.ACTIVITY_DATE,
      violationChange.STANDARD_RISK_LEVEL,
      violationChange.STANDARD_NUMBER_DESCRIPTION,
      violationChange.NARRATIVE,
      violationChange.CORRECTED_AT_INSPECTION,
      violationChange.CORRECTED_DATE
    ]);

    return result.insertId;
  } catch (err) {
    console.error(`Error recording violation change for ${violationChange.NON_COMPLIANCE_ID}:`, err);
    return null;
  }
}

// Create notification entries for users with alerts for a specific daycare
async function createNotificationEntries(pool, violationChangeId, operationId) {
  try {
    // Find all users who have alerts set up for this operation_id
    const [alertUsers] = await pool.query(`
      SELECT 
        a.id as alert_id,
        a.user_id,
        a.frequency
      FROM 
        alerts a
      WHERE 
        a.operation_number = ? 
        AND a.alert_type = 'violation'
        AND a.active = 1
    `, [operationId]);

    if (alertUsers.length === 0) {
      return 0;
    }

    // Create notification entries for each user
    const values = alertUsers.map(alert => [
      violationChangeId,
      alert.user_id,
      alert.alert_id
    ]);

    if (values.length > 0) {
      const [result] = await pool.query(`
        INSERT INTO violation_notifications (
          violation_change_id,
          user_id,
          alert_id
        ) VALUES ?
      `, [values]);

      return values.length;
    }

    return 0;
  } catch (err) {
    console.error(`Error creating notification entries for violation ${violationChangeId}:`, err);
    return 0;
  }
}

// Main function
async function main() {
  console.log(`=== Violation Change Tracker (${DAYS} days) ===`);
  
  // Ensure reports directory exists
  await ensureDirectoryExists();
  
  // Get current date and format it
  const currentDate = new Date();
  const formattedDate = getFormattedDate(currentDate);
  
  // Connect to database
  console.log(`Connecting to database in ${isProduction ? 'production' : 'development'} mode...`);
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Ensure tables exist
    await ensureTablesExist(pool);
    
    // Load previous state
    const prevState = await loadPreviousState();
    console.log(`Previous check: ${prevState.lastRunDate || 'Never'}`);
    
    // Prepare new state
    const newState = {
      lastRunDate: formattedDate,
      latestActivityDate: prevState.latestActivityDate,
      knownViolations: { ...prevState.knownViolations }
    };
    
    // Calculate the date range for recent violations
    let lookbackDate;
    if (prevState.lastRunDate) {
      // If we have a previous run, look back from that date
      lookbackDate = new Date(prevState.lastRunDate);
    } else {
      // Otherwise use the default days lookback
      lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - DAYS);
    }
    const lookbackDateStr = getFormattedDate(lookbackDate);
    
    console.log(`Looking for changes since ${lookbackDateStr}...`);
    
    // Get violations that have been updated since the last check
    const [recentViolations] = await pool.query(`
      SELECT NON_COMPLIANCE_ID, OPERATION_ID, ACTIVITY_DATE, 
             STANDARD_RISK_LEVEL, STANDARD_NUMBER_DESCRIPTION, NARRATIVE,
             CORRECTED_AT_INSPECTION, CORRECTED_DATE, LAST_UPDATED
      FROM non_compliance
      WHERE LAST_UPDATED >= ? OR ACTIVITY_DATE >= ?
      ORDER BY LAST_UPDATED DESC
    `, [lookbackDateStr, lookbackDateStr]);
    
    console.log(`Found ${recentViolations.length} recently updated violations`);
    
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
        // New violation
        newViolations.push({
          ...violation,
          change_type: 'new'
        });
      } else {
        // Compare with previous state to see if updated
        const prevViolation = prevState.knownViolations[violationId];
        
        // Check if corrected status changed
        if (prevViolation.CORRECTED_AT_INSPECTION !== violation.CORRECTED_AT_INSPECTION ||
            (prevViolation.CORRECTED_DATE !== violation.CORRECTED_DATE && violation.CORRECTED_DATE)) {
          updatedViolations.push({
            ...violation,
            change_type: 'corrected',
            previous: prevViolation
          });
        } 
        // Check for other updates
        else if (violation.LAST_UPDATED && 
                 new Date(violation.LAST_UPDATED) > new Date(prevViolation.LAST_UPDATED)) {
          updatedViolations.push({
            ...violation,
            change_type: 'updated',
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
        CORRECTED_DATE: violation.CORRECTED_DATE,
        LAST_UPDATED: violation.LAST_UPDATED
      };
    }
    
    newState.latestActivityDate = latestActivityDate;
    
    // Process the changes - add to violation_changes table and create notification entries
    console.log(`Found ${newViolations.length} new violations and ${updatedViolations.length} updated violations`);
    
    let newViolationCount = 0;
    let updatedViolationCount = 0;
    let notificationCount = 0;
    
    // Process new violations
    for (const violation of newViolations) {
      const changeId = await recordViolationChange(pool, violation);
      if (changeId) {
        newViolationCount++;
        const notifications = await createNotificationEntries(pool, changeId, violation.OPERATION_ID);
        notificationCount += notifications;
      }
    }
    
    // Process updated violations
    for (const violation of updatedViolations) {
      const changeId = await recordViolationChange(pool, violation);
      if (changeId) {
        updatedViolationCount++;
        const notifications = await createNotificationEntries(pool, changeId, violation.OPERATION_ID);
        notificationCount += notifications;
      }
    }
    
    console.log(`Successfully recorded ${newViolationCount} new and ${updatedViolationCount} updated violations`);
    console.log(`Created ${notificationCount} notification entries for users with alerts`);
    
    // Update violation summary table
    await updateViolationSummary(pool);
    
    // Save the new state
    await saveState(newState);
    
    console.log('\nViolation tracking complete!');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  ensureTablesExist,
  updateViolationSummary,
  recordViolationChange,
  createNotificationEntries
};
