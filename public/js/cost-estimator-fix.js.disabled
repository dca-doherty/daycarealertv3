/**
 * Cost Estimator Critical Fix - v2.0
 * Completely rewritten to solve critical issues:
 * 1. Double dropdown arrows on mobile
 * 2. City search input requiring refresh to appear
 */

// Run immediately without waiting for DOMContentLoaded
(function() {
  console.log('Cost Estimator Fix v2.0 loading immediately');
  
  // Only run on the cost estimator page
  if (!window.location.href.includes('cost-estimator')) {
    return;
  }
  
  // Inject critical CSS immediately
  injectCriticalStyles();
  
  // Try to fix immediately
  fixCostEstimator();
  
  // Also try on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', fixCostEstimator);
  
  // And on window load
  window.addEventListener('load', fixCostEstimator);
  
  // Set up multiple intervals with different timings for maximum reliability
  const intervals = [
    setInterval(fixCostEstimator, 50),   // Try every 50ms for the first 500ms
    setInterval(fixCostEstimator, 200),  // Try every 200ms for the first 2s
    setInterval(fixCostEstimator, 1000)  // Try every 1s as a fallback
  ];
  
  // Clear intervals after enough time has passed
  setTimeout(() => {
    clearInterval(intervals[0]);
    fixCostEstimator(); // Try again after clearing
  }, 500);
  
  setTimeout(() => {
    clearInterval(intervals[1]);
    fixCostEstimator(); // Try again after clearing
  }, 2000);
  
  setTimeout(() => {
    clearInterval(intervals[2]);
    fixCostEstimator(); // Final attempt
  }, 5000);
  
  // Watch for DOM changes to detect when the form might be rendered by React
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && 
          (mutation.target.classList.contains('estimator-form') || 
           mutation.target.querySelector('.estimator-form'))) {
        fixCostEstimator();
      }
    }
  });
  
  // Start observing the document body for DOM changes
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true
  });
  
  /**
   * Main fix function - applies all necessary fixes for the cost estimator
   */
  function fixCostEstimator() {
    console.log('Applying cost estimator fix attempt');
    
    // Find form elements with multiple fallback selectors for reliability
    const form = document.querySelector('.estimator-form') || 
                document.querySelector('form') ||
                document.querySelector('[class*="estimator"]');
    
    if (!form) {
      console.log('Could not find estimator form');
      return;
    }
    
    // Add identification class to the form
    form.classList.add('estimator-form');
    form.classList.add('estimator-form-fixed');
    
    // Apply a body ID to help with CSS specificity
    document.body.id = 'body-cost-estimator';
    
    // Find city select
    const citySelect = document.getElementById('city-select') || 
                      form.querySelector('select[id*="city"]') ||
                      form.querySelector('select.form-control:first-of-type');
    
    if (!citySelect) {
      console.log('Could not find city select');
      return;
    }
    
    // Find age group and other selects
    const ageGroupSelect = document.getElementById('age-group') || 
                          form.querySelector('select[id*="age"]') ||
                          form.querySelectorAll('select.form-control')[1];
    
    const allSelects = form.querySelectorAll('select');
    
    // Fix all select elements to prevent double arrows
    allSelects.forEach(fixSelectElement);
    
    // Find existing city search input
    const existingCityInput = document.getElementById('city-search');
    
    // If we already created the city input and it's initialized, just ensure it's visible
    if (existingCityInput && existingCityInput.getAttribute('data-fixed') === 'true') {
      console.log('City input already exists and is initialized');
      ensureCityInputVisible(existingCityInput);
      return;
    }
    
    // Create a datalist element if it doesn't exist
    let datalist = document.getElementById('city-datalist');
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = 'city-datalist';
      
      // Create options in the datalist from the select
      Array.from(citySelect.options).forEach(function(option) {
        if (!option.value) return; // Skip empty options
        
        const dataOption = document.createElement('option');
        dataOption.value = option.value;
        datalist.appendChild(dataOption);
      });
      
      document.body.appendChild(datalist);
    }
    
    // Ensure the city select parent is available
    const citySelectParent = citySelect.parentNode;
    if (!citySelectParent) {
      console.log('City select has no parent!');
      return;
    }
    
    // Check if we need to create the city input or just enhance an existing one
    if (!existingCityInput) {
      createCitySearchInput(citySelect, citySelectParent, datalist);
    } else {
      enhanceExistingCityInput(existingCityInput, citySelect, datalist);
    }
    
    // Add special form submit and button click handlers
    setupFormHandlers(form, citySelect, ageGroupSelect);
  }
  
  /**
   * Directly injects critical CSS styles into the page head
   * This ensures our styles load before anything else
   */
  function injectCriticalStyles() {
    // Create a style tag with our critical CSS
    const style = document.createElement('style');
    style.id = 'cost-estimator-critical-css';
    style.textContent = `
      /* Critical mobile dropdown arrow fix */
      @media (max-width: 767px) {
        .estimator-form select,
        .estimator-form select.form-control,
        .estimator-form select.form-select,
        .estimator-form select.mobile-friendly-select {
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e") !important;
          background-repeat: no-repeat !important;
          background-position: right 0.75rem center !important;
          background-size: 16px 12px !important;
          padding-right: 2.5rem !important;
        }
        
        /* Override any potential menulist appearance */
        .mobile-friendly-select {
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
        }
      }
      
      /* City search input critical styles */
      #city-search,
      .city-search-input {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      
      .city-search-wrapper {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
    `;
    
    // Add the style tag to the head
    document.head.appendChild(style);
  }
  
  /**
   * Creates the city search input replacement
   */
  function createCitySearchInput(citySelect, citySelectParent, datalist) {
    console.log('Creating new city search input');
    
    // Create a new text input to replace the select
    const cityInput = document.createElement('input');
    cityInput.type = 'text';
    cityInput.id = 'city-search';
    cityInput.className = 'form-control city-search-input';
    cityInput.placeholder = 'Type to search cities...';
    cityInput.setAttribute('list', 'city-datalist');
    cityInput.setAttribute('data-fixed', 'true');
    cityInput.required = citySelect.required;
    
    // Apply critical inline styles for maximum reliability
    cityInput.style.display = 'block';
    cityInput.style.visibility = 'visible';
    cityInput.style.opacity = '1';
    cityInput.style.width = '100%';
    cityInput.style.height = window.innerWidth <= 767 ? '44px' : '38px';
    cityInput.style.fontSize = window.innerWidth <= 767 ? '16px' : '1rem';
    cityInput.style.padding = window.innerWidth <= 767 ? '10px 12px' : '8px 12px';
    cityInput.style.border = '1px solid #ced4da';
    cityInput.style.borderRadius = '0.25rem';
    cityInput.style.backgroundColor = '#fff';
    cityInput.style.webkitAppearance = 'none';
    cityInput.style.mozAppearance = 'none';
    cityInput.style.appearance = 'none';
    
    // Add event listeners to sync the input with the select
    cityInput.addEventListener('input', function() {
      syncCityInputWithSelect(this, citySelect);
    });
    
    // Add a label and wrapper
    const label = document.createElement('label');
    label.htmlFor = 'city-search';
    label.textContent = 'City';
    label.className = 'city-search-label';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group mb-3 city-search-wrapper';
    wrapper.style.display = 'block';
    wrapper.style.visibility = 'visible';
    wrapper.style.opacity = '1';
    wrapper.style.marginBottom = '1rem';
    
    wrapper.appendChild(label);
    wrapper.appendChild(cityInput);
    
    // Add a help text
    const helpText = document.createElement('small');
    helpText.className = 'form-text text-muted';
    helpText.textContent = 'Start typing a city name';
    wrapper.appendChild(helpText);
    
    // Find any existing city label to hide
    const cityLabel = citySelectParent.querySelector('label[for="city-select"]');
    if (cityLabel) {
      cityLabel.style.display = 'none';
    }
    
    // Hide the original select
    citySelect.style.display = 'none';
    
    // Insert our wrapper before the hidden select
    citySelectParent.insertBefore(wrapper, citySelect);
    
    // Hide any remaining duplicate labels
    setTimeout(() => {
      const allLabels = citySelectParent.querySelectorAll('label');
      if (allLabels.length > 1) {
        for (let i = 1; i < allLabels.length; i++) {
          allLabels[i].style.display = 'none';
        }
      }
    }, 0);
    
    ensureCityInputVisible(cityInput);
  }
  
  /**
   * Enhances an existing city input if it's already in the DOM
   */
  function enhanceExistingCityInput(cityInput, citySelect, datalist) {
    console.log('Enhancing existing city input');
    
    // Mark as fixed
    cityInput.setAttribute('data-fixed', 'true');
    
    // Add datalist connection
    cityInput.setAttribute('list', 'city-datalist');
    
    // Set required attribute if the select is required
    if (citySelect.required) {
      cityInput.required = true;
    }
    
    // Apply critical inline styles
    cityInput.style.display = 'block';
    cityInput.style.visibility = 'visible';
    cityInput.style.opacity = '1';
    cityInput.style.width = '100%';
    cityInput.style.height = window.innerWidth <= 767 ? '44px' : '38px';
    cityInput.style.fontSize = window.innerWidth <= 767 ? '16px' : '1rem';
    cityInput.style.padding = window.innerWidth <= 767 ? '10px 12px' : '8px 12px';
    
    // Make sure the wrapper is styled properly
    const wrapper = cityInput.closest('.city-search-wrapper') || cityInput.parentNode;
    if (wrapper) {
      wrapper.className = 'form-group mb-3 city-search-wrapper';
      wrapper.style.display = 'block';
      wrapper.style.visibility = 'visible';
      wrapper.style.opacity = '1';
      wrapper.style.marginBottom = '1rem';
    }
    
    // Add event listener if it doesn't have one already
    const hasInputListener = cityInput._hasInputListener;
    if (!hasInputListener) {
      cityInput.addEventListener('input', function() {
        syncCityInputWithSelect(this, citySelect);
      });
      cityInput._hasInputListener = true;
    }
    
    // Hide the original select
    citySelect.style.display = 'none';
    
    ensureCityInputVisible(cityInput);
  }
  
  /**
   * Fixes a select element to prevent double arrows
   */
  function fixSelectElement(select) {
    // Avoid touching our city search input if it exists
    if (select.id === 'city-search') return;
    
    // Add CSS class to help with styling
    select.classList.add('fixed-select');
    
    // Add inline styles to override mobile browser styling
    if (window.innerWidth <= 767) {
      select.style.webkitAppearance = 'none';
      select.style.mozAppearance = 'none';
      select.style.appearance = 'none';
      select.style.backgroundImage = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`;
      select.style.backgroundRepeat = 'no-repeat';
      select.style.backgroundPosition = 'right 0.75rem center';
      select.style.backgroundSize = '16px 12px';
      select.style.paddingRight = '2.5rem';
      
      // Set other consistent styles
      select.style.height = '44px';
      select.style.fontSize = '16px';
      select.style.border = '1px solid #ced4da';
      select.style.borderRadius = '0.25rem';
      select.style.backgroundColor = 'white';
    }
  }
  
  /**
   * Sync the city input value with the select
   */
  function syncCityInputWithSelect(cityInput, citySelect) {
    // Update the select value when input changes
    const selectedOption = Array.from(citySelect.options).find(
      option => option.value.toLowerCase() === cityInput.value.toLowerCase()
    );
    
    if (selectedOption) {
      citySelect.value = selectedOption.value;
      
      // Trigger change event on the select
      const event = new Event('change', { bubbles: true });
      citySelect.dispatchEvent(event);
      
      // Enable the calculate button if it exists
      const calculateButton = document.querySelector('.button-group .btn-primary');
      if (calculateButton) {
        calculateButton.disabled = false;
      }
    }
  }
  
  /**
   * Ensure the city input is visible
   */
  function ensureCityInputVisible(cityInput) {
    // Force visibility again
    cityInput.style.display = 'block';
    cityInput.style.visibility = 'visible';
    cityInput.style.opacity = '1';
    
    const wrapper = cityInput.closest('.city-search-wrapper') || cityInput.parentNode;
    if (wrapper) {
      wrapper.style.display = 'block';
      wrapper.style.visibility = 'visible';
      wrapper.style.opacity = '1';
      wrapper.style.height = 'auto';
    }
    
    // Force any parent container to be visible too
    let parent = wrapper ? wrapper.parentNode : cityInput.parentNode;
    while (parent && parent !== document.body) {
      parent.style.display = parent.style.display === 'none' ? 'block' : parent.style.display;
      parent.style.visibility = parent.style.visibility === 'hidden' ? 'visible' : parent.style.visibility;
      parent.style.opacity = parent.style.opacity === '0' ? '1' : parent.style.opacity;
      parent = parent.parentNode;
    }
  }
  
  /**
   * Set up form handlers for validation and submission
   */
  function setupFormHandlers(form, citySelect, ageGroupSelect) {
    // Only add handlers once
    if (form.getAttribute('data-handlers-added') === 'true') {
      return;
    }
    
    // Add form submit handler
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Validate form
      if (!validateForm()) {
        return false;
      }
      
      // Submit via calculate button
      const calculateButton = document.querySelector('.button-group .btn-primary');
      if (calculateButton) {
        calculateButton.disabled = false;
        calculateButton.click();
      }
      
      return false;
    });
    
    // Add custom validation
    function validateForm() {
      // Get city value from either input or select
      const cityInput = document.getElementById('city-search');
      const cityValue = cityInput ? cityInput.value : citySelect.value;
      
      // Check city
      if (!cityValue) {
        alert('Please select a city');
        if (cityInput) cityInput.focus();
        else citySelect.focus();
        return false;
      }
      
      // Check age group
      if (ageGroupSelect && !ageGroupSelect.value) {
        alert('Please select an age group');
        ageGroupSelect.focus();
        return false;
      }
      
      return true;
    }
    
    // Mark form as having handlers
    form.setAttribute('data-handlers-added', 'true');
    
    // Fix calculate button
    const calculateButton = document.querySelector('.button-group .btn-primary');
    if (calculateButton) {
      // Make sure it's enabled
      calculateButton.disabled = false;
      
      // Add mobile friendly class
      calculateButton.classList.add('mobile-friendly-button');
      
      // Add click handler if not already added
      if (!calculateButton.getAttribute('data-click-handler-added')) {
        calculateButton.addEventListener('click', function(e) {
          // Validate first
          if (!validateForm()) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
          
          // Make sure the button is enabled
          this.disabled = false;
        }, true);
        
        calculateButton.setAttribute('data-click-handler-added', 'true');
      }
    }
    
    // Fix reset button
    const resetButton = document.querySelector('.button-group .btn-outline-secondary');
    if (resetButton && !resetButton.getAttribute('data-click-handler-added')) {
      resetButton.addEventListener('click', function() {
        // Clear city input
        const cityInput = document.getElementById('city-search');
        if (cityInput) {
          cityInput.value = '';
        }
        
        // Reset original select
        citySelect.selectedIndex = 0;
        
        // Hide results section
        const resultsSection = document.querySelector('.estimate-result');
        if (resultsSection) {
          resultsSection.style.display = 'none';
        }
      });
      
      resetButton.setAttribute('data-click-handler-added', 'true');
    }
  }
})();
