#!/usr/bin/env python3
import re

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

print("Fixing OptimizedMySqlHome.js...")

# Find all tour state declarations
matches = list(re.finditer(r'  const \[tourMode, setTourMode\] = useState\(false\);\s+const \[tourSelection, setTourSelection\] = useState\(\[\]\);\s+const \[showTourModal, setShowTourModal\] = useState\(false\);', content))

print(f"Found {len(matches)} tour state declarations")

# Remove duplicates (keep only the first one at line ~27)
if len(matches) > 1:
    for match in reversed(matches[1:]):
        print(f"Removing duplicate at position {match.start()}")
        content = content[:match.start()] + content[match.end():]

# Fix the useEffect - replace the entire block
old_useeffect = r'''  // Initialize window global variables for cross-component communication
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
      window\.openTourModal = undefined;
      window\.openComparisonModal = undefined;
    \};
  \}, \[compareMode, daycareComparison\.length, toggleCompareMode, openComparisonModal, tourMode, tourSelection\.length, toggleTourMode, openTourModal\]\);'''

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

content = re.sub(old_useeffect, new_useeffect, content, flags=re.DOTALL)

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("✅ All duplicates removed and useEffect fixed!")
