const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();
const { pool } = require('../config/db');

// Special direct login with no CORS or other restrictions
router.post('/direct-login', async (req, res) => {
  try {
    console.log('Special direct login called');
    
    // Set CORS headers to allow from any origin
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle OPTIONS preflight request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    const { email, password } = req.body;
    console.log('Login attempt for:', email);
    
    // Try to find the user
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      console.log(`User ${email} not found`);
      // Create user if in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`Creating user ${email}`);
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        // Insert user
        const [result] = await pool.query(`
          INSERT INTO users 
          (username, email, password_hash, role, verified, email_verified) 
          VALUES (?, ?, ?, 'user', 1, 1)
        `, [email.split('@')[0], email, passwordHash]);
        
        const userId = result.insertId;
        
        // Generate token
        const token = jwt.sign(
          { userId },
          process.env.JWT_SECRET || 'hK9E2pRt7Uw3vX8yZ1aB6cD4eF5gH',
          { expiresIn: '30d' }
        );
        
        // Create session
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        
        await pool.query(`
          INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
          VALUES (?, ?, ?, ?, ?)
        `, [userId, token, req.ip, req.headers['user-agent'], expiryDate]);
        
        // Return new user data
        const [newUser] = await pool.query('SELECT id, username, email, role, verified FROM users WHERE id = ?', [userId]);
        
        return res.status(200).json({
          success: true,
          message: 'Auto-created user and logged in',
          user: newUser[0],
          token
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // We found the user, check password
    const user = users[0];
    
    // Auto-verify user in development
    if (process.env.NODE_ENV === 'development' && !user.verified) {
      await pool.query('UPDATE users SET verified = 1, email_verified = 1 WHERE id = ?', [user.id]);
      user.verified = 1;
      user.email_verified = 1;
    }
    
    // Check if it's development mode and we should auto-login
    let isMatch = false;
    
    try {
      isMatch = await bcrypt.compare(password, user.password_hash);
    } catch (bcryptError) {
      console.error('bcrypt error:', bcryptError);
      // In development, bypass password check if there's an error
      if (process.env.NODE_ENV === 'development') {
        isMatch = true;
      }
    }
    
    // In development, update password if it doesn't match
    if (!isMatch && process.env.NODE_ENV === 'development') {
      console.log('Development mode: updating password');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      
      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);
      
      isMatch = true;
    }
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'hK9E2pRt7Uw3vX8yZ1aB6cD4eF5gH',
      { expiresIn: '30d' }
    );
    
    // Create session
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    try {
      await pool.query(`
        INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `, [user.id, token, req.ip, req.headers['user-agent'], expiryDate]);
    } catch (sessionError) {
      console.error('Failed to create session, continuing anyway:', sessionError.message);
    }
    
    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;
    
    console.log('Login successful for:', email);
    
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Special direct login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login error',
      error: error.message
    });
  }
});

// Simple check for user by token
router.get('/check', async (req, res) => {
  try {
    // Set CORS headers to allow from any origin
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle OPTIONS preflight request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }
    
    // Verify token
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'hK9E2pRt7Uw3vX8yZ1aB6cD4eF5gH');
    } catch (jwtError) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid token', 
        error: jwtError.message 
      });
    }
    
    // Get user
    const [users] = await pool.query(
      'SELECT id, username, email, role, verified FROM users WHERE id = ?',
      [payload.userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Valid token',
      user: users[0]
    });
  } catch (error) {
    console.error('Check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Check error',
      error: error.message
    });
  }
});

// Special direct register with no CORS or other restrictions
router.post('/direct-register', async (req, res) => {
  try {
    console.log('Special direct register called');
    
    // Set CORS headers to allow from any origin
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle OPTIONS preflight request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    const { username, email, password, fullName } = req.body;
    console.log('Registration attempt for:', email);
    
    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password'
      });
    }
    
    // Try to find if user already exists
    const [existingUsers] = await pool.query(
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
    
    // Create a new user that's automatically verified in development
    const [result] = await pool.query(`
      INSERT INTO users (username, email, password_hash, full_name, verified, email_verified)
      VALUES (?, ?, ?, ?, 1, 1)
    `, [username, email, passwordHash, fullName || null]);
    
    const userId = result.insertId;
    
    // Create verification token for completeness
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token expires in 24 hours
    
    try {
      // Try to insert verification token
      await pool.query(`
        INSERT INTO verification_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
      `, [userId, verificationToken, tokenExpiry]);
    } catch (tokenError) {
      console.error('Error creating verification token:', tokenError.message);
      // Continue anyway
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'hK9E2pRt7Uw3vX8yZ1aB6cD4eF5gH',
      { expiresIn: '30d' }
    );
    
    // Create session
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 30);
    
    try {
      await pool.query(`
        INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `, [userId, token, req.ip, req.headers['user-agent'], sessionExpiry]);
    } catch (sessionError) {
      console.error('Error creating session:', sessionError.message);
      // Continue anyway
    }
    
    // Get user data to return
    const [users] = await pool.query(
      'SELECT id, username, email, full_name, role, created_at, verified, email_verified FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'User created but could not be retrieved'
      });
    }
    
    console.log('Registration successful for:', email);
    
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: users[0],
      token
    });
  } catch (error) {
    console.error('Special direct register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration error',
      error: error.message
    });
  }
});

module.exports = router;