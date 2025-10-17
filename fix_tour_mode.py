#!/usr/bin/env python3
import re

# Read the file
with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

# 1. Add tour state variables after comparison state variables
tour_state = '''
  // State for tour selection
  const [tourMode, setTourMode] = useState(false);
  const [tourSelection, setTourSelection] = useState([]);
  const [showTourModal, setShowTourModal] = useState(false);
  '''

# Find the line with comparison state and add tour state after it
content = re.sub(
    r'(const \[showComparisonModal, setShowComparisonModal\] = useState\(false\);)',
    r'\1' + tour_state,
    content
)

# 2. Add tour functions after comparison functions
tour_functions = '''
  // Tour mode functions
  const toggleTourMode = useCallback(() => {
    const newTourMode = !tourMode;
    setTourMode(newTourMode);
    
    // Update window global variables
    window.daycarealertTourMode = newTourMode;
    window.tourSelectionCount = newTourMode ? tourSelection.length : 0;
    
    if (tourMode) {
      // If turning off tour mode, clear the selection
      setTourSelection([]);
      window.tourSelectionCount = 0;
    }
  }, [tourMode, tourSelection.length]);

  // Open tour modal
  const openTourModal = useCallback(() => {
    if (tourSelection.length > 0) {
      setShowTourModal(true);
    } else {
      alert('Please add at least one daycare to your tour list');
    }
  }, [tourSelection.length]);

  // Check if daycare is in tour selection
  const isInTourSelection = useCallback((daycare) => {
    return tourSelection.some(d => d.operation_id === daycare.operation_id);
  }, [tourSelection]);

  // Add daycare to tour selection
  const addToTourSelection = useCallback((daycare) => {
    if (!tourSelection.some(d => d.operation_id === daycare.operation_id)) {
      const newSelection = [...tourSelection, daycare];
      setTourSelection(newSelection);
      
      // Update window global variable
      window.tourSelectionCount = newSelection.length;
      
      // Show notification
      const notification = document.createElement('div');
      notification.className = 'tour-notification';
      notification.textContent = `Added ${daycare.operation_name} to tour list`;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
    }
  }, [tourSelection]);

  // Remove daycare from tour selection
  const removeFromTourSelection = useCallback((daycare) => {
    const newSelection = tourSelection.filter(d => d.operation_id !== daycare.operation_id);
    setTourSelection(newSelection);
    
    // Update window global variable
    window.tourSelectionCount = newSelection.length;
  }, [tourSelection]);

  // Close tour modal
  const closeTourModal = useCallback(() => {
    setShowTourModal(false);
  }, []);
'''

# Find the comparison functions and add tour functions after
content = re.sub(
    r'(const removeFromComparison = useCallback\([^}]+\}\);[^}]+\}, \[daycareComparison\]\);)',
    r'\1' + tour_functions,
    content,
    flags=re.DOTALL
)

# 3. Update the useEffect that sets window globals to include tour variables
old_useeffect = r'''  // Initialize window global variables for cross-component communication
  useEffect\(\(\) => \{
    // Set window global variables
    window\.daycarealertCompareMode = compareMode;
    window\.daycareComparisonCount = daycareComparison\.length;
    window\.toggleCompareMode = toggleCompareMode;
    window\.openComparisonModal = openComparisonModal;
    
    // Clean up global variables when component unmounts
    return \(\) => \{
      window\.daycarealertCompareMode = undefined;
      window\.daycareComparisonCount = undefined;
      window\.toggleCompareMode = undefined;
      window\.openComparisonModal = undefined;
    \};
  \}, \[compareMode, daycareComparison\.length, toggleCompareMode, openComparisonModal\]\);'''

new_useeffect = '''  // Initialize window global variables for cross-component communication
  useEffect(() => {
    // Set window global variables
    window.daycarealertCompareMode = compareMode;
    window.daycareComparisonCount = daycareComparison.length;
    window.toggleCompareMode = toggleCompareMode;
    window.openComparisonModal = openComparisonModal;
    
    // Tour mode globals
    window.daycarealertTourMode = tourMode;
    window.tourSelectionCount = tourSelection.length;
    window.toggleTourMode = toggleTourMode;
    window.openTourModal = openTourModal;
    
    // Clean up global variables when component unmounts
    return () => {
      window.daycarealertCompareMode = undefined;
      window.daycareComparisonCount = undefined;
      window.toggleCompareMode = undefined;
      window.openComparisonModal = undefined;
      window.daycarealertTourMode = undefined;
      window.tourSelectionCount = undefined;
      window.toggleTourMode = undefined;
      window.openTourModal = undefined;
    };
  }, [compareMode, daycareComparison.length, toggleCompareMode, openComparisonModal, tourMode, tourSelection.length, toggleTourMode, openTourModal]);'''

content = re.sub(old_useeffect, new_useeffect, content)

# 4. Fix the handleDaycareSelect function to add tour mode check
old_handler = r'''  // Handle daycare selection from the data view
  const handleDaycareSelect = useCallback\(\(daycare, fromComparison = false\) => \{
    // If in compare mode and not coming from comparison modal, toggle selection
    if \(compareMode && !fromComparison\) \{
      // Toggle daycare in comparison - if already added, remove it
      if \(isInComparison\(daycare\)\) \{
        removeFromComparison\(daycare\);
      \} else \{
        addToComparison\(daycare\);
      \}
      return;
    \}'''

new_handler = '''  // Handle daycare selection from the data view
  const handleDaycareSelect = useCallback((daycare, fromComparison = false) => {
    // If in compare mode and not coming from comparison modal, toggle selection
    if (compareMode && !fromComparison) {
      // Toggle daycare in comparison - if already added, remove it
      if (isInComparison(daycare)) {
        removeFromComparison(daycare);
      } else {
        addToComparison(daycare);
      }
      return;
    }
    
    // If in tour mode, toggle tour selection
    if (tourMode) {
      if (isInTourSelection(daycare)) {
        removeFromTourSelection(daycare);
        // Show notification
        const notification = document.createElement('div');
        notification.className = 'tour-notification';
        notification.textContent = `Removed ${daycare.operation_name} from tour list`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      } else if (tourSelection.length < 5) {
        addToTourSelection(daycare);
      } else {
        alert('Maximum 5 daycares for tours');
      }
      return;
    }'''

content = re.sub(old_handler, new_handler, content)

# 5. Update the dependency array of handleDaycareSelect
old_deps = r'\[compareMode, initialTabView, isInComparison, addToComparison, removeFromComparison\]'
new_deps = '[compareMode, initialTabView, isInComparison, addToComparison, removeFromComparison, tourMode, isInTourSelection, addToTourSelection, removeFromTourSelection, tourSelection.length]'

content = re.sub(old_deps, new_deps, content)

# 6. Update the main container div to include tour mode class
content = re.sub(
    r'<div className=\{`daycare-data-container \$\{compareMode \? \'comparison-mode-active\' : \'\'\}`\}>',
    '<div className={`daycare-data-container ${compareMode ? \'comparison-mode-active\' : \'\'} ${tourMode ? \'tour-mode-active\' : \'\'}`}>',
    content
)

# 7. Add tour mode banner after comparison mode banner
tour_banner = '''
        
        {/* Visual indicator for tour mode */}
        {tourMode && (
          <div className="tour-mode-banner">
            <p>
              <strong>Tour Mode Active</strong> - Click daycares below to add them to your tour request (max 5)
              <br />
              <span className="tour-counter">{tourSelection.length} daycares selected</span>
            </p>
          </div>
        )}'''

content = re.sub(
    r'(\{/\* Visual indicator for comparison mode \*/\}[^}]+\{compareMode[^}]+\}\)\s+\})',
    r'\1' + tour_banner,
    content,
    flags=re.DOTALL
)

# 8. Add tour mode indicator after comparison mode indicator
tour_indicator = '''
      
      {/* Tour Mode Indicator */}
      {tourMode && (
        <div className="tour-mode-indicator">
          <div className="tour-mode-content">
            <span>Select daycares for tours ({tourSelection.length}/5 selected)</span>
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
                Schedule Tours
              </Button>
            </div>
          </div>
        </div>
      )}'''

# Find the comparison mode indicator and add tour indicator after
content = re.sub(
    r'(\{/\* Comparison Mode Indicator \*/\}[^}]+\{compareMode[^}]+\}\)\s+\})',
    r'\1' + tour_indicator,
    content,
    flags=re.DOTALL
)

# Write the updated content
with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("✅ Tour mode functionality added successfully!")
print("Next steps:")
print("1. Restart your app: pm2 restart daycarealert-api-secondary")
print("2. Check for any compilation errors in the logs")
