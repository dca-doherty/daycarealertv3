// Data source selector is disabled as we're only using MySQL data
// import React from 'react';
// import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/DataSourceSelector.css';

const DataSourceSelector = (/* { currentSource } */) => {
  // const navigate = useNavigate();
  // const location = useLocation();
  
  // const handleSourceChange = (source) => {
    // Don't navigate if we're already on the selected source
    if (source === currentSource) return;
    
    // Determine the route based on the selected source and current path
    let route = '/';
    const path = location.pathname;
    
    if (source === 'MySQL') {
      route = '/mysql';
      
      // Handle special paths
      if (path.includes('/optimized/pricing')) {
        route = '/mysql/pricing';
      } else if (path.includes('/optimized/violations')) {
        route = '/mysql/violations';
      }
    } else if (source === 'OptimizedMySQL') {
      route = '/optimized';
      
      // Handle special paths
      if (path.includes('/mysql/pricing') || path === '/pricing') {
        route = '/optimized/pricing';
      } else if (path.includes('/mysql/violations') || path === '/violations') {
        route = '/optimized/violations';
      }
    } else {
      // API source (default route)
      
      // Handle special paths
      if (path.includes('/mysql/pricing') || path.includes('/optimized/pricing')) {
        route = '/pricing';
      } else if (path.includes('/mysql/violations') || path.includes('/optimized/violations')) {
        route = '/violations';
      }
    }
    
    // Preserve any query parameters when changing data source
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.toString()) {
      route += `?${queryParams.toString()}`;
    }
    
    // Navigate to the selected source
    // navigate(route);
  // };
  
  // Don't show the source selector, always use MySQL data
  return null;
};

export default DataSourceSelector;