const nodemailer = require('nodemailer');
const pool = require('../../config/database');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'info@daycarealert.com',
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  /**
   * CRITICAL: Send tour request email to daycare
   */
  async sendTourRequestEmail({ tourRequestId, daycare, daycareEmail, parentData }) {
    const verificationToken = await this.generateVerificationToken(tourRequestId, daycare.operation_id);
    
    const subject = `New Tour Request - ${parentData.parentName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .info-row { margin: 12px 0; }
          .label { font-weight: bold; color: #555; }
          .button { display: inline-block; padding: 14px 28px; background: #4CAF50; color: white; 
                    text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; color: #888; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏫 New Tour Request</h1>
        </div>
        
        <div class="content">
          <p>Hello ${daycare.operation_name},</p>
          <p>A parent would like to schedule a tour at your facility through DaycareAlert.com.</p>
          
          <h3>Parent Information:</h3>
          <div class="info-row"><span class="label">Name:</span> ${parentData.parentName}</div>
          <div class="info-row"><span class="label">Email:</span> ${parentData.parentEmail}</div>
          <div class="info-row"><span class="label">Phone:</span> ${parentData.parentPhone}</div>
          
          <h3>Child Information:</h3>
          <div class="info-row"><span class="label">Number of Children:</span> ${parentData.numberOfChildren}</div>
          ${parentData.childrenAges ? `<div class="info-row"><span class="label">Ages:</span> ${parentData.childrenAges.join(', ')} years</div>` : ''}
          ${parentData.preferredStartDate ? `<div class="info-row"><span class="label">Start Date:</span> ${parentData.preferredStartDate}</div>` : ''}
          
          <h3>Availability:</h3>
          ${parentData.availableDays ? `<div class="info-row"><span class="label">Available Days:</span> ${parentData.availableDays.join(', ')}</div>` : ''}
          ${parentData.preferredTimeSlots ? `<div class="info-row"><span class="label">Preferred Times:</span> ${parentData.preferredTimeSlots.join(', ')}</div>` : ''}
          
          ${parentData.additionalNotes ? `<h3>Notes:</h3><p>${parentData.additionalNotes}</p>` : ''}
          
          <center>
            <a href="https://daycarealert.com/enrollment-confirm/${tourRequestId}?token=${verificationToken}&operation=${daycare.operation_id}" class="button">
              Schedule Tour & Confirm Enrollment
            </a>
          </center>
          
          <p style="font-size: 13px; color: #666; margin-top: 20px;">
            <strong>💰 Referral Commission:</strong> When this family enrolls, you'll owe DaycareAlert 
            one month's tuition as a referral fee. The link above lets you schedule the tour and 
            later confirm enrollment to generate your invoice.
          </p>
          
          <p style="font-size: 13px; color: #666;">
            Please respond within 24-48 hours. You can reply directly to this email to contact the parent.
          </p>
        </div>
        
        <div class="footer">
          <p>This referral was sent via DaycareAlert.com</p>
          <p>Request ID: #${tourRequestId} | Questions? <a href="mailto:support@daycarealert.com">Contact Support</a></p>
        </div>
      </body>
      </html>
    `;
    
    await this.transporter.sendMail({
      from: '"DaycareAlert" <info@daycarealert.com>',
      to: daycareEmail,
      replyTo: parentData.parentEmail,
      subject,
      html
    });
  }
  
  /**
   * CRITICAL: Send confirmation to parent
   */
  async sendParentConfirmationEmail(tourRequestId, parentData, selectedDaycares) {
    const subject = `Tour Requests Sent - ${selectedDaycares.length} Daycares`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .daycare-item { background: #f0f9f0; padding: 12px; margin: 8px 0; border-radius: 6px; }
          .button { display: inline-block; padding: 14px 28px; background: #4CAF50; color: white; 
                    text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✅ Tour Requests Sent!</h1>
        </div>
        
        <div class="content">
          <p>Hi ${parentData.parentName},</p>
          
          <p>Your tour requests have been sent to ${selectedDaycares.length} daycare(s):</p>
          
          ${selectedDaycares.map(d => `
            <div class="daycare-item">
              <strong>${d.operation_name}</strong><br>
              ${d.city}
            </div>
          `).join('')}
          
          <h3>What Happens Next?</h3>
          <ol>
            <li>Each daycare will review your request</li>
            <li>They'll contact you within 24-48 hours to schedule</li>
            <li>You'll receive tour details via email or phone</li>
          </ol>
          
          <center>
            <a href="https://daycarealert.com/tour-request/${tourRequestId}/profiles" class="button">
              Download Daycare Profiles (PDF)
            </a>
          </center>
          
          <p style="font-size: 13px; color: #666; margin-top: 30px;">
            Request ID: #${tourRequestId}<br>
            Questions? Reply to this email or contact us at <a href="mailto:info@daycarealert.com">info@daycarealert.com</a>
          </p>
        </div>
      </body>
      </html>
    `;
    
    await this.transporter.sendMail({
      from: '"DaycareAlert" <info@daycarealert.com>',
      to: parentData.parentEmail,
      subject,
      html
    });
  }
  
  /**
   * CRITICAL: Send commission invoice to daycare
   */
  async sendCommissionInvoiceEmail(invoiceId, enrollment, billingInfo) {
    const [invoices] = await pool.query(
      `SELECT * FROM commission_invoices WHERE id = ?`,
      [invoiceId]
    );
    
    if (invoices.length === 0) return;
    
    const invoice = invoices[0];
    
    const subject = `Invoice ${invoice.invoice_number} - Referral Commission`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; max-width: 700px; margin: 0 auto; }
          .invoice-header { background: #4CAF50; color: white; padding: 30px; }
          .invoice-details { padding: 30px; background: #f9f9f9; }
          .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .invoice-table th, .invoice-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          .invoice-table th { background: #f5f5f5; }
          .total-row { font-size: 18px; font-weight: bold; }
          .payment-button { display: inline-block; padding: 14px 28px; background: #4CAF50; color: white; 
                           text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <h1>INVOICE</h1>
          <p>Invoice #: ${invoice.invoice_number}</p>
          <p>Date: ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
        </div>
        
        <div class="invoice-details">
          <h3>Bill To:</h3>
          <p>
            ${enrollment.operation_name}<br>
            ${billingInfo.billing_address || ''}<br>
            ${billingInfo.billing_email}
          </p>
          
          <h3>From:</h3>
          <p>
            DaycareAlert.com<br>
            info@daycarealert.com
          </p>
          
          <table class="invoice-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Referral Commission</strong><br>
                  Enrollment for ${enrollment.parent_name}<br>
                  ${enrollment.number_enrolled} child(ren) enrolled<br>
                  Enrollment date: ${new Date(enrollment.enrollment_date).toLocaleDateString()}
                </td>
                <td>${enrollment.number_enrolled}</td>
                <td>$${enrollment.monthly_tuition_amount?.toFixed(2) || '0.00'}</td>
                <td>$${invoice.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="3" style="text-align: right;"><strong>Subtotal:</strong></td>
                <td>$${invoice.subtotal.toFixed(2)}</td>
              </tr>
              ${invoice.tax_amount > 0 ? `
              <tr>
                <td colspan="3" style="text-align: right;">Tax:</td>
                <td>$${invoice.tax_amount.toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr class="total-row">
                <td colspan="3" style="text-align: right;">TOTAL DUE:</td>
                <td>$${invoice.total_amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
          <p><strong>Payment Terms:</strong> Net ${billingInfo.payment_terms || 30} days</p>
          
          <h3>Payment Instructions:</h3>
          <p>Please send payment via:</p>
          <ul>
            <li><strong>Check:</strong> Mail to DaycareAlert, [Your Address]</li>
            <li><strong>ACH/Wire:</strong> Contact info@daycarealert.com for details</li>
            <li><strong>Online:</strong> Click button below</li>
          </ul>
          
          <center>
            <a href="https://daycarealert.com/pay-invoice/${invoice.invoice_number}" class="payment-button">
              Pay Invoice Online
            </a>
          </center>
          
          <p style="font-size: 12px; color: #666; margin-top: 30px;">
            Questions about this invoice? Contact us at <a href="mailto:info@daycarealert.com">info@daycarealert.com</a><br>
            Invoice ID: ${invoice.invoice_number} | Enrollment ID: #${enrollment.id}
          </p>
        </div>
      </body>
      </html>
    `;
    
    await this.transporter.sendMail({
      from: '"DaycareAlert Billing" <billing@daycarealert.com>',
      to: billingInfo.billing_email,
      subject,
      html
    });
  }
  
  /**
   * CRITICAL: Send enrollment confirmation to parent
   */
  async sendEnrollmentCongratulationsEmail(enrollment) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #4CAF50; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Congratulations!</h1>
        </div>
        
        <div class="content">
          <p>Hi ${enrollment.parent_name},</p>
          
          <p>Great news! <strong>${enrollment.operation_name}</strong> has confirmed your enrollment!</p>
          
          <h3>Enrollment Details:</h3>
          <ul>
            <li><strong>Start Date:</strong> ${new Date(enrollment.enrollment_start_date).toLocaleDateString()}</li>
            <li><strong>Children Enrolled:</strong> ${enrollment.number_enrolled}</li>
          </ul>
          
          <p>Your daycare will contact you with next steps for orientation and first day details.</p>
          
          <p>Thank you for using DaycareAlert.com to find quality childcare!</p>
          
          <p style="font-size: 12px; color: #666; margin-top: 30px;">
            Questions? Contact <a href="mailto:info@daycarealert.com">info@daycarealert.com</a>
          </p>
        </div>
      </body>
      </html>
    `;
    
    await this.transporter.sendMail({
      from: '"DaycareAlert" <info@daycarealert.com>',
      to: enrollment.parent_email,
      subject: `Enrollment Confirmed at ${enrollment.operation_name}`,
      html
    });
  }
  
  /**
   * CRITICAL: Send enrollment confirmation to daycare
   */
  async sendDaycareEnrollmentConfirmationEmail(enrollment) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; }
          .content { padding: 30px; }
        </style>
      </head>
      <body>
        <div class="content">
          <h2>Enrollment Confirmed</h2>
          
          <p>Thank you for confirming the enrollment for ${enrollment.parent_name}.</p>
          
          <p><strong>Commission Details:</strong></p>
          <ul>
            <li>Amount: $${enrollment.commission_amount?.toFixed(2)}</li>
            <li>Children: ${enrollment.number_enrolled}</li>
            <li>Monthly Tuition: $${enrollment.monthly_tuition_amount?.toFixed(2)}</li>
          </ul>
          
          <p>Your invoice will arrive within 1-2 business days.</p>
          
          <p style="font-size: 12px; color: #666;">
            Enrollment ID: #${enrollment.id}
          </p>
        </div>
      </body>
      </html>
    `;
    
    const [daycares] = await pool.query(
      `SELECT email_address FROM child_care_operations WHERE operation_id = ?`,
      [enrollment.operation_id]
    );
    
    if (daycares.length > 0 && daycares[0].email_address) {
      await this.transporter.sendMail({
        from: '"DaycareAlert" <info@daycarealert.com>',
        to: daycares[0].email_address,
        subject: 'Enrollment Confirmation Received',
        html
      });
    }
  }
  
  /**
   * CRITICAL: Notify admin of new enrollment
   */
  async sendAdminEnrollmentNotificationEmail(enrollment) {
    const html = `
      <h2>New Enrollment Confirmed</h2>
      <p><strong>Daycare:</strong> ${enrollment.operation_name}</p>
      <p><strong>Parent:</strong> ${enrollment.parent_name}</p>
      <p><strong>Commission:</strong> $${enrollment.commission_amount?.toFixed(2)}</p>
      <p><strong>Children:</strong> ${enrollment.number_enrolled}</p>
      <p><a href="https://daycarealert.com/admin/enrollments/${enrollment.id}">View Details</a></p>
    `;
    
    await this.transporter.sendMail({
      from: '"DaycareAlert System" <system@daycarealert.com>',
      to: 'admin@daycarealert.com', // Change to your admin email
      subject: `New Enrollment: ${enrollment.operation_name}`,
      html
    });
  }
  
  /**
   * Generate verification token for enrollment confirmation
   */
  async generateVerificationToken(tourRequestId, operationId) {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store token in database (simplified - you may want to use the tokens table)
    await pool.query(
      `INSERT INTO enrollment_verification_tokens 
       (tour_enrollment_id, token, token_type, recipient_email, expires_at)
       SELECT id, ?, 'daycare_verify', 
              (SELECT email_address FROM child_care_operations WHERE operation_id = ?),
              DATE_ADD(NOW(), INTERVAL 30 DAY)
       FROM tour_enrollments 
       WHERE tour_request_id = ? AND operation_id = ?
       LIMIT 1`,
      [token, operationId, tourRequestId, operationId]
    );
    
    return token;
  }
}

module.exports = new EmailService();
