const express = require('express');
const router = express.Router();
const enrollmentService = require('../../services/tourScheduling/enrollmentTrackingService');
const { pool } = require("../../config/db");

/**
 * POST /api/enrollments/confirm
 * Daycare confirms enrollment (requires verification token or admin auth)
 */
router.post('/confirm', async (req, res) => {
  try {
    const {
      token,
      enrollmentId,
      enrollmentDate,
      enrollmentStartDate,
      numberEnrolled,
      monthlyTuition,
      verifiedBy,
      verificationNotes,
      enrollmentContractUrl
    } = req.body;
    
    let result;
    
    if (token) {
      // Verify using token
      result = await enrollmentService.verifyEnrollmentWithToken(token, {
        enrollmentDate,
        enrollmentStartDate,
        numberEnrolled,
        monthlyTuition,
        verifiedBy,
        verificationNotes,
        enrollmentContractUrl
      });
    } else if (req.user && req.user.isAdmin) {
      // Admin confirmation
      result = await enrollmentService.confirmEnrollment(enrollmentId, {
        enrollmentDate,
        enrollmentStartDate,
        numberEnrolled,
        monthlyTuition,
        verifiedBy: req.user.name,
        verificationMethod: 'admin_verified',
        verificationNotes,
        enrollmentContractUrl
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('Error confirming enrollment:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/enrollments/:id/tour-completed
 * Update when tour is completed
 */
router.post('/:id/tour-completed', async (req, res) => {
  try {
    const { tourDate, feedback } = req.body;
    
    await enrollmentService.updateTourCompleted(
      req.params.id,
      tourDate,
      feedback
    );
    
    res.json({
      success: true,
      message: 'Tour status updated'
    });
    
  } catch (error) {
    console.error('Error updating tour status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/enrollments/stats
 * Get enrollment statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      operationId: req.query.operationId
    };
    
    const stats = await enrollmentService.getEnrollmentStats(filters);
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/enrollments/pending-commission
 * Get enrollments with pending commission
 */
router.get('/pending-commission', async (req, res) => {
  try {
    const [enrollments] = await pool.query(
      `SELECT te.*, trd.operation_name, tr.parent_name, tr.parent_email
       FROM tour_enrollments te
       JOIN tour_request_daycares trd ON te.tour_request_daycare_id = trd.id
       JOIN tour_requests tr ON te.tour_request_id = tr.id
       WHERE te.commission_status IN ('pending', 'approved')
       AND te.enrollment_status = 'enrolled'
       ORDER BY te.enrollment_date DESC`
    );
    
    res.json({
      success: true,
      enrollments
    });
    
  } catch (error) {
    console.error('Error fetching pending commissions:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/enrollments/:id/approve-commission
 * Approve commission for payment
 */
router.post('/:id/approve-commission', async (req, res) => {
  try {
    await pool.query(
      `UPDATE tour_enrollments 
       SET commission_status = 'approved',
           commission_approved_date = NOW()
       WHERE id = ?`,
      [req.params.id]
    );
    
    res.json({
      success: true,
      message: 'Commission approved'
    });
    
  } catch (error) {
    console.error('Error approving commission:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/enrollments/:id/mark-paid
 * Mark commission as paid
 */
router.post('/:id/mark-paid', async (req, res) => {
  try {
    const { paymentMethod, paymentReference } = req.body;
    
    await pool.query(
      `UPDATE tour_enrollments 
       SET commission_status = 'paid',
           commission_paid_date = NOW()
       WHERE id = ?`,
      [req.params.id]
    );
    
    // Update invoice
    await pool.query(
      `UPDATE commission_invoices 
       SET payment_status = 'paid',
           payment_date = NOW(),
           payment_method = ?,
           payment_reference = ?
       WHERE tour_enrollment_id = ?`,
      [paymentMethod, paymentReference, req.params.id]
    );
    
    res.json({
      success: true,
      message: 'Payment recorded'
    });
    
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

/**
 * GET /api/enrollments/all
 * Get all enrollments with details
 */
router.get('/all', async (req, res) => {
  try {
    const [enrollments] = await pool.query(
      `SELECT 
        te.*,
        trd.operation_name,
        tr.parent_name,
        tr.parent_email,
        tr.parent_phone
       FROM tour_enrollments te
       JOIN tour_request_daycares trd ON te.tour_request_daycare_id = trd.id
       JOIN tour_requests tr ON te.tour_request_id = tr.id
       ORDER BY te.created_at DESC`
    );
    
    res.json({
      success: true,
      enrollments
    });
    
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

const invoicePdfService = require('../../services/tourScheduling/invoicePdfService');

/**
 * GET /api/enrollments/invoice/:invoiceId/pdf
 * Download invoice PDF
 */
router.get('/invoice/:invoiceId/pdf', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    // Get invoice details for filename
    const [invoices] = await pool.query(
      'SELECT invoice_number FROM commission_invoices WHERE id = ?',
      [invoiceId]
    );
    
    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    const invoice = invoices[0];
    const filename = `invoice-${invoice.invoice_number}.pdf`;
    
    // Generate PDF
    const pdfDoc = await invoicePdfService.generateInvoicePDF(invoiceId);
    
    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Pipe PDF to response
    pdfDoc.pipe(res);
    
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating invoice PDF',
      error: error.message
    });
  }
});

/**
 * GET /api/enrollments/invoice/:invoiceId/view
 * View invoice PDF in browser
 */
router.get('/invoice/:invoiceId/view', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    // Generate PDF
    const pdfDoc = await invoicePdfService.generateInvoicePDF(invoiceId);
    
    // Set headers for inline viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    
    // Pipe PDF to response
    pdfDoc.pipe(res);
    
  } catch (error) {
    console.error('Error viewing invoice PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error viewing invoice PDF',
      error: error.message
    });
  }
});

/**
 * GET /api/enrollments/invoice/by-number/:invoiceNumber/pdf
 * Download invoice by invoice number (for public/email links)
 */
router.get('/invoice/by-number/:invoiceNumber/pdf', async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    
    // Get invoice ID
    const [invoices] = await pool.query(
      'SELECT id FROM commission_invoices WHERE invoice_number = ?',
      [invoiceNumber]
    );
    
    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    const invoiceId = invoices[0].id;
    const filename = `invoice-${invoiceNumber}.pdf`;
    
    // Generate PDF
    const pdfDoc = await invoicePdfService.generateInvoicePDF(invoiceId);
    
    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Pipe PDF to response
    pdfDoc.pipe(res);
    
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating invoice PDF',
      error: error.message
    });
  }
});

/**
 * POST /api/enrollments/invoice/:invoiceId/send-email
 * Resend invoice email
 */
router.post('/invoice/:invoiceId/send-email', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    // Get invoice and enrollment details
    const [data] = await pool.query(
      `SELECT ci.*, te.*, trd.operation_name, dps.billing_email
       FROM commission_invoices ci
       JOIN tour_enrollments te ON ci.tour_enrollment_id = te.id
       JOIN tour_request_daycares trd ON te.tour_request_daycare_id = trd.id
       LEFT JOIN daycare_partner_settings dps ON dps.operation_id = ci.operation_id
       WHERE ci.id = ?`,
      [invoiceId]
    );
    
    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    const invoice = data[0];
    const billingInfo = {
      billing_email: invoice.billing_email || 'billing@example.com',
      payment_terms: 30
    };
    
    // Send email
    const emailService = require('../../services/tourScheduling/emailService');
    await emailService.sendCommissionInvoiceEmail(invoiceId, invoice, billingInfo);
    
    res.json({
      success: true,
      message: 'Invoice email sent'
    });
    
  } catch (error) {
    console.error('Error sending invoice email:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending invoice email',
      error: error.message
    });
  }
});

/**
 * GET /api/enrollments/:enrollmentId/invoice-id
 * Get invoice ID for an enrollment
 */
router.get('/:enrollmentId/invoice-id', async (req, res) => {
  try {
    const [invoices] = await pool.query(
      'SELECT id, invoice_number FROM commission_invoices WHERE tour_enrollment_id = ?',
      [req.params.enrollmentId]
    );
    
    if (invoices.length === 0) {
      return res.json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.json({
      success: true,
      invoiceId: invoices[0].id,
      invoiceNumber: invoices[0].invoice_number
    });
    
  } catch (error) {
    console.error('Error fetching invoice ID:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
