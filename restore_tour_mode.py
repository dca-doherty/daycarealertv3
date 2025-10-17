#!/usr/bin/env python3

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

print("Restoring tour mode functionality...")

# 1. Add imports at the top (after DaycareComparison import)
if 'import TourRequestModal' not in content:
    content = content.replace(
        "import DaycareComparison from '../components/DaycareComparison';",
        "import DaycareComparison from '../components/DaycareComparison';\nimport TourRequestModal from '../components/TourScheduling/TourRequestModal';"
    )
    print("✅ Added TourRequestModal import")

# 2. Add state variables after compareMode states
state_insert = '''  // Tour mode state
  const [tourMode, setTourMode] = useState(false);
  const [tourSelection, setTourSelection] = useState([]);
  const [showTourModal, setShowTourModal] = useState(false);
'''

if 'tourMode' not in content:
    # Find where to insert (after compareMode state)
    content = content.replace(
        '  const [showComparisonModal, setShowComparisonModal] = useState(false);',
        '  const [showComparisonModal, setShowComparisonModal] = useState(false);\n' + state_insert
    )
    print("✅ Added tour state variables")

# 3. Add tour functions after comparison functions
tour_functions = '''
  // Tour mode functions
  const toggleTourMode = useCallback(() => {
    setTourMode(prev => !prev);
    if (tourMode) {
      setTourSelection([]);
    }
  }, [tourMode]);

  const addToTourSelection = useCallback((daycare) => {
    setTourSelection(prev => {
      if (prev.some(d => d.operation_id === daycare.operation_id)) {
        return prev;
      }
      if (prev.length >= 5) {
        alert('Maximum 5 daycares can be selected for tours');
        return prev;
      }
      return [...prev, daycare];
    });
  }, []);

  const removeFromTourSelection = useCallback((daycare) => {
    setTourSelection(prev => prev.filter(d => d.operation_id !== daycare.operation_id));
  }, []);

  const isInTourSelection = useCallback((daycare) => {
    return tourSelection.some(d => d.operation_id === daycare.operation_id);
  }, [tourSelection]);

  const openTourModal = useCallback(() => {
    if (tourSelection.length > 0) {
      setShowTourModal(true);
    } else {
      alert('Please select at least one daycare to schedule a tour');
    }
  }, [tourSelection.length]);

  const closeTourModal = useCallback(() => {
    setShowTourModal(false);
  }, []);
'''

if 'toggleTourMode' not in content:
    # Insert after removeFromComparison
    content = content.replace(
        '  }, [daycareComparison]);',
        '  }, [daycareComparison]);' + tour_functions,
        1  # Only replace first occurrence
    )
    print("✅ Added tour functions")

# 4. Add useEffect for window globals
useeffect_code = '''
  // Initialize window global variables
  useEffect(() => {
    window.daycarealertCompareMode = compareMode;
    window.daycareComparisonCount = daycareComparison.length;
    window.toggleCompareMode = toggleCompareMode;
    window.openComparisonModal = openComparisonModal;
    window.daycarealertTourMode = tourMode;
    window.tourSelectionCount = tourSelection.length;
    window.toggleTourMode = toggleTourMode;
    window.openTourModal = openTourModal;
    
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
  }, [compareMode, daycareComparison.length, toggleCompareMode, openComparisonModal, tourMode, tourSelection.length, toggleTourMode, openTourModal]);
'''

if 'window.daycarealertTourMode' not in content:
    # Find handleDaycareSelect and insert before it
    content = content.replace(
        '  // Handle daycare selection',
        useeffect_code + '\n  // Handle daycare selection'
    )
    print("✅ Added window globals useEffect")

# 5. Update handleDaycareSelect to handle tour mode
if 'if (tourMode)' not in content:
    old_select = '''  const handleDaycareSelect = useCallback((daycare, fromComparison = false) => {
    if (fromComparison || compareMode) {'''
    
    new_select = '''  const handleDaycareSelect = useCallback((daycare, fromComparison = false) => {
    if (tourMode && !fromComparison) {
      if (isInTourSelection(daycare)) {
        removeFromTourSelection(daycare);
        showNotification(`Removed ${daycare.operation_name} from tour list`, 'info');
      } else {
        addToTourSelection(daycare);
        showNotification(`Added ${daycare.operation_name} to tour list`, 'success');
      }
      return;
    }
    
    if (fromComparison || compareMode) {'''
    
    content = content.replace(old_select, new_select)
    print("✅ Updated handleDaycareSelect for tour mode")

# 6. Add tour modal and indicator in JSX
tour_ui = '''
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
      )}

      {/* Tour Request Modal */}
      <TourRequestModal
        isOpen={showTourModal}
        selectedDaycares={tourSelection}
        onClose={closeTourModal}
        onSubmit={async (formData) => {
          try {
            const payload = {
              parentInfo: {
                parentName: formData.parentName,
                parentEmail: formData.parentEmail,
                parentPhone: formData.parentPhone,
                parentAddress: formData.parentAddress || '',
                numberOfChildren: formData.numberOfChildren,
                childrenAges: formData.childrenAges,
                preferredStartDate: formData.preferredStartDate,
                availableDays: formData.availableDays,
                preferredTimeSlots: formData.preferredTimeSlots,
                additionalNotes: formData.additionalNotes || ''
              },
              selectedDaycares: tourSelection.map(d => ({
                operation_id: d.operation_id,
                operation_name: d.operation_name,
                operation_type: d.operation_type,
                location_address: d.location_address,
                location_city: d.location_city,
                location_state: d.location_state,
                location_zip: d.location_zip
              }))
            };

            const response = await fetch('/api/tour-requests', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok && data.success) {
              alert(`✅ Success! Tour request #${data.tourRequestId} submitted!\\n\\nConfirmation emails have been sent.`);
              setTourSelection([]);
              setTourMode(false);
              closeTourModal();
            } else {
              throw new Error(data.message || 'Failed to submit tour request');
            }
          } catch (error) {
            console.error('Error submitting tour request:', error);
            alert('❌ Failed to submit tour request. Please try again.');
          }
        }}
      />
'''

if '<TourRequestModal' not in content:
    # Insert before the closing fragment
    content = content.replace(
        '    </>\n  );\n};\n\nexport default OptimizedMySqlHome;',
        tour_ui + '    </>\n  );\n};\n\nexport default OptimizedMySqlHome;'
    )
    print("✅ Added tour UI components")

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("\n🎉 Tour mode restored!")
