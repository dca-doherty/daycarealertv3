import React, { useState, useEffect, useMemo } from 'react';
import Pagination from './Pagination';
import '../styles/SortableTable.css';

const SortableTable = ({ 
  columns, 
  data, 
  itemsPerPage, 
  totalItems, 
  paginate, 
  currentPage, 
  onSort,
  onFilter,
  isServerSorted = false,
}) => {
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filters, setFilters] = useState({});
  const [filteredData, setFilteredData] = useState(data);

  const filterOptions = useMemo(() => {
    return columns.reduce((acc, column) => {
      if (column.filterable !== false) {
        // Get the values from the data, but make sure they're simple values (strings/numbers)
        const values = data.map(item => {
          const value = item[column.key];
          // Skip objects, only use primitive values
          return typeof value === 'object' ? null : value;
        });
        // Filter out nulls/undefined, get unique values, and sort
        acc[column.key] = [...new Set(values)].filter(Boolean).sort();
      }
      return acc;
    }, {});
  }, [columns, data]);

  useEffect(() => {
    setFilteredData(data);
  }, [data]);

  const handleSort = (column) => {
    const newDirection = column === sortColumn && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(newDirection);
    
    if (onSort) {
      onSort(column, newDirection);
    } else if (!isServerSorted) {
      const sorted = sortData(filteredData, column, newDirection);
      setFilteredData(sorted);
    }
  };

  const handleFilter = (column, value) => {
    const newFilters = { ...filters, [column]: value };
    if (!value) {
      delete newFilters[column];
    }
    setFilters(newFilters);
    
    if (onFilter) {
      onFilter(newFilters);
    } else {
      const filtered = filterData(data, newFilters);
      setFilteredData(filtered);
    }
  };

  const sortData = (dataToSort, column, direction) => {
    return [...dataToSort].sort((a, b) => {
      if (a[column] < b[column]) return direction === 'asc' ? -1 : 1;
      if (a[column] > b[column]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filterData = (dataToFilter, filterCriteria) => {
    return dataToFilter.filter(item => 
      Object.entries(filterCriteria).every(([key, value]) => {
        // Handle different filter types
        if (key === 'priceRange' && item.estimated_price) {
          // Handle price range filter like "1000-1500" or "2000-up"
          const price = item.estimated_price;
          let minPrice = 0;
          let maxPrice = Infinity;
          
          if (value.includes('-')) {
            const [min, max] = value.split('-');
            minPrice = Number(min);
            if (max !== 'up') {
              maxPrice = Number(max);
            }
          }
          
          return price >= minPrice && price <= maxPrice;
        }
        else if (key === 'rating') {
          // Handle rating filter like "4.5" (minimum rating)
          const minRating = Number(value);
          console.log(`Rating filter in SortableTable: ${minRating}`);
          
          // Check if rating exists
          if (!item.rating) {
            return false;
          }
          
          // Get score safely
          const score = typeof item.rating === 'object' 
            ? (item.rating.score || 0) 
            : (typeof item.rating === 'number' ? item.rating : 0);
            
          console.log(`Item ${item.operation_name || 'unknown'} rating: ${score}, passes: ${score >= minRating}`);
          return score >= minRating;
        }
        else {
          // Default: exact match
          return item[key] === value;
        }
      })
    );
  };

  return (
    <div className="sortable-table-container">
      <div className="table-scroll">
        <table className="sortable-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} title={column.tooltip || `Sort by ${column.label}`} style={column.width ? { width: column.width } : {}}>
                  <div 
                    onClick={() => handleSort(column.key)}
                    className={`sort-header ${sortColumn === column.key ? 'active-sort' : ''}`}
                  >
                    <span className="header-label">{column.label}</span>
                    <span className={`sort-icon ${sortColumn === column.key ? 'visible' : ''}`}>
                      {sortColumn === column.key ? 
                        (sortDirection === 'asc' ? '↑' : '↓') : 
                        '⇅'}
                    </span>
                  </div>
                  {column.filterable !== false && filterOptions[column.key] && (
                    <select
                      value={filters[column.key] || ''}
                      onChange={(e) => handleFilter(column.key, e.target.value)}
                      title={`Filter by ${column.label}`}
                    >
                      <option value="">All</option>
                      {filterOptions[column.key].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, index) => {
              return (
                <tr key={index}>
                  {columns.map((column) => {
                    
                    return (
                      <td key={column.key} style={column.width ? { width: column.width } : {}}>
                        <div className="cell-content">
                          {column.render 
                            ? column.render(row[column.key], row)
                            : (column.key === 'estimated_price' && row.estimated_price 
                               ? `$${row.estimated_price}` 
                               : row[column.key])}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalItems > itemsPerPage && (
        <Pagination
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onPageChange={paginate}
          currentPage={currentPage}
        />
      )}
    </div>
  );
};

export default SortableTable;