const pool = require('../../config/database');
const emailService = require('./emailService');
const pdfService = require('./pdfService');

class TourRequestService {
  /**
   * Create a new tour request
   */
  async createTourRequest(requestData, selectedDaycares) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Insert main tour request
      const [result] = await connection.query(
        `INSERT INTO tour_requests 
        (parent_name, parent_email, parent_phone, parent_address, 
         number_of_children, children_ages, preferred_start_date, 
         available_days, preferred_time_slots, additional_notes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          requestData.parentName,
          requestData.parentEmail,
          requestData.parentPhone,
          requestData.parentAddress,
          requestData.numberOfChildren,
          JSON.stringify(requestData.childrenAges || []),
          requestData.preferredStartDate,
          JSON.stringify(requestData.availableDays || []),
          JSON.stringify(requestData.preferredTimeSlots || []),
          requestData.additionalNotes
        ]
      );
      
      const tourRequestId = result.insertId;
      
      // Insert selected daycares
      const daycareInserts = selectedDaycares.map(daycare => [
        tourRequestId,
        daycare.operation_id,
        daycare.operation_name,
        'pending'
      ]);
      
      await connection.query(
        `INSERT INTO tour_request_daycares 
        (tour_request_id, operation_id, operation_name, status)
        VALUES ?`,
        [daycareInserts]
      );
      
      await connection.commit();
      
      // Send emails asynchronously
      this.sendTourRequestEmails(tourRequestId, requestData, selectedDaycares)
        .catch(err => console.error('Error sending emails:', err));
      
      return {
        success: true,
        tourRequestId,
        message: 'Tour request submitted successfully'
      };
      
    } catch (error) {
      await connection.rollback();
      console.error('Error creating tour request:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Send tour request emails to all selected daycares
   */
  async sendTourRequestEmails(tourRequestId, requestData, selectedDaycares) {
    const emailPromises = selectedDaycares.map(async (daycare) => {
      try {
        // Get daycare email if available
        const daycareEmail = await this.getDaycareEmail(daycare.operation_id);
        
        if (daycareEmail) {
          await emailService.sendTourRequestEmail({
            tourRequestId,
            daycare,
            daycareEmail,
            parentData: requestData
          });
          
          // Log email
          await pool.query(
            `INSERT INTO tour_request_emails 
            (tour_request_id, operation_id, recipient_email, email_type, email_status)
            VALUES (?, ?, ?, 'tour_request', 'sent')`,
            [tourRequestId, daycare.operation_id, daycareEmail]
          );
        }
      } catch (error) {
        console.error(`Error sending email to ${daycare.operation_name}:`, error);
        
        // Log failed email
        await pool.query(
          `INSERT INTO tour_request_emails 
          (tour_request_id, operation_id, recipient_email, email_type, email_status, error_message)
          VALUES (?, ?, ?, 'tour_request', 'failed', ?)`,
          [tourRequestId, daycare.operation_id, daycare.email || 'unknown', error.message]
        );
      }
    });
    
    await Promise.allSettled(emailPromises);
  }
  
  /**
   * Get daycare email from database
   */
  async getDaycareEmail(operationId) {
    const [rows] = await pool.query(
      'SELECT email_address FROM child_care_operations WHERE operation_id = ?',
      [operationId]
    );
    
    return rows[0]?.email_address;
  }
  
  /**
   * Get tour request details
   */
  async getTourRequest(tourRequestId) {
    const [requests] = await pool.query(
      `SELECT * FROM tour_requests WHERE id = ?`,
      [tourRequestId]
    );
    
    if (requests.length === 0) {
      return null;
    }
    
    const request = requests[0];
    
    // Get associated daycares
    const [daycares] = await pool.query(
      `SELECT * FROM tour_request_daycares WHERE tour_request_id = ?`,
      [tourRequestId]
    );
    
    return {
      ...request,
      children_ages: JSON.parse(request.children_ages || '[]'),
      available_days: JSON.parse(request.available_days || '[]'),
      preferred_time_slots: JSON.parse(request.preferred_time_slots || '[]'),
      daycares
    };
  }
  
  /**
   * Get all tour requests (admin view)
   */
  async getAllTourRequests(filters = {}) {
    let query = `
      SELECT tr.*, 
             COUNT(trd.id) as daycare_count
      FROM tour_requests tr
      LEFT JOIN tour_request_daycares trd ON tr.id = trd.tour_request_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.status) {
      query += ` AND tr.status = ?`;
      params.push(filters.status);
    }
    
    if (filters.fromDate) {
      query += ` AND tr.created_at >= ?`;
      params.push(filters.fromDate);
    }
    
    query += ` GROUP BY tr.id ORDER BY tr.created_at DESC LIMIT ? OFFSET ?`;
    params.push(filters.limit || 50, filters.offset || 0);
    
    const [rows] = await pool.query(query, params);
    
    return rows;
  }
}

module.exports = new TourRequestService();
