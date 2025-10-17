#!/usr/bin/env python3

with open('public/index.html', 'r') as f:
    content = f.read()

# Add table headers fix in the head (high priority)
if 'table-headers-fix.js' not in content:
    content = content.replace(
        '<!-- *** CRITICAL JS - HIGH PRIORITY - Load immediately *** -->',
        '''<!-- *** CRITICAL JS - HIGH PRIORITY - Load immediately *** -->
    <script src="%PUBLIC_URL%/js/table-headers-fix.js"></script>'''
    )
    print("✅ Added table-headers-fix.js to head")

with open('public/index.html', 'w') as f:
    f.write(content)
