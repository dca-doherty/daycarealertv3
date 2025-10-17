#!/usr/bin/env python3

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

# Find handleDaycareSelect and add tour mode check at the beginning
old_handler = '''  const handleDaycareSelect = useCallback((daycare, fromComparison = false) => {
    if (fromComparison || compareMode) {'''

new_handler = '''  const handleDaycareSelect = useCallback((daycare, fromComparison = false) => {
    // Handle tour mode selection
    if (tourMode && !fromComparison) {
      if (isInTourSelection(daycare)) {
        removeFromTourSelection(daycare);
        showNotification(`Removed ${daycare.operation_name} from tour list`, 'info');
      } else {
        addToTourSelection(daycare);
        showNotification(`Added ${daycare.operation_name} to tour list`, 'success');
      }
      return; // Don't open details modal in tour mode
    }
    
    if (fromComparison || compareMode) {'''

if old_handler in content:
    content = content.replace(old_handler, new_handler)
    print("✅ Added tour mode handling to handleDaycareSelect")
else:
    print("❌ Could not find handleDaycareSelect pattern")
    print("Let me check what's there...")
    import re
    match = re.search(r'const handleDaycareSelect = useCallback.*?\{', content, re.DOTALL)
    if match:
        print("Found:", match.group(0)[:200])

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)
