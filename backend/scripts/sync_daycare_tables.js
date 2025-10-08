/**
 * Script to synchronize data between daycare_operations and daycares tables
 * This helps resolve foreign key issues by ensuring records exist in both tables
 */

const { pool } = require('../config/db');

// Use console for logging in this script
const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn
};

async function syncDaycareTables() {
  try {
    logger.info('Starting daycare tables synchronization...');
    
    // First, get all operation IDs from daycare_operations table
    logger.info('Fetching operations from daycare_operations table...');
    const [operations] = await pool.query(`
      SELECT 
        OPERATION_ID, 
        OPERATION_NUMBER, 
        OPERATION_NAME, 
        OPERATION_TYPE,
        LOCATION_ADDRESS, 
        CITY, 
        STATE, 
        ZIP,
        COUNTY, 
        PHONE_NUMBER, 
        EMAIL_ADDRESS,
        WEBSITE_ADDRESS, 
        HOURS_OF_OPERATION, 
        DAYS_OF_OPERATION,
        LICENSED_TO_SERVE_AGES, 
        TOTAL_CAPACITY
      FROM daycare_operations
    `);
    
    logger.info(`Found ${operations.length} operations in daycare_operations table`);
    
    // Get all operation numbers from daycares table
    logger.info('Fetching operations from daycares table...');
    const [existingDaycares] = await pool.query(`
      SELECT operation_number
      FROM daycares
    `);
    
    // Create a set of existing daycare operation numbers for faster lookup
    const existingOperationNumbers = new Set();
    existingDaycares.forEach(daycare => {
      existingOperationNumbers.add(daycare.operation_number);
    });
    
    logger.info(`Found ${existingDaycares.length} operations in daycares table`);
    
    // Find operations that exist in daycare_operations but not in daycares
    const missingOperations = [];
    operations.forEach(operation => {
      // Check both OPERATION_ID and OPERATION_NUMBER
      if (!existingOperationNumbers.has(operation.OPERATION_ID) && 
          !existingOperationNumbers.has(operation.OPERATION_NUMBER)) {
        missingOperations.push(operation);
      }
    });
    
    logger.info(`Found ${missingOperations.length} operations missing from daycares table`);
    
    // Insert missing operations into daycares table
    if (missingOperations.length > 0) {
      logger.info('Adding missing operations to daycares table...');
      let inserted = 0;
      
      for (const op of missingOperations) {
        try {
          // Use the OPERATION_ID as the operation_number in daycares table
          await pool.query(`
            INSERT INTO daycares (
              operation_number, 
              operation_name, 
              operation_type,
              address, 
              city, 
              state, 
              zip_code,
              county, 
              phone_number, 
              email,
              website_address, 
              hours_of_operation, 
              days_of_operation,
              licensed_to_serve_ages, 
              total_capacity
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            op.OPERATION_ID,
            op.OPERATION_NAME,
            op.OPERATION_TYPE,
            op.LOCATION_ADDRESS,
            op.CITY,
            op.STATE,
            op.ZIP,
            op.COUNTY,
            op.PHONE_NUMBER,
            op.EMAIL_ADDRESS,
            op.WEBSITE_ADDRESS,
            op.HOURS_OF_OPERATION,
            op.DAYS_OF_OPERATION,
            op.LICENSED_TO_SERVE_AGES,
            op.TOTAL_CAPACITY
          ]);
          
          inserted++;
        } catch (insertError) {
          logger.warn(`Error inserting operation ${op.OPERATION_ID}: ${insertError.message}`);
        }
      }
      
      logger.info(`Successfully added ${inserted} operations to daycares table`);
    }
    
    return true;
  } catch (error) {
    logger.error('Error synchronizing daycare tables:', error);
    return false;
  }
}

// If this script is run directly
if (require.main === module) {
  (async () => {
    try {
      const result = await syncDaycareTables();
      
      if (result) {
        logger.info('Daycare tables synchronization completed successfully');
        process.exit(0);
      } else {
        logger.error('Failed to synchronize daycare tables');
        process.exit(1);
      }
    } catch (err) {
      logger.error('Uncaught error:', err);
      process.exit(1);
    }
  })();
}

module.exports = syncDaycareTables;