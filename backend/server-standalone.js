const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');

// Global error handler to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:');
  console.error(error);
});

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5001;

// JWT secret for authentication
const JWT_SECRET = 'standalone_secret_key';

// In-memory data storage
const dataStore = {
  users: [
    {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      password_hash: '$2a$10$LoF3zZCVzlAuLqfxjPoTMuhCCXtxkYkMcbJFPr5wYNElVdpAkQcP6', // 'admin123'
      role: 'admin',
      is_active: 1
    },
    {
      id: 2,
      username: 'user',
      email: 'user@example.com',
      password_hash: '$2a$10$RJx8dXCs3SJ5Zl.3vj4GaOT8jQpGCgFjgZpGMu59r7zWfM3sUJBye', // 'user123'
      role: 'user',
      is_active: 1
    }
  ],
  sessions: [],
  reviews: {
    pending: [],
    approved: [],
    rejected: []
  },
  tours: []
};

// Authentication middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = dataStore.users.find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
}

// Admin check middleware
function isAdmin(req, res, next) {
  if (req.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({ success: false, message: 'Admin privileges required' });
}

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(morgan('dev'));

// Log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log(`Login attempt for: ${email}`);
    
    // In development mode, accept any email/password
    // For simplicity, we'll use specific accounts
    const user = dataStore.users.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // In a real app, we'd check the password hash
    // Here we're accepting any password for these accounts
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Store session
    dataStore.sessions.push({
      userId: user.id,
      token,
      createdAt: new Date()
    });
    
    // Return success
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// User info endpoint
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Logout endpoint
app.post('/api/auth/logout', authenticate, (req, res) => {
  // Remove session
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  dataStore.sessions = dataStore.sessions.filter(s => s.token !== token);
  
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    mode: 'standalone'
  });
});

// Reviews endpoints
app.get('/api/reviews/by-status/:status', authenticate, isAdmin, (req, res) => {
  const { status } = req.params;
  
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status'
    });
  }
  
  const reviews = dataStore.reviews[status] || [];
  
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

// Tour requests endpoint
app.get('/api/tours', authenticate, isAdmin, (req, res) => {
  res.json({
    success: true,
    tours: dataStore.tours,
    pagination: {
      total: dataStore.tours.length,
      page: 1,
      limit: 20,
      pages: 1
    }
  });
});

// Additional endpoints can be added here

// Default route
app.get('/', (req, res) => {
  res.send('DaycareAlert Standalone API Server is running');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Standalone server running on port ${PORT}`);
  console.log(`This server has no database dependency`);
  console.log(`Login with: admin@example.com / any-password`);
});