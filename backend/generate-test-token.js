// Script to generate a test JWT token for API testing
const jwt = require('jsonwebtoken');
const { pool } = require('./config/db');
require('dotenv').config();

async function generateTestToken() {
  try {
    // First check if we have an admin user
    const [adminUsers] = await pool.execute(
      'SELECT id, username, email, role FROM users WHERE role = ?',
      ['admin']
    );
    
    if (adminUsers.length === 0) {
      console.log('No admin users found. Creating a test admin user...');
      
      // Create a test admin user
      const [result] = await pool.execute(
        'INSERT INTO users (username, password, email, role, first_name, last_name, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['admin', '$2b$10$dULTydRRdlQsUbKO7r5gJu7vQh8oL.U0tPlefeDt0bvVsKhZfGI2W', 'admin@test.com', 'admin', 'Admin', 'User', 1]
      );
      
      const adminUserId = result.insertId;
      console.log(`Created admin user with ID: ${adminUserId}`);
      
      // Generate a token
      const token = jwt.sign(
        { userId: adminUserId, role: 'admin' },
        process.env.JWT_SECRET || 'secretkey',
        { expiresIn: '30d' }
      );
      
      // Store the token in the sessions table
      await pool.execute(
        'INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))',
        [adminUserId, token, '127.0.0.1', 'Test Script', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
      );
      
      console.log('===== TEST TOKEN GENERATED =====');
      console.log(token);
      console.log('================================');
      
      // Update the code in ReviewApproval.js
      console.log(`
To use this token in the frontend, use localStorage:

localStorage.setItem('token', '${token}');

or add this token directly to your API requests:

fetch('/api/reviews/by-status/pending', {
  headers: {
    'Authorization': 'Bearer ${token}'
  }
})
      `);
      
    } else {
      console.log(`Found ${adminUsers.length} admin users:`);
      console.table(adminUsers);
      
      // Generate a token for the first admin user
      const adminUser = adminUsers[0];
      const token = jwt.sign(
        { userId: adminUser.id, role: adminUser.role },
        process.env.JWT_SECRET || 'secretkey',
        { expiresIn: '30d' }
      );
      
      // Check if token already exists in sessions
      const [existingSessions] = await pool.execute(
        'SELECT * FROM sessions WHERE user_id = ?',
        [adminUser.id]
      );
      
      if (existingSessions.length > 0) {
        console.log('Using existing session token:', existingSessions[0].token);
        console.log('================================');
        
        // Update the code in ReviewApproval.js
        console.log(`
To use this token in the frontend, use localStorage:

localStorage.setItem('token', '${existingSessions[0].token}');

or add this token directly to your API requests:

fetch('/api/reviews/by-status/pending', {
  headers: {
    'Authorization': 'Bearer ${existingSessions[0].token}'
  }
})
        `);
        
      } else {
        // Store the token in the sessions table
        await pool.execute(
          'INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))',
          [adminUser.id, token, '127.0.0.1', 'Test Script', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
        );
        
        console.log('===== TEST TOKEN GENERATED =====');
        console.log(token);
        console.log('================================');
        
        // Update the code in ReviewApproval.js
        console.log(`
To use this token in the frontend, use localStorage:

localStorage.setItem('token', '${token}');

or add this token directly to your API requests:

fetch('/api/reviews/by-status/pending', {
  headers: {
    'Authorization': 'Bearer ${token}'
  }
})
        `);
      }
    }
  } catch (error) {
    console.error('Error generating test token:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

generateTestToken();