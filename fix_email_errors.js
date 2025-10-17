const fs = require('fs');
const path = './backend/services/tourScheduling/tourRequestService.js';

let content = fs.readFileSync(path, 'utf8');

// Find and replace the getDaycareEmail function to handle missing table
const oldGetEmail = `  async getDaycareEmail(operationId) {
    const [rows] = await pool.query(
      'SELECT email_address FROM child_care_operations WHERE operation_id = ?',
      [operationId]
    );

    return rows[0]?.email_address;
  }`;

const newGetEmail = `  async getDaycareEmail(operationId) {
    try {
      const [rows] = await pool.query(
        'SELECT email_address FROM child_care_operations WHERE operation_id = ?',
        [operationId]
      );
      return rows[0]?.email_address;
    } catch (error) {
      console.log('Could not fetch daycare email (table may not exist):', error.message);
      return null;
    }
  }`;

content = content.replace(oldGetEmail, newGetEmail);

fs.writeFileSync(path, content);
console.log('✅ Fixed getDaycareEmail error handling');
