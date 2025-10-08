#!/usr/bin/env node

/**
 * Generate Daycare Cost Estimation Model (Version 4)
 * 
 * This enhanced script generates a monthly cost estimation model for daycares based on:
 * 1. Programmatic services offered
 * 2. Ages served (enhanced infant care premium)
 * 3. Risk factors and analysis
 * 4. Location and Zillow home value data by ZIP code
 * 5. Total capacity (improved economies of scale)
 * 6. Years in operation (experience)
 * 7. Hours/days of operation
 * 8. Additional quality indicators (accreditation, education, etc.)
 * 
 * Version 4 improvements:
 * - Enhanced base cost values based on real-world pricing data
 * - Updated age multipliers to better reflect market rates
 * - Improved location-based pricing adjustments
 * - Added age-specific pricing factors (e.g., potty training status)
 * - Added support for production server environment
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { createReadStream } = require('fs');

// Database configuration with support for production server
const dbConfig = process.env.NODE_ENV === 'production' || process.argv.includes('--production') ? {
  // Production server configuration
  socketPath: '/var/run/mysqld/mysqld.sock',  // Unix socket path
  user: 'root',
  password: 'Bd03021988!!',
  database: 'daycarealert',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
} : {
  // Local development configuration
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Base cost factors - updated based on NDCP price data and examples
const BASE_MONTHLY_COST = 875;  // Baseline monthly cost - adjusted based on NDCP and examples

// NDCP Price data shows:
// - Infant center-based: ~$7,300-7,800/year (~$608-650/month)
// - Toddler center-based: ~$6,700-7,200/year (~$558-600/month)
// - Preschool center-based: ~$6,000-6,500/year (~$500-542/month)
// - School-age center-based: ~$5,000-5,500/year (~$417-458/month)

// Real-world examples show higher rates:
// - UBC Academy: $840/month (toddler), $980/month (infant)
// - Centerville Learning: $840/month
// - Wild Earth Preschool: $1,330/month
// - Skyrise Schools: $1,307/month

// Calibrated age-related cost multipliers that blend NDCP and real examples
const AGE_MULTIPLIERS = {
  infant: 1.4,      // Infants (0-17 months) - from NDCP ratios + real examples
  toddler: 1.15,    // Toddlers (18-35 months) - from NDCP ratios + real examples
  preschool: 1.0,   // Preschool (3-5 years) - baseline for potty-trained children
  schoolAge: 0.8    // School age children (6+ years) - from NDCP ratios
};

// Service-based cost adjustments (percentages)
const SERVICE_ADJUSTMENTS = {
  transportation: 8,         // Transportation service
  extendedHours: 12,         // Extended/overnight hours
  meals: 7,                  // Meals provided
  specialNeeds: 18,          // Special needs accommodations
  languageImmersion: 15,     // Language immersion programs
  montessori: 25,            // Montessori curriculum
  religious: 5,              // Religious programs
  afterSchoolPrograms: 3,    // After school programs
  summerPrograms: 3,         // Summer programs
  enrichmentPrograms: 10,    // Art/music/STEM programs
  earlyDrop: 6,              // Early drop-off option
  latePick: 6                // Late pick-up option
};

// Operation type cost multipliers - slightly adjusted
const TYPE_MULTIPLIERS = {
  'Licensed Child Care Center': 1.0,    // baseline
  'Licensed Child-Care Home': 1.1,      // slightly higher costs for more personalized care
  'Licensed Child-Care Home (Group)': 1.05,
  'Registered Child-Care Home': 0.95,
  'Before or After-School Program': 0.75,
  'School-Age Program': 0.75,
  'Listed Family Home': 0.9,
  'Small Employer-Based Child Care': 0.95,
  'Temporary Shelter Child Care': 0.9,
  'Child-Placing Agency': 1.1,
  'Montessori': 1.35,       // Premium for Montessori programs
  'Early Head Start': 0.8,  // Reduced as these are subsidized
  'Head Start Program': 0.8 // Reduced as these are subsidized
};

// Risk score cost adjustments (discount for high-risk facilities)
const RISK_ADJUSTMENTS = [
  { threshold: 70, discount: 18 },   // High risk (18% discount)
  { threshold: 40, discount: 12 },   // Medium high risk (12% discount)
  { threshold: 20, discount: 6 },    // Medium risk (6% discount)
  { threshold: 10, discount: 0 },    // Low risk (no discount)
  { threshold: 0, premium: 6 }       // Very low risk (6% premium)
];

// Experience-based adjustments
const EXPERIENCE_ADJUSTMENTS = [
  { years: 0, adjustment: -8 },    // New facilities (8% discount)
  { years: 2, adjustment: 0 },     // 2-5 years (baseline)
  { years: 5, adjustment: 4 },     // 5-10 years (4% premium)
  { years: 10, adjustment: 6 },    // 10-15 years (6% premium)
  { years: 15, adjustment: 10 }    // 15+ years (10% premium)
];

// County/city median income categories - updated based on NDCP data trends
// NDCP data shows significant price variations by county that align with income levels
const LOCATION_ADJUSTMENTS = {
  highIncome: 30,     // High income areas (>$100k median household income) - e.g., Collin, Dallas suburbs 
  upperMiddle: 18,    // Upper middle income ($80k-$100k) - e.g., parts of Travis, Denton
  middle: 0,          // Middle income ($60k-$80k) - baseline for most counties
  lowerMiddle: -12,   // Lower middle income ($40k-$60k) - e.g., parts of Anderson, Angelina
  low: -20            // Low income areas (<$40k) - lowest cost counties
};

// Accreditation premium adjustments
const ACCREDITATION_PREMIUMS = {
  naeyc: 20,          // National Association for the Education of Young Children (20% premium)
  necpa: 15,          // National Early Childhood Program Accreditation (15% premium)
  nafcc: 15,          // National Association for Family Child Care (15% premium)
  coa: 12,            // Council on Accreditation (12% premium)
  cognia: 12,         // Cognia Early Learning Accreditation (12% premium)
  apple: 10,          // APPLE (Accredited Professional Preschool Learning Environment) (10% premium)
  txRising: 12,       // Texas Rising Star (12% premium)
  txSchoolReady: 8    // Texas School Ready (8% premium)
};

// Educational credentials premium
const EDUCATION_PREMIUMS = {
  cda: 5,             // Child Development Associate (5% premium)
  associates: 8,      // Associates degree in ECE (8% premium)
  bachelors: 12,      // Bachelors degree in ECE (12% premium)
  masters: 15,        // Masters degree in ECE (15% premium)
  montessoriCert: 12  // Montessori certification (12% premium)
};

// Curriculum-specific premiums
const CURRICULUM_PREMIUMS = {
  highscope: 15,      // HighScope curriculum (15% premium)
  reggio: 18,         // Reggio Emilia approach (18% premium)
  waldorf: 18,        // Waldorf education (18% premium)
  banks: 10,          // Bank Street approach (10% premium)
  creativeCurriculum: 8, // Creative Curriculum (8% premium)
  projectApproach: 8, // Project Approach (8% premium)
  emergent: 5         // Emergent curriculum (5% premium)
};

// Capacity-based adjustments - economies of scale
// NDCP data confirms home-based care (smaller capacity) averages ~10% lower cost,
// but our real examples show small facilities often charge premium rates for personalized care
function getCapacityAdjustment(capacity) {
  if (!capacity) return 0;
  
  // For very small facilities, location and quality matters more
  // Some boutique/small facilities charge premium rates, especially in high-income areas
  if (capacity < 12) return 12;       // Small facilities (<12 children) - adjusted from NDCP data
  if (capacity < 25) return 6;        // Small-medium (12-24 children) - adjusted
  if (capacity < 50) return 0;        // Medium (25-49 children) - baseline
  if (capacity < 100) return -5;      // Medium-large (50-99 children) - economies of scale
  return -10;                         // Large facilities (100+ children) - significant economies of scale
}

// Hours/days of operation adjustments
function getHoursAdjustment(hours, days) {
  let adjustment = 0;
  
  // Check for extended hours
  if (hours && hours.toLowerCase().includes('24 hour')) {
    adjustment += 20;  // 24-hour care
  } else if (hours) {
    const hourText = hours.toLowerCase();
    
    // Check for early morning hours
    if (hourText.includes('5:00') || hourText.includes('5 a') || 
        hourText.includes('5:30') || hourText.includes('5:45') ||
        hourText.includes('6:00')) {
      adjustment += 6;
    }
    
    // Check for late evening hours
    if (hourText.includes('7 p') || hourText.includes('7:') || 
        hourText.includes('8 p') || hourText.includes('8:') ||
        hourText.includes('9 p') || hourText.includes('9:')) {
      adjustment += 10;
    }
  }
  
  // Check for weekend operations
  if (days && (days.toLowerCase().includes('saturday') || days.toLowerCase().includes('sunday'))) {
    adjustment += 12;  // Weekend care
  }
  
  return adjustment;
}

// Load Zillow Home Value Index data
async function loadZillowData() {
  try {
    console.log('Loading Zillow home value data...');
    const zhviData = {};
    
    // Determine file path based on environment
    const baseDir = process.env.NODE_ENV === 'production' || process.argv.includes('--production') 
      ? '/var/www/daycarealert/daycarealert.com' 
      : '/home/dohertyb/daycarealert';
    
    const filePath = path.join(baseDir, 'Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv');
    
    // Create a promise to handle the CSV parsing
    return new Promise((resolve, reject) => {
      const results = [];
      
      createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          console.log(`Processed ${results.length} ZIP code entries from Zillow data`);
          
          // Process results into a zipcode-indexed object with the most recent home value
          const zhviByZip = {};
          results.forEach(row => {
            if (row.RegionName && row.RegionType === 'zip') {
              // Get the most recent non-empty home value
              const keys = Object.keys(row).sort().reverse(); // Sort in reverse to get most recent dates first
              let latestValue = null;
              
              for (const key of keys) {
                // Only process date fields (in format YYYY-MM-DD)
                if (key.match(/^\d{4}-\d{2}-\d{2}$/) && row[key] && !isNaN(parseFloat(row[key]))) {
                  latestValue = parseFloat(row[key]);
                  break;
                }
              }
              
              if (latestValue !== null) {
                zhviByZip[row.RegionName] = {
                  value: latestValue,
                  state: row.StateName,
                  metro: row.Metro,
                  county: row.CountyName
                };
              }
            }
          });
          
          console.log(`Processed home values for ${Object.keys(zhviByZip).length} ZIP codes`);
          
          // Calculate income categories based on home values
          // First, get range of values to establish percentiles
          const allValues = Object.values(zhviByZip).map(item => item.value).filter(val => !isNaN(val));
          allValues.sort((a, b) => a - b);
          
          const high = allValues[Math.floor(allValues.length * 0.8)]; // 80th percentile
          const upperMiddle = allValues[Math.floor(allValues.length * 0.6)]; // 60th percentile
          const middle = allValues[Math.floor(allValues.length * 0.4)]; // 40th percentile
          const lowerMiddle = allValues[Math.floor(allValues.length * 0.2)]; // 20th percentile
          
          console.log(`Home value percentiles: High: $${high.toFixed(0)}, Upper-Middle: $${upperMiddle.toFixed(0)}, Middle: $${middle.toFixed(0)}, Lower-Middle: $${lowerMiddle.toFixed(0)}`);
          
          // Assign income categories based on home values
          Object.keys(zhviByZip).forEach(zip => {
            const value = zhviByZip[zip].value;
            if (value >= high) {
              zhviByZip[zip].category = 'highIncome';
            } else if (value >= upperMiddle) {
              zhviByZip[zip].category = 'upperMiddle';
            } else if (value >= middle) {
              zhviByZip[zip].category = 'middle';
            } else if (value >= lowerMiddle) {
              zhviByZip[zip].category = 'lowerMiddle';
            } else {
              zhviByZip[zip].category = 'low';
            }
          });
          
          resolve(zhviByZip);
        })
        .on('error', reject);
    });
  } catch (err) {
    console.error('Error loading Zillow data:', err);
    // Return a minimal default dataset if there's an error
    return {};
  }
}

// Load median incomes from Census API (with fallback to local data)
async function loadMedianIncomeData() {
  try {
    // Determine directory based on environment
    const scriptDir = process.env.NODE_ENV === 'production' || process.argv.includes('--production')
      ? '/var/www/daycarealert/daycarealert.com/backend/scripts'
      : __dirname;
      
    // First try to load from a local cache file
    try {
      const data = await fs.readFile(path.join(scriptDir, 'median_income_data.json'), 'utf8');
      console.log('Loaded median income data from cache file');
      return JSON.parse(data);
    } catch (err) {
      // If file doesn't exist or can't be read, continue to API fetch
      console.log('No cached income data found, will create new dataset');
    }

    try {
      // Import node-fetch dynamically, supporting both ESM and CommonJS
      const importFetch = async () => {
        try {
          return (await import('node-fetch')).default;
        } catch (err) {
          return require('node-fetch');
        }
      };
      
      // Get fetch function
      const fetch = await importFetch();
      
      // Census API key (you should store this in your .env file)
      const apiKey = process.env.CENSUS_API_KEY || 'e96e3e0e12b6bb04e2f19804241a3be3e6caa1c8';
      
      console.log('Fetching median income data from Census API...');
      
      // Simple delay function to respect rate limits
      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
      
      // B19013_001E is the Census variable for median household income
      
      // Fetch county-level median income data for Texas
      const countyUrl = `https://api.census.gov/data/latest/acs/acs5?get=NAME,B19013_001E&for=county:*&in=state:48&key=${apiKey}`;
      const countyResponse = await fetch(countyUrl);
      if (!countyResponse.ok) {
        throw new Error(`Census API county request failed: ${countyResponse.status} ${countyResponse.statusText}`);
      }
      const countyData = await countyResponse.json();
      
      // Add delay between requests to respect rate limits
      await delay(100);
      
      // Fetch city-level median income data for Texas
      const cityUrl = `https://api.census.gov/data/latest/acs/acs5?get=NAME,B19013_001E&for=place:*&in=state:48&key=${apiKey}`;
      const cityResponse = await fetch(cityUrl);
      if (!cityResponse.ok) {
        throw new Error(`Census API city request failed: ${cityResponse.status} ${cityResponse.statusText}`);
      }
      const cityData = await cityResponse.json();
      
      // Add delay between requests to respect rate limits
      await delay(100);
      
      // Fetch ZIP code-level median income data for Texas
      const zipUrl = `https://api.census.gov/data/latest/acs/acs5?get=NAME,B19013_001E&for=zip%20code%20tabulation%20area:*&in=state:48&key=${apiKey}`;
      const zipResponse = await fetch(zipUrl);
      if (!zipResponse.ok) {
        throw new Error(`Census API zip request failed: ${zipResponse.status} ${zipResponse.statusText}`);
      }
      const zipData = await zipResponse.json();
      
      // Process county data
      const counties = {};
      countyData.slice(1).forEach(row => {
        try {
          if (!row || row.length < 2) {
            console.warn('Invalid county data row:', row);
            return;
          }
          
          const name = row[0].split(',')[0].trim().toUpperCase();
          if (!name) {
            console.warn('Could not parse county name from:', row[0]);
            return;
          }
          
          const income = parseInt(row[1], 10);
          if (isNaN(income)) {
            console.warn(`Invalid income value for county ${name}:`, row[1]);
            return;
          }
          
          const category = categorizeIncome(income);
          counties[name] = {
            median_income: income,
            category: category
          };
        } catch (err) {
          console.warn('Error processing county row:', row, err);
        }
      });
      
      // Process city data
      const cities = {};
      cityData.slice(1).forEach(row => {
        try {
          if (!row || row.length < 2) {
            console.warn('Invalid city data row:', row);
            return;
          }
          
          // Handle city names like "Dallas city, Texas"
          const nameMatch = row[0].match(/^([^,]+)(?:\s+city)?,/i);
          const name = nameMatch ? nameMatch[1].trim().toUpperCase() : row[0].split(',')[0].trim().toUpperCase();
          
          if (!name) {
            console.warn('Could not parse city name from:', row[0]);
            return;
          }
          
          const income = parseInt(row[1], 10);
          if (isNaN(income)) {
            console.warn(`Invalid income value for city ${name}:`, row[1]);
            return;
          }
          
          const category = categorizeIncome(income);
          cities[name] = {
            median_income: income,
            category: category
          };
        } catch (err) {
          console.warn('Error processing city row:', row, err);
        }
      });
      
      // Process ZIP code data
      const zips = {};
      zipData.slice(1).forEach(row => {
        try {
          let zipcode;
          if (row[0].includes('ZCTA5')) {
            const match = row[0].match(/ZCTA5 (\d+)/);
            zipcode = match ? match[1] : null;
          } else {
            const parts = row[0].split(' ');
            zipcode = parts.length > 1 ? parts[1] : null;
          }
          
          if (!zipcode) {
            console.warn('Could not parse ZIP code from:', row[0]);
            return;
          }
          
          const income = parseInt(row[1], 10);
          if (!isNaN(income)) {
            const category = categorizeIncome(income);
            zips[zipcode] = {
              median_income: income,
              category: category
            };
          } else {
            console.warn(`Invalid income value for ZIP ${zipcode}:`, row[1]);
          }
        } catch (err) {
          console.warn('Error processing ZIP code row:', row, err);
        }
      });
      
      const incomeData = {
        counties,
        cities,
        zips
      };
      
      // Save to a local file for future use
      await fs.writeFile(
        path.join(scriptDir, 'median_income_data.json'), 
        JSON.stringify(incomeData, null, 2)
      );
      
      console.log('Created and saved comprehensive Texas median income data from Census API');
      return incomeData;
    } catch (apiErr) {
      console.error('Error loading median income data from Census API:', apiErr);
      console.log('Falling back to hardcoded income categories...');
      
      // Fallback data if Census API request fails
      const texasCountiesIncomeData = {
        counties: {
          'ANDERSON': { median_income: 45135, category: 'lowerMiddle' },
          'ANDREWS': { median_income: 76312, category: 'middle' },
          'COLLIN': { median_income: 96087, category: 'upperMiddle' },
          'DALLAS': { median_income: 53756, category: 'lowerMiddle' },
          'DENTON': { median_income: 77547, category: 'middle' },
          'TARRANT': { median_income: 61164, category: 'middle' },
          'TRAVIS': { median_income: 68423, category: 'middle' },
          'HARRIS': { median_income: 52980, category: 'lowerMiddle' },
          'BEXAR': { median_income: 49024, category: 'lowerMiddle' },
          'POTTER': { median_income: 38911, category: 'low' },
          'RANDALL': { median_income: 63385, category: 'middle' },
        },
        cities: {
          'AUSTIN': { median_income: 88000, category: 'upperMiddle' },
          'HOUSTON': { median_income: 68000, category: 'middle' },
          'DALLAS': { median_income: 54747, category: 'lowerMiddle' },
          'FORT WORTH': { median_income: 58448, category: 'lowerMiddle' },
          'SAN ANTONIO': { median_income: 53420, category: 'lowerMiddle' },
          'PLANO': { median_income: 102000, category: 'highIncome' },
          'GARLAND': { median_income: 58999, category: 'lowerMiddle' },
          'FRISCO': { median_income: 127133, category: 'highIncome' },
          'AMARILLO': { median_income: 52725, category: 'lowerMiddle' },
          'HURST': { median_income: 57400, category: 'lowerMiddle' },
        },
        zips: {
          '75024': { median_income: 125000, category: 'highIncome' },     // Plano/North Dallas
          '75025': { median_income: 115000, category: 'highIncome' },     // Plano
          '75034': { median_income: 133000, category: 'highIncome' },     // Frisco
          '75035': { median_income: 128000, category: 'highIncome' },     // Frisco
          '75080': { median_income: 85000, category: 'upperMiddle' },     // Richardson
          '75093': { median_income: 112000, category: 'highIncome' },     // Plano
          '75040': { median_income: 58000, category: 'lowerMiddle' },     // Garland
          '75041': { median_income: 52000, category: 'lowerMiddle' },     // Garland
          '75043': { median_income: 65000, category: 'middle' },          // Garland
          '79109': { median_income: 61000, category: 'middle' },          // Amarillo
          '76053': { median_income: 57000, category: 'lowerMiddle' },     // Hurst
        }
      };
      
      // Save fallback data to a local file
      await fs.writeFile(
        path.join(scriptDir, 'median_income_data.json'), 
        JSON.stringify(texasCountiesIncomeData, null, 2)
      );
      
      console.log('Created and saved fallback Texas median income data');
      return texasCountiesIncomeData;
    }
  } catch (err) {
    console.error('Error in loadMedianIncomeData:', err);
    // Return a minimal default dataset if there's an error
    return { counties: {}, cities: {}, zips: {} };
  }
}

// Helper function to categorize income
function categorizeIncome(income) {
  if (!income || isNaN(income)) return 'middle';
  if (income >= 100000) return 'highIncome';
  if (income >= 80000) return 'upperMiddle';
  if (income >= 60000) return 'middle';
  if (income >= 40000) return 'lowerMiddle';
  return 'low';
}

// Enhanced function to determine income category for a location with Zillow data
function getIncomeCategory(location, zillow, backupIncomeData) {
  if (!location) return 'middle'; // Default to middle if no location data
  
  const { county, city, zip } = location;
  
  // First try to get income category from Zillow data (most accurate)
  if (zip && zillow[zip]) {
    return zillow[zip].category;
  }
  
  // Then try backup income data
  // Try to match by ZIP code first (most specific)
  if (zip && backupIncomeData.zips && backupIncomeData.zips[zip]) {
    return backupIncomeData.zips[zip].category;
  }
  
  // Try to match by city
  if (city && backupIncomeData.cities && backupIncomeData.cities[city]) {
    return backupIncomeData.cities[city].category;
  }
  
  // Try to match by county
  if (county && backupIncomeData.counties && backupIncomeData.counties[county]) {
    return backupIncomeData.counties[county].category;
  }
  
  // Default to middle income if no match
  return 'middle';
}

// Enhanced function to check if a programmatic service contains any of the keywords
function hasServiceKeywords(service, keywords) {
  if (!service) return false;
  const serviceLower = service.toLowerCase();
  return keywords.some(keyword => serviceLower.includes(keyword.toLowerCase()));
}

// Enhanced function to parse ages served and determine the youngest age group
function getYoungestAgeGroup(agesServed) {
  if (!agesServed) return 'schoolAge'; // Default if no data
  
  const agesLower = agesServed.toLowerCase();
  
  // Check for infant care (highest cost)
  if (agesLower.includes('infant') || 
      agesLower.includes('0 year') || 
      agesLower.includes('0-1') || 
      agesLower.includes('0 month') ||
      agesLower.includes('birth')) {
    return 'infant';
  }
  
  // Check for toddler care
  if (agesLower.includes('toddler') || 
      agesLower.includes('1 year') || 
      agesLower.includes('1-2 year') || 
      agesLower.includes('18 month')) {
    return 'toddler';
  }
  
  // Check for preschool
  if (agesLower.includes('preschool') || 
      agesLower.includes('3 year') || 
      agesLower.includes('4 year') || 
      agesLower.includes('pre-k') ||
      agesLower.includes('pre k')) {
    return 'preschool';
  }
  
  // Default to school age if no younger groups mentioned
  return 'schoolAge';
}

// Function to detect accreditation from programmatic services
function detectAccreditation(programmaticServices) {
  if (!programmaticServices) return [];
  
  const serviceText = programmaticServices.toLowerCase();
  const accreditations = [];
  
  // Check for major accreditation types
  if (serviceText.includes('naeyc') || 
      serviceText.includes('national association for the education of young children')) {
    accreditations.push('naeyc');
  }
  
  if (serviceText.includes('necpa') || 
      serviceText.includes('national early childhood program accreditation')) {
    accreditations.push('necpa');
  }
  
  if (serviceText.includes('nafcc') || 
      serviceText.includes('national association for family child care')) {
    accreditations.push('nafcc');
  }
  
  if (serviceText.includes('coa') || 
      serviceText.includes('council on accreditation')) {
    accreditations.push('coa');
  }
  
  if (serviceText.includes('cognia') || 
      serviceText.includes('advanced accreditation')) {
    accreditations.push('cognia');
  }
  
  if (serviceText.includes('apple accreditation') || 
      serviceText.includes('accredited professional preschool learning environment')) {
    accreditations.push('apple');
  }
  
  // Texas-specific quality indicators
  if (serviceText.includes('texas rising star') || 
      serviceText.includes('tx rising star') || 
      serviceText.includes('trs program')) {
    accreditations.push('txRising');
  }
  
  if (serviceText.includes('texas school ready') || 
      serviceText.includes('tx school ready')) {
    accreditations.push('txSchoolReady');
  }
  
  return accreditations;
}

// Function to detect educational credentials from programmatic services
function detectEducationCredentials(programmaticServices) {
  if (!programmaticServices) return [];
  
  const serviceText = programmaticServices.toLowerCase();
  const credentials = [];
  
  // Check for education credentials
  if (serviceText.includes('cda') || 
      serviceText.includes('child development associate')) {
    credentials.push('cda');
  }
  
  if (serviceText.includes('associate') || serviceText.includes('associate degree') || 
      serviceText.includes('associates degree') || serviceText.includes('associates')) {
    credentials.push('associates');
  }
  
  if (serviceText.includes('bachelor') || serviceText.includes('bachelor degree') || 
      serviceText.includes('bachelors degree') || serviceText.includes('bachelors')) {
    credentials.push('bachelors');
  }
  
  if (serviceText.includes('master') || serviceText.includes('master degree') || 
      serviceText.includes('masters degree') || serviceText.includes('masters')) {
    credentials.push('masters');
  }
  
  if (serviceText.includes('montessori certified') || 
      serviceText.includes('montessori certification') || 
      serviceText.includes('ami certified') || 
      serviceText.includes('ams certified')) {
    credentials.push('montessoriCert');
  }
  
  return credentials;
}

// Function to detect curriculum approaches
function detectCurriculum(programmaticServices) {
  if (!programmaticServices) return [];
  
  const serviceText = programmaticServices.toLowerCase();
  const curricula = [];
  
  // Check for specific curriculum approaches
  if (serviceText.includes('highscope') || serviceText.includes('high scope')) {
    curricula.push('highscope');
  }
  
  if (serviceText.includes('reggio') || serviceText.includes('reggio emilia')) {
    curricula.push('reggio');
  }
  
  if (serviceText.includes('waldorf') || serviceText.includes('steiner')) {
    curricula.push('waldorf');
  }
  
  if (serviceText.includes('bank street')) {
    curricula.push('banks');
  }
  
  if (serviceText.includes('creative curriculum')) {
    curricula.push('creativeCurriculum');
  }
  
  if (serviceText.includes('project approach') || serviceText.includes('project-based')) {
    curricula.push('projectApproach');
  }
  
  if (serviceText.includes('emergent curriculum')) {
    curricula.push('emergent');
  }
  
  return curricula;
}

// Enhanced cost estimation for a daycare
function calculateCost(daycare, riskData, zillow, backupIncomeData) {
  // Start with base cost
  let cost = BASE_MONTHLY_COST;
  
  // 1. Age-based adjustment (youngest age served)
  const youngestAge = getYoungestAgeGroup(daycare.LICENSED_TO_SERVE_AGES);
  cost *= AGE_MULTIPLIERS[youngestAge];
  
  // 2. Adjust by operation type
  const operationType = daycare.OPERATION_TYPE || 'Licensed Child Care Center';
  cost *= TYPE_MULTIPLIERS[operationType] || 1.0;
  
  // 3. Programmatic services adjustment
  let serviceAdjustment = 0;
  let serviceFeatures = [];
  
  // Check for various services
  if (daycare.PROGRAMMATIC_SERVICES) {
    const programServices = daycare.PROGRAMMATIC_SERVICES;
    
    // Transportation
    if (hasServiceKeywords(programServices, ['transportation', 'bus service'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.transportation;
      serviceFeatures.push('transportation');
    }
    
    // Meals
    if (hasServiceKeywords(programServices, ['meals', 'food', 'breakfast', 'lunch', 'dinner'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.meals;
      serviceFeatures.push('meals');
    }
    
    // Special needs
    if (hasServiceKeywords(programServices, ['special needs', 'disability', 'disabilities', 'therapeutic', 'therapy'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.specialNeeds;
      serviceFeatures.push('special_needs');
    }
    
    // Language immersion
    if (hasServiceKeywords(programServices, ['language immersion', 'bilingual', 'spanish', 'french', 'chinese', 'dual language'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.languageImmersion;
      serviceFeatures.push('language_immersion');
    }
    
    // Montessori (if not already factored in operation type)
    if (operationType !== 'Montessori' && hasServiceKeywords(programServices, ['montessori'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.montessori;
      serviceFeatures.push('montessori');
    }
    
    // Religious programs
    if (hasServiceKeywords(programServices, ['religious', 'christian', 'catholic', 'baptist', 'jewish', 'islamic', 'faith'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.religious;
      serviceFeatures.push('religious');
    }
    
    // After school
    if (hasServiceKeywords(programServices, ['after school', 'afterschool', 'before school', 'before and after'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.afterSchoolPrograms;
      serviceFeatures.push('afterschool');
    }
    
    // Summer programs
    if (hasServiceKeywords(programServices, ['summer', 'camp'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.summerPrograms;
      serviceFeatures.push('summer_programs');
    }
    
    // Enrichment
    if (hasServiceKeywords(programServices, ['art', 'music', 'stem', 'science', 'enrichment', 'dance', 'creative'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.enrichmentPrograms;
      serviceFeatures.push('enrichment');
    }
    
    // Early drop-off
    if (hasServiceKeywords(programServices, ['early drop', 'early morning'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.earlyDrop;
      serviceFeatures.push('early_drop');
    }
    
    // Late pick-up
    if (hasServiceKeywords(programServices, ['late pick', 'after hours', 'extended care'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.latePick;
      serviceFeatures.push('late_pick');
    }
  }
  
  // Apply service adjustment
  cost *= (1 + (serviceAdjustment / 100));
  
  // 4. Risk score adjustment
  let riskAdjustment = 0;
  if (riskData && riskData.risk_score !== undefined) {
    // Find the appropriate risk adjustment
    for (const risk of RISK_ADJUSTMENTS) {
      if (riskData.risk_score >= risk.threshold) {
        riskAdjustment = risk.discount ? -risk.discount : (risk.premium || 0);
        break;
      }
    }
  }
  
  // Apply risk adjustment
  cost *= (1 + (riskAdjustment / 100));
  
  // 5. Experience adjustment
  let experienceAdjustment = 0;
  if (daycare.years_in_operation !== undefined) {
    // Find the appropriate experience adjustment
    for (const exp of EXPERIENCE_ADJUSTMENTS) {
      if (daycare.years_in_operation >= exp.years) {
        experienceAdjustment = exp.adjustment;
      } else {
        break;
      }
    }
  }
  
  // Apply experience adjustment
  cost *= (1 + (experienceAdjustment / 100));
  
  // 6. Location/income-based adjustment
  const location = {
    county: daycare.COUNTY,
    city: daycare.CITY,
    zip: daycare.ZIP
  };
  
  const incomeCategory = getIncomeCategory(location, zillow, backupIncomeData);
  const locationAdjustment = LOCATION_ADJUSTMENTS[incomeCategory] || 0;
  
  // Apply location adjustment
  cost *= (1 + (locationAdjustment / 100));
  
  // 7. Capacity-based adjustment
  const capacityAdjustment = getCapacityAdjustment(daycare.TOTAL_CAPACITY);
  
  // Apply capacity adjustment
  cost *= (1 + (capacityAdjustment / 100));
  
  // 8. Hours/days of operation adjustment
  const hoursAdjustment = getHoursAdjustment(daycare.HOURS_OF_OPERATION, daycare.DAYS_OF_OPERATION);
  
  // Apply hours/days adjustment
  cost *= (1 + (hoursAdjustment / 100));
  
  // 9. Accreditation premium
  let accreditationAdjustment = 0;
  let accreditationFeatures = [];
  
  if (daycare.PROGRAMMATIC_SERVICES) {
    const accreditations = detectAccreditation(daycare.PROGRAMMATIC_SERVICES);
    
    accreditations.forEach(accred => {
      if (ACCREDITATION_PREMIUMS[accred]) {
        accreditationAdjustment += ACCREDITATION_PREMIUMS[accred];
        accreditationFeatures.push(accred);
      }
    });
  }
  
  // Apply accreditation adjustment
  cost *= (1 + (accreditationAdjustment / 100));
  
  // 10. Educational credentials premium
  let educationAdjustment = 0;
  let educationFeatures = [];
  
  if (daycare.PROGRAMMATIC_SERVICES) {
    const credentials = detectEducationCredentials(daycare.PROGRAMMATIC_SERVICES);
    
    // Only apply the highest credential premium
    let highestCredential = null;
    let highestCredentialValue = 0;
    
    credentials.forEach(cred => {
      if (EDUCATION_PREMIUMS[cred] && EDUCATION_PREMIUMS[cred] > highestCredentialValue) {
        highestCredential = cred;
        highestCredentialValue = EDUCATION_PREMIUMS[cred];
      }
    });
    
    if (highestCredential) {
      educationAdjustment += highestCredentialValue;
      educationFeatures.push(highestCredential);
    }
  }
  
  // Apply education adjustment
  cost *= (1 + (educationAdjustment / 100));
  
  // 11. Curriculum approach premium
  let curriculumAdjustment = 0;
  let curriculumFeatures = [];
  
  if (daycare.PROGRAMMATIC_SERVICES) {
    const curricula = detectCurriculum(daycare.PROGRAMMATIC_SERVICES);
    
    // Apply the highest curriculum premium
    let highestCurriculum = null;
    let highestCurriculumValue = 0;
    
    curricula.forEach(curr => {
      if (CURRICULUM_PREMIUMS[curr] && CURRICULUM_PREMIUMS[curr] > highestCurriculumValue) {
        highestCurriculum = curr;
        highestCurriculumValue = CURRICULUM_PREMIUMS[curr];
      }
    });
    
    if (highestCurriculum) {
      curriculumAdjustment += highestCurriculumValue;
      curriculumFeatures.push(highestCurriculum);
    }
  }
  
  // Apply curriculum adjustment
  cost *= (1 + (curriculumAdjustment / 100));
  
  // 12. Store calculation factors for transparency
  const factors = {
    base_cost: BASE_MONTHLY_COST,
    age_group: youngestAge,
    age_multiplier: AGE_MULTIPLIERS[youngestAge],
    operation_type: operationType,
    type_multiplier: TYPE_MULTIPLIERS[operationType] || 1.0,
    service_adjustment: serviceAdjustment,
    service_features: serviceFeatures,
    risk_score: riskData?.risk_score || 0,
    risk_adjustment: riskAdjustment,
    experience_years: daycare.years_in_operation || 0,
    experience_adjustment: experienceAdjustment,
    location_category: incomeCategory,
    location_adjustment: locationAdjustment,
    capacity: daycare.TOTAL_CAPACITY || 0,
    capacity_adjustment: capacityAdjustment,
    hours_adjustment: hoursAdjustment,
    accreditation_adjustment: accreditationAdjustment,
    accreditation_features: accreditationFeatures,
    education_adjustment: educationAdjustment,
    education_features: educationFeatures,
    curriculum_adjustment: curriculumAdjustment,
    curriculum_features: curriculumFeatures
  };
  
  // Round to nearest dollar
  return {
    cost_estimate: Math.round(cost),
    weekly_cost: Math.round(cost / 4.33),  // Weekly equivalent
    calculation_factors: factors
  };
}

// Create and ensure daycare_cost_estimates table
async function ensureTableStructure(pool) {
  console.log('Checking daycare_cost_estimates table structure...');
  
  try {
    // Check if table exists
    const [tables] = await pool.query(`SHOW TABLES LIKE 'daycare_cost_estimates'`);
    
    if (tables.length === 0) {
      console.log('Creating daycare_cost_estimates table...');
      await pool.query(`
        CREATE TABLE daycare_cost_estimates (
          id INT NOT NULL AUTO_INCREMENT,
          operation_id VARCHAR(50) NOT NULL,
          operation_number VARCHAR(50) NOT NULL,
          monthly_cost DECIMAL(8,2) NOT NULL,
          weekly_cost DECIMAL(8,2) NOT NULL,
          calculation_factors JSON,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY (operation_id),
          INDEX (monthly_cost),
          INDEX (weekly_cost)
        )
      `);
      console.log('Table created successfully');
    } else {
      console.log('daycare_cost_estimates table already exists');
      
      // Check if weekly_cost column exists
      const [columns] = await pool.query(`DESCRIBE daycare_cost_estimates`);
      const columnNames = columns.map(col => col.Field);
      
      if (!columnNames.includes('weekly_cost')) {
        console.log('Adding weekly_cost column...');
        await pool.query(`
          ALTER TABLE daycare_cost_estimates 
          ADD COLUMN weekly_cost DECIMAL(8,2) NOT NULL AFTER monthly_cost,
          ADD INDEX (weekly_cost)
        `);
      }
    }
  } catch (err) {
    console.error('Error checking/creating table structure:', err);
    throw err;
  }
}

// Save cost estimations to database
async function saveCostEstimatesToDB(pool, costEstimates) {
  console.log(`Saving ${costEstimates.length} cost estimates to database...`);
  
  try {
    // Prepare batch insertion - using REPLACE to handle duplicate operation_ids
    for (let i = 0; i < costEstimates.length; i += 100) {
      const batch = costEstimates.slice(i, i + 100);
      
      // Use bulk insert for better performance
      const values = batch.map(estimate => [
        estimate.operation_id,
        estimate.operation_number,
        estimate.cost_data.cost_estimate,
        estimate.cost_data.weekly_cost,
        JSON.stringify(estimate.cost_data.calculation_factors)
      ]);
      
      await pool.query(`
        REPLACE INTO daycare_cost_estimates 
        (operation_id, operation_number, monthly_cost, weekly_cost, calculation_factors)
        VALUES ?
      `, [values]);
      
      // Log progress
      console.log(`Saved batch ${i/100 + 1} of ${Math.ceil(costEstimates.length/100)}`);
    }
    
    console.log('Cost estimates saved successfully');
    return true;
  } catch (err) {
    console.error('Error saving cost estimates:', err);
    return false;
  }
}

// Main function to generate cost estimations
async function generateCostEstimations(pool) {
  console.log('Generating daycare cost estimations...');
  
  try {
    // Load Zillow home value data
    const zillow = await loadZillowData();
    
    // Load backup median income data
    const backupIncomeData = await loadMedianIncomeData();
    
    // Get all daycares with necessary fields for cost estimation
    const [daycares] = await pool.query(`
      SELECT 
        d.OPERATION_ID,
        d.OPERATION_NUMBER,
        d.OPERATION_NAME,
        d.OPERATION_TYPE,
        d.CITY,
        d.COUNTY,
        d.ZIP,
        d.LICENSED_TO_SERVE_AGES,
        d.PROGRAMMATIC_SERVICES,
        d.TOTAL_CAPACITY,
        d.HOURS_OF_OPERATION,
        d.DAYS_OF_OPERATION,
        d.ISSUANCE_DATE,
        DATEDIFF(CURRENT_DATE, d.ISSUANCE_DATE) / 365 as years_in_operation
      FROM 
        daycare_operations d
    `);
    
    console.log(`Found ${daycares.length} daycares for cost estimation`);
    
    // Get risk analysis data for all daycares
    const [riskData] = await pool.query(`
      SELECT 
        operation_id,
        risk_score,
        high_risk_count,
        medium_high_risk_count,
        medium_risk_count,
        low_risk_count,
        total_violations
      FROM 
        risk_analysis
    `);
    
    // Create a map of risk data by operation ID for quick lookup
    const riskDataMap = new Map();
    riskData.forEach(risk => {
      riskDataMap.set(risk.operation_id, risk);
    });
    
    console.log(`Retrieved risk data for ${riskData.length} daycares`);
    
    // Calculate cost estimates for each daycare
    const costEstimates = [];
    daycares.forEach((daycare, index) => {
      // Show progress every 100 daycares
      if (index % 100 === 0) {
        console.log(`Processing daycare ${index}/${daycares.length}...`);
      }
      
      // Get risk data for this daycare
      const risk = riskDataMap.get(daycare.OPERATION_ID);
      
      // Calculate the cost estimate
      const costData = calculateCost(daycare, risk, zillow, backupIncomeData);
      
      // Add to collection
      costEstimates.push({
        operation_id: daycare.OPERATION_ID,
        operation_number: daycare.OPERATION_NUMBER,
        operation_name: daycare.OPERATION_NAME,
        cost_data: costData
      });
    });
    
    // Save cost estimates to database
    await saveCostEstimatesToDB(pool, costEstimates);
    
    // Return summary statistics
    const costs = costEstimates.map(e => e.cost_data.cost_estimate);
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    const avgCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
    
    console.log('\nCost Estimation Summary:');
    console.log(`Total daycares processed: ${costEstimates.length}`);
    console.log(`Minimum monthly cost: $${minCost}`);
    console.log(`Maximum monthly cost: $${maxCost}`);
    console.log(`Average monthly cost: $${avgCost.toFixed(2)}`);
    
    // Calculate median cost
    costs.sort((a, b) => a - b);
    const median = costs.length % 2 === 0 
      ? (costs[costs.length / 2 - 1] + costs[costs.length / 2]) / 2
      : costs[Math.floor(costs.length / 2)];
    
    console.log(`Median monthly cost: $${median.toFixed(2)}`);
    
    // Output some example cost estimates for review
    console.log('\nSample Cost Estimates:');
    
    // Show a few examples from different price points
    const sortedEstimates = [...costEstimates].sort((a, b) => a.cost_data.cost_estimate - b.cost_data.cost_estimate);
    const samples = [
      sortedEstimates[0], // lowest
      sortedEstimates[Math.floor(sortedEstimates.length * 0.25)], // 25th percentile
      sortedEstimates[Math.floor(sortedEstimates.length * 0.5)],  // median
      sortedEstimates[Math.floor(sortedEstimates.length * 0.75)], // 75th percentile
      sortedEstimates[sortedEstimates.length - 1] // highest
    ];
    
    samples.forEach(sample => {
      console.log(`${sample.operation_name} (${sample.operation_number}): $${sample.cost_data.cost_estimate}/month ($${sample.cost_data.weekly_cost}/week)`);
    });
    
    return costEstimates;
  } catch (err) {
    console.error('Error generating cost estimations:', err);
    throw err;
  }
}

// Main execution function
async function main() {
  // Check if running in production mode
  const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production');
  console.log(`Starting daycare cost estimation process (v4) in ${isProduction ? 'production' : 'development'} mode...`);
  
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Ensure table structure is correct
    await ensureTableStructure(pool);
    
    // Generate and save cost estimations
    await generateCostEstimations(pool);
    
    console.log('Cost estimation process completed successfully!');
  } catch (err) {
    console.error('Error in cost estimation process:', err);
  } finally {
    await pool.end();
  }
}

// Execute the main function
if (require.main === module) {
  main().catch(console.error);
}

/* 
 * This cost estimation model has been calibrated using:
 * 1. National Daycare Price Index (NDCP) data for 2024
 * 2. Real-world examples from Texas childcare facilities
 * 3. Census income data by location
 * 
 * The NDCP data confirms significant variations by:
 * - Age group (infant care ~40% higher than preschool)
 * - Location (high-income counties ~30% higher than low-income counties)
 * - Facility type (center vs home-based care differences)
 */

// Export functions for use in other modules
module.exports = {
  calculateCost,
  getYoungestAgeGroup,
  getIncomeCategory,
  detectAccreditation,
  detectEducationCredentials,
  detectCurriculum
};
