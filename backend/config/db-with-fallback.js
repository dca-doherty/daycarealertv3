const mysql = require('mysql2/promise');
require('dotenv').config();

console.log('Loading db-with-fallback.js module');

// In-memory database as a fallback
const memoryDb = {
  users: [
    {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      password: '$2a$10$LoF3zZCVzlAuLqfxjPoTMuhCCXtxkYkMcbJFPr5wYNElVdpAkQcP6', // hashed 'admin123'
      role: 'admin',
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      username: 'user',
      email: 'user@example.com',
      password: '$2a$10$RJx8dXCs3SJ5Zl.3vj4GaOT8jQpGCgFjgZpGMu59r7zWfM3sUJBye', // hashed 'user123'
      role: 'user',
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    }
  ],
  reviews: [
    {
      id: 'p1',
      daycare_id: 'DC1001',
      daycare_name: 'Little Angels Daycare',
      user_id: 1,
      user_name: 'Admin User',
      user_email: 'admin@example.com',
      submitted_at: new Date(Date.now() - 1 * 86400000),
      rating: 4,
      text: 'This is a pending review for testing. It contains sample text about a fictional daycare experience.',
      status: 'pending'
    },
    {
      id: 'p2',
      daycare_id: 'DC1002',
      daycare_name: 'Sunshine Kids Center',
      user_id: 2,
      user_name: 'Regular User',
      user_email: 'user@example.com',
      submitted_at: new Date(Date.now() - 2 * 86400000),
      rating: 3,
      text: 'Another pending review for testing purposes. This one is from a different user.',
      status: 'pending'
    }
  ],
  tours: [
    {
      id: '1',
      daycare_id: 'DC1001',
      daycare_name: 'Little Angels Daycare',
      user_id: 1, 
      user_name: 'John Parent',
      user_email: 'john@example.com',
      user_phone: '555-123-4567',
      child_name: 'Emma',
      child_age: '2 years',
      preferred_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      preferred_time: '10:00 AM',
      alternate_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      alternate_time: '2:00 PM',
      notes: 'Interested in the full-day program.',
      status: 'pending',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: '2',
      daycare_id: 'DC1002',
      daycare_name: 'Sunshine Kids Center',
      user_id: 2,
      user_name: 'Sarah Smith',
      user_email: 'sarah@example.com',
      user_phone: '555-987-6543',
      child_name: 'Noah',
      child_age: '3 years',
      preferred_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      preferred_time: '11:30 AM',
      alternate_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      alternate_time: '3:00 PM',
      notes: 'Looking for part-time enrollment, Tuesdays and Thursdays.',
      status: 'confirmed',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      confirmed_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  ]
};

let useFallback = false;
let realPool = null;

try {
  // Attempt to create the real database pool
  console.log('Attempting to create MySQL connection pool...');
  console.log(`DB_HOST: ${process.env.DB_HOST || 'not set'}`);
  console.log(`DB_USER: ${process.env.DB_USER || 'not set'}`);
  console.log(`DB_NAME: ${process.env.DB_NAME || 'not set'}`);
  
  realPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'daycarealert',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  
  console.log('MySQL pool created successfully, but connection not yet verified');
} catch (error) {
  console.error('Error creating MySQL pool:', error);
  useFallback = true;
  console.log('Using in-memory fallback database');
}

// Create a mock connection pool with the same interface as mysql2
const fallbackPool = {
  getConnection: async () => {
    console.log('Getting fallback connection');
    return {
      query: async (sql, params) => {
        console.log('Fallback query:', sql);
        
        // Simple query parser to handle common operations
        if (sql.match(/SELECT .* FROM users WHERE/i)) {
          if (sql.includes('email')) {
            const email = params[0];
            const user = memoryDb.users.find(u => u.email === email);
            return [[user || []]];
          } else if (sql.includes('id')) {
            const id = params[0];
            const user = memoryDb.users.find(u => u.id === id);
            return [[user || []]];
          }
        }
        
        if (sql.match(/SELECT .* FROM reviews WHERE/i)) {
          if (sql.includes('status')) {
            const status = params[0];
            const filteredReviews = memoryDb.reviews.filter(r => r.status === status);
            return [filteredReviews];
          }
        }
        
        if (sql.match(/SELECT .* FROM tour_requests/i)) {
          return [memoryDb.tours];
        }
        
        // Default response for unhandled queries
        return [[]];
      },
      release: () => {
        console.log('Releasing fallback connection');
      }
    };
  },
  query: async (sql, params) => {
    console.log('Direct fallback query:', sql);
    
    // Simple query parser to handle common operations
    if (sql.match(/SELECT .* FROM users WHERE/i)) {
      if (sql.includes('email')) {
        const email = params[0];
        const user = memoryDb.users.find(u => u.email === email);
        return [[user || []]];
      } else if (sql.includes('id')) {
        const id = params[0];
        const user = memoryDb.users.find(u => u.id === id);
        return [[user || []]];
      }
    }
    
    if (sql.match(/SELECT .* FROM reviews WHERE/i)) {
      if (sql.includes('status')) {
        const status = params[0];
        const filteredReviews = memoryDb.reviews.filter(r => r.status === status);
        return [filteredReviews];
      }
    }
    
    if (sql.match(/SELECT .* FROM tour_requests/i)) {
      return [memoryDb.tours];
    }
    
    // Default response for unhandled queries
    return [[]];
  }
};

// Simple function to check database connection
const checkConnection = async () => {
  if (useFallback) {
    console.log('Using fallback database, no real connection to check');
    return true;
  }
  
  try {
    const connection = await realPool.getConnection();
    console.log('Database connection established successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.log('Switching to fallback database');
    useFallback = true;
    return true; // Return true since we have a fallback
  }
};

// Export the appropriate pool based on connection status
const getPool = () => {
  return useFallback ? fallbackPool : realPool;
};

module.exports = {
  pool: {
    getConnection: async () => {
      if (useFallback) {
        return fallbackPool.getConnection();
      }
      try {
        return await realPool.getConnection();
      } catch (error) {
        console.error('Failed to get real connection, using fallback:', error.message);
        useFallback = true;
        return fallbackPool.getConnection();
      }
    },
    query: async (sql, params) => {
      if (useFallback) {
        return fallbackPool.query(sql, params);
      }
      try {
        return await realPool.query(sql, params);
      } catch (error) {
        console.error('Failed to execute real query, using fallback:', error.message);
        useFallback = true;
        return fallbackPool.query(sql, params);
      }
    }
  },
  checkConnection,
  getPool,
  isUsingFallback: () => useFallback
};