/**
 * Get a sample from the Texas API
 * This script fetches a sample record from the Texas daycare API to check field names
 */
require('dotenv').config();
const axios = require('axios');

// Configuration
const API_BASE_URL = 'https://data.texas.gov/resource';
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN || 'XLZk8nhCZvuJ9UooaKbfng3ed';
const DAYCARE_DATASET = process.env.DAYCARE_DATASET || 'bc5r-88dy';

// Initialize API client
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-App-Token': APP_TOKEN
  }
});

async function getSample() {
  try {
    console.log('Fetching sample data from Texas API...');
    
    const response = await api.get(`/${DAYCARE_DATASET}.json`, {
      params: {
        $limit: 1
      }
    });
    
    const sample = response.data[0];
    console.log('API Response:');
    console.log(JSON.stringify(sample, null, 2));
    
    // List all field names in the response
    console.log('\nField names in the API response:');
    Object.keys(sample).forEach(key => {
      console.log(`- ${key}: ${typeof sample[key]}`);
    });
    
    // Check specifically for programs_provided
    if (sample.programs_provided) {
      console.log('\nField "programs_provided" found:');
      console.log(sample.programs_provided);
    } else if (sample.programmatic_services) {
      console.log('\nField "programmatic_services" found:');
      console.log(sample.programmatic_services);
    } else {
      console.log('\nNeither "programs_provided" nor "programmatic_services" fields found');
    }
    
  } catch (error) {
    console.error('Error fetching API data:', error.message);
    if (error.response) {
      console.error('API response:', error.response.data);
    }
  }
}

// Run the script
getSample();