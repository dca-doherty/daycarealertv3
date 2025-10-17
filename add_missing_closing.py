#!/usr/bin/env python3

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    lines = f.readlines()

# After line 984 (</div>), we need to add the closing )}
# Line 984 is index 983

print("Adding missing closing )}...")

# Insert the closing after line 984
lines.insert(984, '        )}\n')

print("\nLines 975-995 after fix:")
for i in range(974, min(995, len(lines))):
    print(f"Line {i+1}: {lines[i].rstrip()}")

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.writelines(lines)

print("\n✅ Fixed!")
