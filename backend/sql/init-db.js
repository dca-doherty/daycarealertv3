const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function initializeDatabase() {
  try {
    console.log('Connecting to database...');
    
    // Create connection to MySQL server without selecting a database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    // Check if database exists, create it if it doesn't
    const dbName = process.env.DB_NAME || 'daycarealert';
    console.log(`Checking if database ${dbName} exists...`);
    
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`Database ${dbName} created or already exists`);
    
    // Select the database
    await connection.query(`USE ${dbName}`);
    
    // Read and execute schema SQL
    const schemaFile = path.join(__dirname, 'schema.sql');
    console.log(`Reading schema file: ${schemaFile}`);
    
    const schema = fs.readFileSync(schemaFile, 'utf8');
    
    // Split the schema into separate statements
    const statements = schema
      .split(';')
      .filter(statement => statement.trim() !== '');
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    for (const statement of statements) {
      await connection.query(statement + ';');
    }
    
    console.log('Database schema created successfully');
    
    await connection.end();
    console.log('Database initialization completed');
    
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
}

// If script is run directly (not imported), execute initialization
if (require.main === module) {
  initializeDatabase()
    .then(success => {
      if (success) {
        console.log('✅ Database setup completed successfully');
        process.exit(0);
      } else {
        console.error('❌ Database setup failed');
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unexpected error during database setup:', err);
      process.exit(1);
    });
} else {
  // Export for use in other files
  module.exports = { initializeDatabase };
}