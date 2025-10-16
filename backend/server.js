const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { checkConnection } = require('./config/db');
const { authenticateToken } = require('./middleware/auth-fixed');
const createUserTables = require('./scripts/init-user-tables');

// Global error handler
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:');
  console.error(error);
  console.error(error.stack);
});

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Use console instead of logger to debug startup issues
console.log('Using console.log for debugging startup issues');

// Log environment variables (without sensitive data)
console.log('Environment variables loaded:');
console.log(`DB_HOST: ${process.env.DB_HOST || 'not set'}`);
console.log(`DB_NAME: ${process.env.DB_NAME || 'not set'}`);
console.log(`DAYCARE_DATASET: ${process.env.DAYCARE_DATASET || 'not set'}`);
console.log(`VIOLATIONS_DATASET: ${process.env.VIOLATIONS_DATASET || 'not set'}`);
console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL || 'not set'}`);
console.log(`PORT: ${process.env.PORT || '5000 (default)'}`);
console.log(`EMAIL_HOST: ${process.env.EMAIL_HOST || 'not set'}`);
console.log(`EMAIL_USER: ${process.env.EMAIL_USER || 'not set'}`);
console.log(`EMAIL_SECURE: ${process.env.EMAIL_SECURE || 'not set'}`);

// Import services with try/catch to catch any errors
let schedulerService;
try {
  schedulerService = require('./services/schedulerService');
  console.log('Scheduler service loaded successfully');
} catch (error) {
  console.error('Error loading scheduler service:', error);
  // Create dummy scheduler service
  schedulerService = {
    init: async () => console.log('Dummy scheduler initialized'),
    stop: () => console.log('Dummy scheduler stopped')
  };
}
const createTourRequestsTable = require('./scripts/create_tour_requests_table');

// Force USE_MOCK_DATA to be false regardless of .env file
process.env.USE_MOCK_DATA = 'false';
console.log(`SERVER ENV: USE_MOCK_DATA is set to: ${process.env.USE_MOCK_DATA}`);
console.log("SERVER: Forcing USE_MOCK_DATA to false for all components");

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const favoritesRoutes = require('./routes/favorites');
const alertsRoutes = require('./routes/alerts');
const reviewsRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');
const violationsRoutes = require('./routes/violations');
const recommendationsRoutes = require('./routes/recommendations');
const tourRoutes = require('./routes/tours');
const daycaresRoutes = require('./routes/daycares');
const ratingsRoutes = require('./routes/ratings');
const tieredRatingsRoutes = require('./routes/tiered_ratings');
const mysqlDaycaresRoutes = require('./routes/mysqlDaycares'); // New MySQL-only routes
const mysqlOptimizedRoutes = require('./routes/mysql_optimized'); // Alias for MySQL routes
const daycareFinderRoutes = require('./routes/daycare_finder_api'); // Optimized daycare finder routes
const testingRoutes = require('./routes/testing'); // Special routes for testing
const specialAuthRoutes = require('./routes/special-auth'); // No CORS restrictions auth routes
const daycareAuthRoutes = require('./routes/daycareAuth'); // Daycare provider authentication
const daycarePortalRoutes = require('./routes/daycarePortal'); // Daycare provider portal

// Initialize express app
const app = express();
const PORT = process.env.PORT || 8081;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })); // Security headers with relaxed CSP for development

  // Check if the request is coming from Nginx proxy
  app.use((req, res, next) => {
    // If the request is proxied by Nginx, skip CORS middleware
    if (req.headers['x-proxied-by'] === 'nginx') {
      req.skipCors = true;
    }
    next();
  });

  // CORS middleware that respects the skipCors flag
  app.use((req, res, next) => {
    if (req.skipCors) {
      return next();
    }

    // Apply CORS
    cors({
      origin: function(origin, callback) {
        const allowedOrigins = [
          process.env.FRONTEND_URL || 'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:5001',
          'http://localhost:5002',
          'http://localhost:8080',
          'http://localhost:8081',
          'http://localhost:8082',
          'http://localhost:8083',
          'http://localhost:8084',
          'https://daycarealert.com',
          'https://api.daycarealert.com',
          'https://www.daycarealert.com'
        ];
        // Allow requests with no origin (like mobile apps or curl requests)
        if(!origin) return callback(null, true);
        console.log('CORS request from origin:', origin);
        if(allowedOrigins.indexOf(origin) === -1){
          console.log('CORS request denied for origin:', origin);
          return callback(null, false);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    })(req, res, next);
  });

  // Skip this additional CORS header middleware if already handled by Nginx
  app.use((req, res, next) => {
    if (req.skipCors) {
      return next();
    }

    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,UPDATE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With,X-HTTP-Method-Override, Content-Type, Accept, Authorization');
    next();
  });

  app.use(express.json({limit: '50mb'})); // Parse JSON request body with increased limit
  app.use(express.urlencoded({limit: '50mb', extended: true})); // Increased limit for URL-encoded data
  app.use(morgan('dev')); // HTTP request logger

  // Set custom HTTP header limits to prevent "431 Request Header Fields Too Large" errors
  app.use((req, res, next) => {
    // Skip setting header limits as the method is not available in this Node version
    next();
  });
// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request body:', req.body);
  }
  next();
});

// Check database connection on startup and initialize tables
try {
  (async () => {
    try {
      const connected = await checkConnection();
      console.log('Database connection check result:', connected ? 'Connected' : 'Failed');
      
      if (connected) {
        try {
          // Initialize user authentication tables
          await createUserTables();
          console.log('User authentication tables initialized');
          
          // Initialize tour requests table
          await createTourRequestsTable();
          console.log('Tour requests table initialized');
        } catch (error) {
          console.error('Error initializing tables:', error);
        }
      } else {
        console.warn('Database connection failed, skipping table initialization');
      }
    } catch (error) {
      console.error('Error checking database connection:', error);
    }
  })();
} catch (error) {
  console.error('Error in database initialization IIFE:', error);
}

// Special auth routes with no CORS restrictions (must come first)
app.use('/special-auth', specialAuthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/reviews', reviewsRoutes);
// Bypass authentication for admin debug routes in development
app.use('/api/admin', (req, res, next) => {
  if (req.path.startsWith('/debug-recommendations/') || req.path.startsWith('/analysis-summary/')) {
    console.log(`[SERVER] Bypassing auth for admin endpoint: ${req.path}`);
    next();
  } else {
    authenticateToken(req, res, next);
  }
}, adminRoutes);
app.use('/api/violations', violationsRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/tours', tourRoutes);
app.use('/api/daycares', daycaresRoutes);
app.use('/api/ratings/tiered', tieredRatingsRoutes); // More specific route must come first
app.use('/api/ratings', ratingsRoutes);
app.use('/api/mysql/daycares', mysqlDaycaresRoutes); // New MySQL-only routes
app.use('/api/mysql-optimized', mysqlOptimizedRoutes); // Add mysql-optimized route as alias
app.use('/api/daycare-finder', daycareFinderRoutes); // Optimized daycare finder API
app.use('/api/testing', testingRoutes); // Special routes for testing
app.use('/api/daycare-auth', daycareAuthRoutes); // Daycare provider authentication
app.use('/api/daycare-portal', daycarePortalRoutes); // Daycare provider portal

// Default route
app.get('/', (req, res) => {
  res.send('DaycareAlert API is running');
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Public debug endpoint for parent recommendations (NO AUTH)
app.get('/api/public/debug-recommendations/:operationId', async (req, res) => {
  const { pool } = require('./config/db');
  try {
    console.log(`[PUBLIC-DEBUG] Accessing recommendations for daycare #${req.params.operationId}`);
    const { operationId } = req.params;
    
    // First, find the correct operation ID
    const [operationData] = await pool.query(
      'SELECT OPERATION_ID FROM daycare_operations WHERE OPERATION_ID = ? OR OPERATION_NUMBER = ?',
      [operationId, operationId]
    );
    
    if (operationData.length === 0) {
      console.log(`[PUBLIC-DEBUG] Daycare not found with ID: ${operationId}`);
      return res.json({
        success: false,
        message: 'Daycare not found',
        requestedId: operationId
      });
    }
    
    const correctId = operationData[0].OPERATION_ID;
    console.log(`[PUBLIC-DEBUG] Found correct ID: ${correctId}`);
    
    // Get recommendations from the database
    const [recData] = await pool.query(
      'SELECT parent_recommendations FROM risk_analysis WHERE operation_id = ?',
      [correctId]
    );
    
    console.log(`[PUBLIC-DEBUG] Query results:`, recData.length > 0 ? 'Found data' : 'No data found');
    
    let realRecommendations = null;
    
    if (recData.length > 0 && recData[0].parent_recommendations) {
      try {
        // If it's already an array, use it directly
        if (Array.isArray(recData[0].parent_recommendations)) {
          realRecommendations = recData[0].parent_recommendations;
          console.log(`[PUBLIC-DEBUG] Using array directly with ${realRecommendations.length} items`);
        } 
        // If it's a string, try to parse it
        else if (typeof recData[0].parent_recommendations === 'string') {
          realRecommendations = JSON.parse(recData[0].parent_recommendations);
          console.log(`[PUBLIC-DEBUG] Parsed string to get ${realRecommendations.length} items`);
        }
        // If it's an object, try to convert it to an array
        else if (typeof recData[0].parent_recommendations === 'object') {
          realRecommendations = Object.values(recData[0].parent_recommendations);
          console.log(`[PUBLIC-DEBUG] Converted object to array with ${realRecommendations.length} items`);
        }
      } catch (e) {
        console.log(`[PUBLIC-DEBUG] Error processing recommendations:`, e);
      }
    }
    
    // Return the results
    return res.json({
      success: true,
      requestedId: operationId,
      correctId: correctId,
      hasData: recData.length > 0,
      rawData: recData.length > 0 ? recData[0].parent_recommendations : null,
      dataType: recData.length > 0 ? typeof recData[0].parent_recommendations : 'none',
      recommendations: realRecommendations || [
        `Debug recommendation 1 for ID: ${operationId}`,
        `Debug recommendation 2 for ID: ${operationId}`,
        `Debug recommendation 3 for ID: ${operationId}`
      ]
    });
  } catch (error) {
    console.error('[PUBLIC-DEBUG] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Public endpoint for analysis summary (NO AUTH)
app.get('/api/public/analysis-summary/:operationId', async (req, res) => {
  const mySqlDaycareService = require('./services/mySqlDaycareService');
  try {
    console.log(`[PUBLIC-API] Fetching analysis summary for daycare #${req.params.operationId}`);
    const { operationId } = req.params;
    
    // Get analysis summary using the service
    const result = await mySqlDaycareService.getAnalysisSummary(operationId);
    
    if (!result.data) {
      return res.json({
        success: false,
        message: 'No analysis summary found for this daycare',
        operationId
      });
    }
    
    return res.json({
      success: true,
      analysis_summary: result.data,
      operationId: result.operationId || operationId
    });
  } catch (error) {
    console.error('[PUBLIC-API] Error fetching analysis summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Debug route to test authentication
app.get('/api/debug/auth', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication successful',
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  });
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

// Define server variable at the top level so it can be accessed in the shutdown handler
let server;

// Wrap everything in try/catch to see the error
try {
  // Function to initialize scheduler
  const initScheduler = async () => {
    try {
      if (process.env.ENABLE_SCHEDULER !== 'false') {
        await schedulerService.init();
        console.log('Alert scheduler initialized');
      } else {
        console.log('Alert scheduler disabled via environment variable');
      }
    } catch (error) {
      console.error('Error initializing scheduler:', error);
    }
  };

  // Function to start server on a specific port
  const startServer = (portToUse) => {
    // Convert port to number and ensure it's valid
    portToUse = parseInt(portToUse, 10);
    if (isNaN(portToUse) || portToUse < 1024 || portToUse > 65535) {
      portToUse = 8080; // Default to a safe port if invalid
    }
    
    return new Promise((resolve, reject) => {
      const serverInstance = app.listen(portToUse, async () => {
        console.log(`Server running on port ${portToUse}`);
        await initScheduler();
        resolve(serverInstance);
      }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          // Increment by 1 but ensure we don't exceed valid port range
          const nextPort = portToUse + 1 > 65535 ? 8080 : portToUse + 1;
          console.warn(`Port ${portToUse} is already in use. Trying ${nextPort}...`);
          resolve(startServer(nextPort));
        } else {
          console.error('Server error:', err);
          reject(err);
        }
      });
    });
  };

  // Start the server with recursive port finding
  startServer(PORT).then((serverInstance) => {
    server = serverInstance;
  }).catch((error) => {
    console.error('Failed to start server after trying multiple ports:', error);
  });
  
} catch (error) {
  console.error('FATAL ERROR STARTING SERVER:', error);
  console.error(error.stack);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (schedulerService && typeof schedulerService.stop === 'function') {
    schedulerService.stop();
  }
  
  // The server might not be defined if it failed to start
  if (typeof server !== 'undefined') {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } else {
    console.log('No server to close, exiting');
    process.exit(0);
  }
});

module.exports = app;

// Tour Scheduling Routes
const tourRoutes = require('./routes/tourScheduling/tourRoutes');
app.use('/api/tour-requests', tourRoutes);

console.log('Tour scheduling routes initialized');

// Start automated follow-up processor
const followupProcessor = require('./jobs/followupProcessor');
followupProcessor.start();

console.log('✅ Automated follow-up processor started');
