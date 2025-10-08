/**
 * City Search Extreme Fix - v1.0
 * Aggressive fix to ensure city search input displays without requiring refresh
 */

(function() {
  console.log('City Search Extreme Fix initializing');
  
  // Run immediately and with progressive delays
  applyCitySearchFix();
  for (let i = 1; i <= 20; i++) {
    setTimeout(applyCitySearchFix, i * 250); // Run every 250ms for 5 seconds
  }
  
  // Set up continuous monitoring
  setInterval(applyCitySearchFix, 1000);
  
  // Apply on document ready and load
  document.addEventListener('DOMContentLoaded', applyCitySearchFix);
  window.addEventListener('load', applyCitySearchFix);
  
  // Monitor location changes for SPA navigation
  let lastUrl = location.href;
  setInterval(() => {
    const currentUrl = location.href;
    if (lastUrl !== currentUrl) {
      lastUrl = currentUrl;
      console.log('URL changed, applying city search fix');
      
      // Run fix with progressive delays after navigation
      for (let i = 1; i <= 20; i++) {
        setTimeout(applyCitySearchFix, i * 250);
      }
    }
    
    // Always check if we're on the cost estimator page
    if (currentUrl.includes('cost-estimator')) {
      applyCitySearchFix();
    }
  }, 500);
  
  // Main fix function
  function applyCitySearchFix() {
    // Only run on cost estimator page
    if (!window.location.href.includes('cost-estimator')) {
      return;
    }
    
    console.log('Applying city search fix on cost estimator page');
    
    // 1. Look for the location section
    const locationSections = [
      ...document.querySelectorAll('.location-section'),
      ...document.querySelectorAll('.cost-estimator-form > div:nth-child(2)'),
      ...document.querySelectorAll('form [data-section="location"]'),
      ...document.querySelectorAll('form > div:nth-child(2)')
    ];
    
    // Process all potential location sections
    locationSections.forEach(section => {
      if (!section) return;
      
      // Check if city input is missing or not visible
      let cityInput = section.querySelector('input[name="city"], .city-input, .city-search');
      let cityContainer = section.querySelector('.city-container, .city-input-container');
      
      // If city input exists but is not visible, make it visible
      if (cityInput && (
          getComputedStyle(cityInput).display === 'none' || 
          getComputedStyle(cityInput).visibility === 'hidden' ||
          !cityInput.offsetParent
      )) {
        console.log('Found hidden city input, making visible');
        cityInput.style.display = 'block';
        cityInput.style.visibility = 'visible';
        cityInput.style.opacity = '1';
        
        if (cityContainer) {
          cityContainer.style.display = 'block';
          cityContainer.style.visibility = 'visible';
          cityContainer.style.opacity = '1';
        }
      } 
      // If city input doesn't exist at all, create one
      else if (!cityInput) {
        console.log('No city input found, creating new one');
        createCityInput(section);
      }
    });
    
    // 2. If no location section found at all, look for the form and add city input
    if (locationSections.length === 0) {
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        // Check if this form looks like the cost estimator form
        if (form.querySelector('input[name="zip_code"], input[name="age"]')) {
          console.log('Found form, but no location section, creating one');
          
          // Create a location section
          const locationSection = document.createElement('div');
          locationSection.className = 'location-section';
          
          // Find a good insertion point (after zip code or age input)
          const zipInput = form.querySelector('input[name="zip_code"]');
          const ageInput = form.querySelector('input[name="age"]');
          
          if (zipInput && zipInput.parentNode) {
            form.insertBefore(locationSection, zipInput.parentNode.nextSibling);
          } else if (ageInput && ageInput.parentNode) {
            form.insertBefore(locationSection, ageInput.parentNode.nextSibling);
          } else {
            // Just insert at the beginning of the form
            form.insertBefore(locationSection, form.firstChild);
          }
          
          createCityInput(locationSection);
        }
      });
    }
    
    // 3. Check for any Select component that's supposed to be a city selector
    document.querySelectorAll('select, .select-container, [data-testid="city-select"]').forEach(select => {
      // Check if this might be a city select
      const label = select.previousElementSibling;
      const labelText = label && label.textContent ? label.textContent.toLowerCase() : '';
      
      if (labelText.includes('city') || 
          select.getAttribute('name') === 'city' || 
          select.getAttribute('id') === 'city' ||
          select.getAttribute('data-testid') === 'city-select') {
        
        console.log('Found city select component, ensuring visibility');
        select.style.display = 'block';
        select.style.visibility = 'visible';
        select.style.opacity = '1';
        
        if (label) {
          label.style.display = 'block';
          label.style.visibility = 'visible';
          label.style.opacity = '1';
        }
        
        // Ensure the select has some options
        if (select.tagName === 'SELECT' && select.options.length < 2) {
          loadCityOptions(select);
        }
      }
    });
  }
  
  // Helper to create a city input in a container
  function createCityInput(container) {
    // Create city label
    const label = document.createElement('label');
    label.className = 'input-label';
    label.htmlFor = 'city-input';
    label.textContent = 'City';
    
    // Create input container
    const inputContainer = document.createElement('div');
    inputContainer.className = 'city-input-container';
    
    // Create the input itself
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'city-input';
    input.name = 'city';
    input.className = 'form-control city-input';
    input.placeholder = 'Enter a city name';
    
    // Create datalist for autocomplete
    const datalist = document.createElement('datalist');
    datalist.id = 'city-options';
    input.setAttribute('list', 'city-options');
    
    // Add common Texas cities
    const popularCities = [
      'Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 
      'El Paso', 'Arlington', 'Corpus Christi', 'Plano', 'Irving',
      'Lubbock', 'Laredo', 'Garland', 'Frisco', 'McKinney', 'Denton'
    ];
    
    popularCities.forEach(city => {
      const option = document.createElement('option');
      option.value = city;
      datalist.appendChild(option);
    });
    
    // Assemble components
    inputContainer.appendChild(input);
    inputContainer.appendChild(datalist);
    
    // Add to container
    container.appendChild(label);
    container.appendChild(inputContainer);
    
    // Connect to form if possible
    const form = container.closest('form');
    if (form) {
      // Store the original form submission to intercept later
      const originalSubmit = form.onsubmit;
      
      form.onsubmit = function(e) {
        // Get city value and make sure it's included in the submission
        const cityValue = input.value;
        
        // Create or update city field in the form
        let cityField = form.querySelector('input[name="city"][type="hidden"]');
        if (!cityField) {
          cityField = document.createElement('input');
          cityField.type = 'hidden';
          cityField.name = 'city';
          form.appendChild(cityField);
        }
        
        cityField.value = cityValue;
        console.log('Setting city value for form submission:', cityValue);
        
        // Call original submit handler if it exists
        if (typeof originalSubmit === 'function') {
          return originalSubmit.call(this, e);
        }
      };
    }
    
    console.log('Created new city input');
  }
  
  // Helper to load common TX cities into a select element
  function loadCityOptions(select) {
    const cities = [
      '', // Empty option for placeholder
      'Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 
      'El Paso', 'Arlington', 'Corpus Christi', 'Plano', 'Irving',
      'Lubbock', 'Laredo', 'Garland', 'Frisco', 'McKinney', 'Denton'
    ];
    
    // Clear existing options
    select.innerHTML = '';
    
    // Add empty first option as placeholder
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select a city';
    placeholder.selected = true;
    placeholder.disabled = true;
    select.appendChild(placeholder);
    
    // Add all cities
    cities.forEach(city => {
      if (!city) return; // Skip empty string (already added placeholder)
      
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      select.appendChild(option);
    });
    
    console.log('Loaded city options into select');
  }
})();
