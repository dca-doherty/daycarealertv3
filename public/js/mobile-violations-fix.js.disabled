/**
 * Direct Mobile Violations Table Fix
 * This script completely transforms tables in violations tabs for mobile devices.
 * Instead of trying to make horizontal tables work, it rebuilds them as vertical lists.
 */
(function() {
  // Function to check if we're on a mobile device
  function isMobileDevice() {
    return window.innerWidth <= 768;
  }

  // Function to transform a table to a mobile-friendly format
  function transformTable(table) {
    // Skip tables that are already transformed
    if (table.classList.contains('mobile-transformed')) {
      return;
    }

    // Get all headers
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    
    if (headers.length === 0) {
      console.log('No headers found in table');
      return;
    }

    console.log('Transforming table with headers:', headers);

    // Get all rows
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    
    // Create a container for our transformed content
    const mobileContainer = document.createElement('div');
    mobileContainer.className = 'mobile-violations-container';
    
    // Process each row
    rows.forEach((row, rowIndex) => {
      // Create a card for this row
      const card = document.createElement('div');
      card.className = 'mobile-violation-card';
      
      // Get all cells in this row
      const cells = Array.from(row.querySelectorAll('td'));
      
      // Create content for each cell
      cells.forEach((cell, cellIndex) => {
        if (cellIndex < headers.length) {
          // Create a field container
          const field = document.createElement('div');
          field.className = 'mobile-violation-field';
          
          // Label
          const label = document.createElement('div');
          label.className = 'mobile-field-label';
          label.textContent = headers[cellIndex];
          field.appendChild(label);
          
          // Value
          const value = document.createElement('div');
          value.className = 'mobile-field-value';
          
          // Handle HTML content
          if (cell.innerHTML.includes('<')) {
            value.innerHTML = cell.innerHTML;
          } else {
            value.textContent = cell.textContent;
          }
          
          // Special styling for risk levels
          if (headers[cellIndex].includes('Risk') || headers[cellIndex].includes('Level')) {
            const cellText = cell.textContent.trim().toLowerCase();
            if (cellText.includes('high') && cellText.includes('medium')) {
              value.classList.add('medium-high-risk');
            } else if (cellText.includes('high')) {
              value.classList.add('high-risk');
            } else if (cellText.includes('medium')) {
              value.classList.add('medium-risk');
            } else if (cellText.includes('low')) {
              value.classList.add('low-risk');
            }
          }
          
          field.appendChild(value);
          card.appendChild(field);
        }
      });
      
      // Add the card to the container
      mobileContainer.appendChild(card);
    });
    
    // Add styles for our mobile view
    if (!document.getElementById('mobile-violations-styles')) {
      const style = document.createElement('style');
      style.id = 'mobile-violations-styles';
      style.textContent = `
        @media (max-width: 768px) {
          .mobile-violations-container {
            display: block;
            width: 100%;
          }
          
          .mobile-violation-card {
            margin-bottom: 15px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            background-color: white;
            overflow: hidden;
          }
          
          .mobile-violation-field {
            padding: 10px 15px;
            border-bottom: 1px solid #eee;
          }
          
          .mobile-violation-field:last-child {
            border-bottom: none;
          }
          
          .mobile-field-label {
            font-weight: bold;
            font-size: 0.9rem;
            color: #495057;
            margin-bottom: 5px;
          }
          
          .mobile-field-value {
            font-size: 1rem;
            word-break: break-word;
          }
          
          .mobile-field-value.high-risk {
            color: #dc3545;
            font-weight: bold;
          }
          
          .mobile-field-value.medium-high-risk {
            color: #fd7e14;
            font-weight: bold;
          }
          
          .mobile-field-value.medium-risk {
            color: #ffc107;
            font-weight: bold;
          }
          
          .mobile-field-value.low-risk {
            color: #6c757d;
          }
          
          /* Hide the original table on mobile */
          .mobile-table-hidden {
            display: none !important;
          }
        }
        
        /* Show the original table on desktop */
        @media (min-width: 769px) {
          .mobile-violations-container {
            display: none !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Insert the mobile container after the table
    table.parentNode.insertBefore(mobileContainer, table.nextSibling);
    
    // Mark the table as transformed
    table.classList.add('mobile-transformed');
    
    // Hide the original table on mobile
    if (isMobileDevice()) {
      table.classList.add('mobile-table-hidden');
    }
    
    console.log('Table transformation complete');
  }

  // Function to find and transform all violation tables
  function findAndTransformTables() {
    // Only proceed on mobile devices
    if (!isMobileDevice()) {
      console.log('Not a mobile device, skipping table transformation');
      return;
    }
    
    console.log('Searching for violations tables to transform');
    
    // Look for tables in violation tabs or with violations class
    const tables = document.querySelectorAll(
      '[id*="violations"] table, ' + 
      '.violations-table, ' + 
      '[id*="violations"] .table, ' +
      '.react-bootstrap-table table'
    );
    
    if (tables.length > 0) {
      console.log(`Found ${tables.length} tables to transform`);
      
      tables.forEach((table, index) => {
        console.log(`Transforming table ${index + 1}`);
        transformTable(table);
      });
    } else {
      console.log('No violations tables found, will try again later');
      // Try again in a moment, in case content is loaded dynamically
      setTimeout(findAndTransformTables, 1000);
    }
  }
  
  // Run when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', findAndTransformTables);
  } else {
    // Run immediately if DOM is already loaded
    findAndTransformTables();
  }
  
  // Also run when tabs are changed, as this might load new content
  document.addEventListener('click', function(event) {
    if (event.target.classList.contains('nav-link') || 
        event.target.closest('.nav-link')) {
      console.log('Tab change detected, will check for tables');
      setTimeout(findAndTransformTables, 300);
    }
  });
  
  // Set up a mutation observer to catch dynamically added content
  const observer = new MutationObserver(function(mutations) {
    let shouldTransform = false;
    
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check added nodes for new tables or tab content
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            if (node.id && (node.id.includes('violations') || 
                            node.classList.contains('tab-pane')) || 
                node.querySelector && (node.querySelector('[id*="violations"]') ||
                                    node.querySelector('table'))) {
              shouldTransform = true;
            }
          }
        });
      }
    });
    
    if (shouldTransform) {
      console.log('Detected dynamic content changes, checking for new tables');
      setTimeout(findAndTransformTables, 300);
    }
  });
  
  // Start observing the body
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Also check periodically for any tables we might have missed
  setInterval(findAndTransformTables, 3000);
  
  // Re-check on window resize, in case device orientation changes
  window.addEventListener('resize', function() {
    // Find all transformed tables
    const transformedTables = document.querySelectorAll('.mobile-transformed');
    
    // Toggle visibility based on current viewport
    if (isMobileDevice()) {
      transformedTables.forEach(table => {
        table.classList.add('mobile-table-hidden');
      });
    } else {
      transformedTables.forEach(table => {
        table.classList.remove('mobile-table-hidden');
      });
    }
  });
  
  console.log('Mobile violations table fix initialized');
})();
