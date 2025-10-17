#!/usr/bin/env python3

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

# Replace openTourModal to show a simple alert with selections
old_function = '''  const openTourModal = useCallback(() => {
    if (tourSelection.length > 0) {
      setShowTourModal(true);
    } else {
      alert('Please select at least one daycare to schedule a tour');
    }
  }, [tourSelection.length]);'''

new_function = '''  const openTourModal = useCallback(() => {
    console.log('openTourModal called, tourSelection:', tourSelection);
    if (tourSelection.length > 0) {
      console.log('Setting showTourModal to true');
      setShowTourModal(true);
    } else {
      alert('Please select at least one daycare to schedule a tour');
    }
  }, [tourSelection.length]);'''

content = content.replace(old_function, new_function)

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("✅ Added debug logging")
