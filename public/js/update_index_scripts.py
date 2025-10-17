#!/usr/bin/env python3

with open('public/index.html', 'r') as f:
    content = f.read()

# Find the body closing section and add scripts
old_body_end = '''    <!-- Fix for cost estimator (priority loading) -->

    <!-- Fix for favorite notifications -->
    <!-- Fix for mobile violations table --> 
    <!-- Simple select fix for mobile (lower priority) -->
    <!-- Fix for PDF export functionality -->
    <!-- Buy Me a Coffee donation button -->
  </body>'''

new_body_end = '''    <!-- Fix for favorite notifications -->
    <script src="%PUBLIC_URL%/js/direct-favorite-fix.js" defer></script>
    
    <!-- Fix for mobile violations table --> 
    <script src="%PUBLIC_URL%/js/mobile-violations-fix.js" defer></script>
    
    <!-- Fix for PDF export functionality -->
    <script src="%PUBLIC_URL%/js/fix-pdf-export.js" defer></script>
    
    <!-- Buy Me a Coffee donation button -->
    <script src="%PUBLIC_URL%/js/buy-me-coffee.js" defer></script>
  </body>'''

content = content.replace(old_body_end, new_body_end)

with open('public/index.html', 'w') as f:
    f.write(content)

print("✅ Updated index.html with scripts")
