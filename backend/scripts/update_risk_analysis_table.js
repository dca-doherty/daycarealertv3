/**
 * Update Risk Analysis Table
 * 
 * This script updates the risk_analysis table to use OPERATION_ID instead of operation_number
 * and adds additional fields for comprehensive risk analysis.
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

async function main() {
  console.log('Updating risk_analysis table...');
  
  // Create connection pool
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // 1. Check if the table exists
    const [tables] = await pool.query(`
      SHOW TABLES LIKE 'risk_analysis'
    `);
    
    // 2. If the table exists, rename the existing one for backup
    if (tables.length > 0) {
      console.log('Backing up existing risk_analysis table...');
      await pool.query('RENAME TABLE risk_analysis TO risk_analysis_backup');
    }
    
    // 3. Create a new risk_analysis table with the updated schema
    console.log('Creating new risk_analysis table...');
    await pool.query(`
      CREATE TABLE risk_analysis (
        id INT NOT NULL AUTO_INCREMENT,
        operation_id VARCHAR(50) NOT NULL,
        analysis_summary TEXT,
        risk_factors JSON,
        parent_recommendations JSON,
        total_violations INT DEFAULT 0,
        high_risk_count INT DEFAULT 0,
        medium_high_risk_count INT DEFAULT 0,
        medium_risk_count INT DEFAULT 0,
        low_risk_count INT DEFAULT 0,
        adverse_actions_count INT DEFAULT 0,
        risk_score DECIMAL(5,2),
        last_analysis_date DATE,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY (operation_id),
        INDEX (risk_score)
      )
    `);
    
    // 4. If we had a backup, migrate the data
    if (tables.length > 0) {
      console.log('Migrating data from backup table...');
      await pool.query(`
        INSERT INTO risk_analysis (
          operation_id, 
          analysis_summary, 
          risk_factors, 
          parent_recommendations, 
          total_violations,
          last_updated
        )
        SELECT 
          operation_number, 
          analysis_summary, 
          risk_factors, 
          parent_recommendations, 
          total_violations,
          last_updated
        FROM risk_analysis_backup
      `);
      
      console.log('Migration complete!');
    }
    
    console.log('risk_analysis table has been successfully updated!');
    
  } catch (err) {
    console.error('Error updating risk_analysis table:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(console.error);