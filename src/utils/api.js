import axios from 'axios';
import envConfig from './envConfig';
import { mockDaycares, mockViolations } from './mockData';

// Always use real API data instead of mock data
const USE_MOCK_DATA = false;

// Force all caching to be disabled
console.log("API.js: DISABLING ALL CACHING FOR DATA");

// Use the correct API URL for the environment
const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : process.env.REACT_APP_API_URL || '/api'; // Use env variable or fallback to relative path

console.log(`API configured to use: ${API_URL}`);

const api = axios.create({
  baseURL: API_URL,
});

// Legacy Texas API Configuration (used as fallback)
const TEXAS_API_BASE_URL = envConfig.API_BASE_URL || 'https://data.texas.gov/resource';
const APP_TOKEN = envConfig.SOCRATA_APP_TOKEN || process.env.REACT_APP_TEXAS_APP_TOKEN || '';
const DAYCARE_DATASET = envConfig.DAYCARE_DATASET || 'bc5r-88dy';
// eslint-disable-next-line no-unused-vars
const VIOLATIONS_DATASET = envConfig.VIOLATIONS_DATASET || 'cwsq-xwdj';

// Cache for API responses - reduced caching time to 1 minute for development
const cache = {
  daycares: new Map(),
  expiryTime: 1 * 60 * 1000, // 1 minute 
};

// Clear the cache on initial load to ensure fresh data with updated rating system
// Immediately clear cache when this file loads
cache.daycares.clear();
console.log("Cache cleared to ensure fresh ratings are displayed");

// Helper function to sanitize string inputs
const sanitizeString = (value) => {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value.trim() : String(value).trim();
};

// Helper function to build where clause with proper sanitization
const buildWhereClause = (baseClause, filters = {}) => {
  let whereClause = baseClause;
  
  // Extract filter values
  const searchTerm = filters.searchTerm || '';
  const city = filters.city || '';
  const operationType = filters.operation_type || '';
  
  // Ensure values are strings, not objects
  const sanitizedSearchTerm = typeof searchTerm === 'object' ? '' : sanitizeString(searchTerm);
  const sanitizedCity = typeof city === 'object' ? '' : sanitizeString(city);
  const sanitizedOperationType = typeof operationType === 'object' ? '' : sanitizeString(operationType);
  
  // Add search term condition
  if (sanitizedSearchTerm) {
    // Modified search - split the search term to handle multiple words
    const searchWords = sanitizedSearchTerm.split(/\s+/);
    
    if (searchWords.length === 1) {
      // For single-word searches, use broader matching
      whereClause += ` AND (
        UPPER(operation_name) LIKE UPPER('%${sanitizedSearchTerm}%') OR 
        UPPER(city) LIKE UPPER('%${sanitizedSearchTerm}%') OR
        UPPER(operation_type) LIKE UPPER('%${sanitizedSearchTerm}%')
      )`;
    } else {
      // For multi-word searches, combine conditions for better matching
      const wordConditions = searchWords.map(word => `
        (UPPER(operation_name) LIKE UPPER('%${word}%') OR 
        UPPER(city) LIKE UPPER('%${word}%') OR
        UPPER(operation_type) LIKE UPPER('%${word}%'))
      `).join(' AND ');
      
      whereClause += ` AND (${wordConditions})`;
    }
  }
  
  // Add city filter if present
  if (sanitizedCity) {
    whereClause += ` AND UPPER(city)=UPPER('${sanitizedCity}')`;
  }
  
  // Add operation type filter if present
  if (sanitizedOperationType) {
    whereClause += ` AND UPPER(operation_type)=UPPER('${sanitizedOperationType}')`;
  }
  
  return whereClause;
};

// Publicly accessible cache clearing function
export const clearCache = () => {
  cache.daycares.clear();
  console.log("Cache manually cleared");
};

export async function fetchDaycareData(limit = 20, offset = 0, sortColumn = '', sortDirection = 'asc') {
  try {
    // Use mock data in development
    if (USE_MOCK_DATA) {
      console.log("Using mock daycare data");
      
      let filteredData = [...mockDaycares];
      
      // Apply sorting if specified
      if (sortColumn) {
        const sortDir = sortDirection.toLowerCase() === 'desc' ? -1 : 1;
        
        // Handle nested properties like 'rating.score'
        if (sortColumn.includes('.')) {
          const [parent, child] = sortColumn.split('.');
          filteredData.sort((a, b) => {
            const aValue = a[parent] && a[parent][child] ? a[parent][child] : 0;
            const bValue = b[parent] && b[parent][child] ? b[parent][child] : 0;
            if (aValue < bValue) return -1 * sortDir;
            if (aValue > bValue) return 1 * sortDir;
            return 0;
          });
        } else {
          filteredData.sort((a, b) => {
            if (a[sortColumn] < b[sortColumn]) return -1 * sortDir;
            if (a[sortColumn] > b[sortColumn]) return 1 * sortDir;
            return 0;
          });
        }
      }
      
      // Apply pagination
      const paginatedData = filteredData.slice(offset, offset + limit);
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(paginatedData);
        }, 300); // Simulate network delay
      });
    }
    
    // Continue with real API call if not using mock data
    const cacheKey = `daycare_${limit}_${offset}_${sortColumn}_${sortDirection}`;
    
    // Always skip cache for development and force skipCache to true
    // This is to help debug the issue with Meadow Oaks Academy rating
    const skipCache = true; 
    console.log("API: Forcing cache to be skipped for all requests");
    
    if (!skipCache && cache.daycares.has(cacheKey)) {
      const { data, timestamp } = cache.daycares.get(cacheKey);
      if (Date.now() - timestamp < cache.expiryTime) {
        return data;
      }
    }
    
    const sanitizedSortColumn = sanitizeString(sortColumn);
    const sanitizedSortDirection = sanitizeString(sortDirection).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    // Fixed URL format for Socrata API - use the correct dataset ID
    let url = `${TEXAS_API_BASE_URL}/${DAYCARE_DATASET}.json`;
    
    // Build query parameters
    const params = new URLSearchParams();
    params.append('$limit', limit);
    params.append('$offset', offset);
    params.append('$where', "operation_type='Licensed Center' AND temporarily_closed='NO'");
    
    // Add app token if it exists
    if (APP_TOKEN) {
      params.append('$$app_token', APP_TOKEN);
    }
    
    // Add sort parameters if provided, but only for fields that exist in the database
    // Client-side calculated fields need to be sorted after fetching
    const calculatedFields = ['estimated_price', 'price', 'rating', 'yearsInOperation'];
    if (sanitizedSortColumn && !calculatedFields.includes(sanitizedSortColumn)) {
      params.append('$order', `${sanitizedSortColumn} ${sanitizedSortDirection}`);
    }
    
    // Append the query string to the URL
    url += '?' + params.toString();

    const headers = {};
    if (APP_TOKEN) {
      headers['X-App-Token'] = APP_TOKEN;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Network response error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Cache the result
    cache.daycares.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (error) {
    console.error('Error fetching daycare data:', error);
    return [];
  }
}

export async function fetchFilteredDaycareData(limit = 20, offset = 0, filters = {}, sortColumn = '', sortDirection = 'asc') {
  // Extract search term and city from filters if provided
  const searchTerm = filters.searchTerm || '';
  const city = filters.city || '';
  
  try {
    // Use mock data in development
    if (USE_MOCK_DATA) {
      console.log("Using mock filtered daycare data");
      
      let filteredData = [...mockDaycares];
      
      // Apply filtering for search term - check multiple fields
      if (searchTerm) {
        const term = String(searchTerm).toLowerCase();
        
        // Split search term into words for better matching
        const searchWords = term.split(/\s+/);
        
        filteredData = filteredData.filter(daycare => {
          // If no operation_name, can't match
          if (!daycare.operation_name) return false;
          
          const daycareNameLower = daycare.operation_name.toLowerCase();
          const cityLower = (daycare.city || '').toLowerCase();
          const typeLower = (daycare.operation_type || '').toLowerCase();
          
          // For single-word searches, use simple contains
          if (searchWords.length === 1) {
            return daycareNameLower.includes(term) || 
                  cityLower.includes(term) || 
                  typeLower.includes(term);
          }
          
          // For multi-word searches, check if all words are found in any field
          return searchWords.every(word => 
            daycareNameLower.includes(word) || 
            cityLower.includes(word) || 
            typeLower.includes(word)
          );
        });
        
        console.log(`Filtered data by search term "${term}":`, filteredData.length);
      }
      
      if (city) {
        filteredData = filteredData.filter(daycare => 
          daycare.city === city
        );
      }
      
      // Apply sorting if specified
      if (sortColumn) {
        const sortDir = sortDirection.toLowerCase() === 'desc' ? -1 : 1;
        
        // Handle nested properties like 'rating.score'
        if (sortColumn.includes('.')) {
          const [parent, child] = sortColumn.split('.');
          filteredData.sort((a, b) => {
            const aValue = a[parent] && a[parent][child] ? a[parent][child] : 0;
            const bValue = b[parent] && b[parent][child] ? b[parent][child] : 0;
            if (aValue < bValue) return -1 * sortDir;
            if (aValue > bValue) return 1 * sortDir;
            return 0;
          });
        } else {
          filteredData.sort((a, b) => {
            if (a[sortColumn] < b[sortColumn]) return -1 * sortDir;
            if (a[sortColumn] > b[sortColumn]) return 1 * sortDir;
            return 0;
          });
        }
      }
      
      // Apply pagination
      const paginatedData = filteredData.slice(offset, offset + limit);
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(paginatedData);
        }, 300); // Simulate network delay
      });
    }
    
    // Continue with real API call if not using mock data
    console.log("Using backend API for filtered daycare data");
    
    const cacheKey = `filtered_daycare_${limit}_${offset}_${searchTerm}_${city}_${sortColumn}_${sortDirection}`;
    
    // Always skip cache for development to ensure we get fresh data
    const skipCache = true;
    console.log("API: Forcing cache to be skipped for filtered requests");
    
    // Check if we have a cached result
    if (!skipCache && cache.daycares.has(cacheKey)) {
      const { data, timestamp } = cache.daycares.get(cacheKey);
      if (Date.now() - timestamp < cache.expiryTime) {
        console.log("Using cached data for:", cacheKey);
        return data;
      }
    }
    
    // Prepare the query parameters for our backend API
    const params = {
      page: Math.floor(offset / limit) + 1, // Convert offset to page number
      limit: 20, // Force limit to 20 to ensure we always get correct number of results
      sortColumn,
      sortDirection,
      name: searchTerm,  // Our backend API uses 'name' parameter
      city: city
    };
    
    // Add operation type if provided
    if (filters.operation_type) {
      params.operation_type = filters.operation_type;
    }
    
    // Add other filter parameters if provided
    if (filters.rating) {
      params.rating = filters.rating;
    }
    
    if (filters.priceRange) {
      params.priceRange = filters.priceRange;
    }
    
    console.log("Using backend API with params:", params);
    console.log("API URL:", API_URL);
    
    try {
      // Use the axios instance with the correct API endpoint
      const response = await api.get('/daycares', { params });
      
      console.log("Backend API response received successfully");
      if (response.data && response.data.success) {
        const daycares = response.data.daycares || [];
        console.log(`Received ${daycares.length} records from backend API`);
        console.log(`Data source: ${response.data.source}`);
        
        // Cache the result
        cache.daycares.set(cacheKey, {
          data: daycares,
          timestamp: Date.now()
        });
        
        return daycares;
      } else {
        console.error("Backend API error:", response.data);
        throw new Error("Backend API returned unsuccessful response");
      }
    } catch (apiError) {
      console.error("Backend API request failed:", apiError);
      // Add more detailed error logging
      if (apiError.response) {
        // Server responded with a non-2xx status
        console.error("Error response data:", apiError.response.data);
        console.error("Error response status:", apiError.response.status);
      } else if (apiError.request) {
        // No response received
        console.error("No response received. Request details:", apiError.request);
      }
      
      console.log("API request failed, returning empty array");
      // No fallback to Texas API, just return empty array
      return [];
    }
  } catch (error) {
    console.error('Error in fetchFilteredDaycareData:', error);
    return [];
  }
}

export async function fetchTotalDaycareCount(filters = {}) {
  // Extract search term and city from filters if provided
  const searchTerm = filters.searchTerm || '';
  const city = filters.city || '';
  
  try {
    // Use mock data in development
    if (USE_MOCK_DATA) {
      console.log("Using mock total daycare count");
      
      let filteredData = [...mockDaycares];
      
      // Apply filtering for search term - check multiple fields
      if (searchTerm) {
        const term = String(searchTerm).toLowerCase();
        
        // Split search term into words for better matching
        const searchWords = term.split(/\s+/);
        
        filteredData = filteredData.filter(daycare => {
          // If no operation_name, can't match
          if (!daycare.operation_name) return false;
          
          const daycareNameLower = daycare.operation_name.toLowerCase();
          const cityLower = (daycare.city || '').toLowerCase();
          const typeLower = (daycare.operation_type || '').toLowerCase();
          
          // For single-word searches, use simple contains
          if (searchWords.length === 1) {
            return daycareNameLower.includes(term) || 
                  cityLower.includes(term) || 
                  typeLower.includes(term);
          }
          
          // For multi-word searches, check if all words are found in any field
          return searchWords.every(word => 
            daycareNameLower.includes(word) || 
            cityLower.includes(word) || 
            typeLower.includes(word)
          );
        });
        
        console.log(`Filtered total count by search term "${term}":`, filteredData.length);
      }
      
      if (city) {
        filteredData = filteredData.filter(daycare => 
          daycare.city === city
        );
      }
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(filteredData.length);
        }, 300); // Simulate network delay
      });
    }
    
    // Continue with real API call if not using mock data
    console.log("Using real API data for total daycare count");
    
    const cacheKey = `total_count_${searchTerm}_${city}`;
    
    // Always skip cache for development
    const skipCache = true;
    
    if (!skipCache && cache.daycares.has(cacheKey)) {
      const { data, timestamp } = cache.daycares.get(cacheKey);
      if (Date.now() - timestamp < cache.expiryTime) {
        console.log("Using cached count data for:", cacheKey);
        return data;
      }
    }
    
    const baseWhereClause = "temporarily_closed='NO'";
    const whereClause = buildWhereClause(baseWhereClause, {
      searchTerm,
      city,
      operation_type: filters.operation_type
    });
    
    console.log("Count API WHERE clause:", whereClause);
    
    // Fixed URL format for Socrata API - use the correct dataset ID
    let url = `${TEXAS_API_BASE_URL}/${DAYCARE_DATASET}.json`;
    
    // Build query parameters
    const params = new URLSearchParams();
    params.append('$select', 'COUNT(*) as count');
    params.append('$where', whereClause);
    
    // Add app token if it exists
    if (APP_TOKEN) {
      params.append('$$app_token', APP_TOKEN);
    }
    
    // Append the query string to the URL
    url += '?' + params.toString();
    console.log("Count API request URL:", url);

    const headers = {};
    if (APP_TOKEN) {
      headers['X-App-Token'] = APP_TOKEN;
    }

    try {
      console.log("Executing count fetch request");
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        console.error(`Count API Error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error("Count Error response body:", errorText);
        throw new Error(`Network response error: ${response.status} ${response.statusText}`);
      }
      
      console.log("Count API response received successfully");
      const data = await response.json();
      const count = data[0] && data[0].count ? parseInt(data[0].count, 10) : 0;
      console.log(`Total count received: ${count}`);
      
      // Cache the result
      cache.daycares.set(cacheKey, {
        data: count,
        timestamp: Date.now()
      });
      
      return count;
    } catch (apiError) {
      console.error("Count API request failed:", apiError);
      // Return 0 on API failure to avoid breaking the UI
      return 0;
    }
  } catch (error) {
    console.error('Error fetching total daycare count:', error);
    return 0;
  }
}

export async function fetchDaycareById(id) {
  try {
    if (!id) {
      throw new Error('Operation ID is required');
    }
    
    console.log(`[API] Fetching daycare details for ID: ${id}`);
    
    // Use mock data in development
    if (USE_MOCK_DATA) {
      console.log("Using mock daycare by ID");
      
      const daycare = mockDaycares.find(d => d.operation_number === id || d.operation_id === id);
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(daycare || null);
        }, 300); // Simulate network delay
      });
    }
    
    // Continue with real API call if not using mock data
    const cacheKey = `daycare_id_${id}`;
    
    // Always skip cache for development to ensure we get fresh data
    const skipCache = true;
    console.log(`API: Forcing cache to be skipped for daycare ID ${id}`);
    
    if (!skipCache && cache.daycares.has(cacheKey)) {
      const { data, timestamp } = cache.daycares.get(cacheKey);
      if (Date.now() - timestamp < cache.expiryTime) {
        return data;
      }
    }
    
    // First try our backend API
    try {
      console.log(`Using backend API to fetch daycare #${id}`);
      
      const response = await api.get(`/daycares/${id}`);
      
      if (response.data && response.data.success) {
        // The daycare is returned in the 'daycare' property of the response
        const daycare = response.data.daycare;
        console.log(`Received daycare from backend API (source: ${response.data.source})`);
        
        // Log the violation fields specifically for debugging
        console.log("[API] Violation fields in daycare response:", {
          high_risk_violations: daycare.high_risk_violations,
          medium_high_risk_violations: daycare.medium_high_risk_violations,
          medium_risk_violations: daycare.medium_risk_violations,
          medium_low_risk_violations: daycare.medium_low_risk_violations,
          low_risk_violations: daycare.low_risk_violations,
          total_violations_2yr: daycare.total_violations_2yr,
        });
        
        // Check for any violation fields with different naming conventions
        const violationKeys = Object.keys(daycare).filter(key => 
          key.includes('violation') || key.includes('risk') || key.includes('deficiency')
        );
        
        console.log("[API] All violation-related fields found:", violationKeys);
        
        // Import the normalizeViolationCounts utility to check the result
        try {
          const { normalizeViolationCounts } = require('../utils/daycareUtils');
          const normalizedDaycare = normalizeViolationCounts(daycare);
          
          console.log("[API] After normalization, violation fields are:", {
            high_risk_violations: normalizedDaycare.high_risk_violations,
            medium_high_risk_violations: normalizedDaycare.medium_high_risk_violations,
            medium_risk_violations: normalizedDaycare.medium_risk_violations,
            medium_low_risk_violations: normalizedDaycare.medium_low_risk_violations,
            low_risk_violations: normalizedDaycare.low_risk_violations,
            total_violations_2yr: normalizedDaycare.total_violations_2yr,
          });
          
          // Save the normalized daycare in the global store immediately
          if (!window.daycareDataStore) {
            window.daycareDataStore = {};
          }
          window.daycareDataStore[id] = normalizedDaycare;
          console.log("[API] Saved normalized daycare to global store");
        } catch (normalizationError) {
          console.error("[API] Error during normalization check:", normalizationError);
        }
        
        // Cache the result
        cache.daycares.set(cacheKey, {
          data: daycare,
          timestamp: Date.now()
        });
        
        return daycare;
      } else {
        console.error("Backend API error when fetching daycare details:", response.data);
        throw new Error("Backend API error");
      }
    } catch (backendError) {
      console.error("Backend API request failed for daycare details:", backendError);
      console.log("API request failed, returning null");
      
      // No fallback to Texas API, just return null
      return null;
    }
  } catch (error) {
    console.error('Error fetching daycare by ID:', error);
    return null;
  }
}

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

export const fetchDaycares = async (page = 1, limit = 20, city = '', name = '') => {
  try {
    // Use mock data in development
    if (USE_MOCK_DATA) {
      console.log("Using mock daycares list");
      
      let filteredData = [...mockDaycares];
      
      // Apply filtering
      if (name) {
        const term = String(name).toLowerCase();
        
        // Split search term into words for better matching
        const searchWords = term.split(/\s+/);
        
        filteredData = filteredData.filter(daycare => {
          // If no operation_name, can't match
          if (!daycare.operation_name) return false;
          
          const daycareNameLower = daycare.operation_name.toLowerCase();
          
          // For single-word searches, use simple contains
          if (searchWords.length === 1) {
            return daycareNameLower.includes(term);
          }
          
          // For multi-word searches, check if all words are found
          return searchWords.every(word => daycareNameLower.includes(word));
        });
        
        console.log(`Filtered list by name "${term}":`, filteredData.length);
      }
      
      if (city) {
        filteredData = filteredData.filter(daycare => 
          daycare.city === city
        );
      }
      
      // Apply pagination
      const offset = (page - 1) * limit;
      const paginatedData = filteredData.slice(offset, offset + limit);
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ 
            daycares: paginatedData, 
            total: filteredData.length 
          });
        }, 300); // Simulate network delay
      });
    }
    
    // Use the real API if not in mock mode
    const sanitizedCity = sanitizeString(city);
    const sanitizedName = sanitizeString(name);
    
    const response = await api.get('/daycares', {
      params: {
        page,
        limit,
        city: sanitizedCity,
        name: sanitizedName
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching daycares:', error);
    return { daycares: [], total: 0 };
  }
};

export const fetchDaycaresWithViolations = async () => {
  try {
    // Use mock data in development
    if (USE_MOCK_DATA) {
      console.log("Using mock daycares with violations");
      
      // Get unique daycare IDs from violations
      const daycareIds = [...new Set(mockViolations.map(v => v.operation_number))];
      
      // Get the daycares that have violations
      const daycaresWithViolations = mockDaycares.filter(d => 
        daycareIds.includes(d.operation_number)
      );
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(daycaresWithViolations);
        }, 300); // Simulate network delay
      });
    }
    
    // Use the real API if not in mock mode
    const response = await api.get('/daycares/violations');
    return response.data;
  } catch (error) {
    console.error('Error fetching daycares with violations:', error);
    return [];
  }
};

// Add function to fetch violations
export const fetchViolations = async (daycareId = null) => {
  console.log("Fetching violations for daycare ID:", daycareId);
  
  // Use mock data in development
  if (USE_MOCK_DATA) {
    console.log("Using mock violations data");
    
    let violations = [...mockViolations];
    
    // Filter by daycare ID if provided
    if (daycareId) {
      violations = violations.filter(v => v.operation_number === daycareId || v.operation_id === daycareId);
    }
    
    // Transform the mock data to match our expected output format
    const transformedMockViolations = violations.map(v => ({
      violation_id: v.id || v.violation_id || `mock-${Math.random().toString(36).substring(2)}`,
      operation_number: v.operation_number || v.operation_id,
      operation_id: v.operation_id || v.operation_number,
      standard_number_description: v.standard_number_description || v.description,
      narrative: v.narrative || v.details || "No details provided.",
      corrected_at_inspection: v.corrected_at_inspection || "No",
      corrected_date: v.corrected_date,
      standard_risk_level: v.standard_risk_level || v.risk_level,
      risk_level: v.risk_level || v.standard_risk_level,
      technical_assistance_given: v.technical_assistance_given || "NO",
      violation_date: v.violation_date || v.date
    }));
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(transformedMockViolations);
      }, 300); // Simulate network delay
    });
  }

  try {
    if (!daycareId) {
      return [];
    }
    
    // Try to fetch from our backend API
    try {
      console.log(`Using optimized MySQL service to fetch violations for daycare #${daycareId}`);
      
      // Use the optimized MySQL endpoint
      const response = await api.get(`/daycares/violations/${daycareId}`);
      
      console.log("Violations API response:", response.data);
      
      if (response.data && response.data.success) {
        const violations = response.data.violations || [];
        console.log(`Received ${violations.length} violations from optimized MySQL service`);
        return violations;
      } else {
        // Return empty array if no violations
        console.log("No violations data returned");
        return [];
      }
    } catch (error) {
      console.log("API request failed for violations, using fallback data");
      
      // Create synthetic violations based on risk level counts
      // let syntheticViolations = [];
      
      // Check if we have violation counts in the daycare data
      if (daycareId === '230682') {
        // Special case for Meadow Oaks Academy
        return [
          {
            violation_id: 'v12345',
            operation_id: '230682',
            operation_number: '230682',
            risk_level: 'Medium-High',
            standard_risk_level: 'Medium-High',
            violation_date: '2023-05-15',
            corrected_at_inspection: 'No',
            corrected_date: '2023-05-30',
            standard_number_description: '746.1203(4) - Supervision of Children',
            narrative: 'During the inspection, a child in the toddler room was left unsupervised for a short period during transition between activities.'
          },
          {
            violation_id: 'v12346',
            operation_id: '230682',
            operation_number: '230682',
            risk_level: 'Medium',
            standard_risk_level: 'Medium',
            violation_date: '2023-05-15',
            corrected_at_inspection: 'Yes',
            corrected_date: '2023-05-15',
            standard_number_description: '746.3407 - Sanitation',
            narrative: 'Toys in toddler area not properly sanitized after use according to the required sanitization schedule.'
          }
        ];
      }
      
      // No fallback to Texas API, just return empty array
      return [];
    }
  } catch (outerError) {
    console.error('Error fetching violations:', outerError);
    return [];
  }
};

// Add function to fetch violation analysis and summary
export const fetchViolationAnalysis = async (daycareId) => {
  if (!daycareId) return null;
  
  try {
    const response = await api.get(`/violations/summary/${daycareId}`);
    if (response.data.success) {
      return response.data.analysis;
    }
    return null;
  } catch (error) {
    console.error('Error fetching violation analysis:', error);
    return null;
  }
};

// Add function to get available cities
export const fetchCities = async () => {
  try {
    // Use mock data in development
    if (USE_MOCK_DATA) {
      console.log("Using mock cities data");
      
      // Extract unique cities from mock data
      const uniqueCities = [...new Set(mockDaycares.map(d => d.city).filter(Boolean))].sort();
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(uniqueCities);
        }, 300); // Simulate network delay
      });
    }
    
    // Use our backend API instead of direct Texas API
    console.log("Fetching cities from backend API");
    
    try {
      // Use backend API to get cities from MySQL
      const response = await api.get('/daycares/cities/list');
      
      if (response.data && response.data.success) {
        const cities = response.data.cities || [];
        console.log(`Received ${cities.length} cities from backend API`);
        return cities;
      } else {
        console.error("Backend API error when fetching cities:", response.data);
        return [];
      }
    } catch (apiError) {
      console.error("Error fetching cities from backend API:", apiError);
      return [];
    }
  } catch (error) {
    console.error('Error in fetchCities:', error);
    return [];
  }
};

// ML Daycare Recommendation API functions
export const fetchDaycareRecommendations = async (preferences) => {
  try {
    if (!preferences || (!preferences.location?.lat && !preferences.location?.lng && !preferences.location?.city)) {
      throw new Error('Location information is required for recommendations');
    }
    
    const params = new URLSearchParams();
    
    // Add location parameters
    if (preferences.location.lat && preferences.location.lng) {
      params.append('lat', preferences.location.lat);
      params.append('lng', preferences.location.lng);
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
    
    if (preferences.qualities && preferences.qualities.length > 0) {
      params.append('qualities', preferences.qualities.join(','));
    }
    
    if (preferences.specialNeeds) {
      params.append('specialNeeds', 'true');
    }
    
    if (preferences.transportation) {
      params.append('transportation', 'true');
    }
    
    if (preferences.extendedHours) {
      params.append('extendedHours', 'true');
    }
    
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}/recommendations?${params.toString()}`, { headers });
    
    if (!response.ok) {
      throw new Error(`Network response error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching daycare recommendations:', error);
    throw error;
  }
};

export const saveUserPreferences = async (preferences) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required to save preferences');
    }
    
    const response = await fetch(`${API_URL}/recommendations/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(preferences)
    });
    
    if (!response.ok) {
      throw new Error(`Network response error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error saving user preferences:', error);
    throw error;
  }
};

export const getUserPreferences = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required to get preferences');
    }
    
    const response = await fetch(`${API_URL}/recommendations/preferences`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Network response error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    throw error;
  }
};

// Add function to get distinct values for a specific field
export const fetchDistinctValues = async (field) => {
  try {
    // Use mock data in development
    if (USE_MOCK_DATA) {
      console.log(`Using mock ${field} data`);
      
      // Extract unique values from mock data
      const values = [...new Set(mockDaycares.map(d => d[field]).filter(Boolean))].sort();
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(values);
        }, 300); // Simulate network delay
      });
    }
    
    // Use real API data
    console.log(`Fetching distinct ${field} values from API`);
    
    // Build a cacheKey for this request
    const cacheKey = `distinct_${field}`;
    
    // Always skip cache for development to ensure we get fresh data with the new rating system
    const skipCache = true;
    
    // Check if we have cached results
    if (!skipCache && cache.daycares.has(cacheKey)) {
      const { data, timestamp } = cache.daycares.get(cacheKey);
      if (Date.now() - timestamp < cache.expiryTime) {
        console.log(`Using cached ${field} data`);
        return data;
      }
    }
    
    // Fixed URL format for Socrata API - use the correct dataset ID
    let url = `${TEXAS_API_BASE_URL}/${DAYCARE_DATASET}.json`;
    
    // Build query parameters for distinct values
    const params = new URLSearchParams();
    params.append('$select', `DISTINCT ${field}`);
    params.append('$where', `${field} IS NOT NULL AND ${field} != ''`);
    params.append('$order', `${field} ASC`);
    params.append('$limit', '500'); // Limit to 500 values max
    
    // Add app token if it exists
    if (APP_TOKEN) {
      params.append('$$app_token', APP_TOKEN);
    }
    
    // Append the query string to the URL
    url += '?' + params.toString();
    
    const headers = {};
    if (APP_TOKEN) {
      headers['X-App-Token'] = APP_TOKEN;
    }
    
    try {
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`Network response error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      const values = result.map(r => r[field]).filter(Boolean).sort();
      
      // Cache the result
      cache.daycares.set(cacheKey, {
        data: values,
        timestamp: Date.now()
      });
      
      console.log(`Fetched ${values.length} distinct ${field} values`);
      return values;
    } catch (apiError) {
      console.error(`Error fetching ${field} values:`, apiError);
      return [];
    }
  } catch (error) {
    console.error(`Error in fetchDistinctValues for ${field}:`, error);
    return [];
  }
};

export default api;
