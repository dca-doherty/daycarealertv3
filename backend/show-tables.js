const mysql = require('mysql2/promise');
require('dotenv').config();

async function showTables() {
  try {
    console.log("Connecting to database using .env settings...");
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log("Connected successfully! Fetching tables...");
    const [tables] = await connection.query('SHOW TABLES');
    
    console.log("\nDatabase Tables:");
    console.log("----------------");
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${Object.values(table)[0]}`);
    });
    
    // Check for authentication-related tables
    const authTables = ['users', 'sessions', 'verification_tokens', 'password_reset_tokens'];
    console.log("\nAuthentication Tables Check:");
    console.log("--------------------------");
    for (const tableName of authTables) {
      const exists = tables.some(table => Object.values(table)[0] === tableName);
      console.log(`${tableName}: ${exists ? '✅ Exists' : '❌ Missing'}`);
    }

    // Check if sessions table has required columns
    if (tables.some(table => Object.values(table)[0] === 'sessions')) {
      console.log("\nSessions Table Columns:");
      console.log("----------------------");
      const [sessionColumns] = await connection.query('SHOW COLUMNS FROM sessions');
      sessionColumns.forEach(column => {
        console.log(`- ${column.Field}: ${column.Type}`);
      });
    }
    
    await connection.end();
  } catch (err) {
    console.error("Error:", err.message);
  }
}

showTables().catch(console.error);