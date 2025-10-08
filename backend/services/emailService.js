/**
 * Email Service
 * 
 * Handles sending emails to users for alerts, notifications,
 * and system messages.
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
require('dotenv').config();

// Create a transporter with configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: 'info@daycarealert.com',
    pass: 'Bd03021988!!',
  },
});

/**
 * Format a date to a readable string
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @returns {Promise<Object>} - Email send result
 */
const sendEmail = async (options) => {
  try {
    // Skip sending emails in development/test mode if flag is set
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_EMAILS === 'true') {
      logger.info(`[DEV MODE] Would send email: ${options.subject} to ${options.to}`);
      return { messageId: 'dev-mode-skipped' };
    }

    // Set default from address if not provided
    const fromEmail = process.env.EMAIL_FROM || 'info@daycarealert.com';
    const fromName = process.env.EMAIL_FROM_NAME || 'DaycareAlert';

    // Add footer to HTML content if it exists
    if (options.html) {
      options.html += `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>&copy; ${new Date().getFullYear()} DaycareAlert. All rights reserved.</p>
          <p>This email was sent at ${formatDate(new Date())}.</p>
        </div>
      `;
    }

    // Send the email
    const result = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    });

    logger.info(`Email sent to ${options.to}: ${options.subject} [${result.messageId}]`);
    return result;
  } catch (error) {
    logger.error(`Error sending email to ${options.to}:`, error);
    throw error;
  }
};
/**
   * Send a welcome email to a new user with verification link
   * @param {Object} user - User object
   * @param {string} verificationToken - Optional verification token
   * @returns {Promise<Object>} - Email send result
 */
const sendWelcomeEmail = async (user, verificationToken) => {
  const subject = 'Welcome to DaycareAlert!';
  const siteUrl = process.env.FRONTEND_URL || 'https://daycarealert.com';
  // Add verification section if token is provided
  let verificationSection = '';
  if (verificationToken) {
    const verifyUrl = `${siteUrl}/verify/${verificationToken}`;
    verificationSection = `
      <div style="background-color: #fff8e1; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffe082;">
        <h3 style="color: #ff9800; margin-top: 0;">Verify Your Email Address</h3>
        <p>Please verify your email address to fully activate your account. Click the button below:</p>
        <div style="text-align: center; margin: 15px 0;">
          <a href="${verifyUrl}" style="background-color: #ff9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            Verify Email
          </a>
        </div>
        <p style="font-size: 12px; color: #666;">This link will expire in 24 hours.</p>
      </div>
    `;
  }
   const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
	<img src="https://daycarealert.com/logo192.png" alt="DaycareAlert Logo" width="100" style="max-width: 100px;">
      </div>
      <h2 style="color: #0275d8; text-align: center;">Welcome to DaycareAlert!</h2>
      <p>Hello ${user.username || user.first_name || user.email},</p>
      <p>Thank you for creating an account with DaycareAlert. We're excited to help you stay informed about childcare options in Texas!</p>
      
      ${verificationSection}
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
	<h3 style="color: #0275d8; margin-top: 0;">Getting Started:</h3>
	<ol style="margin-bottom: 0;">
	 <li><strong>Search for daycares</strong> in your area by city, rating, and more</li>
	 <li><strong>Compare facilities</strong> side-by-side to find the best fit for your family</li>
	 <li><strong>Follow your favorites</strong> to receive alerts about changes</li>
	 <li><strong>Set up notifications</strong> for violations, ratings, and more</li>
	</ol>
      </div>
      
      <div style="text-align: center; margin: 25px 0;">
         <a href="${siteUrl}/home" style="background-color: #0275d8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          Get Started
        </a>
      </div>
      
      <div style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 25px;">
	<p>If you have any questions or need assistance, please don't hesitate to contact our support team at <ahref="mailto:info@daycarealert.com">info@daycarealert.com</a>.</p>
        <p>Best regards,<br>The DaycareAlert Team</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject,
    html
  });
};

/**
 * Send a password reset email
 * @param {Object} user - User object
 * @param {string} resetToken - Password reset token
 * @returns {Promise<Object>} - Email send result
 */
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'https://daycarealert.com'}/reset-password/${resetToken}`;
  const subject = 'Password Reset - DaycareAlert';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://daycarealert.com/logo192.png" alt="DaycareAlert Logo" width="100" style="max-width: 100px;">
      </div>
      <h2 style="color: #0275d8; text-align: center;">Password Reset Request</h2>
      <p>Hello ${user.username || user.first_name || user.email},</p>
      <p>You've requested to reset your password. Click the button below to create a new password:</p>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${resetUrl}" style="background-color: #0275d8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          Reset Password
        </a>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin-top: 0;"><strong>Important:</strong> This link will expire in 1 hour.</p>
	<p style="margin-bottom: 0;">If you didn't request this password reset, please ignore this email or <a href="mailto:info@daycarealert.com">contact support</a> if you have concerns.</p>
      <div style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 25px;">
	<p>Best regards,<br>The DaycareAlert Team</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject,
    html
  });
};

/**
 * Send a daily digest email with all alerts for a user
 * @param {Object} user - User object
 * @param {Array} alerts - Array of alerts
 * @returns {Promise<Object>} - Email send result
 */
const sendDailyDigestEmail = async (user, alerts) => {
  if (!alerts || alerts.length === 0) {
    logger.info(`No alerts to send in daily digest for user ${user.id}`);
    return null;
  }

  // Group alerts by daycare
  const alertsByDaycare = {};
  alerts.forEach(alert => {
    if (!alertsByDaycare[alert.operation_number]) {
      alertsByDaycare[alert.operation_number] = {
        daycare_name: alert.daycare_name || `Daycare #${alert.operation_number}`,
        alerts: []
      };
    }
    alertsByDaycare[alert.operation_number].alerts.push(alert);
  });

  // Format each daycare's alerts
  let alertsHtml = '';
  Object.keys(alertsByDaycare).forEach(operationNumber => {
    const daycareAlerts = alertsByDaycare[operationNumber];
    
    alertsHtml += `
      <div style="margin-bottom: 30px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h3 style="color: #2c3e50; margin-top: 0;">${daycareAlerts.daycare_name}</h3>
        <ul style="padding-left: 20px;">
    `;
    
    daycareAlerts.alerts.forEach(alert => {
      let icon = '🔔';
      let color = '#3498db';
      
      if (alert.alert_type === 'violation') {
        icon = '⚠️';
        color = '#e74c3c';
      } else if (alert.alert_type === 'rating_change') {
        icon = '⭐';
        color = '#f39c12';
      } else if (alert.alert_type === 'inspection') {
        icon = '🔍';
        color = '#27ae60';
      }
      
      alertsHtml += `
        <li style="margin-bottom: 10px;">
          <span style="color: ${color};">${icon} <strong>${alert.alert_type.replace('_', ' ').toUpperCase()}</strong></span>: 
          ${alert.message} - <em>${formatDate(alert.created_at)}</em>
        </li>
      `;
    });
    
    alertsHtml += `
        </ul>
      </div>
    `;
  });
  const siteUrl = process.env.FRONTEND_URL || 'https://daycarealert.com';
  const subject = `DaycareAlert Daily Digest - ${new Date().toLocaleDateString()}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://daycarealert.com/logo192.png" alt="DaycareAlert Logo" width="100" style="max-width: 100px;">
      </div>
      <h2 style="color: #0275d8; text-align: center;">Your Daily Alert Digest</h2>
      <p>Hello ${user.username || user.first_name || user.email},</p>
      <p>Here's a summary of today's alerts for the daycares you're following:</p>
      
      ${alertsHtml}
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${siteUrl}/alerts" style="background-color: #0275d8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          View All Alerts
        </a>
      </div>
      
      <div style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 25px; font-size: 12px; color: #7f8c8d;">
	<p>
	  You're receiving this email because you've opted for daily digest emails.
	  <br>
	  To change your preferences, visit your <a href="${siteUrl}/alerts">Alert Settings</a>.
	</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject,
    html
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendDailyDigestEmail
};
