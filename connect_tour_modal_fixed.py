#!/usr/bin/env python3
import re

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

print("1. Adding TourRequestModal import...")

# Add import at the top
if "import TourRequestModal" not in content:
    import_line = "import TourRequestModal from '../components/TourScheduling/TourRequestModal';"
    # Find DaycareComparison import and add after it
    content = content.replace(
        "import DaycareComparison from '../components/DaycareComparison';",
        "import DaycareComparison from '../components/DaycareComparison';\n" + import_line
    )
    print("✅ Import added")
else:
    print("✅ Import already exists")

print("2. Adding tour mode banner...")

# Find the comparison banner and add tour banner after it
comparison_banner = '''        {/* Visual indicator for comparison mode */}
        {compareMode && (
          <div className="comparison-mode-banner">'''

if comparison_banner in content and "Tour Mode Banner" not in content:
    tour_banner = '''        {/* Visual indicator for comparison mode */}
        {compareMode && (
          <div className="comparison-mode-banner">
            <p>
              <strong>Comparison Mode Active</strong> - Click on any daycare to add it to comparison.
              <br />
              <span className="comparison-counter">{daycareComparison.length} daycares selected</span>
            </p>
          </div>
        )}
        
        {/* Tour Mode Banner */}
        {tourMode && (
          <div className="tour-mode-banner">
            <p>
              <strong>Tour Mode Active</strong> - Click daycares below to add them to your tour request (max 5)
              <br />
              <span className="tour-counter">{tourSelection.length} daycares selected</span>
            </p>
          </div>
        )}'''
    
    # Find and replace the comparison banner section
    old_section_start = content.find(comparison_banner)
    old_section_end = content.find("}", old_section_start) + 1
    old_section_end = content.find("}", old_section_end) + 1
    
    content = content[:old_section_start] + tour_banner + content[old_section_end:]
    print("✅ Banner added")
else:
    print("⚠️ Banner already exists or comparison banner not found")

print("3. Adding TourRequestModal component...")

# Add modal before closing tag
if "Tour Request Modal" not in content:
    # Find the DaycareComparison modal
    comparison_modal_marker = "{showComparisonModal && ("
    
    if comparison_modal_marker in content:
        # Find the end of the comparison modal
        pos = content.find(comparison_modal_marker)
        # Find the closing of this block
        count = 1
        i = pos + len(comparison_modal_marker)
        while count > 0 and i < len(content):
            if content[i] == '(':
                count += 1
            elif content[i] == ')':
                count -= 1
            i += 1
        
        # Find the closing brace and }
        while i < len(content) and content[i] != '}':
            i += 1
        i += 1  # Include the closing }
        
        tour_modal = '''
      
      {/* Tour Request Modal */}
      {showTourModal && (
        <TourRequestModal
          selectedDaycares={tourSelection}
          onClose={closeTourModal}
          onRemove={removeFromTourSelection}
        />
      )}'''
        
        content = content[:i] + tour_modal + content[i:]
        print("✅ Modal component added")
    else:
        print("❌ Could not find comparison modal marker")
else:
    print("✅ Modal already exists")

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("\n✅ Done!")
