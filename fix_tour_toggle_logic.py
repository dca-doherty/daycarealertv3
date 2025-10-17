#!/usr/bin/env python3

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

# Fix the toggle logic - need to check the NEW value, not old
old_toggle = '''  const toggleTourMode = useCallback(() => {
    setTourMode(prev => !prev);
    if (tourMode) {
      setTourSelection([]);
    } else {
      // Disable compare mode when activating tour mode
      setCompareMode(false);
      setDaycareComparison([]);
    }
  }, [tourMode]);'''

new_toggle = '''  const toggleTourMode = useCallback(() => {
    setTourMode(prev => {
      const newValue = !prev;
      // Update window global immediately
      window.daycarealertTourMode = newValue;
      
      if (!newValue) {
        // Turning OFF tour mode - clear selections
        setTourSelection([]);
      } else {
        // Turning ON tour mode - disable compare mode
        setCompareMode(false);
        setDaycareComparison([]);
      }
      
      return newValue;
    });
  }, []);'''

content = content.replace(old_toggle, new_toggle)

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("✅ Fixed toggle logic!")
