/**
 * Update Ratings Columns
 * 
 * This script updates the ratings columns in the database to support the 1-10 scale
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

async function updateRatingColumns() {
  console.log('Updating rating columns to support 1-10 scale...');
  
  const pool = mysql.createPool(dbConfig);
  
  try {
    // First, check if the daycare_ratings_balanced table exists
    const [tables] = await pool.query(`SHOW TABLES LIKE 'daycare_ratings_balanced'`);
    
    if (tables.length === 0) {
      console.log('Table daycare_ratings_balanced does not exist!');
      return false;
    }
    
    // Get current column definitions
    const [columns] = await pool.query(`DESCRIBE daycare_ratings_balanced`);
    const ratingColumns = columns.filter(col => col.Field.includes('rating'));
    
    console.log('Current rating column definitions:');
    ratingColumns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type}`);
    });
    
    // Modify overall_rating to decimal(3,1) to support up to 10.0
    console.log('\nUpdating overall_rating column...');
    await pool.query(`
      ALTER TABLE daycare_ratings_balanced 
      MODIFY COLUMN overall_rating decimal(3,1) NOT NULL
    `);
    
    // Modify other rating columns
    console.log('Updating subcategory rating columns...');
    await pool.query(`
      ALTER TABLE daycare_ratings_balanced 
      MODIFY COLUMN safety_rating decimal(3,1),
      MODIFY COLUMN health_rating decimal(3,1),
      MODIFY COLUMN wellbeing_rating decimal(3,1),
      MODIFY COLUMN facility_rating decimal(3,1),
      MODIFY COLUMN admin_rating decimal(3,1)
    `);
    
    // Check if daycare_finder table exists and update its columns too
    const [finderTables] = await pool.query(`SHOW TABLES LIKE 'daycare_finder'`);
    
    if (finderTables.length > 0) {
      console.log('\nUpdating daycare_finder rating columns...');
      await pool.query(`
        ALTER TABLE daycare_finder 
        MODIFY COLUMN overall_rating decimal(3,1),
        MODIFY COLUMN safety_rating decimal(3,1),
        MODIFY COLUMN health_rating decimal(3,1),
        MODIFY COLUMN wellbeing_rating decimal(3,1),
        MODIFY COLUMN facility_rating decimal(3,1),
        MODIFY COLUMN admin_rating decimal(3,1)
      `);
    }
    
    // Verify the changes
    const [newColumns] = await pool.query(`DESCRIBE daycare_ratings_balanced`);
    const newRatingColumns = newColumns.filter(col => col.Field.includes('rating'));
    
    console.log('\nUpdated rating column definitions:');
    newRatingColumns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type}`);
    });
    
    console.log('\nRating columns updated successfully!');
    return true;
  } catch (err) {
    console.error('Error updating rating columns:', err);
    return false;
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  updateRatingColumns().catch(console.error);
}

module.exports = { updateRatingColumns };