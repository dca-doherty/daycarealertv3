/**
 * Alert Service
 * 
 * This service:
 * 1. Checks external data sources for changes
 * 2. Compares with previous data
 * 3. Creates alert records when differences are found
 * 4. Triggers notifications to subscribed users
 */

const { pool } = require('../config/db');
const { sendEmail } = require('./emailService');
const logger = require('../utils/logger');

class AlertService {
  constructor() {
    this.lastCheckTime = new Map();
    this.dataCache = new Map();
  }

  /**
   * Initialize the service 
   */
  async init() {
    // Load initial data for comparison
    await this.loadInitialData();
    logger.info('Alert service initialized');
  }

  /**
   * Load initial baseline data for all tracked daycares
   */
  async loadInitialData() {
    try {
      // Get all distinct daycares with active alert subscriptions
      const [daycares] = await pool.execute(`
        SELECT DISTINCT operation_number 
        FROM alerts 
        WHERE is_active = 1
      `);

      // Load current data for each daycare for baseline comparison
      for (const daycare of daycares) {
        const operationNumber = daycare.operation_number;
        const data = await this.fetchDaycareData(operationNumber);
        this.dataCache.set(operationNumber, data);
        this.lastCheckTime.set(operationNumber, new Date());
      }

      logger.info(`Loaded initial data for ${daycares.length} daycares`);
    } catch (error) {
      logger.error('Error loading initial data:', error);
    }
  }

  /**
   * Run the alert check process
   */
  async checkForAlerts() {
    try {
      logger.info('Starting alert check process');
      
      // Get all distinct daycares with active alert subscriptions
      const [daycares] = await pool.execute(`
        SELECT DISTINCT operation_number 
        FROM alerts 
        WHERE is_active = 1
      `);

      logger.info(`Checking ${daycares.length} daycares for changes`);

      // Process each daycare
      for (const daycare of daycares) {
        const operationNumber = daycare.operation_number;
        await this.checkDaycareForChanges(operationNumber);
      }

      logger.info('Alert check process completed');
    } catch (error) {
      logger.error('Error in check for alerts process:', error);
    }
  }

  /**
   * Check a specific daycare for changes
   * @param {string} operationNumber - Daycare operation number
   */
  async checkDaycareForChanges(operationNumber) {
    try {
      // Fetch current data from external source
      const currentData = await this.fetchDaycareData(operationNumber);
      
      // Get previous data from cache
      const previousData = this.dataCache.get(operationNumber);
      
      if (!previousData) {
        // If no previous data, just save current as baseline
        this.dataCache.set(operationNumber, currentData);
        this.lastCheckTime.set(operationNumber, new Date());
        logger.info(`Initial data saved for daycare ${operationNumber}`);
        return;
      }

      // Compare data and get changes
      const changes = this.findChanges(previousData, currentData);
      
      // If changes detected, create alerts
      if (Object.keys(changes).length > 0) {
        await this.createAlerts(operationNumber, changes);
      }

      // Update cache with current data
      this.dataCache.set(operationNumber, currentData);
      this.lastCheckTime.set(operationNumber, new Date());
    } catch (error) {
      logger.error(`Error checking daycare ${operationNumber} for changes:`, error);
    }
  }

  /**
   * Fetch daycare data from external sources
   * @param {string} operationNumber - Daycare operation number
   * @returns {Object} - Daycare data
   */
  async fetchDaycareData(operationNumber) {
    try {
      // In a real implementation, this would call external APIs or scrape data
      // For demo purposes, we'll fetch from our own database
      const [daycareData] = await pool.execute(`
        SELECT * FROM daycares WHERE operation_number = ?
      `, [operationNumber]);

      // If no data found, return empty object
      if (!daycareData || daycareData.length === 0) {
        return {};
      }

      // Get violations data
      const [violations] = await pool.execute(`
        SELECT * FROM violations WHERE operation_number = ?
        ORDER BY violation_date DESC LIMIT 10
      `, [operationNumber]);

      // Get inspections data
      const [inspections] = await pool.execute(`
        SELECT * FROM inspections WHERE operation_number = ?
        ORDER BY inspection_date DESC LIMIT 5
      `, [operationNumber]);

      return {
        daycare: daycareData[0],
        violations: violations || [],
        inspections: inspections || [],
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error(`Error fetching data for daycare ${operationNumber}:`, error);
      return {};
    }
  }

  /**
   * Compare previous and current data to find changes
   * @param {Object} previousData - Previous data
   * @param {Object} currentData - Current data
   * @returns {Object} - Object containing detected changes
   */
  findChanges(previousData, currentData) {
    const changes = {};

    // Skip if either dataset is empty
    if (!previousData || !currentData || 
        Object.keys(previousData).length === 0 || 
        Object.keys(currentData).length === 0) {
      return changes;
    }

    // Check for new violations
    if (currentData.violations && previousData.violations) {
      const newViolations = currentData.violations.filter(current => {
        // Consider a violation new if no matching violation_id exists in previous data
        return !previousData.violations.some(prev => 
          prev.violation_id === current.violation_id
        );
      });

      if (newViolations.length > 0) {
        changes.violations = newViolations;
      }
    }

    // Check for new inspections
    if (currentData.inspections && previousData.inspections) {
      const newInspections = currentData.inspections.filter(current => {
        // Consider an inspection new if no matching inspection_id exists in previous data
        return !previousData.inspections.some(prev => 
          prev.inspection_id === current.inspection_id
        );
      });

      if (newInspections.length > 0) {
        changes.inspections = newInspections;
      }
    }

    // Check for rating changes
    if (previousData.daycare && currentData.daycare) {
      const previous = previousData.daycare;
      const current = currentData.daycare;

      // Compare rating relevant fields
      if (previous.rating !== current.rating || 
          previous.total_capacity !== current.total_capacity ||
          previous.total_inspections_2yr !== current.total_inspections_2yr ||
          previous.total_violations_2yr !== current.total_violations_2yr) {
        
        changes.rating_change = {
          previous: {
            rating: previous.rating,
            total_capacity: previous.total_capacity,
            total_inspections_2yr: previous.total_inspections_2yr,
            total_violations_2yr: previous.total_violations_2yr
          },
          current: {
            rating: current.rating,
            total_capacity: current.total_capacity,
            total_inspections_2yr: current.total_inspections_2yr,
            total_violations_2yr: current.total_violations_2yr
          }
        };
      }
    }

    return changes;
  }

  /**
   * Create alert records and notify users
   * @param {string} operationNumber - Daycare operation number
   * @param {Object} changes - Detected changes
   */
  async createAlerts(operationNumber, changes) {
    try {
      // Get daycare details for the alerts
      const [daycareResult] = await pool.execute(`
        SELECT operation_name FROM daycares WHERE operation_number = ?
      `, [operationNumber]);
      
      const daycareName = daycareResult && daycareResult.length > 0 
        ? daycareResult[0].operation_name 
        : `Daycare #${operationNumber}`;

      // Create alerts for each type of change
      if (changes.violations) {
        await this.createViolationAlerts(operationNumber, daycareName, changes.violations);
      }

      if (changes.inspections) {
        await this.createInspectionAlerts(operationNumber, daycareName, changes.inspections);
      }

      if (changes.rating_change) {
        await this.createRatingChangeAlert(operationNumber, daycareName, changes.rating_change);
      }

      logger.info(`Created alerts for daycare ${operationNumber} (${daycareName})`);
    } catch (error) {
      logger.error(`Error creating alerts for daycare ${operationNumber}:`, error);
    }
  }

  /**
   * Create violation alerts
   * @param {string} operationNumber - Daycare operation number
   * @param {string} daycareName - Daycare name
   * @param {Array} violations - New violations
   */
  async createViolationAlerts(operationNumber, daycareName, violations) {
    try {
      // Get users subscribed to violation alerts for this daycare
      const [subscribers] = await pool.execute(`
        SELECT a.user_id, u.email, u.username 
        FROM alerts a
        JOIN users u ON a.user_id = u.id
        WHERE a.operation_number = ? 
        AND a.alert_type = 'violation'
        AND a.is_active = 1
      `, [operationNumber]);

      if (subscribers.length === 0) {
        return;
      }

      // Create alert message
      const violationCount = violations.length;
      const message = `${violationCount} new violation${violationCount > 1 ? 's' : ''} reported for ${daycareName}`;
      
      // Create notification records for each subscriber
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      for (const subscriber of subscribers) {
        // Insert notification to database
        await pool.execute(`
          INSERT INTO notifications (user_id, operation_number, alert_type, message, is_read, created_at)
          VALUES (?, ?, 'violation', ?, 0, ?)
        `, [subscriber.user_id, operationNumber, message, now]);
        
        // Send email notification if email is available
        if (subscriber.email) {
          await this.sendAlertEmail(
            subscriber.email,
            `New Violation Alert for ${daycareName}`,
            this.formatViolationEmailContent(daycareName, violations, subscriber.username)
          );
        }
      }
      
      logger.info(`Created ${subscribers.length} violation alerts for daycare ${operationNumber}`);
    } catch (error) {
      logger.error(`Error creating violation alerts for ${operationNumber}:`, error);
    }
  }

  /**
   * Create inspection alerts
   * @param {string} operationNumber - Daycare operation number
   * @param {string} daycareName - Daycare name
   * @param {Array} inspections - New inspections
   */
  async createInspectionAlerts(operationNumber, daycareName, inspections) {
    try {
      // Get users subscribed to inspection alerts for this daycare
      const [subscribers] = await pool.execute(`
        SELECT a.user_id, u.email, u.username 
        FROM alerts a
        JOIN users u ON a.user_id = u.id
        WHERE a.operation_number = ? 
        AND a.alert_type = 'inspection'
        AND a.is_active = 1
      `, [operationNumber]);

      if (subscribers.length === 0) {
        return;
      }

      // Create alert message
      const inspectionCount = inspections.length;
      const message = `${inspectionCount} new inspection${inspectionCount > 1 ? 's' : ''} for ${daycareName}`;
      
      // Create notification records for each subscriber
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      for (const subscriber of subscribers) {
        // Insert notification to database
        await pool.execute(`
          INSERT INTO notifications (user_id, operation_number, alert_type, message, is_read, created_at)
          VALUES (?, ?, 'inspection', ?, 0, ?)
        `, [subscriber.user_id, operationNumber, message, now]);
        
        // Send email notification if email is available
        if (subscriber.email) {
          await this.sendAlertEmail(
            subscriber.email,
            `New Inspection Alert for ${daycareName}`,
            this.formatInspectionEmailContent(daycareName, inspections, subscriber.username)
          );
        }
      }
      
      logger.info(`Created ${subscribers.length} inspection alerts for daycare ${operationNumber}`);
    } catch (error) {
      logger.error(`Error creating inspection alerts for ${operationNumber}:`, error);
    }
  }

  /**
   * Create rating change alert
   * @param {string} operationNumber - Daycare operation number
   * @param {string} daycareName - Daycare name
   * @param {Object} ratingChange - Rating change data
   */
  async createRatingChangeAlert(operationNumber, daycareName, ratingChange) {
    try {
      // Get users subscribed to rating change alerts for this daycare
      const [subscribers] = await pool.execute(`
        SELECT a.user_id, u.email, u.username 
        FROM alerts a
        JOIN users u ON a.user_id = u.id
        WHERE a.operation_number = ? 
        AND a.alert_type = 'rating_change'
        AND a.is_active = 1
      `, [operationNumber]);

      if (subscribers.length === 0) {
        return;
      }

      // Create alert message
      const message = `Rating information updated for ${daycareName}`;
      
      // Create notification records for each subscriber
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      for (const subscriber of subscribers) {
        // Insert notification to database
        await pool.execute(`
          INSERT INTO notifications (user_id, operation_number, alert_type, message, is_read, created_at)
          VALUES (?, ?, 'rating_change', ?, 0, ?)
        `, [subscriber.user_id, operationNumber, message, now]);
        
        // Send email notification if email is available
        if (subscriber.email) {
          await this.sendAlertEmail(
            subscriber.email,
            `Rating Change Alert for ${daycareName}`,
            this.formatRatingChangeEmailContent(daycareName, ratingChange, subscriber.username)
          );
        }
      }
      
      logger.info(`Created ${subscribers.length} rating change alerts for daycare ${operationNumber}`);
    } catch (error) {
      logger.error(`Error creating rating change alerts for ${operationNumber}:`, error);
    }
  }

  /**
   * Send alert email notification
   * @param {string} email - Recipient email
   * @param {string} subject - Email subject
   * @param {string} content - Email content (HTML)
   */
  async sendAlertEmail(email, subject, content) {
    try {
      await sendEmail({
        to: email,
        subject: subject,
        html: content
      });
      logger.info(`Sent alert email to ${email}: ${subject}`);
    } catch (error) {
      logger.error(`Error sending alert email to ${email}:`, error);
    }
  }

  /**
   * Format violation email content
   * @param {string} daycareName - Daycare name
   * @param {Array} violations - Violations
   * @param {string} username - Recipient username
   * @returns {string} - Formatted HTML content
   */
  formatViolationEmailContent(daycareName, violations, username) {
    const violationList = violations.map(v => `
      <li>
        <strong>${v.risk_level || 'Standard'} Risk</strong> - 
        ${new Date(v.violation_date).toLocaleDateString()}
        <p>${v.violation_description || v.description || 'No description provided'}</p>
      </li>
    `).join('');

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">New Violation Alert</h2>
        <p>Hello ${username},</p>
        <p>We've detected ${violations.length} new violation${violations.length > 1 ? 's' : ''} for <strong>${daycareName}</strong>.</p>
        
        <h3 style="color: #e74c3c;">Violation Details:</h3>
        <ul style="list-style-type: none; padding-left: 0;">
          ${violationList}
        </ul>
        
        <p>
          <a href="http://localhost:3000/alerts" style="background-color: #3498db; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 15px;">
            View in DaycareAlert
          </a>
        </p>
        
        <p style="margin-top: 30px; font-size: 12px; color: #7f8c8d;">
          You're receiving this email because you subscribed to violation alerts for this daycare.
          <br>
          To manage your alert preferences, visit your <a href="http://localhost:3000/alerts">Alert Settings</a>.
        </p>
      </div>
    `;
  }

  /**
   * Format inspection email content
   * @param {string} daycareName - Daycare name
   * @param {Array} inspections - Inspections
   * @param {string} username - Recipient username
   * @returns {string} - Formatted HTML content
   */
  formatInspectionEmailContent(daycareName, inspections, username) {
    const inspectionList = inspections.map(i => `
      <li>
        <strong>${i.inspection_type || 'Standard'} Inspection</strong> - 
        ${new Date(i.inspection_date).toLocaleDateString()}
        <p>${i.result || 'Inspection completed'}</p>
      </li>
    `).join('');

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">New Inspection Alert</h2>
        <p>Hello ${username},</p>
        <p>We've detected ${inspections.length} new inspection${inspections.length > 1 ? 's' : ''} for <strong>${daycareName}</strong>.</p>
        
        <h3 style="color: #3498db;">Inspection Details:</h3>
        <ul style="list-style-type: none; padding-left: 0;">
          ${inspectionList}
        </ul>
        
        <p>
          <a href="http://localhost:3000/alerts" style="background-color: #3498db; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 15px;">
            View in DaycareAlert
          </a>
        </p>
        
        <p style="margin-top: 30px; font-size: 12px; color: #7f8c8d;">
          You're receiving this email because you subscribed to inspection alerts for this daycare.
          <br>
          To manage your alert preferences, visit your <a href="http://localhost:3000/alerts">Alert Settings</a>.
        </p>
      </div>
    `;
  }

  /**
   * Format rating change email content
   * @param {string} daycareName - Daycare name
   * @param {Object} ratingChange - Rating change data
   * @param {string} username - Recipient username
   * @returns {string} - Formatted HTML content
   */
  formatRatingChangeEmailContent(daycareName, ratingChange, username) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Rating Change Alert</h2>
        <p>Hello ${username},</p>
        <p>We've detected changes to the rating information for <strong>${daycareName}</strong>.</p>
        
        <h3 style="color: #27ae60;">Rating Changes:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px;">
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Metric</th>
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Previous</th>
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Current</th>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">Rating</td>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${ratingChange.previous.rating || 'N/A'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${ratingChange.current.rating || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">Capacity</td>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${ratingChange.previous.total_capacity || 'N/A'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${ratingChange.current.total_capacity || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">Inspections (2yr)</td>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${ratingChange.previous.total_inspections_2yr || 'N/A'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${ratingChange.current.total_inspections_2yr || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">Violations (2yr)</td>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${ratingChange.previous.total_violations_2yr || 'N/A'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${ratingChange.current.total_violations_2yr || 'N/A'}</td>
          </tr>
        </table>
        
        <p>
          <a href="http://localhost:3000/alerts" style="background-color: #3498db; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 15px;">
            View in DaycareAlert
          </a>
        </p>
        
        <p style="margin-top: 30px; font-size: 12px; color: #7f8c8d;">
          You're receiving this email because you subscribed to rating change alerts for this daycare.
          <br>
          To manage your alert preferences, visit your <a href="http://localhost:3000/alerts">Alert Settings</a>.
        </p>
      </div>
    `;
  }
}

module.exports = new AlertService();