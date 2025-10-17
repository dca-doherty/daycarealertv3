import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCities, fetchDistinctValues } from '../utils/apiSelector';
import { fetchAutocompleteSuggestions } from '../utils/mysqlApi';
import { trackSearch, trackAutocompleteSelection, trackFilterUse, trackSeoKeyword } from '../utils/analytics';
import '../styles/UnifiedSearch.css';

/**
 * UnifiedSearch component
 * Provides search functionality across all data types with advanced filtering
 */
const UnifiedSearch = ({ 
  placeholder = "Search by daycare name, city, type, zip code, or operation ID...", 
  onSearch, 
  onFilterChange,
  initialFilters = {},
  searchCategories = ['daycares', 'violations', 'pricing'],
  showFilterControls = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  
  // States for dropdown options
  const [cityOptions, setCityOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  
  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const navigate = useNavigate();
  
  // Fetch dropdown options from API
  // Set initial filters
  useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length > 0) {
      setFilters(initialFilters);
    }
  }, [initialFilters]);

  // Load dropdown options
  useEffect(() => {
    const loadDropdownOptions = async () => {
      setLoadingOptions(true);
      try {
        // Fetch cities
        const cities = await fetchCities();
        setCityOptions(cities);
        
        // Fetch operation types
        const types = await fetchDistinctValues('operation_type');
        setTypeOptions(types);
        
        console.log(`Loaded ${cities.length} cities and ${types.length} types`);
      } catch (error) {
        console.error('Error loading dropdown options:', error);
      } finally {
        setLoadingOptions(false);
      }
    };
    
    loadDropdownOptions();
  }, []);

  // Fetch suggestions based on search term and category
  const fetchSuggestions = useCallback(async (term, category) => {
    if (!term || term.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      // Only fetch daycare suggestions for now
      // We can expand this to handle other categories later
      if (category === 'all' || category === 'daycares') {
        const result = await fetchAutocompleteSuggestions(term);
        setSuggestions(result.suggestions || []);
        console.log(`Loaded ${result.suggestions.length} autocomplete suggestions for "${term}"`);
      } else {
        // For other categories, we'll implement later
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(searchTerm, searchCategory);
    }, 300); // 300ms debounce time

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, searchCategory, fetchSuggestions]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleCategoryChange = (e) => {
    setSearchCategory(e.target.value);
  };

  const handleFilterChange = (filterKey, value) => {
    console.log(`Filter change: ${filterKey} = "${value}"`);
    
    // Track filter usage in analytics
    trackFilterUse(filterKey, value || 'cleared');
    
    const newFilters = { 
      ...filters, 
      [filterKey]: value 
    };
    
    // If value is empty, remove the filter
    if (!value) {
      console.log(`Removing empty filter: ${filterKey}`);
      delete newFilters[filterKey];
    }
    
    console.log('Updated filters:', newFilters);
    setFilters(newFilters);
    
    if (onFilterChange) {
      console.log('Calling onFilterChange with filters:', newFilters);
      onFilterChange(newFilters);
    }
    
    // Always trigger search with the updated filters
    if (onSearch) {
      console.log('Auto-triggering search with new filters');
      // Force a small delay to ensure state updates have propagated
      setTimeout(() => {
        onSearch(searchTerm, searchCategory, newFilters);
      }, 0);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Trim the search term to handle whitespace properly
    const trimmedSearchTerm = (searchTerm || '').trim();
    
    console.log('Search form submitted with term:', trimmedSearchTerm, 'category:', searchCategory, 'filters:', filters);
    
    // Track search in analytics
    if (trimmedSearchTerm) {
      trackSearch(trimmedSearchTerm);
      
      // Additionally track each word as a potential SEO keyword
      const words = trimmedSearchTerm.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) {  // Only track meaningful keywords
          trackSeoKeyword(word, 'direct_search');
        }
      });
    }
    
    // Always trigger search regardless if searchTerm is empty or not
    // This allows the search button to work as a "refresh" or "apply filters" button
    if (onSearch) {
      // We need to ensure the filters are properly passed to the parent component
      console.log('Sending search to parent with filters:', filters);
      
      // CRITICAL: Keep any current sort parameters when searching
      // Get sort parameters from URL if they exist
      const urlParams = new URLSearchParams(window.location.search);
      const currentSortCol = urlParams.get('sort') || window.currentSortColumn || '';
      const currentSortDir = urlParams.get('direction') || window.currentSortDirection || 'asc';
      if (currentSortCol) {
	console.log(`Preserving current sort in search: ${currentSortCol} ${currentSortDir}`);
      }

      // Force the callback to happen outside of the current event loop to allow React's state to update
      setTimeout(() => {
        // Pass the trimmed search term to ensure consistent behavior, and include sort params
        onSearch(trimmedSearchTerm, searchCategory, filters, currentSortCol, currentSortDir);
      }, 0);
    } else {
      // Build query string with all filters
      const queryParams = new URLSearchParams();
      
      // Only add search term if it exists after trimming
      if (trimmedSearchTerm) {
        queryParams.append('q', trimmedSearchTerm);
      }
      
      queryParams.append('category', searchCategory);
      // Keep any current sort parameters when searching
      const urlParams = new URLSearchParams(window.location.search);
      const sortCol = urlParams.get('sort');
      const sortDir = urlParams.get('direction');

      if (sortCol) {
	queryParams.append('sort', sortCol);
	if (sortDir) {
	  queryParams.append('direction', sortDir);
	}
      }

      // Add all filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value);
          
          // Special handling for operation_id - also add as id parameter for direct navigation
          if (key === 'operation_id') {
            queryParams.append('id', value);
          }
        }
      });
      
      navigate(`/search?${queryParams.toString()}`);
    }
    
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion) => {
    const suggestionName = suggestion.name || suggestion.title || suggestion.text;
    setSearchTerm(suggestionName);
    setShowSuggestions(false);
    
    // Track autocomplete selection in analytics
    trackAutocompleteSelection(searchTerm, suggestionName);
    
    // Navigate based on the type of suggestion
    if (suggestion.type === 'daycare') {
      // Direct to home page with id parameter for public access
      navigate(`/home?id=${suggestion.id}`);
    } else if (suggestion.type === 'violation') {
      navigate(`/violations?operation=${suggestion.operation_number}`);
    } else if (suggestion.type === 'pricing') {
      navigate(`/pricing?id=${suggestion.id}`);
    } else if (suggestion.type === 'city') {
      // For city suggestions, navigate to search results with city filter
      const city = suggestion.city || suggestion.name || suggestion.text;
      navigate(`/search?city=${encodeURIComponent(city)}`);
    } else if (suggestion.type === 'zipcode') {
      // For zipcode suggestions, navigate to search results with zipcode filter
      const zipcode = suggestion.zipcode || suggestion.text;
      navigate(`/search?zipcode=${encodeURIComponent(zipcode)}`);
    } else if (suggestion.type === 'operation_id') {
      // For operation_id suggestions, navigate directly to that daycare
      const operationId = suggestion.operation_id || suggestion.id || suggestion.text;
      navigate(`/home?id=${encodeURIComponent(operationId)}`);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSuggestions([]);
    setShowSuggestions(false);
    searchInputRef.current.focus();
  };

  const toggleAdvancedFilters = () => {
    setShowAdvancedFilters(!showAdvancedFilters);
  };

  const clearAllFilters = () => {
    console.log('CLEAR ALL FILTERS button clicked');
    
    // Reset all filters
    setFilters({});
    
    // Force reset all select elements and input fields
    const selectElements = document.querySelectorAll('.filter-group select');
    selectElements.forEach(select => {
      select.value = '';
    });
    
    // Clear all text inputs
    const textInputs = [
      document.getElementById('city-filter-input')
    ];
    
    textInputs.forEach(input => {
      if (input) {
        input.value = '';
      }
    });
    
    if (onFilterChange) {
      console.log('Calling onFilterChange with empty filters object');
      onFilterChange({});
    }
    
    // CRITICAL FIX: Remember the current sort settings to preserve them
    // First check window global variables that might have been set during sorting
    let sortColumn = window.currentSortColumn || '';
    let sortDirection = window.currentSortDirection || 'asc';
    // If globals aren't set, check the URL as backup
    if (!sortColumn) {
      const urlParams = new URLSearchParams(window.location.search);
      sortColumn = urlParams.get('sort') || '';
      sortDirection = urlParams.get('direction') || 'asc';
    }

    // Special handling - if sorting by price or years, set to empty to avoid issues
    if (sortColumn === 'monthly_cost' || sortColumn === 'estimated_price' ||
        sortColumn === 'price_est' || sortColumn === 'yearsInOperation' ||
        sortColumn === 'years_in_operation' || sortColumn === 'years') {
      console.log(`Resetting problematic sort column: ${sortColumn}`);
      sortColumn = '';
      sortDirection = 'asc';
    } else if (sortColumn) {
      console.log(`Preserving current sort: ${sortColumn} ${sortDirection}`);
    }
    // Trigger search with empty filters to show all results

    if (onSearch) {
      console.log('Triggering search with empty filters to reload all data');
      setTimeout(() => {
	// Pass current search term with empty filters, preserving sort if appropriate
        onSearch(searchTerm, searchCategory, {}, sortColumn, sortDirection);
      }, 100);
    }
  };

  // Render the filter options based on selected category
  const renderFilterOptions = () => {
    if (!showFilterControls) return null;
    
    // Mobile detection
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    
    return (
      <div className={`advanced-filters ${showAdvancedFilters ? 'expanded' : ''}`}>
        <div className="filter-row">
          {/* City is the most important filter, with text input instead of select */}
          <div className="filter-group city-filter-group">
            <label htmlFor="city-filter-input">City</label>
            {/* Replace select with a datalist-enhanced input for searchable cities */}
            <input
              type="text"
              id="city-filter-input"
              className="city-search-input"
              list="city-options"
              placeholder="Type to search cities..."
              value={filters.city || ''}
              onChange={(e) => {
                const cityValue = e.target.value;
                console.log('City filter changed to:', cityValue);
                handleFilterChange('city', cityValue);
              }}
              disabled={loadingOptions}
              autoComplete="off"
            />
            <datalist id="city-options">
              {loadingOptions ? (
                <option value="Loading cities..." />
              ) : (
                cityOptions
                  .filter(city => city && city.trim() !== '') // Filter out empty cities
                  .sort((a, b) => a.localeCompare(b)) // Sort alphabetically
                  .map(city => (
                    <option key={city} value={city} />
                  ))
              )}
            </datalist>
            <small style={{color: '#666', marginTop: '4px', display: 'block'}}>
              {loadingOptions ? 'Loading cities...' : (isMobile ? 'Type city name' : 'Start typing a city name')}
            </small>
          </div>
          
          
          <div className="filter-group">
            <label htmlFor="type-filter">Daycare Type</label>
            <select 
              id="type-filter"
              className="mobile-friendly-select"
              value={filters.operation_type || ''}
              onChange={(e) => handleFilterChange('operation_type', e.target.value)}
              disabled={loadingOptions}
            >
              <option value="">All Types</option>
              {loadingOptions ? (
                <option value="" disabled>Loading types...</option>
              ) : (
                typeOptions
                  .filter(type => type && type.trim() !== '') // Filter out empty types
                  .sort((a, b) => a.localeCompare(b)) // Sort alphabetically
                  .map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))
              )}
            </select>
          </div>
          
          {/* Conditionally show price range filter */}
          {(searchCategory === 'pricing' || searchCategory === 'all') && (
            <div className="filter-group">
              <label htmlFor="price-range">Price Range</label>
              <select 
                id="price-range"
                className="mobile-friendly-select"
                value={filters.priceRange || ''}
                onChange={(e) => {
                  console.log('Price range filter changed to:', e.target.value);
                  handleFilterChange('priceRange', e.target.value);
                }}
              >
                <option value="">Any Price</option>
                <option value="0-700">Under $700</option>
                <option value="700-1000">$700 - $1,000</option>
                <option value="1000-1300">$1,000 - $1,300</option>
                <option value="1300-1500">$1,300 - $1,500</option>
                <option value="1500-1800">$1,500 - $1,800</option>
                <option value="1800-2000">$1,800 - $2,000</option>
                <option value="2000-2500">$2,000 - $2,500</option>
                <option value="2500-up">Over $2,500</option>
              </select>
            </div>
          )}
          
          <div className="filter-group">
            <label htmlFor="rating-filter">Rating</label>
            <select 
              id="rating-filter"
              className="mobile-friendly-select"
              value={filters.rating || ''}
              onChange={(e) => {
                console.log('Rating filter changed to:', e.target.value);
                handleFilterChange('rating', e.target.value);
              }}
            >
              <option value="">Any Rating</option>
              <option value="5">5 Stars</option>
              <option value="4.5">4.5+ Stars</option>
              <option value="4">4+ Stars</option>
              <option value="3.5">3.5+ Stars</option>
              <option value="3">3+ Stars</option>
              <option value="2.5">2.5+ Stars</option>
              <option value="2">2+ Stars</option>
              <option value="1.5">1.5+ Stars</option>
              <option value="1">1+ Stars</option>
            </select>
          </div>
          
          {/* Years filter */}
          <div className="filter-group">
            <label htmlFor="years-filter">Years In Operation</label>
            <select 
              id="years-filter"
              className="mobile-friendly-select"
              value={filters.yearsInOperation || ''}
              onChange={(e) => {
                console.log('Years filter changed to:', e.target.value);
                handleFilterChange('yearsInOperation', e.target.value);
              }}
            >
              <option value="">Any Years</option>
              <option value="10">10+ Years</option>
              <option value="5">5+ Years</option>
              <option value="3">3+ Years</option>
              <option value="1">1+ Years</option>
              <option value="0">New (&lt; 1 Year)</option>
            </select>
          </div>
        </div>
        
        {Object.keys(filters).length > 0 && (
          <button 
            type="button"
            className="clear-filters-button"
            onClick={clearAllFilters}
          >
            Clear All Filters
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="unified-search-container" ref={searchInputRef}>
      {/* DAYCARE COMPARISON CONTROLS - Integrated with site design */}
      {window.daycarealertCompareMode !== undefined && (
        <div id="daycare-comparison-controls" className="daycare-comparison-container" style={{margin: "0 0 15px 0"}}>
          <div className="comparison-header">
            <span>Daycare Comparison Tool</span>
          </div>
          <div className="comparison-controls">
            <button 
              id="toggle-comparison-mode"
              className="comparison-toggle-button"
              onClick={() => {
                if (window.toggleCompareMode) {
                  window.toggleCompareMode();
                }
              }}
            >
              {window.daycarealertCompareMode ? "EXIT COMPARISON MODE" : "START COMPARING DAYCARES"}
            </button>
            
            {window.daycarealertCompareMode && (
              <div style={{marginTop: "10px", fontSize: "14px", color: "#0050b3"}}>
                Click on any daycare in the list below to add it to your comparison
              </div>
            )}
            
            {window.daycarealertCompareMode && window.daycareComparisonCount !== undefined && (
              <div className="comparison-action-buttons">
                <button 
                  id="open-comparison-modal"
                  className="comparison-view-button"
                  onClick={() => {
                    if (window.openComparisonModal) {
                      window.openComparisonModal();
                    }
                  }}
                  disabled={window.daycareComparisonCount === 0}
                >
                  VIEW COMPARISON ({window.daycareComparisonCount || 0})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOUR REQUEST TOOL */}
      <div id="tour-request-controls" className="daycare-comparison-container" style={{margin: "0 0 15px 0"}}>
        <div className="comparison-header">
          <span>Tour Request Tool</span>
        </div>
        <div className="comparison-controls">
          <button
            id="select-tours-button"
            className="comparison-toggle-button"
            onClick={() => {
              if (window.toggleTourMode) {
                window.toggleTourMode();
              }
            }}
          >
            {window.daycarealertTourMode ? "EXIT TOUR MODE" : "SELECT DAYCARES FOR TOURS"}
          </button>
          {window.daycarealertTourMode && (
            <div style={{marginTop: "10px"}}>
              <button
                className="comparison-view-button"
                onClick={() => {
                  if (window.openTourModal) {
                    window.openTourModal();
                  }
                }}
                disabled={window.tourSelectionCount === 0}
              >
                VIEW TOUR SCHEDULE ({window.tourSelectionCount || 0})
              </button>
            </div>
          )}
          <div style={{fontSize: "14px", color: "#333", marginTop: "10px"}}>
            Click daycares below to add them to your tour request (max 5)
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="unified-search-form">
        <div className="search-controls">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="unified-search-input"
              placeholder={placeholder}
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={() => searchTerm.length > 0 && setShowSuggestions(true)}
              aria-label="Search"
              autoComplete="off"
              inputMode="search" /* Helps mobile keyboards show search button */
            />
            {searchTerm && (
              <button 
                type="button" 
                className="clear-button" 
                onClick={handleClearSearch}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          
          <button type="submit" className="search-button" aria-label="Submit search">
            Search
          </button>
        </div>
        
        {showFilterControls && (
          <button 
            type="button"
            className="filter-toggle-button"
            onClick={toggleAdvancedFilters}
            aria-expanded={showAdvancedFilters}
            aria-controls="advanced-filters"
          >
            {showAdvancedFilters ? 'Hide Filters' : 'Show Filters'}
            <span className={`toggle-icon ${showAdvancedFilters ? 'up' : 'down'}`}>
              {showAdvancedFilters ? '▲' : '▼'}
            </span>
          </button>
        )}
        
        {showFilterControls && renderFilterOptions()}
        
        {showSuggestions && (
          <div className="suggestions-container">
            {isLoading ? (
              <div className="suggestion-loading">Loading...</div>
            ) : suggestions.length > 0 ? (
              <ul className="suggestions-list">
                {suggestions.map((suggestion) => (
                  <li 
                    key={suggestion.id} 
                    className={`suggestion-item ${suggestion.type}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="suggestion-type-badge">
                      {suggestion.type === 'operation_id' 
                        ? 'ID' 
                        : (suggestion.type === 'zipcode' ? 'ZIP' : suggestion.type)}
                    </div>
                    <div className="suggestion-content">
                      <div className="suggestion-title">
                        {suggestion.type === 'operation_id'
                          ? `${suggestion.name} (ID: ${suggestion.operation_id})`
                          : suggestion.type === 'zipcode'
                            ? `${suggestion.name} (ZIP: ${suggestion.zip_code})`
                            : (suggestion.name || suggestion.title || suggestion.text)
                        }
                      </div>
                      {suggestion.address && (
                        <div className="suggestion-details">{suggestion.address}</div>
                      )}
                      {suggestion.description && (
                        <div className="suggestion-details">{suggestion.description}</div>
                      )}
                      {suggestion.subtype && (
                        <div className="suggestion-details">{suggestion.subtype}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : searchTerm.length > 1 ? (
              <div className="no-suggestions">No results found</div>
            ) : null}
          </div>
        )}
      </form>
    </div>
  );
};

export default UnifiedSearch;
