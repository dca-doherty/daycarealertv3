const express = require('express');
const app = express();
const PORT = 8090;

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  if (req.url.startsWith('/api/daycare-finder')) {
    console.log('  ✓ Using optimized daycare finder API');
  } else if (req.url.startsWith('/api/recommendations')) {
    console.log('  ✓ Using standard recommendations API');
  }
  
  res.header('Access-Control-Allow-Origin', '*');
  res.status(200).send('API Request Logged');
});

app.listen(PORT, () => {
  console.log(`API Logger listening on port ${PORT}`);
});