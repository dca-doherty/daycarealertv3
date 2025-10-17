#!/usr/bin/env python3

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

# Replace the payload construction
old_payload = '''            const payload = {
              parent_name: formData.parentName,
              parent_email: formData.parentEmail,
              parent_phone: formData.parentPhone,
              parent_address: formData.parentAddress || '',
              number_of_children: formData.numberOfChildren,
              children_ages: formData.childrenAges,
              preferred_start_date: formData.preferredStartDate,
              available_days: formData.availableDays,
              preferred_time_slots: formData.preferredTimeSlots.join(', '),
              additional_notes: formData.additionalNotes || '',
              daycares: tourSelection.map(d => ({
                operation_id: d.operation_id,
                operation_name: d.operation_name,
                location_address: d.location_address,
                location_city: d.location_city,
                location_state: d.location_state,
                location_zip: d.location_zip
              }))
            };'''

new_payload = '''            const payload = {
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
            };'''

if old_payload in content:
    content = content.replace(old_payload, new_payload)
    print("✅ Payload structure fixed!")
else:
    print("❌ Could not find exact payload match")

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)
