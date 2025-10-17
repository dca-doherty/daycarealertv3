#!/usr/bin/env python3
import re

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

print("Looking for comparison indicator to add tour indicator after it...")

# Find the comparison mode indicator block
pattern = r'(\{/\* Comparison Mode Indicator \*/\}\s+\{compareMode && \(.*?\</div\>\s+\</div\>\s+\)\s+\})'

if re.search(pattern, content, re.DOTALL):
    print("✅ Found comparison indicator")
    
    tour_indicator = '''
      
      {/* Tour Mode Indicator */}
      {tourMode && (
        <div className="tour-mode-indicator">
          <div className="tour-mode-content">
            <span>Daycares selected for tours ({tourSelection.length}/5)</span>
            <div className="tour-buttons">
              <Button 
                variant="outline-light" 
                size="sm" 
                onClick={toggleTourMode}
                className="me-2"
              >
                Exit Tour Mode
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={openTourModal}
                disabled={tourSelection.length === 0}
              >
                Schedule Tours ({tourSelection.length})
              </Button>
            </div>
          </div>
        </div>
      )}'''
    
    content = re.sub(pattern, r'\1' + tour_indicator, content, flags=re.DOTALL, count=1)
    print("✅ Tour indicator added")
else:
    print("❌ Could not find comparison indicator - trying alternative method")
    
    # Alternative: Insert before the DaycareComparison modal
    alt_pattern = r'(\{/\* Daycare Comparison Modal \*/\})'
    if re.search(alt_pattern, content):
        tour_indicator = '''      {/* Tour Mode Indicator */}
      {tourMode && (
        <div className="tour-mode-indicator">
          <div className="tour-mode-content">
            <span>Daycares selected for tours ({tourSelection.length}/5)</span>
            <div className="tour-buttons">
              <Button 
                variant="outline-light" 
                size="sm" 
                onClick={toggleTourMode}
                className="me-2"
              >
                Exit Tour Mode
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={openTourModal}
                disabled={tourSelection.length === 0}
              >
                Schedule Tours ({tourSelection.length})
              </Button>
            </div>
          </div>
        </div>
      )}
      
      ''' 
        content = re.sub(alt_pattern, tour_indicator + r'\1', content, count=1)
        print("✅ Tour indicator added (alternative position)")

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("Done!")
