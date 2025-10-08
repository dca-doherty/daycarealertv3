/**
 * Toggle Console Utility
 * A simple utility to enable/disable console logs application-wide
 */

// Set this to false to disable all console logs globally
const CONSOLE_ENABLED = true;

// Store original console methods
const originalConsole = {
  log: console.log,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error
};

// Function to enable or disable console logs
export const toggleConsoleLogs = (enabled = true) => {
  if (enabled) {
    // Restore original methods
    console.log = originalConsole.log;
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  } else {
    // Replace with empty functions
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    console.warn = () => {};
    // Keep error logging enabled
    console.error = originalConsole.error;
  }
};

// Initialize based on the constant
toggleConsoleLogs(CONSOLE_ENABLED);

// Export function to toggle at runtime (useful for development)
export default toggleConsoleLogs;