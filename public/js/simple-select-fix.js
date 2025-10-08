/**
 * Simple Select Fix for Mobile
 * 
 * This script applies minimal enhancements to make the city selector work better on mobile
 * Without interfering with the regular functionality or causing performance issues
 * 
 * NOTE: This script is now disabled for the cost estimator page, as that page is
 * handled by cost-estimator-fix.js
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('Simple select fix loaded');
  
  // DISABLED: This functionality is now handled by cost-estimator-fix.js
  const fixCostEstimatorPage = function() {
    // Don't run any code here - the cost-estimator-fix.js script handles all fixes
    console.log('Cost estimator fixes are now handled by cost-estimator-fix.js');
    return;
  };
  
  // Fix the home page filter
  const fixHomePage = function() {
    // Get the city filter input
    const cityFilterInput = document.getElementById('city-filter-input');
    if (cityFilterInput) {
      console.log('Found city-filter-input on home page');
      
      // Add mobile-friendly styling
      cityFilterInput.style.fontSize = '16px';
      cityFilterInput.style.height = '44px';
      
      // Make sure the clear filters button works
      const clearFiltersBtn = document.querySelector('.clear-filters-button');
      if (clearFiltersBtn && !clearFiltersBtn.dataset.fixed) {
        clearFiltersBtn.dataset.fixed = 'true';
        
        // Get original click handler
        const originalClick = clearFiltersBtn.onclick;
        
        clearFiltersBtn.addEventListener('click', function(e) {
          console.log('Clear filters clicked');
          
          // Clear all inputs and selects
          document.querySelectorAll('input, select').forEach(el => {
            if (el.tagName === 'INPUT') {
              el.value = '';
            } else if (el.tagName === 'SELECT') {
              el.selectedIndex = 0;
            }
          });
          
          // Call original handler if it exists
          if (typeof originalClick === 'function') {
            originalClick.call(this, e);
          }
        });
      }
    }
  };

  // Run fixes
  fixHomePage();
  setTimeout(fixCostEstimatorPage, 1000);
  
  // Also run after window load
  window.addEventListener('load', function() {
    fixHomePage();
    setTimeout(fixCostEstimatorPage, 1000);
  });
  
  // Add mobile-specific CSS
  const style = document.createElement('style');
  style.textContent = `
    /* Ensure proper height for mobile inputs */
    @media (max-width: 768px) {
      .city-search-input, 
      #city-filter-input {
        height: 44px !important;
        font-size: 16px !important;
      }
      
      /* Make sure mobile dropdowns are visible */
      .filter-group,
      .filter-row,
      .advanced-filters.expanded {
        position: relative;
        z-index: 10;
      }
    }
  `;
  document.head.appendChild(style);
});
