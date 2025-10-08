const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
require('dotenv').config();

// Fallback mock users for development when database is unavailable
const mockUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    password_hash: '$2a$10$iqbBAdjNaS9i/FkgVEW7e.g24VdLdbWPcVXV/iZ0J/5Zeh2ZzgQZe', // 'Password123!'
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin',
    verified: 1,
    created_at: new Date().toISOString(),
    email_verified: 1
  },
  {
    id: 2,
    username: 'dohertybrianpm',
    email: 'dohertybrianpm@yahoo.com',
    password_hash: '$2a$10$iqbBAdjNaS9i/FkgVEW7e.g24VdLdbWPcVXV/iZ0J/5Zeh2ZzgQZe', // 'Password123!'
    first_name: 'Brian',
    last_name: 'Doherty',
    role: 'user',
    verified: 1,
    created_at: new Date().toISOString(),
    email_verified: 1
  }
];

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d' // Token expires in 30 days
  });
};

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password'
      });
    }

    try {
      // Check if user already exists
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

      // Insert new user - automatically verify in development mode
      const [result] = await pool.execute(
        'INSERT INTO users (username, email, password_hash, full_name, verified, email_verified) VALUES (?, ?, ?, ?, ?, ?)',
        [username, email, passwordHash, fullName || null, process.env.NODE_ENV === 'development' ? 1 : 0, process.env.NODE_ENV === 'development' ? 1 : 0]
      );

      const userId = result.insertId;

      // Create verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token expires in 24 hours

      await pool.execute(
        'INSERT INTO verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [userId, verificationToken, tokenExpiry]
      );
      
      // Update verification token in users table as well for compatibility
      await pool.execute(
        'UPDATE users SET verification_token = ? WHERE id = ?',
        [verificationToken, userId]
      );
      
      try {
        // Try to create user preferences record if table exists
        await pool.execute(
          'INSERT INTO user_preferences (user_id) VALUES (?)',
          [userId]
        );
      } catch (err) {
        console.log('user_preferences table may not exist, skipping');
      }
      
      try {
        // Try to create user profile record if table exists
        await pool.execute(
          'INSERT INTO user_profiles (user_id) VALUES (?)',
          [userId]
        );
      } catch (err) {
        console.log('user_profiles table may not exist, skipping');
      }

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

      // Return user info and token (excluding password)
      const [users] = await pool.execute(
        'SELECT id, username, email, full_name, role, created_at FROM users WHERE id = ?',
        [userId]
      );

      // Send welcome email
      try {
	const emailService = require('../services/emailService');
	await emailService.sendWelcomeEmail(users[0], verificationToken);
	console.log(`Welcome email with verification link sent to ${users[0].email}`);
      } catch (emailError) {
	console.error('Error sending welcome email:', emailError);
	// Don't fail registration if email fails
      }

      return res.status(201).json({
        success: true,
        message: 'User registered successfully! Please check your email to verify your account',
        user: users[0],
        token
      });
    } catch (dbError) {
      console.error('Database error during registration:', dbError);
      
      // Mock registration in development when database is unavailable
      if (process.env.NODE_ENV === 'development') {
        // Create new mock user
        const newUserId = mockUsers.length + 1;
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const newUser = {
          id: newUserId,
          username,
          email,
          password_hash: passwordHash,
          full_name: fullName || null,
          role: 'user',
          verified: 1,
          created_at: new Date().toISOString(),
          email_verified: 1
        };
        
        mockUsers.push(newUser);
        
        // Generate token
        const token = generateToken(newUserId);
        
        const { password_hash, ...userWithoutPassword } = newUser;
        

	// Try to send welcome email in mock mode too
	try {
	  const emailService = require('../services/emailService');
	  await emailService.sendWelcomeEmail(userWithoutPassword, verificationToken);
	  console.log(`Welcome email sent to ${userWithoutPassword.email} (mock mode)`);
	} catch (emailError) {
	  console.error('Error sending welcome email in mock mode:', emailError);
	  // Don't fail registration if email fails
	}

        return res.status(201).json({
          success: true,
          message: 'User registered successfully (mock)',
          user: userWithoutPassword,
          token
        });
      }
      
      throw dbError;
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    try {
      // Try to fetch from database first
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (users.length > 0) {
        const user = users[0];

        // Check if user is verified (using 'verified' instead of 'is_active')
        if (!user.verified) {
          return res.status(403).json({
            success: false,
            message: 'Account is inactive or suspended'
          });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
          });
        }

        // Generate JWT token
        const token = generateToken(user.id);

        // Store token in sessions table
        const sessionExpiry = new Date();
        sessionExpiry.setDate(sessionExpiry.getDate() + 30); // Session expires in 30 days
        
        await pool.execute(
          'INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
          [user.id, token, req.ip, req.headers['user-agent'], sessionExpiry]
        );

        // Update last login time
        await pool.execute(
          'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
          [user.id]
        );

        // Return user info and token (excluding password)
        const { password_hash, ...userWithoutPassword } = user;

        return res.status(200).json({
          success: true,
          message: 'Login successful',
          user: userWithoutPassword,
          token
        });
      } else {
        // No user found in database, try mock users if in development
        throw new Error('User not found in database');
      }
    } catch (dbError) {
      console.error('Database error during login:', dbError);
      
      // Use mock users when database is unavailable (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('Using mock users for login due to database error');
        
        // Find user by email in mock data
        const mockUser = mockUsers.find(u => u.email === email);
        
        if (!mockUser) {
          return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
          });
        }
        
        // Compare password with mock user
        const isMatch = await bcrypt.compare(password, mockUser.password_hash);
        
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
          });
        }
        
        // Generate token for mock user
        const token = generateToken(mockUser.id);
        
        // Return mock user data (excluding password)
        const { password_hash, ...userWithoutPassword } = mockUser;
        
        return res.status(200).json({
          success: true,
          message: 'Login successful (mock user)',
          user: userWithoutPassword,
          token
        });
      }
      
      // If not in development, or if mock login fails, continue with regular error handling
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Logout user
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Get token from request
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    try {
      // Remove session from database
      await pool.execute(
        'DELETE FROM sessions WHERE token = ?',
        [token]
      );
    } catch (dbError) {
      console.warn('Database error during logout (ignoring):', dbError.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Logout failed due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Verify user email
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find verification token
    const [tokens] = await pool.execute(
      'SELECT * FROM verification_tokens WHERE token = ? AND is_used = 0 AND expires_at > NOW()',
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    const verificationToken = tokens[0];

    // Mark user as verified
    await pool.execute(
      'UPDATE users SET verified = 1, email_verified = 1 WHERE id = ?',
      [verificationToken.user_id]
    );

    // Mark token as used
    await pool.execute(
      'UPDATE verification_tokens SET is_used = 1 WHERE id = ?',
      [verificationToken.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Email verification failed due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
console.log('[DEBUG] Forgot password request received:', req.body);
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address'
      });
    }

    try {
      // Check if user exists
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (users.length > 0) {
        const user = users[0];

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date();
        tokenExpiry.setHours(tokenExpiry.getHours() + 1); // Token expires in 1 hour

        // Store token in database
        await pool.execute(
          'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
          [user.id, resetToken, tokenExpiry]
        );
	// Also update the reset_token in the users table
	await pool.execute(
	  'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
	  [resetToken, tokenExpiry, user.id]
	);
	
        // Send a password reset email
        console.log('[DEBUG] Sending email to', user.email, 'with token', resetToken);
        try {
          const emailService = require('../services/emailService');
          await emailService.sendPasswordResetEmail(user, resetToken);
          console.log(`Password reset email sent to ${user.email}`);
          const resetUrl = `${process.env.FRONTEND_URL || 'https://daycarealert.com'}/reset-password/${resetToken}`;
          console.log(`[DEV/TEST] Password reset URL: ${resetUrl}`);
        } catch (emailError) {
          console.error('[DEBUG] Full email error:', emailError);
          console.error('Error sending password reset email:', emailError);
          console.error('Email error details:', emailError.message);
          const resetUrl = `${process.env.FRONTEND_URL || 'https://daycarealert.com'}/reset-password/${resetToken}`;
          console.log(`[FALLBACK] Password reset URL: ${resetUrl}`);
          // Don't fail the request if email fails
        }
      }
    } catch (dbError) {
      console.warn('Database error during password reset (proceeding anyway):', dbError.message);
    }
    // For security reasons, still return success to prevent email enumeration
    return res.status(200).json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return res.status(500).json({
      success: false,
      message: 'Password reset request failed due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide token and new password'
      });
    }

    // Find reset token
    const [tokens] = await pool.execute(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND is_used = 0 AND expires_at > NOW()',
      [token]
    );
    let resetToken;
    if (tokens.length === 0) {
     const [users] = await pool.execute(
	'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
	[token]
    );
    
    if (users.length === 0) {
      return res.status(400).json({
	success: false,
	message: 'Invalid or expired reset token'
      });
    }
    // Create a compatible reset token object from user data
    resetToken = {
      id: null, // No id since it's not from password_reset_tokens
      user_id: users[0].id,
      token: token,
      is_used: 0,
      expires_at: users[0].reset_token_expiry
    };
   } else {
	resetToken = tokens[0];
   }
 
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Update user password
    await pool.execute(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [passwordHash, resetToken.user_id]
    );

    // Mark token as used
    if (resetToken.id) {
      await pool.execute(
         'UPDATE password_reset_tokens SET is_used = 1 WHERE id = ?',
         [resetToken.id]
    );
   }
    // Invalidate all existing sessions for security
    await pool.execute(
      'DELETE FROM sessions WHERE user_id = ?',
      [resetToken.user_id]
    );

    return res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({
      success: false,
      message: 'Password reset failed due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current user info (protected route)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // User is already added to req by authenticateToken middleware
    return res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user info due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
