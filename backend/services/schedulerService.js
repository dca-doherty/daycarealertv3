/**
 * Scheduler Service
 * 
 * Handles scheduling and running background tasks at specified intervals
 */

const cron = require('node-cron');
const alertService = require('./alertService');
const logger = require('../utils/logger');

class SchedulerService {
  constructor() {
    this.tasks = {};
    this.initialized = false;
  }

  /**
   * Initialize the scheduler service
   */
  async init() {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize the alert service
      await alertService.init();
      logger.info('Alert service initialized');

      // Schedule tasks
      this.scheduleAlertChecks();
      this.scheduleDailyDigestEmails();
      
      this.initialized = true;
      logger.info('Scheduler service initialized');
    } catch (error) {
      logger.error('Failed to initialize scheduler service:', error);
      throw error;
    }
  }

  /**
   * Schedule regular alert checks
   */
  scheduleAlertChecks() {
    // Run every 30 minutes
    this.tasks.alertChecks = cron.schedule('*/30 * * * *', async () => {
      logger.info('Running scheduled alert check');
      try {
        await alertService.checkForAlerts();
        logger.info('Scheduled alert check completed');
      } catch (error) {
        logger.error('Error in scheduled alert check:', error);
      }
    });

    logger.info('Alert checks scheduled to run every 30 minutes');
  }

  /**
   * Schedule sending of daily digest emails
   */
  scheduleDailyDigestEmails() {
    // Run at 8:00 AM every day
    this.tasks.dailyDigest = cron.schedule('0 8 * * *', async () => {
      logger.info('Sending daily digest emails');
      try {
        await this.sendDailyDigestEmails();
        logger.info('Daily digest emails sent');
      } catch (error) {
        logger.error('Error sending daily digest emails:', error);
      }
    });

    logger.info('Daily digest emails scheduled to run at 8:00 AM daily');
  }

  /**
   * Send daily digest emails to users who prefer daily summaries
   */
  async sendDailyDigestEmails() {
    try {
      const { pool } = require('../config/db');
      const emailService = require('./emailService');

      // Get users who have opted for daily digest emails
      const [users] = await pool.execute(`
        SELECT DISTINCT u.id, u.username, u.email
        FROM users u
        JOIN user_preferences p ON u.id = p.user_id
        WHERE p.alert_frequency = 'daily'
        AND u.email IS NOT NULL
      `);

      logger.info(`Sending daily digest emails to ${users.length} users`);

      // Process each user
      for (const user of users) {
        // Get unread notifications for this user from the last 24 hours
        const [notifications] = await pool.execute(`
          SELECT n.*, d.operation_name AS daycare_name
          FROM notifications n
          LEFT JOIN daycares d ON n.operation_number = d.operation_number
          WHERE n.user_id = ?
          AND n.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
          ORDER BY n.created_at DESC
        `, [user.id]);

        // Send digest email if there are notifications
        if (notifications.length > 0) {
          await emailService.sendDailyDigestEmail(user, notifications);
          
          // Mark notifications as read
          await pool.execute(`
            UPDATE notifications
            SET is_read = 1
            WHERE user_id = ?
            AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
          `, [user.id]);
        }
      }
    } catch (error) {
      logger.error('Error sending daily digest emails:', error);
      throw error;
    }
  }

  /**
   * Run a manual alert check
   */
  async runManualAlertCheck() {
    logger.info('Running manual alert check');
    try {
      await alertService.checkForAlerts();
      logger.info('Manual alert check completed');
      return { success: true, message: 'Alert check completed successfully' };
    } catch (error) {
      logger.error('Error in manual alert check:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    Object.values(this.tasks).forEach(task => {
      if (task) {
        task.stop();
      }
    });
    logger.info('All scheduled tasks stopped');
  }
}

module.exports = new SchedulerService();