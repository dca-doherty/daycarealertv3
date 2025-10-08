const http = require('http');

// Test data
const testData = {
  daycare_id: 9999,
  daycare_name: "API Test Daycare",
  name: "API Test User",
  email: "apitest@example.com",
  phone: "555-1234",
  tour_date: "2025-04-15",
  tour_time: "14:00",
  child_count: 2,
  age_groups: ["Toddler (1-3)", "Preschool (3-5)"],
  comments: "This is a test submission from the API test script"
};

// Request options
const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/tours',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

// Make the request
const req = http.request(options, res => {
  console.log(`API Response Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('API Response Body:', data);
    console.log('Test completed');
  });
});

// Handle request errors
req.on('error', error => {
  console.error('Error testing API:', error);
});

// Send the data
req.write(JSON.stringify(testData));
req.end();

console.log('Making test request to /api/tours...');