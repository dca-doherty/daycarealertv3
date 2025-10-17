#!/usr/bin/env python3
import re

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

print("Fixing useEffect...")

# Find and replace the entire useEffect block
old_pattern = r'''  // Initialize window global variables for cross-component communication
  useEffect\(\(\) => \{
    // Set window global variables
    window\.daycarealertCompareMode = compareMode;
    window\.daycareComparisonCount = daycareComparison\.length;
    window\.toggleCompareMode = toggleCompareMode;
    window\.toggleTourMode = toggleTourMode;
    window\.openTourModal = openTourModal;
    window\.toggleTourMode = toggleTourMode;
    window\.openTourModal = openTourModal;
    window\.openComparisonModal = openComparisonModal;
    // Clean up global variables when component unmounts
    return \(\) => \{
      window\.daycarealertCompareMode = undefined;
      window\.daycareComparisonCount = undefined;
      window\.toggleCompareMode = undefined;
      window\.toggleTourMode = undefined;
      window\.openTourModal = undefined;
      window\.toggleTourMode = undefined;
      window\.openTourModal = undefined;'''

new_useeffect = '''  // Initialize window global variables for cross-component communication
  useEffect(() => {
    // Set window global variables
    window.daycarealertCompareMode = compareMode;
    window.daycareComparisonCount = daycareComparison.length;
    window.toggleCompareMode = toggleCompareMode;
    window.openComparisonModal = openComparisonModal;
    
    // Tour mode globals
    window.daycarealertTourMode = tourMode;
    window.tourSelectionCount = tourSelection.length;
    window.toggleTourMode = toggleTourMode;
    window.openTourModal = openTourModal;
    
    // Clean up global variables when component unmounts
    return () => {
      window.daycarealertCompareMode = undefined;
      window.daycareComparisonCount = undefined;
      window.toggleCompareMode = undefined;
      window.openComparisonModal = undefined;
      window.daycarealertTourMode = undefined;
      window.tourSelectionCount = undefined;
      window.toggleTourMode = undefined;
      window.openTourModal = undefined;'''

content = re.sub(old_pattern, new_useeffect, content, flags=re.DOTALL)

# Now fix the dependency array that follows
old_deps = r'  \}, \[compareMode, daycareComparison\.length, toggleCompareMode, openComparisonModal\]\);'
new_deps = '  }, [compareMode, daycareComparison.length, toggleCompareMode, openComparisonModal, tourMode, tourSelection.length, toggleTourMode, openTourModal]);'

content = re.sub(old_deps, new_deps, content)

print("✅ useEffect fixed")

# Write the corrected file
with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("✅ Complete fix applied!")
