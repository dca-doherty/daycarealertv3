import React, { useState, useEffect, useCallback } from 'react';
import { fetchDaycareData, fetchTotalDaycareCount, fetchFilteredDaycareData } from '../utils/api';
import { DaycareDataView } from '../components';
import '../styles/Violations.css';
import '../styles/ResponsiveDataTable.css';
import violationsImage from '../images/pexels-cottonbro-3661356.jpg';

const Violations = () => {
  const [violations, setViolations] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [cities, setCities] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  const loadViolations = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const filters = {
        searchTerm: searchTerm,
        city: selectedCity
      };
      const data = await fetchFilteredDaycareData(itemsPerPage, offset, filters, sortColumn, sortDirection);
      
      // Ensure we have violation data to display
      const processedData = data.map(daycare => {
        // Add default values for violation fields if they don't exist
        return {
          ...daycare,
          deficiency_high: daycare.deficiency_high || daycare.high_risk_violations || 0,
          deficiency_medium: daycare.deficiency_medium || daycare.medium_risk_violations || 0,
          deficiency_low: daycare.deficiency_low || daycare.low_risk_violations || 0,
          total_inspections: daycare.total_inspections || daycare.total_inspections_2yr || 0,
          total_reports: daycare.total_reports || 0,
          adverse_action: daycare.adverse_action || 'None',
          corrective_action: daycare.corrective_action || 'None'
        };
      });
      
      setViolations(processedData);
      const count = await fetchTotalDaycareCount(filters);
      setTotalItems(count);
    } catch (error) {
      console.error("Error loading violations:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, selectedCity, sortColumn, sortDirection]);

  useEffect(() => {
    loadViolations();
  }, [loadViolations]);

  useEffect(() => {
    const loadCities = async () => {
      const allData = await fetchDaycareData(1000, 0);
      const uniqueCities = [...new Set(allData.map(d => d.city))].filter(Boolean).sort();
      setCities(uniqueCities);
    };
    loadCities();
  }, []);

  // eslint-disable-next-line no-unused-vars
  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  // eslint-disable-next-line no-unused-vars
  const handleCityChange = (city) => {
    setSelectedCity(city);
    setCurrentPage(1);
  };

  const handleSort = (column) => {
    setSortColumn(column);
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    setCurrentPage(1);
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const columns = [
    { 
      key: 'operation_name', 
      label: 'Daycare Name',
      width: '20%',
      render: (value, row) => (
        <div className="cell-content">
          <strong>{value || 'Unknown'}</strong>
          <div className="small-text">{row.city}, {row.address}</div>
        </div>
      )
    },
    { 
      key: 'deficiency_high', 
      label: 'High Risk',
      width: '9%',
      render: (value) => (
        <div className={`violation-count ${parseInt(value) > 0 ? 'high-risk' : ''}`}>
          {value || 0}
        </div>
      )
    },
    { 
      key: 'deficiency_medium', 
      label: 'Medium Risk',
      width: '11%',
      render: (value) => (
        <div className={`violation-count ${parseInt(value) > 0 ? 'medium-risk' : ''}`}>
          {value || 0}
        </div>
      )
    },
    { 
      key: 'deficiency_low', 
      label: 'Low Risk',
      width: '9%',
      render: (value) => (
        <div className={`violation-count ${parseInt(value) > 0 ? 'low-risk' : ''}`}>
          {value || 0}
        </div>
      )
    },
    { 
      key: 'total_inspections', 
      label: 'Inspections',
      width: '10%',
      render: (value) => (
        <div className="inspection-count">
          {value || 0}
        </div>
      )
    },
    { 
      key: 'adverse_action', 
      label: 'Adverse Action',
      width: '15%',
      render: (value) => (
        <div className={`cell-content truncate-text ${value && value !== 'None' ? 'has-action' : ''}`} title={value || 'None'}>
          {value === 'None' || !value ? 'None' : value}
        </div>
      )
    },
    { 
      key: 'corrective_action', 
      label: 'Corrective Action',
      width: '15%',
      render: (value) => (
        <div className={`cell-content truncate-text ${value && value !== 'None' ? 'has-action' : ''}`} title={value || 'None'}>
          {value === 'None' || !value ? 'None' : value}
        </div>
      )
    },
    { 
      key: 'license_issue_date', 
      label: 'Licensed Since',
      width: '11%',
      render: (value) => (
        <div className="date-cell">
          {value ? new Date(value).toLocaleDateString() : 'Unknown'}
        </div>
      )
    },
  ];

  // Handle unified search
  const handleSearchUnified = (term, category, newFilters) => {
    setSearchTerm(term);
    
    if (newFilters) {
      // Clean up filters by removing empty values
      const cleanedFilters = { ...newFilters };
      Object.keys(cleanedFilters).forEach(key => {
        if (cleanedFilters[key] === '') {
          delete cleanedFilters[key];
        }
      });
      
      // Apply city filter if present
      if (cleanedFilters.city) {
        setSelectedCity(cleanedFilters.city);
      }
    }
    
    setCurrentPage(1);
  };

  // Handle filter changes
  const handleFilter = (newFilters) => {
    if (newFilters) {
      // Clean up filters by removing empty values
      const cleanedFilters = { ...newFilters };
      Object.keys(cleanedFilters).forEach(key => {
        if (cleanedFilters[key] === '') {
          delete cleanedFilters[key];
        }
      });
      
      // Apply city filter if present
      if (cleanedFilters.city) {
        setSelectedCity(cleanedFilters.city);
      }
    }
    
    setCurrentPage(1);
  };

  // Render expanded violation details
  const renderExpandedContent = useCallback((violation) => {
    return (
      <div className="expanded-violation-details">
        <div className="violation-summary">
          <h4>Violation Summary</h4>
          <div className="violation-stats">
            <div className="stat-item">
              <span className="stat-label">High Risk:</span>
              <span className={`stat-value ${parseInt(violation.deficiency_high || 0) > 0 ? 'high-risk' : ''}`}>
                {violation.deficiency_high || 0}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Medium Risk:</span>
              <span className={`stat-value ${parseInt(violation.deficiency_medium || 0) > 0 ? 'medium-risk' : ''}`}>
                {violation.deficiency_medium || 0}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Low Risk:</span>
              <span className={`stat-value ${parseInt(violation.deficiency_low || 0) > 0 ? 'low-risk' : ''}`}>
                {violation.deficiency_low || 0}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Inspections:</span>
              <span className="stat-value">{violation.total_inspections || 0}</span>
            </div>
          </div>
        </div>
        
        <div className="action-details">
          <h4>Actions & Resolutions</h4>
          <div className="action-item">
            <span className="action-label">Adverse Action:</span>
            <span className={`action-value ${violation.adverse_action && violation.adverse_action !== 'None' ? 'has-action' : ''}`}>
              {violation.adverse_action === 'None' || !violation.adverse_action ? 'None' : violation.adverse_action}
            </span>
          </div>
          <div className="action-item">
            <span className="action-label">Corrective Action:</span>
            <span className={`action-value ${violation.corrective_action && violation.corrective_action !== 'None' ? 'has-action' : ''}`}>
              {violation.corrective_action === 'None' || !violation.corrective_action ? 'None' : violation.corrective_action}
            </span>
          </div>
        </div>
        
        <div className="daycare-info">
          <h4>Daycare Information</h4>
          <p><strong>Address:</strong> {violation.location_address || violation.address}</p>
          <p><strong>Phone:</strong> {violation.phone || 'Not available'}</p>
          <p><strong>License Issue Date:</strong> {violation.license_issue_date ? new Date(violation.license_issue_date).toLocaleDateString() : 'Unknown'}</p>
        </div>
      </div>
    );
  }, []);

  return (
    <DaycareDataView
      data={violations}
      loading={loading}
      title="Daycare Violations Database"
      subtitle="Access comprehensive information about daycare violations across Texas. Use the search and filter options to find specific daycares or cities."
      onSearch={handleSearchUnified}
      onFilter={handleFilter}
      onSort={handleSort}
      columns={columns}
      itemsPerPage={itemsPerPage}
      currentPage={currentPage}
      totalItems={totalItems}
      paginate={handlePageChange}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      filterOptions={{ city: selectedCity }}
      viewType="violations"
      expandable={true}
      expandedContentRenderer={renderExpandedContent}
      headerImage={violationsImage}
      searchPlaceholder="Search by daycare name, violation type, or city..."
    />
  );
};

export default Violations;