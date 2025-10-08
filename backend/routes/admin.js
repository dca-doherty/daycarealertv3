const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth-fixed');
const schedulerService = require('../services/schedulerService');
const logger = require('../utils/logger');
const adminRoutes = require('./adminRoutes');

// Middleware to check admin role
router.use(authenticateToken);
router.use(isAdmin);

// Run a manual check for alerts
router.post('/run-alert-check', async (req, res) => {
  try {
    logger.info('Manual alert check requested by admin');
    const result = await schedulerService.runManualAlertCheck();
    
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error running manual alert check:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to run alert check',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get recent notifications for all users (for admin dashboard)
router.get('/recent-notifications', async (req, res) => {
  try {
    const { pool } = require('../config/db');
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // Get recent notifications with user and daycare info
    const [notifications] = await pool.execute(`
      SELECT n.*, u.username, d.operation_name
      FROM notifications n
      JOIN users u ON n.user_id = u.id
      LEFT JOIN daycares d ON n.operation_number = d.operation_number
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);
    
    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total FROM notifications
    `);

    const total = countResult[0].total;
    
    return res.status(200).json({
      success: true,
      notifications,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching recent notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;