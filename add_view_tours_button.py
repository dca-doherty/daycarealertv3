#!/usr/bin/env python3

with open('src/components/UnifiedSearch.js', 'r') as f:
    content = f.read()

print("Adding VIEW TOUR SCHEDULE button...")

# Find the tour section and add a button (like comparison has)
old_tour_section = '''        <div className="comparison-controls">
          <button
            id="select-tours-button"
            className="comparison-toggle-button"
            onClick={() => {
              if (window.toggleTourMode) {
                window.toggleTourMode();
              }
            }}
          >
            {window.daycarealertTourMode ? "EXIT TOUR MODE" : "SELECT DAYCARES FOR TOURS"}
          </button>
          <div style={{fontSize: "14px", color: "#333", marginTop: "10px"}}>
            Click daycares below to add them to your tour request (max 5)
          </div>
        </div>'''

new_tour_section = '''        <div className="comparison-controls">
          <button
            id="select-tours-button"
            className="comparison-toggle-button"
            onClick={() => {
              if (window.toggleTourMode) {
                window.toggleTourMode();
              }
            }}
          >
            {window.daycarealertTourMode ? "EXIT TOUR MODE" : "SELECT DAYCARES FOR TOURS"}
          </button>
          {window.daycarealertTourMode && (
            <div style={{marginTop: "10px"}}>
              <button
                className="comparison-view-button"
                onClick={() => {
                  if (window.openTourModal) {
                    window.openTourModal();
                  }
                }}
                disabled={window.tourSelectionCount === 0}
              >
                VIEW TOUR SCHEDULE ({window.tourSelectionCount || 0})
              </button>
            </div>
          )}
          <div style={{fontSize: "14px", color: "#333", marginTop: "10px"}}>
            Click daycares below to add them to your tour request (max 5)
          </div>
        </div>'''

if old_tour_section in content:
    content = content.replace(old_tour_section, new_tour_section)
    print("✅ Button added to UnifiedSearch")
else:
    print("❌ Could not find tour section")

with open('src/components/UnifiedSearch.js', 'w') as f:
    f.write(content)

print("Done!")
