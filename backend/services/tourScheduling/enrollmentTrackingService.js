const { pool } = require('../../config/db');
const emailService = require('./emailService');
const crypto = require('crypto');

class EnrollmentTrackingService {
  
  /**
   * Initialize enrollment tracking when tour is scheduled
   */
  async initializeEnrollmentTracking(tourRequestId) {
    const connection = await pool.getConnection();
    
    try {
      // Get all daycares for this tour request
      const [daycares] = await connection.query(
        `SELECT * FROM tour_request_daycares WHERE tour_request_id = ?`,
        [tourRequestId]
      );
      
      // Create enrollment tracking records
      for (const daycare of daycares) {
        await connection.query(
          `INSERT INTO tour_enrollments 
          (tour_request_id, tour_request_daycare_id, operation_id, enrollment_status)
          VALUES (?, ?, ?, 'tour_scheduled')`,
          [tourRequestId, daycare.id, daycare.operation_id]
        );
      }
      
      // Schedule follow-up emails
      await this.scheduleAutomatedFollowups(tourRequestId);
      
    } finally {
      connection.release();
    }
  }
  
  /**
   * Update tour status when tour is completed
   */
  async updateTourCompleted(enrollmentId, tourDate, feedback) {
    await pool.query(
      `UPDATE tour_enrollments 
       SET enrollment_status = 'tour_completed',
           tour_completed_date = NOW(),
           tour_date = ?,
           tour_feedback = ?
       WHERE id = ?`,
      [tourDate, feedback, enrollmentId]
    );
    
    // Schedule enrollment check follow-up (7 days after tour)
    await this.scheduleEnrollmentCheck(enrollmentId, 7);
  }
  
  /**
   * Confirm enrollment with commission details
   */
  async confirmEnrollment(enrollmentId, enrollmentData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const {
        enrollmentDate,
        enrollmentStartDate,
        numberEnrolled,
        monthlyTuition,
        verifiedBy,
        verificationMethod,
        verificationNotes,
        enrollmentContractUrl
      } = enrollmentData;
      
      // Calculate commission (100% of 1 month tuition by default)
      const [settings] = await connection.query(
        `SELECT commission_rate, custom_commission_amount 
         FROM daycare_partner_settings 
         WHERE operation_id = (
           SELECT operation_id FROM tour_enrollments WHERE id = ?
         )`,
        [enrollmentId]
      );
      
      let commissionAmount;
      if (settings.length > 0 && settings[0].custom_commission_amount) {
        commissionAmount = settings[0].custom_commission_amount;
      } else {
        const commissionRate = settings.length > 0 ? settings[0].commission_rate : 100.00;
        commissionAmount = (monthlyTuition * commissionRate / 100) * numberEnrolled;
      }
      
      // Update enrollment record
      await connection.query(
        `UPDATE tour_enrollments 
         SET enrollment_status = 'enrolled',
             enrollment_date = ?,
             enrollment_start_date = ?,
             number_enrolled = ?,
             monthly_tuition_amount = ?,
             commission_amount = ?,
             commission_status = 'pending',
             verified_by = ?,
             verification_date = NOW(),
             verification_method = ?,
             verification_notes = ?,
             enrollment_contract_url = ?
         WHERE id = ?`,
        [
          enrollmentDate,
          enrollmentStartDate,
          numberEnrolled,
          monthlyTuition,
          commissionAmount,
          verifiedBy,
          verificationMethod,
          verificationNotes,
          enrollmentContractUrl,
          enrollmentId
        ]
      );
      
      // Update partner stats
      await connection.query(
        `UPDATE daycare_partner_settings 
         SET total_referrals = total_referrals + 1,
             successful_enrollments = successful_enrollments + 1
         WHERE operation_id = (
           SELECT operation_id FROM tour_enrollments WHERE id = ?
         )`,
        [enrollmentId]
      );
      
      await connection.commit();
      
      // Send notification emails
      await this.sendEnrollmentConfirmationEmails(enrollmentId);
      
      // Generate invoice
      await this.generateCommissionInvoice(enrollmentId);
      
      return {
        success: true,
        enrollmentId,
        commissionAmount
      };
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Generate verification token for enrollment confirmation
   */
  async generateVerificationToken(enrollmentId, tokenType, recipientEmail) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
    
    await pool.query(
      `INSERT INTO enrollment_verification_tokens 
      (tour_enrollment_id, token, token_type, recipient_email, expires_at)
      VALUES (?, ?, ?, ?, ?)`,
      [enrollmentId, token, tokenType, recipientEmail, expiresAt]
    );
    
    return token;
  }
  
  /**
   * Verify enrollment using token
   */
  async verifyEnrollmentWithToken(token, enrollmentData) {
    const [tokens] = await pool.query(
      `SELECT * FROM enrollment_verification_tokens 
       WHERE token = ? AND is_valid = TRUE AND expires_at > NOW()`,
      [token]
    );
    
    if (tokens.length === 0) {
      throw new Error('Invalid or expired verification token');
    }
    
    const tokenData = tokens[0];
    
    // Mark token as used
    await pool.query(
      `UPDATE enrollment_verification_tokens 
       SET used_at = NOW(), is_valid = FALSE 
       WHERE id = ?`,
      [tokenData.id]
    );
    
    // Confirm enrollment
    return await this.confirmEnrollment(tokenData.tour_enrollment_id, {
      ...enrollmentData,
      verificationMethod: tokenData.token_type === 'daycare_verify' ? 'daycare_confirmed' : 'parent_confirmed'
    });
  }
  
  /**
   * Generate commission invoice
   */
  async generateCommissionInvoice(enrollmentId) {
    const [enrollments] = await pool.query(
      `SELECT te.*, trd.operation_name, tr.parent_name, tr.parent_email
       FROM tour_enrollments te
       JOIN tour_request_daycares trd ON te.tour_request_daycare_id = trd.id
       JOIN tour_requests tr ON te.tour_request_id = tr.id
       WHERE te.id = ?`,
      [enrollmentId]
    );
    
    if (enrollments.length === 0) {
      throw new Error('Enrollment not found');
    }
    
    const enrollment = enrollments[0];
    
    // Get daycare billing info
    const [settings] = await pool.query(
      `SELECT * FROM daycare_partner_settings WHERE operation_id = ?`,
      [enrollment.operation_id]
    );
    
    const billingInfo = settings.length > 0 ? settings[0] : {};
    const paymentTerms = billingInfo.payment_terms || 30;
    
    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${enrollmentId}`;
    const invoiceDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + paymentTerms);
    
    // Calculate tax if applicable (you can customize this)
    const subtotal = enrollment.commission_amount;
    const taxRate = 0; // No tax on service fees typically
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;
    
    // Create invoice
    const [result] = await pool.query(
      `INSERT INTO commission_invoices 
      (tour_enrollment_id, operation_id, invoice_number, invoice_date, due_date,
       subtotal, tax_amount, total_amount, payment_status, billing_email, billing_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        enrollmentId,
        enrollment.operation_id,
        invoiceNumber,
        invoiceDate,
        dueDate,
        subtotal,
        taxAmount,
        totalAmount,
        billingInfo.billing_email,
        billingInfo.billing_address
      ]
    );
    
    const invoiceId = result.insertId;
    
    // Send invoice email
    await emailService.sendCommissionInvoiceEmail(invoiceId, enrollment, billingInfo);
    
    return {
      invoiceId,
      invoiceNumber,
      totalAmount
    };
  }
  
  /**
   * Schedule automated follow-ups
   */
  async scheduleAutomatedFollowups(tourRequestId) {
    // Get tour request details
    const [requests] = await pool.query(
      `SELECT * FROM tour_requests WHERE id = ?`,
      [tourRequestId]
    );
    
    if (requests.length === 0) return;
    
    const request = requests[0];
    
    // Get all daycares
    const [daycares] = await pool.query(
      `SELECT * FROM tour_request_daycares WHERE tour_request_id = ?`,
      [tourRequestId]
    );
    
    for (const daycare of daycares) {
      // Schedule post-tour follow-up (3 days after tour scheduled)
      const postTourDate = new Date();
      postTourDate.setDate(postTourDate.getDate() + 3);
      
      await pool.query(
        `INSERT INTO enrollment_followups 
        (tour_request_id, tour_request_daycare_id, followup_type, 
         contact_method, recipient_type, status, scheduled_for, is_automated)
        VALUES (?, ?, 'post_tour_survey', 'email', 'parent', 'scheduled', ?, TRUE)`,
        [tourRequestId, daycare.id, postTourDate]
      );
      
      // Schedule enrollment check (7 days after)
      const enrollmentCheckDate = new Date();
      enrollmentCheckDate.setDate(enrollmentCheckDate.getDate() + 7);
      
      await pool.query(
        `INSERT INTO enrollment_followups 
        (tour_request_id, tour_request_daycare_id, followup_type, 
         contact_method, recipient_type, status, scheduled_for, is_automated)
        VALUES (?, ?, 'enrollment_check', 'email', 'both', 'scheduled', ?, TRUE)`,
        [tourRequestId, daycare.id, enrollmentCheckDate]
      );
    }
  }
  
  /**
   * Process scheduled follow-ups
   */
  async processScheduledFollowups() {
    const [followups] = await pool.query(
      `SELECT ef.*, tr.parent_email, tr.parent_name, trd.operation_name, trd.operation_id
       FROM enrollment_followups ef
       JOIN tour_requests tr ON ef.tour_request_id = tr.id
       JOIN tour_request_daycares trd ON ef.tour_request_daycare_id = trd.id
       WHERE ef.status = 'scheduled' 
       AND ef.scheduled_for <= NOW()
       LIMIT 50`
    );
    
    for (const followup of followups) {
      try {
        await this.sendFollowupEmail(followup);
        
        await pool.query(
          `UPDATE enrollment_followups 
           SET status = 'sent', sent_at = NOW() 
           WHERE id = ?`,
          [followup.id]
        );
      } catch (error) {
        console.error(`Error sending followup ${followup.id}:`, error);
        
        await pool.query(
          `UPDATE enrollment_followups 
           SET status = 'failed' 
           WHERE id = ?`,
          [followup.id]
        );
      }
    }
  }
  
  /**
   * Send follow-up email
   */
  async sendFollowupEmail(followup) {
    switch (followup.followup_type) {
      case 'post_tour_survey':
        await emailService.sendPostTourSurveyEmail(followup);
        break;
        
      case 'enrollment_check':
        await emailService.sendEnrollmentCheckEmail(followup);
        break;
        
      case 'commission_reminder':
        await emailService.sendCommissionReminderEmail(followup);
        break;
        
      case 'payment_reminder':
        await emailService.sendPaymentReminderEmail(followup);
        break;
    }
  }
  
  /**
   * Get enrollment statistics
   */
  async getEnrollmentStats(filters = {}) {
    const query = `
      SELECT 
        COUNT(*) as total_enrollments,
        SUM(CASE WHEN enrollment_status = 'enrolled' THEN 1 ELSE 0 END) as successful_enrollments,
        SUM(CASE WHEN enrollment_status = 'tour_completed' THEN 1 ELSE 0 END) as tours_completed,
        SUM(CASE WHEN commission_status = 'paid' THEN commission_amount ELSE 0 END) as total_commission_paid,
        SUM(CASE WHEN commission_status IN ('pending', 'approved') THEN commission_amount ELSE 0 END) as pending_commission,
        AVG(CASE WHEN enrollment_status = 'enrolled' THEN commission_amount ELSE NULL END) as avg_commission
      FROM tour_enrollments
      WHERE 1=1
      ${filters.startDate ? `AND created_at >= '${filters.startDate}'` : ''}
      ${filters.endDate ? `AND created_at <= '${filters.endDate}'` : ''}
      ${filters.operationId ? `AND operation_id = '${filters.operationId}'` : ''}
    `;
    
    const [stats] = await pool.query(query);
    return stats[0];
  }
  
  /**
   * Send enrollment confirmation emails
   */
  async sendEnrollmentConfirmationEmails(enrollmentId) {
    const [enrollments] = await pool.query(
      `SELECT te.*, tr.parent_email, tr.parent_name, trd.operation_name
       FROM tour_enrollments te
       JOIN tour_requests tr ON te.tour_request_id = tr.id
       JOIN tour_request_daycares trd ON te.tour_request_daycare_id = trd.id
       WHERE te.id = ?`,
      [enrollmentId]
    );
    
    if (enrollments.length === 0) return;
    
    const enrollment = enrollments[0];
    
    // Send to parent
    await emailService.sendEnrollmentCongratulationsEmail(enrollment);
    
    // Send to daycare
    await emailService.sendDaycareEnrollmentConfirmationEmail(enrollment);
    
    // Send to admin
    await emailService.sendAdminEnrollmentNotificationEmail(enrollment);
  }
}

module.exports = new EnrollmentTrackingService();
