#!/usr/bin/env python3

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

# Fix toggleCompareMode with same pattern
old_compare = '''  const toggleCompareMode = useCallback(() => {
    const newCompareMode = !compareMode;
    setCompareMode(newCompareMode);
    // Update window global variables for cross-component communication
    window.daycarealertCompareMode = newCompareMode;
    window.daycareComparisonCount = newCompareMode ? daycareComparison.length : 0;
    if (compareMode) {
      // If turning off compare mode, clear the comparison list
      setDaycareComparison([]);
    } else {
      // Disable tour mode when activating compare mode
      setTourMode(false);
      setTourSelection([]);'''

new_compare = '''  const toggleCompareMode = useCallback(() => {
    setCompareMode(prev => {
      const newValue = !prev;
      // Update window global immediately
      window.daycarealertCompareMode = newValue;
      window.daycareComparisonCount = newValue ? daycareComparison.length : 0;
      
      if (!newValue) {
        // Turning OFF compare mode - clear selections
        setDaycareComparison([]);
      } else {
        // Turning ON compare mode - disable tour mode
        setTourMode(false);
        setTourSelection([]);
      }
      
      return newValue;
    });'''

content = content.replace(old_compare, new_compare)

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("✅ Fixed comparison toggle!")
