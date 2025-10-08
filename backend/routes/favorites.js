const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
require('dotenv').config();

// Get all favorites for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get favorites with pagination
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // MySQL2 doesn't allow ? placeholders for LIMIT and OFFSET in prepared statements
    // So we need to convert them to integers and insert them directly in the query
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);
    
    // Join with daycare_operations to get daycare names
    // First, let's check if daycare_operations table has data
    const [checkOperations] = await pool.execute(`
      SELECT COUNT(*) as count FROM daycare_operations LIMIT 1
    `);
    
    console.log(`Daycare operations table count: ${checkOperations[0].count}`);
    
    // Check the daycares table too
    const [checkDaycares] = await pool.execute(`
      SELECT COUNT(*) as count FROM daycares LIMIT 1
    `);
    
    console.log(`Daycares table count: ${checkDaycares[0].count}`);
    
    // Try to find a specific operation_number to verify data
    const [checkSpecific] = await pool.execute(`
      SELECT * FROM daycare_operations WHERE OPERATION_NUMBER = '483290' LIMIT 1
    `);
    
    console.log('Found specific operation in daycare_operations:', checkSpecific.length > 0 ? 'Yes' : 'No');
    
    // Check in daycares table too
    const [checkSpecificDaycares] = await pool.execute(`
      SELECT * FROM daycares WHERE operation_number = '483290' LIMIT 1
    `);
    
    console.log('Found specific operation in daycares:', checkSpecificDaycares.length > 0 ? 'Yes' : 'No');
    
    // Get favorites with a join to either daycare_operations or daycares table
    // First try with daycare_operations
    let favorites;
    
    if (checkOperations[0].count > 0 && checkSpecific.length > 0) {
      console.log('Using daycare_operations for join');
      [favorites] = await pool.execute(`
        SELECT f.*, do.OPERATION_NAME as daycare_name 
        FROM favorites f
        LEFT JOIN daycare_operations do ON f.operation_number = do.OPERATION_NUMBER
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `, [userId]);
    } else if (checkDaycares[0].count > 0 && checkSpecificDaycares.length > 0) {
      console.log('Using daycares for join');
      [favorites] = await pool.execute(`
        SELECT f.*, d.operation_name as daycare_name
        FROM favorites f
        LEFT JOIN daycares d ON f.operation_number = d.operation_number
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `, [userId]);
    } else {
      // Try using both tables to get daycare names
      console.log('Trying to get names from both tables');
      [favorites] = await pool.execute(`
        SELECT f.*, 
               COALESCE(do.OPERATION_NAME, d.operation_name, CONCAT('Daycare #', f.operation_number)) as daycare_name
        FROM favorites f
        LEFT JOIN daycare_operations do ON f.operation_number = do.OPERATION_NUMBER
        LEFT JOIN daycares d ON f.operation_number = d.operation_number
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `, [userId]);
    }
    
    console.log('Favorites with daycare names:', favorites.map(f => ({
      id: f.id,
      operation_number: f.operation_number,
      daycare_name: f.daycare_name
    })));

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM favorites
      WHERE user_id = ?
    `, [userId]);

    const total = countResult[0].total;

    return res.status(200).json({
      success: true,
      favorites,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve favorites due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add a new favorite
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // Accept either operationNumber or operation_id as the parameter
    const operationId = req.body.operationNumber || req.body.operation_id || req.body.operation_number;
    
    if (!operationId) {
      return res.status(400).json({
        success: false,
        message: 'Operation ID/number is required'
      });
    }

    console.log(`Adding favorite: User ID ${userId}, Operation ID ${operationId}`);

    // Check if already favorited
    const [existingFavorites] = await pool.execute(`
      SELECT * FROM favorites
      WHERE user_id = ? AND operation_number = ?
    `, [userId, operationId]);

    if (existingFavorites.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Daycare is already in favorites'
      });
    }

    // Add to favorites (note: `operation_number` is the column name in the favorites table)
    await pool.execute(`
      INSERT INTO favorites (user_id, operation_number)
      VALUES (?, ?)
    `, [userId, operationId]);

    return res.status(201).json({
      success: true,
      message: 'Daycare added to favorites successfully'
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add favorite due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Remove a favorite
router.delete('/:operationNumber', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const operationId = req.params.operationNumber || req.params.operation_id || req.params.operation_number;

    console.log(`Removing favorite: User ID ${userId}, Operation ID ${operationId}`);
    
    // Remove from favorites
    const [result] = await pool.execute(`
      DELETE FROM favorites
      WHERE user_id = ? AND operation_number = ?
    `, [userId, operationId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Favorite removed successfully'
    });
  } catch (error) {
    console.error('Remove favorite error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove favorite due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Check if a daycare is favorited
router.get('/check/:operationNumber', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const operationId = req.params.operationNumber || req.params.operation_id || req.params.operation_number;

    console.log(`Checking favorite: User ID ${userId}, Operation ID ${operationId}`);
    
    // Check if favorited
    const [favorites] = await pool.execute(`
      SELECT * FROM favorites
      WHERE user_id = ? AND operation_number = ?
    `, [userId, operationId]);

    return res.status(200).json({
      success: true,
      isFavorite: favorites.length > 0
    });
  } catch (error) {
    console.error('Check favorite error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check favorite status due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;