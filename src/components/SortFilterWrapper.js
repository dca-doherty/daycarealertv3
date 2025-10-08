import React, { useState, useEffect } from 'react';
import { fetchDaycares } from '../utils/mysqlApi';

/**
 * A wrapper component that handles the complex logic for sorting and filtering
 * Specifically addresses the bug where sorting by monthly_cost or yearsInOperation
 * loses the filter settings
 */
const SortFilterWrapper = ({ children, filters, sortColumn, sortDirection, currentPage }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ daycares: [], total: 0 });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check if we need special handling for problematic columns
        const isPriceSort = sortColumn === 'monthly_cost' || sortColumn === 'price_est' || sortColumn === 'estimated_price';
        const isYearsSort = sortColumn === 'yearsInOperation' || sortColumn === 'years_in_operation' || sortColumn === 'years';
        
        console.log(`[SortFilterWrapper] Working with sortColumn=${sortColumn}, isPriceSort=${isPriceSort}, isYearsSort=${isYearsSort}`);
        
        // If we're sorting by a problematic column, use special client-side handling
        if (isPriceSort || isYearsSort) {
          console.log(`[SortFilterWrapper] Using special client-side sorting for ${sortColumn}`);
          console.log(`[SortFilterWrapper] Filters:`, filters);
          
          // 1. Fetch data WITHOUT sorting to ensure filters are applied
          const result = await fetchDaycares(
            currentPage, 
            20, // Fixed page size
            filters, 
            '', // No server-side sorting
            'asc' // Default direction doesn't matter
          );
          
          if (!result || !result.daycares) {
            throw new Error('Failed to fetch data from API');
          }
          
          console.log(`[SortFilterWrapper] Fetched ${result.daycares.length} records with filters only`);
          console.log(`[SortFilterWrapper] Total records: ${result.total}`);
          
          // 2. Sort the data client-side
          let sortedDaycares = [...result.daycares];
          
          // Sort based on the column type
          if (isPriceSort) {
            sortedDaycares.sort((a, b) => {
              // Extract numeric values for price
              let aPrice = a.monthly_cost || a.estimated_price || a.price_est || '0';
              let bPrice = b.monthly_cost || b.estimated_price || b.price_est || '0';
              
              // Clean price strings if needed
              if (typeof aPrice === 'string') aPrice = aPrice.replace(/[$,\s]/g, '');
              if (typeof bPrice === 'string') bPrice = bPrice.replace(/[$,\s]/g, '');
              
              // Convert to numbers
              aPrice = parseFloat(aPrice) || 0;
              bPrice = parseFloat(bPrice) || 0;
              
              // Sort based on direction
              return sortDirection === 'asc' ? aPrice - bPrice : bPrice - aPrice;
            });
          } 
          else if (isYearsSort) {
            sortedDaycares.sort((a, b) => {
              // Extract numeric values for years
              let aYears = parseFloat(a.yearsInOperation || '0') || 0;
              let bYears = parseFloat(b.yearsInOperation || '0') || 0;
              
              // Sort based on direction
              return sortDirection === 'asc' ? aYears - bYears : bYears - aYears;
            });
          }
          
          console.log(`[SortFilterWrapper] Client-side sorting complete for ${sortColumn} ${sortDirection}`);
          
          // 3. Update state with the sorted data
          setData({
            daycares: sortedDaycares,
            total: result.total
          });
        } 
        else {
          // For other columns, use normal server-side sorting
          console.log(`[SortFilterWrapper] Using normal server-side sorting for ${sortColumn}`);
          
          // Make a normal API request
          const result = await fetchDaycares(
            currentPage,
            20,
            filters,
            sortColumn,
            sortDirection
          );
          
          console.log(`[SortFilterWrapper] Fetched ${result.daycares?.length || 0} records with server-side sorting`);
          setData(result);
        }
      } catch (err) {
        console.error('[SortFilterWrapper] Error loading data:', err);
        setError(err.message || 'Failed to load data');
        setData({ daycares: [], total: 0 });
      } finally {
        setLoading(false);
      }
    };
    
    // Load data when filters, sort settings, or page changes
    loadData();
  }, [filters, sortColumn, sortDirection, currentPage]);
  
  // Clone the children with the data properties
  return React.Children.map(children, child => {
    return React.cloneElement(child, {
      daycares: data.daycares || [],
      totalItems: data.total || 0,
      isLoading: loading,
      error: error
    });
  });
};

export default SortFilterWrapper;
