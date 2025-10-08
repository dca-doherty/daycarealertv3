require('dotenv').config();
const { pool } = require('./config/db');

async function initRiskAnalysisTable() {
  try {
    console.log('Starting risk_analysis table initialization...');
    
    // Create the risk_analysis table if it doesn't exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS risk_analysis (
        id INT AUTO_INCREMENT PRIMARY KEY,
        operation_number VARCHAR(50) NOT NULL,
        analysis_summary TEXT,
        risk_factors JSON,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        parent_recommendations JSON,
        total_violations INT DEFAULT 0,
        UNIQUE KEY (operation_number)
      )
    `);
    
    console.log('risk_analysis table initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing risk_analysis table:', error);
    process.exit(1);
  }
}

// Run the initialization process
initRiskAnalysisTable();