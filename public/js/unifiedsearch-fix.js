/**
 * Unified Search Fix - v1.0
 * Updates search input placeholders to include "zip code" 
 * on initial page load and SPA navigation
 */

(function() {
  console.log('Unified Search placeholder fix initializing');
  
  // Run immediately and again after a delay
  updatePlaceholders();
  setTimeout(updatePlaceholders, 100);
  setTimeout(updatePlaceholders, 500);
  setTimeout(updatePlaceholders, 1000);
  
  // Also run on various document ready states
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    updatePlaceholders();
  } else {
    document.addEventListener('DOMContentLoaded', updatePlaceholders);
  }
  
  window.addEventListener('load', updatePlaceholders);
  
  // Set up a MutationObserver to detect when React re-renders elements
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        const addedNodes = Array.from(mutation.addedNodes);
        for (const node of addedNodes) {
          if (node.nodeType === 1) { // ELEMENT_NODE
            if (node.classList && (
                node.classList.contains('unified-search-input') || 
                node.classList.contains('search-input-wrapper')
            )) {
              updatePlaceholders();
              return;
            }
            
            // Check children
            const searchInputs = node.querySelectorAll('.unified-search-input');
            if (searchInputs.length > 0) {
              updatePlaceholders();
              return;
            }
          }
        }
      }
    }
  });
  
  // Start observing the body if it exists
  function initObserver() {
    if (document.body) {
      try {
        observer.observe(document.body, { childList: true, subtree: true });
        console.log('Unified search fix: Observer initialized successfully');
      } catch (error) {
        console.error('Unified search fix: Error initializing observer:', error);
      }
    } else {
      console.warn('Unified search fix: document.body not available yet');
      // Try again in 500ms
      setTimeout(initObserver, 500);
    }
  }
  // Ensure observer is defined before calling initObserver
  if (typeof observer !== 'undefined' && observer) {
    // Start observation
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initObserver);
    } else {
      initObserver();
    }
  } else {
    console.error('Unified search fix: Observer not defined');
  }
  
  // Monitor url changes for SPA navigation
  let lastUrl = window.location.href;
  setInterval(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;
      
      // Run after a delay to allow the page to render
      setTimeout(updatePlaceholders, 500);
      setTimeout(updatePlaceholders, 1000);
    }
  }, 500);
  
  // Function to update placeholders
  function updatePlaceholders() {
    // Find all search inputs
    const searchInputs = document.querySelectorAll('.unified-search-input, input[placeholder*="Search by"]');
    
    searchInputs.forEach(input => {
      // Get the current placeholder
      const currentPlaceholder = input.getAttribute('placeholder') || '';
      
      // Only update if it doesn't already mention "zip code"
      if (!currentPlaceholder.includes('zip code')) {
        // If it's the default placeholder, replace it with the complete one
        if (currentPlaceholder.includes('Search by daycare name, city, or type')) {
          const newPlaceholder = 'Search by daycare name, city, type, zip code, or operation ID...';
          input.setAttribute('placeholder', newPlaceholder);
          console.log(`Updated placeholder from "${currentPlaceholder}" to "${newPlaceholder}"`);
        }
        // If it has a custom format, try to add "zip code" where appropriate
        else if (currentPlaceholder.includes('Search by') && currentPlaceholder.includes('city')) {
          // Find where to insert "zip code"
          let newPlaceholder = currentPlaceholder;
          
          // Insert after "type" if it exists
          if (currentPlaceholder.includes('type')) {
            newPlaceholder = currentPlaceholder.replace('type', 'type, zip code');
          }
          // Otherwise insert after "city"
          else if (currentPlaceholder.includes('city')) {
            newPlaceholder = currentPlaceholder.replace('city', 'city, zip code');
          }
          
          input.setAttribute('placeholder', newPlaceholder);
          console.log(`Updated placeholder from "${currentPlaceholder}" to "${newPlaceholder}"`);
        }
      }
    });
  }
})();
