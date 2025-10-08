const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth-fixed');
const logger = require('../utils/logger');
const daycareProviderModel = require('../models/daycareProviders');
const emailService = require('../services/emailService');

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d' // Token expires in 30 days
  });
};

// Register a new daycare provider
router.post('/register', async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      fullName, 
      phone, 
      daycare_id, 
      position,
      provider_code // Optional - for linking to existing daycare
    } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password'
      });
    }

    // Either daycare_id or provider_code must be provided
    if (!daycare_id && !provider_code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either daycare_id or provider_code'
      });
    }

    // Verify the daycare exists
    let verifiedDaycareId = daycare_id;

    // If provider_code is provided, validate it
    if (provider_code) {
      const existingProvider = await daycareProviderModel.getProviderByCode(provider_code);
      
      if (!existingProvider) {
        return res.status(400).json({
          success: false,
          message: 'Invalid provider code'
        });
      }
      
      verifiedDaycareId = existingProvider.daycare_id;
    } else {
      // Verify daycare exists in the database
      try {
        // Check daycare_operations table
        const [operations] = await pool.execute(
          'SELECT OPERATION_ID FROM daycare_operations WHERE OPERATION_ID = ?',
          [verifiedDaycareId]
        );
        
        if (operations.length === 0) {
          // Try daycares table
          const [daycares] = await pool.execute(
            'SELECT operation_number FROM daycares WHERE operation_number = ?',
            [verifiedDaycareId]
          );
          
          if (daycares.length === 0) {
            return res.status(400).json({
              success: false,
              message: 'Daycare not found with the provided ID'
            });
          }
        }
      } catch (dbError) {
        logger.error('Database error validating daycare:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Error validating daycare'
        });
      }
    }

    // Check if user already exists
    try {
      const [existingUsers] = await pool.execute(
        'SELECT * FROM users WHERE email = ? OR username = ?',
        [email, username]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'User with this email or username already exists'
        });
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Determine if this is the first provider for this daycare (and should be admin)
      const [existingProviders] = await pool.execute(
        'SELECT COUNT(*) as count FROM daycare_providers WHERE daycare_id = ?',
        [verifiedDaycareId]
      );
      
      const isFirstProvider = existingProviders[0].count === 0;

      // Insert new user with daycare_provider role
      const [result] = await pool.execute(
        'INSERT INTO users (username, email, phone_number, password_hash, full_name, role, verified, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          username, 
          email, 
          phone || null, 
          passwordHash, 
          fullName || null, 
          'daycare_provider', 
          provider_code ? 1 : 0, // Auto-verify if using provider code 
          provider_code ? 1 : 0  // Auto-verify email if using provider code
        ]
      );

      const userId = result.insertId;

      // Create daycare provider record
      const providerData = {
        user_id: userId,
        daycare_id: verifiedDaycareId,
        position: position || 'Staff',
        phone: phone || null,
        is_admin: isFirstProvider || provider_code ? 1 : 0 // First provider or invited via code is admin
      };

      const provider = await daycareProviderModel.createDaycareProvider(providerData);

      // Generate JWT token
      const token = generateToken(userId);

      // Store token in sessions table
      const sessionExpiry = new Date();
      sessionExpiry.setDate(sessionExpiry.getDate() + 30); // Session expires in 30 days
      
      await pool.execute(
        'INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
        [userId, token, req.ip, req.headers['user-agent'], sessionExpiry]
      );

      // Update last login time
      await pool.execute(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
      );
      
      // Get daycare name for welcome message
      let daycareName = 'your daycare';
      try {
        // Try operations table first
        const [daycare] = await pool.execute(
          'SELECT OPERATION_NAME FROM daycare_operations WHERE OPERATION_ID = ?',
          [verifiedDaycareId]
        );
        
        if (daycare.length > 0) {
          daycareName = daycare[0].OPERATION_NAME;
        } else {
          // Try daycares table
          const [daycares] = await pool.execute(
            'SELECT operation_name FROM daycares WHERE operation_number = ?',
            [verifiedDaycareId]
          );
          
          if (daycares.length > 0) {
            daycareName = daycares[0].operation_name;
          }
        }
      } catch (err) {
        // Ignore errors getting daycare name
        logger.warn('Error getting daycare name:', err);
      }

      // Send welcome email
      try {
        await emailService.sendDaycareProviderWelcomeEmail({
          email,
          fullName: fullName || username,
          daycareName
        });
        
        logger.info(`Welcome email sent to daycare provider: ${email}`);
      } catch (emailError) {
        logger.error('Error sending welcome email to daycare provider:', emailError);
        // Don't fail registration if email fails
      }

      // Return user info and token
      return res.status(201).json({
        success: true,
        message: 'Daycare provider registered successfully',
        user: {
          id: userId,
          username,
          email,
          full_name: fullName || null,
          role: 'daycare_provider'
        },
        provider: {
          provider_code: provider.provider_code,
          daycare_id: verifiedDaycareId,
          is_admin: providerData.is_admin
        },
        token
      });
    } catch (dbError) {
      logger.error('Database error during daycare provider registration:', dbError);
      throw dbError;
    }
  } catch (error) {
    logger.error('Daycare provider registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Generate a new provider code for inviting more staff
router.post('/generate-invite-code', authenticateToken, async (req, res) => {
  try {
    // Verify user is a daycare provider and admin
    const provider = await daycareProviderModel.getProviderByUserId(req.user.id);
    
    if (!provider) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User is not a daycare provider.'
      });
    }
    
    if (!provider.is_admin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only daycare admins can generate invite codes.'
      });
    }
    
    // Generate a new provider code
    const newCode = await daycareProviderModel.generateProviderCode();
    
    // Record the new code (create a temporary provider record)
    const [result] = await pool.execute(
      `INSERT INTO daycare_providers (
         daycare_id, provider_code, is_admin, verified, user_id
       ) VALUES (?, ?, 0, 0, ?)`,
      [provider.daycare_id, newCode, req.user.id]
    );
    
    return res.status(200).json({
      success: true,
      message: 'Invite code generated successfully',
      invite_code: newCode,
      daycare_id: provider.daycare_id
    });
  } catch (error) {
    logger.error('Error generating invite code:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate invite code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Validate a provider code
router.get('/validate-code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Provider code is required'
      });
    }
    
    const provider = await daycareProviderModel.getProviderByCode(code);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Invalid provider code'
      });
    }
    
    // Get daycare name
    let daycareName = 'Unknown Daycare';
    try {
      // Try operations table first
      const [daycare] = await pool.execute(
        'SELECT OPERATION_NAME FROM daycare_operations WHERE OPERATION_ID = ?',
        [provider.daycare_id]
      );
      
      if (daycare.length > 0) {
        daycareName = daycare[0].OPERATION_NAME;
      } else {
        // Try daycares table
        const [daycares] = await pool.execute(
          'SELECT operation_name FROM daycares WHERE operation_number = ?',
          [provider.daycare_id]
        );
        
        if (daycares.length > 0) {
          daycareName = daycares[0].operation_name;
        }
      }
    } catch (err) {
      // Ignore errors getting daycare name
      logger.warn('Error getting daycare name:', err);
    }
    
    return res.status(200).json({
      success: true,
      daycare: {
        id: provider.daycare_id,
        name: daycareName
      }
    });
  } catch (error) {
    logger.error('Error validating provider code:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating provider code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

  // Add this to daycareAuth.js if it doesn't exist
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find the user by email
      const [users] = await pool.execute(
        'SELECT u.*, dp.daycare_id, dp.is_admin FROM users u ' +
        'JOIN daycare_providers dp ON u.id = dp.user_id ' +
        'WHERE u.email = ? AND u.role = "daycare_provider"',
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const user = users[0];

      // Check password
      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate token
      const token = generateToken(user.id);

      // Store token in sessions table
      const sessionExpiry = new Date();
      sessionExpiry.setDate(sessionExpiry.getDate() + 30);

      await pool.execute(
        'INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
        [user.id, token, req.ip, req.headers['user-agent'], sessionExpiry]
      );

      // Update last login time
      await pool.execute(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          is_daycare_admin: user.is_admin === 1,
          daycare_id: user.daycare_id
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error during login'
      });
    }
  });
module.exports = router;
