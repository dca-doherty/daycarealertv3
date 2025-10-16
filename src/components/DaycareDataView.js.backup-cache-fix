import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ResponsiveDataTable from './ResponsiveDataTable';
import UnifiedSearch from './UnifiedSearch';
import ExpandableContent from './ExpandableContent';
import DaycareDetails from './DaycareDetails';
import { Row, Col, Card, Button } from 'react-bootstrap';
// Rating calculation is no longer needed as values come from database
import '../styles/DaycareDataView.css';

/**
 * DaycareDataView component for displaying daycare data in a unified format
 * with filtering, search, and expandable content
 */
const DaycareDataView = ({ 
  data = [], 
  initialData = [],
  loading: externalLoading,
  title = "Daycare Centers",
  subtitle = "Browse and compare daycare centers",
  onSearch,
  onFilter,
  onSort,
  columns = [],
  itemsPerPage = 10,
  currentPage = 1,
  totalItems = 0,
  paginate,
  sortColumn = "",
  sortDirection = "asc",
  filterOptions: externalFilterOptions = {},
  viewType = "daycares", // daycares, violations, pricing
  expandable = true,
  expandedContentRenderer = null,
  headerImage = null,
  searchPlaceholder = "Search daycares...",
  noResultsMessage = "No results found. Please try a different search.",
  extraContent = null,
  enableFavorites = true,
  onDaycareSelect = null
}) => {
  // Internal state for self-managed filtering
  const [dataSource, setDataSource] = useState(data || []);
  const [filteredData, setFilteredData] = useState(data || []);
  const [loading, setLoading] = useState(externalLoading || false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOptions, setFilterOptions] = useState(externalFilterOptions);
  
  // Log external filter options to debug
  console.log('[DaycareDataView] Received external filter options:', externalFilterOptions);
  
  // eslint-disable-next-line no-unused-vars
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [selectedDaycare, setSelectedDaycare] = useState(null);
  const [showDaycareDetails, setShowDaycareDetails] = useState(false);
  const [currentPageState, setCurrentPageState] = useState(currentPage);

  // Initialize with external data if provided
  useEffect(() => {
    if (data && data.length > 0) {
      console.log('Initializing with external data:', data.length, 'items');
      setDataSource(data);
      setFilteredData(data);
    }
    setLoading(false);
  }, [data]);
  
  // Update filter options when external filter options change
  useEffect(() => {
    console.log('[DaycareDataView] External filter options changed:', externalFilterOptions);
    if (externalFilterOptions && Object.keys(externalFilterOptions).length > 0) {
      console.log('[DaycareDataView] Updating filter options with:', externalFilterOptions);
      setFilterOptions(externalFilterOptions);
      setFiltersApplied(true);
    }
  }, [externalFilterOptions]);
  
  // Add listener for daycare data updates (for review rating updates)
  useEffect(() => {
    // Create a stable event handler function that doesn't need to be recreated on every render
    const handleDaycareDataUpdated = (event) => {
      if (!event.detail || !event.detail.daycareId) {
        console.error('[DaycareDataView] Received invalid daycareDataUpdated event', event);
        return;
      }
      
      const updatedDaycareId = event.detail.daycareId;
      console.log(`[DaycareDataView] Received dataUpdated event for daycare: ${updatedDaycareId}`);
      
      // Use setTimeout to ensure we're not batching state updates too aggressively
      setTimeout(() => {
        console.log(`[DaycareDataView] Processing update for daycare ${updatedDaycareId} after delay`);
        
        // Use setState functional form to always get the latest state
        setDataSource(currentDataSource => {
          // Check if this daycare is in our current view
          const daycareIndex = currentDataSource.findIndex(d => d.operation_number === updatedDaycareId);
          
          if (daycareIndex < 0) {
            console.log(`[DaycareDataView] Daycare ${updatedDaycareId} not found in current data table`);
            return currentDataSource; // No change if daycare not found
          }
          
          console.log(`[DaycareDataView] Found daycare in data table at index ${daycareIndex}`);
          
          // Get current rating for comparison
          const currentDaycare = currentDataSource[daycareIndex];
          const currentRating = currentDaycare.rating ? 
            (typeof currentDaycare.rating === 'object' ? currentDaycare.rating.score : currentDaycare.rating) : 
            'unknown';
          console.log(`[DaycareDataView] Current rating in table: ${currentRating}`);
          
          // Make a copy of the current data source to modify
          const updatedDataSource = [...currentDataSource];
          
          // Check if event has full daycare data
          if (event.detail.daycare) {
            console.log('[DaycareDataView] Using daycare data from event');
            const updatedDaycare = event.detail.daycare;
            
            // Get rating from event data
            const eventRating = updatedDaycare.rating ? 
              (typeof updatedDaycare.rating === 'object' ? updatedDaycare.rating.score : updatedDaycare.rating) : 
              'unknown';
            console.log(`[DaycareDataView] Rating in event: ${eventRating}`);
            
            // Update the daycare in our data source
            updatedDataSource[daycareIndex] = {
              ...updatedDataSource[daycareIndex],
              rating: updatedDaycare.rating,
              parent_review_score: updatedDaycare.parent_review_score,
              parent_review_count: updatedDaycare.parent_review_count,
              reviews: updatedDaycare.reviews
            };
            
            console.log(`[DaycareDataView] Updating data source with rating from event: ${eventRating}`);
          } else {
            // Get updated daycare from global store
            console.log('[DaycareDataView] Getting daycare data from global store');
            const updatedDaycare = window.daycareDataStore && window.daycareDataStore[updatedDaycareId];
            
            if (updatedDaycare) {
              console.log('[DaycareDataView] Found daycare in global store');
              
              // Get current store rating
              const currentStoreRating = updatedDaycare.rating ? 
                (typeof updatedDaycare.rating === 'object' ? updatedDaycare.rating.score : updatedDaycare.rating) : 
                'unknown';
              console.log(`[DaycareDataView] Rating in global store: ${currentStoreRating}`);
              
              // Use rating directly from store without recalculation
              console.log('[DaycareDataView] Using rating directly from store');
              const storeRating = updatedDaycare.rating || { score: 0.0, stars: 'N/A', class: 'not-rated' };
              console.log(`[DaycareDataView] Rating from store: ${typeof storeRating === 'object' ? storeRating.score.toFixed(2) : storeRating}`);
              
              // Update the daycare in our data source with a completely new object
              updatedDataSource[daycareIndex] = {
                ...updatedDataSource[daycareIndex],
                rating: typeof storeRating === 'object' ? {...storeRating} : storeRating,  // Clone the rating object to force a re-render
                parent_review_score: updatedDaycare.parent_review_score,
                parent_review_count: updatedDaycare.parent_review_count,
                reviews: [...(updatedDaycare.reviews || [])]  // Clone the reviews array
              };
              
              // Log rating changes
              console.log(`[DaycareDataView] Rating change: ${currentRating} → ${typeof storeRating === 'object' ? storeRating.score.toFixed(2) : storeRating}`);
            } else {
              console.warn(`[DaycareDataView] Daycare ${updatedDaycareId} not found in global store`);
              return currentDataSource; // No changes if not found in store
            }
          }
          
          // Create a new array reference to ensure React detects the change
          return [...updatedDataSource];
        });
        
        // Short delay before updating filteredData to ensure they don't overwrite each other
        setTimeout(() => {
          // Update filtered data while preserving any filters
          setFilteredData(currentFilteredData => {
            // First check if we need to update filteredData
            const filteredDaycareIndex = currentFilteredData.findIndex(d => d.operation_number === updatedDaycareId);
            
            // If daycare isn't in filtered view, nothing to update
            if (filteredDaycareIndex < 0) {
              console.log(`[DaycareDataView] Daycare ${updatedDaycareId} not found in filtered data table`);
              return currentFilteredData;
            }
            
            // Get the updated daycare (either from event or store)
            let updatedDaycare;
            if (event.detail.daycare) {
              updatedDaycare = event.detail.daycare;
            } else {
              updatedDaycare = window.daycareDataStore && window.daycareDataStore[updatedDaycareId];
              
              if (!updatedDaycare) {
                console.warn(`[DaycareDataView] Can't update filtered data - daycare not found in store`);
                return currentFilteredData;
              }
            }
            
            // Create an updated copy of filtered data
            const updatedFilteredData = [...currentFilteredData];
            
            // Get the rating to use - directly from database without calculation
            const ratingToUse = event.detail.daycare ? 
              updatedDaycare.rating : 
              (updatedDaycare.rating || { score: 3.0, stars: '★★★', class: 'average' });
            
            // Update the daycare in filtered data with a clean clone to force re-render
            updatedFilteredData[filteredDaycareIndex] = {
              ...updatedFilteredData[filteredDaycareIndex],
              rating: typeof ratingToUse === 'object' ? {...ratingToUse} : ratingToUse,
              parent_review_score: updatedDaycare.parent_review_score,
              parent_review_count: updatedDaycare.parent_review_count,
              reviews: [...(updatedDaycare.reviews || [])]
            };
            
            console.log(`[DaycareDataView] Updated filtered data with new rating:`, 
              typeof ratingToUse === 'object' ? ratingToUse.score : ratingToUse);
            
            // Return a fresh array to ensure React detects the change
            return [...updatedFilteredData];
          });
          
          // Force re-render after all state updates are complete
          setTimeout(() => {
            console.log(`[DaycareDataView] FINAL UPDATE: forcing re-render with empty state update`);
            setFilteredData(currentData => [...currentData]);
          }, 100);
        }, 50);
      }, 100);
    };
    
    // Add event listener
    console.log('[DaycareDataView] Adding daycareDataUpdated event listener');
    window.addEventListener('daycareDataUpdated', handleDaycareDataUpdated);
    
    // Cleanup
    return () => {
      console.log('[DaycareDataView] Removing daycareDataUpdated event listener');
      window.removeEventListener('daycareDataUpdated', handleDaycareDataUpdated);
    };
  }, []); // Empty dependency array since we use functional state updates

  // Handle pagination internally if not provided externally
  const handlePageChange = useCallback((page) => {
    if (paginate) {
      paginate(page);
    } else {
      setCurrentPageState(page);
    }
  }, [paginate]);
  
  // Define default columns if none provided
  const defaultColumns = [
    {
      key: 'operation_name',
      label: 'Daycare Name',
      sortable: true,
      filterable: true,
      width: '20%'
    },
    {
      key: 'city',
      label: 'City',
      sortable: true,
      filterable: true,
      width: '7%'
    },
    {
      key: 'operation_type',
      label: 'Type',
      sortable: true,
      filterable: true,
      width: '7%'
    },
    {
  key: 'rating',
  label: 'Rating',
  sortable: true,
  filterable: true,
  width: '8%',
  render: (value, row) => {
    // Always check global store first for the latest rating
    let ratingValue;
    let ratingClass;
    let starString;
    let key = `rating-${row?.operation_number || Math.random()}-${Date.now()}`;
    
    // If we have a row with operation_number, try to get data from global store
    if (row && row.operation_number && window.daycareDataStore && window.daycareDataStore[row.operation_number]) {
      const storeDaycare = window.daycareDataStore[row.operation_number];
      
      // If we have a rating in the store, use that instead of the passed value
      if (storeDaycare.rating) {
        const storeRating = storeDaycare.rating;
        
        // Extract values based on type
        if (typeof storeRating === 'object') {
          ratingValue = storeRating.score;
          ratingClass = storeRating.class;
        } else {
          ratingValue = parseFloat(storeRating);
        }
      }
    }
    
    // If we couldn't get rating from store, use the passed value
    if (ratingValue === undefined) {
      if (!value) {
        // FIX: Show empty stars for no rating
        return (
          <div className="rating-container" key={key}>
            <span className="rating not-rated">☆☆☆☆☆</span>
            <span className="rating-score"> (N/A)</span>
          </div>
        );
      }
      
      if (typeof value === 'object' && value !== null) {
        ratingValue = value.score || 0;
        ratingClass = value.class || '';
      } else {
        ratingValue = parseFloat(value);
      }
    }
    
    // Handle invalid or zero ratings
    if (isNaN(ratingValue) || ratingValue === 0) {
      return (
        <div className="rating-container" key={key}>
          <span className="rating not-rated">☆☆☆☆☆</span>
          <span className="rating-score"> (N/A)</span>
        </div>
      );
    }
    
    // Determine class based on score
    if (!ratingClass) {
      if (ratingValue >= 4.5) ratingClass = 'excellent';
      else if (ratingValue >= 3.5) ratingClass = 'good';
      else if (ratingValue >= 2.5) ratingClass = 'average';
      else if (ratingValue >= 1.5) ratingClass = 'below-average';
      else ratingClass = 'poor';
    }
    
    // Generate star display based on actual score
    const fullStars = Math.floor(ratingValue);
    const hasHalfStar = (ratingValue - fullStars) >= 0.5;
    
    starString = '';
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      starString += '★';
    }
    
    // Add half star if needed
    if (hasHalfStar && fullStars < 5) {
      starString += '½';
    }
    
    // Add empty stars to fill up to 5
    const totalStars = fullStars + (hasHalfStar ? 1 : 0);
    for (let i = totalStars; i < 5; i++) {
      starString += '☆';
    }
    
    return (
      <div className="rating-container" key={key}>
        <span className={`rating ${ratingClass}`}>{starString}</span>
        <span className="rating-score"> ({ratingValue.toFixed(2)})</span>
      </div>
    );
  }
},
    {
      key: 'violations_summary',
      label: 'Violations',
      sortable: true,
      filterable: false,
      width: '8%',
      render: (_, row) => {
        const highViolations = parseInt(row.high_risk_violations || 0, 10);
        const medHighViolations = parseInt(row.medium_high_risk_violations || 0, 10);
        const totalViolations = highViolations + medHighViolations + 
                              parseInt(row.medium_risk_violations || 0, 10) + 
                              parseInt(row.low_risk_violations || 0, 10);
        
        if (highViolations > 0) {
          return <span style={{color: '#dc3545'}}>{totalViolations} (High Risk)</span>;
        } else if (medHighViolations > 0) {
          return <span style={{color: '#ffc107'}}>{totalViolations} (Med-High)</span>;
        } else if (totalViolations > 0) {
          return <span>{totalViolations}</span>;
        }
        return <span style={{color: '#28a745'}}>None</span>;
      }
    },
    {
      key: 'estimated_price',
      label: 'Est. Price',
      sortable: true,
      filterable: true,
      width: '7%',
      render: (value, row) => {
        // Try to find the price in multiple potential fields
        let priceValue = value;
        
        // If the value is empty but other price fields exist, try those
        if (!priceValue && row) {
          if (row.monthly_cost) priceValue = row.monthly_cost;
          else if (row.price_est) priceValue = row.price_est;
          else if (row.estimated_price) priceValue = row.estimated_price;
        }
        
        if (!priceValue) return "N/A";
        
        // Clean the input value if it has currency symbols or commas
        const cleanValue = String(priceValue).replace(/[$,\s]/g, '');
        
        // Ensure value is a number and round it to remove decimals
        const numValue = Math.round(parseFloat(cleanValue));
        
        if (isNaN(numValue)) return "N/A";
        
        // Add debug logging to see the price value being rendered (for first 5 rows only to avoid excessive logging)
        if (Math.random() < 0.1) {
          console.log(`[Price Render] Row: ${row.operation_name || 'Unknown'}, Original value: "${priceValue}", cleaned: "${cleanValue}", parsed: ${numValue}`);
        }
        
        // Format with dollar sign and no decimal places
        return `$${numValue.toLocaleString('en-US', {maximumFractionDigits: 0})}`;
      }
    },
    {
      key: 'staff_to_child_ratio',
      label: 'Staff Ratio',
      sortable: true,
      filterable: false,
      width: '6%',
      render: (value) => value || "N/A"
    },
    {
      key: 'key_features',
      label: 'Features',
      sortable: false,
      filterable: false,
      width: '8%',
      render: (_, row) => {
        const features = [];
        
        if (row.accredited === 'Yes') 
          features.push(<span key="acc" title="Accredited" className="feature-badge accredited">A</span>);
        
        if (row.meals_provided === 'Yes') 
          features.push(<span key="meal" title="Meals Provided" className="feature-badge meals">M</span>);
        
        if (row.transportation_provided === 'Yes') 
          features.push(<span key="trans" title="Transportation" className="feature-badge transportation">T</span>);
          
        if (row.programs_provided && row.programs_provided.toLowerCase().includes('special needs')) 
          features.push(<span key="sn" title="Special Needs Support" className="feature-badge special-needs">SN</span>);
        
        return features.length > 0 ? 
          <div className="feature-badges">{features}</div> : 
          <span className="text-muted">-</span>;
      }
    },
    {
      key: 'capacity',
      label: 'Capacity',
      sortable: true,
      filterable: false,
      width: '6%',
      render: (value, row) => {
        // If capacity is not available, try total_capacity
        const capacity = value || row.total_capacity || "N/A";
        return capacity;
      }
    },
    {
      key: 'age_groups',
      label: 'Ages',
      sortable: true,
      filterable: true,
      width: '6%',
      render: (value, row) => {
        // Try different fields that might contain age data
        const ages = value || row.licensed_to_serve_ages || 'All ages';
        // Truncate to prevent overflow
        return ages.length > 15 ? ages.substring(0, 15) + '...' : ages;
      }
    }
  ];
  
  // Use provided columns or default ones
  const tableColumns = columns.length > 0 ? columns : defaultColumns;
  
  // Get paginated data if not handled externally
  const paginatedData = useMemo(() => {
    if (paginate) {
      // If pagination is handled externally, just use the provided data
      return filteredData;
    } else {
      // Handle pagination internally
      const startIndex = (currentPageState - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return filteredData.slice(startIndex, endIndex);
    }
  }, [filteredData, currentPageState, itemsPerPage, paginate]);
  
  // Process data to include expandable content and view details action
  const processedData = (paginatedData || []).map(item => {
    const processedItem = {
      ...item,
      // Add a viewDetails action to each row
      viewDetails: (
        <Button 
          variant="outline-primary" 
          size="sm" 
          className="view-details-btn"
          onClick={(e) => {
            e.stopPropagation();
            
            // First close any expanded rows
            setExpandedRowId(null);
            
            // Instead of handling internally, delegate to the parent component
            // This ensures consistent rating processing between row clicks and button clicks
            if (onDaycareSelect) {
              console.log("Forwarding daycare selection from View Details button to parent");
              onDaycareSelect(item);
            } else {
              // Only use internal handling if no parent handler exists
              console.log("No parent handler, handling daycare selection internally");
              
              // Set daycare data first before showing modal
              setSelectedDaycare(item);
              
              // Use a single timeout to ensure state has been updated before showing modal
              setTimeout(() => {
                // Ensure we're at the top of the page
                window.scrollTo(0, 0);
                
                // Now show the modal
                setShowDaycareDetails(true);
              }, 0);
            }
          }}
        >
          View Details
        </Button>
      )
    };
    
    // Add expandable content if provided
    if (expandable && expandedContentRenderer) {
      processedItem.expandedContent = () => expandedContentRenderer(item);
    } else {
      // Enhanced expanded content with more details
      processedItem.expandedContent = () => {
        // Import the normalizeViolationCounts utility
        const { normalizeViolationCounts } = require('../utils/daycareUtils');
        
        // EXTREMELY IMPORTANT DEBUGGING: Log the raw item properties to check for violation counts
        console.log(`[DaycareDataView] EXPANDED ROW DEBUG - Raw item properties for ${item.operation_name || 'Unknown'} (${item.operation_number || item.operation_id}):`, {
          // This shows ALL properties on the item that might be related to violations
          raw_violation_fields: Object.keys(item).filter(key => key.includes('violation') || key.includes('risk') || key.includes('deficiency')),
          // Show the raw values if they exist
          high_risk_violations: item.high_risk_violations,
          medium_high_risk_violations: item.medium_high_risk_violations,
          medium_risk_violations: item.medium_risk_violations,
          medium_low_risk_violations: item.medium_low_risk_violations,
          low_risk_violations: item.low_risk_violations,
          total_violations_2yr: item.total_violations_2yr,
          // Also check alternate naming conventions
          high_risk: item.high_risk,
          medium_high_risk: item.medium_high_risk,
          medium_risk: item.medium_risk,
          medium_low_risk: item.medium_low_risk,
          low_risk: item.low_risk,
          deficiency_high: item.deficiency_high,
          deficiency_medium_high: item.deficiency_medium_high
        });
        
        // First check if this daycare is in the global store for the most up-to-date data
        const operationId = item.operation_number || item.operation_id;
        const globalDaycare = window.daycareDataStore && window.daycareDataStore[operationId];
        
        if (globalDaycare) {
          console.log(`[DaycareDataView] Found daycare in global store with key ${operationId}`, {
            globalStoreViolationFields: Object.keys(globalDaycare).filter(key => 
              key.includes('violation') || key.includes('risk') || key.includes('deficiency')
            ),
            high_risk_violations: globalDaycare.high_risk_violations,
            medium_high_risk_violations: globalDaycare.medium_high_risk_violations,
            medium_risk_violations: globalDaycare.medium_risk_violations,
            medium_low_risk_violations: globalDaycare.medium_low_risk_violations,
            low_risk_violations: globalDaycare.low_risk_violations
          });
        } else {
          console.log(`[DaycareDataView] Daycare NOT found in global store with key ${operationId}`);
          
          // Check if we need to create a default entry in the global store - force it for now
          if (!window.daycareDataStore) {
            window.daycareDataStore = {};
          }
          
          // Normalize the item and add it to the global store to help with debugging
          const tempNormalized = normalizeViolationCounts(item);
          window.daycareDataStore[operationId] = tempNormalized;
          console.log(`[DaycareDataView] Created new entry in global store with normalized data`);
        }
        
        // Use the global store data if available, otherwise normalize the passed item
        const itemToNormalize = globalDaycare || item;
        
        // CRITICAL FIX: Always check window.riskDataByDaycareId for most up-to-date risk analysis data
        // This is a separate cache specifically for risk analysis
        const riskDataFromCache = window.riskDataByDaycareId && window.riskDataByDaycareId[operationId];
        if (riskDataFromCache) {
          console.log(`[DaycareDataView] Found risk data in window.riskDataByDaycareId cache for ${operationId}:`, 
            riskDataFromCache.risk_analysis ? 'Has risk analysis text' : 'No risk analysis text');
        } else {
          console.log(`[DaycareDataView] No risk data found in window.riskDataByDaycareId cache for ${operationId}`);
        }
        
        // Normalize the violation counts to ensure consistent field names
        const normalizedItem = normalizeViolationCounts(itemToNormalize);
        
        // Apply risk analysis data from the riskDataByDaycareId cache if available
        if (riskDataFromCache) {
          normalizedItem.risk_analysis = riskDataFromCache.risk_analysis || normalizedItem.risk_analysis;
          normalizedItem.high_risk_violations = riskDataFromCache.high_risk_violations || normalizedItem.high_risk_violations || 0;
          normalizedItem.medium_high_risk_violations = riskDataFromCache.medium_high_risk_violations || normalizedItem.medium_high_risk_violations || 0;
          normalizedItem.medium_risk_violations = riskDataFromCache.medium_risk_violations || normalizedItem.medium_risk_violations || 0;
          normalizedItem.medium_low_risk_violations = riskDataFromCache.medium_low_risk_violations || normalizedItem.medium_low_risk_violations || 0;
          normalizedItem.low_risk_violations = riskDataFromCache.low_risk_violations || normalizedItem.low_risk_violations || 0;
        }
        
        // Log the source of our data to help with debugging
        console.log(`[DaycareDataView] Violations for expanded content of ${normalizedItem.operation_name || 'Unknown'} (${operationId}) from ${globalDaycare ? 'global store' : 'props'}:`, {
          high: normalizedItem.high_risk_violations,
          medHigh: normalizedItem.medium_high_risk_violations,
          med: normalizedItem.medium_risk_violations,
          medLow: normalizedItem.medium_low_risk_violations,
          low: normalizedItem.low_risk_violations,
          total: normalizedItem.total_violations_2yr
        });
        
        return (
          <div className="default-expanded-content">
            <div className="expanded-content-grid">
              <div className="expanded-info-col">
                <p><strong>Address:</strong> {normalizedItem.location_address || normalizedItem.address || 'Not available'}</p>
                <p><strong>Operation #:</strong> {normalizedItem.operation_number || 'Not available'}</p>
                <p><strong>Years in Operation:</strong> {normalizedItem.yearsInOperation || 'Not available'}</p>
              </div>
              <div className="expanded-info-col">
                <p><strong>Last Inspection:</strong> {
                  normalizedItem.inspection_date ? 
                  new Date(normalizedItem.inspection_date).toLocaleDateString() : 
                  normalizedItem.last_inspection_date ? 
                  new Date(normalizedItem.last_inspection_date).toLocaleDateString() : 'Not available'
                }</p>
                <p><strong>Staff Ratio:</strong> {normalizedItem.staff_to_child_ratio || 'Not available'}</p>
                <p>
                  <strong>Services:</strong>{' '}
                  {[
                    normalizedItem.accredited === 'Yes' ? 'Accredited' : null,
                    normalizedItem.meals_provided === 'Yes' ? 'Meals' : null,
                    normalizedItem.transportation_provided === 'Yes' ? 'Transportation' : null
                  ].filter(Boolean).join(', ') || 'No additional services listed'}
                </p>
              </div>
              <div className="expanded-info-col">
                <p><strong>Violations by Risk Level:</strong></p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li><strong>High:</strong> {parseInt(normalizedItem.high_risk_violations || 0, 10)}</li>
                  <li><strong>Medium-High:</strong> {parseInt(normalizedItem.medium_high_risk_violations || 0, 10)}</li>
                  <li><strong>Medium:</strong> {parseInt(normalizedItem.medium_risk_violations || 0, 10)}</li>
                  <li><strong>Medium-Low:</strong> {parseInt(normalizedItem.medium_low_risk_violations || 0, 10)}</li>
                  <li><strong>Low:</strong> {parseInt(normalizedItem.low_risk_violations || 0, 10)}</li>
                  <li><strong>Total:</strong> {parseInt(normalizedItem.total_violations_2yr || 0, 10)}</li>
                </ul>
              </div>
              <div className="expanded-info-col risk-analysis-section">
                <p><strong>Risk Analysis:</strong></p>
                <p>{normalizedItem.risk_analysis || 
                  (window.riskDataByDaycareId && window.riskDataByDaycareId[operationId]?.risk_analysis) || 
                  'Not available'}</p>
                {console.log(`[DaycareDataView] Risk analysis render data for ${operationId}:`, {
                  has_normalized_risk: Boolean(normalizedItem.risk_analysis),
                  has_cache_risk: Boolean(window.riskDataByDaycareId && window.riskDataByDaycareId[operationId]?.risk_analysis),
                  final_text: normalizedItem.risk_analysis || 
                    (window.riskDataByDaycareId && window.riskDataByDaycareId[operationId]?.risk_analysis) || 
                    'Not available'
                })}
              </div>
            </div>
          </div>
        );
      };
    }
    
    return processedItem;
  });
  
  // Add viewDetails column if not already present
  const enhancedColumns = [...tableColumns];
  if (!enhancedColumns.some(col => col.key === 'viewDetails')) {
    enhancedColumns.push({
      key: 'viewDetails',
      label: 'Details',
      sortable: false,
      filterable: false,
      width: '16%'
    });
  }
  
  // Handle search with unified search component
  const handleSearch = useCallback(async (term, category, filters) => {
    console.log('DaycareDataView - Search triggered with:', { term, category, filters });
    console.log('DaycareDataView - Filters received:', filters);
    
    // IMPORTANT: Update filter options before calling onSearch
    setFilterOptions(filters || {});
    setFiltersApplied(Object.keys(filters || {}).length > 0);
    
    // Update search term first
    setSearchTerm(term);
    
    // Set loading state
    setLoading(true);
    
    try {
      // Pass the search to the parent component which should handle API fetching
      if (onSearch) {
        // Make sure we use the correct property name for the API
        const normalizedTerm = term ? term.trim() : '';
        console.log('Passing search to parent component with API access');
        console.log(`Search term: "${normalizedTerm}", category: "${category}"`);
        console.log('Sending filters to parent:', filters);
        onSearch(normalizedTerm, category, filters);
        return; // Exit early as parent will handle the search
      }
      
      // Fallback to client-side filtering if we don't have API search
      // WARNING: This only searches the current page of data, not the full dataset
      console.log('WARNING: Falling back to client-side filtering (only searches visible data)');
      let filteredResults = dataSource.slice();
      
      // Filter by search term
      if (term) {
        const searchLower = term.toLowerCase();
        filteredResults = filteredResults.filter(item => {
          // Check operation_name (the correct API field for daycare name)
          const nameMatch = item.operation_name && 
            item.operation_name.toLowerCase().includes(searchLower);
          
          // Check city (case-insensitive)
          const cityMatch = item.city && 
            item.city.toLowerCase().includes(searchLower);
          
          // Also try to match by operation_type 
          const typeMatch = item.operation_type && 
            item.operation_type.toLowerCase().includes(searchLower);
          
          // Log matches for debugging
          if (nameMatch || cityMatch || typeMatch) {
            const matchType = [];
            if (nameMatch) matchType.push('name');
            if (cityMatch) matchType.push('city');
            if (typeMatch) matchType.push('type');
            
            console.log(`Match found for "${term}" in ${matchType.join(', ')}:`, {
              name: item.operation_name,
              city: item.city,
              type: item.operation_type
            });
          }
          
          return nameMatch || cityMatch || typeMatch;
        });
        console.log(`After filtering by "${term}":`, filteredResults.length, 'results');
      }
      
      // Update filtered data
      setFilteredData(filteredResults);
    } catch (error) {
      console.error('Error during search:', error);
    } finally {
      setLoading(false);
    }
  }, [onSearch, dataSource]);
  
  // No more mock data - we use real API data now
  
  // Handle filter change
  const handleFilterChange = useCallback((filters) => {
    console.log('DaycareDataView - Filter change:', filters);
    console.log('DaycareDataView - Filters received in handleFilterChange:', filters);
    
    // IMPORTANT: Update filter options before calling onFilter
    setFilterOptions(filters || {});
    setFiltersApplied(Object.keys(filters || {}).length > 0);
    
    // Set loading state
    setLoading(true);
    
    try {
      // If onFilter exists, call it and let the parent handle the API filtering
      if (onFilter) {
        console.log('Passing filter change to parent component with API access');
        console.log('Sending filters to parent in handleFilterChange:', filters);
        onFilter(filters);
        return; // Exit early as parent will handle the filtering
      }
      
      // Fallback to client-side filtering if we don't have API filtering
      console.log('WARNING: Falling back to client-side filtering (only filters visible data)');
      let filteredResults = dataSource.slice();
      
      // Apply search term filter if there's an existing search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredResults = filteredResults.filter(item => {
          const nameMatch = item.operation_name && item.operation_name.toLowerCase().includes(searchLower);
          const cityMatch = item.city && item.city.toLowerCase().includes(searchLower);
          const typeMatch = item.operation_type && item.operation_type.toLowerCase().includes(searchLower);
          return nameMatch || cityMatch || typeMatch;
        });
      }
      
      // Apply all filters
      if (filters) {
        console.log('Applying filters client-side:', filters);
        
        // Apply city filter
        if (filters.city) {
          filteredResults = filteredResults.filter(item => 
            item.city && item.city.toLowerCase() === filters.city.toLowerCase()
          );
        }
        
        // Apply type filter
        if (filters.operation_type) {
          filteredResults = filteredResults.filter(item => 
            item.operation_type && item.operation_type === filters.operation_type
          );
        }
        
        // Apply rating filter
        if (filters.rating) {
          const minRating = parseFloat(filters.rating);
          filteredResults = filteredResults.filter(item => {
            if (item.rating === undefined) return false;
            
            if (typeof item.rating === 'object' && item.rating !== null) {
              return (item.rating.score || 0) >= minRating;
            }
            
            return parseFloat(item.rating) >= minRating;
          });
        }
        
        // Apply price range filter
        if (filters.priceRange) {
          console.log('Applying price range filter:', filters.priceRange);
          
          // Parse price range
          const rangeParts = filters.priceRange.split('-');
          if (rangeParts.length === 2) {
            const minPrice = parseInt(rangeParts[0], 10);
            const maxPrice = rangeParts[1] === 'up' ? Number.MAX_SAFE_INTEGER : parseInt(rangeParts[1], 10);
            
            if (!isNaN(minPrice) && !isNaN(maxPrice)) {
              console.log(`Price range: ${minPrice} to ${maxPrice}`);
              
              filteredResults = filteredResults.filter(item => {
                // Get the price from any available field
                const price = parseFloat(item.monthly_cost || item.price_est || item.estimated_price || 0);
                
                // Log a sample of the filtering
                if (Math.random() < 0.1) {
                  console.log(`Price filter check: ${item.operation_name}, Price: ${price}, Range: ${minPrice}-${maxPrice}, Result: ${price >= minPrice && price < maxPrice}`);
                }
                
                return price >= minPrice && (maxPrice === Number.MAX_SAFE_INTEGER ? true : price < maxPrice);
              });
            }
          }
        }
        
        // Apply years filter
        if (filters.yearsInOperation) {
          const minYears = parseInt(filters.yearsInOperation);
          filteredResults = filteredResults.filter(item => {
            if (item.license_issue_date) {
              const issueDate = new Date(item.license_issue_date);
              const currentDate = new Date();
              const years = currentDate.getFullYear() - issueDate.getFullYear();
              return years >= minYears;
            }
            return (item.yearsInOperation || 0) >= minYears;
          });
        }
      }
      
      // Update our local filtered data
      setFilteredData(filteredResults);
    } catch (error) {
      console.error('Error during filtering:', error);
    } finally {
      setLoading(false);
    }
  }, [onFilter, searchTerm, dataSource]);
  
  // Handle row click for daycare selection
  const handleRowClick = useCallback((row) => {
    console.log("Row clicked:", row);
    
    // If onDaycareSelect prop exists, forward the click to parent component
    if (onDaycareSelect) {
      console.log("Forwarding daycare selection to parent:", row);
      onDaycareSelect(row);
    } else {
      // Otherwise handle internally - show daycare details
      console.log("Handling daycare selection internally");
      setSelectedDaycare(row);
      
      // Ensure we're at the top of the page
      window.scrollTo(0, 0);
      
      // Show the modal
      setShowDaycareDetails(true);
    }
  }, [onDaycareSelect]);
  
  // Manage modal behavior when showing daycare details
  useEffect(() => {
    if (showDaycareDetails) {
      // Reset scroll position to ensure header is visible
      window.scrollTo(0, 0);
      
      // Prevent body scrolling while modal is open
      document.body.style.overflow = "hidden";
      
      // Add some padding to account for scrollbar disappearance
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    } else {
      // Restore body scrolling when modal is closed
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    
    return () => {
      // Cleanup function to restore scrolling when component unmounts
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [showDaycareDetails]);
  
  // Reset expanded row when page changes
  useEffect(() => {
    setExpandedRowId(null);
  }, [currentPage]);

  return (
    <div className="daycare-data-view">
      {/* Header Section */}
      <div className="data-view-header">
        {headerImage && (
          <div className="header-image-container">
            <img 
              src={headerImage} 
              alt={title} 
              className="header-image" 
            />
            <div className="header-overlay">
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>
        )}
        
        {!headerImage && (
          <div className="header-text-only">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        )}
      </div>
      
      {/* Search information panel */}
      {(searchTerm || Object.keys(filterOptions).length > 0) && (
        <div style={{padding: '10px', background: '#f9f9f9', marginBottom: '10px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              {searchTerm && <p style={{margin: '0 0 5px'}}><strong>Searching for:</strong> "{searchTerm}"</p>}
              {Object.keys(filterOptions).length > 0 && (
                <p style={{margin: '0'}}>
                  <strong>Active filters:</strong> {' '}
                  {Object.entries(filterOptions).map(([key, value]) => (
                    <span key={key} style={{marginRight: '10px'}}>{key}: {value}</span>
                  ))}
                </p>
              )}
            </div>
            <div>
              <strong>Found: {filteredData.length} results</strong>
            </div>
          </div>
        </div>
      )}
      
      {/* Search and Filters Section */}
      <Card className="search-section">
        <Card.Body>
          <UnifiedSearch
            placeholder={searchPlaceholder}
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            initialFilters={filterOptions}
            searchCategories={viewType === 'all' ? ['daycares', 'violations', 'pricing'] : [viewType]}
          />
        </Card.Body>
      </Card>
      
      {/* Applied Filters Summary */}
      {filtersApplied && (
        <div className="applied-filters">
          <div className="filter-chips">
            {Object.entries(filterOptions).map(([key, value]) => (
              value && (
                <div key={key} className="filter-chip">
                  <span className="filter-label">{key}: </span>
                  <span className="filter-value">{value}</span>
                  <button 
                    className="remove-filter" 
                    onClick={() => {
                      const newFilters = {...filterOptions};
                      delete newFilters[key];
                      handleFilterChange(newFilters);
                    }}
                    aria-label={`Remove ${key} filter`}
                  >
                    ×
                  </button>
                </div>
              )
            ))}
          </div>
          <button 
            className="clear-all-filters"
            onClick={() => handleFilterChange({})}
          >
            Clear All
          </button>
        </div>
      )}
      
      {/* Main Data Table */}
      <div className="data-table-section">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading data...</p>
          </div>
        ) : processedData.length > 0 ? (
          <ResponsiveDataTable 
            columns={enhancedColumns}
            data={processedData}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems || filteredData.length}
            onPageChange={handlePageChange}
            currentPage={paginate ? currentPage : currentPageState}
            onSort={onSort}
            onFilter={handleFilterChange}
            externalFilters={filterOptions} // Pass filterOptions to ResponsiveDataTable
            filters={filterOptions} // Pass filterOptions directly as filters prop too
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            expandable={false} // Changed to false to remove expandable row functionality
            expandedContentKey={null} // Changed to null as we no longer support expandable rows
            onRowClick={handleRowClick} // Use our row click handler to capture clicks
            enableFavorites={enableFavorites}
            isServerSorted={true} // Tell ResponsiveDataTable to trust server filtering
          />
        ) : (
          <div className="no-results">
            <p>{noResultsMessage}</p>
          </div>
        )}
      </div>
      
      {/* Daycare Details Modal */}
      {showDaycareDetails && selectedDaycare && (
        <DaycareDetails 
          daycare={selectedDaycare} 
          onClose={() => setShowDaycareDetails(false)}
          initialTab="overview" 
        />
      )}
      
      {/* Custom Extra Content */}
      {extraContent && (
        <div className="extra-content-section">
          {extraContent}
        </div>
      )}
      
      {/* Informational Sections */}
      <Row className="info-sections">
        <Col md={extraContent ? 12 : 6}>
          <ExpandableContent
            title="About This Data"
            card={true}
            previewLines={3}
          >
            <p>This data is sourced from the Texas Department of Health and Human Services Child Care Licensing Database. It is updated regularly to provide the most current information available.</p>
            <p>The ratings displayed are calculated based on multiple factors including: years in operation, violation history, capacity, and other quality indicators.</p>
          </ExpandableContent>
        </Col>
        {!extraContent && (
          <Col md={6}>
            <ExpandableContent
              title="Understanding Ratings"
              card={true}
              previewLines={3}
            >
              <p>Our rating system helps you quickly evaluate daycare centers:</p>
              <ul>
                <li><span className="rating excellent">★★★★★</span> Excellent (4.5-5.0): Centers with outstanding records and typically 5+ years of operation</li>
                <li><span className="rating good">★★★★</span> Good (4.0-4.4): Centers with strong records and typically 3+ years of operation</li>
                <li><span className="rating average">★★★</span> Average (3.0-3.9): Centers with acceptable records</li>
                <li><span className="rating poor">★★</span> Below Average (2.0-2.9): Centers with some concerns in their records</li>
              </ul>
            </ExpandableContent>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default DaycareDataView;
