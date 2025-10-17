#!/usr/bin/env python3

with open('src/App.js', 'r') as f:
    content = f.read()

# Check if imports exist
has_commission = 'import CommissionDashboard' in content
has_enrollment = 'import EnrollmentConfirmation' in content

print(f"CommissionDashboard imported: {has_commission}")
print(f"EnrollmentConfirmation imported: {has_enrollment}")

if not has_commission or not has_enrollment:
    # Find the import section (after the last import statement before the function)
    # Add after the last page import
    import_line = "import ApiDocs from './pages/ApiDocs';"
    
    new_imports = import_line
    if not has_enrollment:
        new_imports += "\nimport EnrollmentConfirmation from './pages/EnrollmentConfirmation';"
    if not has_commission:
        new_imports += "\nimport CommissionDashboard from './pages/CommissionDashboard';"
    
    content = content.replace(import_line, new_imports)
    
    with open('src/App.js', 'w') as f:
        f.write(content)
    
    print("✅ Added missing imports")
else:
    print("✅ All imports present")
