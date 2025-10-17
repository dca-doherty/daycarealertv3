#!/usr/bin/env python3

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Remove lines 736-738 (duplicate tour state - array is 0-indexed)
if len(lines) > 738:
    # Check if line 736 has tourMode
    if 'tourMode' in lines[735]:  # Line 736 is index 735
        print(f"Line 736: {lines[735].strip()}")
        print(f"Line 737: {lines[736].strip()}")
        print(f"Line 738: {lines[737].strip()}")
        print("Removing duplicate tour state...")
        del lines[735:738]  # Remove lines 736-738
        print("✅ Duplicate removed")

# Now fix the useEffect section
new_lines = []
skip_until = -1
in_useeffect = False
useeffect_fixed = False

for i, line in enumerate(lines):
    if skip_until > i:
        continue
    
    # Find the useEffect that needs fixing
    if '// Initialize window global variables for cross-component communication' in line and not useeffect_fixed:
        in_useeffect = True
        # Find the end of this useEffect
        brace_count = 0
        end_line = i
        for j in range(i, len(lines)):
            if '{' in lines[j]:
                brace_count += lines[j].count('{')
            if '}' in lines[j]:
                brace_count -= lines[j].count('}')
            if brace_count == 0 and ']);' in lines[j]:
                end_line = j
                break
        
        print(f"Found useEffect from line {i+1} to {end_line+1}")
        
        # Replace with corrected useEffect
        new_lines.append('  // Initialize window global variables for cross-component communication\n')
        new_lines.append('  useEffect(() => {\n')
        new_lines.append('    // Set window global variables\n')
        new_lines.append('    window.daycarealertCompareMode = compareMode;\n')
        new_lines.append('    window.daycareComparisonCount = daycareComparison.length;\n')
        new_lines.append('    window.toggleCompareMode = toggleCompareMode;\n')
        new_lines.append('    window.openComparisonModal = openComparisonModal;\n')
        new_lines.append('    \n')
        new_lines.append('    // Tour mode globals\n')
        new_lines.append('    window.daycarealertTourMode = tourMode;\n')
        new_lines.append('    window.tourSelectionCount = tourSelection.length;\n')
        new_lines.append('    window.toggleTourMode = toggleTourMode;\n')
        new_lines.append('    window.openTourModal = openTourModal;\n')
        new_lines.append('    \n')
        new_lines.append('    // Clean up global variables when component unmounts\n')
        new_lines.append('    return () => {\n')
        new_lines.append('      window.daycarealertCompareMode = undefined;\n')
        new_lines.append('      window.daycareComparisonCount = undefined;\n')
        new_lines.append('      window.toggleCompareMode = undefined;\n')
        new_lines.append('      window.openComparisonModal = undefined;\n')
        new_lines.append('      window.daycarealertTourMode = undefined;\n')
        new_lines.append('      window.tourSelectionCount = undefined;\n')
        new_lines.append('      window.toggleTourMode = undefined;\n')
        new_lines.append('      window.openTourModal = undefined;\n')
        new_lines.append('    };\n')
        new_lines.append('  }, [compareMode, daycareComparison.length, toggleCompareMode, openComparisonModal, tourMode, tourSelection.length, toggleTourMode, openTourModal]);\n')
        
        skip_until = end_line + 1
        useeffect_fixed = True
        print("✅ useEffect replaced")
        continue
    
    new_lines.append(line)

# Write back
with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.writelines(new_lines)

print(f"✅ File updated! New line count: {len(new_lines)}")
