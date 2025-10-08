import axios from 'axios';
  // Import axios separately for direct calls
import axiosRaw from 'axios';
// Base API URL - use value from .env file if available, or fallback to standard URLs
  const API_URL = process.env.REACT_APP_API_URL
    ? `${process.env.REACT_APP_API_URL}/api/mysql`
    : (process.env.NODE_ENV === 'production'
      ? '/api/mysql'  // Use relative path for production
      : 'http://localhost:8084/api/mysql');

// URL for the optimized API
const OPTIMIZED_API_URL = process.env.NODE_ENV === 'production'
  ? '/api/mysql-optimized'
  : 'http://localhost:8084/api/mysql-optimized';

// Create API client
const mysqlApi = axios.create({
  baseURL: API_URL,
});

// Add authorization token to requests if available
mysqlApi.interceptors.request.use(
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
 * Fetch filtered daycare data from MySQL database
 */
export const fetchDaycares = async (page = 1, limit = 20, filters = {}, sortColumn = '', sortDirection = 'asc') => {
  try {
    console.log('Fetching daycares from MySQL database with filters:', filters);
    
    // Prepare parameters
    const params = {
      page,
      limit: 20, // Force limit to 20 to ensure we always get correct number of results
      sortColumn,
      sortDirection,
      name: '',
      city: filters.city || '',
      operation_type: filters.operation_type || '',
      // Add zipcode and operation_id parameters
      zipcode: '',
      operation_id: '',
      // Always include these parameters with empty string fallbacks
      priceRange: filters.priceRange || '',
      rating: filters.rating || '',
      yearsInOperation: filters.yearsInOperation || ''
    };

    // CRITICAL FIX: Also add min_price and max_price parameters while keeping the original priceRange
     if (filters.priceRange) {
      console.log(`Adding min_price and max_price parameters based on priceRange=${filters.priceRange}`);
      const parts = filters.priceRange.split('-');
      if (parts.length === 2) {
        const minPrice = parseInt(parts[0], 10);
        // Set min_price always
        if (!isNaN(minPrice)) {
	  params.min_price = minPrice;
        }
     
        // Set max_price only if it's not "up"
        if (parts[1] !== 'up') {
         const maxPrice = parseInt(parts[1], 10);
	 if (!isNaN(maxPrice)) {
           params.max_price = maxPrice;
	 }
      }

      console.log(`Added min_price=${params.min_price}, max_price=${params.max_price || 'unlimited'}`);
     }
    }

    // CRITICAL FIX: Check if searchTerm might be a zipcode or operation ID
    if (filters.searchTerm) {
	const searchTerm = filters.searchTerm.trim();
	// Check if it's a 5-digit number (likely a zipcode)
	if (/^\d{5}$/.test(searchTerm)) {
	  console.log(`Search term "${searchTerm}" appears to be a zipcode, routing to zipcode parameter`);
	  params.zipcode = searchTerm;
	}
	// Otherwise treat as a name search
	else {
	  console.log(`Search term "${searchTerm}" appears to be a name/city/type search`);
 	  params.name = searchTerm;
       }
    }

    // Make API request
    const response = await mysqlApi.get('/daycares', { params });
    
    if (response.data && response.data.success) {
      console.log(`Received ${response.data.daycares.length} daycares from MySQL database`);
      return {
        daycares: response.data.daycares || [],
        total: response.data.total || 0
      };
    } else {
      console.error('Error response from MySQL API:', response.data);
      return { daycares: [], total: 0 };
    }
  } catch (error) {
    console.error('Error fetching daycares from MySQL database:', error);
    return { daycares: [], total: 0 };
  }
};

/**
 * Fetch a single daycare by ID from MySQL database
 */
export const fetchDaycareById = async (operationId) => {
  try {
    if (!operationId) {
      throw new Error('Operation ID is required');
    }
    
    console.log(`Fetching daycare #${operationId} from MySQL database`);
    
    // Make API request
    const response = await mysqlApi.get(`/daycares/${operationId}`);
    
    if (response.data && response.data.success) {
      console.log('Received daycare details from MySQL database');
      
      const daycare = response.data.daycare;
      
// SPECIAL HANDLING: Get parent recommendations directly from the risk_analysis table
  try {
    // Use proper protocol based on environment
    const protocol = window.location.protocol || 'http:';
    // CRITICAL FIX: Use the same host/port that's serving the frontend
    const currentHost = window.location.hostname || 'localhost';
    const currentPort = window.location.port ? `:${window.location.port}` : '';

    // For production, don't include port in the URL
    const dbUrl =
  `${protocol}//${currentHost}${currentPort}/api/public/debug-recommendations/${operationId}`;

    console.log(`[DIRECT] Fetching recommendations directly from ${dbUrl}`);

    // Axios for most reliable API access
    try {
      const dbResponse = await axiosRaw.get(dbUrl);
      console.log('[DIRECT] API request successful');          
          // If we got successful recommendations, use them
          if (dbResponse.data && dbResponse.data.success && 
              dbResponse.data.recommendations && 
              Array.isArray(dbResponse.data.recommendations) &&
              dbResponse.data.recommendations.length > 0) {
            
            console.log(`[DIRECT] Found ${dbResponse.data.recommendations.length} recommendations from risk_analysis table`);
            
            // Create a completely new array to ensure reference is changed
            const newRecommendations = [...dbResponse.data.recommendations];
            
            // Directly assign recommendations to the daycare object
            daycare.parent_recommendations = newRecommendations;
            
            // Verify assignment succeeded
            console.log('[VERIFICATION] Successfully set parent_recommendations:');
            console.log('- Type:', typeof daycare.parent_recommendations);
            console.log('- Is array:', Array.isArray(daycare.parent_recommendations));
            console.log('- Length:', daycare.parent_recommendations.length);
            console.log('- First item:', daycare.parent_recommendations[0]);
          } else {
            console.log('[DIRECT] No valid recommendations in API response');
            console.log('- API response:', dbResponse.data);
            
            // Set default recommendations if none found
            daycare.parent_recommendations = [
              "Ask about their illness policy and when children should stay home",
              "Inquire about their medication administration procedures",
              "Ask about their food allergy management protocols",
              "Discuss their emergency procedures and safety protocols",
              "Ask about their staff training and qualifications",
              "Inquire about their curriculum and educational philosophy"
            ];
            console.log('[DIRECT] Set default recommendations as fallback');
          }
        } catch (axiosError) {
          console.log('[DIRECT] API request failed:', axiosError.message);
          
          // Try fetch API as backup approach
          try {
            console.log('[DIRECT] Trying fetch API as backup method');
            const fetchResponse = await fetch(dbUrl);
            
            if (!fetchResponse.ok) {
              throw new Error(`Fetch failed with status ${fetchResponse.status}`);
            }
            
            const fetchData = await fetchResponse.json();
            
            if (fetchData && fetchData.success && fetchData.recommendations && 
                Array.isArray(fetchData.recommendations) && fetchData.recommendations.length > 0) {
              
              console.log(`[DIRECT] Fetch API found ${fetchData.recommendations.length} recommendations`);
              daycare.parent_recommendations = [...fetchData.recommendations];
            } else {
              // Set default recommendations if none found
              daycare.parent_recommendations = [
                "Ask about their illness policy and when children should stay home",
                "Inquire about their medication administration procedures",
                "Ask about their food allergy management protocols",
                "Discuss their emergency procedures and safety protocols",
                "Ask about their staff training and qualifications",
                "Inquire about their curriculum and educational philosophy"
              ];
              console.log('[DIRECT] Set default recommendations after fetch API returned no data');
            }
          } catch (fetchError) {
            console.log('[DIRECT] Fetch API also failed:', fetchError.message);
            
            // Set default recommendations as ultimate fallback
            daycare.parent_recommendations = [
              "Ask about their illness policy and when children should stay home",
              "Inquire about their medication administration procedures",
              "Ask about their food allergy management protocols",
              "Discuss their emergency procedures and safety protocols",
              "Ask about their staff training and qualifications",
              "Inquire about their curriculum and educational philosophy"
            ];
            console.log('[DIRECT] Set default recommendations after all fetch attempts failed');
          }
        }
      } catch (dbError) {
        console.log('[DIRECT] Error getting recommendations:', dbError.message);
      }
      
      // If we don't have valid recommendations from direct database access, try fallback
      if (!daycare.parent_recommendations || 
          !Array.isArray(daycare.parent_recommendations) || 
          daycare.parent_recommendations.length === 0) {
        
        console.log(`[FALLBACK] No valid recommendations yet, trying fallback approaches`);
        
        // First try: Use original parent_recommendations if they exist
        if (daycare.parent_recommendations) {
          console.log(`[FALLBACK] Trying to parse existing parent_recommendations`);
          
          // Try to parse as JSON if it's a string
          if (typeof daycare.parent_recommendations === 'string') {
            try {
              daycare.parent_recommendations = JSON.parse(daycare.parent_recommendations);
              console.log(`[FALLBACK] Successfully parsed JSON string`);
            } catch (e) {
              console.log(`[FALLBACK] Failed to parse JSON string:`, e.message);
            }
          }
          
          // If it's an object but not an array, convert to array
          if (typeof daycare.parent_recommendations === 'object' &&
              !Array.isArray(daycare.parent_recommendations) &&
              daycare.parent_recommendations !== null) {
            daycare.parent_recommendations = Object.values(daycare.parent_recommendations);
            console.log(`[FALLBACK] Converted object to array with ${daycare.parent_recommendations.length} items`);
          }
        }
        
        // Second try: Use test data if we still don't have valid recommendations
        if (!daycare.parent_recommendations || 
            !Array.isArray(daycare.parent_recommendations) || 
            daycare.parent_recommendations.length === 0) {
          console.log(`[FALLBACK] Using test recommendations endpoint`);
          
          try {
            // URL for optimized test endpoint
            const testEndpoint = `${OPTIMIZED_API_URL || API_URL}/daycares/${operationId}/test-recommendations`;
            console.log(`[FALLBACK] Calling endpoint:`, testEndpoint);
            
            const testResponse = await axiosRaw.get(testEndpoint);
            
            if (testResponse.data && testResponse.data.success && 
                testResponse.data.recommendations &&
                Array.isArray(testResponse.data.recommendations) &&
                testResponse.data.recommendations.length > 0) {
              console.log(`[FALLBACK] Got ${testResponse.data.recommendations.length} test recommendations`);
              daycare.parent_recommendations = [...testResponse.data.recommendations];
            } else {
              console.log(`[FALLBACK] Test endpoint returned invalid data`);
            }
          } catch (testError) {
            console.error(`[FALLBACK] Error fetching test recommendations:`, testError.message);
          }
        }
        
        // Final fallback: Use hard-coded recommendations
        if (!daycare.parent_recommendations || 
            !Array.isArray(daycare.parent_recommendations) || 
            daycare.parent_recommendations.length === 0) {
          console.log(`[FALLBACK] Using hard-coded recommendations`);
          
          // Get daycare type
          const daycareType = daycare.operation_type || '';
          
          if (daycareType.toLowerCase().includes('infant')) {
            daycare.parent_recommendations = [
              "Ask about their safe sleep policies for infants and how they follow SIDS prevention guidelines",
              "Inquire about their feeding schedules and how they handle breast milk/formula storage",
              "Ask about their diaper changing procedures and how they prevent cross-contamination",
              "Discuss their policy on daily reports for infant activities, feedings, and diaper changes",
              "Ask about their staff-to-infant ratios and how individual attention is provided"
            ];
          } else if (daycareType.toLowerCase().includes('montessori')) {
            daycare.parent_recommendations = [
              "Ask about their approach to Montessori materials and classroom environment",
              "Inquire about their directress/director training in Montessori methods",
              "Ask about how they balance freedom and structure in the classroom",
              "Discuss their approach to mixed-age groupings and peer learning",
              "Ask about their assessment methods and how they track development"
            ];
          } else {
            daycare.parent_recommendations = [
              "Ask about their teacher-to-child ratios and how they maintain proper supervision",
              "Inquire about their health and illness policy",
              "Ask about their approach to discipline and behavior management",
              "Discuss their daily schedule and curriculum",
              "Ask about staff qualifications and training requirements"
            ];
          }
        }
      }
      
      console.log(`[FINAL] Daycare processed, has ${daycare.parent_recommendations?.length || 0} recommendations`);
      if (daycare.parent_recommendations && daycare.parent_recommendations.length > 0) {
        console.log(`[FINAL] First few:`, daycare.parent_recommendations.slice(0, 3));
      }
      
      return daycare;
    } else {
      console.error('Error response from MySQL API:', response.data);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching daycare #${operationId} from MySQL database:`, error);
    return null;
  }
};

/**
 * Fetch violations for a daycare from MySQL database
 */
export const fetchViolations = async (operationId) => {
  try {
    if (!operationId) {
      return [];
    }
    
    console.log(`Fetching violations for daycare #${operationId} from MySQL database`);
    
    // Make API request
    const response = await mysqlApi.get(`/daycares/violations/${operationId}`);
    
    if (response.data && response.data.success) {
      console.log(`Received ${response.data.violations.length} violations from MySQL database`);
      return response.data.violations || [];
    } else {
      console.error('Error response from MySQL API:', response.data);
      return [];
    }
  } catch (error) {
    console.error(`Error fetching violations for daycare #${operationId} from MySQL database:`, error);
    return [];
  }
};

/**
 * Fetch available cities from MySQL database
 */
export const fetchCities = async () => {
  try {
    console.log('Fetching cities from MySQL database');
    
    // Make API request
    const response = await mysqlApi.get('/daycares/cities/list');
    
    if (response.data && response.data.success) {
      console.log(`Received ${response.data.cities.length} cities from MySQL database`);
      return response.data.cities || [];
    } else {
      console.error('Error response from MySQL API:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching cities from MySQL database:', error);
    return [];
  }
};

/**
   * Fetch autocomplete suggestions for daycare names, cities, and zipcodes
   */
  export const fetchAutocompleteSuggestions = async (searchTerm, limit = 10) => {
    try {
      if (!searchTerm || searchTerm.length < 2) {
        return { suggestions: [] };
      }

      console.log(`Fetching autocomplete suggestions for: "${searchTerm}"`);

      // Direct fetch with absolute URL to avoid proxy issues
      const baseUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:8084'
        : 'https://api.daycarealert.com';

      // CRITICAL FIX: Force a small delay to ensure API is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Include searchType=all parameter to search across daycare names, cities, and zipcodes
      // Always add numeric=true to ensure zipcode detection works
      const url = `${baseUrl}/api/mysql/daycares/autocomplete?term=${encodeURIComponent(searchTerm)}&limit=${limit}&searchType=all&numeric=true`;
      console.log(`Autocomplete request URL: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();

      if (data && data.success) {
        console.log(`Received ${data.suggestions.length} autocomplete suggestions`);

        // Process suggestions to ensure type field is correctly set
        const processedSuggestions = (data.suggestions || []).map(suggestion => {
          // If suggestion already has a type field, use it
          // Otherwise, determine type based on properties
          if (!suggestion.type) {
            if (suggestion.zipcode || (suggestion.text && suggestion.text.match(/^\d{5}$/))) {
              suggestion.type = 'zipcode';
              // Ensure it has a display name
              if (!suggestion.name && suggestion.text) {
                suggestion.name = `Zipcode ${suggestion.text}`;
              }
            } else if (suggestion.city || (suggestion.name && !suggestion.operation_number)) {
              suggestion.type = 'city';
              // Ensure it has a display name
              if (!suggestion.name && suggestion.text) {
                suggestion.name = suggestion.text;
              }
            } else {
              suggestion.type = 'daycare';
            }
          }

          return suggestion;
        });

        return {
          suggestions: processedSuggestions
        };
      } else {
        console.error('Error response from autocomplete API:', data);
        return { suggestions: [] };
      }
    } catch (error) {
      console.error('Error fetching autocomplete suggestions:', error);
      return { suggestions: [] };
    }
  };
  export default mysqlApi;
