/**
 * Enhanced Select Dropdown with Search
 * Improves mobile usability for long dropdown lists
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('Enhanced select script loaded and enabled');
  
  // Initialize all selects with the mobile-friendly-select class
  const enhanceSelects = function() {
    const selects = document.querySelectorAll('select.mobile-friendly-select');
    console.log(`Found ${selects.length} selects to enhance - looking for city dropdown`);
    
    selects.forEach(function(select, index) {
      // Skip if already enhanced
      if (select.dataset.enhanced === 'true') {
        console.log(`Select #${index} already enhanced, skipping`);
        return;
      }
      
      console.log(`Enhancing select #${index}: ${select.id || 'unnamed'} with ${select.options.length} options`);
      
      // Mark as enhanced to avoid duplicate processing
      select.dataset.enhanced = 'true';
      
      // Store the current option count for comparison later
      select.dataset.optionCount = select.options.length;
      
      // Create a container div
      const container = document.createElement('div');
      container.className = 'enhanced-select-container';
      select.parentNode.insertBefore(container, select);
      
      // Create the search input
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'enhanced-select-search';
      searchInput.placeholder = 'Type to search...';
      
      // Create the dropdown for options
      const dropdown = document.createElement('div');
      dropdown.className = 'enhanced-select-dropdown';
      
      // Hide the original select
      select.style.display = 'none';
      
      // Create the display field (shows the current selection)
      const displayField = document.createElement('div');
      displayField.className = 'enhanced-select-display';
      displayField.textContent = select.options[select.selectedIndex]?.text || 'Select...';
      
      // Add elements to the container
      container.appendChild(displayField);
      container.appendChild(dropdown);
      dropdown.appendChild(searchInput);
      
      // Create the options list
      const optionsList = document.createElement('div');
      optionsList.className = 'enhanced-select-options';
      dropdown.appendChild(optionsList);
      
      // Populate options
      for (let i = 0; i < select.options.length; i++) {
        const option = select.options[i];
        const optionEl = document.createElement('div');
        optionEl.className = 'enhanced-select-option';
        optionEl.dataset.value = option.value;
        optionEl.textContent = option.text;
        optionsList.appendChild(optionEl);
        
        // Highlight selected option
        if (option.selected) {
          optionEl.classList.add('selected');
        }
        
        // Handle option click
        optionEl.addEventListener('click', function() {
          select.value = this.dataset.value;
          displayField.textContent = this.textContent;
          
          // Remove selected class from all options
          const options = optionsList.querySelectorAll('.enhanced-select-option');
          options.forEach(opt => opt.classList.remove('selected'));
          
          // Add selected class to clicked option
          this.classList.add('selected');
          
          // Trigger change event on the original select
          const event = new Event('change', { bubbles: true });
          select.dispatchEvent(event);
          
          // Close dropdown
          dropdown.classList.remove('open');
        });
      }
      
      // Toggle dropdown when clicking on the display field
      displayField.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('open');
        
        if (dropdown.classList.contains('open')) {
          // Add backdrop class to body for mobile
          document.body.classList.add('enhanced-select-open');
          
          searchInput.focus();
          // Clear the search input when opening the dropdown
          searchInput.value = '';
          // Show all options
          const options = optionsList.querySelectorAll('.enhanced-select-option');
          options.forEach(option => {
            option.style.display = 'block';
          });
          
          // On mobile, scroll to make sure the select is visible
          if (window.innerWidth <= 768) {
            // Scroll container into view if needed
            container.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else {
          // Remove backdrop class
          document.body.classList.remove('enhanced-select-open');
        }
      });
      
      // Also open the dropdown when touching/tapping it on mobile
      displayField.addEventListener('touchstart', function(e) {
        e.stopPropagation();
      });
      
      // Make sure dropdown opens on mobile touch
      displayField.addEventListener('touchend', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('open');
        if (dropdown.classList.contains('open')) {
          setTimeout(() => {
            searchInput.focus();
            // Ensure keyboard appears on mobile
            searchInput.click();
          }, 50);
        }
      });
      
      // Filter options based on search input
      searchInput.addEventListener('input', function() {
        const value = this.value.toLowerCase().trim();
        const options = optionsList.querySelectorAll('.enhanced-select-option');
        
        let foundMatches = false;
        
        if (value === '') {
          // If empty, show all options
          options.forEach(option => {
            option.style.display = 'block';
          });
          foundMatches = true;
        } else {
          // Otherwise filter options
          options.forEach(function(option) {
            const text = option.textContent.toLowerCase();
            // Check if the option text starts with the search value (better UX)
            // or if it contains the search value as a fallback
            if (text.startsWith(value) || text.includes(value)) {
              option.style.display = 'block';
              foundMatches = true;
            } else {
              option.style.display = 'none';
            }
          });
        }
        
        // Debug message to check filtering
        console.log(`Filtering for "${value}": ${foundMatches ? 'Found matches' : 'No matches found'}`);
        
        // Show a message if no matches found
        const noMatchesEl = dropdown.querySelector('.no-matches-message');
        if (!foundMatches && value.length > 0) {
          if (!noMatchesEl) {
            const message = document.createElement('div');
            message.className = 'no-matches-message';
            message.textContent = 'No matching cities found';
            message.style.padding = '10px 15px';
            message.style.fontStyle = 'italic';
            message.style.color = '#6c757d';
            dropdown.appendChild(message);
          }
        } else if (noMatchesEl) {
          noMatchesEl.remove();
        }
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', function(e) {
        if (!container.contains(e.target)) {
          dropdown.classList.remove('open');
          // Remove backdrop class
          document.body.classList.remove('enhanced-select-open');
        }
      });
      
      // Prevent search input clicks from closing dropdown
      searchInput.addEventListener('click', function(e) {
        e.stopPropagation();
      });
    });
  };
  
  // Run enhancement on page load
  enhanceSelects();
  
  // Also run enhancement when React components might update the DOM
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      // Check for added nodes or changed option nodes
      if (mutation.addedNodes.length > 0) {
        enhanceSelects();
      }
      
      // Handle dynamic updates to select options
      if (mutation.type === 'childList' && 
          mutation.target.nodeName === 'SELECT' && 
          mutation.target.classList.contains('mobile-friendly-select')) {
        
        console.log('Select options changed dynamically');
        
        // If this select was already enhanced, we need to update its options
        const select = mutation.target;
        const originalDisplay = select.style.display;
        
        // Find the container by getting the previous sibling
        const container = select.previousElementSibling;
        if (container && container.classList.contains('enhanced-select-container')) {
          // Remove the container
          container.remove();
          
          // Remove the enhanced flag
          delete select.dataset.enhanced;
          
          // Make the select visible temporarily
          select.style.display = '';
          
          // Re-enhance it
          enhanceSelects();
        }
      }
    });
  });
  
  // Observe the entire document for changes (adjust as needed for performance)
  observer.observe(document.body, { 
    childList: true, 
    subtree: true, 
    attributes: false, 
    characterData: false 
  });
  
  // Add special handling for city dropdowns - we need to check periodically for updates
  // Set retry count to make sure initialization happens reliably
  let retryCount = 0;
  const maxRetries = 20; // Try for 20 seconds max
  
  const cityFilterInterval = setInterval(function() {
    // Target both selects with "city" in the ID and also the exact city-filter select
    const citySelects = document.querySelectorAll('select[id*="city"], select#city-filter');
    
    // If we find the #city-filter specifically, prioritize it
    const cityFilter = document.getElementById('city-filter');
    
    if (cityFilter) {
      console.log(`Found city-filter with ${cityFilter.options.length} options, attempt #${retryCount+1}`);
      
      // Only enhance if it has options and wasn't enhanced yet
      if (cityFilter.options.length > 1 && !cityFilter.dataset.enhanced) {
        console.log(`Enhancing city-filter with ${cityFilter.options.length} options`);
        
        try {
          // First try enhancing just this select directly
          enhanceSelectWithSearch(cityFilter);
          cityFilter.dataset.enhanced = 'true';
          cityFilter.dataset.optionCount = cityFilter.options.length;
          console.log('Successfully enhanced city-filter!');
          
          // Add a message to help users
          const filterGroup = cityFilter.closest('.filter-group');
          if (filterGroup) {
            const helpText = document.createElement('small');
            helpText.style.display = 'block';
            helpText.style.marginTop = '4px';
            helpText.style.color = '#666';
            helpText.textContent = '⌨️ Tap to search cities';
            filterGroup.appendChild(helpText);
          }
          
          // Clear interval after success
          clearInterval(cityFilterInterval);
        } catch (e) {
          console.error('Error enhancing city filter directly:', e);
          // Fallback to enhancing all selects
          enhanceSelects();
        }
      }
    }
    
    // For other city selects
    citySelects.forEach(function(select) {
      if (select.id !== 'city-filter' && select.options.length > 1 && !select.dataset.enhanced) {
        console.log(`Enhancing other city select: ${select.id}`);
        enhanceSelects();
      }
    });
    
    // Increment retry count and exit if maximum is reached
    retryCount++;
    if (retryCount >= maxRetries) {
      console.log('Reached maximum retries for city filter enhancement');
      clearInterval(cityFilterInterval);
    }
  }, 1000); // Check every second
});
