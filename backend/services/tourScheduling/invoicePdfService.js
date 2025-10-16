const PDFDocument = require('pdfkit');
const { pool } = require('../../config/db');
const fs = require('fs');
const path = require('path');

class InvoicePdfService {
  
  /**
   * Generate invoice PDF
   */
  async generateInvoicePDF(invoiceId) {
    const [invoices] = await pool.query(
      `SELECT 
        ci.*,
        te.number_enrolled,
        te.monthly_tuition_amount,
        te.enrollment_date,
        te.enrollment_start_date,
        trd.operation_name,
        tr.parent_name,
        tr.parent_email
       FROM commission_invoices ci
       JOIN tour_enrollments te ON ci.tour_enrollment_id = te.id
       JOIN tour_request_daycares trd ON te.tour_request_daycare_id = trd.id
       JOIN tour_requests tr ON te.tour_request_id = tr.id
       WHERE ci.id = ?`,
      [invoiceId]
    );
    
    if (invoices.length === 0) {
      throw new Error('Invoice not found');
    }
    
    const invoice = invoices[0];
    
    // Get daycare details
    const [daycares] = await pool.query(
      `SELECT * FROM child_care_operations WHERE operation_id = ?`,
      [invoice.operation_id]
    );
    
    const daycare = daycares.length > 0 ? daycares[0] : {};
    
    // Create PDF
    const doc = new PDFDocument({ 
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    
    // Build the invoice
    this.buildInvoice(doc, invoice, daycare);
    
    doc.end();
    return doc;
  }
  
  /**
   * Build invoice document
   */
  buildInvoice(doc, invoice, daycare) {
    // Header with logo space
    this.generateHeader(doc, invoice);
    
    // Billing information
    this.generateBillingInfo(doc, invoice, daycare);
    
    // Invoice details table
    this.generateInvoiceTable(doc, invoice);
    
    // Payment terms
    this.generatePaymentTerms(doc, invoice);
    
    // Footer
    this.generateFooter(doc);
  }
  
  /**
   * Generate invoice header
   */
  generateHeader(doc, invoice) {
    doc
      .fillColor('#4CAF50')
      .fontSize(40)
      .text('INVOICE', 50, 50, { align: 'left' })
      .fillColor('#000000');
    
    // Company info (right side)
    doc
      .fontSize(10)
      .text('DaycareAlert.com', 400, 50, { align: 'right' })
      .text('Childcare Referral Services', 400, 65, { align: 'right' })
      .text('info@daycarealert.com', 400, 80, { align: 'right' })
      .text('https://daycarealert.com', 400, 95, { align: 'right' });
    
    // Invoice details box
    const boxTop = 130;
    doc
      .rect(50, boxTop, 250, 80)
      .fillAndStroke('#f5f5f5', '#cccccc');
    
    doc
      .fillColor('#000000')
      .fontSize(10)
      .text('Invoice Number:', 60, boxTop + 15)
      .font('Helvetica-Bold')
      .text(invoice.invoice_number, 160, boxTop + 15)
      .font('Helvetica')
      .text('Invoice Date:', 60, boxTop + 35)
      .text(this.formatDate(invoice.invoice_date), 160, boxTop + 35)
      .text('Due Date:', 60, boxTop + 55)
      .font('Helvetica-Bold')
      .fillColor('#d32f2f')
      .text(this.formatDate(invoice.due_date), 160, boxTop + 55)
      .fillColor('#000000')
      .font('Helvetica');
    
    // Status badge
    const statusColor = this.getStatusColor(invoice.payment_status);
    doc
      .rect(350, boxTop, 200, 30)
      .fillAndStroke(statusColor, statusColor);
    
    doc
      .fillColor('#ffffff')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(invoice.payment_status.toUpperCase(), 350, boxTop + 8, { 
        width: 200, 
        align: 'center' 
      })
      .fillColor('#000000')
      .font('Helvetica');
  }
  
  /**
   * Generate billing information
   */
  generateBillingInfo(doc, invoice, daycare) {
    const top = 230;
    
    // Bill To
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('BILL TO:', 50, top);
    
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(invoice.operation_name || daycare.operation_name, 50, top + 20)
      .text(daycare.location_address || '', 50, top + 35);
    
    if (daycare.city && daycare.state && daycare.zip_code) {
      doc.text(`${daycare.city}, ${daycare.state} ${daycare.zip_code}`, 50, top + 50);
    }
    
    if (invoice.billing_email) {
      doc.text(invoice.billing_email, 50, top + 65);
    }
    
    // Remit To
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('REMIT TO:', 350, top);
    
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('DaycareAlert.com', 350, top + 20)
      .text('[Your Business Address]', 350, top + 35)
      .text('[City, State ZIP]', 350, top + 50)
      .text('billing@daycarealert.com', 350, top + 65);
  }
  
  /**
   * Generate invoice table
   */
  generateInvoiceTable(doc, invoice) {
    const tableTop = 360;
    
    // Table header
    doc
      .rect(50, tableTop, 512, 25)
      .fillAndStroke('#4CAF50', '#4CAF50');
    
    doc
      .fillColor('#ffffff')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Description', 60, tableTop + 8)
      .text('Qty', 320, tableTop + 8, { width: 50, align: 'center' })
      .text('Rate', 380, tableTop + 8, { width: 80, align: 'right' })
      .text('Amount', 470, tableTop + 8, { width: 80, align: 'right' })
      .fillColor('#000000')
      .font('Helvetica');
    
    // Table rows
    let currentY = tableTop + 35;
    
    // Main line item
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Referral Commission - New Enrollment', 60, currentY);
    
    currentY += 15;
    
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text(`Parent: ${invoice.parent_name}`, 60, currentY);
    
    currentY += 12;
    
    doc
      .text(`${invoice.number_enrolled} child(ren) enrolled`, 60, currentY);
    
    currentY += 12;
    
    doc
      .text(`Enrollment Date: ${this.formatDate(invoice.enrollment_date)}`, 60, currentY);
    
    currentY += 12;
    
    doc
      .text(`Monthly Tuition: ${this.formatCurrency(invoice.monthly_tuition_amount)}`, 60, currentY);
    
    // Quantity, Rate, Amount
    const itemY = tableTop + 35;
    doc
      .fillColor('#000000')
      .fontSize(10)
      .text(invoice.number_enrolled.toString(), 320, itemY, { width: 50, align: 'center' })
      .text(this.formatCurrency(invoice.monthly_tuition_amount), 380, itemY, { width: 80, align: 'right' })
      .text(this.formatCurrency(invoice.subtotal), 470, itemY, { width: 80, align: 'right' });
    
    // Subtotals section
    currentY = tableTop + 120;
    
    // Line above totals
    doc
      .moveTo(350, currentY)
      .lineTo(562, currentY)
      .stroke('#cccccc');
    
    currentY += 15;
    
    // Subtotal
    doc
      .fontSize(10)
      .text('Subtotal:', 380, currentY, { width: 80, align: 'right' })
      .text(this.formatCurrency(invoice.subtotal), 470, currentY, { width: 80, align: 'right' });
    
    currentY += 20;
    
    // Tax (if applicable)
    if (invoice.tax_amount > 0) {
      doc
        .text('Tax:', 380, currentY, { width: 80, align: 'right' })
        .text(this.formatCurrency(invoice.tax_amount), 470, currentY, { width: 80, align: 'right' });
      
      currentY += 20;
    }
    
    // Total
    doc
      .rect(350, currentY - 5, 212, 30)
      .fillAndStroke('#f5f5f5', '#cccccc');
    
    doc
      .fillColor('#000000')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('TOTAL DUE:', 380, currentY + 5, { width: 80, align: 'right' })
      .fillColor('#d32f2f')
      .text(this.formatCurrency(invoice.total_amount), 470, currentY + 5, { width: 80, align: 'right' })
      .fillColor('#000000')
      .font('Helvetica');
  }
  
  /**
   * Generate payment terms
   */
  generatePaymentTerms(doc, invoice) {
    const termsTop = 540;
    
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('PAYMENT TERMS', 50, termsTop);
    
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`• Payment is due within ${this.getPaymentTerms(invoice)} days of invoice date`, 50, termsTop + 20)
      .text('• Make checks payable to: DaycareAlert.com', 50, termsTop + 35)
      .text('• For ACH/Wire transfers, contact billing@daycarealert.com', 50, termsTop + 50)
      .text('• Include invoice number on all payments', 50, termsTop + 65);
    
    // Payment methods box
    doc
      .rect(50, termsTop + 90, 512, 60)
      .stroke('#cccccc');
    
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Payment Methods:', 60, termsTop + 100);
    
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('✓ Check (mail to address above)', 60, termsTop + 120)
      .text('✓ ACH/Wire Transfer', 250, termsTop + 120)
      .text('✓ Online Payment', 420, termsTop + 120);
    
    // Late payment notice
    doc
      .fontSize(9)
      .fillColor('#d32f2f')
      .text('Late payments subject to 1.5% monthly interest charge', 50, termsTop + 165)
      .fillColor('#000000');
  }
  
  /**
   * Generate footer
   */
  generateFooter(doc) {
    const footerTop = 710;
    
    doc
      .moveTo(50, footerTop)
      .lineTo(562, footerTop)
      .stroke('#cccccc');
    
    doc
      .fontSize(9)
      .fillColor('#666666')
      .text(
        'Thank you for your business! Questions? Contact billing@daycarealert.com',
        50,
        footerTop + 10,
        { align: 'center', width: 512 }
      )
      .text(
        'DaycareAlert.com - Making Quality Childcare Accessible',
        50,
        footerTop + 25,
        { align: 'center', width: 512 }
      );
  }
  
  /**
   * Helper: Format date
   */
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  /**
   * Helper: Format currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  }
  
  /**
   * Helper: Get status color
   */
  getStatusColor(status) {
    const colors = {
      'pending': '#FF9800',
      'sent': '#2196F3',
      'partial': '#FFC107',
      'paid': '#4CAF50',
      'overdue': '#d32f2f',
      'cancelled': '#9E9E9E'
    };
    return colors[status] || '#9E9E9E';
  }
  
  /**
   * Helper: Get payment terms
   */
  getPaymentTerms(invoice) {
    const invoiceDate = new Date(invoice.invoice_date);
    const dueDate = new Date(invoice.due_date);
    const diffTime = Math.abs(dueDate - invoiceDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  
  /**
   * Save invoice PDF to file system
   */
  async saveInvoicePDF(invoiceId, outputPath) {
    const doc = await this.generateInvoicePDF(invoiceId);
    
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(outputPath);
      
      doc.pipe(writeStream);
      
      writeStream.on('finish', () => {
        resolve(outputPath);
      });
      
      writeStream.on('error', (error) => {
        reject(error);
      });
    });
  }
}

module.exports = new InvoicePdfService();
