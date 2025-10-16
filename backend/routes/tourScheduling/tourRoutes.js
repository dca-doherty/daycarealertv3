const express = require('express');
const router = express.Router();
const tourRequestService = require('../../services/tourScheduling/tourRequestService');
const emailService = require('../../services/tourScheduling/emailService');

/**
 * POST /api/tour-requests
 * Create a new tour request
 */
router.post('/', async (req, res) => {
  try {
    const { parentInfo, selectedDaycares } = req.body;
    
    // Validation
    if (!parentInfo || !selectedDaycares || selectedDaycares.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    if (selectedDaycares.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 daycares allowed per request'
      });
    }
    
    // Create tour request
    const result = await tourRequestService.createTourRequest(parentInfo, selectedDaycares);
    
    // Send confirmation email to parent
    await emailService.sendParentConfirmationEmail(
      result.tourRequestId,
      parentInfo,
      selectedDaycares
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('Error creating tour request:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting tour request',
      error: error.message
    });
  }
});

/**
 * GET /api/tour-requests/:id
 * Get tour request details
 */
router.get('/:id', async (req, res) => {
  try {
    const tourRequest = await tourRequestService.getTourRequest(req.params.id);
    
    if (!tourRequest) {
      return res.status(404).json({
        success: false,
        message: 'Tour request not found'
      });
    }
    
    res.json({
      success: true,
      tourRequest
    });
    
  } catch (error) {
    console.error('Error fetching tour request:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tour request',
      error: error.message
    });
  }
});

/**
 * GET /api/tour-requests
 * Get all tour requests (admin)
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      fromDate: req.query.fromDate,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };
    
    const requests = await tourRequestService.getAllTourRequests(filters);
    
    res.json({
      success: true,
      requests,
      total: requests.length
    });
    
  } catch (error) {
    console.error('Error fetching tour requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tour requests',
      error: error.message
    });
  }
});

module.exports = router;

const pdfService = require('../../services/tourScheduling/pdfService');

/**
 * GET /api/tour-requests/:id/profiles-pdf
 * Download PDF profiles for all daycares in tour request
 */
router.get('/:id/profiles-pdf', async (req, res) => {
  try {
    const tourRequest = await tourRequestService.getTourRequest(req.params.id);
    
    if (!tourRequest) {
      return res.status(404).json({
        success: false,
        message: 'Tour request not found'
      });
    }
    
    const operationIds = tourRequest.daycares.map(d => d.operation_id);
    
    // Generate PDF
    const pdfDoc = await pdfService.generateDaycareProfilesPDF(operationIds);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="daycare-profiles-${req.params.id}.pdf"`);
    
    // Pipe PDF to response
    pdfDoc.pipe(res);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating PDF',
      error: error.message
    });
  }
});

module.exports = router;
