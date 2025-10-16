/**
 * Buy Me a Coffee Button Implementation
 * Adds a floating donation button in the corner of the page
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('Loading Buy Me a Coffee button');
  
  // Wait for the page to be fully loaded and rendered
  window.addEventListener('load', function() {
    setTimeout(initializeDonationButton, 1500);
  });
  
  // Also initialize now
  setTimeout(initializeDonationButton, 2500);
  
  function initializeDonationButton() {
    // Check if button already exists
    if (document.querySelector('.bmc-container')) {
      return;
    }
    
    // Create container for the button
    const container = document.createElement('div');
    container.className = 'bmc-container';
    
    // Create a label to explain the button
    const label = document.createElement('div');
    label.className = 'bmc-label';
    label.textContent = 'Support DaycareAlert';
    label.style.textAlign = 'center';
    label.style.marginBottom = '5px';
    label.style.fontSize = '12px';
    label.style.fontWeight = 'bold';
    label.style.color = '#555';
    container.appendChild(label);
    
    // Create button wrapper
    const buttonWrapper = document.createElement('div');
    buttonWrapper.className = 'bmc-button-wrapper';
    
    // Manual button implementation (more reliable than the script)
    const link = document.createElement('a');
    link.href = 'https://www.buymeacoffee.com/DaycareAlert';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'bmc-button';
    
    // Button styling
    link.style.display = 'inline-flex';
    link.style.alignItems = 'center';
    link.style.justifyContent = 'center';
    link.style.padding = '8px 16px';
    link.style.borderRadius = '5px';
    link.style.backgroundColor = '#40DCA5';
    link.style.color = '#ffffff';
    link.style.fontFamily = 'Poppins, sans-serif';
    link.style.textDecoration = 'none';
    link.style.border = '1px solid #000000';
    link.style.cursor = 'pointer';
    link.style.lineHeight = '1';
    link.style.fontSize = '14px';
    link.style.fontWeight = '600';
    
    // Create emoji and text elements
    const emoji = document.createElement('span');
    emoji.textContent = '🚸 ';
    emoji.style.marginRight = '5px';
    
    const text = document.createElement('span');
    text.textContent = 'Buy me a coffee';
    
    // Assemble button
    link.appendChild(emoji);
    link.appendChild(text);
    buttonWrapper.appendChild(link);
    container.appendChild(buttonWrapper);
    
    // Add close button so users can dismiss
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.className = 'bmc-close-button';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '-8px';
    closeButton.style.right = '-8px';
    closeButton.style.backgroundColor = '#fff';
    closeButton.style.border = '1px solid #ccc';
    closeButton.style.borderRadius = '50%';
    closeButton.style.width = '20px';
    closeButton.style.height = '20px';
    closeButton.style.lineHeight = '18px';
    closeButton.style.fontSize = '16px';
    closeButton.style.textAlign = 'center';
    closeButton.style.cursor = 'pointer';
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    closeButton.style.zIndex = '10000';
    
    // Close button functionality
    closeButton.addEventListener('click', function(e) {
      e.stopPropagation();
      container.style.opacity = '0';
      setTimeout(() => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
        
        // Remember the user's preference
        try {
          localStorage.setItem('bmcButtonClosed', Date.now().toString());
        } catch(e) {
          console.error('Could not save preference to localStorage', e);
        }
      }, 300);
    });
    
    container.appendChild(closeButton);
    
    // Check user preference - don't show if they closed it in the last 7 days
    try {
      const lastClosed = localStorage.getItem('bmcButtonClosed');
      if (lastClosed) {
        const daysDiff = (Date.now() - parseInt(lastClosed)) / (1000 * 60 * 60 * 24);
        if (daysDiff < 7) {
          console.log('Buy Me Coffee button was closed recently. Not showing.');
          return;
        }
      }
    } catch(e) {
      console.error('Error checking localStorage', e);
    }
    
    // Create a fade-in animation for the button
    container.style.opacity = '0';
    
    // Add container to body
    document.body.appendChild(container);
    
    // Trigger fade in
    setTimeout(() => {
      container.style.opacity = '1';
    }, 300);
  }
});
