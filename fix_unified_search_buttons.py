#!/usr/bin/env python3

with open('src/components/UnifiedSearch.js', 'r') as f:
    content = f.read()

# Fix comparison toggle button - remove tour toggle call
content = content.replace(
    '''              onClick={() => {
              if (window.toggleTourMode) {
                window.toggleTourMode();
              }
                if (window.toggleCompareMode) {
                  window.toggleCompareMode();
                }
              }}''',
    '''              onClick={() => {
                if (window.toggleCompareMode) {
                  window.toggleCompareMode();
                }
              }}'''
)

# Fix view comparison button - remove tour toggle call
content = content.replace(
    '''                  onClick={() => {
              if (window.toggleTourMode) {
                window.toggleTourMode();
              }
                    if (window.openComparisonModal) {
                      window.openComparisonModal();
                    }
                  }}''',
    '''                  onClick={() => {
                    if (window.openComparisonModal) {
                      window.openComparisonModal();
                    }
                  }}'''
)

with open('src/components/UnifiedSearch.js', 'w') as f:
    f.write(content)

print("✅ Fixed button handlers!")
