const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
require('dotenv').config();

// Get all alerts for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get alerts with pagination
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // MySQL2 doesn't allow ? placeholders for LIMIT and OFFSET in prepared statements
    // So we need to convert them to integers and insert them directly in the query
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);
    
    const [alerts] = await pool.execute(`
      SELECT * FROM alerts
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `, [userId]);

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM alerts
      WHERE user_id = ?
    `, [userId]);

    const total = countResult[0].total;

    return res.status(200).json({
      success: true,
      alerts,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve alerts due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Subscribe to a new alert
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { operationNumber, alertType } = req.body;

    if (!operationNumber || !alertType) {
      return res.status(400).json({
        success: false,
        message: 'Operation number and alert type are required'
      });
    }

    // Validate alert type
    const validAlertTypes = ['violation', 'inspection', 'rating_change', 'news'];
    if (!validAlertTypes.includes(alertType)) {
      return res.status(400).json({
        success: false,
        message: `Alert type must be one of: ${validAlertTypes.join(', ')}`
      });
    }

    // Check if already subscribed
    const [existingAlerts] = await pool.execute(`
      SELECT * FROM alerts
      WHERE user_id = ? AND operation_number = ? AND alert_type = ?
    `, [userId, operationNumber, alertType]);

    if (existingAlerts.length > 0) {
      // If already subscribed but inactive, reactivate it
      if (!existingAlerts[0].is_active) {
        await pool.execute(`
          UPDATE alerts
          SET is_active = 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [existingAlerts[0].id]);

        return res.status(200).json({
          success: true,
          message: 'Alert subscription reactivated successfully'
        });
      }

      return res.status(409).json({
        success: false,
        message: 'Already subscribed to this alert'
      });
    }

    // Add new alert subscription
    await pool.execute(`
      INSERT INTO alerts (user_id, operation_number, alert_type)
      VALUES (?, ?, ?)
    `, [userId, operationNumber, alertType]);

    return res.status(201).json({
      success: true,
      message: 'Subscribed to alert successfully'
    });
  } catch (error) {
    console.error('Subscribe to alert error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to subscribe to alert due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Unsubscribe from an alert
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { operationNumber, alertType } = req.body;

    if (!operationNumber || !alertType) {
      return res.status(400).json({
        success: false,
        message: 'Operation number and alert type are required'
      });
    }

    // Set alert as inactive (soft delete)
    const [result] = await pool.execute(`
      UPDATE alerts
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND operation_number = ? AND alert_type = ?
    `, [userId, operationNumber, alertType]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Alert subscription not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Unsubscribed from alert successfully'
    });
  } catch (error) {
    console.error('Unsubscribe from alert error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe from alert due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mark an alert as read
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Update alert to mark as read
    const [result] = await pool.execute(`
      UPDATE alerts
      SET is_read = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Alert marked as read successfully'
    });
  } catch (error) {
    console.error('Mark alert as read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark alert as read due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete an alert subscription completely
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Hard delete the alert
    const [result] = await pool.execute(`
      DELETE FROM alerts
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Alert subscription not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Alert subscription deleted successfully'
    });
  } catch (error) {
    console.error('Delete alert error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete alert subscription due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mark all alerts as read
router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Update all alerts to mark as read
    const [result] = await pool.execute(`
      UPDATE alerts
      SET is_read = 1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND is_read = 0
    `, [userId]);

    return res.status(200).json({
      success: true,
      message: `Marked ${result.affectedRows} alerts as read`
    });
  } catch (error) {
    console.error('Mark all alerts as read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all alerts as read due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Check if subscribed to specific alerts
router.get('/check/:operationNumber', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { operationNumber } = req.params;

    // Get all active alert subscriptions for this daycare
    const [alerts] = await pool.execute(`
      SELECT alert_type FROM alerts
      WHERE user_id = ? AND operation_number = ? AND is_active = 1
    `, [userId, operationNumber]);

    // Convert to object with alert types as keys
    const subscriptions = {};
    const alertTypes = ['violation', 'inspection', 'rating_change', 'news'];
    
    alertTypes.forEach(type => {
      subscriptions[type] = alerts.some(alert => alert.alert_type === type);
    });

    return res.status(200).json({
      success: true,
      subscriptions
    });
  } catch (error) {
    console.error('Check alert subscriptions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check alert subscriptions due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;