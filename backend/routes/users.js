const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth-fixed');
require('dotenv').config();

// Get user profile - protected route, requires authentication
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get basic user information
    const [users] = await pool.execute(`
      SELECT id, username, email, full_name, role, created_at, phone_number, 
             preferences, (SUBSTRING_INDEX(full_name, ' ', 1)) as first_name, 
             (SUBSTRING_INDEX(full_name, ' ', -1)) as last_name
      FROM users
      WHERE id = ?
    `, [userId]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    const userBasic = users[0];
    let userProfile = { ...userBasic };

    try {
      // Try to get profile data from user_profiles if it exists
      const [profiles] = await pool.execute(`
        SELECT profile_picture, phone_number, city, state, zip_code, bio 
        FROM user_profiles
        WHERE user_id = ?
      `, [userId]);
      
      if (profiles.length > 0) {
        userProfile = {
          ...userProfile,
          ...profiles[0]
        };
      }
    } catch (profileError) {
      console.log('User profiles table might not exist yet:', profileError.message);
      // Continue without profile data
    }

    let preferences = {};
    try {
      // Try to get preferences from user_preferences if it exists
      const [prefsResult] = await pool.execute(`
        SELECT email_notifications, sms_notifications, newsletter_subscription
        FROM user_preferences
        WHERE user_id = ?
      `, [userId]);
      
      if (prefsResult.length > 0) {
        preferences = prefsResult[0];
      }
    } catch (prefsError) {
      console.log('User preferences table might not exist yet:', prefsError.message);
      
      // Fall back to preferences in the users table if available
      if (userBasic.preferences) {
        try {
          preferences = JSON.parse(userBasic.preferences);
        } catch (e) {
          preferences = {
            email_notifications: true,
            sms_notifications: false,
            newsletter_subscription: true
          };
        }
      } else {
        // Default preferences
        preferences = {
          email_notifications: true,
          sms_notifications: false,
          newsletter_subscription: true
        };
      }
    }

    // Add preferences to the user profile
    userProfile.preferences = preferences;

    // Make sure we have first_name and last_name from full_name if they're not set
    if (!userProfile.first_name && userProfile.full_name) {
      const nameParts = userProfile.full_name.split(' ');
      userProfile.first_name = nameParts[0] || '';
      userProfile.last_name = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    }

    return res.status(200).json({
      success: true,
      profile: userProfile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update user profile - protected route
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phoneNumber, city, state, zipCode, bio } = req.body;

    // First update basic user info
    await pool.execute(`
      UPDATE users 
      SET full_name = ?, phone_number = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      `${firstName || ''} ${lastName || ''}`.trim() || null, 
      phoneNumber || null, 
      userId
    ]);

    // Try to update user_profiles if it exists
    try {
      // Check if user has a profile
      const [existingProfiles] = await pool.execute(`
        SELECT id FROM user_profiles WHERE user_id = ?
      `, [userId]);
      
      if (existingProfiles.length > 0) {
        // Update existing profile
        await pool.execute(`
          UPDATE user_profiles 
          SET phone_number = ?, city = ?, state = ?, zip_code = ?, bio = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `, [phoneNumber || null, city || null, state || null, zipCode || null, bio || null, userId]);
      } else {
        // Create new profile
        await pool.execute(`
          INSERT INTO user_profiles (user_id, phone_number, city, state, zip_code, bio)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [userId, phoneNumber || null, city || null, state || null, zipCode || null, bio || null]);
      }
    } catch (profileError) {
      console.log('Error updating user_profiles (table might not exist):', profileError.message);
      // Continue even if profile update fails
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update profile picture - protected route
router.put('/profile/picture', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { profilePicture } = req.body;

    if (!profilePicture) {
      return res.status(400).json({
        success: false,
        message: 'Profile picture URL is required'
      });
    }

    try {
      // Check if user has a profile
      const [existingProfiles] = await pool.execute(`
        SELECT id FROM user_profiles WHERE user_id = ?
      `, [userId]);
      
      if (existingProfiles.length > 0) {
        // Update existing profile picture
        await pool.execute(`
          UPDATE user_profiles 
          SET profile_picture = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `, [profilePicture, userId]);
      } else {
        // Create new profile with picture
        await pool.execute(`
          INSERT INTO user_profiles (user_id, profile_picture)
          VALUES (?, ?)
        `, [userId, profilePicture]);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Profile picture updated successfully'
      });
    } catch (profileError) {
      console.log('Error updating profile picture (table might not exist):', profileError.message);
      
      // Fall back to storing in a user field or creating a temporary solution
      return res.status(200).json({
        success: true,
        message: 'Profile picture received, but storage is temporarily unavailable. Please try again later.'
      });
    }
  } catch (error) {
    console.error('Update profile picture error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile picture due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update user preferences - protected route
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { emailNotifications, smsNotifications, newsletterSubscription } = req.body;

    try {
      // Check if user has preferences
      const [existingPrefs] = await pool.execute(`
        SELECT id FROM user_preferences WHERE user_id = ?
      `, [userId]);
      
      if (existingPrefs.length > 0) {
        // Update existing preferences
        await pool.execute(`
          UPDATE user_preferences 
          SET email_notifications = ?, sms_notifications = ?, newsletter_subscription = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `, [
          emailNotifications !== undefined ? emailNotifications : true,
          smsNotifications !== undefined ? smsNotifications : false,
          newsletterSubscription !== undefined ? newsletterSubscription : true,
          userId
        ]);
      } else {
        // Create new preferences
        await pool.execute(`
          INSERT INTO user_preferences (user_id, email_notifications, sms_notifications, newsletter_subscription)
          VALUES (?, ?, ?, ?)
        `, [
          userId,
          emailNotifications !== undefined ? emailNotifications : true,
          smsNotifications !== undefined ? smsNotifications : false,
          newsletterSubscription !== undefined ? newsletterSubscription : true
        ]);
      }
    } catch (prefsError) {
      console.log('Error updating user_preferences (table might not exist):', prefsError.message);
      
      // Fall back to storing preferences in users table's preferences JSON field
      const prefsObject = JSON.stringify({
        email_notifications: emailNotifications !== undefined ? emailNotifications : true,
        sms_notifications: smsNotifications !== undefined ? smsNotifications : false,
        newsletter_subscription: newsletterSubscription !== undefined ? newsletterSubscription : true
      });
      
      await pool.execute(`
        UPDATE users 
        SET preferences = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [prefsObject, userId]);
    }

    return res.status(200).json({
      success: true,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update preferences due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Change password - protected route
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Get current user with password
    const [users] = await pool.execute(`
      SELECT * FROM users WHERE id = ?
    `, [userId]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await pool.execute(`
      UPDATE users 
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [passwordHash, userId]);

    // Invalidate all sessions except current one for security
    const authHeader = req.headers.authorization;
    const currentToken = authHeader && authHeader.split(' ')[1];

    await pool.execute(`
      DELETE FROM sessions 
      WHERE user_id = ? AND token != ?
    `, [userId, currentToken]);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to change password due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete user account - protected route
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Deactivate the account instead of permanent deletion
    await pool.execute(`
      UPDATE users 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [userId]);

    // Invalidate all sessions
    await pool.execute(`
      DELETE FROM sessions 
      WHERE user_id = ?
    `, [userId]);

    return res.status(200).json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to deactivate account due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user's notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get pagination parameters
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const offset = (page - 1) * limit;
    const unreadFilter = unreadOnly === 'true' ? 'AND is_read = 0' : '';
    
    // Get notifications with daycare names
    const [notifications] = await pool.execute(`
      SELECT n.*, d.operation_name AS daycare_name
      FROM notifications n
      LEFT JOIN daycares d ON n.operation_number = d.operation_number
      WHERE n.user_id = ? ${unreadFilter}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);
    
    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM notifications
      WHERE user_id = ? ${unreadFilter}
    `, [userId]);
    
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
    console.error('Get notifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    
    // Mark notification as read
    const [result] = await pool.execute(`
      UPDATE notifications
      SET is_read = 1
      WHERE id = ? AND user_id = ?
    `, [notificationId, userId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or not owned by user'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while marking notification as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mark all notifications as read
router.patch('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Mark all notifications as read
    const [result] = await pool.execute(`
      UPDATE notifications
      SET is_read = 1
      WHERE user_id = ? AND is_read = 0
    `, [userId]);
    
    return res.status(200).json({
      success: true,
      message: `Marked ${result.affectedRows} notifications as read`
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while marking notifications as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete a notification
router.delete('/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    
    // Delete notification
    const [result] = await pool.execute(`
      DELETE FROM notifications
      WHERE id = ? AND user_id = ?
    `, [notificationId, userId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or not owned by user'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Admin routes - these require admin privileges

// Get all users - admin only
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let queryParams = [];
    let searchClause = '';

    if (search) {
      searchClause = `
        WHERE username LIKE ? 
        OR email LIKE ? 
        OR first_name LIKE ? 
        OR last_name LIKE ?
      `;
      const searchTerm = `%${search}%`;
      queryParams = [searchTerm, searchTerm, searchTerm, searchTerm];
    }

    // MySQL2 doesn't allow ? placeholders for LIMIT and OFFSET in prepared statements
    // So we need to convert them to integers and insert them directly in the query
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);
    
    // Get paginated users
    const [users] = await pool.execute(`
      SELECT id, username, email, first_name, last_name, role, is_active, created_at, last_login
      FROM users
      ${searchClause}
      ORDER BY created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `, [...queryParams]);

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM users
      ${searchClause}
    `, searchClause ? queryParams : []);

    const total = countResult[0].total;

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user by ID - admin only
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get user with join to user_profiles
    const [profiles] = await pool.execute(`
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at, u.last_login,
             up.profile_picture, up.phone_number, up.city, up.state, up.zip_code, up.bio 
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ?
    `, [id]);

    if (profiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user preferences
    const [preferences] = await pool.execute(`
      SELECT email_notifications, sms_notifications, newsletter_subscription
      FROM user_preferences
      WHERE user_id = ?
    `, [id]);

    // Combine profile and preferences
    const userProfile = {
      ...profiles[0],
      preferences: preferences.length > 0 ? preferences[0] : {}
    };

    return res.status(200).json({
      success: true,
      user: userProfile
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update user role - admin only
router.put('/:id/role', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role is required (user or admin)'
      });
    }

    // Update user role
    await pool.execute(`
      UPDATE users 
      SET role = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [role, id]);

    return res.status(200).json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Update role error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user role due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Activate/deactivate user - admin only
router.put('/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: 'isActive status is required'
      });
    }

    // Update user status
    await pool.execute(`
      UPDATE users 
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [isActive ? 1 : 0, id]);

    // If deactivating, invalidate all sessions
    if (!isActive) {
      await pool.execute(`
        DELETE FROM sessions 
        WHERE user_id = ?
      `, [id]);
    }

    return res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Update user status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user status due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;