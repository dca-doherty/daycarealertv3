/**
 * Rebuild Risk Analysis
 * 
 * This script rebuilds the risk_analysis table from scratch using the correct OPERATION_ID values.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { execSync } = require('child_process');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

async function rebuildRiskAnalysis() {
  console.log('Starting risk analysis rebuild...');
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // 1. Clean up any existing risk_analysis tables
    console.log('Cleaning up existing tables...');
    await pool.query('DROP TABLE IF EXISTS risk_analysis_old');
    await pool.query('DROP TABLE IF EXISTS risk_analysis_backup');
    await pool.query('DROP TABLE IF EXISTS risk_analysis_fixed');
    
    // 2. Create a new risk_analysis table with correct structure
    console.log('Creating new risk_analysis table...');
    
    // Backup the current table if it exists
    const [tables] = await pool.query('SHOW TABLES LIKE "risk_analysis"');
    if (tables.length > 0) {
      await pool.query('CREATE TABLE risk_analysis_backup LIKE risk_analysis');
      await pool.query('INSERT INTO risk_analysis_backup SELECT * FROM risk_analysis');
      
      // Rename the current table
      await pool.query('RENAME TABLE risk_analysis TO risk_analysis_old');
    }
    
    // Create the new table
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
    
    // 3. Close the database connection before running the script
    await pool.end();
    
    // 4. Run the risk analysis script
    console.log('Running risk analysis script...');
    const scriptPath = path.join(__dirname, 'generate_risk_analysis.js');
    
    try {
      // Run synchronously to ensure completion
      execSync(`node ${scriptPath}`, { stdio: 'inherit' });
      console.log('Risk analysis script completed successfully.');
    } catch (error) {
      console.error('Error running risk analysis script:', error.message);
    }
    
  } catch (err) {
    console.error('Error during rebuild:', err);
  }
}

// Run the script
rebuildRiskAnalysis().catch(console.error);