const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// Special direct login endpoint for testing that handles user creation
router.post('/direct-login', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Check if user exists
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    let user;
    
    if (users.length === 0) {
      // Create user if they don't exist
      console.log(`Test user ${email} doesn't exist, creating...`);
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      
      // Insert user
      const [result] = await pool.query(`
        INSERT INTO users 
        (username, email, password_hash, role, verified, email_verified) 
        VALUES (?, ?, ?, 'user', 1, 1)
      `, [username || email.split('@')[0], email, passwordHash]);
      
      const userId = result.insertId;
      
      // Get the new user
      const [newUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      user = newUsers[0];
    } else {
      user = users[0];
      
      // Ensure user is verified for testing
      if (!user.verified) {
        await pool.query('UPDATE users SET verified = 1, email_verified = 1 WHERE id = ?', [user.id]);
        user.verified = 1;
        user.email_verified = 1;
      }
      
      // Check password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      
      if (!isMatch) {
        // For testing, update password if it doesn't match
        console.log(`Updating password for test user ${email}`);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);
      }
    }
    
    // Generate token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });
    
    // Create session
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 30);
    
    await pool.query(`
      INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `, [user.id, token, req.ip, req.headers['user-agent'], sessionExpiry]);
    
    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;
    
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Error in direct-login:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Test authentication endpoint
router.get('/auth-test', authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Authentication successful',
    user: req.user
  });
});

module.exports = router;