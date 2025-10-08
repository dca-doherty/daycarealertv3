/**
 * Tiered Ratings API Routes
 * 
 * This module provides API endpoints for accessing the enhanced tiered rating system,
 * which includes both the overall star rating and category-specific scores on a 1-10 scale.
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

/**
 * @api {get} /api/ratings/tiered Get tiered ratings for all daycares
 * @apiName GetTieredRatings
 * @apiGroup Ratings
 * @apiDescription Get tiered ratings with subcategory scores for all daycares
 *
 * @apiSuccess {Array} ratings List of daycare ratings with subcategory scores
 */
router.get('/', async (req, res) => {
  try {
    const [ratings] = await pool.query(`
      SELECT 
        r.operation_id,
        r.overall_rating,
        r.safety_compliance_score,
        r.operational_quality_score,
        r.educational_programming_score,
        r.staff_qualifications_score,
        r.subcategory_data,
        d.OPERATION_NAME,
        d.OPERATION_TYPE,
        d.STREET_NUMBER,
        d.STREET_NAME, 
        d.CITY,
        d.ZIP_CODE,
        d.COUNTY
      FROM 
        daycare_ratings r
      JOIN
        daycare_operations d ON r.operation_id = d.OPERATION_ID
      ORDER BY
        r.overall_rating DESC, 
        r.safety_compliance_score DESC
      LIMIT 1000
    `);
    
    // Process the ratings to include parsed subcategory data
    const processedRatings = ratings.map(rating => {
      try {
        // Parse the subcategory data
        const subcategories = rating.subcategory_data ? JSON.parse(rating.subcategory_data) : null;
        
        return {
          ...rating,
          subcategory_data: undefined, // Remove the raw JSON string
          subcategories // Add the parsed object
        };
      } catch (e) {
        // Handle parsing errors gracefully
        return {
          ...rating,
          subcategory_data: undefined,
          subcategories: null,
          error: 'Failed to parse subcategory data'
        };
      }
    });
    
    res.json({
      success: true,
      count: processedRatings.length,
      ratings: processedRatings
    });
  } catch (err) {
    console.error('Error fetching tiered ratings:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tiered ratings',
      error: err.message
    });
  }
});

/**
 * @api {get} /api/ratings/tiered/:operationId Get tiered rating for a specific daycare
 * @apiName GetDaycareTieredRating
 * @apiGroup Ratings
 * @apiDescription Get detailed tiered rating with subcategory scores for a specific daycare
 *
 * @apiParam {String} operationId Daycare operation ID
 * @apiSuccess {Object} rating Daycare rating with subcategory scores
 */
router.get('/operation/:operationId', async (req, res) => {
  try {
    const operationId = req.params.operationId;
    
    const [ratings] = await pool.query(`
      SELECT 
        r.*,
        d.OPERATION_NAME,
        d.OPERATION_TYPE,
        d.STREET_NUMBER,
        d.STREET_NAME, 
        d.CITY,
        d.ZIP_CODE,
        d.COUNTY,
        d.PHONE_NUMBER,
        d.EMAIL_ADDRESS,
        d.WEBSITE_ADDRESS,
        d.ISSUANCE_DATE,
        d.TOTAL_CAPACITY
      FROM 
        daycare_ratings r
      JOIN
        daycare_operations d ON r.operation_id = d.OPERATION_ID
      WHERE
        r.operation_id = ?
    `, [operationId]);
    
    if (ratings.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No rating found for operation ID: ${operationId}`
      });
    }
    
    // Get the rating and process subcategory data
    const rating = ratings[0];
    
    try {
      // Parse JSON fields
      rating.subcategories = rating.subcategory_data ? JSON.parse(rating.subcategory_data) : null;
      rating.rating_factors = rating.rating_factors ? JSON.parse(rating.rating_factors) : [];
      rating.quality_indicators = rating.quality_indicators ? JSON.parse(rating.quality_indicators) : [];
      
      // Remove raw JSON strings
      delete rating.subcategory_data;
    } catch (e) {
      console.error('Error parsing JSON fields:', e);
    }
    
    res.json({
      success: true,
      rating
    });
  } catch (err) {
    console.error('Error fetching tiered rating:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tiered rating',
      error: err.message
    });
  }
});

/**
 * @api {get} /api/ratings/tiered/distribution/subcategories Get subcategory distribution statistics
 * @apiName GetSubcategoryDistribution
 * @apiGroup Ratings
 * @apiDescription Get distribution statistics for all subcategory scores
 *
 * @apiSuccess {Object} distribution Distribution statistics for subcategory scores
 */
router.get('/distribution/subcategories', async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT
        AVG(safety_compliance_score) as avg_safety_compliance,
        AVG(operational_quality_score) as avg_operational_quality,
        AVG(educational_programming_score) as avg_educational_programming,
        AVG(staff_qualifications_score) as avg_staff_qualifications,
        
        STDDEV(safety_compliance_score) as stddev_safety_compliance,
        STDDEV(operational_quality_score) as stddev_operational_quality,
        STDDEV(educational_programming_score) as stddev_educational_programming,
        STDDEV(staff_qualifications_score) as stddev_staff_qualifications,
        
        MIN(safety_compliance_score) as min_safety_compliance,
        MIN(operational_quality_score) as min_operational_quality,
        MIN(educational_programming_score) as min_educational_programming,
        MIN(staff_qualifications_score) as min_staff_qualifications,
        
        MAX(safety_compliance_score) as max_safety_compliance,
        MAX(operational_quality_score) as max_operational_quality,
        MAX(educational_programming_score) as max_educational_programming,
        MAX(staff_qualifications_score) as max_staff_qualifications,
        
        COUNT(*) as total_count
      FROM
        daycare_ratings
    `);
    
    // Get distribution by score ranges for each subcategory
    const ranges = [
      { min: 1, max: 2 },
      { min: 2, max: 3 },
      { min: 3, max: 4 },
      { min: 4, max: 5 },
      { min: 5, max: 6 },
      { min: 6, max: 7 },
      { min: 7, max: 8 },
      { min: 8, max: 9 },
      { min: 9, max: 10 },
      { min: 10, max: 11 }
    ];
    
    // Build distribution queries for each subcategory
    const distributionPromises = [];
    const subcategories = [
      'safety_compliance_score',
      'operational_quality_score',
      'educational_programming_score',
      'staff_qualifications_score'
    ];
    
    for (const subcategory of subcategories) {
      const rangePromises = ranges.map(range => {
        return pool.query(`
          SELECT COUNT(*) as count
          FROM daycare_ratings
          WHERE ${subcategory} >= ? AND ${subcategory} < ?
        `, [range.min, range.max]);
      });
      
      distributionPromises.push(Promise.all(rangePromises));
    }
    
    const distributionResults = await Promise.all(distributionPromises);
    
    // Process distribution results
    const distribution = {};
    
    subcategories.forEach((subcategory, index) => {
      distribution[subcategory] = ranges.map((range, i) => {
        return {
          range: `${range.min}-${range.max - 0.1}`,
          count: distributionResults[index][i][0][0].count
        };
      });
    });
    
    res.json({
      success: true,
      statistics: results[0],
      distribution
    });
  } catch (err) {
    console.error('Error fetching subcategory distribution:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcategory distribution',
      error: err.message
    });
  }
});

module.exports = router;