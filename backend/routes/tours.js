const express = require('express');
const router = express.Router();
const { createTourRequest, getAllTourRequests, getTourRequestsByDaycareId, updateTourRequestStatus } = require('../models/tourRequests');
const { authenticateToken, isAdmin } = require('../middleware/auth-fixed');
const logger = require('../utils/logger');

// Create a new tour request (public endpoint - no authentication required)
router.post('/', async (req, res) => {
  try {
    const tourData = req.body;
    console.log('Received tour request data:', JSON.stringify(tourData, null, 2));
    
    // Validate required fields
    const requiredFields = ['daycare_id', 'daycare_name', 'name', 'email', 'phone', 'tour_date', 'tour_time', 'child_count', 'age_groups'];
    for (const field of requiredFields) {
      if (!tourData[field]) {
        logger.error(`Missing required field in tour request: ${field}`);
        return res.status(400).json({ success: false, message: `Missing required field: ${field}` });
      }
    }
    
    logger.info(`Processing tour request for: ${tourData.name} at ${tourData.daycare_name}`);
    const result = await createTourRequest(tourData);
    logger.info(`Tour request created successfully with ID: ${result.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Tour request submitted successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error submitting tour request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit tour request',
      error: error.message
    });
  }
});

// Get all tour requests (admin only)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const tourRequests = await getAllTourRequests();
    res.json({
      success: true,
      data: tourRequests
    });
  } catch (error) {
    logger.error('Error retrieving tour requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tour requests',
      error: error.message
    });
  }
});

// Get tour requests for a specific daycare
router.get('/daycare/:daycareId', authenticateToken, async (req, res) => {
  try {
    const { daycareId } = req.params;
    
    // Check if user is admin or has permission for this daycare
    // (Implementation depends on your app's permission structure)
    
    const tourRequests = await getTourRequestsByDaycareId(daycareId);
    res.json({
      success: true,
      data: tourRequests
    });
  } catch (error) {
    logger.error(`Error retrieving tour requests for daycare ${req.params.daycareId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tour requests',
      error: error.message
    });
  }
});

// Update tour request status
router.patch('/:requestId/status', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;
    
    if (!status || !['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, confirmed, completed, or cancelled'
      });
    }
    
    // Check user permissions here
    
    const success = await updateTourRequestStatus(requestId, status);
    if (success) {
      res.json({
        success: true,
        message: 'Tour request status updated successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Tour request not found'
      });
    }
  } catch (error) {
    logger.error(`Error updating tour request ${req.params.requestId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tour request',
      error: error.message
    });
  }
});

module.exports = router;