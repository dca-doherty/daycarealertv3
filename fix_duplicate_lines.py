#!/usr/bin/env python3

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    lines = f.readlines()

# Lines 985-989 are duplicates that need to be removed
# Line 984 is:           </div>
# Line 985 should be:         )}
# But instead we have extra junk on 985-989

# Remove lines 985-989 (indices 984-988)
print(f"Original line count: {len(lines)}")
print("Removing duplicate lines 985-989...")

# Delete the duplicate lines
del lines[984:989]

print(f"New line count: {len(lines)}")

# Verify the fix
print("\nLines 975-995 after fix:")
for i in range(974, min(995, len(lines))):
    print(f"Line {i+1}: {lines[i].rstrip()}")

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.writelines(lines)

print("\n✅ Duplicates removed!")
