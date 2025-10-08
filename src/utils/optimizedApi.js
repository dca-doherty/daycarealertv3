import axios from 'axios';

// Base API URL for the optimized MySQL service
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.daycarealert.com/api/mysql-optimized' 
  : '/api/mysql-optimized';

// Create API client
const optimizedMysqlApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
});

// Add authorization token to requests if available
optimizedMysqlApi.interceptors.request.use(
  (config) => {
    console.log('Starting API request to:', config.url);
    const token = localStorage.getItem('token');
    console.log('Token found in localStorage:', !!token, token ? token.substring(0, 15) + '...' : 'none');
    if (token) {
      console.log('Setting Authorization header with token');
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`
       };
    } else {
      console.log('No token available in localStorage');
    }

    console.log('Final request config:', {
      url: config.url,
      method: config.method,
      headers: {
        ...config.headers,
        'Authorization': config.headers.Authorization ? 'Bearer [TOKEN_HIDDEN]' : 'NOT_SET'
      }
     });

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * Fetch filtered daycare data from optimized MySQL service
 */
export const fetchDaycares = async (page = 1, limit = 20, filters = {}, sortColumn = '', sortDirection = 'asc') => {
  try {
    console.log('Fetching daycares from optimized MySQL service with filters:', filters);
    
    // Prepare parameters
    const params = {
      page,
      limit,
      sortColumn,
      sortDirection,
      name: filters.searchTerm || '',
      city: filters.city || '',
      operation_type: filters.operation_type || '',
      // Add the missing filter parameters
      priceRange: filters.priceRange || '',
      rating: filters.rating || '',
      yearsInOperation: filters.yearsInOperation || ''
    };
    
    // Log start time for performance monitoring
    const startTime = performance.now();
    
    // Debug logging for filter parameters
    console.log('optimizedMysqlApi sending filter params:', {
      rating: params.rating,
      priceRange: params.priceRange,
      yearsInOperation: params.yearsInOperation
    });
    
    // Make API request
    const response = await optimizedMysqlApi.get('/daycares', { params });
    
    // Log completion time for performance monitoring
    const endTime = performance.now();
    console.log(`✅ Fetch completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    if (response.data && response.data.success) {
      console.log(`Received ${response.data.daycares.length} daycares from optimized MySQL service`);
      return {
        daycares: response.data.daycares || [],
        total: response.data.total || 0
      };
    } else {
      console.error('Error response from optimized MySQL service:', response.data);
      return { daycares: [], total: 0 };
    }
  } catch (error) {
    console.error('Error fetching daycares from optimized MySQL service:', error);
    return { daycares: [], total: 0 };
  }
};

/**
 * Fetch a single daycare by ID from optimized MySQL service
 */
export const fetchDaycareById = async (operationId) => {
  try {
    if (!operationId) {
      throw new Error('Operation ID is required');
    }
    
    console.log(`Fetching daycare #${operationId} from optimized MySQL service`);
    
    // Log start time for performance monitoring
    const startTime = performance.now();
    
    // Make API request
    const response = await optimizedMysqlApi.get(`/daycares/${operationId}`);
    
    // Log completion time for performance monitoring
    const endTime = performance.now();
    console.log(`✅ Fetch completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    if (response.data && response.data.success) {
      console.log('Received daycare details from optimized MySQL service');
      return response.data.daycare;
    } else {
      console.error('Error response from optimized MySQL service:', response.data);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching daycare #${operationId} from optimized MySQL service:`, error);
    return null;
  }
};

/**
 * Fetch violations for a daycare from optimized MySQL service
 */
export const fetchViolations = async (operationId) => {
  try {
    if (!operationId) {
      return [];
    }
    
    console.log(`Fetching violations for daycare #${operationId} from optimized MySQL service`);
    
    // Log start time for performance monitoring
    const startTime = performance.now();
    
    // Make API request
    const response = await optimizedMysqlApi.get(`/daycares/violations/${operationId}`);
    
    // Log completion time for performance monitoring
    const endTime = performance.now();
    console.log(`✅ Fetch completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    if (response.data && response.data.success) {
      console.log(`Received ${response.data.violations.length} violations from optimized MySQL service`);
      return response.data.violations || [];
    } else {
      console.error('Error response from optimized MySQL service:', response.data);
      return [];
    }
  } catch (error) {
    console.error(`Error fetching violations for daycare #${operationId} from optimized MySQL service:`, error);
    return [];
  }
};

/**
 * Fetch available cities from optimized MySQL service
 */
export const fetchCities = async () => {
  try {
    console.log('Fetching cities from optimized MySQL service');
    
    // Log start time for performance monitoring
    const startTime = performance.now();
    
    // Try the optimized API first
    try {
      // Make API request to optimized endpoint
      const response = await optimizedMysqlApi.get('/daycares/cities/list');
      
      // Log completion time for performance monitoring
      const endTime = performance.now();
      console.log(`✅ Fetch completed in ${(endTime - startTime).toFixed(2)}ms`);
      
      if (response.data && response.data.success && response.data.cities && response.data.cities.length > 0) {
        console.log(`Received ${response.data.cities.length} cities from optimized MySQL service`);
        return response.data.cities || [];
      } else {
        throw new Error('Invalid or empty response from optimized endpoint');
      }
    } catch (optimizedError) {
      console.warn('Optimized endpoint failed, trying regular MySQL endpoint:', optimizedError.message);
      
      // Fall back to the regular MySQL endpoint
      const fallbackResponse = await axios.get('http://localhost:8084/api/mysql/daycares/cities/list');
      
      if (fallbackResponse.data && fallbackResponse.data.success) {
        console.log(`Received ${fallbackResponse.data.cities.length} cities from fallback MySQL service`);
        return fallbackResponse.data.cities || [];
      } else {
        throw new Error('Both optimized and fallback endpoints failed');
      }
    }
  } catch (error) {
    console.error('Error fetching cities, returning default cities:', error);
    
    // Return a default list of major Texas cities as a last resort
    const defaultCities = [
      "AMARILLO", "ARLINGTON", "AUSTIN", "BEAUMONT", "CORPUS CHRISTI", "DALLAS", 
      "DENTON", "EL PASO", "FORT WORTH", "FRISCO", "GALVESTON", "GARLAND", 
      "HOUSTON", "IRVING", "LUBBOCK", "MCALLEN", "MCKINNEY", "MIDLAND", 
      "PLANO", "SAN ANGELO", "SAN ANTONIO", "TYLER", "WACO", "WICHITA FALLS"
    ];
    return defaultCities;
  }
};

/**
 * Clear the service cache (admin only)
 */
export const clearCache = async () => {
  try {
    console.log('Clearing optimized MySQL service cache');
    const response = await optimizedMysqlApi.post('/daycares/cache/clear');
    return response.data && response.data.success;
  } catch (error) {
    console.error('Error clearing optimized MySQL service cache:', error);
    return false;
  }
};

/**
 * Add a daycare to user's favorites
 */
export const addToFavorites = async (operationNumber) => {
  try {
    console.log(`Adding favorite for operation #${operationNumber}`);
    // Send using both naming conventions to support any API implementation
    const response = await optimizedMysqlApi.post('/favorites', {
      operation_number: operationNumber,
      operationNumber: operationNumber,
      operation_id: operationNumber,
      daycare_name: 'Daycare' // Include in case it's required
    });
    
    // Update the favorites cache for immediate use
    if (response.data.success) {
      if (!window.favoritesCache) {
        window.favoritesCache = {};
      }
      window.favoritesCache[operationNumber] = true;
      console.log(`[optimizedApi] Added daycare #${operationNumber} to favorites cache`);
      
      // Only log if we're in debug mode
      if (['662108', '291238', '496188'].includes(operationNumber) && window.DEBUG_FAVORITES) {
        console.log(`[FAVORITES API] Added ${operationNumber}`);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error adding daycare to favorites:', error);
    
    // Special handling for 409 Conflict (already in favorites)
    // In this case, we want to report success with a special message
    if (error.response && error.response.status === 409) {
      // Update the favorites cache since it's already a favorite
      if (!window.favoritesCache) {
        window.favoritesCache = {};
      }
      window.favoritesCache[operationNumber] = true;
      console.log(`[optimizedApi] Daycare #${operationNumber} already in favorites cache`);
      
      return { 
        success: true, 
        message: 'Daycare is already in favorites',
        isAlreadyFavorite: true 
      };
    }
    
    return { success: false, message: error.response?.data?.message || 'Failed to add to favorites' };
  }
};

/**
 * Remove a daycare from user's favorites
 */
export const removeFromFavorites = async (operationNumber) => {
  try {
    console.log(`Removing favorite for operation #${operationNumber}`);
    const response = await optimizedMysqlApi.delete(`/favorites/${operationNumber}`);
    
    // Remove from the favorites cache for immediate UI updates
    if (response.data.success) {
      if (window.favoritesCache) {
        delete window.favoritesCache[operationNumber];
        console.log(`[optimizedApi] Removed daycare #${operationNumber} from favorites cache`);
      }
      
      // Update the global list if it exists
      if (window.favoriteIds) {
        window.favoriteIds = window.favoriteIds.filter(id => id !== operationNumber);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error removing daycare from favorites:', error);
    
    // If the error is 404, the daycare wasn't in favorites, so we can consider it a success
    if (error.response && error.response.status === 404) {
      // Remove from cache in case it's there erroneously
      if (window.favoritesCache) {
        delete window.favoritesCache[operationNumber];
      }
      
      return { 
        success: true, 
        message: 'Daycare was not in favorites',
        wasNotFavorite: true 
      };
    }
    
    return { success: false, message: error.response?.data?.message || 'Failed to remove from favorites' };
  }
};

  /**
   * Get all favorites for the current user
   */
  export const getFavorites = async () => {
    try {
      console.log('Fetching all user favorites');
      const response = await optimizedMysqlApi.get('/favorites');

      // Handle successful responses (including 304 Not Modified)
      let data = response.data;

      // If the response is 304 or empty, provide a default structure
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        console.log('Empty or 304 response, using default empty structure');
        data = { success: true, favorites: [] };
      }

      // Update the favorites cache for immediate use
      if (data.success && data.favorites) {
        // Create a new favorites cache
        const newCache = {};

        // Also update the global favoriteIds array for other components
        window.favoriteIds = window.favoriteIds || [];

        // Clear existing array before adding new items
        window.favoriteIds.length = 0;

        // Add each favorite to both data structures
        data.favorites.forEach(favorite => {
          const opNum = favorite.operation_number || favorite.operationNumber;
          if (opNum) {
            newCache[opNum] = true;
            window.favoriteIds.push(opNum);
          }
        });

        // Now set the global cache
        window.favoritesCache = newCache;
        console.log(`[optimizedApi] Updated global favorites cache with ${Object.keys(newCache).length} items`);
      } else {
        // Ensure we have a default structure even if the response format is unexpected
        console.log('[optimizedApi] Setting empty favorites cache');
        window.favoritesCache = {};
        window.favoriteIds = [];
      }

      return data;
    } catch (error) {
      console.error('Error fetching favorites:', error);

      // Handle 304 responses that might be caught as errors
      if (error.response && error.response.status === 304) {
        console.log('304 Not Modified response - using empty favorites list');
        window.favoritesCache = window.favoritesCache || {};
        window.favoriteIds = window.favoriteIds || [];
        return { success: true, message: 'No changes to favorites', favorites: [] };
      }

      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch favorites',
        favorites: []
      };
    }
  };
export default optimizedMysqlApi;
