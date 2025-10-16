/**
 * Cost Estimator Direct Fix - v1.0
 * Complete replacement for the city search section that bypasses React
 * This is a last resort approach when other fixes don't work
 */

(function() {
  // Only run on cost estimator page
  if (!window.location.href.includes('/cost-estimator')) {
    return;
  }
  
  console.log('Cost Estimator Direct Fix initializing');
  
  // Run on page load and after delays
  fixCostEstimator();
  setTimeout(fixCostEstimator, 0);
  setTimeout(fixCostEstimator, 100);
  setTimeout(fixCostEstimator, 300);
  setTimeout(fixCostEstimator, 500);
  setTimeout(fixCostEstimator, 1000);
  setTimeout(fixCostEstimator, 2000);
  
  // Run when DOM is ready
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    fixCostEstimator();
  } else {
    document.addEventListener('DOMContentLoaded', fixCostEstimator);
  }
  
  window.addEventListener('load', fixCostEstimator);
  
  // Set up interval to continue checking
  let attempts = 0;
  const maxAttempts = 20;
  const interval = setInterval(() => {
    attempts++;
    if (attempts >= maxAttempts) {
      clearInterval(interval);
    }
    fixCostEstimator();
  }, 500);
  
  // Track whether the fix has been successfully applied
  let fixApplied = false;
  
  // Possible Texas cities to use as fallback
  const fallbackCities = [
    "ABILENE", "AMARILLO", "ARLINGTON", "AUSTIN", "BEAUMONT", "CORPUS CHRISTI", 
    "DALLAS", "DENTON", "EL PASO", "FORT WORTH", "FRISCO", "GALVESTON", "GARLAND", 
    "HOUSTON", "IRVING", "LUBBOCK", "MCALLEN", "MCKINNEY", "MIDLAND", "ODESSA",
    "PLANO", "SAN ANGELO", "SAN ANTONIO", "TYLER", "WACO", "WICHITA FALLS"
  ];
  
  // Function to apply the fix
  function fixCostEstimator() {
    // Don't run if already fixed
    if (fixApplied) return;
    
    // Find the location section in the cost estimator
    const locationSection = document.querySelector('.card-header:contains("Location")') || 
                            document.querySelector('.card-header:contains("location")');
                            
    if (!locationSection) {
      console.log('Location section not found yet');
      return;
    }
    
    // Find the card that contains the location section
    const card = locationSection.closest('.card');
    if (!card) {
      console.log('Location card not found');
      return;
    }
    
    // Find the card body
    const cardBody = card.querySelector('.card-body');
    if (!cardBody) {
      console.log('Card body not found');
      return;
    }
    
    // Check if our custom city input exists and is visible
    const customCityInput = document.getElementById('direct-fix-city-input');
    if (customCityInput && window.getComputedStyle(customCityInput).display !== 'none') {
      console.log('Custom city input already exists and is visible');
      fixApplied = true;
      return;
    }
    
    console.log('Creating direct city input replacement');
    
    // Find any existing city select (to sync values with)
    const existingCitySelect = document.getElementById('city-select') || 
                               document.querySelector('select[name="city"]') || 
                               document.querySelector('select[id*="city"]');
    
    // Get cities from existing select or use fallback
    let cities = [];
    if (existingCitySelect && existingCitySelect.options) {
      cities = Array.from(existingCitySelect.options)
        .filter(option => option.value)
        .map(option => option.value);
    }
    
    if (cities.length === 0) {
      cities = fallbackCities;
    }
    
    // Create datalist for autocomplete
    let datalist = document.getElementById('direct-fix-cities');
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = 'direct-fix-cities';
      
      cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        datalist.appendChild(option);
      });
      
      document.body.appendChild(datalist);
    }
    
    // Create completely new content for the card body
    cardBody.innerHTML = `
      <div class="row direct-fix-row">
        <div class="col-md-6">
          <div class="form-group mb-3 city-search-wrapper">
            <label for="direct-fix-city-input" class="form-label">City</label>
            <input 
              type="text" 
              id="direct-fix-city-input" 
              class="form-control city-search-input" 
              placeholder="Type to search cities..." 
              list="direct-fix-cities"
              autocomplete="off"
              style="display: block !important; visibility: visible !important; opacity: 1 !important; width: 100% !important; height: 38px !important; padding: 8px 12px !important; font-size: 16px !important; border: 1px solid #ced4da !important; border-radius: 4px !important; background-color: white !important;"
            />
            <small class="form-text text-muted">Start typing a city name</small>
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group mb-3">
            <label for="direct-fix-zip-input" class="form-label">ZIP Code (optional)</label>
            <input 
              type="text" 
              id="direct-fix-zip-input" 
              class="form-control" 
              placeholder="Enter ZIP code for more accurate estimates"
              maxlength="5"
            />
            <small class="form-text text-muted">Texas ZIP codes only. If left blank, we'll use a default for your selected city.</small>
          </div>
        </div>
      </div>
    `;
    
    // Make sure any existing selects are hidden
    if (existingCitySelect) {
      existingCitySelect.style.display = 'none';
      existingCitySelect.style.visibility = 'hidden';
      existingCitySelect.style.position = 'absolute';
      existingCitySelect.style.pointerEvents = 'none';
    }
    
    // Find any existing zip input
    const existingZipInput = document.getElementById('zip-code') || 
                            document.querySelector('input[id*="zip"]') || 
                            document.querySelector('input[name*="zip"]');
    
    // Connect our new inputs to the existing ones for data syncing
    const directCityInput = document.getElementById('direct-fix-city-input');
    const directZipInput = document.getElementById('direct-fix-zip-input');
    
    if (directCityInput && existingCitySelect) {
      directCityInput.addEventListener('input', function() {
        const value = this.value;
        
        // Find matching option in the existing select
        for (let i = 0; i < existingCitySelect.options.length; i++) {
          if (existingCitySelect.options[i].value.toLowerCase() === value.toLowerCase()) {
            // Set the existing select value
            existingCitySelect.value = existingCitySelect.options[i].value;
            
            // Trigger change event
            const event = new Event('change', { bubbles: true });
            existingCitySelect.dispatchEvent(event);
            break;
          }
        }
      });
    }
    
    if (directZipInput && existingZipInput) {
      directZipInput.addEventListener('input', function() {
        existingZipInput.value = this.value;
        
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        existingZipInput.dispatchEvent(event);
      });
    }
    
    // Mark as fixed
    fixApplied = true;
    console.log('Direct fix for cost estimator applied successfully');
  }
  
  // Add CSS to ensure our fix works
  const style = document.createElement('style');
  style.textContent = `
    /* Critical styles for direct fix */
    .direct-fix-row {
      display: flex !important;
      flex-wrap: wrap !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    
    #direct-fix-city-input,
    .city-search-input {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      width: 100% !important;
      height: 38px !important;
      padding: 8px 12px !important;
      border: 1px solid #ced4da !important;
      border-radius: 4px !important;
      background-color: white !important;
      z-index: 999 !important;
    }
    
    #city-select,
    select[name="city"],
    select[id*="city"] {
      display: none !important;
      visibility: hidden !important;
      position: absolute !important;
      pointer-events: none !important;
    }
    
    /* Mobile optimization */
    @media (max-width: 767px) {
      #direct-fix-city-input {
        height: 44px !important;
        font-size: 16px !important;
        padding: 10px 12px !important;
      }
    }
  `;
  
  document.head.appendChild(style);
})();
