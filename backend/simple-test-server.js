// Simple test server with CORS support
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5001;

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Create mock tour request data
const tourRequests = [
  {
    id: '1',
    daycareId: 'DC1001',
    daycareName: 'Little Angels Daycare',
    userId: 1, 
    userName: 'John Parent',
    userEmail: 'john@example.com',
    userPhone: '555-123-4567',
    childName: 'Emma',
    childAge: '2 years',
    preferredDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    preferredTime: '10:00 AM',
    alternateDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    alternateTime: '2:00 PM',
    notes: 'Interested in the full-day program.',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    daycareId: 'DC1002',
    daycareName: 'Sunshine Kids Center',
    userId: 2,
    userName: 'Sarah Smith',
    userEmail: 'sarah@example.com',
    userPhone: '555-987-6543',
    childName: 'Noah',
    childAge: '3 years',
    preferredDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    preferredTime: '11:30 AM',
    alternateDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    alternateTime: '3:00 PM',
    notes: 'Looking for part-time enrollment, Tuesdays and Thursdays.',
    status: 'confirmed',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    confirmedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    daycareId: 'DC1003',
    daycareName: 'Bright Futures Preschool',
    userId: 3,
    userName: 'Michael Johnson',
    userEmail: 'michael@example.com',
    userPhone: '555-555-1212',
    childName: 'Olivia',
    childAge: '4 years',
    preferredDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    preferredTime: '9:00 AM',
    alternateDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    alternateTime: '1:00 PM',
    notes: 'Interested in the pre-K program.',
    status: 'completed',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    confirmedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    completedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Simple test server is running' });
});

// Authentication endpoint that accepts any credentials and returns a token
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt: ${email}`);
  
  res.json({
    success: true,
    message: 'Login successful',
    token: 'test_token_123',
    user: {
      id: 1,
      username: email.split('@')[0],
      email: email,
      role: 'admin'
    }
  });
});

// Simple reviews endpoint
app.get('/api/reviews/by-status/pending', (req, res) => {
  console.log('Fetching pending reviews');
  
  const reviews = [
    {
      id: 'p1',
      daycareId: 'DC1001',
      daycareName: 'Little Angels Daycare',
      userId: 1,
      userName: 'Admin User',
      userEmail: 'admin@example.com',
      submittedAt: new Date().toISOString(),
      rating: 4,
      text: 'This is a pending review from the simple test server.',
      status: 'pending'
    },
    {
      id: 'p2',
      daycareId: 'DC1002',
      daycareName: 'Sunshine Kids Center',
      userId: 2,
      userName: 'Regular User',
      userEmail: 'user@example.com',
      submittedAt: new Date().toISOString(),
      rating: 3,
      text: 'Another pending review from the simple test server.',
      status: 'pending'
    }
  ];
  
  res.json({
    success: true,
    reviews: reviews,
    pagination: {
      total: reviews.length,
      page: 1,
      limit: 10,
      pages: 1
    }
  });
});

// For approved and rejected reviews, return empty arrays
app.get('/api/reviews/by-status/approved', (req, res) => {
  res.json({
    success: true,
    reviews: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 10,
      pages: 0
    }
  });
});

app.get('/api/reviews/by-status/rejected', (req, res) => {
  res.json({
    success: true,
    reviews: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 10,
      pages: 0
    }
  });
});

// Moderation endpoint
app.put('/api/reviews/moderate/:id', (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;
  
  console.log(`Moderating review ${id} to ${status}`);
  
  res.json({
    success: true,
    message: `Review ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
    review: {
      id: id,
      status: status,
      // Add more fields as needed
    }
  });
});

// Tour endpoints
app.get('/api/tours', (req, res) => {
  console.log('Fetching tour requests');
  
  res.json({
    success: true,
    tours: tourRequests,
    pagination: {
      total: tourRequests.length,
      page: 1,
      limit: 20,
      pages: 1
    }
  });
});

// Update tour request status
app.put('/api/tours/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  console.log(`Updating tour request ${id} status to ${status}`);
  
  const tourIndex = tourRequests.findIndex(tour => tour.id === id);
  
  if (tourIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Tour request not found'
    });
  }
  
  // Update the status
  tourRequests[tourIndex].status = status;
  
  // Add appropriate date fields based on status
  if (status === 'confirmed') {
    tourRequests[tourIndex].confirmedDate = new Date().toISOString();
  } else if (status === 'completed') {
    tourRequests[tourIndex].completedDate = new Date().toISOString();
  } else if (status === 'cancelled') {
    tourRequests[tourIndex].cancelledDate = new Date().toISOString();
  }
  
  res.json({
    success: true,
    message: `Tour request status updated to ${status}`,
    tour: tourRequests[tourIndex]
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Simple test server running on port ${PORT}`);
  console.log(`Try accessing: http://localhost:${PORT}/api/health`);
});