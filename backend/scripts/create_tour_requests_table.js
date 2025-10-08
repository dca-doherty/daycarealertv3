const { pool } = require('../config/db');

// Use console.log for debugging
const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.log
};

async function createTourRequestsTable() {
  try {
    // Create tour_requests table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tour_requests (
        id int AUTO_INCREMENT PRIMARY KEY,
        daycare_id int NOT NULL,
        daycare_name varchar(255) NOT NULL,
        name varchar(100) NOT NULL,
        email varchar(255) NOT NULL,
        phone varchar(20) NOT NULL,
        tour_date date NOT NULL,
        tour_time varchar(10) NOT NULL,
        child_count int NOT NULL DEFAULT 1,
        age_groups json NOT NULL,
        comments text,
        status enum('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create daycare_portal tables if they don't exist
    await pool.query(`
      -- Daycare providers table (extends the users table)
      CREATE TABLE IF NOT EXISTS daycare_providers (
        id int AUTO_INCREMENT PRIMARY KEY,
        user_id int NOT NULL,
        daycare_id int NOT NULL,
        provider_code varchar(50) UNIQUE,
        position varchar(100),
        phone varchar(20),
        is_admin tinyint(1) DEFAULT 0,
        verified tinyint(1) DEFAULT 0,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Daycare additional information table
      CREATE TABLE IF NOT EXISTS daycare_details (
        id int AUTO_INCREMENT PRIMARY KEY,
        daycare_id int NOT NULL,
        last_updated timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        accreditation_info text,
        teacher_certifications text,
        student_count_infants int,
        student_count_toddlers int,
        student_count_preschool int,
        student_count_school_age int,
        open_spots_infants int,
        open_spots_toddlers int,
        open_spots_preschool int,
        open_spots_school_age int,
        price_infants decimal(10,2),
        price_toddlers decimal(10,2),
        price_preschool decimal(10,2),
        price_school_age decimal(10,2),
        amenities json,
        curriculum_details text,
        staff_ratio_infants varchar(20),
        staff_ratio_toddlers varchar(20),
        staff_ratio_preschool varchar(20),
        staff_ratio_school_age varchar(20),
        hours_of_operation text,
        security_features text,
        meal_options text,
        transportation_provided tinyint(1) DEFAULT 0,
        updated_by int,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      );

      -- Referrals table (to track tours and site-generated leads)
      CREATE TABLE IF NOT EXISTS daycare_referrals (
        id int AUTO_INCREMENT PRIMARY KEY,
        daycare_id int NOT NULL,
        referral_type enum('tour', 'website_view', 'profile_click', 'search_result', 'recommendation') NOT NULL,
        user_id int, -- NULL if anonymous user
        contact_name varchar(100),
        contact_email varchar(255),
        contact_phone varchar(20),
        referral_date timestamp DEFAULT CURRENT_TIMESTAMP,
        converted tinyint(1) DEFAULT 0,
        conversion_date timestamp NULL,
        tour_request_id int, -- Reference to tour_requests table if type='tour'
        notes text,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      -- Daycare analytics table (for storing aggregated statistics)
      CREATE TABLE IF NOT EXISTS daycare_analytics (
        id int AUTO_INCREMENT PRIMARY KEY,
        daycare_id int NOT NULL,
        date date,
        profile_views int DEFAULT 0,
        search_appearances int DEFAULT 0,
        recommendation_appearances int DEFAULT 0,
        tour_requests int DEFAULT 0,
        referral_count int DEFAULT 0,
        conversion_count int DEFAULT 0,
        last_updated timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      -- Competitor comparisons table (for storing competitor analysis data)
      CREATE TABLE IF NOT EXISTS competitor_comparisons (
        id int AUTO_INCREMENT PRIMARY KEY,
        daycare_id int NOT NULL,
        competitor_id int NOT NULL,
        distance_miles decimal(10,2),
        price_difference_percent decimal(10,2),
        rating_difference decimal(10,2),
        violation_count_difference int,
        market_position enum('lower', 'similar', 'higher'),
        last_updated timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    logger.info('Tour requests and daycare portal tables created or verified');
    return true;
  } catch (error) {
    logger.error('Error creating tables:', error);
    return false;
  }
}

// If this script is run directly
if (require.main === module) {
  (async () => {
    try {
      await createTourRequestsTable();
      process.exit(0);
    } catch (err) {
      logger.error('Failed to create tables:', err);
      process.exit(1);
    }
  })();
}

module.exports = createTourRequestsTable;
