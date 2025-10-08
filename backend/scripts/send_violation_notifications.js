#!/usr/bin/env node

/**
 * Send Violation Email Notifications
 * 
 * This script:
 * 1. Checks for pending violation notifications
 * 2. Groups notifications by user
 * 3. Sends email notifications based on user preferences
 * 4. Updates notification status
 * 
 * It can be run hourly or daily via cron job.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
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

// Email configuration
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

// Create email transporter
const transporter = nodemailer.createTransport(emailConfig);

// Base URL for the site
const BASE_URL = isProduction ? 'https://daycarealert.com' : 'http://localhost:3000';

// Email template for violation notifications
function generateViolationEmailHtml(user, violations, daycares) {
  // Group violations by daycare
  const violationsByDaycare = {};
  
  violations.forEach(violation => {
    const daycareId = violation.operation_id;
    if (!violationsByDaycare[daycareId]) {
      violationsByDaycare[daycareId] = [];
    }
    violationsByDaycare[daycareId].push(violation);
  });
  
  let html = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #1890ff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { background-color: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; }
        .daycare { margin-bottom: 25px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
        .daycare-name { font-size: 18px; font-weight: bold; color: #1890ff; }
        .violation { margin: 15px 0; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #ccc; }
        .high-risk { border-left: 4px solid #f5222d; }
        .medium-high-risk { border-left: 4px solid #fa8c16; }
        .medium-risk { border-left: 4px solid #1890ff; }
        .low-risk { border-left: 4px solid #52c41a; }
        .risk-label { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; }
        .high-risk-label { background-color: #f5222d; }
        .medium-high-risk-label { background-color: #fa8c16; }
        .medium-risk-label { background-color: #1890ff; }
        .low-risk-label { background-color: #52c41a; }
        .violation-date { color: #888; font-size: 14px; }
        .violation-description { margin-top: 10px; }
        .cta-button { display: inline-block; background-color: #1890ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Daycare Alert Notification</h1>
      </div>
      <div class="content">
        <p>Hello ${user.full_name || 'there'},</p>
        <p>We're writing to inform you about new violation(s) that have been reported for daycare(s) you're monitoring.</p>
  `;
  
  // Add each daycare with its violations
  Object.keys(violationsByDaycare).forEach(daycareId => {
    const daycare = daycares.find(d => d.OPERATION_NUMBER === daycareId);
    const daycareViolations = violationsByDaycare[daycareId];
    
    if (daycare) {
      html += `
        <div class="daycare">
          <div class="daycare-name">${daycare.OPERATION_NAME}</div>
          <div>${daycare.STREET_ADDRESS}, ${daycare.CITY}, ${daycare.STATE} ${daycare.ZIP}</div>
          <p>The following new violation(s) have been reported:</p>
      `;
      
      daycareViolations.forEach(violation => {
        // Determine risk class
        let riskClass = '';
        let riskLabel = '';
        
        if (violation.standard_risk_level) {
          const level = violation.standard_risk_level.toLowerCase();
          if (level.includes('high') && !level.includes('medium')) {
            riskClass = 'high-risk';
            riskLabel = '<span class="risk-label high-risk-label">High Risk</span>';
          } else if (level.includes('medium high')) {
            riskClass = 'medium-high-risk';
            riskLabel = '<span class="risk-label medium-high-risk-label">Medium-High Risk</span>';
          } else if (level.includes('medium')) {
            riskClass = 'medium-risk';
            riskLabel = '<span class="risk-label medium-risk-label">Medium Risk</span>';
          } else {
            riskClass = 'low-risk';
            riskLabel = '<span class="risk-label low-risk-label">Low Risk</span>';
          }
        }
        
        const violationDate = violation.activity_date ? 
          new Date(violation.activity_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 
          'Unknown date';
          
        html += `
          <div class="violation ${riskClass}">
            ${riskLabel}
            <div class="violation-date">Reported on: ${violationDate}</div>
            <div class="violation-description">
              <strong>${violation.standard_number_description || 'Regulation violation'}</strong>
              <p>${violation.narrative || 'No details provided.'}</p>
              ${violation.corrected_at_inspection === 'Y' ? '<p><em>This violation was corrected during inspection.</em></p>' : ''}
            </div>
          </div>
        `;
      });
      
      html += `
          <a href="${BASE_URL}/daycare/${daycareId}" class="cta-button">View Daycare Details</a>
        </div>
      `;
    }
  });
  
  html += `
        <p>You're receiving this email because you've set up alerts for these daycares on DaycareAlert. If you no longer wish to receive these notifications, you can manage your alerts in your account settings.</p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} DaycareAlert. All rights reserved.</p>
        <p><a href="${BASE_URL}/account/alerts">Manage your alert settings</a></p>
      </div>
    </body>
    </html>
  `;
  
  return html;
}

// Function to send email notification to a user
async function sendEmailNotification(user, violations, daycares) {
  try {
    const emailHtml = generateViolationEmailHtml(user, violations, daycares);
    
    // Count violations and daycares for the subject line
    const daycareCount = new Set(violations.map(v => v.operation_id)).size;
    const violationCount = violations.length;
    
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'DaycareAlert'}" <${process.env.EMAIL_FROM || emailConfig.auth.user}>`,
      to: user.email,
      subject: `DaycareAlert: ${violationCount} New Violation${violationCount > 1 ? 's' : ''} for ${daycareCount} Daycare${daycareCount > 1 ? 's' : ''}`,
      html: emailHtml
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${user.email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`Error sending email to ${user.email}:`, err);
    return { success: false, error: err.message };
  }
}

// Get pending notification entries grouped by user
async function getPendingNotifications(pool) {
  try {
    const [notifications] = await pool.query(`
      SELECT 
        vn.id,
        vn.violation_change_id,
        vn.user_id,
        vn.alert_id,
        u.email,
        u.full_name,
        u.username,
        vc.operation_id,
        vc.non_compliance_id,
        vc.change_type,
        vc.activity_date,
        vc.standard_risk_level,
        vc.standard_number_description,
        vc.narrative,
        vc.corrected_at_inspection,
        a.frequency
      FROM 
        violation_notifications vn
      JOIN 
        users u ON vn.user_id = u.id
      JOIN 
        violation_changes vc ON vn.violation_change_id = vc.id
      JOIN 
        alerts a ON vn.alert_id = a.id
      WHERE 
        vn.delivery_status = 'pending'
        AND u.email IS NOT NULL
      ORDER BY 
        vn.user_id, vc.activity_date DESC
    `);

    return notifications;
  } catch (err) {
    console.error('Error getting pending notifications:', err);
    return [];
  }
}

// Get daycare details for the notifications
async function getDaycareDetails(pool, operationIds) {
  try {
    if (operationIds.length === 0) return [];
    
    const [daycares] = await pool.query(`
      SELECT 
        OPERATION_NUMBER, 
        OPERATION_ID,
        OPERATION_NAME, 
        STREET_ADDRESS, 
        CITY, 
        STATE, 
        ZIP, 
        COUNTY,
        OPERATION_TYPE
      FROM 
        daycare_operations
      WHERE 
        OPERATION_NUMBER IN (?)
    `, [operationIds]);

    return daycares;
  } catch (err) {
    console.error('Error getting daycare details:', err);
    return [];
  }
}

// Update notification status after sending
async function updateNotificationStatus(pool, notificationIds, status, messageId = null) {
  try {
    if (notificationIds.length === 0) return;
    
    // Construct status update with optional message ID
    let statusDetails = { delivery_status: status, sent_at: new Date() };
    if (messageId) statusDetails.message_id = messageId;
    
    // Update all notification records
    await pool.query(`
      UPDATE violation_notifications
      SET ? 
      WHERE id IN (?)
    `, [statusDetails, notificationIds]);
    
    return true;
  } catch (err) {
    console.error('Error updating notification status:', err);
    return false;
  }
}

// Update alert's last_sent field after sending notifications
async function updateAlertLastSent(pool, alertIds) {
  try {
    if (alertIds.length === 0) return;
    
    await pool.query(`
      UPDATE alerts
      SET last_sent = NOW()
      WHERE id IN (?)
    `, [alertIds]);
    
    return true;
  } catch (err) {
    console.error('Error updating alert last_sent:', err);
    return false;
  }
}

// Record alert history entry
async function recordAlertHistory(pool, alertId, messageContent, userId, deliveryStatus) {
  try {
    await pool.query(`
      INSERT INTO alert_history (
        alert_id,
        sent_at,
        message,
        delivery_status,
        event_data
      ) VALUES (?, NOW(), ?, ?, ?)
    `, [
      alertId,
      messageContent,
      deliveryStatus,
      JSON.stringify({ userId, type: 'violation_notification' })
    ]);
    
    return true;
  } catch (err) {
    console.error('Error recording alert history:', err);
    return false;
  }
}

// Main function
async function main() {
  console.log('=== Sending Violation Notifications ===');
  
  // Connect to database
  console.log(`Connecting to database in ${isProduction ? 'production' : 'development'} mode...`);
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Get pending notifications
    const pendingNotifications = await getPendingNotifications(pool);
    console.log(`Found ${pendingNotifications.length} pending notifications`);
    
    if (pendingNotifications.length === 0) {
      console.log('No pending notifications to send.');
      return;
    }
    
    // Group notifications by user
    const userNotifications = {};
    pendingNotifications.forEach(notification => {
      if (!userNotifications[notification.user_id]) {
        userNotifications[notification.user_id] = {
          user: {
            id: notification.user_id,
            email: notification.email,
            first_name: notification.first_name,
            last_name: notification.last_name
          },
          violations: [],
          notificationIds: [],
          alertIds: []
        };
      }
      
      userNotifications[notification.user_id].violations.push({
        violation_change_id: notification.violation_change_id,
        operation_id: notification.operation_id,
        non_compliance_id: notification.non_compliance_id,
        change_type: notification.change_type,
        activity_date: notification.activity_date,
        standard_risk_level: notification.standard_risk_level,
        standard_number_description: notification.standard_number_description,
        narrative: notification.narrative,
        corrected_at_inspection: notification.corrected_at_inspection
      });
      
      userNotifications[notification.user_id].notificationIds.push(notification.id);
      
      // Add alert ID if not already in the list
      if (!userNotifications[notification.user_id].alertIds.includes(notification.alert_id)) {
        userNotifications[notification.user_id].alertIds.push(notification.alert_id);
      }
    });
    
    // Get unique operation IDs
    const operationIds = [...new Set(pendingNotifications.map(n => n.operation_id))];
    
    // Get daycare details
    const daycares = await getDaycareDetails(pool, operationIds);
    console.log(`Retrieved details for ${daycares.length} daycares`);
    
    // Send emails for each user
    const userIds = Object.keys(userNotifications);
    console.log(`Preparing to send notifications to ${userIds.length} users`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const userId of userIds) {
      const userData = userNotifications[userId];
      console.log(`Processing notifications for user ${userData.user.email} (${userData.violations.length} violations)`);
      
      // Send email
      const sendResult = await sendEmailNotification(userData.user, userData.violations, daycares);
      
      if (sendResult.success) {
        // Update notification status to 'sent'
        await updateNotificationStatus(pool, userData.notificationIds, 'sent', sendResult.messageId);
        
        // Update alert last_sent
        await updateAlertLastSent(pool, userData.alertIds);
        
        // Record in alert history for each alert
        for (const alertId of userData.alertIds) {
          await recordAlertHistory(
            pool, 
            alertId, 
            `Sent ${userData.violations.length} violation notification(s) for ${operationIds.length} daycare(s)`,
            userId,
            'delivered'
          );
        }
        
        successCount++;
      } else {
        // Update notification status to 'failed'
        await updateNotificationStatus(pool, userData.notificationIds, 'failed');
        
        // Record in alert history
        for (const alertId of userData.alertIds) {
          await recordAlertHistory(
            pool, 
            alertId, 
            `Failed to send violation notifications: ${sendResult.error}`,
            userId,
            'failed'
          );
        }
        
        failCount++;
      }
    }
    
    console.log(`Notification sending complete: ${successCount} successful, ${failCount} failed`);
    
  } catch (err) {
    console.error('Error sending violation notifications:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  sendEmailNotification,
  getPendingNotifications,
  updateNotificationStatus,
  updateAlertLastSent,
  recordAlertHistory
};
