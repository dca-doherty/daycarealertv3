/**
 * Script to initialize user authentication tables
 */
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

async function createUserTables() {
  try {
    console.log('Creating user authentication tables...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id int AUTO_INCREMENT PRIMARY KEY,
        username varchar(50),
        email varchar(255) UNIQUE,
        password_hash varchar(255),
        role enum('user','admin','daycare_provider') DEFAULT 'user',
        verified tinyint(1) DEFAULT 0,
        verification_token varchar(255),
        reset_token varchar(255),
        reset_token_expiry datetime,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        phone_number varchar(20),
        full_name varchar(100),
        preferences json,
        email_verified tinyint(1) DEFAULT 0,
        last_login datetime
      )
    `);
    console.log('Users table created or already exists');
    
    // Create sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id int AUTO_INCREMENT PRIMARY KEY,
        user_id int,
        token varchar(255),
        ip_address varchar(45),
        user_agent text,
        expires_at timestamp,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        last_activity timestamp NULL DEFAULT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Sessions table created or already exists');
    
    // Create verification_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id int AUTO_INCREMENT PRIMARY KEY,
        user_id int,
        token varchar(255),
        expires_at timestamp,
        is_used tinyint(1) DEFAULT 0,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Verification tokens table created or already exists');
    
    // Check if we need to add an admin user
    const [admins] = await pool.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    
    if (admins.length === 0) {
      console.log('Creating admin user...');
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Password123!', salt);
      
      // Insert admin user
      await pool.query(`
        INSERT INTO users (username, email, password_hash, role, verified, email_verified, full_name) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, ['admin', 'admin@example.com', passwordHash, 'admin', 1, 1, 'Admin User']);
      
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
    
    // Check if we need to add a test user
    const [testUsers] = await pool.query(`SELECT id FROM users WHERE email = ? LIMIT 1`, ['test@example.com']);
    
    if (testUsers.length === 0) {
      console.log('Creating test user...');
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Password123!', salt);
      
      // Insert test user with full setup
      const testUserId = (await pool.query(`
        INSERT INTO users (username, email, password_hash, role, verified, email_verified, full_name) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, ['testuser', 'test@example.com', passwordHash, 'user', 1, 1, 'Test User']))[0].insertId;
      
      // Create a session for the test user that's valid for 30 days
      const sessionExpiry = new Date();
      sessionExpiry.setDate(sessionExpiry.getDate() + 30);
      
      // Generate a fixed token for testing
      const testToken = 'test_token_for_testuser';
      
      // Add a session
      await pool.query(`
        INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `, [testUserId, testToken, '127.0.0.1', 'Test Browser', sessionExpiry]);
      
      console.log('Test user created successfully');
    } else {
      console.log('Test user already exists');
    }
    
    console.log('User authentication tables initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Error initializing user tables:', error);
    return false;
  }
}

// If this script is run directly
if (require.main === module) {
  createUserTables()
    .then(() => {
      console.log('Script execution complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script execution failed:', error);
      process.exit(1);
    });
}

module.exports = createUserTables;