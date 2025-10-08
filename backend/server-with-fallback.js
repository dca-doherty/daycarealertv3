const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { checkConnection } = require('./config/db-with-fallback');
require('dotenv').config();

// Use console instead of logger to debug startup issues
console.log('Using console.log for debugging startup issues');

// Global error handler 
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:');
  console.error(error);
  console.error(error.stack);
});

// Initialize express app early
const app = express();
const PORT = process.env.PORT || 5001;

// JWT secret for authentication
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_for_development';

// Simple auth middleware using JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({
      success: false,
      message: 'Invalid token'
    });
  }
}

// Admin middleware - check if user has admin role
function isAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Admin privileges required'
    });
  }
}

// Create a simple in-memory data store as a fallback for the database
const memoryDb = {
  users: [
    {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      password: '$2a$10$LoF3zZCVzlAuLqfxjPoTMuhCCXtxkYkMcbJFPr5wYNElVdpAkQcP6', // hashed 'admin123'
      role: 'admin'
    },
    {
      id: 2,
      username: 'user',
      email: 'user@example.com',
      password: '$2a$10$RJx8dXCs3SJ5Zl.3vj4GaOT8jQpGCgFjgZpGMu59r7zWfM3sUJBye', // hashed 'user123'
      role: 'user'
    }
  ],
  tours: [],
  reviews: {
    pending: [
      {
        id: 'p1',
        daycareId: 'DC1001',
        daycareName: 'Little Angels Daycare',
        userId: 1,
        userName: 'Admin User',
        userEmail: 'admin@example.com',
        submittedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        rating: 4,
        text: 'This is a pending review for testing. It contains sample text about a fictional daycare experience.',
        status: 'pending'
      },
      {
        id: 'p2',
        daycareId: 'DC1002',
        daycareName: 'Sunshine Kids Center',
        userId: 2,
        userName: 'Regular User',
        userEmail: 'user@example.com',
        submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        rating: 3,
        text: 'Another pending review for testing purposes. This one is from a different user.',
        status: 'pending'
      }
    ],
    approved: [
      {
        id: 'a1',
        daycareId: 'DC1001',
        daycareName: 'Little Angels Daycare',
        userId: 2,
        userName: 'Regular User',
        userEmail: 'user@example.com',
        submittedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        rating: 5,
        text: 'This is an approved review. It has been reviewed by an admin and approved for display.',
        status: 'approved',
        approvedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        approvedBy: 'Admin User'
      }
    ],
    rejected: [
      {
        id: 'r1',
        daycareId: 'DC1003',
        daycareName: 'Bright Futures Preschool',
        userId: 2,
        userName: 'Regular User',
        userEmail: 'user@example.com',
        submittedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        rating: 1,
        text: 'This review was rejected by an admin because it violated community standards.',
        status: 'rejected',
        rejectedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
        rejectedBy: 'Admin User',
        rejectionReason: 'Contains inappropriate content'
      }
    ]
  }
};

// Generate tour request data
for (let i = 1; i <= 5; i++) {
  memoryDb.tours.push({
    id: `tour${i}`,
    daycareId: `DC${1000 + i}`,
    daycareName: `Sample Daycare ${i}`,
    userId: i % 2 === 0 ? 1 : 2,
    userName: i % 2 === 0 ? 'Admin User' : 'Regular User',
    userEmail: i % 2 === 0 ? 'admin@example.com' : 'user@example.com',
    userPhone: `555-123-${1000 + i}`,
    childName: `Child ${i}`,
    childAge: `${(i % 5) + 1} years`,
    preferredDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
    preferredTime: `${9 + i}:00 AM`,
    alternateDate: new Date(Date.now() + (i + 5) * 24 * 60 * 60 * 1000).toISOString(),
    alternateTime: `${1 + i}:00 PM`,
    notes: `Tour request ${i} notes.`,
    status: i % 3 === 0 ? 'confirmed' : i % 3 === 1 ? 'pending' : 'completed',
    createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
  });
}

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
})); // Security headers with relaxed CSP for development
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
})); // Enable CORS for frontend
app.use(express.json()); // Parse JSON request body
app.use(morgan('dev')); // HTTP request logger

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request body:', req.body);
  }
  next();
});

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log(`Login attempt for: ${email}`);
  
  // Find user by email (for demo, we're not checking passwords)
  const user = memoryDb.users.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }
  
  // In a real app, we would verify the password hash here
  // For demo purposes, we're accepting any password
  
  // Generate token
  const token = jwt.sign(
    { 
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }, 
    JWT_SECRET, 
    { expiresIn: '1d' }
  );
  
  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Reviews routes
app.get('/api/reviews/by-status/:status', authenticateToken, isAdmin, (req, res) => {
  const { status } = req.params;
  
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status'
    });
  }
  
  const reviews = memoryDb.reviews[status] || [];
  
  res.json({
    success: true,
    reviews,
    pagination: {
      total: reviews.length,
      page: 1,
      limit: 20,
      pages: 1
    }
  });
});

app.put('/api/reviews/moderate/:id', authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;
  
  console.log(`Moderating review ${id} to ${status}`);
  
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Status must be approved or rejected'
    });
  }
  
  if (status === 'rejected' && !rejectionReason) {
    return res.status(400).json({
      success: false,
      message: 'Rejection reason is required'
    });
  }
  
  // Find the review in all status arrays
  let foundReview = null;
  let foundStatus = null;
  
  for (const statusKey in memoryDb.reviews) {
    const reviewIndex = memoryDb.reviews[statusKey].findIndex(r => r.id === id);
    if (reviewIndex !== -1) {
      foundReview = memoryDb.reviews[statusKey][reviewIndex];
      foundStatus = statusKey;
      break;
    }
  }
  
  if (!foundReview) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }
  
  // Remove from current status array
  memoryDb.reviews[foundStatus] = memoryDb.reviews[foundStatus].filter(r => r.id !== id);
  
  // Update review
  foundReview.status = status;
  
  if (status === 'approved') {
    foundReview.approvedAt = new Date().toISOString();
    foundReview.approvedBy = req.user.username;
    delete foundReview.rejectedAt;
    delete foundReview.rejectedBy;
    delete foundReview.rejectionReason;
  } else {
    foundReview.rejectedAt = new Date().toISOString();
    foundReview.rejectedBy = req.user.username;
    foundReview.rejectionReason = rejectionReason;
    delete foundReview.approvedAt;
    delete foundReview.approvedBy;
  }
  
  // Add to new status array
  memoryDb.reviews[status].push(foundReview);
  
  res.json({
    success: true,
    message: `Review ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
    review: foundReview
  });
});

// Tour endpoints
app.get('/api/tours', authenticateToken, isAdmin, (req, res) => {
  console.log('Fetching tour requests');
  
  res.json({
    success: true,
    tours: memoryDb.tours,
    pagination: {
      total: memoryDb.tours.length,
      page: 1,
      limit: 20,
      pages: 1
    }
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    mode: 'fallback'
  });
});

// Default route
app.get('/', (req, res) => {
  res.send('DaycareAlert API with Fallback is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Check database connection on startup
checkConnection().then(connected => {
  console.log('Database check result:', connected ? 'Connected or Fallback Ready' : 'Failed');
  
  // Start the server
  app.listen(PORT, () => {
    console.log(`Server with fallback running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${PORT} is already in use. Trying ${PORT + 1}...`);
      // Try the next port
      app.listen(PORT + 1, () => {
        console.log(`Server with fallback running on port ${PORT + 1}`);
        console.log(`API available at http://localhost:${PORT + 1}/api`);
        console.log(`Health check: http://localhost:${PORT + 1}/api/health`);
      });
    } else {
      console.error('Server error:', err);
    }
  });
});