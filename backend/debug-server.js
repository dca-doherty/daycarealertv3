// Debug server script to verify port binding
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Basic routes
app.get('/', (req, res) => {
  res.send('Debug server is running');
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'debug'
  });
});

app.get('/api/reviews/by-status/:status', (req, res) => {
  res.json({
    success: true,
    reviews: [
      {
        id: 1,
        daycareName: 'Test Daycare 1',
        userName: 'Test User',
        submittedAt: new Date().toISOString(),
        rating: 4,
        text: 'This is a test review for debugging',
        status: req.params.status
      }
    ]
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
  console.log(`Current environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Current directory: ${process.cwd()}`);
  console.log(`API URL: http://localhost:${PORT}/api/health`);
});