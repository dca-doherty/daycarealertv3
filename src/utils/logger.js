/**
 * Logger utility to centralize and control logging
 * This allows for conditional logging based on environment
 */

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Get log level from localStorage or default to 'error' in production and 'info' in development
const getLogLevel = () => {
  try {
    const savedLevel = localStorage.getItem('daycarealert_log_level');
    if (savedLevel) return savedLevel;
    return isDevelopment ? 'info' : 'error';
  } catch (e) {
    // If localStorage is not available
    return isDevelopment ? 'info' : 'error';
  }
};

// Log levels in order of verbosity
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4
};

// Set initial log level
let currentLogLevel = getLogLevel();

// Function to check if we should log at a given level
const shouldLog = (level) => {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel];
};

// Logger object with methods for different log levels
const logger = {
  // Set log level
  setLevel: (level) => {
    if (LOG_LEVELS[level] !== undefined) {
      currentLogLevel = level;
      try {
        localStorage.setItem('daycarealert_log_level', level);
      } catch (e) {
        // Ignore localStorage errors
      }
      console.log(`Log level set to: ${level}`);
    }
  },

  // Get current log level
  getLevel: () => currentLogLevel,

  // Log methods for different levels
  debug: (message, ...args) => {
    if (shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },

  info: (message, ...args) => {
    if (shouldLog('info')) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },

  warn: (message, ...args) => {
    if (shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  error: (message, ...args) => {
    if (shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },

  // Raw console log (respects 'none' setting but otherwise always logs)
  log: (message, ...args) => {
    if (currentLogLevel !== 'none') {
      console.log(message, ...args);
    }
  }
};

// Helper function to add to window for debugging
if (isDevelopment && typeof window !== 'undefined') {
  window.setLogLevel = logger.setLevel;
}

export default logger;