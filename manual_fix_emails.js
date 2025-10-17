const fs = require('fs');
const content = fs.readFileSync('backend/services/tourScheduling/tourRequestService.js', 'utf8');

// Find the section with email sending
const lines = content.split('\n');
let modified = false;

for (let i = 0; i < lines.length; i++) {
  // Look for the sendTourRequestEmails call
  if (lines[i].includes('this.sendTourRequestEmails')) {
    console.log('Found sendTourRequestEmails at line', i+1);
    
    // Wrap in setImmediate and ensure proper indentation
    lines[i] = lines[i].replace(
      'this.sendTourRequestEmails',
      'setImmediate(() => {\n        this.sendTourRequestEmails'
    );
    
    // Find the .catch line and close the setImmediate
    if (lines[i+1] && lines[i+1].includes('.catch')) {
      lines[i+1] = lines[i+1].replace(
        ".catch(err => console.error('Error sending emails:', err));",
        ".catch(err => console.error('Error sending emails (ignored):', err));\n      });"
      );
    }
    
    modified = true;
    break;
  }
}

if (modified) {
  fs.writeFileSync('backend/services/tourScheduling/tourRequestService.js', lines.join('\n'));
  console.log('✅ Modified email sending to be async');
} else {
  console.log('❌ Could not find sendTourRequestEmails');
}
