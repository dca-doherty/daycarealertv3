const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth-fixed');
const logger = require('../utils/logger');
const daycareProviderModel = require('../models/daycareProviders');
const daycareDetailsModel = require('../models/daycareDetails');
const daycareReferralsModel = require('../models/daycareReferrals');
const competitorComparisonsModel = require('../models/competitorComparisons');
const { pool } = require('../config/db');

// Middleware to check if user is a daycare provider
const isDaycareProvider = async (req, res, next) => {
  try {
    const provider = await daycareProviderModel.getProviderByUserId(req.user.id);
    
    if (!provider) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User is not a daycare provider.'
      });
    }
    
    // Attach provider info to request
    req.provider = provider;
    next();
  } catch (error) {
    logger.error('Error in daycare provider middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking daycare provider permissions'
    });
  }
};

// Get daycare provider profile (requires authentication)
router.get('/profile', authenticateToken, isDaycareProvider, async (req, res) => {
  try {
    res.json({
      success: true,
      provider: req.provider
    });
  } catch (error) {
    logger.error('Error getting daycare provider profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve provider profile',
      error: error.message
    });
  }
});

// Get daycare details
router.get('/daycare-details', authenticateToken, isDaycareProvider, async (req, res) => {
  try {
    const details = await daycareDetailsModel.getDaycareDetailsByDaycareId(req.provider.daycare_id);
    
    res.json({
      success: true,
      data: details || {} // Return empty object if no details found
    });
  } catch (error) {
    logger.error('Error getting daycare details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve daycare details',
      error: error.message
    });
  }
});

// Update daycare details
router.post('/daycare-details', authenticateToken, isDaycareProvider, async (req, res) => {
  try {
    const detailsData = req.body;
    
    const result = await daycareDetailsModel.saveDaycareDetails(
      req.provider.daycare_id,
      detailsData,
      req.user.id
    );
    
    res.json({
      success: true,
      message: 'Daycare details updated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error updating daycare details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update daycare details',
      error: error.message
    });
  }
});

// Get referrals for a daycare
router.get('/referrals', authenticateToken, isDaycareProvider, async (req, res) => {
  try {
    const referrals = await daycareReferralsModel.getReferralsByDaycareId(req.provider.daycare_id);
    
    res.json({
      success: true,
      data: referrals
    });
  } catch (error) {
    logger.error('Error getting daycare referrals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve referrals',
      error: error.message
    });
  }
});

// Mark a referral as converted
router.post('/referrals/:referralId/convert', authenticateToken, isDaycareProvider, async (req, res) => {
  try {
    const { referralId } = req.params;
    
    // Verify the referral belongs to this provider's daycare
    const [referral] = await pool.execute(
      'SELECT * FROM daycare_referrals WHERE id = ? AND daycare_id = ?',
      [referralId, req.provider.daycare_id]
    );
    
    if (referral.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Referral not found or does not belong to your daycare'
      });
    }
    
    const success = await daycareReferralsModel.markReferralConverted(referralId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Referral marked as converted'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to mark referral as converted'
      });
    }
  } catch (error) {
    logger.error(`Error marking referral ${req.params.referralId} as converted:`, error);
    res.status(500).json({
      success: false,
      message: 'Error marking referral as converted',
      error: error.message
    });
  }
});

// Get analytics summary
router.get('/analytics', authenticateToken, isDaycareProvider, async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 30;
    
    const analytics = await daycareReferralsModel.getDaycareAnalyticsSummary(
      req.provider.daycare_id,
      days
    );
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting daycare analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics',
      error: error.message
    });
  }
});

// Get competitor comparisons
router.get('/competitors', authenticateToken, isDaycareProvider, async (req, res) => {
  try {
    // Option to refresh competitors
    const refresh = req.query.refresh === 'true';
    
    if (refresh) {
      // Get nearby competitors
      const nearbyCompetitors = await competitorComparisonsModel.getNearbyCompetitors(
        req.provider.daycare_id
      );
      
      // Get daycare's details for comparison
      const [daycare] = await pool.execute(
        `SELECT 
           COALESCE(d.average_weekly_rate, 0) as weekly_rate,
           COALESCE(d.overall_rating, 0) as rating,
           (SELECT COUNT(*) FROM violations WHERE operation_id = ?) as violation_count
         FROM daycares d
         WHERE d.operation_number = ?`,
        [req.provider.daycare_id, req.provider.daycare_id]
      );
      
      const daycareInfo = daycare[0] || { weekly_rate: 0, rating: 0, violation_count: 0 };
      
      // Calculate comparison metrics and save them
      for (const competitor of nearbyCompetitors) {
        // Price difference as percentage (positive means daycare is more expensive)
        let priceDiffPercent = null;
        if (competitor.avg_price && daycareInfo.weekly_rate) {
          priceDiffPercent = ((daycareInfo.weekly_rate - competitor.avg_price) / competitor.avg_price) * 100;
        }
        
        // Rating difference (positive means daycare is better rated)
        let ratingDiff = null;
        if (competitor.rating !== null && daycareInfo.rating) {
          ratingDiff = daycareInfo.rating - competitor.rating;
        }
        
        // Violation count difference (negative means daycare has fewer violations)
        const violationDiff = daycareInfo.violation_count - competitor.violation_count;
        
        // Market position determination
        let marketPosition = 'similar';
        if (priceDiffPercent !== null) {
          if (priceDiffPercent > 10) {
            marketPosition = 'higher';
          } else if (priceDiffPercent < -10) {
            marketPosition = 'lower';
          }
        }
        
        // Save the comparison
        await competitorComparisonsModel.saveCompetitorComparison(
          req.provider.daycare_id,
          competitor.id,
          {
            distance_miles: competitor.distance_miles,
            price_difference_percent: priceDiffPercent,
            rating_difference: ratingDiff,
            violation_count_difference: violationDiff,
            market_position: marketPosition
          }
        );
      }
    }
    
    // Generate the market comparison report
    const report = await competitorComparisonsModel.generateMarketComparisonReport(
      req.provider.daycare_id
    );
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error getting competitor comparisons:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve competitor comparisons',
      error: error.message
    });
  }
});

// Get tour requests for this daycare
router.get('/tours', authenticateToken, isDaycareProvider, async (req, res) => {
  try {
    // Import tour requests model dynamically (since it's in a different file)
    const { getTourRequestsByDaycareId } = require('../models/tourRequests');
    
    const tourRequests = await getTourRequestsByDaycareId(req.provider.daycare_id);
    
    res.json({
      success: true,
      data: tourRequests
    });
  } catch (error) {
    logger.error('Error getting tour requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tour requests',
      error: error.message
    });
  }
});

// Update tour request status
router.patch('/tours/:requestId/status', authenticateToken, isDaycareProvider, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;
    
    if (!status || !['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, confirmed, completed, or cancelled'
      });
    }
    
    // Verify the tour request belongs to this provider's daycare
    const [tourRequest] = await pool.execute(
      'SELECT * FROM tour_requests WHERE id = ? AND daycare_id = ?',
      [requestId, req.provider.daycare_id]
    );
    
    if (tourRequest.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tour request not found or does not belong to your daycare'
      });
    }
    
    // Import tour requests model dynamically
    const { updateTourRequestStatus } = require('../models/tourRequests');
    
    const success = await updateTourRequestStatus(requestId, status);
    
    if (success) {
      // If the status changed to completed, track it as a conversion
      if (status === 'completed') {
        try {
          // Check if there's a referral record for this tour
          const [referral] = await pool.execute(
            'SELECT id FROM daycare_referrals WHERE tour_request_id = ?',
            [requestId]
          );
          
          if (referral.length > 0) {
            // Mark the existing referral as converted
            await daycareReferralsModel.markReferralConverted(referral[0].id);
          } else {
            // Create a new referral and mark it as converted
            const tourRequestData = tourRequest[0];
            const referralData = {
              daycare_id: req.provider.daycare_id,
              referral_type: 'tour',
              contact_name: tourRequestData.name,
              contact_email: tourRequestData.email,
              contact_phone: tourRequestData.phone,
              tour_request_id: requestId,
              notes: 'Tour completed and converted'
            };
            
            const newReferral = await daycareReferralsModel.trackReferral(referralData);
            await daycareReferralsModel.markReferralConverted(newReferral.id);
          }
        } catch (err) {
          logger.warn('Error tracking tour conversion:', err);
          // Continue even if tracking fails
        }
      }
      
      res.json({
        success: true,
        message: 'Tour request status updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to update tour request status'
      });
    }
  } catch (error) {
    logger.error(`Error updating tour request ${req.params.requestId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error updating tour request',
      error: error.message
    });
  }
});

module.exports = router;
