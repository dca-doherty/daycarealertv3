const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth-fixed');
const mySqlDaycareService = require('../services/mySqlDaycareService');
const { pool } = require('../config/db');

/**
 * GET /api/mysql/daycares
 * Get paginated daycares with filtering and sorting
 */
router.get('/', async (req, res) => {
  try {
    // Log all request query parameters for debugging
    console.log('All request query parameters:', req.query);
    
    // Extract query parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const city = req.query.city || '';
    const name = req.query.name || '';
    
    // Operation type filter
    const operation_type = req.query.operation_type || '';
    
    // Rating filter - ensure this is actually being passed correctly
    const rating = req.query.rating || '';
    console.log('DEBUG - Rating filter value:', rating);
    
    // Price range filter - ensure this is actually being passed correctly
    const priceRange = req.query.priceRange || '';
    console.log('DEBUG - Price range filter value:', priceRange);
    
    // Years in operation filter - ensure this is actually being passed correctly
    const yearsInOperation = req.query.yearsInOperation || '';
    console.log('DEBUG - Years filter value:', yearsInOperation);
    
    // Build filters object with all parameters
    const filters = {
      searchTerm: name,
      city: city,
      operation_type: operation_type,
      rating: rating,
      priceRange: priceRange,
      yearsInOperation: yearsInOperation
    };
    
    console.log('Filters applied:', filters);
    console.log('Raw filter params received:', {
      rating: req.query.rating,
      priceRange: req.query.priceRange,
      yearsInOperation: req.query.yearsInOperation
    });

    // Extract sort parameters if provided
    const sortColumn = req.query.sortColumn || '';
    const sortDirection = req.query.sortDirection || 'asc';
    
    // Get data using the MySQL-only service
    const result = await mySqlDaycareService.getDaycareOperations(
      limit, 
      offset, 
      filters, 
      sortColumn, 
      sortDirection
    );
    
    return res.json({
      success: true,
      daycares: result.data,
      total: result.total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching daycares:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve daycares',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/mysql/daycares/cities/list
 * Get a list of all available cities
 */
router.get('/cities/list', async (req, res) => {
  try {
    // Get cities data using the MySQL-only service
    const result = await mySqlDaycareService.getCities();
    
    // Return all cities with no limit
    const cities = result.data;
    
    return res.json({
      success: true,
      cities: cities
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve cities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/mysql/daycares/autocomplete
 * Get autocomplete suggestions for daycare names
 */
router.get('/autocomplete', async (req, res) => {
  try {
    const searchTerm = req.query.term || '';
    const limit = parseInt(req.query.limit, 10) || 10;
    
    console.log(`Autocomplete request for: '${searchTerm}', limit: ${limit}`);
    
    if (searchTerm.length < 2) {
      return res.json({
        success: true,
        suggestions: []
      });
    }
    
    // Get autocomplete suggestions using the service
    const result = await mySqlDaycareService.getAutocompleteSuggestions(searchTerm, limit);
    
    return res.json({
      success: true,
      suggestions: result.data
    });
  } catch (error) {
    console.error('Error fetching autocomplete suggestions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve autocomplete suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/mysql/daycares/violations/:operationId
 * Get violations for a specific daycare
 */
router.get('/violations/:operationId', async (req, res) => {
  try {
    const { operationId } = req.params;
    
    // Get violations data using the MySQL-only service
    const result = await mySqlDaycareService.getViolationsById(operationId);
    
    return res.json({
      success: true,
      violations: result.data
    });
  } catch (error) {
    console.error(`Error fetching violations for daycare #${req.params.operationId}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve violations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/mysql/daycares/:operationId
 * Get a single daycare by its operation ID
 */
router.get('/:operationId', async (req, res) => {
  try {
    const { operationId } = req.params;
    
    // Get daycare data using the MySQL-only service
    const result = await mySqlDaycareService.getDaycareById(operationId);
    
    if (!result.data) {
      return res.status(404).json({
        success: false,
        message: 'Daycare not found'
      });
    }
    
    return res.json({
      success: true,
      daycare: result.data
    });
  } catch (error) {
    console.error(`Error fetching daycare #${req.params.operationId}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve daycare details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/mysql/daycares/:operationId/parent-recommendations
 * Get parent recommendations for a daycare directly from the risk_analysis table
 */
router.get('/:operationId/parent-recommendations', async (req, res) => {
  console.log(`[ENDPOINT-HIT] Direct parent recommendations request for daycare #${req.params.operationId}`);
  try {
    const { operationId } = req.params;
    
    // First, get the OPERATION_ID from daycare_operations to ensure we have the correct ID
    const [operationData] = await pool.query(
      'SELECT OPERATION_ID FROM daycare_operations WHERE OPERATION_ID = ? OR OPERATION_NUMBER = ?',
      [operationId, operationId]
    );
    
    if (operationData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Daycare not found'
      });
    }
    
    const correctId = operationData[0].OPERATION_ID;
    
    // Get the parent recommendations using the correct ID
    const [recommendations] = await pool.query(
      'SELECT parent_recommendations FROM risk_analysis WHERE operation_id = ?',
      [correctId]
    );
    
    if (recommendations.length === 0 || !recommendations[0].parent_recommendations) {
      return res.status(404).json({
        success: false,
        message: 'No parent recommendations found'
      });
    }
    
    const rawRecs = recommendations[0].parent_recommendations;
    
    // Parse JSON string if needed
    let parsedRecs = null;
    
    console.log(`[DIRECT API] Raw parent_recommendations for daycare #${correctId}:`, 
                typeof rawRecs, rawRecs);
    
    if (typeof rawRecs === 'string') {
      try {
        parsedRecs = JSON.parse(rawRecs);
        console.log(`[DIRECT API] Successfully parsed JSON string to:`, 
                   Array.isArray(parsedRecs) ? `Array with ${parsedRecs.length} items` : typeof parsedRecs);
      } catch (e) {
        console.error(`[DIRECT API] Failed to parse JSON:`, e);
        return res.status(500).json({
          success: false,
          message: 'Error parsing recommendations',
          error: e.message
        });
      }
    } else if (Array.isArray(rawRecs)) {
      parsedRecs = rawRecs;
      console.log(`[DIRECT API] Using array directly with ${parsedRecs.length} items`);
    } else if (typeof rawRecs === 'object' && rawRecs !== null) {
      parsedRecs = Object.values(rawRecs);
      console.log(`[DIRECT API] Converted object to array with ${parsedRecs.length} items`);
    }
    
    console.log(`[DIRECT API] Final recommendations:`, parsedRecs);
    
    return res.json({
      success: true,
      recommendations: parsedRecs
    });
  } catch (error) {
    console.error(`Error fetching parent recommendations for daycare #${req.params.operationId}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve parent recommendations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/mysql/daycares/:operationId/test-recommendations
 * Test endpoint that always returns sample recommendations
 */
router.get('/:operationId/test-recommendations', async (req, res) => {
  console.log(`[TEST] Sample recommendations request for daycare #${req.params.operationId}`);
  
  // Generate sample recommendations based on operation ID
  const recommendations = [
    `Ask about their teacher-to-child ratios for daycare #${req.params.operationId}`,
    `Inquire about their health and illness policy (special test endpoint)`,
    `Ask about their approach to discipline and behavior management (ID: ${req.params.operationId})`,
    `Discuss their emergency procedures and safety protocols (test endpoint)`,
    `Ask about staff qualifications and training requirements (custom test)`,
    `Inquire about their curriculum and educational philosophy (test endpoint sample)`,
    `Ask how they handle food allergies and dietary restrictions (test endpoint example)`,
    `Discuss their policy on parent visits and communication (test sample data)`,
    `Ask about their approach to technology and screen time (test data point)`
  ];
  
  // Always return successfully
  return res.json({
    success: true, 
    recommendations: recommendations
  });
});

/**
 * GET /api/mysql/daycares/:operationId/real-recommendations
 * Debug endpoint that returns real recommendations from database
 */
router.get('/:operationId/real-recommendations', async (req, res) => {
  try {
    console.log(`[REAL-RECS] Getting real recommendations for daycare #${req.params.operationId}`);
    const { operationId } = req.params;
    
    // First, find the correct operation ID
    const [operationData] = await pool.query(
      'SELECT OPERATION_ID FROM daycare_operations WHERE OPERATION_ID = ? OR OPERATION_NUMBER = ?',
      [operationId, operationId]
    );
    
    if (operationData.length === 0) {
      console.log(`[REAL-RECS] Daycare not found with ID: ${operationId}`);
      return res.json({
        success: false,
        message: 'Daycare not found',
        requestedId: operationId
      });
    }
    
    const correctId = operationData[0].OPERATION_ID;
    console.log(`[REAL-RECS] Found correct ID: ${correctId}`);
    
    // Get recommendations from the database
    const [recData] = await pool.query(
      'SELECT parent_recommendations FROM risk_analysis WHERE operation_id = ?',
      [correctId]
    );
    
    console.log(`[REAL-RECS] Query results:`, recData.length > 0 ? 'Found data' : 'No data found');
    
    let realRecommendations = null;
    
    if (recData.length > 0 && recData[0].parent_recommendations) {
      try {
        // If it's already an array, use it directly
        if (Array.isArray(recData[0].parent_recommendations)) {
          realRecommendations = recData[0].parent_recommendations;
          console.log(`[REAL-RECS] Using array directly with ${realRecommendations.length} items`);
        } 
        // If it's a string, try to parse it
        else if (typeof recData[0].parent_recommendations === 'string') {
          realRecommendations = JSON.parse(recData[0].parent_recommendations);
          console.log(`[REAL-RECS] Parsed string to get ${realRecommendations.length} items`);
        }
        // If it's an object, try to convert it to an array
        else if (typeof recData[0].parent_recommendations === 'object') {
          realRecommendations = Object.values(recData[0].parent_recommendations);
          console.log(`[REAL-RECS] Converted object to array with ${realRecommendations.length} items`);
        }
      } catch (e) {
        console.log(`[REAL-RECS] Error processing recommendations:`, e);
      }
    }
    
    // Return the results
    return res.json({
      success: true,
      requestedId: operationId,
      correctId: correctId,
      hasData: recData.length > 0,
      rawData: recData.length > 0 ? recData[0].parent_recommendations : null,
      dataType: recData.length > 0 ? typeof recData[0].parent_recommendations : 'none',
      recommendations: realRecommendations || [
        `Default recommendation 1 for ID: ${operationId}`,
        `Default recommendation 2 for ID: ${operationId}`,
        `Default recommendation 3 for ID: ${operationId}`
      ]
    });
  } catch (error) {
    console.error('[REAL-RECS] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * GET /api/mysql/daycares/:operationId/analysis-summary
 * Get risk analysis summary for a daycare directly from the risk_analysis table
 */
router.get('/:operationId/analysis-summary', async (req, res) => {
  try {
    console.log(`[ANALYSIS-SUMMARY] Fetching analysis summary for daycare #${req.params.operationId}`);
    const { operationId } = req.params;
    
    // Get analysis summary using the service
    const result = await mySqlDaycareService.getAnalysisSummary(operationId);
    
    if (!result.data) {
      return res.json({
        success: false,
        message: 'No analysis summary found for this daycare',
        operationId
      });
    }
    
    return res.json({
      success: true,
      analysis_summary: result.data,
      operationId: result.operationId || operationId
    });
  } catch (error) {
    console.error('[ANALYSIS-SUMMARY] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;