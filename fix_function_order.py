#!/usr/bin/env python3

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

# We need to move the tour functions to come BEFORE the useEffect that uses them
# Find where comparison functions end (removeFromComparison)
# Insert tour functions right after that, BEFORE the useEffect

import re

# Find the tour function definitions
tour_functions_pattern = r'(  // Toggle tour mode\s+const toggleTourMode = useCallback.*?  const closeTourModal = useCallback\(\(\) => \{.*?\}, \[\]\);)'
tour_match = re.search(tour_functions_pattern, content, re.DOTALL)

if tour_match:
    print("Found tour functions")
    tour_functions = tour_match.group(1)
    
    # Remove tour functions from their current location
    content = content.replace(tour_functions, '')
    
    # Find where to insert them (after removeFromComparison, before useEffect)
    insert_pattern = r'(const removeFromComparison = useCallback\([^}]+\}, \[daycareComparison\]\);)\s+'
    
    # Insert tour functions at the correct location
    content = re.sub(
        insert_pattern,
        r'\1\n\n' + tour_functions + '\n\n  ',
        content,
        count=1
    )
    
    print("✅ Tour functions moved before useEffect")
else:
    print("Could not find tour functions - trying different approach")
    
    # Alternative: Find tour functions by finding toggleTourMode
    # and move everything between toggleTourMode and closeTourModal
    
with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("Done!")
