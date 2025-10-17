#!/usr/bin/env python3

with open('src/components/DaycareDataView.js', 'r') as f:
    lines = f.readlines()

# Find line 204 (index 203)
print("Line 202-208:")
for i in range(201, 208):
    if i < len(lines):
        print(f"{i+1}: {lines[i].rstrip()}")

# The issue is line 204 starts with "typeof" which means something before it was removed
# Let's look for the incomplete statement
for i in range(200, 210):
    if i < len(lines) and 'typeof ratingToUse' in lines[i]:
        print(f"\nFound problematic line at {i+1}")
        print(f"Previous line: {lines[i-1].rstrip()}")
        print(f"Current line: {lines[i].rstrip()}")
        
        # Check if previous line looks incomplete
        prev = lines[i-1].strip()
        if prev and not prev.endswith((';', '{', '}')):
            print("⚠️  Previous line looks incomplete!")
