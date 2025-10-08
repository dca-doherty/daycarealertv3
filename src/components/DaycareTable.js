import React from 'react';
import SortableTable from './SortableTable';

const DaycareTable = ({ 
  daycares, 
  itemsPerPage, 
  totalItems, 
  paginate, 
  currentPage, 
  onSort, 
  onFilter,
  sortColumn, 
  sortDirection,
  isServerSorted 
}) => {
  const columns = [
    { key: 'operation_name', label: 'Operation Name', filterable: false },
    { key: 'operation_type', label: 'Type' },
    { key: 'location_address', label: 'Address', filterable: false },
    { key: 'city', label: 'City' },
    { key: 'total_capacity', label: 'Capacity' },
    { 
      key: 'yearsInOperation', 
      label: 'Years', 
      render: (years) => years !== undefined ? Math.round(years) : 'N/A',
      filterable: false
    },
    { 
      key: 'rating', 
      label: 'Rating', 
      render: (rating, row) => {
        // Special debug for Meadow Oaks Academy
        if (row.operation_name && row.operation_name.includes('Meadow Oaks Academy')) {
          console.log('DEBUG: Rendering Meadow Oaks Academy in table:', {
            name: row.operation_name,
            operationNumber: row.operation_number,
            rating: rating,
            ratingType: typeof rating,
            score: typeof rating === 'number' ? rating : (rating && rating.score),
            stars: rating && rating.stars,
            class: rating && rating.class
          });
        }
        
        return rating ? (
          <div>
            <span className={`rating ${rating.class || 'good'}`}>{rating.stars || '★★★★'}</span>
            <span className="rating-score"> ({typeof rating === 'number' ? rating.toFixed(2) : rating.score.toFixed(2)})</span>
          </div>
        ) : 'N/A';
      },
      filterable: false
    },
    { 
      key: 'risk_analysis', 
      label: 'Analysis', 
      render: (analysis, row) => {
        // Check if analysis is a function and call it if so
        const analysisValue = typeof analysis === 'function' ? analysis() : analysis;
        
        // Use either risk_analysis or analysis_summary field
        const summary = analysisValue || row.analysis_summary;
        
        if (!summary) return <span className="text-muted">Not available</span>;
        
        // Ensure summary is a string
        const summaryString = typeof summary === 'string' ? summary : 
          (summary && typeof summary.toString === 'function' ? summary.toString() : 'No readable analysis');
        
        // Truncate long summaries for table display
        return summaryString.length > 100 ? 
          <span title={summaryString}>{summaryString.substring(0, 100)}...</span> : 
          <span>{summaryString}</span>;
      },
      filterable: false
    },
  ];

  return (
    <div className="table-container">
      <SortableTable 
        columns={columns} 
        data={daycares}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        paginate={paginate}
        currentPage={currentPage}
        onSort={onSort}
        onFilter={onFilter}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        isServerSorted={isServerSorted}
      />
    </div>
  );
};

export default DaycareTable;