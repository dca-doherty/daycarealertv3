import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import DaycareDataView from '../components/DaycareDataView';
import DaycareDetails from '../components/DaycareDetails';
import { fetchDaycares, fetchDaycareById, fetchCities } from '../utils/mysqlApi';
import { debounce } from 'lodash';
import heroImage from '../images/pexels-mikhail-nilov-8923956.jpg';
import '../styles/Home.css';

const MySqlHome = ({ tabView, profileId }) => {
  // Get URL parameters
  const params = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  // If profileId is passed as a prop (from router), use it, otherwise check URL params
  // Also check location.state for daycareId passed from recommendations page
  const daycareId = profileId || 
                   (params && params.id) || 
                   queryParams.get('id') || 
                   (location.state && location.state.daycareId);
                   
  // Debug logging to see what we're receiving
  console.log("MySQL Home page state:", {
    locationState: location.state,
    daycareId,
    params,
    queryParams: Object.fromEntries(queryParams)
  });
  
  // Default tab view (overview, violations, pricing, quality)
  const initialTabView = tabView || queryParams.get('tab') || 'overview';
  const [daycares, setDaycares] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDaycare, setSelectedDaycare] = useState(null);
  const [showDaycareDetails, setShowDaycareDetails] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTabView);
  const [availableCities, setAvailableCities] = useState([]);
  
  // Load cities on component mount
  useEffect(() => {
    const loadCities = async () => {
      try {
        const citiesList = await fetchCities();
        console.log(`Loaded ${citiesList.length} cities from MySQL database`);
        setAvailableCities(citiesList);
      } catch (error) {
        console.error("Error loading cities:", error);
      }
    };
    
    loadCities();
  }, []);
  
  // Check if specific daycare ID was provided
  useEffect(() => {
    if (daycareId) {
      console.log(`Processing daycare with ID: ${daycareId}`);
      setLoading(true);
      
      // Check if we have a complete daycare object in the state
      const daycareFromState = location.state && location.state.daycare;
      
      if (daycareFromState) {
        console.log("Using daycare object from state:", daycareFromState);
        setSelectedDaycare(daycareFromState);
        setShowDaycareDetails(true);
        setActiveTab(initialTabView);
        setLoading(false);
      } else {
        // If no daycare in state, fetch it from the API
        console.log(`Fetching daycare with ID: ${daycareId} from MySQL API`);
        fetchDaycareById(daycareId)
          .then(daycare => {
            console.log("Fetched daycare from MySQL API:", daycare);
            if (daycare) {
              setSelectedDaycare(daycare);
              setShowDaycareDetails(true);
              setActiveTab(initialTabView);
              console.log("Daycare details set to be shown (from MySQL API):", {
                name: daycare.operation_name,
                id: daycare.operation_id
              });
            } else {
              console.error("No daycare found with ID:", daycareId);
            }
            setLoading(false);
          })
          .catch(error => {
            console.error("Error fetching daycare details from MySQL:", error);
            setLoading(false);
          });
      }
    }
  }, [daycareId, location.state, initialTabView]);
  
  // Function to load daycare data with filtering, sorting, and pagination
  const loadDaycares = useCallback(async () => {
    setLoading(true);
    try {
      // Save a copy of the filters
      const apiFilters = { ...filters };
      
      // Normalize search term
      const normalizedSearchTerm = (searchTerm || '').trim();
      
      // Add search term if it's not empty
      if (normalizedSearchTerm) {
        apiFilters.searchTerm = normalizedSearchTerm;
      }
      
      console.log("Fetching daycares from MySQL with filters:", apiFilters);
      console.log(`Using sorting: ${sortColumn} ${sortDirection}`);
      
      // Fetch data from MySQL API
      const result = await fetchDaycares(
        currentPage, 
        itemsPerPage, 
        apiFilters, 
        sortColumn, 
        sortDirection
      );
      
      if (result && Array.isArray(result.daycares)) {
        console.log(`Loaded ${result.daycares.length} daycares from MySQL database`);
        setDaycares(result.daycares);
        setTotalItems(result.total);
      } else {
        console.error("Invalid response format from MySQL API:", result);
        setDaycares([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error("Error loading daycares from MySQL:", error);
      setDaycares([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, filters, sortColumn, sortDirection, searchTerm]);
  
  // Add an event listener for daycare data updates (particularly for reviews)
  useEffect(() => {
    // Handler for when reviews are updated for any daycare
    const handleDaycareDataUpdated = (event) => {
      if (!event.detail || !event.detail.daycareId) {
        console.error('[MySQL Home] Received invalid daycareDataUpdated event:', event);
        return;
      }
      
      const updatedDaycareId = event.detail.daycareId;
      console.log(`[MySQL Home] Received dataUpdated event for daycare: ${updatedDaycareId}`);
      
      // If this is the currently selected daycare, update it
      if (selectedDaycare && selectedDaycare.operation_id === updatedDaycareId) {
        console.log(`[MySQL Home] This is the currently selected daycare (${selectedDaycare.operation_name}), updating it`);
        
        // Check if the event contains the updated daycare data
        if (event.detail.daycare) {
          console.log('[MySQL Home] Using daycare data from event');
          const eventDaycare = event.detail.daycare;
          
          // Update the selected daycare with data from the event
          setSelectedDaycare(prev => ({
            ...prev,
            rating: eventDaycare.rating,
            parent_review_score: eventDaycare.parent_review_score,
            parent_review_count: eventDaycare.parent_review_count,
            reviews: eventDaycare.reviews,
          }));
          
          console.log(`[MySQL Home] Updated selected daycare with data from event`);
        } else {
          // Fetch fresh data from the MySQL API
          console.log('[MySQL Home] No daycare data in event, fetching from MySQL API');
          
          fetchDaycareById(updatedDaycareId)
            .then(updatedDaycare => {
              if (updatedDaycare) {
                console.log('[MySQL Home] Found daycare in MySQL API, updating selected daycare');
                setSelectedDaycare(updatedDaycare);
                console.log(`[MySQL Home] Updated selected daycare with data from MySQL API`);
              } else {
                console.warn(`[MySQL Home] Daycare ${updatedDaycareId} not found in MySQL API`);
              }
            })
            .catch(error => {
              console.error('[MySQL Home] Error fetching updated daycare:', error);
            });
        }
      } else {
        console.log(`[MySQL Home] This is not the currently selected daycare, just reloading data table`);
      }
      
      // Force reload of the data table to reflect updated data
      console.log('[MySQL Home] Scheduling loadDaycares to refresh data table with updated data');
      
      // Use a short delay to ensure all events have been processed
      setTimeout(() => {
        console.log('[MySQL Home] Now executing loadDaycares to refresh after update');
        loadDaycares();
      }, 200);
    };
    
    // Add event listener
    console.log('[MySQL Home] Adding daycareDataUpdated event listener');
    window.addEventListener('daycareDataUpdated', handleDaycareDataUpdated);
    
    // Clean up
    return () => {
      console.log('[MySQL Home] Removing daycareDataUpdated event listener');
      window.removeEventListener('daycareDataUpdated', handleDaycareDataUpdated);
    };
  }, [selectedDaycare, loadDaycares]);
  
  // Sort handler
  const handleSort = useCallback((column, direction) => {
    console.log(`Sorting by ${column} in ${direction} direction`);
    setSortColumn(column);
    setSortDirection(direction);
    setCurrentPage(1);
  }, []);
  
  // Filter handler
  const handleFilter = useCallback((newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  // Debounce data loading to prevent excessive API calls
  const debouncedLoadDaycares = useMemo(
    () => debounce(loadDaycares, 300),
    [loadDaycares]
  );

  useEffect(() => {
    debouncedLoadDaycares();
  }, [debouncedLoadDaycares]);
  
  // Search handler
  const handleSearch = useCallback((term, category, newFilters) => {
    console.log(`MySQL Home - Search handler called with term: "${term}", category: "${category}"`);
    console.log('Filters received:', newFilters);
    
    // Normalize the search term - handle empty strings properly
    const searchTermValue = term?.trim() || '';
    
    // Check if the filters actually changed to prevent unnecessary reloads
    const filtersChanged = JSON.stringify(newFilters || {}) !== JSON.stringify(filters);
    const searchChanged = searchTermValue !== searchTerm;
    
    if (filtersChanged || searchChanged) {
      console.log("Search or filters changed, updating state and triggering reload");
      
      // Set search term in state
      setSearchTerm(searchTermValue);
      
      // Set filters in state, with a fallback to empty object if null/undefined
      setFilters(newFilters || {});
      
      // Reset to first page when search or filters change
      setCurrentPage(1);
      
      console.log(`Search state updated:
        - Search term: "${searchTermValue}"
        - Category: "${category}"
        - Filters: ${JSON.stringify(newFilters || {})}
      `);
      
      // Use a small delay to ensure state updates finish properly
      // before triggering data loading
      setTimeout(() => {
        loadDaycares();
      }, 50);
    } else {
      console.log("No changes to search or filters, skipping reload");
    }
  }, [loadDaycares, filters, searchTerm]);

  // Pagination handler
  const paginate = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
  }, []);

  // Render expanded content for each daycare
  // eslint-disable-next-line no-unused-vars
  const renderExpandedContent = useCallback((daycare) => {
    // Format date function
    const formatDate = (dateString) => {
      if (!dateString) return 'Not available';
      try {
        // Parse the date and format as YYYY-MM-DD
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
      } catch (error) {
        return dateString; // Return original if parsing fails
      }
    };
    
    // Format violations for display
    const formatViolations = () => {
      // Get the actual violation counts
      const highRisk = parseInt(daycare.high_risk_violations || 0, 10);
      const medHighRisk = parseInt(daycare.medium_high_risk_violations || 0, 10);
      const medRisk = parseInt(daycare.medium_risk_violations || 0, 10);
      const medLowRisk = parseInt(daycare.medium_low_risk_violations || 0, 10);
      const lowRisk = parseInt(daycare.low_risk_violations || 0, 10);
      
      return (
        <div className="violations-by-level-wrapper">
          <div className="violation-risk-item">
            <div className="risk-badge high-risk">High Risk</div>
            <div className="risk-count">{highRisk}</div>
          </div>
          <div className="violation-risk-item">
            <div className="risk-badge medium-high-risk">Medium-High Risk</div>
            <div className="risk-count">{medHighRisk}</div>
          </div>
          <div className="violation-risk-item">
            <div className="risk-badge medium-risk">Medium Risk</div>
            <div className="risk-count">{medRisk}</div>
          </div>
          <div className="violation-risk-item">
            <div className="risk-badge medium-low-risk">Medium-Low Risk</div>
            <div className="risk-count">{medLowRisk}</div>
          </div>
          <div className="violation-risk-item">
            <div className="risk-badge low-risk">Low Risk</div>
            <div className="risk-count">{lowRisk}</div>
          </div>
          <div className="violation-info-note">
            <small>Data source: MySQL database</small>
          </div>
        </div>
      );
    };

    return (
      <div className="expanded-daycare-details">
        <div className="expanded-header-container">
          <div className="details-header">
            <h3>{daycare.operation_name}</h3>
            <p>{daycare.operation_type} • {daycare.city}</p>
          </div>
          <div className="condensed-price-rating">
            <div className="info-item">
              <span className="info-label">Est. Price:</span>
              <div className="info-value">
                <span className="price-value">${daycare.monthly_cost || daycare.estimated_price || 'Call'}</span>
                <span className="price-period">/mo</span>
              </div>
            </div>
            <div className="info-item">
              <span className="info-label">Rating:</span>
              <div className="info-value rating-value">
                <span className={`rating ${daycare.rating && daycare.rating.class ? daycare.rating.class : 'good'}`}>
                  {daycare.rating && daycare.rating.stars ? daycare.rating.stars : '★★★★'}
                </span>
                <span className="rating-score">
                  ({daycare.rating ? (typeof daycare.rating === 'number' ? daycare.rating.toFixed(1) : daycare.rating.score.toFixed(1)) : 'N/A'})
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="expanded-details-row">
          <div className="expanded-column">
            <h4>Contact Information</h4>
            <p><strong>Address:</strong> {daycare.location_address || 'Not available'}</p>
            <p><strong>City:</strong> {daycare.city || 'Not available'}</p>
            <p><strong>County:</strong> {daycare.county || 'Not available'}</p>
            <p><strong>Phone:</strong> {daycare.phone_number || 'Not available'}</p>
            {daycare.email_address && <p><strong>Email:</strong> {daycare.email_address}</p>}
            {daycare.website_address && (
              <p>
                <strong>Website:</strong>{' '}
                <a href={daycare.website_address.startsWith('http') ? daycare.website_address : `https://${daycare.website_address}`} 
                  target="_blank" rel="noopener noreferrer">
                  {daycare.website_address}
                </a>
              </p>
            )}
          </div>
          <div className="expanded-column">
            <h4>Operating Details</h4>
            <p><strong>Hours:</strong> {daycare.hours_of_operation || 'Monday-Friday: 7:00am-6:00pm (typical)'}</p>
            <p><strong>Days:</strong> {daycare.days_of_operation || 'Monday-Friday (typical)'}</p>
            <p><strong>Director:</strong> {daycare.administrator_director_name || 'Not specified'}</p>
            <p><strong>Capacity:</strong> {daycare.total_capacity || 'Not specified'}</p>
            <p><strong>Accepts Subsidies:</strong> {daycare.accepts_child_care_subsidies === 'Yes' ? 'Yes' : 
                                                  (daycare.accepts_child_care_subsidies === 'No' ? 'No' : 'Information not available')}</p>
          </div>
          <div className="expanded-column">
            <h4>Licensing & Compliance</h4>
            <p><strong>License Date:</strong> {formatDate(daycare.issuance_date)}</p>
            <p><strong>Years Operating:</strong> {daycare.yearsInOperation ? Math.round(daycare.yearsInOperation) : 'Not specified'}</p>
            <p><strong>Total Violations (2yr):</strong> {daycare.total_violations_2yr || '0'}</p>
            <p><strong>Status:</strong> <span className={daycare.temporarily_closed === 'NO' ? 'status-open' : 'status-closed'}>
              {daycare.temporarily_closed === 'NO' ? 'Open' : 'Temporarily Closed'}
            </span></p>
            <p><strong>Risk Analysis:</strong> {daycare.risk_analysis || 'Not available'}</p>
          </div>
          
          <div className="expanded-column violations-column">
            <h4>Violations by Risk Level</h4>
            {formatViolations()}
          </div>
        </div>
      </div>
    );
  }, []);

  // Handle daycare selection from the data view
  const handleDaycareSelect = (daycare) => {
    // Store current scroll position before showing details
    const scrollPosition = window.scrollY;
    
    console.log("Daycare selected from MySQL data view:", {
      name: daycare.operation_name,
      id: daycare.operation_id,
      price: daycare.monthly_cost,
      estimated_price: daycare.estimated_price
    });
    
    setSelectedDaycare(daycare);
    setShowDaycareDetails(true);
    setActiveTab(initialTabView);
    
    // Scroll to top of page for better visibility
    window.scrollTo(0, 0);
    
    // Store the scroll position in a data attribute for restoration later
    document.body.setAttribute('data-previous-scroll', scrollPosition);
  };
  
  // Handle closing the daycare details modal
  const handleCloseDetails = () => {
    setShowDaycareDetails(false);
    setSelectedDaycare(null);
    
    // Restore previous scroll position if available
    const previousScroll = document.body.getAttribute('data-previous-scroll');
    if (previousScroll) {
      window.scrollTo(0, parseInt(previousScroll, 10));
      document.body.removeAttribute('data-previous-scroll');
    }
  };

  // Column definitions for the responsive data table
  const columns = [
    { key: 'operation_name', label: 'Daycare Name', filterable: false, width: '22%' },
    { key: 'operation_type', label: 'Type', width: '13%', filterable: false },
    { key: 'city', label: 'City', width: '13%', filterable: false },
    { 
      key: 'monthly_cost', 
      label: 'Est. Price', 
      width: '12%',
      render: (price) => {
        if (!price) return 'N/A';
        // Convert to number and round to remove decimals
        const numPrice = Math.round(parseFloat(price));
        // Format with dollar sign and no decimal places
        return isNaN(numPrice) ? 'N/A' : `$${numPrice.toLocaleString('en-US', {maximumFractionDigits: 0})}`;
      },
      filterable: false,
      sortable: true
    },
    { 
      key: 'yearsInOperation', 
      label: 'Years', 
      width: '8%',
      render: (years) => years !== undefined ? Math.round(years) : 'N/A',
      filterable: false
    },
    { 
      key: 'rating', 
      label: 'Rating', 
      width: '18%',
      render: (rating) => {
        if (!rating) return 'N/A';
        
        let scoreValue;
        let ratingClass;
        
        if (typeof rating === 'object') {
          scoreValue = rating.score;
          ratingClass = rating.class;
        } else {
          scoreValue = parseFloat(rating);
        }
        
        // If score is invalid, return N/A
        if (isNaN(scoreValue)) return 'N/A';
        
        // Determine class if not provided
        if (!ratingClass) {
          if (scoreValue >= 4.0) ratingClass = 'excellent';
          else if (scoreValue >= 3.0) ratingClass = 'good';
          else if (scoreValue >= 2.0) ratingClass = 'average';
          else ratingClass = 'poor';
        }
        
        // Calculate star values
        const fullStars = Math.floor(scoreValue);
        const hasHalfStar = (scoreValue % 1) >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        // Generate a simple string representation of stars
        let starString = '';
        
        // Add full stars
        for (let i = 0; i < fullStars; i++) {
          starString += '★';
        }
        
        // Add half star if needed
        if (hasHalfStar) {
          starString += '½';
        }
        
        // Add empty stars
        for (let i = 0; i < emptyStars; i++) {
          starString += '☆';
        }
        
        return (
          <div className="rating-container">
            <span className={`rating ${ratingClass}`}>{starString}</span>
            <span className="rating-score"> ({scoreValue.toFixed(2)})</span>
          </div>
        );
      },
      filterable: false
    }
  ];

  // Filter options for the frontend display
  const filterOptions = {
    cities: availableCities.map(city => ({ value: city, label: city })),
    operationTypes: [
      { value: 'Licensed Center', label: 'Licensed Center' },
      { value: 'Licensed Child-Care Home', label: 'Licensed Child-Care Home' },
      { value: 'Registered Child-Care Home', label: 'Registered Child-Care Home' },
      { value: 'Listed Family Home', label: 'Listed Family Home' }
    ],
    priceRanges: [
      { value: '0-1000', label: 'Under $1,000 per month' },
      { value: '1000-1500', label: 'Between $1,000 - $1,500 per month' },
      { value: '1500-2000', label: 'Between $1,500 - $2,000 per month' },
      { value: '2000-up', label: 'Over $2,000 per month' }
    ],
    ratings: [
      { value: '4', label: '4+ Stars - Excellent' },
      { value: '3', label: '3+ Stars - Good' },
      { value: '2', label: '2+ Stars - Average' },
      { value: '1', label: '1+ Stars - Any rating' }
    ],
    yearsInOperation: [
      { value: '10', label: '10+ Years - Established' },
      { value: '5', label: '5+ Years - Experienced' },
      { value: '2', label: '2+ Years - Developing' },
      { value: '0', label: 'Under 1 Year - New' }
    ]
  };

  return (
    <>
      <DaycareDataView
        data={daycares}
        loading={loading}
        title="Texas Daycare Information Center"
        subtitle="Find and compare daycare centers across Texas using data from our MySQL database."
        onSearch={handleSearch}
        onFilter={handleFilter}
        onSort={handleSort}
        columns={columns}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        totalItems={totalItems}
        paginate={paginate}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        filterOptions={filters}
        allFilterOptions={filterOptions}
        viewType="daycares"
        expandable={false}
        headerImage={heroImage}
        searchPlaceholder="Search by daycare name, city, type, zipcode..."
        onDaycareSelect={handleDaycareSelect}
        dataSource="MySQL"
      />
      
      {/* Daycare Details Modal */}
      {showDaycareDetails && selectedDaycare && (
        <DaycareDetails 
          daycare={selectedDaycare} 
          onClose={handleCloseDetails}
          initialTab={activeTab}
          dataSource="MySQL"
        />
      )}
    </>
  );
};

export default MySqlHome;
