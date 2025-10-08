const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

// Initialize express app
const app = express();
const PORT = 5001;

// JWT secret
const JWT_SECRET = 'simple_working_server_secret';

// In-memory database
const users = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin'
  },
  {
    id: 2,
    username: 'user',
    email: 'user@example.com',
    role: 'user'
  }
];

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Simple auth middleware
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
    req.user = users.find(u => u.id === decoded.userId) || decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
}

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log(`Login attempt for: ${email}`);
  
  // In this simple server, accept any credentials
  // For admin@example.com, return admin role
  let user;
  
  if (email === 'admin@example.com') {
    user = users[0];
  } else {
    user = users[1];
  }
  
  // Generate token
  const token = jwt.sign({ 
    userId: user.id, 
    username: user.username,
    email: user.email,
    role: user.role
  }, JWT_SECRET, { expiresIn: '24h' });
  
  res.json({
    success: true,
    message: 'Login successful',
    token,
    user
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Simple response for admin dashboard to prevent errors
app.get('/api/reviews/by-status/pending', authenticateToken, (req, res) => {
  res.json({
    success: true,
    reviews: [],
    pagination: {
      total: 0
    }
  });
});

app.get('/api/reviews/by-status/approved', authenticateToken, (req, res) => {
  res.json({
    success: true,
    reviews: [],
    pagination: {
      total: 0
    }
  });
});

app.get('/api/reviews/by-status/rejected', authenticateToken, (req, res) => {
  res.json({
    success: true,
    reviews: [],
    pagination: {
      total: 0
    }
  });
});

app.get('/api/tours', authenticateToken, (req, res) => {
  res.json({
    success: true,
    tours: [],
    pagination: {
      total: 0
    }
  });
});

// Default route
app.get('/', (req, res) => {
  res.send('Simple working server is running');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Simple working server running on port ${PORT}`);
});