/**
 * Database-first API utility
 * Tries to fetch data from our MySQL database via backend API first
 * Falls back to direct Texas API calls when needed
 */
import axios from 'axios';
import { 
  fetchDaycareData as fetchDaycareDataDirect, 
  fetchFilteredDaycareData as fetchFilteredDaycareDataDirect,
  fetchTotalDaycareCount as fetchTotalDaycareCountDirect,
  fetchDaycareById as fetchDaycareByIdDirect,
  fetchViolations as fetchViolationsDirect,
  fetchCities as fetchCitiesDirect
} from './api';

// API endpoints - dynamically determine which to use
const DEFAULT_PORT = '8084';
const FRONTEND_PORT = '3001';

// Standard API endpoint
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.daycarealert.com/api' 
  : `http://localhost:${DEFAULT_PORT}/api`;

// Optimized API endpoint - where most city data is found
const OPTIMIZED_API_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.daycarealert.com/api/mysql-optimized'
  : `http://localhost:${DEFAULT_PORT}/api/mysql-optimized`;

// Daycare finder URL
const DAYCARE_FINDER_API_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.daycarealert.com/api/daycare-finder'
  : `http://localhost:${DEFAULT_PORT}/api/daycare-finder`;

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Add smaller timeout and max body length
  timeout: 10000,
  maxContentLength: 5000000, // 5MB
  maxBodyLength: 5000000, // 5MB
  // Limit headers size
  maxHeadersLength: 2000 // 2KB
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Fetch daycare data with fallback
 */
export async function fetchDaycareData(limit = 20, offset = 0, sortColumn = '', sortDirection = 'asc') {
  try {
    console.log('Trying to fetch from local database via backend...');
    
    // Try to fetch from our backend first (which will use the database)
    const response = await api.get('/daycares', {
      params: {
        limit,
        offset,
        sortColumn,
        sortDirection
      }
    });
    
    if (response.data && response.data.success && response.data.daycares) {
      console.log(`Successfully fetched ${response.data.daycares.length} daycares from ${response.data.source}`);
      return response.data.daycares;
    }
    
    throw new Error('Invalid response from backend');
  } catch (error) {
    console.warn('Error fetching from backend, falling back to direct API:', error.message);
    
    // Fall back to the direct API call
    return await fetchDaycareDataDirect(limit, offset, sortColumn, sortDirection);
  }
}

/**
 * Fetch filtered daycare data with fallback
 */
export async function fetchFilteredDaycareData(limit = 20, offset = 0, filters = {}, sortColumn = '', sortDirection = 'asc') {
  try {
    console.log('Trying to fetch filtered daycares from local database via backend...');
    
    // Extract search term and city from filters for the backend
    const { searchTerm, city, operation_type } = filters;
    
    // Try to fetch from our backend first (which will use the database)
    const response = await api.get('/daycares', {
      params: {
        limit,
        offset,
        name: searchTerm, // Map searchTerm to name parameter for backend
        city,
        operation_type,
        sortColumn,
        sortDirection
      }
    });
    
    if (response.data && response.data.success && response.data.daycares) {
      console.log(`Successfully fetched ${response.data.daycares.length} filtered daycares from ${response.data.source}`);
      return response.data.daycares;
    }
    
    throw new Error('Invalid response from backend');
  } catch (error) {
    console.warn('Error fetching filtered daycares from backend, falling back to direct API:', error.message);
    
    // Fall back to the direct API call
    return await fetchFilteredDaycareDataDirect(limit, offset, filters, sortColumn, sortDirection);
  }
}

/**
 * Fetch total daycare count with fallback
 */
export async function fetchTotalDaycareCount(filters = {}) {
  try {
    console.log('Trying to fetch total daycare count from local database via backend...');
    
    // Extract search term and city from filters for the backend
    const { searchTerm, city, operation_type } = filters;
    
    // Try to fetch from our backend first (which will use the database)
    const response = await api.get('/daycares', {
      params: {
        limit: 1, // Only need count, not actual records
        offset: 0,
        name: searchTerm,
        city,
        operation_type,
        countOnly: true
      }
    });
    
    if (response.data && response.data.success && response.data.total !== undefined) {
      console.log(`Successfully fetched total count (${response.data.total}) from ${response.data.source}`);
      return response.data.total;
    }
    
    throw new Error('Invalid response from backend');
  } catch (error) {
    console.warn('Error fetching total count from backend, falling back to direct API:', error.message);
    
    // Fall back to the direct API call
    return await fetchTotalDaycareCountDirect(filters);
  }
}

/**
 * Fetch daycare by ID with fallback
 */
export async function fetchDaycareById(id) {
  try {
    console.log(`Trying to fetch daycare #${id} from local database via backend...`);
    
    if (!id) {
      throw new Error('Operation number is required');
    }
    
    // Try to fetch from our backend first (which will use the database)
    const response = await api.get(`/daycares/${id}`);
    
    if (response.data && response.data.success && response.data.daycare) {
      console.log(`Successfully fetched daycare #${id} from ${response.data.source}`);
      return response.data.daycare;
    }
    
    throw new Error('Invalid response from backend');
  } catch (error) {
    console.warn(`Error fetching daycare #${id} from backend, falling back to direct API:`, error.message);
    
    // Fall back to the direct API call
    return await fetchDaycareByIdDirect(id);
  }
}

/**
 * Fetch violations for a daycare with fallback
 */
export async function fetchViolations(daycareId = null) {
  try {
    console.log(`Trying to fetch violations for daycare #${daycareId} from local database via backend...`);
    
    if (!daycareId) {
      return [];
    }
    
    // Try to fetch from our backend first (which will use the database)
    const response = await api.get(`/daycares/violations/${daycareId}`);
    
    if (response.data && response.data.success && response.data.violations) {
      console.log(`Successfully fetched ${response.data.violations.length} violations from ${response.data.source}`);
      return response.data.violations;
    }
    
    throw new Error('Invalid response from backend');
  } catch (error) {
    console.warn(`Error fetching violations for daycare #${daycareId} from backend, falling back to direct API:`, error.message);
    
    // Fall back to the violations endpoint first, then direct API as last resort
    try {
      // Try the regular violations endpoint
      const response = await api.get(`/violations/daycare/${daycareId}`);
      
      if (response.data && response.data.success && response.data.violations) {
        return response.data.violations;
      }
      
      throw new Error('Invalid response from violations endpoint');
    } catch (violationsError) {
      console.warn(`Error fetching from violations endpoint, falling back to direct API:`, violationsError.message);
      
      // Fall back to the direct API call as last resort
      return await fetchViolationsDirect(daycareId);
    }
  }
}

/**
 * Fetch cities with fallback
 */
export async function fetchCities() {
  try {
    console.log('Trying to fetch cities from optimized MySQL endpoint for city search dropdown...');
    
    // Set up request options for consistent behavior
    const requestOptions = {
      timeout: 5000,
      headers: {
        // Only include essential headers
        'Accept': 'application/json'
      },
      withCredentials: false
    };
    
    // Try to fetch from the optimized endpoint that returns all cities
    try {
      // The endpoint that returns all cities
      const response = await axios.get(`${OPTIMIZED_API_URL}/daycares/cities/list`, requestOptions);
      
      if (response.data && response.data.success && response.data.cities) {
        console.log(`Successfully fetched ${response.data.cities.length} cities from optimized MySQL service`);
        return response.data.cities;
      }
    } catch (optimizedError) {
      console.warn('Optimized cities endpoint failed:', optimizedError.message);
    }
    
    // Try alternate endpoint as fallback
    try {
      console.log('Trying frontend proxy endpoint for cities...');
      const standardResponse = await axios.get(`http://localhost:${FRONTEND_PORT}/api/mysql-optimized/daycares/cities/list`, requestOptions);
      
      if (standardResponse.data && standardResponse.data.success && standardResponse.data.cities) {
        console.log(`Successfully fetched ${standardResponse.data.cities.length} cities from standard MySQL API`);
        return standardResponse.data.cities;
      }
    } catch (standardError) {
      console.warn('Standard MySQL API cities endpoint failed:', standardError.message);
    }
    
    // Try standard MySQL API endpoint as third option
    try {
      console.log('Trying standard MySQL API for cities...');
      const mysqlResponse = await axios.get(`${API_URL}/mysql/daycares/cities/list`, requestOptions);
      
      if (mysqlResponse.data && mysqlResponse.data.success && mysqlResponse.data.cities && mysqlResponse.data.cities.length > 0) {
        console.log(`Successfully fetched ${mysqlResponse.data.cities.length} cities from MySQL API`);
        return mysqlResponse.data.cities;
      }
    } catch (mysqlError) {
      console.warn('MySQL API cities endpoint failed:', mysqlError.message);
    }
    
    // Fall back to direct API as last technical option
    console.log('Falling back to direct API for cities...');
    try {
      const cities = await fetchCitiesDirect();
      console.log(`Successfully fetched ${cities.length} cities from direct API`);
      return cities;
    } catch (apiError) {
      console.error('All city fetch methods failed, returning hardcoded list:', apiError);
      
      // Last resort - return hardcoded list
      return [
        "ABILENE", "AMARILLO", "ARLINGTON", "AUSTIN", "BEAUMONT", "CORPUS CHRISTI", 
        "DALLAS", "DENTON", "EL PASO", "FORT WORTH", "FRISCO", "GALVESTON", "GARLAND", 
        "HOUSTON", "IRVING", "LUBBOCK", "MCALLEN", "MCKINNEY", "MIDLAND", "ODESSA",
        "PLANO", "SAN ANGELO", "SAN ANTONIO", "TYLER", "WACO", "WICHITA FALLS"
      ];
    }
  } catch (error) {
    console.error('Unexpected error in fetchCities:', error);
    
    // Last resort - return hardcoded list
    return [
      "ABILENE", "AMARILLO", "ARLINGTON", "AUSTIN", "BEAUMONT", "CORPUS CHRISTI", 
      "DALLAS", "DENTON", "EL PASO", "FORT WORTH", "FRISCO", "GALVESTON", "GARLAND", 
      "HOUSTON", "IRVING", "LUBBOCK", "MCALLEN", "MCKINNEY", "MIDLAND", "ODESSA",
      "PLANO", "SAN ANGELO", "SAN ANTONIO", "TYLER", "WACO", "WICHITA FALLS"
    ];
  }
}

/**
 * Fetch distinct values for a field with fallback
 */
export async function fetchDistinctValues(field) {
  try {
    console.log(`Trying to fetch distinct values for field "${field}" from optimized MySQL endpoint...`);
    
    // Try the optimized endpoint first
    try {
      const response = await axios({
        method: 'get',
        url: `${API_URL}/daycares/distinct/${field}`,
        headers: { 'Accept': 'application/json' },
        timeout: 5000
      });
      
      if (response.data && response.data.success && response.data.values) {
        console.log(`Successfully fetched ${response.data.values.length} distinct values for ${field} from optimized MySQL service`);
        return response.data.values;
      }
    } catch (optimizedError) {
      console.warn(`Optimized distinct values endpoint failed for ${field}:`, optimizedError.message);
    }
    
    // Fall back to hardcoded values based on the field
    console.log(`Falling back to hardcoded values for ${field}`);
    if (field === 'operation_type') {
      // UPDATED: Only show Licensed Center and Licensed Child-Care Home
      return [
        'Licensed Center',
        'Licensed Child-Care Home'
      ];
    }
    
    // Default empty array for other fields
    return [];
  } catch (error) {
    console.error(`Unexpected error in fetchDistinctValues for field ${field}:`, error);
    
    // Last resort - return empty array
    return [];
  }
}

/**
 * Fetch daycare recommendations using the optimized daycare_finder API
 */
export async function fetchDaycareRecommendations(preferences) {
  try {
    console.log('Trying to fetch recommendations from optimized daycare finder API...');
    
    if (!preferences || (!preferences.location?.lat && !preferences.location?.lng && !preferences.location?.city)) {
      throw new Error('Location information is required for recommendations');
    }
    
    // Build URL and parameters
    const params = new URLSearchParams();
    
    // Add location parameters
    if (preferences.location.lat && preferences.location.lng) {
      params.append('lat', preferences.location.lat);
      params.append('lng', preferences.location.lng);
    }
    
    // Always include city if available for more precise filtering
    if (preferences.location.city) {
      // Make sure to UPPERCASE the city for consistent matching with database
      const cityName = preferences.location.city.toUpperCase().trim();
      params.append('city', cityName);
      console.log(`Including city parameter: ${cityName} (uppercased for exact matching)`);
    }
    
    // Add other parameters
    if (preferences.radius) {
      params.append('radius', preferences.radius);
    }
    
    if (preferences.ageGroup) {
      params.append('ageGroup', preferences.ageGroup);
    }
    
    if (preferences.priceRange) {
      params.append('priceRange', preferences.priceRange);
    }
    
    // Convert qualities array to string if needed
    if (preferences.qualities && preferences.qualities.length > 0) {
      params.append('priorities', preferences.qualities.join(','));
    }
    
    // Add special program parameters - convert to boolean strings
    if (preferences.specialNeeds) {
      params.append('specialPrograms', 'special_needs');
    }
    
    if (preferences.transportation) {
      params.append('specialPrograms', 'transportation');
    }
    
    if (preferences.extendedHours) {
      params.append('specialPrograms', 'night,weekend');
    }
    
    // Add authentication if available
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      // First, try to use the optimized daycare finder API
      console.log('Using optimized daycare finder API...');
      
      const response = await fetch(`${DAYCARE_FINDER_API_URL}/recommendations?${params.toString()}`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.recommendations && data.recommendations.length > 0) {
          console.log(`Successfully fetched ${data.recommendations.length} recommendations from optimized daycare finder API`);
          return data;
        }
        
        console.log('Optimized API returned no results or error, falling back to standard recommendations...');
      } else {
        console.warn(`Optimized API response error: ${response.status}`);
      }
    } catch (optimizedError) {
      console.warn('Error with optimized daycare finder API:', optimizedError);
    }
    
    // Fall back to the standard recommendations API
    console.log('Falling back to standard recommendations API...');
    
    const { fetchDaycareRecommendations } = await import('./api');
    return await fetchDaycareRecommendations(preferences);
    
  } catch (error) {
    console.error('Error in dbFirstApi fetchDaycareRecommendations:', error);
    
    // Fall back to the standard recommendations API
    const { fetchDaycareRecommendations } = await import('./api');
    return await fetchDaycareRecommendations(preferences);
  }
}

// Export original API functions for any component that needs direct access
export * from './api';
