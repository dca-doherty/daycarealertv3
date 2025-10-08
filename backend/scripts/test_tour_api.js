const http = require('http');

// Test data
const testData = {
  daycare_id: 123,
  daycare_name: "Test Daycare",
  name: "Test User",
  email: "test@example.com",
  phone: "123-456-7890",
  tour_date: "2025-04-01",
  tour_time: "10:00",
  child_count: 1,
  age_groups: ["Infant (0-1)"],
  comments: "Test comment"
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