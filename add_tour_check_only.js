const fs = require('fs');
let content = fs.readFileSync('src/pages/OptimizedMySqlHome.js', 'utf8');

// Find the handleDaycareSelect function and add tour mode check at the very beginning
const searchFor = `  const handleDaycareSelect = useCallback((daycare, fromComparison = false) => {
    // If in compare mode and not coming from comparison modal, toggle selection
    if (compareMode && !fromComparison) {`;

const replaceWith = `  const handleDaycareSelect = useCallback((daycare, fromComparison = false) => {
    // If in tour mode, add to tour selection instead of opening details
    if (tourMode && !fromComparison) {
      if (isInTourSelection(daycare)) {
        removeFromTourSelection(daycare);
        showNotification(\`Removed \${daycare.operation_name} from tour list\`, 'info');
      } else {
        addToTourSelection(daycare);
        showNotification(\`Added \${daycare.operation_name} to tour list\`, 'success');
      }
      return;
    }
    
    // If in compare mode and not coming from comparison modal, toggle selection
    if (compareMode && !fromComparison) {`;

if (content.includes(searchFor)) {
  content = content.replace(searchFor, replaceWith);
  fs.writeFileSync('src/pages/OptimizedMySqlHome.js', content);
  console.log('✅ Added tour mode check to handleDaycareSelect');
} else {
  console.log('❌ Could not find handleDaycareSelect pattern');
}
