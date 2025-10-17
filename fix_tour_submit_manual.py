#!/usr/bin/env python3
import re

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

# Find the TourRequestModal component
pattern = r'<TourRequestModal\s+isOpen=\{showTourModal\}.*?onSubmit=\{async \(formData\) => \{.*?\}\s*\}'

# Check if we can find it
match = re.search(pattern, content, re.DOTALL)
if match:
    print("Found TourRequestModal")
    print("Match starts at:", match.start())
    print("First 100 chars:", match.group(0)[:100])
else:
    print("Could not find TourRequestModal with onSubmit")
    # Try alternative search
    if 'onSubmit={async (formData)' in content:
        pos = content.find('onSubmit={async (formData)')
        print(f"Found onSubmit at position {pos}")
        print("Context:", content[pos:pos+200])
