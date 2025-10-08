/**
 * Schedule Risk Analysis
 * 
 * This script sets up a scheduled job to run the risk analysis
 * on a regular basis (monthly by default).
 */
require('dotenv').config();
const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const SCHEDULE = process.env.RISK_ANALYSIS_SCHEDULE || '0 0 1 * *'; // Monthly by default (1st day of month)
const LOG_FILE = path.join(__dirname, '../logs/risk_analysis.log');

// Ensure log directory exists
const logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Function to run the risk analysis
function runRiskAnalysis() {
  console.log(`${new Date().toISOString()} - Starting scheduled risk analysis...`);
  
  // Create log stream
  const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
  logStream.write(`\n${new Date().toISOString()} - Starting scheduled risk analysis\n`);
  
  // Run the risk analysis script
  const riskAnalysisScript = path.join(__dirname, 'generate_risk_analysis.js');
  
  const process = spawn('node', [riskAnalysisScript], {
    cwd: path.dirname(riskAnalysisScript)
  });
  
  // Log output
  process.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);
    logStream.write(output);
  });
  
  process.stderr.on('data', (data) => {
    const error = data.toString();
    console.error(error);
    logStream.write(`ERROR: ${error}`);
  });
  
  // Handle completion
  process.on('close', (code) => {
    const message = `${new Date().toISOString()} - Risk analysis completed with code ${code}\n`;
    console.log(message);
    logStream.write(message);
    logStream.end();
  });
}

// Schedule the task using node-cron
console.log(`Setting up scheduled risk analysis with cron schedule: ${SCHEDULE}`);

cron.schedule(SCHEDULE, () => {
  runRiskAnalysis();
}, {
  scheduled: true,
  timezone: "America/Chicago" // Adjust to your timezone
});

console.log('Risk analysis scheduler is running...');
console.log(`Logs will be written to: ${LOG_FILE}`);

// Also provide option to run immediately
if (process.argv.includes('--run-now')) {
  console.log('Running risk analysis immediately...');
  runRiskAnalysis();
}