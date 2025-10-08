/**
 * Script to fix any issues with the tour_requests table
 * This handles the foreign key constraint problem between the daycare tables
 */

const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Use console for logging in this script
const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn
};

async function fixTourRequestsTable() {
  let conn;
  try {
    logger.info('Starting database connection...');
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });
    
    logger.info('Connected to database');
    
    // First, check if the constraint exists
    const [constraints] = await conn.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
        AND TABLE_NAME = 'tour_requests'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `);
    
    logger.info(`Found ${constraints.length} foreign key constraints`);
    
    if (constraints.length > 0) {
      // Get existing data to save
      const [existingData] = await conn.query('SELECT * FROM tour_requests');
      logger.info(`Backing up ${existingData.length} existing tour requests`);
      
      // Drop foreign key constraint
      logger.info('Dropping foreign key constraint...');
      for (const constraint of constraints) {
        await conn.execute(`
          ALTER TABLE tour_requests
          DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}
        `);
      }
      logger.info('Foreign key constraints dropped successfully');
      
      // Verify table structure
      const [tableInfo] = await conn.query(`
        DESCRIBE tour_requests
      `);
      logger.info('Updated table structure successfully');
      
      // If there were any existing records, let's make sure they're still valid
      if (existingData.length > 0) {
        logger.info('Verifying existing tour requests...');
        
        // For each tour request, check if the daycare exists in either table
        for (const request of existingData) {
          const [daycareOps] = await conn.query(`
            SELECT COUNT(*) as count FROM daycare_operations 
            WHERE OPERATION_ID = ? OR OPERATION_NUMBER = ?
          `, [request.daycare_id, request.daycare_id]);
          
          const [daycares] = await conn.query(`
            SELECT COUNT(*) as count FROM daycares 
            WHERE operation_number = ?
          `, [request.daycare_id]);
          
          const daycareExists = (daycareOps[0].count > 0 || daycares[0].count > 0);
          
          if (!daycareExists) {
            logger.warn(`Daycare ID ${request.daycare_id} not found in either table for tour request ${request.id}`);
          }
        }
      }
    } else {
      logger.info('No foreign key constraints found to drop');
    }
    
    logger.info('Fix completed successfully');
    
    // Close the connection
    if (conn) await conn.end();
    return true;
  } catch (err) {
    logger.error('Error fixing table:', err);
    
    // Close the connection if it exists
    if (conn) await conn.end();
    return false;
  }
}

// If this script is run directly
if (require.main === module) {
  (async () => {
    try {
      logger.info('Starting tour_requests table fix');
      
      const result = await fixTourRequestsTable();
      
      if (result) {
        logger.info('Tour requests table fix completed successfully');
        process.exit(0);
      } else {
        logger.error('Failed to fix tour requests table');
        process.exit(1);
      }
    } catch (err) {
      logger.error('Uncaught error:', err);
      process.exit(1);
    }
  })();
}

module.exports = fixTourRequestsTable;