#!/usr/bin/env python3

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

# Find and replace the onSubmit handler with correct format
old_submit = '''        onSubmit={(formData) => {
          console.log('Tour request submitted:', formData);
          closeTourModal();
          // Here you could add API call to submit tour request
        }}'''

new_submit = '''        onSubmit={async (formData) => {
          try {
            // Prepare the request payload in the format the API expects
            const payload = {
              parentInfo: {
                parent_name: formData.parentName,
                parent_email: formData.parentEmail,
                parent_phone: formData.parentPhone,
                parent_address: formData.parentAddress || '',
                number_of_children: formData.numberOfChildren,
                children_ages: JSON.stringify(formData.childrenAges),
                preferred_start_date: formData.preferredStartDate,
                available_days: JSON.stringify(formData.availableDays),
                preferred_time_slots: formData.preferredTimeSlots.join(', '),
                additional_notes: formData.additionalNotes || ''
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

            console.log('Submitting tour request:', payload);

            // Call the API
            const response = await fetch('/api/tour-requests', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok && data.success) {
              console.log('Tour request successful:', data);
              alert(`✅ Success! Tour request #${data.tourRequestId} submitted!\\n\\nConfirmation emails have been sent to:\\n- ${formData.parentEmail}\\n- Selected daycare centers\\n\\nThey will contact you to schedule tours.`);
              
              // Clear the selection and close modal
              setTourSelection([]);
              setTourMode(false);
              closeTourModal();
            } else {
              throw new Error(data.message || 'Failed to submit tour request');
            }
          } catch (error) {
            console.error('Error submitting tour request:', error);
            alert('❌ Failed to submit tour request. Please try again or contact support.');
          }
        }}'''

content = content.replace(old_submit, new_submit)

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("✅ API payload format fixed!")
