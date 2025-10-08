const { pool } = require('../config/db');
const logger = require('../utils/logger');

// Create or update daycare details
async function saveDaycareDetails(daycareId, detailsData, userId) {
  try {
    // Check if details already exist for this daycare
    const [existing] = await pool.execute(
      'SELECT id FROM daycare_details WHERE daycare_id = ?',
      [daycareId]
    );
    
    if (existing.length > 0) {
      // Update existing record
      return updateDaycareDetails(existing[0].id, detailsData, userId);
    } else {
      // Create new record
      return createDaycareDetails(daycareId, detailsData, userId);
    }
  } catch (error) {
    logger.error(`Error saving daycare details for daycare ${daycareId}:`, error);
    throw error;
  }
}

// Create new daycare details
async function createDaycareDetails(daycareId, detailsData, userId) {
  try {
    const {
      accreditation_info,
      teacher_certifications,
      student_count_infants,
      student_count_toddlers,
      student_count_preschool,
      student_count_school_age,
      open_spots_infants,
      open_spots_toddlers,
      open_spots_preschool,
      open_spots_school_age,
      price_infants,
      price_toddlers,
      price_preschool,
      price_school_age,
      amenities,
      curriculum_details,
      staff_ratio_infants,
      staff_ratio_toddlers,
      staff_ratio_preschool,
      staff_ratio_school_age,
      hours_of_operation,
      security_features,
      meal_options,
      transportation_provided
    } = detailsData;

    // Convert amenities to JSON string if it's an object
    const amenitiesJson = typeof amenities === 'object' ? JSON.stringify(amenities) : amenities;

    const query = `
      INSERT INTO daycare_details (
        daycare_id, accreditation_info, teacher_certifications,
        student_count_infants, student_count_toddlers, student_count_preschool, student_count_school_age,
        open_spots_infants, open_spots_toddlers, open_spots_preschool, open_spots_school_age,
        price_infants, price_toddlers, price_preschool, price_school_age,
        amenities, curriculum_details,
        staff_ratio_infants, staff_ratio_toddlers, staff_ratio_preschool, staff_ratio_school_age,
        hours_of_operation, security_features, meal_options, transportation_provided, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      daycareId, 
      accreditation_info || null,
      teacher_certifications || null,
      student_count_infants || 0,
      student_count_toddlers || 0,
      student_count_preschool || 0,
      student_count_school_age || 0,
      open_spots_infants || 0,
      open_spots_toddlers || 0,
      open_spots_preschool || 0,
      open_spots_school_age || 0,
      price_infants || null,
      price_toddlers || null,
      price_preschool || null,
      price_school_age || null,
      amenitiesJson || null,
      curriculum_details || null,
      staff_ratio_infants || null,
      staff_ratio_toddlers || null,
      staff_ratio_preschool || null,
      staff_ratio_school_age || null,
      hours_of_operation || null,
      security_features || null,
      meal_options || null,
      transportation_provided ? 1 : 0,
      userId
    ]);

    return { id: result.insertId, daycare_id: daycareId, ...detailsData };
  } catch (error) {
    logger.error(`Error creating daycare details for daycare ${daycareId}:`, error);
    throw error;
  }
}

// Update existing daycare details
async function updateDaycareDetails(detailsId, detailsData, userId) {
  try {
    const fields = [
      'accreditation_info',
      'teacher_certifications',
      'student_count_infants',
      'student_count_toddlers',
      'student_count_preschool',
      'student_count_school_age',
      'open_spots_infants',
      'open_spots_toddlers',
      'open_spots_preschool',
      'open_spots_school_age',
      'price_infants',
      'price_toddlers',
      'price_preschool',
      'price_school_age',
      'amenities',
      'curriculum_details',
      'staff_ratio_infants',
      'staff_ratio_toddlers',
      'staff_ratio_preschool',
      'staff_ratio_school_age',
      'hours_of_operation',
      'security_features',
      'meal_options',
      'transportation_provided'
    ];

    // Prepare update fields and values
    const updates = [];
    const values = [];

    for (const field of fields) {
      if (field in detailsData) {
        let value = detailsData[field];
        
        // Special handling for amenities (convert to JSON)
        if (field === 'amenities' && typeof value === 'object') {
          value = JSON.stringify(value);
        }
        
        // Special handling for boolean fields
        if (field === 'transportation_provided') {
          value = value ? 1 : 0;
        }
        
        updates.push(`${field} = ?`);
        values.push(value);
      }
    }

    // Add the updated_by and details_id
    updates.push('updated_by = ?');
    values.push(userId);
    
    // Add the details_id at the end for the WHERE clause
    values.push(detailsId);

    const query = `
      UPDATE daycare_details
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    const [result] = await pool.execute(query, values);
    
    if (result.affectedRows > 0) {
      // Fetch the updated record
      const [rows] = await pool.execute(
        'SELECT * FROM daycare_details WHERE id = ?',
        [detailsId]
      );
      
      return rows[0];
    }
    
    return null;
  } catch (error) {
    logger.error(`Error updating daycare details ${detailsId}:`, error);
    throw error;
  }
}

// Get daycare details by daycare ID
async function getDaycareDetailsByDaycareId(daycareId) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM daycare_details WHERE daycare_id = ?',
      [daycareId]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const details = rows[0];
    
    // Parse amenities JSON if it exists
    if (details.amenities) {
      try {
        details.amenities = JSON.parse(details.amenities);
      } catch (e) {
        logger.error(`Error parsing amenities JSON for daycare ${daycareId}:`, e);
        // Keep as string if parsing fails
      }
    }
    
    return details;
  } catch (error) {
    logger.error(`Error getting details for daycare ${daycareId}:`, error);
    throw error;
  }
}

module.exports = {
  saveDaycareDetails,
  getDaycareDetailsByDaycareId
};
