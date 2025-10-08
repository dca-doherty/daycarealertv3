const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  // Create connection without database specified
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'daycarealert'}`);
    console.log(`Database '${process.env.DB_NAME || 'daycarealert'}' created or verified`);

    // Connect to the database
    await connection.query(`USE ${process.env.DB_NAME || 'daycarealert'}`);

    // Create tour_requests table
    const tourRequestsSQL = fs.readFileSync(
      path.join(__dirname, '../models/tourRequests.sql'),
      'utf8'
    );
    await connection.query(tourRequestsSQL);
    console.log('Tour requests table created or verified');

    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await connection.end();
  }
}

// Run the setup function
setupDatabase();