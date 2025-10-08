#!/usr/bin/env node

/**
 * Generate County Income Report
 * 
 * This script generates a report on the median income data used in the cost estimation process.
 * It fetches data from the Census API and outputs it to a CSV file for verification.
 */
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

// Check if running in production mode
const isProduction = process.env.NODE_ENV === 'production' || 
                     process.argv.includes('--production') || 
                     __dirname.includes('/var/www/');

const scriptDir = isProduction
  ? '/var/www/daycarealert/daycarealert.com/backend/scripts'
  : __dirname;

// Helper function to categorize income
function categorizeIncome(income) {
  if (!income || isNaN(income)) return 'middle';
  if (income >= 100000) return 'highIncome';
  if (income >= 80000) return 'upperMiddle';
  if (income >= 60000) return 'middle';
  if (income >= 40000) return 'lowerMiddle';
  return 'low';
}

// Import node-fetch dynamically
async function importFetch() {
  try {
    return (await import('node-fetch')).default;
  } catch (err) {
    return require('node-fetch');
  }
}

// Simple delay function to respect rate limits
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Main function
async function main() {
  console.log(`Starting income data report generation...`);
  
  try {
    // Check if we have a cached file first
    try {
      const data = await fs.readFile(path.join(scriptDir, 'median_income_data.json'), 'utf8');
      console.log('Found cached median income data, generating report from cache...');
      const incomeData = JSON.parse(data);
      
      // Generate report from cache
      await generateReportFromCache(incomeData);
      return;
    } catch (err) {
      console.log('No cached income data found, will fetch from Census API...');
    }
    
    // Fetch from Census API
    const fetch = await importFetch();
    
    // Census API key
    const apiKey = process.env.CENSUS_API_KEY || 'e96e3e0e12b6bb04e2f19804241a3be3e6caa1c8';
    
    console.log('Fetching county-level median income data from Census API...');
    const countyUrl = `https://api.census.gov/data/latest/acs/acs5?get=NAME,B19013_001E&for=county:*&in=state:48&key=${apiKey}`;
    
    const countyResponse = await fetch(countyUrl);
    if (!countyResponse.ok) {
      throw new Error(`Census API county request failed: ${countyResponse.status} ${countyResponse.statusText}`);
    }
    
    const countyData = await countyResponse.json();
    
    // Process county data
    const counties = {};
    const countyReport = [];
    
    // Add header row
    countyReport.push(['County', 'State', 'Median Income', 'Income Category', 'Census FIPS Code']);
    
    // Process data rows
    countyData.slice(1).forEach(row => {
      try {
        if (!row || row.length < 4) {
          console.warn('Invalid county data row:', row);
          return;
        }
        
        const fullName = row[0];
        const nameParts = fullName.split(',');
        const name = nameParts[0].trim().toUpperCase();
        const state = nameParts.length > 1 ? nameParts[1].trim() : 'TX';
        
        if (!name) {
          console.warn('Could not parse county name from:', fullName);
          return;
        }
        
        const income = parseInt(row[1], 10);
        const fipsCode = row[3]; // County FIPS code
        
        if (isNaN(income)) {
          console.warn(`Invalid income value for county ${name}:`, row[1]);
          return;
        }
        
        const category = categorizeIncome(income);
        
        counties[name] = {
          median_income: income,
          category: category
        };
        
        // Add to report
        countyReport.push([name, state, income, category, fipsCode]);
        
      } catch (err) {
        console.warn('Error processing county row:', row, err);
      }
    });
    
    // Save report to CSV
    const reportContent = countyReport.map(row => row.join(',')).join('\n');
    const reportPath = path.join(scriptDir, 'county_income_report.csv');
    await fs.writeFile(reportPath, reportContent);
    
    console.log(`Report generated at: ${reportPath}`);
    console.log(`Processed ${countyReport.length - 1} counties`);
    
    // Display sample of the data
    console.log('\nSample county income data:');
    countyReport.slice(1, 6).forEach(row => {
      console.log(`${row[0]}, ${row[1]}: $${row[2]} (${row[3]})`);
    });
    
  } catch (err) {
    console.error('Error generating income report:', err);
  }
}

// Generate report from cached data
async function generateReportFromCache(incomeData) {
  try {
    const { counties } = incomeData;
    
    // Create county report
    const countyReport = [];
    
    // Add header row
    countyReport.push(['County', 'Median Income', 'Income Category']);
    
    // Process counties
    Object.entries(counties).forEach(([name, data]) => {
      countyReport.push([name, data.median_income, data.category]);
    });
    
    // Save report to CSV
    const reportContent = countyReport.map(row => row.join(',')).join('\n');
    const reportPath = path.join(scriptDir, 'county_income_report.csv');
    await fs.writeFile(reportPath, reportContent);
    
    console.log(`Report generated at: ${reportPath}`);
    console.log(`Processed ${countyReport.length - 1} counties`);
    
    // Display sample of the data
    console.log('\nSample county income data:');
    countyReport.slice(1, 6).forEach(row => {
      console.log(`${row[0]}: $${row[1]} (${row[2]})`);
    });
    
  } catch (err) {
    console.error('Error generating report from cache:', err);
  }
}

// Execute the main function
if (require.main === module) {
  main().catch(console.error);
}
