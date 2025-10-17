#!/usr/bin/env python3

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

# Find the current modal render
old_modal = '''      {/* Tour Request Modal */}
      {showTourModal && (
        <TourRequestModal
          selectedDaycares={tourSelection}
          onClose={closeTourModal}
          onRemove={removeFromTourSelection}
        />
      )}'''

# Replace with correct props
new_modal = '''      {/* Tour Request Modal */}
      <TourRequestModal
        isOpen={showTourModal}
        selectedDaycares={tourSelection}
        onClose={closeTourModal}
        onSubmit={(formData) => {
          console.log('Tour request submitted:', formData);
          closeTourModal();
          // Here you could add API call to submit tour request
        }}
      />'''

content = content.replace(old_modal, new_modal)

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("✅ Modal props fixed!")
