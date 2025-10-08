#!/usr/bin/env node

/**
 * Analyze Daycare
 * 
 * Command-line tool to run risk analysis on a specific daycare.
 * Usage: node analyze_daycare.js <operation_number>
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { spawn } = require('child_process');
const path = require('path');

// Get the operation number from command line
const operationNumber = process.argv[2];

if (!operationNumber) {
  console.error('Error: Please provide a daycare operation number');
  console.log('Usage: node analyze_daycare.js <operation_number>');
  process.exit(1);
}

// Function to check if daycare exists
async function checkDaycare(operationNumber) {
  // Database configuration
  const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  };
  
  // Create connection
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Check if daycare exists
    const [rows] = await connection.execute(
      'SELECT OPERATION_NUMBER, OPERATION_ID, OPERATION_NAME FROM daycare_operations WHERE OPERATION_NUMBER = ?',
      [operationNumber]
    );
    
    if (rows.length === 0) {
      console.error(`Error: Daycare with operation number ${operationNumber} not found`);
      return false;
    }
    
    console.log(`Found daycare: ${rows[0].OPERATION_NAME} (${rows[0].OPERATION_NUMBER})`);
    return true;
    
  } catch (err) {
    console.error('Database error:', err.message);
    return false;
  } finally {
    await connection.end();
  }
}

// Main function
async function main() {
  // Check if daycare exists first
  const exists = await checkDaycare(operationNumber);
  
  if (!exists) {
    process.exit(1);
  }
  
  console.log(`Running risk analysis for daycare ${operationNumber}...`);
  
  // Run the risk analysis script with the specified daycare
  const riskAnalysisScript = path.join(__dirname, 'scripts', 'generate_risk_analysis.js');
  
  const process = spawn('node', [riskAnalysisScript, operationNumber], {
    stdio: 'inherit'
  });
  
  // Handle completion
  process.on('close', (code) => {
    if (code === 0) {
      console.log('\nRisk analysis completed successfully!');
      
      // Now show the results
      displayResults(operationNumber);
    } else {
      console.error(`Risk analysis failed with code ${code}`);
    }
  });
}

// Display the analysis results
async function displayResults(operationNumber) {
  // Database configuration
  const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  };
  
  // Create connection
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // First get the daycare to find its OPERATION_ID
    const [daycareRows] = await connection.execute(
      'SELECT OPERATION_ID FROM daycare_operations WHERE OPERATION_NUMBER = ?',
      [operationNumber]
    );
    
    if (daycareRows.length === 0) {
      console.log(`Error: Daycare with operation number ${operationNumber} not found`);
      return;
    }
    
    const operationId = daycareRows[0].OPERATION_ID;
    
    // Get analysis results using the actual OPERATION_ID
    const [rows] = await connection.execute(
      `SELECT 
         analysis_summary, 
         risk_factors, 
         parent_recommendations, 
         risk_score, 
         last_analysis_date
       FROM risk_analysis 
       WHERE operation_id = ?`,
      [operationId]
    );
    
    if (rows.length === 0) {
      console.log('No analysis results found.');
      return;
    }
    
    const result = rows[0];
    
    // Format the output
    console.log('\n============ DAYCARE RISK ANALYSIS ============\n');
    console.log(`Analysis Date: ${new Date(result.last_analysis_date).toLocaleDateString()}`);
    console.log(`Risk Score: ${parseFloat(result.risk_score).toFixed(2)} / 100\n`);
    
    console.log('SUMMARY:');
    console.log(result.analysis_summary);
    
    console.log('\nIDENTIFIED RISK FACTORS:');
    let riskFactors = [];
    try {
      riskFactors = typeof result.risk_factors === 'string' 
        ? JSON.parse(result.risk_factors) 
        : (result.risk_factors || []);
    } catch (e) {
      console.log('Error parsing risk factors:', e.message);
    }
    
    if (riskFactors.length === 0) {
      console.log('No significant risk factors identified.');
    } else {
      riskFactors.forEach((factor, index) => {
        console.log(`${index + 1}. ${factor.description} (${factor.severity} severity)`);
        if (factor.examples && factor.examples.length > 0) {
          console.log(`   Example: ${factor.examples[0].description}`);
        }
      });
    }
    
    console.log('\nRECOMMENDED QUESTIONS FOR PARENTS:');
    let recommendations = [];
    try {
      recommendations = typeof result.parent_recommendations === 'string' 
        ? JSON.parse(result.parent_recommendations) 
        : (result.parent_recommendations || []);
    } catch (e) {
      console.log('Error parsing recommendations:', e.message);
    }
    
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    console.log('\n==============================================');
    
  } catch (err) {
    console.error('Error displaying results:', err.message);
  } finally {
    await connection.end();
  }
}

// Run the script
main().catch(console.error);