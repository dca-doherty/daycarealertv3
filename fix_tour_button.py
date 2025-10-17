#!/usr/bin/env python3
import re

with open('src/components/UnifiedSearch.js', 'r') as f:
    content = f.read()

# Find the tour button and add onClick
old_button = r'(<button[^>]*className="unified-search-button tour-button"[^>]*>)\s*\{window\.daycarealertTourMode'
new_button = r'<button\n            className="unified-search-button tour-button"\n            onClick={() => window.toggleTourMode && window.toggleTourMode()}\n          >\n            {window.daycarealertTourMode'

content = re.sub(old_button, new_button, content)

with open('src/components/UnifiedSearch.js', 'w') as f:
    f.write(content)

print("✅ Button onClick added")
