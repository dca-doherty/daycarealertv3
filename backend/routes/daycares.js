const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth-fixed');
const daycareDbService = require('../services/daycareDbService');

/**
 * GET /api/daycares
 * Get paginated daycares with filtering and sorting
 */
router.get('/', async (req, res) => {
  try {
    // Extract query parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const city = req.query.city || '';
    const name = req.query.name || '';
    
    // Build filters object
    const filters = {
      searchTerm: name,
      city: city,
      // Add additional filters from query params
      operation_type: req.query.operation_type || '',
      priceRange: req.query.priceRange || '',
      rating: req.query.rating || '',
      yearsInOperation: req.query.yearsInOperation || '',
      favorites: req.query.favorites === 'true',
      // Make sure to filter for active daycares
      activeOnly: req.query.activeOnly === 'true' || req.query.activeOnly === true
    };
    
    // Log all filters for debugging
    console.log('Filters received by backend:', filters);

    // Extract sort parameters if provided
    const sortColumn = req.query.sortColumn || '';
    const sortDirection = req.query.sortDirection || 'asc';
    
    // Get data using the service
    const result = await daycareDbService.getDaycareOperations(
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
      source: result.source,
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
 * GET /api/daycares/simple-cities
 * Get a simpler list of cities with minimal headers
 */
router.get('/simple-cities', (req, res) => {
  try {
    // Hardcoded list of top cities in Texas to avoid database query
    const topCities = [
      "Houston", "San Antonio", "Dallas", "Austin", "Fort Worth",
      "El Paso", "Arlington", "Corpus Christi", "Plano", "Lubbock",
      "Irving", "Laredo", "Garland", "Frisco", "McKinney",
      "Amarillo", "Grand Prairie", "Brownsville", "Killeen", "Pasadena",
      "Mesquite", "McAllen", "Denton", "Waco", "Carrollton",
      "Round Rock", "Richardson", "Pearland", "College Station", "Wichita Falls"
    ];
    
    // Set basic response headers
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.setHeader('Content-Type', 'application/json');
    
    // Simple response with minimal JSON structure
    return res.json({ cities: topCities });
  } catch (error) {
    console.error('Error in simple cities endpoint:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/daycares/cities/list
 * Get a list of all available cities
 */
router.get('/cities/list', async (req, res) => {
  try {
    // Set response headers to prevent 431 errors (Request Header Fields Too Large)
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.setHeader('Content-Type', 'application/json');
    
    // Get cities data using the service
    const result = await daycareDbService.getCities();
    
    // Return all cities without limiting
    const cities = result.data;
    
    return res.json({
      success: true,
      cities: cities,
      source: result.source
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
 * GET /api/daycares/distinct/:field
 * Get distinct values for a field (like operation_type, city, etc.)
 */
router.get('/distinct/:field', async (req, res) => {
  try {
    const { field } = req.params;
    const validFields = ['operation_type', 'city', 'county', 'state'];
    
    if (!validFields.includes(field)) {
      return res.status(400).json({
        success: false,
        message: `Invalid field: ${field}. Allowed fields are: ${validFields.join(', ')}`
      });
    }
    
    // Use the service if available
    if (daycareDbService.getDistinctValues) {
      const result = await daycareDbService.getDistinctValues(field);
      return res.json({
        success: true,
        values: result.data,
        source: result.source
      });
    }
    
    // Return hardcoded values for operation_type as fallback
    if (field === 'operation_type') {
      return res.json({
        success: true,
        values: [
          'Licensed Center',
          'Licensed Child-Care Home'
        ],
        source: 'fallback'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: `No method available to fetch distinct ${field} values`
    });
  } catch (error) {
    console.error(`Error fetching distinct ${req.params.field} values:`, error);
    
    // Return hardcoded values for operation_type if there's an error
    if (req.params.field === 'operation_type') {
      return res.json({
        success: true,
        values: [
          'Licensed Center',
          'Licensed Child-Care Home',
          'Registered Child-Care Home',
          'Listed Family Home'
        ],
        source: 'fallback'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: `Error fetching distinct ${req.params.field} values`,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/daycares/violations/:operationNumber
 * Get violations for a specific daycare
 */
router.get('/violations/:operationNumber', async (req, res) => {
  try {
    const { operationNumber } = req.params;
    
    // Get violations data using the service
    const result = await daycareDbService.getViolationsById(operationNumber);
    
    return res.json({
      success: true,
      violations: result.data,
      source: result.source
    });
  } catch (error) {
    console.error(`Error fetching violations for daycare #${req.params.operationNumber}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve violations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/daycares/:operationNumber
 * Get a single daycare by its operation number
 * This must be the last route defined since it's a catch-all for any other pattern
 */
router.get('/:operationNumber', async (req, res) => {
  try {
    const { operationNumber } = req.params;
    
    // Get daycare data using the service
    const result = await daycareDbService.getDaycareById(operationNumber);
    
    if (!result.data) {
      return res.status(404).json({
        success: false,
        message: 'Daycare not found'
      });
    }
    
    return res.json({
      success: true,
      daycare: result.data,
      source: result.source
    });
  } catch (error) {
    console.error(`Error fetching daycare #${req.params.operationNumber}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve daycare details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;