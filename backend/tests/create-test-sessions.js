const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Use the backend .env database connection
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
};

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d' // Token expires in 30 days
  });
};

async function createTestUser() {
  console.log(`Connecting to database at ${dbConfig.host}...`);
  const pool = mysql.createPool(dbConfig);
  
  try {
    const connection = await pool.getConnection();
    console.log('Connected successfully');
    
    // Check if admin user exists
    const [adminUsers] = await connection.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      ['admin@example.com', 'admin']
    );
    
    let adminId;
    
    if (adminUsers.length === 0) {
      console.log('Admin user not found, creating...');
      // Create admin user
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Password123!', salt);
      
      const [result] = await connection.query(
        'INSERT INTO users (username, email, password_hash, role, email_verified, full_name) VALUES (?, ?, ?, ?, ?, ?)',
        ['admin', 'admin@example.com', passwordHash, 'admin', 1, 'Admin User']
      );
      
      adminId = result.insertId;
      console.log(`Admin user created with ID: ${adminId}`);
    } else {
      adminId = adminUsers[0].id;
      console.log(`Admin user found with ID: ${adminId}`);
      
      // Make sure the user is set up properly
      await connection.query(
        'UPDATE users SET role = "admin", email_verified = 1 WHERE id = ?',
        [adminId]
      );
      console.log('Admin user updated with admin role and verified email');
    }
    
    // Delete any existing sessions for this user
    await connection.query(
      'DELETE FROM sessions WHERE user_id = ?',
      [adminId]
    );
    
    // Create a new session
    const token = generateToken(adminId);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days from now
    
    await connection.query(
      'INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
      [adminId, token, '127.0.0.1', 'Test Script', expiryDate]
    );
    
    console.log('New session created successfully');
    console.log(`\nTest Login Credentials:`);
    console.log(`Username: admin`);
    console.log(`Email: admin@example.com`);
    console.log(`Password: Password123!`);
    console.log(`\nTest Token: ${token}`);
    console.log(`\nExample usage:`);
    console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:5001/api/debug/auth`);
    
    connection.release();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    pool.end();
  }
}

createTestUser();