#!/usr/bin/env python3

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

# Find the handleDaycareSelect useCallback and update its dependencies
import re

# Find the pattern
pattern = r'(const handleDaycareSelect = useCallback\([^}]+\}, \[)([^\]]+)(\]\);)'

def add_tour_deps(match):
    deps = match.group(2)
    # Add tour dependencies if not already there
    if 'tourMode' not in deps:
        new_deps = deps + ', tourMode, addToTourSelection, removeFromTourSelection, isInTourSelection'
        return match.group(1) + new_deps + match.group(3)
    return match.group(0)

content = re.sub(pattern, add_tour_deps, content, flags=re.DOTALL)

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("✅ Fixed callback dependencies")
