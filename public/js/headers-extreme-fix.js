/**
 * Headers Extreme Fix - v1.0
 * Most aggressive solution for ensuring headers are visible
 */

(function() {
  console.log('Headers Extreme Fix initializing');
  
  // Apply fixes immediately and with delays
  applyHeadersFix();
  setTimeout(applyHeadersFix, 100);
  setTimeout(applyHeadersFix, 500);
  setTimeout(applyHeadersFix, 1000);
  
  // Set up a continuous checker
  setInterval(applyHeadersFix, 2000);
  
  // Apply on DOMContentLoaded and load
  document.addEventListener('DOMContentLoaded', applyHeadersFix);
  window.addEventListener('load', applyHeadersFix);
  
  // Track URL changes for SPA navigation
  let lastUrl = location.href;
  setInterval(() => {
    if (lastUrl !== location.href) {
      lastUrl = location.href;
      // Force fix application after navigation
      setTimeout(applyHeadersFix, 500);
      setTimeout(applyHeadersFix, 1000);
    }
  }, 500);
  
  // Main fix function that uses multiple approaches
  function applyHeadersFix() {
    // 1. Attack by direct element selection by column position
    fixHeadersByPosition();
    
    // 2. Attack by scanning text content
    fixHeadersByText();
    
    // 3. Attack by injecting new elements if needed
    injectHeadersIfMissing();
    
    // 4. Apply inline styling to ensure visibility
    forceHeaderVisibility();
  }
  
  // Fix by column position
  function fixHeadersByPosition() {
    // Get all table headers from tables in ResponsiveDataTable
    const tables = document.querySelectorAll('.responsive-table table, .table');
    
    tables.forEach(table => {
      const headerRow = table.querySelector('thead tr');
      if (!headerRow) return;
      
      const headers = headerRow.querySelectorAll('th');
      if (headers.length < 5) return;
      
      // Est. Price is typically in position 5 (index 4)
      const priceHeader = headers[4];
      if (priceHeader) {
        const priceDiv = priceHeader.querySelector('div');
        if (priceDiv) {
          ensureHeaderVisible(priceDiv, 'Est. Price');
        }
      }
      
      // Years is typically in position 6 (index 5)
      const yearsHeader = headers[5];
      if (yearsHeader) {
        const yearsDiv = yearsHeader.querySelector('div');
        if (yearsDiv) {
          ensureHeaderVisible(yearsDiv, 'Years');
        }
      }
    });
  }
  
  // Fix by scanning for matching text
  function fixHeadersByText() {
    document.querySelectorAll('th div').forEach(div => {
      const text = div.textContent.trim();
      
      if (text.includes('Est. Price') || text.includes('Monthly Cost')) {
        ensureHeaderVisible(div, 'Est. Price');
      }
      
      if (text.includes('Years')) {
        ensureHeaderVisible(div, 'Years');
      }
    });
  }
  
  // Inject headers if missing
  function injectHeadersIfMissing() {
    const tables = document.querySelectorAll('.responsive-table table, .table');
    
    tables.forEach(table => {
      const headerRow = table.querySelector('thead tr');
      if (!headerRow) return;
      
      const headers = headerRow.querySelectorAll('th');
      if (headers.length < 5) return;
      
      // Check for Est. Price
      const priceHeader = headers[4];
      if (priceHeader) {
        let priceDiv = priceHeader.querySelector('div');
        
        // If no div exists or it's empty, create a new one
        if (!priceDiv || !priceDiv.textContent.trim()) {
          if (priceDiv) {
            priceDiv.remove(); // Remove empty div
          }
          
          priceDiv = document.createElement('div');
          priceDiv.className = 'header';
          priceDiv.textContent = 'Est. Price';
          ensureHeaderVisible(priceDiv, 'Est. Price');
          priceHeader.appendChild(priceDiv);
        }
      }
      
      // Check for Years
      const yearsHeader = headers[5];
      if (yearsHeader) {
        let yearsDiv = yearsHeader.querySelector('div');
        
        // If no div exists or it's empty, create a new one
        if (!yearsDiv || !yearsDiv.textContent.trim()) {
          if (yearsDiv) {
            yearsDiv.remove(); // Remove empty div
          }
          
          yearsDiv = document.createElement('div');
          yearsDiv.className = 'header';
          yearsDiv.textContent = 'Years';
          ensureHeaderVisible(yearsDiv, 'Years');
          yearsHeader.appendChild(yearsDiv);
        }
      }
    });
  }
  
  // Apply maximum styling to ensure visibility
  function forceHeaderVisibility() {
    // Force columns to be visible in the table
    const tables = document.querySelectorAll('.responsive-table table, .table');
    
    tables.forEach(table => {
      const style = document.createElement('style');
      style.textContent = `
        .responsive-table th:nth-child(5),
        .responsive-table th:nth-child(6),
        .responsive-table td:nth-child(5),
        .responsive-table td:nth-child(6) {
          display: table-cell !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
      `;
      document.head.appendChild(style);
    });
  }
  
  // Helper to ensure a header is fully visible and properly styled
  function ensureHeaderVisible(element, text) {
    // Check if the header already has text - don't override if it does
    if (!element.textContent.trim() && text) {
      element.textContent = text;
    }
    
    // Apply class if needed
    if (!element.classList.contains('header')) {
      element.classList.add('header');
    }
    
    // Apply aggressive inline styling
    const styles = {
      'display': 'block',
      'visibility': 'visible',
      'opacity': '1',
      'color': '#000',
      'font-weight': 'bold',
      'padding': '8px',
      'background-color': 'transparent',
      'text-shadow': '0 0 1px rgba(0,0,0,0.3)',
      'position': 'relative',
      'z-index': '10'
    };
    
    Object.keys(styles).forEach(prop => {
      element.style[prop] = styles[prop];
    });
    
    // Prevent click propagation
    element.addEventListener('click', function(e) {
      e.stopPropagation();
    }, true);
  }
})();
