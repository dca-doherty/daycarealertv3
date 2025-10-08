import React, { useState, useEffect } from 'react';
import { fetchDaycares } from '../utils/mysqlApi';

/**
 * This is a client-side solution for the sorting issue with monthly_cost and yearsInOperation columns
 * The backend API has a bug where filtering is ignored when sorting by these columns
 * This component implements a workaround by:
 * 1. Fetching filtered data WITHOUT sorting
 * 2. Performing client-side sorting by monthly_cost or yearsInOperation
 * 3. This ensures filters are applied properly while still sorting correctly
 */
const FixSorting = ({ filters, sortColumn, sortDirection, onDataLoaded, currentPage }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Determine if we need special handling for problematic columns
        const isPriceSort = sortColumn === 'monthly_cost' || sortColumn === 'price_est' || sortColumn === 'estimated_price';
        const isYearsSort = sortColumn === 'yearsInOperation' || sortColumn === 'years_in_operation' || sortColumn === 'years';
        
        console.log(`[FixSorting] Working with sortColumn=${sortColumn}, isPriceSort=${isPriceSort}, isYearsSort=${isYearsSort}`);
        
        // If we're sorting by a problematic column, we need to apply special handling
        if (isPriceSort || isYearsSort) {
          console.log(`[FixSorting] Using special client-side sorting for ${sortColumn}`);
          console.log(`[FixSorting] Filters:`, filters);
          
          // Fetch data without sorting to ensure filters are applied correctly
          const result = await fetchDaycares(
            currentPage, 
            20, // Fixed page size 
            filters, 
            '', // No server-side sorting
            'asc' // Default direction doesn't matter as we're not using it
          );
          
          if (!result || !result.daycares) {
            throw new Error('Failed to fetch data from API');
          }
          
          console.log(`[FixSorting] Fetched ${result.daycares.length} records with filters only (no sorting)`);
          console.log(`[FixSorting] Total records: ${result.total}`);
          
          // Sort the data client-side
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
          
          console.log(`[FixSorting] Client-side sorting complete for ${sortColumn} ${sortDirection}`);
          
          // Call the callback with the sorted data
          onDataLoaded({
            daycares: sortedDaycares,
            total: result.total
          });
        } 
        else {
          // For other columns, use normal server-side sorting
          console.log(`[FixSorting] Using normal server-side sorting for ${sortColumn}`);
          
          // Pass the request to the regular API
          const result = await fetchDaycares(
            currentPage,
            20,
            filters,
            sortColumn,
            sortDirection
          );
          
          console.log(`[FixSorting] Fetched ${result.daycares?.length || 0} records with server-side sorting`);
          onDataLoaded(result);
        }
      } catch (err) {
        console.error('[FixSorting] Error loading data:', err);
        setError(err.message || 'Failed to load data');
        onDataLoaded({ daycares: [], total: 0 });
      } finally {
        setLoading(false);
      }
    };
    
    // Load data when filters, sort settings, or page changes
    loadData();
  }, [filters, sortColumn, sortDirection, currentPage, onDataLoaded]);
  
  // This component doesn't render anything visible
  return null;
};

export default FixSorting;
