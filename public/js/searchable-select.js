/**
 * Simple Searchable Select Enhancement
 * 
 * This script enhances standard HTML select elements to have search functionality
 * It works by creating a search input that filters the select options as you type
 */
document.addEventListener('DOMContentLoaded', function() {
  // Find all selects with the mobile-friendly-select class
  const selects = document.querySelectorAll('select.mobile-friendly-select');
  
  selects.forEach(function(select) {
    enhanceSelectWithSearch(select);
  });
  
  /**
   * Enhances a select element with search functionality
   * @param {HTMLElement} select - The select element to enhance
   */
  function enhanceSelectWithSearch(select) {
    // Check if the select is disabled, if so, don't enhance it
    if (select.disabled) {
      return;
    }
    
    // Get the original select's parent and id
    const parentElement = select.parentElement;
    const selectId = select.id;
    const selectName = select.name;
    const originalLabel = parentElement.querySelector('label');
    
    // Create a container to hold our enhanced select
    const container = document.createElement('div');
    container.className = 'searchable-select-container';
    container.style.position = 'relative';
    container.style.width = '100%';
    
    // Create the search input
    const searchInput = document.createElement('input');
    searchInput.setAttribute('type', 'text');
    searchInput.setAttribute('placeholder', 'Type to search...');
    searchInput.className = 'searchable-select-input';
    searchInput.style.width = '100%';
    searchInput.style.padding = '8px 12px';
    searchInput.style.boxSizing = 'border-box';
    searchInput.style.marginBottom = '0';
    searchInput.style.borderRadius = '4px';
    searchInput.style.border = '1px solid #ced4da';
    
    // Create a hidden select that will be used for form submission
    const hiddenSelect = select.cloneNode(true);
    hiddenSelect.style.display = 'none';
    
    // Create the dropdown container for filtered options
    const dropdown = document.createElement('div');
    dropdown.className = 'searchable-select-dropdown';
    dropdown.style.position = 'absolute';
    dropdown.style.width = '100%';
    dropdown.style.maxHeight = '300px';
    dropdown.style.overflowY = 'auto';
    dropdown.style.border = '1px solid #ced4da';
    dropdown.style.borderTop = 'none';
    dropdown.style.borderRadius = '0 0 4px 4px';
    dropdown.style.backgroundColor = 'white';
    dropdown.style.zIndex = '9999'; // Higher z-index to ensure it appears above other elements
    dropdown.style.display = 'none';
    dropdown.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    
    // Append dropdown to body instead of container to avoid overflow issues
    // We'll position it relative to the input later
    document.body.appendChild(dropdown);
    
    // Store all original options for filtering
    const allOptions = Array.from(select.options).map(option => {
      return {
        value: option.value,
        text: option.textContent
      };
    });
    
    // Function to position the dropdown below the input
    function positionDropdown() {
      const rect = searchInput.getBoundingClientRect();
      
      // Check if we're on mobile
      const isMobile = window.innerWidth <= 768;
      
      if (isMobile) {
        // On mobile devices, position the dropdown as a modal dialog
        dropdown.style.position = 'fixed';
        dropdown.style.top = '50%';
        dropdown.style.left = '50%';
        dropdown.style.transform = 'translate(-50%, -50%)';
        dropdown.style.width = '90%';
        dropdown.style.maxWidth = '400px';
        dropdown.style.maxHeight = '60vh';
        dropdown.style.zIndex = '9999';
        dropdown.style.borderRadius = '8px';
        dropdown.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        
        // Add a backdrop for mobile
        if (!document.getElementById('dropdown-backdrop')) {
          const backdrop = document.createElement('div');
          backdrop.id = 'dropdown-backdrop';
          backdrop.style.position = 'fixed';
          backdrop.style.top = '0';
          backdrop.style.left = '0';
          backdrop.style.right = '0';
          backdrop.style.bottom = '0';
          backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
          backdrop.style.zIndex = '9998';
          document.body.appendChild(backdrop);
          
          // Close dropdown when clicking on backdrop
          backdrop.addEventListener('click', function() {
            dropdown.style.display = 'none';
            backdrop.remove();
          });
        }
      } else {
        // On desktop, position below the input normally
        dropdown.style.position = 'absolute';
        dropdown.style.top = `${rect.bottom + window.scrollY}px`;
        dropdown.style.left = `${rect.left + window.scrollX}px`;
        dropdown.style.width = `${rect.width}px`;
        dropdown.style.transform = '';
      }
    }
    
    // Add event listener to the search input
    searchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      const filteredOptions = allOptions.filter(option => 
        option.text.toLowerCase().includes(searchTerm)
      );
      
      // Clear the dropdown
      dropdown.innerHTML = '';
      
      // Add filtered options to the dropdown
      filteredOptions.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.className = 'searchable-select-option';
        optionElement.textContent = option.text;
        
        // Check if we're on mobile for better styling
        const isMobile = window.innerWidth <= 768;
        optionElement.style.padding = isMobile ? '14px 15px' : '8px 12px';
        optionElement.style.cursor = 'pointer';
        optionElement.style.fontSize = isMobile ? '16px' : 'inherit';
        optionElement.style.borderBottom = '1px solid #f0f0f0';
        
        // Highlight the option on hover
        optionElement.addEventListener('mouseover', function() {
          this.style.backgroundColor = '#f8f9fa';
        });
        
        optionElement.addEventListener('mouseout', function() {
          this.style.backgroundColor = 'white';
        });
        
        // Handle option selection
        optionElement.addEventListener('click', function() {
          searchInput.value = option.text;
          updateHiddenSelect(option.value);
          dropdown.style.display = 'none';
          
          // Trigger change event on the hidden select
          const event = new Event('change', { bubbles: true });
          hiddenSelect.dispatchEvent(event);
        });
        
        dropdown.appendChild(optionElement);
      });
      
      // Show the dropdown if we have options and the input is not empty
      if (filteredOptions.length > 0 && searchTerm) {
        positionDropdown();
        dropdown.style.display = 'block';
      } else {
        dropdown.style.display = 'none';
      }
    });
    
    // Show dropdown when clicking on the input
    searchInput.addEventListener('click', function(e) {
      e.stopPropagation();
      if (dropdown.style.display === 'none' && this.value) {
        const event = new Event('input');
        this.dispatchEvent(event);
      }
    });
    
    // Show all options when focusing on an empty input
    searchInput.addEventListener('focus', function() {
      if (!this.value) {
        dropdown.innerHTML = '';
        
        // Show all options
        allOptions.forEach(option => {
          if (option.value) { // Skip the empty "Select a city" option
            const optionElement = document.createElement('div');
            optionElement.className = 'searchable-select-option';
            optionElement.textContent = option.text;
            
            // Check if we're on mobile for better styling
            const isMobile = window.innerWidth <= 768;
            optionElement.style.padding = isMobile ? '14px 15px' : '8px 12px';
            optionElement.style.cursor = 'pointer';
            optionElement.style.fontSize = isMobile ? '16px' : 'inherit';
            optionElement.style.borderBottom = '1px solid #f0f0f0';
            
            // Highlight the option on hover
            optionElement.addEventListener('mouseover', function() {
              this.style.backgroundColor = '#f8f9fa';
            });
            
            optionElement.addEventListener('mouseout', function() {
              this.style.backgroundColor = 'white';
            });
            
            // Handle option selection
            optionElement.addEventListener('click', function() {
              searchInput.value = option.text;
              updateHiddenSelect(option.value);
              dropdown.style.display = 'none';
              
              // Trigger change event on the hidden select
              const event = new Event('change', { bubbles: true });
              hiddenSelect.dispatchEvent(event);
            });
            
            dropdown.appendChild(optionElement);
          }
        });
        
        positionDropdown();
        dropdown.style.display = 'block';
      }
    });
    
    // Update position on window resize
    window.addEventListener('resize', function() {
      if (dropdown.style.display === 'block') {
        positionDropdown();
      }
    });
    
    // Update position on scroll
    window.addEventListener('scroll', function() {
      if (dropdown.style.display === 'block') {
        positionDropdown();
      }
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', function() {
      dropdown.style.display = 'none';
      // Remove backdrop if it exists
      const backdrop = document.getElementById('dropdown-backdrop');
      if (backdrop) {
        backdrop.remove();
      }
    });
    
    // Update the hidden select when an option is selected
    function updateHiddenSelect(value) {
      for (let i = 0; i < hiddenSelect.options.length; i++) {
        if (hiddenSelect.options[i].value === value) {
          hiddenSelect.selectedIndex = i;
          break;
        }
      }
    }
    
    // Replace the original select with our enhanced version
    if (originalLabel) {
      // Keep the original label
      container.appendChild(originalLabel);
    }
    
    container.appendChild(searchInput);
    container.appendChild(hiddenSelect);
    
    // Update hiddenSelect attributes to match the original
    hiddenSelect.id = selectId;
    hiddenSelect.name = selectName;
    
    // Cleanup function to remove the dropdown when the element is destroyed
    const cleanup = () => {
      if (document.body.contains(dropdown)) {
        document.body.removeChild(dropdown);
      }
    };
    
    // Store cleanup function for potential future use
    container.cleanup = cleanup;
    
    // Replace the select with our container
    parentElement.replaceChild(container, select);
  }
});
