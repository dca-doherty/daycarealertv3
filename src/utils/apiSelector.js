/**
 * API Selector
 * This file exports the API functions to be used by the application.
 * It determines whether to use the database-first API or the direct API.
 * 
 * The application should import from this file instead of directly from api.js or dbFirstApi.js
 */

// Import both API implementations
import * as directApi from './api';
import * as dbFirstApi from './dbFirstApi';

// Flag to control which API to use - default to database-first
const USE_DB_FIRST = process.env.REACT_APP_USE_DB_FIRST !== 'false';

// Select the API implementation based on the flag
const apiImpl = USE_DB_FIRST ? dbFirstApi : directApi;

// Export all functions from the selected API implementation
export const {
  fetchDaycareData,
  fetchFilteredDaycareData,
  fetchTotalDaycareCount,
  fetchDaycareById,
  fetchDaycares,
  fetchDaycaresWithViolations,
  fetchViolations,
  fetchViolationAnalysis,
  fetchCities,
  fetchDaycareRecommendations,
  saveUserPreferences,
  getUserPreferences,
  fetchDistinctValues,
  clearCache
} = apiImpl;

// Export the API instance for any component that needs direct access
export { default as api } from './api';

// Export a flag indicating if we're using database-first mode
export const isUsingDbFirst = USE_DB_FIRST;