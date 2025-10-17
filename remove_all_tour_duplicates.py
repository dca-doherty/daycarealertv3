#!/usr/bin/env python3

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Find all lines with tour state declarations
tour_mode_lines = []
tour_selection_lines = []
show_modal_lines = []

for i, line in enumerate(lines):
    if 'const [tourMode, setTourMode] = useState(false)' in line:
        tour_mode_lines.append(i)
        print(f"Found tourMode at line {i+1}: {line.strip()}")
    if 'const [tourSelection, setTourSelection] = useState([])' in line:
        tour_selection_lines.append(i)
        print(f"Found tourSelection at line {i+1}: {line.strip()}")
    if 'const [showTourModal, setShowTourModal] = useState(false)' in line:
        show_modal_lines.append(i)
        print(f"Found showTourModal at line {i+1}: {line.strip()}")

# Keep only the first occurrence of each (around line 27-29)
# Remove all others
lines_to_remove = set()

if len(tour_mode_lines) > 1:
    print(f"\nRemoving {len(tour_mode_lines)-1} duplicate tourMode declarations")
    for line_num in tour_mode_lines[1:]:
        lines_to_remove.add(line_num)

if len(tour_selection_lines) > 1:
    print(f"Removing {len(tour_selection_lines)-1} duplicate tourSelection declarations")
    for line_num in tour_selection_lines[1:]:
        lines_to_remove.add(line_num)

if len(show_modal_lines) > 1:
    print(f"Removing {len(show_modal_lines)-1} duplicate showTourModal declarations")
    for line_num in show_modal_lines[1:]:
        lines_to_remove.add(line_num)

# Remove comment lines that might be above duplicates
for line_num in list(lines_to_remove):
    if line_num > 0 and '// State for tour selection' in lines[line_num - 1]:
        lines_to_remove.add(line_num - 1)
    if line_num > 0 and '// eslint-disable-next-line' in lines[line_num - 1]:
        lines_to_remove.add(line_num - 1)

# Create new content without duplicates
new_lines = []
for i, line in enumerate(lines):
    if i not in lines_to_remove:
        new_lines.append(line)
    else:
        print(f"Removing line {i+1}: {line.strip()}")

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.writelines(new_lines)

print(f"\n✅ Duplicates removed! Original: {len(lines)} lines, New: {len(new_lines)} lines")
