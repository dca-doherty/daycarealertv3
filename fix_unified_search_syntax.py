#!/usr/bin/env python3
import re

with open('src/components/UnifiedSearch.js', 'r') as f:
    content = f.read()

# Find and fix the malformed line
old_line = r'\{window\.daycarealertTourMode \? "EXIT TOUR MODE" : "\{window\.daycarealertTourMode \? "EXIT TOUR MODE" : "SELECT DAYCARES FOR TOURS"\}"\}'
new_line = '{window.daycarealertTourMode ? "EXIT TOUR MODE" : "SELECT DAYCARES FOR TOURS"}'

content = re.sub(old_line, new_line, content)

# Also fix if it appears in a different format
content = re.sub(
    r'\{window\.daycarealertTourMode.*?DAYCARES FOR TOURS.*?\}"\}',
    new_line,
    content,
    flags=re.DOTALL
)

with open('src/components/UnifiedSearch.js', 'w') as f:
    f.write(content)

print("✅ UnifiedSearch.js syntax fixed!")
