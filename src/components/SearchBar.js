import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SearchBar.css';
// eslint-disable-next-line jsx-a11y/accessible-emoji

/**
 * SearchBar component for daycarealert.com
 * Provides search functionality with debouncing and suggestions
 */
const SearchBar = ({ placeholder = "Search by daycare name, city, type, zipcode, or ID...", onSearch, onCityChange, cities = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const navigate = useNavigate();

  // Fetch suggestions based on search term
  const fetchSuggestions = useCallback(async (term) => {
    if (!term || term.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      // Replace with your actual API call
      const response = await fetch(`/api/search/suggestions?term=${encodeURIComponent(term)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce search input to avoid excessive API calls
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(searchTerm);
    }, 300); // 300ms debounce time

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, fetchSuggestions]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    // Normalize the search term to ensure consistent behavior
    const trimmedSearchTerm = searchTerm.trim();
    
    // Proceed only if there's something to search (after trimming whitespace)
    if (trimmedSearchTerm) {
      if (onSearch) {
        console.log(`SearchBar - Submitting search with term: "${trimmedSearchTerm}"`);
        onSearch(trimmedSearchTerm);
      } else {
        // Navigate to search page with properly encoded search term
        navigate(`/search?q=${encodeURIComponent(trimmedSearchTerm)}`);
      }
      setShowSuggestions(false);
    } else {
      // If the search term is empty after trimming, focus the input field
      searchInputRef.current.focus();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion.name);
    setShowSuggestions(false);
    navigate(`/daycare/${suggestion.id}`);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSuggestions([]);
    setShowSuggestions(false);
    searchInputRef.current.focus();
  };

  const handleCityChange = (e) => {
    if (onCityChange) {
      onCityChange(e.target.value);
    }
  };

  return (
    <div className="search-container" ref={searchInputRef}>
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-container">
          <input
            type="text"
            className="search-input"
            placeholder={placeholder}
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => searchTerm.length > 0 && setShowSuggestions(true)}
            aria-label="Search daycares"
            autoComplete="off"
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
          <button type="submit" className="search-button" aria-label="Submit search">
            Search
          </button>
        </div>
        
        {/* Add city selection dropdown */}
        {cities.length > 0 && onCityChange && (
          <select 
            name="city"
            className="mobile-friendly-select city-select"
            onChange={handleCityChange}
            aria-label="Select city"
            id="city-select"
          >
            <option value="">Select a city</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        )}
        
        {showSuggestions && (
          <div className="suggestions-container">
            {isLoading ? (
              <div className="suggestion-loading">Loading...</div>
            ) : suggestions.length > 0 ? (
              <ul className="suggestions-list">
                {suggestions.map((suggestion) => (
                  <li 
                    key={suggestion.id} 
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion.name}
                    {suggestion.address && (
                      <span className="suggestion-address">{suggestion.address}</span>
                    )}
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

export default SearchBar;
