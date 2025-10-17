#!/usr/bin/env python3
import re

with open('src/components/DaycareDataView.js', 'r') as f:
    content = f.read()

# Only remove standalone console.log lines (full lines only)
lines = content.split('\n')
cleaned_lines = []

for line in lines:
    stripped = line.strip()
    # Only remove if it's a complete console.log statement on its own line
    if stripped.startswith('console.log(') and stripped.endswith(');'):
        continue  # Skip this line
    cleaned_lines.append(line)

with open('src/components/DaycareDataView.js', 'w') as f:
    f.write('\n'.join(cleaned_lines))

print("✅ Safely removed console logs")
