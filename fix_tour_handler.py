#!/usr/bin/env python3

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

# Find and replace - using raw strings
old = '''  const handleDaycareSelect = useCallback((daycare, fromComparison = false) => {
    // If in compare mode and not coming from comparison modal, toggle selection
    if (compareMode && !fromComparison) {'''

new = '''  const handleDaycareSelect = useCallback((daycare, fromComparison = false) => {
    // If in tour mode, add to tour selection instead of opening details
    if (tourMode && !fromComparison) {
      if (isInTourSelection(daycare)) {
        removeFromTourSelection(daycare);
        showNotification(`Removed ${daycare.operation_name} from tour list`, 'info');
      } else {
        addToTourSelection(daycare);
        showNotification(`Added ${daycare.operation_name} to tour list`, 'success');
      }
      return;
    }
    
    // If in compare mode and not coming from comparison modal, toggle selection
    if (compareMode && !fromComparison) {'''

content = content.replace(old, new)

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("✅ Fixed!")
