const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function createAdminSession() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Get admin user ID
    const [users] = await conn.execute(
      'SELECT id FROM users WHERE email = ?',
      ['dohertybrianpm@yahoo.com']
    );

    if (users.length === 0) {
      console.error('Admin user not found');
      return;
    }

    const userId = users[0].id;

    // Generate JWT token
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    // Store token in sessions table
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 30); // Session expires in 30 days

    await conn.execute(
      'INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
      [userId, token, '127.0.0.1', 'Admin Session', sessionExpiry]
    );

    console.log('Admin session created successfully');
    console.log('User ID:', userId);
    console.log('Token for admin user:', token);
    console.log('Please copy this token and use it in localStorage');

    await conn.end();
  } catch (err) {
    console.error('Error:', err);
  }
}

createAdminSession();