#!/usr/bin/env python3

with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

# Fix the parentInfo object to use camelCase
old_parentinfo = '''              parentInfo: {
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
              },'''

new_parentinfo = '''              parentInfo: {
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
              },'''

content = content.replace(old_parentinfo, new_parentinfo)

with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("✅ Changed to camelCase property names!")
