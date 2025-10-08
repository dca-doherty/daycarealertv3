require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  try {
    console.log('Running database migrations...');
    
    // Connect to MySQL using the information from .env
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'daycarealert',
      multipleStatements: true  // Allow multiple statements in one query
    });
    
    console.log('Connected to database successfully');
    
    // Read and execute the user_preferences migration
    console.log('Adding user_preferences table...');
    const userPrefsPath = path.join(__dirname, 'sql', 'user_preferences.sql');
    const userPrefsSQL = await fs.readFile(userPrefsPath, 'utf8');
    
    // Execute the SQL
    await connection.query(userPrefsSQL);
    console.log('User preferences table created successfully');
    
    // Close the connection
    await connection.end();
    console.log('Database migration completed');
    
    return true;
  } catch (error) {
    console.error('Error running migration:', error);
    return false;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration()
    .then(success => {
      if (success) {
        console.log('✅ Database migration completed successfully');
        process.exit(0);
      } else {
        console.error('❌ Failed to run database migration');
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unexpected error:', err);
      process.exit(1);
    });
}

module.exports = { runMigration };