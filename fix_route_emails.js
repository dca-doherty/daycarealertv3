const fs = require('fs');
const content = fs.readFileSync('backend/routes/tourScheduling/tourRoutes.js', 'utf8');

// Find the email sending in the route and wrap it
const oldRoute = content.replace(
  /\/\/ Send confirmation email to parent\s+await emailService\.sendParentConfirmationEmail\([^)]+\);/s,
  `// Send confirmation email to parent (async, don't block response)
    setImmediate(() => {
      emailService.sendParentConfirmationEmail(
        result.tourRequestId,
        parentInfo,
        selectedDaycares
      ).catch(err => console.error('Error sending parent email (ignored):', err));
    });`
);

fs.writeFileSync('backend/routes/tourScheduling/tourRoutes.js', oldRoute);
console.log('✅ Fixed route email sending');
