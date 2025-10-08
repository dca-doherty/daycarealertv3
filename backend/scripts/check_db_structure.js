/**
 * Check Database Structure
 * 
 * This script checks the structure of key tables to help diagnose issues
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

async function checkDatabaseStructure() {
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Check structure of main tables
    const tablesToCheck = ['daycare_ratings_balanced', 'daycare_cost_estimates', 'daycare_finder'];
    
    for (const table of tablesToCheck) {
      console.log(`\n=== STRUCTURE OF ${table} ===`);
      
      // Check if table exists
      const [tables] = await pool.query(`SHOW TABLES LIKE '${table}'`);
      
      if (tables.length === 0) {
        console.log(`Table ${table} does not exist!`);
        continue;
      }
      
      // Get table structure
      const [columns] = await pool.query(`DESCRIBE ${table}`);
      
      console.log('Columns:');
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type}${col.Null === 'NO' ? ' NOT NULL' : ''}${col.Key === 'PRI' ? ' (PRIMARY KEY)' : ''}`);
      });
      
      // Get count of records
      const [countResult] = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`Total Records: ${countResult[0].count}`);
      
      // Check for specific issues
      if (table === 'daycare_ratings_balanced') {
        // Check overall_rating values
        const [ratingStats] = await pool.query(`
          SELECT 
            MIN(overall_rating) as min_rating,
            MAX(overall_rating) as max_rating,
            AVG(overall_rating) as avg_rating
          FROM ${table}
        `);
        
        console.log(`Rating Range: ${ratingStats[0].min_rating} to ${ratingStats[0].max_rating} (avg: ${ratingStats[0].avg_rating})`);
        
        // Sample ratings
        const [ratingDist] = await pool.query(`
          SELECT overall_rating, COUNT(*) as count
          FROM ${table}
          GROUP BY overall_rating
          ORDER BY overall_rating DESC
        `);
        
        console.log('Rating Distribution:');
        ratingDist.forEach(row => {
          console.log(`  ${row.overall_rating}: ${row.count} records`);
        });
      }
      
      if (table === 'daycare_cost_estimates') {
        // Check monthly_cost values
        const [costStats] = await pool.query(`
          SELECT 
            MIN(monthly_cost) as min_cost,
            MAX(monthly_cost) as max_cost,
            AVG(monthly_cost) as avg_cost
          FROM ${table}
        `);
        
        console.log(`Cost Range: $${costStats[0].min_cost} to $${costStats[0].max_cost} (avg: $${costStats[0].avg_cost})`);
      }
    }
    
    console.log('\n=== DATABASE CONNECTION INFO ===');
    const connection = await pool.getConnection();
    
    // Check MySQL variables
    const [variables] = await connection.query(`SHOW VARIABLES LIKE 'max_allowed_packet'`);
    console.log(`max_allowed_packet: ${variables[0].Value}`);
    
    connection.release();
    
  } catch (err) {
    console.error('Error checking database structure:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  checkDatabaseStructure().catch(console.error);
}

module.exports = { checkDatabaseStructure };