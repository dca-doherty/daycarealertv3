/**
 * Daycare Ratings API Routes
 * 
 * Provides endpoints to retrieve and interact with daycare ratings.
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/db');

/**
 * @route   GET /api/ratings
 * @desc    Get daycare ratings with optional filters
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    let { city, minRating, maxRating, limit = 20, page = 1 } = req.query;
    
    // Build base query
    let query = `
      SELECT 
        r.operation_id,
        r.overall_rating,
        r.safety_rating,
        r.health_rating,
        r.wellbeing_rating,
        r.facility_rating,
        r.admin_rating,
        r.risk_score,
        r.violation_count,
        r.high_risk_violation_count,
        r.recent_violations_count,
        d.OPERATION_NAME as name,
        d.OPERATION_TYPE as type,
        d.CITY as city,
        d.COUNTY as county,
        d.LICENSED_TO_SERVE_AGES as ages_served,
        d.PROGRAMMATIC_SERVICES as services
      FROM 
        daycare_ratings r
      JOIN
        daycare_operations d ON r.operation_id = d.OPERATION_ID
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Add filters if provided
    if (city) {
      query += ` AND d.CITY = ?`;
      queryParams.push(city);
    }
    
    if (minRating) {
      query += ` AND r.overall_rating >= ?`;
      queryParams.push(parseFloat(minRating));
    }
    
    if (maxRating) {
      query += ` AND r.overall_rating <= ?`;
      queryParams.push(parseFloat(maxRating));
    }
    
    // Get total count for pagination
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM (${query}) as filtered`,
      queryParams
    );
    const total = countResult[0].total;
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ` ORDER BY r.overall_rating DESC, r.safety_rating DESC LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), parseInt(offset));
    
    // Execute query
    const [ratings] = await pool.query(query, queryParams);
    
    // Return results with pagination metadata
    res.json({
      ratings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching ratings:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/ratings/:operationId
 * @desc    Get detailed rating for a specific daycare
 * @access  Public
 */
router.get('/:operationId', async (req, res) => {
  try {
    const { operationId } = req.params;
    
    // Get detailed rating
    const [ratingResult] = await pool.query(
      `SELECT 
        r.*,
        d.OPERATION_NAME as name,
        d.OPERATION_TYPE as type,
        d.CITY as city,
        d.COUNTY as county,
        d.LICENSED_TO_SERVE_AGES as ages_served,
        d.PROGRAMMATIC_SERVICES as services,
        c.weekly_cost
      FROM 
        daycare_ratings r
      JOIN
        daycare_operations d ON r.operation_id = d.OPERATION_ID
      LEFT JOIN
        daycare_cost_estimates c ON r.operation_id = c.operation_id
      WHERE 
        r.operation_id = ?`,
      [operationId]
    );
    
    if (ratingResult.length === 0) {
      return res.status(404).json({ message: 'Rating not found' });
    }
    
    const rating = ratingResult[0];
    
    // Parse JSON fields
    if (rating.rating_factors) {
      try {
        rating.rating_factors = JSON.parse(rating.rating_factors);
      } catch (e) {
        rating.rating_factors = [];
      }
    }
    
    if (rating.quality_indicators) {
      try {
        rating.quality_indicators = JSON.parse(rating.quality_indicators);
      } catch (e) {
        rating.quality_indicators = [];
      }
    }
    
    // Return detailed rating
    res.json(rating);
  } catch (err) {
    console.error('Error fetching rating:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/ratings/distribution/summary
 * @desc    Get rating distribution summary
 * @access  Public
 */
router.get('/distribution/summary', async (req, res) => {
  try {
    const [distribution] = await pool.query(`
      SELECT 
        overall_rating, 
        COUNT(*) as count,
        ROUND(COUNT(*) / (SELECT COUNT(*) FROM daycare_ratings) * 100, 1) as percentage
      FROM 
        daycare_ratings
      GROUP BY
        overall_rating
      ORDER BY
        overall_rating DESC
    `);
    
    // Calculate average
    const [average] = await pool.query(`
      SELECT AVG(overall_rating) as average
      FROM daycare_ratings
    `);
    
    res.json({
      distribution,
      average: average[0].average
    });
  } catch (err) {
    console.error('Error fetching rating distribution:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;