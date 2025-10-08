// Environment configuration helper
const envConfig = {
  SOCRATA_APP_TOKEN: 'XLZk8nhCZvuJ9UooaKbfng3ed',
  API_BASE_URL: 'https://data.texas.gov/resource',
  DAYCARE_DATASET: 'bc5r-88dy', // Restored to original working ID
  VIOLATIONS_DATASET: 'tqgd-mf4x', // Updated to the working dataset ID
  INSPECTIONS_DATASET: 'm5q4-3y3d',
  STANDARDS_DATASET: '7ech-8t9i',
  
  // Helper function to safely access env variables
  get: function(key, defaultValue = '') {
    // For development, return hardcoded values to avoid process.env issues
    const envValues = {
      'API_URL': 'http://localhost:8082/api',
      'BACKEND_PORT': '5001'
    };
    return envValues[key] || defaultValue;
  }
};

export default envConfig;
