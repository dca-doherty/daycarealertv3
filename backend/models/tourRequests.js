const { pool } = require('../config/db');
const logger = require('../utils/logger');

// Create a new tour request
async function createTourRequest(tourData) {
  try {
    const { 
      daycare_id, 
      daycare_name, 
      name, 
      email, 
      phone, 
      tour_date, 
      tour_time, 
      child_count, 
      age_groups, 
      comments 
    } = tourData;

    // Verify the daycare exists in database and record which table it's in
    try {
      // First check daycare_operations table using OPERATION_ID
      const [operations1] = await pool.execute(
        'SELECT * FROM daycare_operations WHERE OPERATION_ID = ?',
        [daycare_id]
      );
      
      if (operations1.length > 0) {
        logger.info(`Daycare found in daycare_operations table with OPERATION_ID ${daycare_id}`);
      } else {
        // Try daycare_operations table using OPERATION_NUMBER
        const [operations2] = await pool.execute(
          'SELECT * FROM daycare_operations WHERE OPERATION_NUMBER = ?',
          [daycare_id]
        );
        
        if (operations2.length > 0) {
          logger.info(`Daycare found in daycare_operations table with OPERATION_NUMBER ${daycare_id}`);
        } else {
          // Try daycares table
          const [daycares] = await pool.execute(
            'SELECT * FROM daycares WHERE operation_number = ?',
            [daycare_id]
          );
          
          if (daycares.length > 0) {
            logger.info(`Daycare found in daycares table with operation_number ${daycare_id}`);
          } else {
            logger.warn(`Daycare with ID ${daycare_id} not found in any database table, proceeding anyway`);
          }
        }
      }
    } catch (dbError) {
      // Log but continue - don't block tour request due to database issues
      logger.warn(`Database error checking daycare ${daycare_id}: ${dbError.message}`);
    }

    // Convert age_groups array to JSON string
    const ageGroupsJson = JSON.stringify(age_groups);

    const query = `
      INSERT INTO tour_requests (
        daycare_id, daycare_name, name, email, phone, 
        tour_date, tour_time, child_count, age_groups, comments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      daycare_id, daycare_name, name, email, phone, 
      tour_date, tour_time, child_count, ageGroupsJson, comments
    ]);

    return { id: result.insertId, ...tourData };
  } catch (error) {
    logger.error('Error creating tour request:', error);
    throw error;
  }
}

// Get all tour requests
async function getAllTourRequests() {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM tour_requests 
      ORDER BY created_at DESC
    `);
    
    // Handle age_groups - they might already be parsed by mysql2 when using JSON type
    return rows.map(row => {
      // Create a copy of the row to avoid modifying the original
      const processedRow = { ...row };
      
      // Check if age_groups is a string that needs parsing
      if (typeof processedRow.age_groups === 'string') {
        try {
          processedRow.age_groups = JSON.parse(processedRow.age_groups);
        } catch (e) {
          logger.error(`Error parsing age_groups for tour request ${processedRow.id}:`, e);
          // If parsing fails, keep the original value
        }
      }
      
      return processedRow;
    });
  } catch (error) {
    logger.error('Error getting all tour requests:', error);
    throw error;
  }
}

// Get tour requests for a specific daycare
async function getTourRequestsByDaycareId(daycareId) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM tour_requests 
       WHERE daycare_id = ? 
       ORDER BY created_at DESC`,
      [daycareId]
    );
    
    // Handle age_groups - they might already be parsed by mysql2 when using JSON type
    return rows.map(row => {
      // Create a copy of the row to avoid modifying the original
      const processedRow = { ...row };
      
      // Check if age_groups is a string that needs parsing
      if (typeof processedRow.age_groups === 'string') {
        try {
          processedRow.age_groups = JSON.parse(processedRow.age_groups);
        } catch (e) {
          logger.error(`Error parsing age_groups for tour request ${processedRow.id}:`, e);
          // If parsing fails, keep the original value
        }
      }
      
      return processedRow;
    });
  } catch (error) {
    logger.error(`Error getting tour requests for daycare ${daycareId}:`, error);
    throw error;
  }
}

// Update tour request status
async function updateTourRequestStatus(requestId, status) {
  try {
    const [result] = await pool.execute(
      `UPDATE tour_requests 
       SET status = ? 
       WHERE id = ?`,
      [status, requestId]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    logger.error(`Error updating tour request ${requestId}:`, error);
    throw error;
  }
}

module.exports = {
  createTourRequest,
  getAllTourRequests,
  getTourRequestsByDaycareId,
  updateTourRequestStatus
};