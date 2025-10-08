const { pool } = require('../config/db');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Create a new daycare provider
async function createDaycareProvider(providerData) {
  try {
    const { 
      user_id, 
      daycare_id, 
      position, 
      phone, 
      is_admin 
    } = providerData;

    // Generate a unique provider code
    const providerCode = await generateProviderCode();

    const query = `
      INSERT INTO daycare_providers (
        user_id, daycare_id, provider_code, position, phone, is_admin
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      user_id, daycare_id, providerCode, position, phone, is_admin ? 1 : 0
    ]);

    return { id: result.insertId, provider_code: providerCode, ...providerData };
  } catch (error) {
    logger.error('Error creating daycare provider:', error);
    throw error;
  }
}

// Generate a unique provider code
async function generateProviderCode() {
  const codeLength = 8;
  let isUnique = false;
  let providerCode;

  while (!isUnique) {
    // Generate a random code
    providerCode = crypto.randomBytes(Math.ceil(codeLength / 2))
      .toString('hex')
      .slice(0, codeLength)
      .toUpperCase();
    
    // Check if code already exists
    const [existing] = await pool.execute(
      'SELECT id FROM daycare_providers WHERE provider_code = ?',
      [providerCode]
    );

    isUnique = existing.length === 0;
  }

  return providerCode;
}

// Get provider by user ID
async function getProviderByUserId(userId) {
  try {
    const [rows] = await pool.execute(
      `SELECT dp.*, d.operation_name AS daycare_name 
       FROM daycare_providers dp
       LEFT JOIN daycare_operations d ON dp.daycare_id = d.OPERATION_ID
       WHERE dp.user_id = ?`,
      [userId]
    );

    // If not found in daycare_operations, try daycares table
    if (rows.length > 0 && !rows[0].daycare_name) {
      const [daycares] = await pool.execute(
        `SELECT operation_name FROM daycares WHERE operation_number = ?`,
        [rows[0].daycare_id]
      );
      
      if (daycares.length > 0) {
        rows[0].daycare_name = daycares[0].operation_name;
      }
    }
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    logger.error(`Error getting provider for user ${userId}:`, error);
    throw error;
  }
}

// Get provider by provider code
async function getProviderByCode(providerCode) {
  try {
    const [rows] = await pool.execute(
      `SELECT dp.*, u.email, u.full_name, d.operation_name AS daycare_name 
       FROM daycare_providers dp
       JOIN users u ON dp.user_id = u.id
       LEFT JOIN daycare_operations d ON dp.daycare_id = d.OPERATION_ID
       WHERE dp.provider_code = ?`,
      [providerCode]
    );

    // If not found in daycare_operations, try daycares table
    if (rows.length > 0 && !rows[0].daycare_name) {
      const [daycares] = await pool.execute(
        `SELECT operation_name FROM daycares WHERE operation_number = ?`,
        [rows[0].daycare_id]
      );
      
      if (daycares.length > 0) {
        rows[0].daycare_name = daycares[0].operation_name;
      }
    }
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    logger.error(`Error getting provider with code ${providerCode}:`, error);
    throw error;
  }
}

// Update provider details
async function updateProvider(providerId, updateData) {
  try {
    const allowedFields = ['position', 'phone', 'is_admin', 'verified'];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return false; // No valid fields to update
    }

    values.push(providerId); // Add the provider ID for the WHERE clause

    const query = `
      UPDATE daycare_providers
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  } catch (error) {
    logger.error(`Error updating provider ${providerId}:`, error);
    throw error;
  }
}

// Get all providers for a daycare
async function getProvidersByDaycareId(daycareId) {
  try {
    const [rows] = await pool.execute(
      `SELECT dp.*, u.email, u.full_name
       FROM daycare_providers dp
       JOIN users u ON dp.user_id = u.id
       WHERE dp.daycare_id = ?`,
      [daycareId]
    );
    
    return rows;
  } catch (error) {
    logger.error(`Error getting providers for daycare ${daycareId}:`, error);
    throw error;
  }
}

// Delete a provider
async function deleteProvider(providerId) {
  try {
    const [result] = await pool.execute(
      'DELETE FROM daycare_providers WHERE id = ?',
      [providerId]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    logger.error(`Error deleting provider ${providerId}:`, error);
    throw error;
  }
}

module.exports = {
  createDaycareProvider,
  getProviderByUserId,
  getProviderByCode,
  updateProvider,
  getProvidersByDaycareId,
  deleteProvider,
  generateProviderCode
};
