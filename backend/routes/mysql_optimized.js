/**
 * MySQL-optimized API Routes - Alias for mysqlDaycares routes
 * This provides an alias to the existing MySQL routes for backward compatibility
 */
const express = require('express');
const router = express.Router();
const mysqlDaycaresRoutes = require('./mysqlDaycares');
const favoritesRoutes = require('./favorites');

// Just forward all requests to the existing implementation
router.use('/daycares', mysqlDaycaresRoutes);

// Forward favorites requests to standard favorites API
router.use('/favorites', (req, res, next) => {
  // Log the forwarding for debugging
  console.log(`[API] Forwarding request from /api/mysql-optimized/favorites to /api/favorites`);

  // Pass the request to the favorites router
  favoritesRoutes(req, res, next);
});

module.exports = router;
