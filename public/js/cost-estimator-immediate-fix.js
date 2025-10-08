/**
 * CRITICAL PRIORITY: Cost Estimator Immediate Fix v4.0
 * Force-renders the city search input immediately on page load and route changes
 * This is a fail-safe approach when all other fixes don't work
 */

(function() {
  console.log('Cost Estimator emergency fix v4.0 initializing');
  
  // Global variables
  let fixApplied = false;
  let fixAttempts = 0;
  let maxAttempts = 20;
  let citySelectFound = false;
  
  // Function to check if we're on the cost estimator page
  function isOnCostEstimatorPage() {
    return window.location.href.includes('/cost-estimator');
  }
  
  // Immediately check if we're on the cost estimator page
  if (!isOnCostEstimatorPage()) {
    console.log('Not on cost estimator page, emergency fix not needed');
    return;
  }
  
  // Detect SPA navigation after initial load
  let lastUrl = window.location.href;
  const body = document.querySelector('body');
  
  // Create an observer to detect route changes
  const observer = new MutationObserver(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;
      
      // Check if we've navigated to the cost estimator page
      if (isOnCostEstimatorPage()) {
        console.log('Detected navigation to cost estimator page, reapplying fix');
        fixApplied = false;
        fixAttempts = 0;
        scheduleFixAttempts();
      }
    }
  });
  
  // Start observing the body for changes
  observer.observe(body, { childList: true, subtree: true });
  
  // Schedule multiple fix attempts with increasing delays
  function scheduleFixAttempts() {
    // Try immediately
    applyFix();
    
    // Schedule a series of attempts with increasing delays
    setTimeout(applyFix, 50);
    setTimeout(applyFix, 100);
    setTimeout(applyFix, 200);
    setTimeout(applyFix, 500);
    setTimeout(applyFix, 1000);
    setTimeout(applyFix, 2000);
    
    // Set up an interval for additional attempts
    const fixInterval = setInterval(() => {
      if (fixApplied || fixAttempts >= maxAttempts) {
        clearInterval(fixInterval);
        
        if (!fixApplied) {
          console.log('Maximum fix attempts reached, trying last resort method');
          lastResortFix();
        }
        return;
      }
      
      applyFix();
    }, 500);
  }
  
  // Function to apply the fix
  function applyFix() {
    if (fixApplied) {
      return; // Don't apply the fix again if it's already been applied
    }
    
    fixAttempts++;
    console.log(`Cost Estimator fix attempt ${fixAttempts}/${maxAttempts}`);
    
    // Find the form
    const form = document.querySelector('.estimator-form') || 
                document.querySelector('form') ||
                document.querySelector('[class*="cost-estimator"]') ||
                document.querySelector('[class*="estimator"]');
    
    if (!form) {
      console.log('Form not found yet, will try again');
      return;
    }
    
    // Try multiple selectors to find the city container
    const possibleCityContainers = [
      form.querySelector('.form-group:nth-child(1)'),
      form.querySelector('.form-group:first-of-type'),
      form.querySelector('.card:first-of-type .card-body .row:first-of-type .col:first-of-type'),
      form.querySelector('.row:first-of-type .col-md-6:first-of-type'),
      form.querySelector('[class*="city"]'),
      form.querySelector('div:has(select#city-select)'),
      form.querySelector('div:has(select[name="city"])'),
      document.querySelector('.card-header:contains("Location") + .card-body .row .col-md-6:first-of-type')
    ].filter(Boolean);
    
    // Find city select element
    let citySelect = null;
    citySelect = document.getElementById('city-select') || 
                form.querySelector('select[name="city"]') ||
                form.querySelector('select[id*="city"]');
    
    if (citySelect) {
      citySelectFound = true;
    } else if (!citySelectFound) {
      console.log('City select not found yet, will try again');
      return;
    }
    
    // See if our search input already exists
    const existingInput = document.getElementById('city-search-emergency') || 
                         document.getElementById('city-filter-input') || 
                         document.getElementById('city-search');
    
    if (existingInput && window.getComputedStyle(existingInput).display !== 'none') {
      console.log('City input already exists and is visible, fix successful!');
      fixApplied = true;
      return;
    }
    
    // If we get here, we need to create or fix the city input
    console.log('Creating emergency city input component');
    
    // Find where to insert our input
    let targetContainer = null;
    
    // Try each possible container
    for (const container of possibleCityContainers) {
      if (container) {
        targetContainer = container;
        break;
      }
    }
    
    if (!targetContainer && citySelect) {
      // If we found the select but not a good container, use the select's parent
      targetContainer = citySelect.parentNode;
    }
    
    if (!targetContainer) {
      console.log('Could not find a container for the city input, will try again');
      return;
    }
    
    // Create our search container
    const searchContainer = document.createElement('div');
    searchContainer.id = 'emergency-city-container';
    searchContainer.className = 'form-group mb-3 city-search-wrapper';
    searchContainer.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; width: 100% !important; margin-bottom: 1rem !important; position: relative !important; z-index: 999 !important;';
    
    // Create the label
    const label = document.createElement('label');
    label.htmlFor = 'city-search-emergency';
    label.textContent = 'City';
    label.className = 'form-label';
    label.style.cssText = 'display: block !important; margin-bottom: 0.5rem !important; font-weight: 500 !important;';
    
    // Create the input
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'city-search-emergency';
    input.className = 'form-control city-search-input';
    input.placeholder = 'Type to search cities...';
    input.autocomplete = 'off';
    input.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; width: 100% !important; height: 38px !important; font-size: 1rem !important; padding: 8px 12px !important; border: 1px solid #ced4da !important; border-radius: 0.25rem !important; background-color: #fff !important; z-index: 1000 !important;';
    
    // Add help text
    const helpText = document.createElement('small');
    helpText.className = 'text-muted form-text';
    helpText.textContent = 'Start typing a city name';
    helpText.style.cssText = 'display: block !important; margin-top: 0.25rem !important;';
    
    // Create datalist for autocomplete
    let cityDatalist = document.getElementById('emergency-city-options');
    if (!cityDatalist) {
      cityDatalist = document.createElement('datalist');
      cityDatalist.id = 'emergency-city-options';
      
      // Default Texas cities if we don't have any
      const defaultCities = [
        "ABILENE", "AMARILLO", "ARLINGTON", "AUSTIN", "BEAUMONT", "CORPUS CHRISTI", 
        "DALLAS", "DENTON", "EL PASO", "FORT WORTH", "FRISCO", "GALVESTON", "GARLAND", 
        "HOUSTON", "IRVING", "LUBBOCK", "MCALLEN", "MCKINNEY", "MIDLAND", "ODESSA",
        "PLANO", "SAN ANGELO", "SAN ANTONIO", "TYLER", "WACO", "WICHITA FALLS"
      ];
      
      // If we found the select, use its options instead
      if (citySelect && citySelect.options) {
        const cities = Array.from(citySelect.options)
          .filter(option => option.value)
          .map(option => option.value);
          
        if (cities.length > 0) {
          console.log(`Using ${cities.length} cities from the select element`);
          cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            cityDatalist.appendChild(option);
          });
        } else {
          // Use default cities if the select didn't have any
          defaultCities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            cityDatalist.appendChild(option);
          });
        }
      } else {
        // Use default cities if we didn't find a select
        defaultCities.forEach(city => {
          const option = document.createElement('option');
          option.value = city;
          cityDatalist.appendChild(option);
        });
      }
      
      document.body.appendChild(cityDatalist);
    }
    
    // Connect input to datalist
    input.setAttribute('list', 'emergency-city-options');
    
    // Add event listener to update the hidden select when the input changes
    input.addEventListener('input', function() {
      if (!citySelect) return;
      
      const value = this.value;
      
      // Find matching option
      for (let i = 0; i < citySelect.options.length; i++) {
        if (citySelect.options[i].value.toLowerCase() === value.toLowerCase()) {
          citySelect.value = citySelect.options[i].value;
          
          // Trigger change event
          const event = new Event('change', { bubbles: true });
          citySelect.dispatchEvent(event);
          break;
        }
      }
    });
    
    // Assemble the container
    searchContainer.appendChild(label);
    searchContainer.appendChild(input);
    searchContainer.appendChild(helpText);
    
    // Hide the existing city select and label if they exist
    if (citySelect) {
      citySelect.style.display = 'none';
      const cityLabel = targetContainer.querySelector('label[for="city-select"]');
      if (cityLabel) {
        cityLabel.style.display = 'none';
      }
    }
    
    // Insert our container at the beginning of the target container
    targetContainer.insertBefore(searchContainer, targetContainer.firstChild);
    
    // Try to unhide any potentially hidden city form elements
    const citySearchInputs = document.querySelectorAll('.city-search-input, #city-search, #city-filter-input');
    citySearchInputs.forEach(input => {
      input.style.display = 'block';
      input.style.visibility = 'visible';
      input.style.opacity = '1';
    });
    
    console.log('Emergency city input successfully created and inserted!');
    fixApplied = true;
  }
  
  // Last resort method - totally recreate the location section
  function lastResortFix() {
    // Find the most general container that might exist
    const container = document.querySelector('.cost-estimator-container') || 
                     document.querySelector('.container') ||
                     document.body;
    
    // Get possible cities
    let cities = [];
    const citySelect = document.getElementById('city-select');
    
    if (citySelect && citySelect.options) {
      cities = Array.from(citySelect.options)
        .filter(option => option.value)
        .map(option => option.value);
    }
    
    if (cities.length === 0) {
      // Fallback cities
      cities = [
        "ABILENE", "AMARILLO", "ARLINGTON", "AUSTIN", "BEAUMONT", "CORPUS CHRISTI", 
        "DALLAS", "DENTON", "EL PASO", "FORT WORTH", "FRISCO", "GALVESTON", "GARLAND", 
        "HOUSTON", "IRVING", "LUBBOCK", "MCALLEN", "MCKINNEY", "MIDLAND", "ODESSA",
        "PLANO", "SAN ANGELO", "SAN ANTONIO", "TYLER", "WACO", "WICHITA FALLS"
      ];
    }
    
    // Create our custom location form
    const locationSection = document.createElement('div');
    locationSection.id = 'emergency-location-section';
    locationSection.className = 'card mb-4';
    locationSection.innerHTML = `
      <div class="card-header">Location Information</div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-6">
            <div class="form-group mb-3">
              <label for="emergency-city-input">City</label>
              <input 
                type="text" 
                id="emergency-city-input" 
                class="form-control city-search-input" 
                placeholder="Type to search cities..."
                autocomplete="off"
                style="display: block !important; visibility: visible !important; opacity: 1 !important;"
              />
              <small class="text-muted">Start typing a city name</small>
            </div>
          </div>
          <div class="col-md-6">
            <div class="form-group mb-3">
              <label for="emergency-zip-input">ZIP Code (optional)</label>
              <input 
                type="text" 
                id="emergency-zip-input" 
                class="form-control" 
                placeholder="Enter ZIP code for more accurate estimates"
                maxlength="5"
                style="display: block !important;"
              />
              <small class="text-muted">Texas ZIP codes only. If left blank, we'll use a default for your selected city.</small>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Create datalist for autocomplete
    const datalist = document.createElement('datalist');
    datalist.id = 'emergency-cities-datalist';
    
    cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city;
      datalist.appendChild(option);
    });
    
    // Find where to insert our custom form
    let targetElement = document.querySelector('.card-header:contains("Location")');
    if (targetElement) {
      const existingCard = targetElement.closest('.card');
      if (existingCard) {
        // Replace the existing card
        existingCard.parentNode.replaceChild(locationSection, existingCard);
        console.log('Replaced existing location card with emergency version');
      } else {
        // Insert at the beginning of the container
        container.insertBefore(locationSection, container.firstChild);
        console.log('Added emergency location section to beginning of container');
      }
    } else {
      // Insert at the beginning of the container
      container.insertBefore(locationSection, container.firstChild);
      console.log('Added emergency location section to beginning of container');
    }
    
    // Add datalist to the body
    document.body.appendChild(datalist);
    
    // Connect input to datalist
    const cityInput = document.getElementById('emergency-city-input');
    if (cityInput) {
      cityInput.setAttribute('list', 'emergency-cities-datalist');
      
      // If we have the original select, sync values with it
      if (citySelect) {
        cityInput.addEventListener('input', function() {
          const value = this.value;
          
          for (let i = 0; i < citySelect.options.length; i++) {
            if (citySelect.options[i].value.toLowerCase() === value.toLowerCase()) {
              citySelect.value = citySelect.options[i].value;
              
              // Trigger change event
              const event = new Event('change', { bubbles: true });
              citySelect.dispatchEvent(event);
              break;
            }
          }
        });
      }
    }
    
    // Connect zip input
    const zipInput = document.getElementById('emergency-zip-input');
    if (zipInput) {
      const originalZipInput = document.getElementById('zip-code');
      if (originalZipInput) {
        zipInput.addEventListener('input', function() {
          originalZipInput.value = this.value;
          
          // Trigger change event
          const event = new Event('change', { bubbles: true });
          originalZipInput.dispatchEvent(event);
        });
      }
    }
    
    fixApplied = true;
    console.log('Last resort emergency fix applied successfully!');
  }
  
  // Add critical CSS to make inputs visible
  const style = document.createElement('style');
  style.textContent = `
    /* Super important - highest priority CSS */
    #emergency-city-container,
    .city-search-wrapper,
    #emergency-location-section {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      z-index: 9999 !important;
      pointer-events: auto !important;
    }
    
    #city-search-emergency,
    #emergency-city-input,
    .city-search-input,
    input.city-search-input,
    input[id*="city"],
    #city-filter-input {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      width: 100% !important;
      height: 38px !important;
      padding: 8px 12px !important;
      border: 1px solid #ced4da !important;
      border-radius: 0.25rem !important;
      background-color: #fff !important;
      z-index: 1000 !important;
      position: static !important;
    }
    
    /* Ensure form is visible */
    .estimator-form,
    .card-body,
    .form-group,
    .col-md-6 {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    
    /* Hide original select */
    #city-select,
    select[name="city"],
    select[id*="city"] {
      display: none !important;
    }
    
    /* Mobile optimization */
    @media (max-width: 767px) {
      #city-search-emergency,
      #emergency-city-input,
      .city-search-input,
      input.city-search-input {
        height: 44px !important;
        font-size: 16px !important;
        padding: 10px 12px !important;
      }
    }
  `;
  
  document.head.appendChild(style);
  
  // Start our fix attempts
  scheduleFixAttempts();
})();
