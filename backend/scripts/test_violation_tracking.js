
#!/usr/bin/env node

/**
 * Test Violation Tracking System
 * 
 * This script tests the violation tracking and notification system by:
 * 1. Ensuring the necessary database tables exist
 * 2. Checking for recent violations in the non_compliance table
 * 3. Creating a test violation change record
 * 4. Creating a test notification entry (if a test user exists)
 * 5. Validating email configuration
 * 
 * This helps verify that the system is properly set up before deployment.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

// Import the tracking functions
const { ensureTablesExist } = require('./track_violation_changes');
const { sendEmailNotification } = require('./send_violation_notifications');

// Database configuration
const isProduction = process.env.NODE_ENV === 'production' || 
                     process.argv.includes('--production') || 
                     __dirname.includes('/var/www/');

const dbConfig = isProduction ? {
  // Production server configuration
  socketPath: '/var/run/mysqld/mysqld.sock',
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

// Email configuration for testing
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: process.env.EMAIL_SECURE !== 'false', // Default to true
  auth: {
    user: process.env.EMAIL_USER || 'info@daycarealert.com',
    pass: process.env.EMAIL_PASSWORD || 'Bd03021988!!'
  },
  // Allow less secure apps and handle invalid certificates
  tls: {
    rejectUnauthorized: false
  }
};

// Test function to verify email configuration
async function testEmailConfig() {
  try {
    console.log('Testing email configuration...');
    const transporter = nodemailer.createTransport(emailConfig);
    const result = await transporter.verify();
    console.log('✅ Email configuration is valid and connected to SMTP server');
    return true;
  } catch (err) {
    console.error('❌ Email configuration error:', err);
    return false;
  }
}

// Function to check for recent violations
async function checkRecentViolations(pool) {
  try {
    console.log('Checking for recent violations...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const [rows] = await pool.query(`
      SELECT 
        COUNT(*) as count,
        MAX(ACTIVITY_DATE) as latest_date,
        COUNT(DISTINCT OPERATION_ID) as unique_daycares
      FROM 
        non_compliance
      WHERE 
        ACTIVITY_DATE >= ?
    `, [dateStr]);
    
    if (rows[0].count > 0) {
      console.log(`✅ Found ${rows[0].count} violations in the last 30 days`);
      console.log(`✅ Latest violation date: ${rows[0].latest_date}`);
      console.log(`✅ Affecting ${rows[0].unique_daycares} unique daycares`);
      return true;
    } else {
      console.log('❌ No recent violations found in the non_compliance table');
      return false;
    }
  } catch (err) {
    console.error('❌ Error checking for recent violations:', err);
    return false;
  }
}

// Function to check for existing alerts
async function checkExistingAlerts(pool) {
  try {
    console.log('Checking for existing alerts...');
    const [rows] = await pool.query(`
      SELECT 
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as users,
        COUNT(DISTINCT operation_number) as daycares
      FROM 
        alerts
      WHERE 
        alert_type = 'violation'
        AND active = 1
    `);
    
    if (rows[0].count > 0) {
      console.log(`✅ Found ${rows[0].count} active violation alerts`);
      console.log(`✅ Set up by ${rows[0].users} users`);
      console.log(`✅ For ${rows[0].daycares} different daycares`);
      return true;
    } else {
      console.log('⚠️ No active violation alerts found. Notifications  wont be sent until users create alerts.');
      return true; // Not a failure, just a warning
    }
  } catch (err) {
    console.error('❌ Error checking for existing alerts:', err);
    return false;
  }
}

// Function to create a test violation change record
async function createTestViolationChange(pool) {
  try {
    console.log('Creating a test violation change record...');
    
    // First, get a real violation for reference
    const [violations] = await pool.query(`
      SELECT 
        NON_COMPLIANCE_ID, 
        OPERATION_ID, 
        ACTIVITY_DATE, 
        STANDARD_RISK_LEVEL, 
        STANDARD_NUMBER_DESCRIPTION, 
        NARRATIVE
      FROM 
        non_compliance
      ORDER BY 
        ACTIVITY_DATE DESC
      LIMIT 1
    `);
    
    if (violations.length === 0) {
      console.log('❌ No violations found to use as reference');
      return null;
    }
    
    const testViolation = violations[0];
    
    // Create a test record with a clear test marker
    const [result] = await pool.query(`
      INSERT INTO violation_changes (
        non_compliance_id,
        operation_id,
        change_type,
        activity_date,
        standard_risk_level,
        standard_number_description,
        narrative,
        corrected_at_inspection
      ) VALUES (
        ?,
        ?,
        'new',
        ?,
        ?,
        ?,
        'TEST RECORD - This is a test violation change for system validation. Please ignore.',
        'N'
      )
    `, [
      testViolation.NON_COMPLIANCE_ID + '_TEST',
      testViolation.OPERATION_ID,
      testViolation.ACTIVITY_DATE,
      testViolation.STANDARD_RISK_LEVEL,
      'TEST - ' + testViolation.STANDARD_NUMBER_DESCRIPTION
    ]);
    
    console.log(`✅ Created test violation change with ID ${result.insertId}`);
    
    // Get more details about the daycare for context
    const [daycares] = await pool.query(`
      SELECT 
        OPERATION_NUMBER, 
        OPERATION_NAME, 
        CITY, 
        STATE, 
        ZIP
      FROM 
        daycare_operations
      WHERE 
        OPERATION_NUMBER = ?
    `, [testViolation.OPERATION_ID]);
    
    if (daycares.length > 0) {
      console.log(`✅ Test violation is for daycare: ${daycares[0].OPERATION_NAME} in ${daycares[0].CITY}`);
    }
    
    return {
      changeId: result.insertId,
      violation: {
        ...testViolation,
        non_compliance_id: testViolation.NON_COMPLIANCE_ID + '_TEST',
        narrative: 'TEST RECORD - This is a test violation change for system validation. Please ignore.',
        standard_number_description: 'TEST - ' + testViolation.STANDARD_NUMBER_DESCRIPTION,
        change_type: 'new'
      },
      daycare: daycares[0] || null
    };
  } catch (err) {
    console.error('❌ Error creating test violation change:', err);
    return null;
  }
}

// Function to create a test notification entry
async function createTestNotification(pool, testData) {
  try {
    console.log('Creating a test notification entry...');
    
    // First, find a user with an email to test with
    // Get users with the correct field structure based on our database
    const [users] = await pool.query(`
      SELECT 
        id,
        email,
        username,
        full_name
      FROM 
        users
      WHERE 
        email IS NOT NULL
      LIMIT 1
    `);
    
    if (users.length === 0) {
      console.log('⚠️ No users found with email addresses. Cannot test notification delivery.');
      return null;
    }
    
    const testUser = users[0];
    console.log(`✅ Found test user: ${testUser.full_name || testUser.username || 'Unknown'} (${testUser.email})`);
    
    return await processTestUser(pool, testData, testUser);
  } catch (err) {
    console.error('❌ Error creating test notification:', err);
    return null;
  }
}

// Helper function to process test user for notification
const processTestUser = require('./processTestUser');

// Function to test sending a notification email
async function testSendEmail(testData, testNotification) {
  try {
    console.log('Testing email notification sending...');
    
    // Basic validation
    if (!testData || !testData.violation || !testNotification || !testNotification.user) {
      console.log('❌ Missing required test data for email test');
      return false;
    }
    
    // Create test data structure expected by sendEmailNotification
    const user = testNotification.user;
    const violations = [testData.violation];
    const daycares = [testData.daycare];
    
    // Attempt to send the email
    const result = await sendEmailNotification(user, violations, daycares);
    
    if (result.success) {
      console.log(`✅ Test email successfully sent to ${user.email} (message ID: ${result.messageId})`);
      
      // Mark the test notification as sent
      const pool = await mysql.createPool(dbConfig);
      await pool.query(`
        UPDATE violation_notifications
        SET delivery_status = 'sent', sent_at = NOW()
        WHERE id = ?
      `, [testNotification.notificationId]);
      
      await pool.end();
      return true;
    } else {
      console.error('❌ Failed to send test email:', result.error);
      return false;
    }
  } catch (err) {
    console.error('❌ Error testing email notification:', err);
    return false;
  }
}

// Cleanup function to remove test records
async function cleanupTestRecords(pool, testData, testNotification) {
  try {
    console.log('Cleaning up test records...');
    
    if (testNotification) {
      // Delete test notification
      await pool.query(`
        DELETE FROM violation_notifications
        WHERE id = ?
      `, [testNotification.notificationId]);
      console.log(`✅ Deleted test notification (ID: ${testNotification.notificationId})`);
      
      // Check if alert was temporary, and delete if so
      const [existingAlerts] = await pool.query(`
        SELECT * FROM alerts
        WHERE id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
      `, [testNotification.alertId]);
      
      if (existingAlerts.length > 0) {
        await pool.query(`
          DELETE FROM alerts
          WHERE id = ?
        `, [testNotification.alertId]);
        console.log(`✅ Deleted temporary test alert (ID: ${testNotification.alertId})`);
      }
    }
    
    if (testData) {
      // Delete test violation change
      await pool.query(`
        DELETE FROM violation_changes
        WHERE id = ?
      `, [testData.changeId]);
      console.log(`✅ Deleted test violation change (ID: ${testData.changeId})`);
    }
    
    return true;
  } catch (err) {
    console.error('❌ Error cleaning up test records:', err);
    return false;
  }
}

// Main function
async function main() {
  console.log('=== Testing Violation Tracking System ===\n');
  
  // Connect to database
  console.log(`Connecting to database in ${isProduction ? 'production' : 'development'} mode...`);
  const pool = mysql.createPool(dbConfig);
  
  try {
    let testOutcome = {
      tablesExist: false,
      recentViolations: false,
      alertsExist: false,
      emailConfig: false,
      testCreation: false,
      emailSending: false
    };
    
    let testData = null;
    let testNotification = null;
    
    // Step 1: Ensure database tables exist
    console.log('\n--- STEP 1: Database Tables ---');
    testOutcome.tablesExist = await ensureTablesExist(pool);
    
    // Step 2: Check for recent violations
    console.log('\n--- STEP 2: Recent Violations ---');
    testOutcome.recentViolations = await checkRecentViolations(pool);
    
    // Step 3: Check for existing alerts
    console.log('\n--- STEP 3: Alert Configuration ---');
    testOutcome.alertsExist = await checkExistingAlerts(pool);
    
    // Step 4: Verify email configuration
    console.log('\n--- STEP 4: Email Configuration ---');
    testOutcome.emailConfig = await testEmailConfig();
    
    // Step 5: Create test records
    console.log('\n--- STEP 5: Test Data Creation ---');
    testData = await createTestViolationChange(pool);
    if (testData) {
      testNotification = await createTestNotification(pool, testData);
      testOutcome.testCreation = !!testNotification;
    }
    
    // Step 6: Test email sending
    if (testOutcome.emailConfig && testOutcome.testCreation) {
      console.log('\n--- STEP 6: Email Sending Test ---');
      
      // Prompt for confirmation to send test email
      console.log('Ready to send a test email notification.');
      console.log(`Email will be sent to: ${testNotification.user.email}`);
      
      // In a real interactive environment, you would prompt for confirmation
      // Since this script may run non-interactively, we'll proceed automatically
      console.log('Proceeding with email test...');
      
      testOutcome.emailSending = await testSendEmail(testData, testNotification);
    }
    
    // Cleanup test records
    console.log('\n--- Cleanup ---');
    await cleanupTestRecords(pool, testData, testNotification);
    
    // Summary report
    console.log('\n=== Test Summary ===');
    console.log(`Database Tables: ${testOutcome.tablesExist ? '✅ Ready' : '❌ Failed'}`);
    console.log(`Recent Violations: ${testOutcome.recentViolations ? '✅ Found' : '⚠️ None found'}`);
    console.log(`Alerts Configuration: ${testOutcome.alertsExist ? '✅ Ready' : '⚠️ None found'}`);
    console.log(`Email Configuration: ${testOutcome.emailConfig ? '✅ Valid' : '❌ Failed'}`);
    console.log(`Test Data Creation: ${testOutcome.testCreation ? '✅ Success' : '❌ Failed'}`);
    
    if (testOutcome.emailConfig && testOutcome.testCreation) {
      console.log(`Email Sending Test: ${testOutcome.emailSending ? '✅ Success' : '❌ Failed'}`);
    } else {
      console.log(`Email Sending Test: ⚠️ Skipped (prerequisites failed)`);
    }
    
    console.log('\nOverall System Status:');
    if (testOutcome.tablesExist && testOutcome.emailConfig) {
      console.log('✅ System is ready for tracking violations and sending notifications');
      
      if (!testOutcome.alertsExist) {
        console.log('⚠️ Note: No violation alerts are currently set up by users');
      }
      
      if (!testOutcome.recentViolations) {
        console.log('⚠️ Note: No recent violations found in the database');
      }
    } else {
      console.log('❌ System is not fully ready - fix the issues above before deployment');
    }
    
  } catch (err) {
    console.error('Error running tests:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}
