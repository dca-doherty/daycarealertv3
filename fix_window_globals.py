#!/usr/bin/env python3
import re

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

# Find the useEffect that sets window globals
old_useeffect = r'''  // Initialize window global variables for cross-component communication
  useEffect\(\(\) => \{
    // Set window global variables
    window\.daycarealertCompareMode = compareMode;
    window\.daycareComparisonCount = daycareComparison\.length;
    window\.toggleCompareMode = toggleCompareMode;
    window\.openComparisonModal = openComparisonModal;
    
    // Clean up global variables when component unmounts
    return \(\) => \{
      window\.daycarealertCompareMode = undefined;
      window\.daycareComparisonCount = undefined;
      window\.toggleCompareMode = undefined;
      window\.openComparisonModal = undefined;
    \};
  \}, \[compareMode, daycareComparison\.length, toggleCompareMode, openComparisonModal\]\);'''

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
      window.openTourModal = undefined;
    };
  }, [compareMode, daycareComparison.length, toggleCompareMode, openComparisonModal, tourMode, tourSelection.length, toggleTourMode, openTourModal]);'''

if re.search(old_useeffect, content):
    content = re.sub(old_useeffect, new_useeffect, content)
    print("✅ Updated useEffect with tour globals")
else:
    print("⚠️ Could not find the exact useEffect pattern - checking if tour globals already exist")
    if 'window.toggleTourMode = toggleTourMode' in content:
        print("✅ Tour globals already in useEffect")
    else:
        print("❌ Need to manually add tour globals to useEffect")

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("Done!")
