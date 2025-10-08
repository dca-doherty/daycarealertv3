import React, { useState, useEffect, useCallback } from 'react';
import { fetchDaycareData, fetchTotalDaycareCount, fetchFilteredDaycareData } from '../utils/api';
import { estimateDaycarePrice, calculateRating } from '../utils/helpers';
import { DaycareDataView, ExpandableContent } from '../components';
import pricingImage from '../images/pexels-naomi-shi-374023-1001914.jpg';
import '../styles/ratings.css';
import '../styles/DaycarePricing.css';

// Helper function to apply price range filter
const applyPriceRangeFilter = (daycares, priceRange) => {
  // Parse price range string like "1000-1500" or "2000-up"
  let minPrice = 0;
  let maxPrice = Infinity;

  if (priceRange.includes('-')) {
    const [min, max] = priceRange.split('-');
    minPrice = Number(min);
    
    if (max !== 'up') {
      maxPrice = Number(max);
    }
  }

  // Filter daycares based on their estimated_price
  return daycares.filter(daycare => {
    const price = daycare.estimated_price || 0;
    return price >= minPrice && price <= maxPrice;
  });
};

// Helper function to apply rating filter
const applyRatingFilter = (daycares, ratingFilter) => {
  const minRating = Number(ratingFilter);
  console.log(`Applying rating filter: ${minRating}+`);
  
  return daycares.filter(daycare => {
    // Check if rating object exists
    if (!daycare.rating) {
      console.log(`Daycare ${daycare.operation_name} has no rating, filtering out`);
      return false;
    }
    
    // Get the score and make sure it's a number
    const score = typeof daycare.rating === 'object' 
      ? (daycare.rating.score || 0) 
      : (typeof daycare.rating === 'number' ? daycare.rating : 0);
    
    const passes = score >= minRating;
    
    // Add debugging for a sample of daycares
    if (Math.random() < 0.05) { // Log ~5% of items to avoid console spam
      console.log(`Daycare ${daycare.operation_name} rating: ${score}, filter: ${minRating}, passes: ${passes}`);
    }
    
    return passes;
  });
};

const DaycarePricing = () => {
  const [daycares, setDaycares] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [cities, setCities] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState('operation_name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Define table columns with rendering functions
  const columns = [
    { 
      key: 'operation_name', 
      label: 'Daycare Name', 
      filterable: false,
      width: '25%',
      render: (value) => (
        <div className="cell-content daycare-name">
          {value || 'Unknown'}
        </div>
      )
    },
    { 
      key: 'programs_provided', 
      label: 'Programs',
      width: '30%',
      render: (programs) => programs ? (
        <div className="truncate-program" title={programs}>
          {programs}
        </div>
      ) : 'Not specified'
    },
    { 
      key: 'total_capacity', 
      label: 'Capacity',
      width: '10%',
      render: (value) => (
        <div className="capacity-value">
          {value || 'N/A'}
        </div>
      )
    },
    { 
      key: 'rating', 
      label: 'Rating', 
      width: '15%',
      render: (rating) => rating ? (
        <div className="rating-container">
          <span className={`rating ${rating.class || 'good'}`}>{rating.stars || '★★★★'}</span>
          <span className="rating-score"> ({typeof rating === 'number' ? rating.toFixed(2) : rating.score.toFixed(2)})</span>
        </div>
      ) : (
        <div className="rating-container">
          <span className="rating average">★★★</span>
          <span className="rating-score"> (3.00)</span>
        </div>
      ),
      filterable: false
    },
    { 
      key: 'estimated_price', 
      label: 'Est. Price',
      width: '20%',
      render: (price, daycare) => {
        const displayPrice = price || 1200;
        return (
          <span className="price-value">${displayPrice.toLocaleString()}</span>
        );
      },
      filterable: false
    }
  ];

  // Function to load daycares with calculated ratings and prices
  const loadDaycares = useCallback(async () => {
    setLoading(true);
    
    try {
      // Calculate offset for pagination
      const offset = (currentPage - 1) * itemsPerPage;
      
      // Prepare filters including search term
      const apiFilters = { 
        ...filters, 
        searchTerm: searchTerm,
      };
      
      // Fetch data from API
      const data = await fetchFilteredDaycareData(
        itemsPerPage, 
        offset, 
        apiFilters, 
        sortColumn, 
        sortDirection
      );
      
      // Add ratings and prices to each daycare
      const processedDaycares = data.map(daycare => {
        try {
          const ratingObj = calculateRating(daycare);
          const price = estimateDaycarePrice(daycare);
          
          // Ensure both rating and price are properly set
          return {
            ...daycare,
            id: daycare.operation_number || daycare.id, // Ensure ID for expandable content
            rating: ratingObj,
            rating_details: ratingObj,
            price: price,
            estimated_price: price
          };
        } catch (error) {
          console.error('Error processing daycare:', daycare.operation_name, error);
          // Provide fallback values if calculation fails
          return {
            ...daycare,
            id: daycare.operation_number || daycare.id,
            rating: { score: 3, stars: '★★★', class: 'average', yearsInOperation: 0 },
            rating_details: { score: 3, stars: '★★★', class: 'average', yearsInOperation: 0 },
            price: 1200,
            estimated_price: 1200
          };
        }
      });
      
      // Apply client-side filtering for price range if needed
      let filteredDaycares = processedDaycares;
      if (filters.priceRange) {
        filteredDaycares = applyPriceRangeFilter(processedDaycares, filters.priceRange);
      }
      
      // Apply client-side filtering for rating if needed
      if (filters.rating) {
        console.log(`Rating filter found: ${filters.rating}`);
        const beforeCount = filteredDaycares.length;
        filteredDaycares = applyRatingFilter(filteredDaycares, filters.rating);
        const afterCount = filteredDaycares.length;
        console.log(`Rating filter applied: ${beforeCount} daycares -> ${afterCount} daycares (${beforeCount - afterCount} filtered out)`);
      }
      
      // Apply client-side sorting for calculated fields
      const calculatedFields = ['estimated_price', 'price', 'rating'];
      if (calculatedFields.includes(sortColumn)) {
        const sortDir = sortDirection === 'asc' ? 1 : -1;
        
        filteredDaycares.sort((a, b) => {
          // Special handling for rating which is an object
          if (sortColumn === 'rating') {
            const aValue = a.rating?.score || 0;
            const bValue = b.rating?.score || 0;
            return (aValue - bValue) * sortDir;
          } else {
            const aValue = a[sortColumn] || 0;
            const bValue = b[sortColumn] || 0;
            return (aValue - bValue) * sortDir;
          }
        });
      }
      
      setDaycares(filteredDaycares);
      
      // Get total count for pagination - adjust for client-side filtering
      let count;
      if (filters.priceRange || filters.rating) {
        // When client-side filtering is applied, use the filtered count
        count = filteredDaycares.length;
      } else {
        // Otherwise, get the count from the server
        count = await fetchTotalDaycareCount(apiFilters);
      }
      setTotalItems(count);
    } catch (error) {
      console.error('Error loading daycares:', error);
      setDaycares([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, filters, searchTerm, sortColumn, sortDirection]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Fetch cities for the dropdown
        const allData = await fetchDaycareData(1000, 0);
        const uniqueCities = [...new Set(allData.map(d => d.city))].filter(Boolean).sort();
        setCities(uniqueCities);
        
        // Load first page of daycares
        await loadDaycares();
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    
    loadInitialData();
  }, [loadDaycares]);

  // Handle search with unified search component
  const handleSearch = (term, category, newFilters) => {
    setSearchTerm(term);
    
    // Use the existing filters for any properties not in newFilters
    const combinedFilters = { ...filters, ...(newFilters || {}) };
    
    // Remove any filter with an empty string value
    Object.keys(combinedFilters).forEach(key => {
      if (combinedFilters[key] === '') {
        delete combinedFilters[key];
      }
    });
    
    setFilters(combinedFilters);
    setCurrentPage(1); // Reset to first page when search changes
  };

  // Handle filter changes
  const handleFilter = (newFilters) => {
    // Use the existing filters for any properties not in newFilters
    const combinedFilters = { ...filters, ...newFilters };
    
    // Remove any filter with an empty string value
    Object.keys(combinedFilters).forEach(key => {
      if (combinedFilters[key] === '') {
        delete combinedFilters[key];
      }
    });
    
    setFilters(combinedFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle sort
  const handleSort = (column, direction) => {
    // Client-side sorting for calculated fields like estimated_price and rating
    const calculatedFields = ['estimated_price', 'price', 'rating'];
    
    // Set state for all sorts, even for calculated fields
    setSortColumn(column);
    setSortDirection(direction);
    setCurrentPage(1);
    
    // For calculated fields, we'll do client-side sorting after the data is fetched
    if (calculatedFields.includes(column) && daycares.length > 0) {
      // Make a copy of the daycares array to avoid direct state mutation
      const sortedDaycares = [...daycares];
      const sortDir = direction === 'asc' ? 1 : -1;
      
      sortedDaycares.sort((a, b) => {
        const aValue = a[column] || 0;
        const bValue = b[column] || 0;
        
        if (aValue < bValue) return -1 * sortDir;
        if (aValue > bValue) return 1 * sortDir;
        return 0;
      });
      
      // Update state with the sorted data
      setDaycares(sortedDaycares);
    }
  };

  // Handle pagination
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Render expanded content for detailed pricing information
  const renderExpandedContent = useCallback((daycare) => {
    // Determine price factor descriptions based on daycare data
    const pricingFactors = [
      {
        factor: 'Location',
        impact: daycare.city === 'Austin' || daycare.city === 'Dallas' ? 'High' : 'Medium',
        description: `Daycares in ${daycare.city} typically have ${daycare.city === 'Austin' || daycare.city === 'Dallas' ? 'higher' : 'moderate'} prices due to cost of living.`
      },
      {
        factor: 'Programs Offered',
        impact: daycare.programs_provided && daycare.programs_provided.includes('Infant') ? 'High' : 'Medium',
        description: daycare.programs_provided ? `Offers ${daycare.programs_provided}. ${daycare.programs_provided.includes('Infant') ? 'Infant care typically increases costs significantly.' : ''}` : 'Limited program information available.'
      },
      {
        factor: 'Quality Rating',
        impact: daycare.rating && daycare.rating.score > 4 ? 'Medium' : 'Low',
        description: `Quality rating of ${daycare.rating ? daycare.rating.score.toFixed(1) : '3.0'} stars has a ${daycare.rating && daycare.rating.score > 4 ? 'moderate' : 'small'} impact on pricing.`
      },
      {
        factor: 'Capacity',
        impact: 'Low',
        description: `Facility capacity of ${daycare.total_capacity || 'unknown'} children has minimal impact on individual pricing.`
      }
    ];

    // Age-based pricing breakdown (estimated)
    const agePricing = [
      { age: 'Infant (0-12 months)', price: Math.round((daycare.estimated_price || 1200) * 1.2) },
      { age: 'Toddler (1-2 years)', price: Math.round((daycare.estimated_price || 1200) * 1.1) },
      { age: 'Pre-K (3-5 years)', price: Math.round((daycare.estimated_price || 1200) * 0.9) },
      { age: 'After School (6+ years)', price: Math.round((daycare.estimated_price || 1200) * 0.6) }
    ];

    return (
      <div className="expanded-price-details">
        <div className="expanded-row">
          <div className="expanded-column price-breakdown">
            <h4>Price Breakdown by Age</h4>
            <table className="age-pricing-table">
              <thead>
                <tr>
                  <th>Age Group</th>
                  <th>Estimated Monthly Cost</th>
                </tr>
              </thead>
              <tbody>
                {agePricing.map((item, index) => (
                  <tr key={index}>
                    <td>{item.age}</td>
                    <td>${item.price.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="expanded-column price-factors">
            <h4>Pricing Factors</h4>
            <div className="factors-list">
              {pricingFactors.map((item, index) => (
                <div key={index} className="factor-item">
                  <div className="factor-header">
                    <span className="factor-name">{item.factor}</span>
                    <span className={`impact-badge impact-${item.impact.toLowerCase()}`}>
                      {item.impact} Impact
                    </span>
                  </div>
                  <p className="factor-description">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="price-notes">
          <p><strong>Note:</strong> All prices are estimates based on available data and may vary. Contact the daycare directly for current pricing.</p>
        </div>
      </div>
    );
  }, []);

  // Pricing info section content
  const renderPricingInfo = () => (
    <ExpandableContent
      title="Understanding Our Price Estimates"
      card={true}
      previewLines={3}
    >
      <p>Our price estimates are calculated based on multiple factors including:</p>
      <ul>
        <li><strong>Location:</strong> Cities with higher costs of living typically have more expensive childcare</li>
        <li><strong>Programs Offered:</strong> Centers that offer infant care, special programs, or extended hours often charge more</li>
        <li><strong>Quality Rating:</strong> Higher-rated facilities generally have higher prices</li>
        <li><strong>Capacity:</strong> Can sometimes affect pricing based on economics of scale</li>
      </ul>
      <p>These estimates are meant to give you a general idea of what to expect, but actual prices may vary. Always contact the daycare directly for their current rates.</p>
    </ExpandableContent>
  );

  return (
    <DaycareDataView
      data={daycares}
      loading={loading}
      title="Daycare Pricing Comparison"
      subtitle="Compare estimated monthly costs for childcare centers across Texas"
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
      viewType="pricing"
      expandable={true}
      expandedContentRenderer={renderExpandedContent}
      headerImage={pricingImage}
      searchPlaceholder="Search by daycare name, city, or program..."
      extraContent={renderPricingInfo()}
    />
  );
};

export default DaycarePricing;