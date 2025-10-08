const { pool } = require('../config/db');
const logger = require('../utils/logger');

// Track a new referral
async function trackReferral(referralData) {
  try {
    const {
      daycare_id,
      referral_type,
      user_id,
      contact_name,
      contact_email,
      contact_phone,
      tour_request_id,
      notes
    } = referralData;

    const query = `
      INSERT INTO daycare_referrals (
        daycare_id, referral_type, user_id, contact_name, 
        contact_email, contact_phone, tour_request_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      daycare_id,
      referral_type,
      user_id || null,
      contact_name || null,
      contact_email || null,
      contact_phone || null,
      tour_request_id || null,
      notes || null
    ]);

    // Also update the analytics table
    await updateDaycareAnalytics(daycare_id, referral_type);

    return { id: result.insertId, ...referralData };
  } catch (error) {
    logger.error('Error tracking referral:', error);
    throw error;
  }
}

// Mark a referral as converted
async function markReferralConverted(referralId) {
  try {
    const query = `
      UPDATE daycare_referrals 
      SET converted = 1, conversion_date = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const [result] = await pool.execute(query, [referralId]);
    
    if (result.affectedRows > 0) {
      // Update analytics with the conversion
      const [referral] = await pool.execute(
        'SELECT daycare_id FROM daycare_referrals WHERE id = ?',
        [referralId]
      );
      
      if (referral.length > 0) {
        await incrementDaycareConversions(referral[0].daycare_id);
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error(`Error marking referral ${referralId} as converted:`, error);
    throw error;
  }
}

// Update daycare analytics for a new referral
async function updateDaycareAnalytics(daycareId, referralType) {
  try {
    const today = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    
    // Check if we already have an analytics record for this daycare and date
    const [existingRecords] = await pool.execute(
      'SELECT id FROM daycare_analytics WHERE daycare_id = ? AND date = ?',
      [daycareId, today]
    );
    
    let analyticsId;
    
    if (existingRecords.length > 0) {
      // Update existing record
      analyticsId = existingRecords[0].id;
      
      // Determine which field to increment based on referral type
      let updateField;
      
      switch (referralType) {
        case 'profile_click':
          updateField = 'profile_views = profile_views + 1';
          break;
        case 'search_result':
          updateField = 'search_appearances = search_appearances + 1';
          break;
        case 'recommendation':
          updateField = 'recommendation_appearances = recommendation_appearances + 1';
          break;
        case 'tour':
          updateField = 'tour_requests = tour_requests + 1';
          break;
        default:
          updateField = '';
      }
      
      // Always increment the total referral count
      updateField += updateField ? ', ' : '';
      updateField += 'referral_count = referral_count + 1';
      
      if (updateField) {
        await pool.execute(
          `UPDATE daycare_analytics SET ${updateField} WHERE id = ?`,
          [analyticsId]
        );
      }
    } else {
      // Create a new record
      const initialCounts = {
        profile_views: referralType === 'profile_click' ? 1 : 0,
        search_appearances: referralType === 'search_result' ? 1 : 0,
        recommendation_appearances: referralType === 'recommendation' ? 1 : 0,
        tour_requests: referralType === 'tour' ? 1 : 0,
        referral_count: 1
      };
      
      const [result] = await pool.execute(
        `INSERT INTO daycare_analytics (
          daycare_id, date, profile_views, search_appearances, 
          recommendation_appearances, tour_requests, referral_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          daycareId, 
          today, 
          initialCounts.profile_views, 
          initialCounts.search_appearances, 
          initialCounts.recommendation_appearances, 
          initialCounts.tour_requests, 
          initialCounts.referral_count
        ]
      );
      
      analyticsId = result.insertId;
    }
    
    return analyticsId;
  } catch (error) {
    logger.error(`Error updating analytics for daycare ${daycareId}:`, error);
    throw error;
  }
}

// Increment conversion count in analytics
async function incrementDaycareConversions(daycareId) {
  try {
    const today = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    
    // Check if we already have an analytics record for this daycare and date
    const [existingRecords] = await pool.execute(
      'SELECT id FROM daycare_analytics WHERE daycare_id = ? AND date = ?',
      [daycareId, today]
    );
    
    if (existingRecords.length > 0) {
      // Update existing record
      await pool.execute(
        'UPDATE daycare_analytics SET conversion_count = conversion_count + 1 WHERE id = ?',
        [existingRecords[0].id]
      );
    } else {
      // Create a new record with conversion
      await pool.execute(
        `INSERT INTO daycare_analytics (
          daycare_id, date, conversion_count
        ) VALUES (?, ?, 1)`,
        [daycareId, today]
      );
    }
    
    return true;
  } catch (error) {
    logger.error(`Error incrementing conversions for daycare ${daycareId}:`, error);
    throw error;
  }
}

// Get all referrals for a daycare
async function getReferralsByDaycareId(daycareId) {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM daycare_referrals 
       WHERE daycare_id = ? 
       ORDER BY referral_date DESC`,
      [daycareId]
    );
    
    return rows;
  } catch (error) {
    logger.error(`Error getting referrals for daycare ${daycareId}:`, error);
    throw error;
  }
}

// Get analytics for a daycare
async function getDaycareAnalytics(daycareId, startDate, endDate) {
  try {
    let query;
    let params;
    
    if (startDate && endDate) {
      query = `
        SELECT * FROM daycare_analytics 
        WHERE daycare_id = ? AND date BETWEEN ? AND ? 
        ORDER BY date DESC
      `;
      params = [daycareId, startDate, endDate];
    } else {
      query = `
        SELECT * FROM daycare_analytics 
        WHERE daycare_id = ? 
        ORDER BY date DESC
      `;
      params = [daycareId];
    }
    
    const [rows] = await pool.execute(query, params);
    
    return rows;
  } catch (error) {
    logger.error(`Error getting analytics for daycare ${daycareId}:`, error);
    throw error;
  }
}

// Get analytics summary
async function getDaycareAnalyticsSummary(daycareId, days = 30) {
  try {
    // Calculate start date (X days ago)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateString = startDate.toISOString().split('T')[0];
    
    // Get analytics records
    const [records] = await pool.execute(
      `SELECT * FROM daycare_analytics 
       WHERE daycare_id = ? AND date >= ? 
       ORDER BY date ASC`,
      [daycareId, startDateString]
    );
    
    // Calculate totals
    const summary = {
      total_profile_views: 0,
      total_search_appearances: 0,
      total_recommendation_appearances: 0,
      total_tour_requests: 0,
      total_referrals: 0,
      total_conversions: 0,
      conversion_rate: 0,
      daily_data: []
    };
    
    records.forEach(record => {
      summary.total_profile_views += record.profile_views;
      summary.total_search_appearances += record.search_appearances;
      summary.total_recommendation_appearances += record.recommendation_appearances;
      summary.total_tour_requests += record.tour_requests;
      summary.total_referrals += record.referral_count;
      summary.total_conversions += record.conversion_count;
      
      summary.daily_data.push({
        date: record.date,
        profile_views: record.profile_views,
        search_appearances: record.search_appearances,
        recommendation_appearances: record.recommendation_appearances,
        tour_requests: record.tour_requests,
        referrals: record.referral_count,
        conversions: record.conversion_count
      });
    });
    
    // Calculate conversion rate
    if (summary.total_referrals > 0) {
      summary.conversion_rate = (summary.total_conversions / summary.total_referrals) * 100;
    }
    
    return summary;
  } catch (error) {
    logger.error(`Error getting analytics summary for daycare ${daycareId}:`, error);
    throw error;
  }
}

module.exports = {
  trackReferral,
  markReferralConverted,
  getReferralsByDaycareId,
  getDaycareAnalytics,
  getDaycareAnalyticsSummary
};
