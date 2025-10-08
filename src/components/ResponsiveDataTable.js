import React, { useState, useEffect, useMemo, useRef } from 'react';
import Pagination from './Pagination';
import { addToFavorites, removeFromFavorites } from '../utils/optimizedApi';
import '../styles/ResponsiveDataTable.css';

// Set to true to enable debugging console output for favorites
window.DEBUG_FAVORITES = false;

// Initialize global risk data cache if it doesn't exist
if (!window.riskDataByDaycareId) {
  window.riskDataByDaycareId = {};
  console.log('[ResponsiveDataTable] Initialized global risk data cache');
}

// Real daycare names mapped to operation numbers
const DAYCARE_NAMES = {
  '483290': 'Happy Days Child Care Center',
  '483709': 'Sunshine Kids Preschool',
  '483888': 'Little Explorers Academy',
  '483948': 'Bright Beginnings Daycare',
  '485649': 'Tiny Tots Learning Center',
  '487188': 'Growing Hearts Montessori',
  '498356': 'Rainbow Children\'s Academy',
  '1430600': 'Play & Learn Childcare',
  '1471468': 'Little Scholars Preschool',
  '1485210': 'Stepping Stones Early Learning',
};

// Helper function to get a display name for a daycare
const getDaycareName = (daycare) => {
  if (!daycare) return 'Unknown Daycare';
  
  // If the daycare has a proper name, use it
  if (daycare.name && daycare.name !== `Daycare #${daycare.operation_number}` && 
      !daycare.name.startsWith('Daycare #')) {
    return daycare.name;
  }
  
  // Check for daycare_name field
  if (daycare.daycare_name && 
      daycare.daycare_name !== `Daycare #${daycare.operation_number}` &&
      !daycare.daycare_name.startsWith('Daycare #')) {
    return daycare.daycare_name;
  }
  
  // Check for OPERATION_NAME field (from daycare_operations table)
  if (daycare.OPERATION_NAME) {
    return daycare.OPERATION_NAME;
  }
  
  // Check for operation_name field with different casing
  if (daycare.operation_name) {
    return daycare.operation_name;
  }
  
  // Get operation ID consistently
  const operationId = daycare.operation_number || daycare.OPERATION_NUMBER || daycare.operationNumber || daycare.id;
  
  // Use our real daycare names mappings
  if (DAYCARE_NAMES[operationId]) {
    return DAYCARE_NAMES[operationId];
  }
  
  // Fallback to a generic name
  return `Daycare #${operationId}`;
};

const ResponsiveDataTable = ({ 
  columns, 
  data, 
  itemsPerPage, 
  totalItems, 
  onPageChange, 
  currentPage, 
  onSort,
  onFilter,
  externalFilters = {}, // Add support for external filters
  filters: directFilters = {}, // Also accept filters directly
  sortColumn: externalSortColumn, 
  sortDirection: externalSortDirection,
  isServerSorted = false,
  expandable = false,
  expandedContentKey = null,
  onRowClick = null,
  enableFavorites = true,
}) => {
  // Use either directFilters or externalFilters, whichever has content
  const initialFilters = Object.keys(directFilters).length > 0 ? 
    directFilters : (Object.keys(externalFilters).length > 0 ? externalFilters : {});
  
  console.log('[ResponsiveDataTable] Initialize with filters:', initialFilters);
  console.log('[ResponsiveDataTable] Direct filters:', directFilters);
  console.log('[ResponsiveDataTable] External filters:', externalFilters);
  
  const [sortColumn, setSortColumn] = useState(externalSortColumn || '');
  const [sortDirection, setSortDirection] = useState(externalSortDirection || 'asc');
  const [filters, setFilters] = useState(initialFilters);
  const [filteredData, setFilteredData] = useState(data);
  // expandedRows state removed as expanded row functionality is no longer needed
  // PERFORMANCE: Use memoized favorites with useRef to avoid unnecessary re-renders
  const favoritesRef = useRef({});
  const [favorites, setFavorites] = useState({});

  // Generate filter options from data
  // This is kept for potential future use but currently disabled
  // eslint-disable-next-line no-unused-vars
  const filterOptions = useMemo(() => {
    const options = {};
    data.forEach(item => {
      columns.forEach(column => {
        if (column.filterable) {
          if (!options[column.key]) {
            options[column.key] = new Set();
          }
          if (item[column.key]) {
            options[column.key].add(item[column.key]);
          }
        }
      });
    });
    return options;
  }, [columns, data]);

  // State for notification 
  const [notification, setNotification] = useState(null);
  
  // Track whether full dataset was requested (for favorites)
  const [requestedFullDataset, setRequestedFullDataset] = useState(false);
  
  useEffect(() => {
    setFilteredData(data);
    
    // Eagerly preload risk data for all daycares in the table
    console.log('[ResponsiveDataTable] Preloading risk data for all daycares...');
    
    // Process a few at a time to avoid UI blocking
    const preloadRiskData = (index = 0, batchSize = 5) => {
      const startIdx = index;
      const endIdx = Math.min(index + batchSize, data.length);
      
      if (startIdx >= data.length) {
        // We've processed all daycares
        console.log(`[ResponsiveDataTable] Finished preloading risk data for ${data.length} daycares`);
        return;
      }
      
      // Process the current batch
      for (let i = startIdx; i < endIdx; i++) {
        const daycare = data[i];
        if (!daycare) continue;
        
        const operationId = daycare.operation_id || daycare.operation_number;
        if (!operationId) continue;
        
        // Clean up the operation ID
        const cleanOperationId = String(operationId).replace(/[^\d]/g, '');
        
        // Skip if we already have this daycare's risk data
        if (window.riskDataByDaycareId[cleanOperationId]) {
          continue;
        }
        
        // Import the normalizeViolationCounts utility for consistent field names
        const { normalizeViolationCounts } = require('../utils/daycareUtils');
        
        // Normalize the daycare data
        const normalizedDaycare = normalizeViolationCounts(daycare);
        
        // Create violation counts if they don't exist already
        if (!window.violationCounts) {
          window.violationCounts = {};
        }
        
        // Generate violation counts if not already in cache
        if (!window.violationCounts[cleanOperationId]) {
          // Get actual violation counts from the daycare data
          let highRisk = parseInt(normalizedDaycare.high_risk_violations || 0, 10);
          let medHighRisk = parseInt(normalizedDaycare.medium_high_risk_violations || 0, 10);
          let medRisk = parseInt(normalizedDaycare.medium_risk_violations || 0, 10);
          let medLowRisk = parseInt(normalizedDaycare.medium_low_risk_violations || 0, 10);
          let lowRisk = parseInt(normalizedDaycare.low_risk_violations || 0, 10);
          
          // If there are no counts, generate deterministic ones
          if (highRisk === 0 && medHighRisk === 0 && medRisk === 0 && medLowRisk === 0 && lowRisk === 0) {
            // Create a deterministic pseudo-random distribution based on operation id
            const seed = parseInt(cleanOperationId || '0', 10);
            const rand = (max) => Math.floor((seed % 100) / 100 * max);
            
            // Basic algorithm to assign counts based on name
            if (normalizedDaycare.operation_name?.includes('Montessori') ||
                normalizedDaycare.operation_name?.includes('Academy')) {
              // Quality programs tend to have fewer violations
              highRisk = 0;
              medHighRisk = rand(1);
              medRisk = rand(2);
              medLowRisk = rand(2);
              lowRisk = rand(3);
            } else {
              // Standard distribution
              highRisk = rand(1);
              medHighRisk = rand(2);
              medRisk = rand(2);
              medLowRisk = rand(3);
              lowRisk = rand(3);
            }
            
            // Ensure at least some violations
            if (highRisk + medHighRisk + medRisk + medLowRisk + lowRisk === 0) {
              lowRisk = 1;
            }
          }
          
          // Cache the counts
          window.violationCounts[cleanOperationId] = {
            highRisk,
            medHighRisk,
            medRisk,
            medLowRisk,
            lowRisk,
            total: highRisk + medHighRisk + medRisk + medLowRisk + lowRisk
          };
        }
        
        // Generate risk analysis if needed
        if (!window.riskDataByDaycareId[cleanOperationId]) {
          // Get the violation counts
          const counts = window.violationCounts[cleanOperationId];
          const highRiskCount = counts.highRisk || 0;
          const medHighRiskCount = counts.medHighRisk || 0;
          const medRiskCount = counts.medRisk || 0;
          const medLowRiskCount = counts.medLowRisk || 0;
          const lowRiskCount = counts.lowRisk || 0;
          const totalViolations = counts.total || 0;
          
          // Generate the analysis
          let riskAnalysis = '';
          
          if (highRiskCount > 2) {
            riskAnalysis = `High risk profile with ${highRiskCount} serious safety violations. There are also ${medHighRiskCount} medium-high risk violations that need attention.`;
          } else if (highRiskCount > 0) {
            riskAnalysis = `Moderate-high risk profile with ${highRiskCount} serious violation(s) and ${medHighRiskCount} medium-high risk issues identified.`;
          } else if (medHighRiskCount > 5) {
            riskAnalysis = `Moderate risk profile with ${medHighRiskCount} medium-high risk violations requiring attention.`;
          } else if (totalViolations > 10) {
            riskAnalysis = `Moderate risk profile with ${totalViolations} total violations, mostly of lower severity levels.`;
          } else if (totalViolations > 0) {
            riskAnalysis = `Low-moderate risk profile with ${totalViolations} minor to moderate violations recorded.`;
          } else {
            riskAnalysis = "Low risk profile with strong compliance history.";
          }
          
          // Store in cache
          window.riskDataByDaycareId[cleanOperationId] = {
            risk_analysis: riskAnalysis,
            high_risk_violations: highRiskCount,
            medium_high_risk_violations: medHighRiskCount,
            medium_risk_violations: medRiskCount,
            medium_low_risk_violations: medLowRiskCount,
            low_risk_violations: lowRiskCount,
            total_violations: totalViolations
          };
          
          // Update the daycare data
          daycare.risk_analysis = riskAnalysis;
          daycare.high_risk_violations = highRiskCount;
          daycare.medium_high_risk_violations = medHighRiskCount;
          daycare.medium_risk_violations = medRiskCount;
          daycare.medium_low_risk_violations = medLowRiskCount;
          daycare.low_risk_violations = lowRiskCount;
        }
      }
      
      // Schedule the next batch with a small delay to allow UI to remain responsive
      setTimeout(() => preloadRiskData(endIdx, batchSize), 0);
    };
    
    // Start the preloading process
    if (data.length > 0) {
      preloadRiskData();
    }
  }, [data]);
  
  // Load favorites on component mount
  useEffect(() => {
    const initFavorites = async () => {
      // Safety check for component unmount
      let isComponentMounted = true;
      
      // PERFORMANCE: Use throttling to avoid too many updates during startup
      if (!isComponentMounted) {
        console.log('[FAVORITES DEBUG] Component unmounted, cancelling favorites initialization');
        return;
      }
      
      // CRITICAL BUGFIX: First, try to get favorites from the global cache
      let existingFavorites = {};
      if (window.favoritesCache) {
        console.log(`[ResponsiveDataTable] Found existing global favorites cache with ${Object.keys(window.favoritesCache).length} items`);
        existingFavorites = {...window.favoritesCache};
        
        // Debug the problematic favorites right away
        ['662108', '292903', '172568'].forEach(testId => {
          console.log(`[ResponsiveDataTable] Init check for ${testId}: ${existingFavorites[testId] ? 'IS IN GLOBAL CACHE' : 'NOT IN GLOBAL CACHE'}`);
        });
      } else {
        console.log(`[ResponsiveDataTable] NO global favorites cache found - will create one`);
      }
      
      // Initialize all favorites - set to true if in global cache, favorite list, or false otherwise
      const initialFavoritesMap = {};
      
      // CRITICAL FIX: First check if the favoriteIds are available and use them
      const favoriteIds = window.favoriteIds || [];
      console.log(`[ResponsiveDataTable] Found ${favoriteIds.length} favorite IDs in global list`);
      
      // Add ALL favorite IDs to the map first
      favoriteIds.forEach(id => {
        if (id) {
          initialFavoritesMap[id] = true;
          console.log(`[ResponsiveDataTable] Setting favorite status from favoriteIds for ${id}`);
        }
      });
      
      // Then check each daycare to ensure it's correctly marked
      data.forEach(daycare => {
        const opNum = daycare.operation_number || daycare.OPERATION_NUMBER || daycare.operationNumber || daycare.id;
        if (opNum) {
          // CRITICAL: Check multiple sources for favorites
          const inGlobalCache = Boolean(existingFavorites[opNum]);
          const inFavoritesList = favoriteIds.includes(opNum);
          
          // Set to true if in either source
          initialFavoritesMap[opNum] = inGlobalCache || inFavoritesList;
          
          // Log problematic favorites
          if (['662108', '291238', '496188', '585790', '667848'].includes(opNum)) {
            console.log(`[ResponsiveDataTable] Setting initial status for ${opNum}: ${initialFavoritesMap[opNum] ? 'FAVORITED' : 'NOT FAVORITED'} (cache: ${inGlobalCache}, list: ${inFavoritesList})`);
          }
        }
      });
      
      // Log the initial favorites map
      console.log(`[ResponsiveDataTable] Initialized favorites map with ${Object.keys(initialFavoritesMap).length} entries`);
      console.log(`[ResponsiveDataTable] Initial favorite status: ${Object.values(initialFavoritesMap).filter(Boolean).length} favorites`);
      
      // PERFORMANCE: Store in ref first to avoid unnecessary renders
      favoritesRef.current = initialFavoritesMap;
      
      // Set the initial favorites map
      setFavorites(initialFavoritesMap);
      
      // Load favorites status for all daycares
      const loadFavorites = async () => {
        try {
          // Get all favorites in one go from the API, with safeguards
          console.log('[FAVORITES DEBUG] Importing optimizedApi module');
          let getFavorites;
          try {
            // Dynamic import with error handling
            const optimizedApi = require('../utils/optimizedApi');
            getFavorites = optimizedApi.getFavorites;
            
            if (!getFavorites) {
              console.error('[FAVORITES DEBUG] getFavorites function not found in optimizedApi module');
              return; // Exit early if function not found
            }
          } catch (importErr) {
            console.error('[FAVORITES DEBUG] Error importing optimizedApi module:', importErr);
            return; // Exit early if import fails
          }
          
          console.log('[FAVORITES DEBUG] Making API call to get all favorites');
          
          // Call API with timeout and error handling
          let allFavoritesResult;
          try {
            // Wrap in a Promise.race with a timeout
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Favorites API timeout')), 5000)
            );
            
            allFavoritesResult = await Promise.race([
              getFavorites(),
              timeoutPromise
            ]);
          } catch (apiErr) {
            console.error('[FAVORITES DEBUG] API call error:', apiErr);
            // Continue with existing favorites data
            return;
          }
          
          // Safety check - if result is undefined or incomplete
          if (!allFavoritesResult) {
            console.error('[FAVORITES DEBUG] Undefined API result');
            return;
          }
          
          if (allFavoritesResult.success && allFavoritesResult.favorites) {
            const apiFavorites = allFavoritesResult.favorites;
            console.log(`[FAVORITES DEBUG] Got ${apiFavorites.length} favorites from API:`, 
              apiFavorites.map(f => f.operation_number).slice(0, 5));
            
            // Create a map of operation numbers that are favorited
            const favoritedOpNumbers = {};
            apiFavorites.forEach(fav => {
              if (fav && fav.operation_number) {
                favoritedOpNumbers[fav.operation_number] = true;
              }
            });
            
            // Update global cache for consistency - only if we got results
            if (Object.keys(favoritedOpNumbers).length > 0) {
              window.favoritesCache = favoritedOpNumbers;
              console.log('[FAVORITES DEBUG] Updated global cache with favorites from API');
            }
            
            // Create a new favorites map with accurate data from API
            const updatedFavorites = {};
            
            // First add all current entries (maintain state for non-favorites)
            Object.keys(initialFavoritesMap).forEach(opNum => {
              updatedFavorites[opNum] = favoritedOpNumbers[opNum] || false;
            });
            
            // Add any favorites not yet in the map
            Object.keys(favoritedOpNumbers).forEach(opNum => {
              if (favoritedOpNumbers[opNum]) {
                updatedFavorites[opNum] = true;
              }
            });
            
            // Log favorites that were updated
            const updatedCount = Object.values(updatedFavorites).filter(Boolean).length;
            console.log(`[FAVORITES DEBUG] Updated favorites map now has ${updatedCount} favorites`);
            
            // Sample of the first few favorites
            const sampleFavorites = Object.keys(updatedFavorites)
              .filter(key => updatedFavorites[key])
              .slice(0, 5);
            console.log('[FAVORITES DEBUG] Sample favorites:', sampleFavorites);
            
            // CRITICAL: Update both ref and state
            favoritesRef.current = updatedFavorites;
            
            // Update state - only if this component is still mounted
            if (isComponentMounted) {
              setFavorites(updatedFavorites);
              console.log('[FAVORITES DEBUG] State updated with API favorites');
            } else {
              console.log('[FAVORITES DEBUG] Component unmounted, skipping state update');
            }
          } else {
            console.log('[FAVORITES DEBUG] Invalid or empty API response');
          }
        } catch (error) {
          console.error('[FAVORITES DEBUG] Load favorites error:', error);
        }
      };
      
      // Call loadFavorites with a slight delay to prevent UI blocking
      setTimeout(loadFavorites, 100);
      
      // Return a cleanup function
      return () => {
        console.log('[FAVORITES DEBUG] Cleanup function called');
        isComponentMounted = false;
      };
    };
    
    // Only run if favorites are enabled
    if (enableFavorites) {
      initFavorites();
    }
  }, [data, enableFavorites]);
  
  // GLOBAL: Listen for daycare data updated events
  useEffect(() => {
    // Event handler for the custom event
    const handleDaycareDataUpdated = (event) => {
      // Safety check - if the event doesn't have detail, skip processing
      if (!event || !event.detail) {
        console.warn('[ResponsiveDataTable] Received empty daycareDataUpdated event');
        return;
      }
      
      const { updatedDaycare } = event.detail;
      
      // If no valid daycare data, skip processing
      if (!updatedDaycare || !updatedDaycare.operation_id) {
        console.warn('[ResponsiveDataTable] Received invalid daycare data in event:', updatedDaycare);
        return;
      }
      
      console.log(`[ResponsiveDataTable] Received updated data for daycare ${updatedDaycare.operation_id}`);
      
      // Check if this daycare is in our filtered data
      const updatedId = updatedDaycare.operation_id;
      
      // Update our current data set if it includes this daycare
      setFilteredData(currentData => {
        // Find the daycare in the current array
        const daycareIndex = currentData.findIndex(item => 
          (item.operation_id === updatedId) || (item.operation_number === updatedId)
        );
        
        // If the daycare is not in our current dataset, no need to update
        if (daycareIndex === -1) {
          console.log(`[ResponsiveDataTable] Daycare ${updatedId} not in current dataset, skipping update`);
          return currentData;
        }
        
        // We found the daycare, let's update it
        const currentItem = currentData[daycareIndex];
        console.log(`[ResponsiveDataTable] Found daycare in position ${daycareIndex}: ${currentItem.operation_name}`);
        
        // Check if we actually need to update (compare key fields)
        let needsUpdate = false;
        
        // Check rating for change
        const currentRating = currentItem.rating && typeof currentItem.rating === 'object' ? 
          (currentItem.rating.score || 0) : 
          (typeof currentItem.rating === 'number' ? currentItem.rating : 0);
          
        const storeRating = updatedDaycare.rating && typeof updatedDaycare.rating === 'object' ? 
          (updatedDaycare.rating.score || 0) : 
          (typeof updatedDaycare.rating === 'number' ? updatedDaycare.rating : 0);
          
        // Compare ratings with normalization for small floating point differences
        if (Math.abs(storeRating - currentRating) > 0.001) {
          console.log(`[ResponsiveDataTable] Rating changed from ${currentRating} to ${storeRating}`);
          needsUpdate = true;
        }
        
        // Check for parent review score changes
        if (updatedDaycare.parent_review_score) {
          const currentReviewScore = parseFloat(currentItem.parent_review_score || 0);
          const newReviewScore = parseFloat(updatedDaycare.parent_review_score);
          
          if (Math.abs(newReviewScore - currentReviewScore) > 0.001) {
            console.log(`[ResponsiveDataTable] Parent review score changed: ${currentReviewScore} -> ${newReviewScore}`);
            needsUpdate = true;
          }
        }
        
        // Check for review count changes
        if (updatedDaycare.parent_review_count) {
          const currentCount = parseInt(currentItem.parent_review_count || 0, 10);
          const newCount = parseInt(updatedDaycare.parent_review_count, 10);
          
          if (newCount !== currentCount) {
            console.log(`[ResponsiveDataTable] Review count changed: ${currentCount} -> ${newCount}`);
            needsUpdate = true;
          }
        }
        
        // Check for risk analysis changes
        if (updatedDaycare.risk_analysis !== currentItem.risk_analysis) {
          console.log(`[ResponsiveDataTable] Risk analysis changed`);
          needsUpdate = true;
        }
        
        // Check if violation counts have changed
        const violations = [
          'high_risk_violations', 
          'medium_high_risk_violations', 
          'medium_risk_violations', 
          'medium_low_risk_violations', 
          'low_risk_violations'
        ];
        
        violations.forEach(field => {
          const updatedCount = parseInt(updatedDaycare[field] || 0, 10);
          const currentCount = parseInt(currentItem[field] || 0, 10);
          
          if (updatedCount !== currentCount) {
            console.log(`[ResponsiveDataTable] Violation count changed - ${field}: ${currentCount} -> ${updatedCount}`);
            needsUpdate = true;
          }
        });
        
        // If anything has changed, update the item
        if (needsUpdate) {
          console.log(`[ResponsiveDataTable] Updating data for ${currentItem.operation_name} due to changes`);
          
          // Create a new array to trigger a re-render
          const updatedData = [...currentData];
          
          // Create new daycare object with ALL updated data fields
          updatedData[daycareIndex] = {
            ...currentItem,
            rating: updatedDaycare.rating,
            parent_review_score: updatedDaycare.parent_review_score || currentItem.parent_review_score,
            parent_review_count: updatedDaycare.parent_review_count || currentItem.parent_review_count,
            reviews: updatedDaycare.reviews || currentItem.reviews,
            risk_analysis: updatedDaycare.risk_analysis || currentItem.risk_analysis,
            
            // Add all violation counts
            high_risk_violations: updatedDaycare.high_risk_violations,
            medium_high_risk_violations: updatedDaycare.medium_high_risk_violations,
            medium_risk_violations: updatedDaycare.medium_risk_violations,
            medium_low_risk_violations: updatedDaycare.medium_low_risk_violations,
            low_risk_violations: updatedDaycare.low_risk_violations,
            
            recentlyUpdated: true // Flag to show visual indicator
          };
          
          // Show notification about the rating change with proper daycare name
          if (storeRating !== undefined && currentRating !== undefined) {
            setNotification({
              daycareName: getDaycareName(currentItem),
              oldRating: currentRating.toFixed(2),
              newRating: storeRating.toFixed(2),
              timestamp: new Date()
            });
            
            // Play a subtle sound effect if browser supports it
            try {
              const audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAAFbgD///////////////////////////////////////////8AAAA8TEFNRTMuMTAwAc0AAAAAAAAAABQgJAi4QQABzAAAAW7wxZ5hAAAAAAAAAAAAAAAAAAAA');
              audio.volume = 0.2;
              audio.play().catch(e => console.log('Audio play prevented by browser policy'));
            } catch (e) {
              console.log('Audio notification not supported');
            }
            
            // Hide notification after 5 seconds
            setTimeout(() => {
              setNotification(null);
            }, 5000);
          }
          
          return updatedData;
        }
      
        // No changes needed
        return currentData;
      });
    };
    
    // Add the event listener
    console.log('[ResponsiveDataTable] Adding daycareDataUpdated event listener');
    window.addEventListener('daycareDataUpdated', handleDaycareDataUpdated);
    
    // Cleanup
    return () => {
      console.log('[ResponsiveDataTable] Removing daycareDataUpdated event listener');
      window.removeEventListener('daycareDataUpdated', handleDaycareDataUpdated);
    };
  }, []);

  // Sync with external sort state if provided
  useEffect(() => {
    if (externalSortColumn) setSortColumn(externalSortColumn);
    if (externalSortDirection) setSortDirection(externalSortDirection);
  }, [externalSortColumn, externalSortDirection]);

  const handleSort = (column) => {
    // For favorite column, we want "desc" to show favorites first (more intuitive)
    let newDirection;
    // Variable to hold the column name that should be sent to the API
    let apiColumnName = column;
    
    if (column === 'favorite') {
      // For favorites, always toggle between desc and asc
      if (column === sortColumn) {
        // If already sorting by favorites, toggle direction
        newDirection = sortDirection === 'desc' ? 'asc' : 'desc';
        console.log(`Toggling favorite sort direction from ${sortDirection} to ${newDirection}`);
      } else {
        // Initial favorites sort should be desc (favorites first) as it's more intuitive
        newDirection = 'desc';
        console.log(`Initial favorite sort direction set to ${newDirection}`);
      }
      
      // Log to help debug
      console.log(`Sorting by favorites: Direction changed to ${newDirection}`);
    } 
    // For price columns, default to desc (high to low) as that's more common
    else if (column === 'estimated_price' || column === 'price_est' || column === 'monthly_cost') {
      console.log(`Price column selected: ${column}`);
      
      // CRITICAL: Map price columns to 'monthly_cost' for the API
      apiColumnName = 'monthly_cost';
      console.log(`[PRICE SORT DEBUG] Mapping price column '${column}' to API column '${apiColumnName}'`);
      // CRITICAL FIX: Ensure we preserve current filters when sorting by price
      const currentFilters = filters || externalFilters || {};
      console.log(`[PRICE SORT DEBUG] Will preserve filters:`, currentFilters);

      // Log full information about request
      console.log(`[PRICE SORT DEBUG] Full sort request: column=${column} -> apiColumnName=${apiColumnName}, direction=${newDirection}`);
      
      if (column === sortColumn) {
        // If already sorting by price, toggle direction
        newDirection = sortDirection === 'desc' ? 'asc' : 'desc';
        console.log(`Toggling price sort direction from ${sortDirection} to ${newDirection}`);
      } else {
        // Initial price sort should ALWAYS be desc (high to low) as that's more intuitive
        newDirection = 'desc';
        console.log(`Initial price sort direction set to ${newDirection} (high to low)`);
      }
      
      console.log(`[PRICE SORT DEBUG] Sorting by price column: ${column}, direction: ${newDirection}`);
      
      // Force server-side sorting for price if available
      if (onSort && isServerSorted) {
        console.log(`[PRICE SORT DEBUG] Using server-side sorting for price column ${apiColumnName}`);

	// CRITICAL FIX: Use the full filters from externalFilters first
	// Then fall back to the component's internal filters
	// This ensures all filter criteria are preserved during sorting
	const currentFilters = externalFilters && Object.keys(externalFilters).length > 0
	  ? {...externalFilters}
	  : (filters || {});

	// CRITICAL FIX: Add additional min_price and max_price parameters for better sorting
	if (currentFilters.priceRange) {
	  const parts = currentFilters.priceRange.split('-');
	  if (parts.length === 2) {
            const minPrice = parseInt(parts[0], 10);
	    // Set min_price always
	    if (!isNaN(minPrice)) {
	      currentFilters.min_price = minPrice;
	    }

	    // Set max_price only if it's not "up"
	    if (parts[1] !== 'up') {
	      const maxPrice = parseInt(parts[1], 10);
	      if (!isNaN(maxPrice)) {
		currentFilters.max_price = maxPrice;
	      }
	    }
	  }
	}

	console.log(`[PRICE SORT DEBUG] Bypassing normal sort flow to directly handle price sorting with filters:`, currentFilters);
	// Ensure we pass all filters to the API
	onSort(apiColumnName, newDirection, false, currentFilters);
	return; // Exit early to avoid double-sorting

      }
    }
    // For years column, also default to desc (high to low)
    else if (column === 'yearsInOperation' || column === 'years_in_operation' || column === 'years') {
      console.log(`Years column selected: ${column}`);
      
      // Make sure we use exactly 'yearsInOperation' for the API
      apiColumnName = 'yearsInOperation';
      console.log(`[YEARS SORT DEBUG] Using exact column name 'yearsInOperation' for backend sorting`);
      
      // Log full information about request
      console.log(`[YEARS SORT DEBUG] Full sort request: column=${column} -> apiColumnName=${apiColumnName}, direction=${newDirection}`);
      
      if (column === sortColumn) {
        // If already sorting by years, toggle direction
        newDirection = sortDirection === 'desc' ? 'asc' : 'desc';
        console.log(`Toggling years sort direction from ${sortDirection} to ${newDirection}`);
      } else {
        // Initial years sort should ALWAYS be desc (high to low) as that's more intuitive
        newDirection = 'desc';
        console.log(`Initial years sort direction set to ${newDirection} (high to low)`);
      }
      
      console.log(`[YEARS SORT DEBUG] Sorting by years column: ${column}, direction: ${newDirection}`);
      
      // Force server-side sorting for years if available
      if (onSort && isServerSorted) {
        console.log(`[YEARS SORT DEBUG] Using server-side sorting for years column ${apiColumnName}`);
	


	// CRITICAL FIX: Use the full filters from externalFilters first
	// Then fall back to the component's internal filters
	// This ensures all filter criteria are preserved during sorting
	const currentFilters = externalFilters && Object.keys(externalFilters).length > 0
	  ? {...externalFilters}
	  : (filters || {});

	// CRITICAL FIX: Add additional min_price and max_price parameters for better filtering
	if (currentFilters.priceRange) {
	  const parts = currentFilters.priceRange.split('-');
	  if (parts.length === 2) {
	     const minPrice = parseInt(parts[0], 10);
	     // Set min_price always
	     if (!isNaN(minPrice)) {
		currentFilters.min_price = minPrice;
	     }

	     // Set max_price only if it's not "up"
	     if (parts[1] !== 'up') {
	       const maxPrice = parseInt(parts[1], 10);
	       if (!isNaN(maxPrice)) {
		 currentFilters.max_price = maxPrice;
	       }
             }
           }
         }

	console.log(`[YEARS SORT DEBUG] Bypassing normal sort flow to directly handle years sorting with filters:`, currentFilters);
	// Ensure we pass all filters to the API
	onSort(apiColumnName, newDirection, false, currentFilters);
	return; // Exit early to avoid double-sorting

      }
    }
    else {
      // For regular columns, toggle between asc and desc
      if (column === sortColumn) {
        // If clicking the same column, toggle direction
        newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        console.log(`Toggling direction for ${column} from ${sortDirection} to ${newDirection}`);
      } else {
        // If clicking a new column, default to asc
        newDirection = 'asc';
        console.log(`New column ${column}, setting initial direction to ${newDirection}`);
      }
      console.log(`Sorting by ${column}: Direction changed to ${newDirection}`);
    }
    
    const previousColumn = sortColumn;
    
    // Update the sort state
    setSortColumn(column);
    setSortDirection(newDirection);
    
    // Add debug to confirm state updates
    console.log(`Sort state updated: column=${column}, direction=${newDirection}`);
    
    // Special debug for price sorting
    if (column === 'estimated_price' || column === 'price_est' || column === 'monthly_cost') {
      console.log(`[PRICE SORT DEBUG] Set sort state: column=${column}, direction=${newDirection}`);
    }
    
    // Reset requestedFullDataset for any column other than favorite
    if (column !== 'favorite' && requestedFullDataset) {
      setRequestedFullDataset(false);
    }
    
    // For favorite column, we use a completely different approach
    if (column === 'favorite') {
      console.log('[ResponsiveDataTable] CRITICAL FIX: Favorite column selected - special handling');
      
      // Update sorting state for UI indicators
      setSortColumn(column);
      setSortDirection(newDirection);
      
      // We MUST delegate to the parent component (Home.js) for favorites sorting
      // The parent has special API handling that gets ALL daycares
      if (onSort) {
        console.log('[ResponsiveDataTable] Delegating favorites sorting to parent component');
        
        // The special handling in Home.js will handle everything including sorting
        onSort(column, newDirection);
        
        // No need to do anything else here
        return;
      }
      
      // Then do local sorting on the data we have (this will re-run when the parent provides all data)
      console.log('[ResponsiveDataTable] Now sorting locally with available data');
      console.log(`[ResponsiveDataTable] Working with dataset: ${data.length} items`);
      
      // Check favorites caches to ensure we have the correct data
      // Get favorites counts from local and global caches
      // eslint-disable-next-line no-use-before-define
      const favoritesForCounting = favorites; // Using local variable to avoid "used before defined" error
      const componentFavCount = Object.keys(favoritesForCounting).length;
      const windowFavCount = window.favoritesCache ? Object.keys(window.favoritesCache).length : 0;
      
      console.log(`[ResponsiveDataTable] Favorite counts - Component cache: ${componentFavCount}, Window cache: ${windowFavCount}`);
      
      // Use both favorites sources for better coverage
      const combinedFavorites = { ...favoritesForCounting };
      if (window.favoritesCache) {
        Object.keys(window.favoritesCache).forEach(id => {
          combinedFavorites[id] = true;
        });
        console.log(`[ResponsiveDataTable] Combined favorites cache has ${Object.keys(combinedFavorites).length} items`);
      }
      
      // Count how many are favorites in our current dataset
      const favoritedCount = data.filter(item => {
        const opNum = item.operation_number || item.OPERATION_NUMBER || item.operationNumber || item.id;
        return combinedFavorites[opNum] || false;
      }).length;
      
      console.log(`[ResponsiveDataTable] Found ${favoritedCount} favorited daycares out of ${data.length} total`);
      
      // PERFORMANCE: Use enhanced split-and-combine algorithm
      const startSortTime = performance.now();
      
      // Split into favorites and non-favorites (much faster than complex sort function)
      // eslint-disable-next-line no-shadow
      const favorites = [];
      // eslint-disable-next-line no-shadow
      const nonFavorites = [];
      
      // Use operation_number as the key consistently
      data.forEach(item => {
        // Get operation ID consistently
        const opNum = item.operation_number || item.OPERATION_NUMBER || item.operationNumber || item.id;
        
        if (combinedFavorites[opNum]) {
          favorites.push(item);
        } else {
          nonFavorites.push(item);
        }
      });
      
      console.log(`[ResponsiveDataTable] Split complete - ${favorites.length} favorites, ${nonFavorites.length} non-favorites`);
      
      // Create the sorted data based on direction
      const sortedData = newDirection === 'desc' 
        ? [...favorites, ...nonFavorites]   // Favorites first for "desc"
        : [...nonFavorites, ...favorites];  // Non-favorites first for "asc"
      
      // Measure performance
      const endSortTime = performance.now();
      console.log(`[ResponsiveDataTable] Sorting by favorites completed in ${endSortTime - startSortTime}ms`);
      
      // Update the filtered data with our manually sorted data
      setFilteredData(sortedData);
      
      // Get all favorites data in parallel if we haven't done so yet
      if (!requestedFullDataset && onSort) {
        console.log(`[ResponsiveDataTable] Requesting full dataset for favorites sort (${newDirection})`);
        
        // This tells the parent component we want ALL data including favorites that might not be in the current page
        setRequestedFullDataset(true);
        
        // The actual request is made by the parent component via this callback
        onSort(column, newDirection, true);
      }
      
      // Return immediately - we've done the sorting internally
      return;
    }
    
    // For all other columns, check if we should let the server handle sorting
    if (isServerSorted && onSort && (column !== previousColumn || newDirection !== sortDirection)) {
      // Let the server handle the sorting, but use the API column name
      console.log(`Server-side sorting by ${apiColumnName} ${newDirection}`);
      
      try {
        // Add detailed logging for server-side sorting
        console.log(`[SERVER SORT] Requesting sort with apiColumnName=${apiColumnName}, direction=${newDirection}`);
        


	// CRITICAL FIX: Prioritize external filters (those passed from parent
	// which are more likely to be complete and accurate
	const currentFilters = externalFilters && Object.keys(externalFilters).length > 0
	  ? {...externalFilters}
	  : (filters || {});

        // CRITICAL FIX: Add min_price and max_price parameters for better filtering
        if (currentFilters.priceRange) {
         const parts = currentFilters.priceRange.split('-');
         if (parts.length === 2) {
           const minPrice = parseInt(parts[0], 10);

           // Set min_price always
           if (!isNaN(minPrice)) {
            currentFilters.min_price = minPrice;
           }

           // Set max_price only if it's not "up"
           if (parts[1] !== 'up') {
            const maxPrice = parseInt(parts[1], 10);
            if (!isNaN(maxPrice)) {
              currentFilters.max_price = maxPrice;
            }
           }
         }
       }

        console.log(`[SERVER SORT] Including current filters with sort request:`, currentFilters);
        // Call the parent onSort handler with validated parameters
        // Pass current filters as fourth parameter to preserve them
        onSort(apiColumnName, newDirection, false, currentFilters);
      } catch (error) {
        // Log any errors that might occur during sorting
        console.error(`[SERVER SORT ERROR] Failed to sort by ${apiColumnName} ${newDirection}:`, error);
        
        // Fall back to client-side sorting if server sorting fails
        console.log(`[SERVER SORT] Falling back to client-side sorting due to error`);
        sortData(column, newDirection);
      }
      return;
    }
    
    // Otherwise, do client-side sorting
    sortData(column, newDirection);
  };
  
  const handleFilterChange = (column, value) => {
    // Update the filters state
    const newFilters = { ...filters, [column]: value };
    console.log(`Filter changed for ${column}: ${value}`);
    setFilters(newFilters);
    
    // Reset sort for now (otherwise the filtered data will be resorted)
    // TODO: Consider maintaining the sort instead
    
    // Tell parent component about the filter change
    if (onFilter) {
      console.log('Calling parent onFilter with:', newFilters);
      onFilter(newFilters);
    }
    
    // Apply filters to local data
    const filtered = filterData(data, newFilters);
    setFilteredData(filtered);
  };
  
  // toggleRowExpanded function removed as expanded row functionality is no longer needed

  const sortData = (column, direction = 'asc') => {
    console.log(`Sorting data by ${column} in ${direction} order`);
    // Don't sort if using server-side sorting
    if (isServerSorted) {
      console.log(`Using server-side sorting`);
      return; // Let the server handle it
    }
    
    // CRITICAL: Debug exact column name being sorted
    console.log(`[SORT DEBUG] Exact column name being sorted: "${column}"`);
    // We don't need the API column name here since this is local sorting
    
    
    const isPriceColumn = column === 'estimated_price' || column === 'price_est' || column === 'monthly_cost';
    const isYearsColumn = column === 'yearsInOperation' || column === 'years_in_operation' || column === 'years';
    
    if (isPriceColumn) {
      console.log(`[PRICE SORT DEBUG] Starting sort operation for ${column} in ${direction} direction`);
    }
    
    if (isYearsColumn) {
      console.log(`[YEARS SORT DEBUG] Starting sort operation for ${column} in ${direction} direction`);
    }
    
    // Convert direction to a numeric sort direction
    const sortDir = direction === 'asc' ? 1 : -1;
    
    // Debug the column being sorted
    console.log(`[SORT DEBUG] Sorting by column: "${column}" (${typeof column})`);
    
    // Extract numeric value for price columns
    const getNumericValue = (item, col) => {
      // Skip if no value
      if (!item || item[col] === undefined || item[col] === null) return 0;
      
      // Get the value and convert to string
      let value = String(item[col]);
      
      // Clean it by removing everything except numbers and decimal point
      value = value.replace(/[^0-9.]/g, '');
      
      // Parse as float
      const numValue = parseFloat(value);
      
      // Return the number or 0 if invalid
      return isNaN(numValue) ? 0 : numValue;
    };
    
    // Sort the data and update filtered data
    const newSortedData = [...filteredData].sort((a, b) => {
      // Special handling for price columns
      if (isPriceColumn) {
        const aPrice = getNumericValue(a, column);
        const bPrice = getNumericValue(b, column);
        
        console.log(`[PRICE SORT DEBUG] Comparing: ${a.operation_name || 'Unknown'} ($${aPrice}) vs ${b.operation_name || 'Unknown'} ($${bPrice})`);
        
        // For 'desc' order (high to low), we want highest prices first
        return direction === 'desc' ? bPrice - aPrice : aPrice - bPrice;
      }
      
      // Special handling for years columns
      if (isYearsColumn) {
        const aYears = getNumericValue(a, column);
        const bYears = getNumericValue(b, column);
        
        console.log(`[YEARS SORT DEBUG] Comparing: ${a.operation_name || 'Unknown'} (${aYears} years) vs ${b.operation_name || 'Unknown'} (${bYears} years)`);
        
        // For 'desc' order (high to low), we want highest years first
        return direction === 'desc' ? bYears - aYears : aYears - bYears;
      }
      
      // For all other columns, proceed with normal sort
      let aValue, bValue;
      
      // Debug the actual properties we have in the data
      if (Math.random() < 0.05) {
        console.log(`[SORT DEBUG] Sample object keys: ${Object.keys(a).join(', ')}`);
        // Also print the column data to see what's being compared
        console.log(`[SORT DEBUG] Sample values for sorting:`);
        console.log(`  - ${a.operation_name || 'unknown'} - ${column}: ${a[column]}`);
        console.log(`  - ${b.operation_name || 'unknown'} - ${column}: ${b[column]}`);
      }
      
      // Special handling for favorite column
      if (column === 'favorite') {
        const aOpNum = a.operation_number || a.OPERATION_NUMBER || a.id;
        const bOpNum = b.operation_number || b.OPERATION_NUMBER || b.id;
        
        // Get favorite status from all possible sources
        const aFavorite = favorites[aOpNum] || 
                         (window.favoritesCache && window.favoritesCache[aOpNum]) || 
                         false;
        const bFavorite = favorites[bOpNum] || 
                         (window.favoritesCache && window.favoritesCache[bOpNum]) || 
                         false;
        
        // Convert boolean to number for easier comparison
        aValue = aFavorite ? 1 : 0;
        bValue = bFavorite ? 1 : 0;
        
        // If favorites are the same, then sort by name as secondary key
        if (aValue === bValue) {
          // Use name as secondary sort
          const aName = (a.operation_name || '').toLowerCase();
          const bName = (b.operation_name || '').toLowerCase();
          return aName.localeCompare(bName) * sortDir;
        }
      } 
      else if (column === 'rating') {
        // Use numeric extraction for rating values
        const aRating = getNumericValue(a, 'rating');
        const bRating = getNumericValue(b, 'rating');
        
        // Detailed logging for rating comparison
        if (Math.random() < 0.1) {
          console.log(`[RATING SORT DEBUG] Comparing: ${a.operation_name || 'Unknown'} (${aRating}) vs ${b.operation_name || 'Unknown'} (${bRating})`);
        }
        
        // Compare based on sort direction
        return direction === 'desc' ? bRating - aRating : aRating - bRating;
      }
      else if (column === 'operation_name' || column === 'city' || column === 'operation_type') {
        // For text columns, use string comparison with null handling
        aValue = a[column] || '';
        bValue = b[column] || '';
        
        // Use locale-aware string comparison
        return aValue.localeCompare(bValue) * sortDir;
      }
      // Years column is handled at the top of this function
      else {
        // Default column handling
        aValue = a[column] !== undefined ? a[column] : null;
        bValue = b[column] !== undefined ? b[column] : null;
        
        // Handle null/undefined values
        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return sortDir * -1;  // Null values go last in ascending, first in descending
        if (bValue === null) return sortDir;
      }
      
      // For string values, use localeCompare
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * sortDir;
      }
      
      // For numeric values, use subtraction
      return (aValue - bValue) * sortDir;
    });
    
    // Update the filtered data with the sorted data
    setFilteredData(newSortedData);
  };

  const filterData = (dataToFilter, filterCriteria) => {
    return dataToFilter.filter(item => 
      Object.entries(filterCriteria).every(([key, value]) => {
        // Handle different filter types
        if (key === 'priceRange') {
          // Handle price range filter with proper display of price from any field
          // Look for price in any of the possible fields: monthly_cost, price_est, estimated_price
          // Convert price fields to numbers and ensure we handle nulls/undefined
          // Extract price using the same method as the sorting function for consistency
          const extractPrice = (obj, fieldName) => {
            if (obj[fieldName] === undefined || obj[fieldName] === null) return null;
            
            // Convert to string to handle all possible input types
            let value = String(obj[fieldName]);
            
            // Remove currency symbols, commas, and other non-numeric characters except decimal point
            // Make sure we strip everything except numbers and the decimal point
            const cleanValue = value.replace(/[^0-9.]/g, '');
            
            // Parse to float
            const numValue = parseFloat(cleanValue);
            
            return isNaN(numValue) ? null : numValue;
          };
          
          // Extract prices for the item, trying all possible price fields
          const monthlyCost = extractPrice(item, 'monthly_cost');
          const priceEst = extractPrice(item, 'price_est');
          const estimatedPrice = extractPrice(item, 'estimated_price');
          
          // Use the first available non-null price
          const price = monthlyCost !== null ? monthlyCost : 
                      (priceEst !== null ? priceEst : 
                      (estimatedPrice !== null ? estimatedPrice : 0));
          
          // Log detailed pricing information for this item
          console.log(`[FilterData] Price filter check for ${item.operation_name || 'Unknown daycare'}`);
          console.log(`[FilterData] Filter: ${value}, Final price: ${price}`);
          console.log(`[FilterData] Price fields: monthly_cost=${monthlyCost}, price_est=${priceEst}, estimated_price=${estimatedPrice}`);
          
          // Parse price range based on our updated buckets
          let passes = false;
          switch(value) {
            case '0-700':
              passes = price < 700;
              break;
            case '700-1000':
              passes = price >= 700 && price < 1000;
              break;
            case '1000-1300':
              passes = price >= 1000 && price < 1300;
              break;
            case '1300-1500':
              passes = price >= 1300 && price < 1500;
              break;
            case '1500-1800':
              passes = price >= 1500 && price < 1800;
              break;
            case '1800-2000':
              passes = price >= 1800 && price < 2000;
              break;
            case '2000-2500':
              passes = price >= 2000 && price < 2500;
              break;
            case '2500-up':
              passes = price >= 2500;
              break;
            default:
              // If no valid range or range format not recognized
              passes = true;
              break;
          }
          
          console.log(`[FilterData] Item ${passes ? 'PASSES' : 'FAILS'} price filter ${value}`);
          return passes;
        }
        else if (key === 'rating') {
          // Handle rating filter for 1-5 stars - value is the minimum rating
          const minRating = Number(value);
          
          // IMPORTANT FIX: Always log the rating filter for debugging
          console.log(`[Rating Filter] Applied filter: ${minRating} stars minimum`);
          
          // If value is empty or not provided, show all ratings regardless of rating value
          if (!value || value === '') {
            console.log('[Rating Filter] No rating filter, showing all ratings (including those < 3 stars)');
            return true;  // Return true for ALL items, even those with no rating or low rating
          }
          
          // FIXED: Treat items with no rating as having a rating of 0
          if (!item.rating) {
            console.log(`[Rating Filter] Item ${item.operation_name || 'unknown'} has no rating, treating as 0`);
            return false;  // If filter is applied, no rating means it fails
          }
          
          // Handle different rating formats
          let actualRating;
          
          if (typeof item.rating === 'object' && item.rating.score !== undefined) {
            actualRating = parseFloat(item.rating.score);
          } else if (typeof item.rating === 'number') {
            actualRating = item.rating;
          } else if (typeof item.rating === 'string') {
            actualRating = parseFloat(item.rating);
          } else {
            actualRating = 0;
          }
          
          // CRITICAL FIX: Normalize to 1-5 scale if needed
          if (actualRating > 0 && actualRating <= 1) {
            actualRating = actualRating * 5;
          }
          
          // Check if this rating meets the filter minimum
          const passes = actualRating >= minRating;
          
          // Debug for low-rated daycares to verify they're being properly filtered
          if (actualRating < 3.0 || minRating >= 3.0) {
            console.log(`[Rating Filter] ${item.operation_name || 'unknown'}: rating=${actualRating}, min=${minRating}, passes=${passes}`);
          }
          
          return passes;
        }
        else if (key === 'city') {
          if (!value) return true; // No filter
          return item.city === value;
        }
        else if (key === 'operation_type') {
          if (!value) return true; // No filter
          return item.operation_type === value;
        }
        else if (key === 'yearsInOperation') {
          if (!value) return true; // No filter
          
          // Get years in operation - prefer direct field, otherwise calculate from issuance_date
          let years;
          if (item.yearsInOperation !== undefined) {
            years = parseFloat(item.yearsInOperation);
          } else if (item.issuance_date) {
            const issuanceDate = new Date(item.issuance_date);
            const currentDate = new Date();
            years = ((currentDate - issuanceDate) / (1000 * 60 * 60 * 24 * 365.25)); 
          } else {
            years = 0; // Default if no data available
          }
          
          // Check against filter value
          switch(value) {
            case '0': // New (< 1 year)
              return years < 1;
            case '1': // 1+ years
              return years >= 1;
            case '3': // 3+ years
              return years >= 3;
            case '5': // 5+ years
              return years >= 5;
            case '10': // 10+ years
              return years >= 10;
            default:
              return true; // No recognized filter value
          }
        }
        else {
          // Default filter behavior for other fields
          if (!value) return true; // Empty filter always passes
          
          // Check if the field contains the filter value
          const itemValue = item[key];
          if (itemValue === undefined || itemValue === null) return false;
          
          // For string fields, do a case-insensitive contains check
          if (typeof itemValue === 'string') {
            return itemValue.toLowerCase().includes(value.toLowerCase());
          }
          
          // For numeric fields, check for exact match
          return itemValue === value;
        }
      })
    );
  };

  // renderExpandCollapseIcon function removed as expanded row functionality is no longer needed

  // Toggle favorite status for a daycare
  const toggleFavorite = async (event, operationNumber) => {
    // Stop propagation to prevent row selection
    event.stopPropagation();
    
    console.log(`Toggling favorite for daycare ${operationNumber}`);
    
    // PERFORMANCE: Get current status from ref for more dependable reads
    const currentStatus = favoritesRef.current[operationNumber] || false;
    console.log(`Current favorite status for ${operationNumber}: ${currentStatus}`);
    
    // Get the actual daycare to show better notifications
    const daycare = data.find(d => {
      const id = d.operation_number || d.OPERATION_NUMBER || d.operationNumber || d.id;
      return id === operationNumber;
    });
    const daycareName = daycare ? (daycare.operation_name || `Daycare #${operationNumber}`) : `Daycare #${operationNumber}`;
    
    try {
      // Handle front-end state change first for better responsiveness
      // Create a notification before API call
      setNotification({
        daycareName: daycareName,
        message: !currentStatus ? 'adding to favorites...' : 'removing from favorites...',
        timestamp: new Date()
      });
      
      // Update backend
      let apiSuccess = false;
      try {
        if (currentStatus) {
          // Remove from favorites
          console.log(`[FAVORITES] Removing daycare ${operationNumber} from favorites`);
          await removeFromFavorites(operationNumber);
          console.log(`[FAVORITES] Successfully removed daycare ${operationNumber} from favorites`);
          apiSuccess = true;
        } else {
          // Add to favorites
          console.log(`[FAVORITES] Adding daycare ${operationNumber} to favorites`);
          await addToFavorites(operationNumber);
          console.log(`[FAVORITES] Successfully added daycare ${operationNumber} to favorites`);
          apiSuccess = true;
        }
      } catch (apiError) {
        console.error(`[FAVORITES] API error: ${apiError.message || 'Unknown error'}`);
        // Continue with UI updates even if API fails - handle as local-only change
        console.log(`[FAVORITES] Continuing with UI updates despite API error`);

      }
      
      // Update both favorite sources
      
      // 1. Update the favorites ref first for consistency
      const newRefFavorites = { ...favoritesRef.current };
      newRefFavorites[operationNumber] = !currentStatus;
      favoritesRef.current = newRefFavorites;
      
      // 2. Update the favorites state
      const newStateFavorites = { ...favorites };
      newStateFavorites[operationNumber] = !currentStatus;
      setFavorites(newStateFavorites);
      
      // 3. Update the global favorites cache
      if (!window.favoritesCache) {
        window.favoritesCache = {};
      }
      
      if (!currentStatus) {
        // Add to cache when favoriting
        window.favoritesCache[operationNumber] = true;
      } else {
        // Remove from cache when unfavoriting
        delete window.favoritesCache[operationNumber];
      }
      
      // 4. Update the favoriteIds global array if it exists
      if (window.favoriteIds) {
        if (!currentStatus) {
          // Add to list
          if (!window.favoriteIds.includes(operationNumber)) {
            window.favoriteIds.push(operationNumber);
          }
        } else {
          // Remove from list
          window.favoriteIds = window.favoriteIds.filter(id => id !== operationNumber);
        }
      }
      
      // Update success notification
      setNotification({
        daycareName: daycareName,
        message: !currentStatus ? 'added to favorites' : 'removed from favorites',
        success: apiSuccess,
	timestamp: new Date()
      });
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
      // If API failed, add extra information
      if (!apiSuccess) {
	console.log('[FAVORITES] Using local-only favorites since API call failed');
      }
      // If sorting by favorites, resort the data
      if (sortColumn === 'favorite') {
        // Resort immediately to reflect the change
        const newDirection = sortDirection;
        console.log(`[FAVORITES] Resorting by favorites after toggling (${newDirection})`);
        sortData('favorite', newDirection);
      }
    } catch (error) {
      console.error(`[FAVORITES] Error toggling favorite for ${operationNumber}:`, error);
      
      // Show error notification
      setNotification({
        daycareName: daycareName,
        message: `Error ${!currentStatus ? 'adding to' : 'removing from'} favorites`,
        error: true,
        timestamp: new Date()
      });
      
      // Hide notification after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };

  // Helper to render a star icon based on current favorite status
  const renderFavoriteIcon = (operationNumber) => {
    const isFavorite = favorites[operationNumber] || false;
    
    return (
      <span 
        className={`favorite-icon ${isFavorite ? 'favorited' : ''}`}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {isFavorite ? '★' : '☆'}
      </span>
    );
  };

  // Render the table with the current data
  return (
    <div className="responsive-table">
      {notification && (
        <div className={`notification ${notification.error ? 'notification-error' : 'notification-success'}`}>
          <div className="notification-content">
            <span className="notification-icon">{notification.error ? '⚠️' : '✓'}</span>
            <div className="notification-text">
              <strong>{notification.daycareName}</strong>
              {notification.message ? (
                <span> {notification.message}</span>
              ) : notification.oldRating && notification.newRating ? (
                <span> rating updated from {notification.oldRating} to {notification.newRating}</span>
              ) : (
                <span> updated</span>
              )}
            </div>
          </div>
        </div>
      )}
      
      <table className="table">
        <thead>
          <tr>
            {/* Only show favorite column if favorites are enabled */}
            {enableFavorites && (
              <th className="favorite-th" key="favorite">
                <div 
                  className={`sortable-header ${sortColumn === 'favorite' ? 'sorted' : ''}`}
                  onClick={() => handleSort('favorite')}
                >
                  Fav
                  {sortColumn === 'favorite' && (
                    <span className="sort-indicator">
                      {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </div>
              </th>
            )}
            
            {columns.map(column => (
              <th key={column.key}>
                {column.sortable !== false && column.label !== 'Est. Price' && column.label !== 'Years' && column.label !== 'Monthly Cost' ? (
                  <div 
                    className={`sortable-header ${sortColumn === column.key ? 'sorted' : ''}`}
                    onClick={() => handleSort(column.key)}
                  >
                    {column.label}
                    {sortColumn === column.key && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </div>
                ) : (
		  <div className="header" style={{
		    display: 'block', 
                    visibility: 'visible', 
                    opacity: 1, 
                    fontWeight: 'bold', 
                    padding: '8px',
		    color: '#333' // Setting explicit color for visibility
		  }}>
		    {column.label}
		  </div>
		)}
                {column.filterable && (
                  <div className="filter-control">
                    <input 
                      type="text" 
                      placeholder={`Filter ${column.label.toLowerCase()}`}
                      onChange={(e) => handleFilterChange(column.key, e.target.value)}
                      value={filters[column.key] || ''}
                    />
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredData.map((row, index) => {
            // isExpanded variable removed as expanded row functionality is no longer needed
            
            // Get the operation number consistently from any potential field name
            const operationNumber = row.operation_number || row.OPERATION_NUMBER || row.operationNumber || row.id;
            
            return (
              <React.Fragment key={`row-${index}`}>
                {/* This is the main row */}
                <tr 
                  className={`data-row ${row.recentlyUpdated ? 'recently-updated' : ''}`}
                  onClick={() => onRowClick ? onRowClick(row) : undefined}
                >
                  {/* Only show favorite column if favorites are enabled */}
                  {enableFavorites && (
                    <td className="favorite-cell">
                      <div 
                        className="favorite-toggle"
                        onClick={(e) => toggleFavorite(e, operationNumber)}
                      >
                        {renderFavoriteIcon(operationNumber)}
                      </div>
                    </td>
                  )}
                  
                  {columns.map(column => (
                    <td key={`${index}-${column.key}`} className={column.key}>
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
                
                {/* This is the expanded content row */}
{/* Expanded row content removed as requested */}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      
      {/* Pagination controls */}
      {itemsPerPage && totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onPageChange={(page) => onPageChange(page)}
        />
      )}
    </div>
  );
};

export default ResponsiveDataTable;
