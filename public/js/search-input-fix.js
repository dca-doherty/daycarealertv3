/**
 * Search Input Fix - Critical Priority Fix - v3.0
 * 
 * This script forces the city search input to appear immediately
 * with simplified functionality for better mobile performance
 * 
 * IMPORTANT: This script runs immediately and with highest priority.
 */

// Execute immediately without waiting for any events
(function() {
  console.log('City search input fix v3.0 running immediately');
  
  // Try to fix immediately and multiple times with increasing delays
  fixCityInput();
  setTimeout(fixCityInput, 100);
  setTimeout(fixCityInput, 300);
  setTimeout(fixCityInput, 600);
  
  // Also try on DOMContentLoaded and load events
  document.addEventListener('DOMContentLoaded', fixCityInput);
  window.addEventListener('load', fixCityInput);
  
  /**
   * Main function to transform the select into a search input
   */
  function fixCityInput() {
    // Only run on cost estimator page
    if (!window.location.href.includes('cost-estimator')) {
      return;
    }
    
    // Find city select with multiple fallback strategies
    const citySelect = document.getElementById('city-select') || 
                      document.querySelector('select[name="city"]') ||
                      document.querySelector('select[id*="city"]');
    
    if (!citySelect) {
      console.log('Could not find city select');
      return;
    }
    
    // Check if we already created an input and it's visible
    const existingInput = document.getElementById('city-filter-input');
    if (existingInput && existingInput.style.display !== 'none') {
      console.log('City input already exists and is visible');
      return;
    }
    
    // Get the parent container
    const parentContainer = citySelect.closest('.mb-3') || 
                           citySelect.closest('.form-group') ||
                           citySelect.parentNode;
    
    if (!parentContainer) {
      console.log('Could not find parent container');
      return;
    }
    
    // Find the city label if it exists
    const cityLabel = parentContainer.querySelector('label');
    
    console.log('Creating search input to replace select');
    
    // Create a container for our search input
    const searchContainer = document.createElement('div');
    searchContainer.className = 'city-search-wrapper';
    searchContainer.style.cssText = 'display: block !important; width: 100% !important; margin-bottom: 1rem !important; position: relative !important;';
    
    // Add a label
    const inputLabel = document.createElement('label');
    inputLabel.htmlFor = 'city-filter-input';
    inputLabel.textContent = 'City';
    inputLabel.className = 'form-label';
    inputLabel.style.cssText = 'display: block !important; margin-bottom: 0.5rem !important;';
    
    // Create the search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'city-filter-input';
    searchInput.className = 'form-control city-search-input';
    searchInput.placeholder = 'Type to search cities...';
    searchInput.style.cssText = 'display: block !important; width: 100% !important; height: 38px !important; padding: 8px 12px !important; font-size: 16px !important; border: 1px solid #ced4da !important; border-radius: 4px !important; background-color: white !important; visibility: visible !important; opacity: 1 !important;';
    
    // If we're on mobile
    if (window.innerWidth <= 767) {
      searchInput.style.height = '44px';
      searchInput.style.fontSize = '16px';
    }
    
    // Create datalist for autocomplete
    const datalist = document.createElement('datalist');
    datalist.id = 'city-options';
    
    // Add all cities to the datalist
    Array.from(citySelect.options).forEach(option => {
      if (!option.value) return; // Skip empty option
      
      const dataOption = document.createElement('option');
      dataOption.value = option.value;
      datalist.appendChild(dataOption);
    });
    
    // Connect the input to the datalist
    searchInput.setAttribute('list', 'city-options');
    searchInput.setAttribute('autocomplete', 'off');
    
    // Add event listener for input
    searchInput.addEventListener('input', function() {
      const value = this.value;
      
      // Check if the value matches any of the options
      for (let i = 0; i < citySelect.options.length; i++) {
        if (citySelect.options[i].value.toLowerCase() === value.toLowerCase()) {
          // Set the select value
          citySelect.value = citySelect.options[i].value;
          
          // Trigger change event
          const event = new Event('change', { bubbles: true });
          citySelect.dispatchEvent(event);
          break;
        }
      }
    });
    
    // Add help text
    const helpText = document.createElement('small');
    helpText.className = 'form-text text-muted';
    helpText.textContent = 'Start typing a city name';
    helpText.style.cssText = 'display: block !important; margin-top: 0.25rem !important;';
    
    // Assemble the components
    searchContainer.appendChild(inputLabel);
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(helpText);
    
    // Hide the original select
    citySelect.style.display = 'none';
    if (cityLabel) {
      cityLabel.style.display = 'none';
    }
    
    // Insert our container before the hidden select
    parentContainer.insertBefore(searchContainer, citySelect);
    
    // Add the datalist to the body
    document.body.appendChild(datalist);
    
    console.log('City search input created successfully');
  }
  
  // Add critical CSS to the head
  const style = document.createElement('style');
  style.innerHTML = `
    /* Hide original city select */
    #city-select, select[name="city"], select[id*="city"] {
      display: none !important;
    }
    
    /* Ensure city search input is visible */
    #city-filter-input, .city-search-input {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      width: 100% !important;
    }
    
    /* Mobile optimization */
    @media (max-width: 767px) {
      #city-filter-input, .city-search-input {
        height: 44px !important;
        font-size: 16px !important;
        padding: 10px 12px !important;
      }
    }
    
    /* Ensure dropdown arrows are consistent for other selects */
    .estimator-form select,
    .estimator-form .form-select {
      appearance: none !important;
      -webkit-appearance: none !important;
      -moz-appearance: none !important;
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e") !important;
      background-repeat: no-repeat !important;
      background-position: right 0.75rem center !important;
      background-size: 16px 12px !important;
      padding-right: 2.5rem !important;
    }
  `;
  
  document.head.appendChild(style);
})();
