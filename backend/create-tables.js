// Initialize database tables
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function createTables() {
  try {
    console.log('Connecting to MySQL database...');
    
    // Connect to MySQL using the information from .env
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'daycarealert',
      multipleStatements: true  // Allow multiple statements in one query
    });
    
    console.log('Connected to database successfully');
    
    // Altering users table to fix password column name
    console.log('Fixing users table password column...');
    try {
      await connection.query(`
        SHOW COLUMNS FROM users LIKE 'password'
      `);
      
      // If we get here, the column exists, rename it
      await connection.query(`
        ALTER TABLE users CHANGE COLUMN password password_hash VARCHAR(255) NOT NULL
      `);
      console.log('Renamed password column to password_hash');
    } catch (error) {
      // Column might not exist, try another method
      try {
        await connection.query(`
          SHOW COLUMNS FROM users LIKE 'password_hash'
        `);
        console.log('password_hash column already exists');
      } catch (innerError) {
        // Table might not exist yet, which is fine
        console.log('Users table might not exist yet, will be created by schema');
      }
    }
    
    // Adding missing columns and tables
    console.log('Adding sessions table if it does not exist...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        ip_address VARCHAR(45),
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP NULL DEFAULT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    
    // Add columns to users table if they don't exist
    console.log('Adding missing columns to users table...');
    try {
      // Check if users table exists first
      await connection.query(`
        SELECT 1 FROM users LIMIT 1
      `);
      
      // Add role and last_login columns if they don't exist
      const [columns] = await connection.query(`
        SHOW COLUMNS FROM users
      `);
      
      const columnNames = columns.map(column => column.Field);
      
      if (!columnNames.includes('role')) {
        await connection.query(`
          ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user'
        `);
        console.log('Added role column to users table');
      }
      
      if (!columnNames.includes('last_login')) {
        await connection.query(`
          ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL
        `);
        console.log('Added last_login column to users table');
      }
      
      if (!columnNames.includes('email_verified')) {
        await connection.query(`
          ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE
        `);
        console.log('Added email_verified column to users table');
      }
    } catch (error) {
      // Table might not exist yet
      console.log('Users table does not exist yet, will be created by schema');
    }
    
    // Now read and execute the full schema
    console.log('Reading schema file...');
    const schemaPath = path.join(__dirname, 'sql', 'schema.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf8');
    
    // Split the schema into separate statements to execute them one by one
    console.log('Executing schema...');
    const statements = schemaSQL.split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    for (const statement of statements) {
      try {
        await connection.query(statement + ';');
      } catch (error) {
        console.warn(`Warning executing statement: ${error.message}`);
        console.warn('Statement:', statement);
      }
    }
    
    console.log('Schema applied successfully');
    
    // Close the connection
    await connection.end();
    console.log('Database connection closed');
    
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

// Run the initialization if this script is executed directly
if (require.main === module) {
  createTables()
    .then(success => {
      if (success) {
        console.log('✅ Database tables created successfully');
        process.exit(0);
      } else {
        console.error('❌ Failed to create database tables');
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unexpected error:', err);
      process.exit(1);
    });
}

module.exports = { createTables };