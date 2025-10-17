#!/usr/bin/env python3
import re

# Read the file
with open('src/components/UnifiedSearch.js', 'r') as f:
    content = f.read()

# Find the tour button and ensure it's properly connected
# Look for the tour button section
tour_button_pattern = r'(<button[^>]*className="unified-search-button tour-button"[^>]*>)'

# Replace it with proper onClick handler
if 'SELECT DAYCARES FOR TOURS' in content:
    # Check if onClick is already there
    if 'onClick={() => window.toggleTourMode && window.toggleTourMode()}' not in content:
        print("Adding onClick handler to tour button...")
        
        # Add onClick to the tour button
        content = re.sub(
            r'(<button[^>]*className="unified-search-button tour-button")',
            r'\1 onClick={() => window.toggleTourMode && window.toggleTourMode()}',
            content
        )
        
        # Update button text to be dynamic
        content = re.sub(
            r'(SELECT DAYCARES FOR TOURS)',
            r'{window.daycarealertTourMode ? "EXIT TOUR MODE" : "SELECT DAYCARES FOR TOURS"}',
            content
        )
    else:
        print("Tour button already has onClick handler")
else:
    print("Tour button not found in UnifiedSearch.js")

# Write back
with open('src/components/UnifiedSearch.js', 'w') as f:
    f.write(content)

print("✅ UnifiedSearch.js updated")
