const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth-fixed');
require('dotenv').config();

// Get reviews for a specific daycare (public route, no auth required)
router.get('/daycare/:operationNumber', async (req, res) => {
  try {
    const { operationNumber } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Only get approved reviews, join with user table to get username
    // MySQL2 doesn't allow ? placeholders for LIMIT and OFFSET in prepared statements
    // So we need to convert them to integers and insert them directly in the query
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);
    
    const [reviews] = await pool.execute(`
      SELECT r.id, r.rating, r.review_text, r.created_at, r.is_verified,
             u.username
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.operation_number = ? AND r.status = 'approved'
      ORDER BY r.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `, [operationNumber]);

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM reviews
      WHERE operation_number = ? AND status = 'approved'
    `, [operationNumber]);

    const total = countResult[0].total;

    // Get average rating
    const [avgResult] = await pool.execute(`
      SELECT AVG(rating) as average_rating
      FROM reviews
      WHERE operation_number = ? AND status = 'approved'
    `, [operationNumber]);

    const averageRating = avgResult[0].average_rating || 0;

    // Get rating distribution
    const [distributionResult] = await pool.execute(`
      SELECT rating, COUNT(*) as count
      FROM reviews
      WHERE operation_number = ? AND status = 'approved'
      GROUP BY rating
      ORDER BY rating DESC
    `, [operationNumber]);

    // Format distribution data
    const distribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };

    distributionResult.forEach(item => {
      distribution[item.rating] = item.count;
    });

    return res.status(200).json({
      success: true,
      reviews,
      averageRating,
      distribution,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get daycare reviews error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve daycare reviews due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Submit a new review (auth required)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { operationNumber, rating, reviewText } = req.body;

    if (!operationNumber || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Operation number and rating are required'
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if user already reviewed this daycare
    const [existingReviews] = await pool.execute(`
      SELECT * FROM reviews
      WHERE user_id = ? AND operation_number = ?
    `, [userId, operationNumber]);

    if (existingReviews.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this daycare'
      });
    }

    // Insert review with pending status
    await pool.execute(`
      INSERT INTO reviews (user_id, operation_number, rating, review_text, status)
      VALUES (?, ?, ?, ?, 'pending')
    `, [userId, operationNumber, rating, reviewText || null]);

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully and is pending approval'
    });
  } catch (error) {
    console.error('Submit review error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit review due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update an existing review (auth required)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { rating, reviewText } = req.body;

    if (!rating) {
      return res.status(400).json({
        success: false,
        message: 'Rating is required'
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if review exists and belongs to the user
    const [reviews] = await pool.execute(`
      SELECT * FROM reviews
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or does not belong to you'
      });
    }

    // Update review and set status back to pending for re-approval
    await pool.execute(`
      UPDATE reviews
      SET rating = ?, review_text = ?, status = 'pending', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [rating, reviewText || null, id]);

    return res.status(200).json({
      success: true,
      message: 'Review updated successfully and is pending approval'
    });
  } catch (error) {
    console.error('Update review error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update review due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete a review (auth required)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check if review exists and belongs to the user or user is admin
    const isAdmin = req.user.role === 'admin';
    
    let query = 'SELECT * FROM reviews WHERE id = ?';
    let params = [id];
    
    if (!isAdmin) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    const [reviews] = await pool.execute(query, params);

    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or you do not have permission to delete it'
      });
    }

    // Delete review
    await pool.execute(`
      DELETE FROM reviews
      WHERE id = ?
    `, [id]);

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete review due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all reviews by the authenticated user
router.get('/my-reviews', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get user's reviews with pagination, include daycare name
    // MySQL2 doesn't allow ? placeholders for LIMIT and OFFSET in prepared statements
    // So we need to convert them to integers and insert them directly in the query
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);
    
    const [reviews] = await pool.execute(`
      SELECT r.id, r.operation_number, r.rating, r.review_text, r.status, r.created_at, r.updated_at, r.is_verified
      FROM reviews r
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `, [userId]);

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM reviews
      WHERE user_id = ?
    `, [userId]);

    const total = countResult[0].total;

    return res.status(200).json({
      success: true,
      reviews,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user reviews due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ADMIN ROUTES

// Get all reviews by status (admin only)
router.get('/by-status/:status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be pending, approved, or rejected'
      });
    }

    // MySQL2 doesn't allow ? placeholders for LIMIT and OFFSET in prepared statements
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);
    
    // Get reviews with user info and daycare name
    const query = `
      SELECT r.id, r.operation_number, r.rating, r.review_text, r.created_at,
             r.category, r.experience_date, r.child_age, r.attendance_length, r.photos,
             r.approved_at, r.approved_by, r.rejected_at, r.rejected_by, r.rejection_reason,
             u.username, u.email, u.id as user_id,
             d.operation_name as daycare_name,
             a.username as admin_username
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN daycares d ON r.operation_number = d.operation_number
      LEFT JOIN users a ON (r.approved_by = a.id OR r.rejected_by = a.id)
      WHERE r.status = ?
      ORDER BY ${status === 'pending' ? 'r.created_at' : status === 'approved' ? 'r.approved_at' : 'r.rejected_at'} DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `;
    
    const [reviews] = await pool.execute(query, [status]);

    // Format reviews for the admin dashboard
    const formattedReviews = reviews.map(review => ({
      id: review.id,
      daycareId: review.operation_number,
      daycareName: review.daycare_name || `Daycare ${review.operation_number}`,
      userId: review.user_id,
      userName: review.username,
      userEmail: review.email,
      submittedAt: review.created_at,
      rating: review.rating,
      text: review.review_text,
      category: review.category,
      experienceDate: review.experience_date,
      childAge: review.child_age,
      attendance: review.attendance_length,
      photos: review.photos ? JSON.parse(review.photos) : [],
      status,
      approvedAt: review.approved_at,
      approvedBy: review.admin_username,
      rejectedAt: review.rejected_at,
      rejectedBy: review.admin_username,
      rejectionReason: review.rejection_reason
    }));

    // Get total count
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM reviews WHERE status = ?',
      [status]
    );

    const total = countResult[0].total;

    return res.status(200).json({
      success: true,
      reviews: formattedReviews,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(`Get ${req.params.status} reviews error:`, error);
    return res.status(500).json({
      success: false,
      message: `Failed to retrieve ${req.params.status} reviews due to server error`,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all pending reviews (admin only)
router.get('/pending', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // MySQL2 doesn't allow ? placeholders for LIMIT and OFFSET in prepared statements
    // So we need to convert them to integers and insert them directly in the query
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);
    
    // Get pending reviews with user info and daycare name
    const [reviews] = await pool.execute(`
      SELECT r.id, r.operation_number, r.rating, r.review_text, r.created_at,
             r.category, r.experience_date, r.child_age, r.attendance_length, r.photos,
             u.username, u.email, u.id as user_id,
             d.operation_name as daycare_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN daycares d ON r.operation_number = d.operation_number
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `, []);

    // Format reviews for the admin dashboard
    const formattedReviews = reviews.map(review => ({
      id: review.id,
      daycareId: review.operation_number,
      daycareName: review.daycare_name || `Daycare ${review.operation_number}`,
      userId: review.user_id,
      userName: review.username,
      userEmail: review.email,
      submittedAt: review.created_at,
      rating: review.rating,
      text: review.review_text,
      category: review.category,
      experienceDate: review.experience_date,
      childAge: review.child_age,
      attendance: review.attendance_length,
      photos: review.photos ? JSON.parse(review.photos) : [],
      status: 'pending'
    }));

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM reviews
      WHERE status = 'pending'
    `);

    const total = countResult[0].total;

    return res.status(200).json({
      success: true,
      reviews: formattedReviews,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get pending reviews error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending reviews due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Approve or reject a review (admin only)
router.put('/moderate/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isVerified, rejectionReason } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username || 'Admin';

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "approved" or "rejected"'
      });
    }

    // If rejecting, require a reason
    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting a review'
      });
    }

    // Update review status based on approve/reject
    if (status === 'approved') {
      await pool.execute(`
        UPDATE reviews
        SET status = 'approved', 
            is_verified = ?, 
            updated_at = CURRENT_TIMESTAMP,
            approved_at = CURRENT_TIMESTAMP,
            approved_by = ?
        WHERE id = ?
      `, [isVerified ? 1 : 0, adminId, id]);
    } else {
      await pool.execute(`
        UPDATE reviews
        SET status = 'rejected', 
            updated_at = CURRENT_TIMESTAMP,
            rejected_at = CURRENT_TIMESTAMP,
            rejected_by = ?,
            rejection_reason = ?
        WHERE id = ?
      `, [adminId, rejectionReason, id]);
    }

    // Get updated review details
    const [rows] = await pool.execute(`
      SELECT r.*, 
             u.username as user_name,
             d.operation_name as daycare_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN daycares d ON r.operation_number = d.operation_number
      WHERE r.id = ?
    `, [id]);

    const review = rows[0];

    // Check if we need to send notification
    if (review) {
      // In a real implementation, send an email notification
      console.log(`Notification: Review ${id} has been ${status} by ${adminName}`);
      
      // For an approved review, trigger rating recalculation
      if (status === 'approved') {
        // This would trigger an event to update daycare ratings
        console.log(`Trigger: Recalculate ratings for daycare ${review.operation_number}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Review ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      review
    });
  } catch (error) {
    console.error('Moderate review error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to moderate review due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;