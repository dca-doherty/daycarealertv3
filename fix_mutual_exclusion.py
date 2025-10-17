#!/usr/bin/env python3

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

# Fix toggleTourMode to disable compare mode
old_tour = '''  const toggleTourMode = useCallback(() => {
    setTourMode(prev => !prev);
    if (tourMode) {
      setTourSelection([]);
    }
  }, [tourMode]);'''

new_tour = '''  const toggleTourMode = useCallback(() => {
    setTourMode(prev => !prev);
    if (tourMode) {
      setTourSelection([]);
    } else {
      // Disable compare mode when activating tour mode
      setCompareMode(false);
      setDaycareComparison([]);
    }
  }, [tourMode]);'''

content = content.replace(old_tour, new_tour)

# Fix toggleCompareMode to disable tour mode
old_compare = '''  const toggleCompareMode = useCallback(() => {
    const newCompareMode = !compareMode;
    setCompareMode(newCompareMode);
    // Update window global variables for cross-component communication
    window.daycarealertCompareMode = newCompareMode;
    window.daycareComparisonCount = newCompareMode ? daycareComparison.length : 0;
    if (compareMode) {
      // If turning off compare mode, clear the comparison list
      setDaycareComparison([]);'''

new_compare = '''  const toggleCompareMode = useCallback(() => {
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

content = content.replace(old_compare, new_compare)

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("✅ Made modes mutually exclusive!")
