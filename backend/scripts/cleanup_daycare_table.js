/**
 * Cleanup Daycare Operations Table
 * 
 * This script:
 * 1. Checks for duplicate fields in the daycare_operations table
 * 2. Gives you the option to truncate the table if needed
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const readline = require('readline');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'daycarealert',
  connectionLimit: 5
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask a question and get a response
function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

// Main function
async function main() {
  console.log('Checking daycare_operations table...');
  
  // Create connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    // First check if the table exists
    const [tables] = await pool.query(
      `SHOW TABLES LIKE 'daycare_operations'`
    );
    
    if (tables.length === 0) {
      console.log('Table daycare_operations does not exist yet.');
      rl.close();
      await pool.end();
      return;
    }
    
    // Get the columns
    const [columns] = await pool.query(
      `DESCRIBE daycare_operations`
    );
    
    console.log(`\nFound ${columns.length} columns in daycare_operations table:`);
    
    // Check for potential duplicates
    const fieldNames = columns.map(col => col.Field.toLowerCase());
    const duplicateCandidates = [
      // Check API vs our custom fields
      ['deficiency_high', 'high_risk_violations'],
      ['deficiency_medium_high', 'medium_high_risk_violations'],
      ['deficiency_medium', 'medium_risk_violations'],
      ['deficiency_low', 'low_risk_violations']
    ];
    
    let potentialDuplicatesFound = false;
    
    console.log('\nChecking for potential duplicate fields:');
    for (const [field1, field2] of duplicateCandidates) {
      if (fieldNames.includes(field1.toLowerCase()) && fieldNames.includes(field2.toLowerCase())) {
        console.log(`- Potential duplicate: ${field1} and ${field2}`);
        potentialDuplicatesFound = true;
      }
    }
    
    if (!potentialDuplicatesFound) {
      console.log('No obvious duplicate fields found.');
    } else {
      console.log('\nNote: These fields may have different purposes despite similar names:');
      console.log('- DEFICIENCY_* fields come directly from the API and represent official counts.');
      console.log('- *_RISK_VIOLATIONS fields are calculated from our non_compliance table.');
    }
    
    // Count records in the table
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as count FROM daycare_operations`
    );
    
    const recordCount = countResult[0].count;
    console.log(`\nThe daycare_operations table currently has ${recordCount} records.`);
    
    // Ask if user wants to truncate the table
    const answer = await askQuestion('\nDo you want to truncate the daycare_operations table? (yes/no): ');
    
    if (answer.toLowerCase() === 'yes') {
      await pool.query(`TRUNCATE TABLE daycare_operations`);
      console.log('Table daycare_operations has been truncated.');
    } else {
      console.log('Table was not truncated.');
    }
    
    // Close resources
    rl.close();
    await pool.end();
    
    console.log('\nOperation completed.');
  } catch (err) {
    console.error('Error:', err);
    
    // Try to close resources
    rl.close();
    try {
      await pool.end();
    } catch (e) {
      // Ignore errors when closing the pool
    }
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});