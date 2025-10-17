#!/usr/bin/env python3
import re

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

print("Moving useEffect to correct position...")

# Find and extract the useEffect block
useeffect_pattern = r'  // Initialize window global variables for cross-component communication\s+useEffect\(\(\) => \{[^}]*\{[^}]*\}[^}]*\}, \[compareMode, daycareComparison\.length, toggleCompareMode, openComparisonModal, tourMode, tourSelection\.length, toggleTourMode, openTourModal\]\);'

useeffect_match = re.search(useeffect_pattern, content, re.DOTALL)

if useeffect_match:
    print("Found useEffect")
    useeffect_block = useeffect_match.group(0)
    
    # Remove it from current location
    content = content[:useeffect_match.start()] + content[useeffect_match.end():]
    
    # Find closeTourModal (the last tour function)
    close_pattern = r'  const closeTourModal = useCallback\(\(\) => \{\s+setShowTourModal\(false\);\s+\}, \[\]\);'
    close_match = re.search(close_pattern, content)
    
    if close_match:
        print("Found closeTourModal at position", close_match.start())
        # Insert useEffect right after it
        insert_pos = close_match.end()
        content = content[:insert_pos] + '\n\n' + useeffect_block + content[insert_pos:]
        print("✅ useEffect moved after closeTourModal")
    else:
        print("Could not find closeTourModal exactly, searching for alternative...")
        # Try to find any }, []); that's part of tour functions
        alt_pattern = r'(\}, \[tourSelection\]\);)(\s+)(  // Get URL parameters)'
        if re.search(alt_pattern, content):
            content = re.sub(alt_pattern, r'\1\n\n' + useeffect_block + r'\n\2\3', content)
            print("✅ useEffect inserted (alternative position)")
else:
    print("ERROR: Could not find useEffect!")

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("Done!")
