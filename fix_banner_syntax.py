#!/usr/bin/env python3

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Find the problematic section around line 985
for i in range(975, min(995, len(lines))):
    print(f"Line {i+1}: {lines[i].rstrip()}")

# The issue is likely duplicate banner code. Let's find and fix it
content = ''.join(lines)

# Remove any duplicate or broken banner code
# Look for the pattern and replace with correct version
import re

# Find all tour mode banner occurrences
pattern = r'\{/\* Tour Mode Banner \*/\}.*?\{tourMode && \(.*?\)\s+\}'

matches = list(re.finditer(pattern, content, re.DOTALL))
print(f"\nFound {len(matches)} Tour Mode Banner blocks")

if len(matches) > 1:
    print("Removing duplicates...")
    # Keep only the first one
    for match in reversed(matches[1:]):
        content = content[:match.start()] + content[match.end():]

# Now ensure the banner is correct
correct_banner = '''        {/* Tour Mode Banner */}
        {tourMode && (
          <div className="tour-mode-banner">
            <p>
              <strong>Tour Mode Active</strong> - Click daycares below to add them to your tour request (max 5)
              <br />
              <span className="tour-counter">{tourSelection.length} daycares selected</span>
            </p>
          </div>
        )}'''

# Replace any tour banner with the correct one
content = re.sub(
    r'\{/\* Tour Mode Banner \*/\}.*?\{tourMode && \(.*?\)\s+\}',
    correct_banner,
    content,
    flags=re.DOTALL,
    count=1
)

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("\n✅ Fixed!")
