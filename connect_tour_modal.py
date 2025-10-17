#!/usr/bin/env python3
import re

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

print("1. Adding TourRequestModal import...")

# Add import at the top with other imports
import_pattern = r"(import DaycareComparison from '../components/DaycareComparison';)"
new_import = r"\1\nimport TourRequestModal from '../components/TourScheduling/TourRequestModal';"

if "import TourRequestModal" not in content:
    content = re.sub(import_pattern, new_import, content)
    print("✅ Import added")
else:
    print("✅ Import already exists")

print("2. Adding tour mode banner at top...")

# Add tour banner after comparison banner
banner_pattern = r"(\{compareMode && \(\s+<div className=\"comparison-mode-banner\">[^}]+\}\s+\)\s+\})"

tour_banner = r'''\1
        
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

if "Tour Mode Banner" not in content:
    content = re.sub(banner_pattern, tour_banner, content, flags=re.DOTALL)
    print("✅ Banner added")
else:
    print("✅ Banner already exists")

print("3. Adding TourRequestModal component...")

# Add modal component before the closing fragment
modal_pattern = r"(\{showComparisonModal && \(\s+<DaycareComparison[^}]+\}\s+\)\s+\})\s+(</>"

tour_modal = r'''\1
      
      {/* Tour Request Modal */}
      {showTourModal && (
        <TourRequestModal
          selectedDaycares={tourSelection}
          onClose={closeTourModal}
          onRemove={removeFromTourSelection}
        />
      )}
      
      \2'''

if "Tour Request Modal" not in content:
    content = re.sub(modal_pattern, tour_modal, content, flags=re.DOTALL)
    print("✅ Modal component added")
else:
    print("✅ Modal already exists")

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("\n✅ All components connected!")
