#!/usr/bin/env node

/**
 * Simple Test for Violation Tracking System
 * 
 * This simplified test script checks each component individually
 * to make troubleshooting easier.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');

// Database configuration
const dbConfig = {
  socketPath: '/var/run/mysqld/mysqld.sock',
  user: 'root',
  password: 'Bd03021988!!',
  database: 'daycarealert',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Email configuration 
const emailConfig = {
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: 'info@daycarealert.com',
    pass: 'Bd03021988!!'
  },
  tls: {
    rejectUnauthorized: false
  }
};

// Check database connection
async function testDatabaseConnection() {
  console.log('\n--- Testing Database Connection ---');
  const pool = mysql.createPool(dbConfig);
  
  try {
    const [result] = await pool.query('SELECT NOW() as time');
    console.log(`✅ Database connection successful. Server time: ${result[0].time}`);
    return true;
  } catch (err) {
    console.error(`❌ Database connection error: ${err.message}`);
    return false;
  } finally {
    await pool.end();
  }
}

// Check tables exist
async function testTables() {
  console.log('\n--- Testing Database Tables ---');
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Check violation-related tables
    const tables = ['violation_changes', 'violation_notifications', 'violation_summary'];
    let missingTables = [];
    
    for (const table of tables) {
      const [result] = await pool.query(`SHOW TABLES LIKE '${table}'`);
      if (result.length === 0) {
        missingTables.push(table);
      }
    }
    
    if (missingTables.length === 0) {
      console.log('✅ All required tables exist');
      return true;
    } else {
      console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Error checking tables: ${err.message}`);
    return false;
  } finally {
    await pool.end();
  }
}

// Check user table structure
async function testUserTable() {
  console.log('\n--- Testing User Table ---');
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Describe the users table
    const [columns] = await pool.query('DESCRIBE users');
    const columnNames = columns.map(col => col.Field);
    
    console.log('User table columns:');
    columnNames.forEach(column => console.log(`- ${column}`));
    
    // Check for a user with email
    const [users] = await pool.query(`
      SELECT id, email, username, full_name 
      FROM users 
      WHERE email IS NOT NULL 
      LIMIT 1
    `);
    
    if (users.length > 0) {
      const user = users[0];
      console.log(`✅ Found test user: ID ${user.id}, Email: ${user.email}`);
      return true;
    } else {
      console.log('❌ No users found with email addresses');
      return false;
    }
  } catch (err) {
    console.error(`❌ Error checking user table: ${err.message}`);
    return false;
  } finally {
    await pool.end();
  }
}

// Check email configuration
async function testEmailConfig() {
  console.log('\n--- Testing Email Configuration ---');
  
  try {
    console.log(`Testing connection to ${emailConfig.host}:${emailConfig.port}`);
    const transporter = nodemailer.createTransport(emailConfig);
    const result = await transporter.verify();
    console.log('✅ Email configuration is valid and connected to SMTP server');
    return true;
  } catch (err) {
    console.error(`❌ Email configuration error: ${err.message}`);
    console.log('Email config:', JSON.stringify({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      user: emailConfig.auth.user
    }, null, 2));
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('=== Simple Violation Tracking Test ===');
  
  const testResults = {
    database: await testDatabaseConnection(),
    tables: await testTables(),
    users: await testUserTable(),
    email: await testEmailConfig()
  };
  
  console.log('\n=== Test Summary ===');
  console.log(`Database Connection: ${testResults.database ? '✅ Success' : '❌ Failed'}`);
  console.log(`Required Tables: ${testResults.tables ? '✅ Success' : '❌ Failed'}`);
  console.log(`User Table: ${testResults.users ? '✅ Success' : '❌ Failed'}`);
  console.log(`Email Configuration: ${testResults.email ? '✅ Success' : '❌ Failed'}`);
  
  const overallSuccess = Object.values(testResults).every(result => result === true);
  console.log(`\nOverall Status: ${overallSuccess ? '✅ All tests passed' : '❌ Some tests failed'}`);
}

runTests().catch(console.error);
