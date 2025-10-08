const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'daycarealert',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // More robust error handling
  connectTimeout: 10000, // 10s timeout
  acquireTimeout: 10000, // 10s timeout
  multipleStatements: true, // Allow multiple SQL statements
  // Return local mock data if connection fails
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000 // 30s keep-alive
});

// Simple function to check database connection
const checkConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection established successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
};

module.exports = {
  pool,
  checkConnection
};