/**
 * City Input Immediate Fix - v3.0
 * Ensures the city search input appears immediately on page load
 * WITHOUT requiring a page refresh
 * 
 * Critical improvements:
 * 1. Uses MutationObserver to detect when React renders the form
 * 2. Forces immediate execution with high priority
 * 3. Multiple fallbacks for reliable operation
 * 4. Pre-fetches city data from API if possible
 */

// Execute immediately without waiting for any events
(function() {
  // Check if we're on the cost estimator page
  if (!window.location.href.includes('cost-estimator')) {
    return;
  }

  console.log('City input immediate fix v3.0 initializing');
  
  // Create a global variable to track if we've applied fixes
  window.cityInputFixed = false;
  
  // Try to fix immediately and multiple times with increasing delays
  applyFix();
  setTimeout(applyFix, 50);
  setTimeout(applyFix, 100);
  setTimeout(applyFix, 200);
  setTimeout(applyFix, 300);
  setTimeout(applyFix, 500);
  setTimeout(applyFix, 1000);
  
  // Also try on various document ready states
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    applyFix();
  } else {
    document.addEventListener('DOMContentLoaded', applyFix);
  }
  
  window.addEventListener('load', applyFix);
  
  // Set up MutationObserver to watch for when React renders the form
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // Look for elements that might indicate the form is being rendered
        const citySelect = document.getElementById('city-select');
        const estimatorForm = document.querySelector('.estimator-form');
        const cardHeader = document.querySelector('.card-header');
        
        if (citySelect || (estimatorForm && cardHeader)) {
          applyFix();
        }
      }
    }
  });
  
  // Start observing the entire document
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  
  // Fetch cities from API in advance if possible
  try {
    const baseUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:8084' 
      : 'https://api.daycarealert.com';
      
    fetch(`${baseUrl}/api/mysql-optimized/daycares/cities/list`)
      .then(response => response.json())
      .then(data => {
        if (data && data.length > 0) {
          console.log(`Pre-fetched ${data.length} cities`);
          window.preloadedCities = data;
          applyFix(); // Try again after cities are loaded
        }
      })
      .catch(error => {
        console.warn('Could not pre-fetch cities:', error);
      });
  } catch (e) {
    console.warn('Error attempting to pre-fetch cities:', e);
  }
  
  /**
   * Main function to apply the fix
   */
  function applyFix() {
    // If we've already successfully fixed it, don't do it again
    if (window.cityInputFixed === true) {
      return;
    }
    
    console.log('Applying city input fix...');
    
    // Look for the form
    const form = document.querySelector('.estimator-form') || 
                document.querySelector('form') ||
                document.querySelector('[class*="estimator"]');
    
    if (!form) {
      return; // Form not found yet
    }
    
    // Find the city select element with multiple strategies
    const citySelect = document.getElementById('city-select') || 
                      form.querySelector('select[name="city"]') ||
                      form.querySelector('select[id*="city"]');
    
    if (!citySelect) {
      return; // City select not found yet
    }
    
    // Find the parent container
    const parent = citySelect.parentNode;
    if (!parent) {
      return; // No parent available
    }
    
    // Check if we already created an input
    const existingInput = document.getElementById('city-filter-input') || 
                         document.getElementById('city-search');
                         
    if (existingInput && window.getComputedStyle(existingInput).display !== 'none') {
      // If input exists and is visible, just make sure it's fully styled
      existingInput.style.display = 'block';
      existingInput.style.visibility = 'visible';
      existingInput.style.opacity = '1';
      existingInput.style.width = '100%';
      existingInput.style.height = window.innerWidth <= 767 ? '44px' : '38px';
      
      // Mark as fixed
      window.cityInputFixed = true;
      return;
    }
    
    // Get cities, either from preloaded data or from the select options
    let cities = [];
    
    // Try to use preloaded cities
    if (window.preloadedCities && window.preloadedCities.length > 0) {
      cities = window.preloadedCities;
    }
    // Fall back to select options
    else if (citySelect.options && citySelect.options.length > 0) {
      cities = Array.from(citySelect.options)
        .filter(option => option.value)
        .map(option => option.value);
    }
    // Last resort fallback - use common Texas cities
    else {
      cities = [
        "ABILENE", "AMARILLO", "ARLINGTON", "AUSTIN", "BEAUMONT", "CORPUS CHRISTI", 
        "DALLAS", "DENTON", "EL PASO", "FORT WORTH", "FRISCO", "GALVESTON", "GARLAND", 
        "HOUSTON", "IRVING", "LUBBOCK", "MCALLEN", "MCKINNEY", "MIDLAND", "ODESSA",
        "PLANO", "SAN ANGELO", "SAN ANTONIO", "TYLER", "WACO", "WICHITA FALLS"
      ];
    }
    
    console.log(`Creating city search with ${cities.length} cities available`);
    
    // Create datalist element
    let datalist = document.getElementById('city-options');
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = 'city-options';
      
      // Add options to datalist
      cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        datalist.appendChild(option);
      });
      
      document.body.appendChild(datalist);
    }
    
    // Create search container
    const searchContainer = document.createElement('div');
    searchContainer.className = 'city-search-wrapper form-group mb-3';
    searchContainer.style.cssText = 'display: block !important; width: 100% !important; margin-bottom: 1rem !important;';
    
    // Create label
    const label = document.createElement('label');
    label.htmlFor = 'city-filter-input';
    label.textContent = 'City';
    label.className = 'form-label';
    label.style.cssText = 'display: block !important; margin-bottom: 0.5rem !important;';
    
    // Create search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'city-filter-input';
    searchInput.className = 'form-control city-search-input';
    searchInput.placeholder = 'Type to search cities...';
    searchInput.setAttribute('list', 'city-options');
    searchInput.setAttribute('autocomplete', 'off');
    searchInput.style.cssText = 'display: block !important; width: 100% !important; height: 38px !important; padding: 8px 12px !important; font-size: 16px !important; border: 1px solid #ced4da !important; border-radius: 4px !important; background-color: white !important;';
    
    // Mobile styling adjustments
    if (window.innerWidth <= 767) {
      searchInput.style.fontSize = '16px';
      searchInput.style.height = '44px';
      searchInput.style.padding = '10px 12px';
    }
    
    // Create help text
    const helpText = document.createElement('small');
    helpText.className = 'form-text text-muted';
    helpText.textContent = 'Start typing a city name';
    helpText.style.cssText = 'display: block !important; margin-top: 4px !important;';
    
    // Add input event listener
    searchInput.addEventListener('input', function() {
      const value = this.value;
      
      // Find matching option
      const matchingOption = Array.from(citySelect.options).find(option => 
        option.value.toLowerCase() === value.toLowerCase()
      );
      
      if (matchingOption) {
        citySelect.value = matchingOption.value;
        
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        citySelect.dispatchEvent(event);
      }
    });
    
    // Hide the original select and any existing label
    citySelect.style.display = 'none';
    const existingLabel = parent.querySelector('label[for="city-select"]');
    if (existingLabel) {
      existingLabel.style.display = 'none';
    }
    
    // Assemble everything
    searchContainer.appendChild(label);
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(helpText);
    
    // Add to the DOM before the hidden select
    parent.insertBefore(searchContainer, citySelect);
    
    // Mark as successfully fixed
    window.cityInputFixed = true;
    console.log('City input fix successfully applied!');
  }
  
  // Add critical CSS
  const style = document.createElement('style');
  style.textContent = `
    /* Critical city input styles */
    .city-search-wrapper {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      width: 100% !important;
      margin-bottom: 1rem !important;
      position: relative !important;
    }
    
    .city-search-input,
    #city-filter-input {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      width: 100% !important;
      height: 38px !important;
      padding: 8px 12px !important;
      font-size: 16px !important;
      border: 1px solid #ced4da !important;
      border-radius: 4px !important;
      background-color: white !important;
    }
    
    /* Mobile optimization */
    @media (max-width: 767px) {
      .city-search-input,
      #city-filter-input {
        height: 44px !important;
        font-size: 16px !important;
        padding: 10px 12px !important;
      }
    }
    
    /* Hide the original select */
    #city-select,
    select[name="city"],
    select[id*="city"] {
      display: none !important;
    }
  `;
  
  document.head.appendChild(style);
})();
