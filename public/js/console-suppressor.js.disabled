// Save original console methods
(function() {
  // Since this script runs before process is defined, we'll set up a function to run after everything is loaded
  window.addEventListener('load', function() {
    // Check if we're in production (or always suppress if you want)
    if (window.suppressConsole === true || 
       (window.process && window.process.env && window.process.env.NODE_ENV === 'production')) {
      // Production environment: disable all console output
      const noop = function() {};
      const methods = ['log', 'debug', 'info', 'warn', 'error'];
      
      // Store original methods in case they need to be restored
      const originalConsole = {};
      methods.forEach(method => {
        originalConsole[method] = console[method];
        console[method] = noop;
      });
      
      // Add a way to restore console if needed
      console.enableLogs = function() {
        methods.forEach(method => {
          console[method] = originalConsole[method];
        });
      };
    }
  });
  
  // Set a flag to always suppress console
  window.suppressConsole = true;
})();
