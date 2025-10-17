const fs = require('fs');
const path = './backend/services/tourScheduling/tourRequestService.js';

let content = fs.readFileSync(path, 'utf8');

// Find the email sending and make it truly async
const oldAsync = `      await connection.commit();

      // Send emails asynchronously
      this.sendTourRequestEmails(tourRequestId, requestData, selectedDaycares)
        .catch(err => console.error('Error sending emails:', err));

      return {
        success: true,
        tourRequestId,
        message: 'Tour request submitted successfully'
      };`;

const newAsync = `      await connection.commit();

      // Send emails asynchronously (fire and forget)
      setImmediate(() => {
        this.sendTourRequestEmails(tourRequestId, requestData, selectedDaycares)
          .catch(err => console.error('Error sending emails (ignored):', err));
      });

      return {
        success: true,
        tourRequestId,
        message: 'Tour request submitted successfully'
      };`;

if (content.includes(oldAsync)) {
  content = content.replace(oldAsync, newAsync);
  fs.writeFileSync(path, content);
  console.log('✅ Made email sending truly async');
} else {
  console.log('❌ Could not find exact match - checking alternatives');
  console.log('Checking for commit line...');
  if (content.includes('await connection.commit()')) {
    console.log('✓ Found commit');
  }
}
