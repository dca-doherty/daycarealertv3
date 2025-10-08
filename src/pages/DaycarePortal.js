import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DaycareLogin from '../components/daycare-portal/DaycareLogin';
import DaycarePortalDashboard from '../components/daycare-portal/DaycarePortalDashboard';
import '../styles/DaycarePortal.css';

const DaycarePortal = () => {
  const { user } = useAuth();
  
  return (
    <div className="daycare-portal-wrapper">
      <Routes>
        <Route 
          path="/" 
          element={user && user.role === 'daycare_provider' ? <Navigate to="/daycare-portal/dashboard" replace /> : <DaycareLogin />} 
        />
        <Route 
          path="/login" 
          element={user && user.role === 'daycare_provider' ? <Navigate to="/daycare-portal/dashboard" replace /> : <DaycareLogin />} 
        />
        <Route 
          path="/dashboard" 
          element={
            user && user.role === 'daycare_provider' ? 
            <DaycarePortalDashboard /> : 
            <Navigate to="/daycare-portal/login" replace />
          } 
        />
        <Route path="*" element={<Navigate to="/daycare-portal" replace />} />
      </Routes>
    </div>
  );
};

export default DaycarePortal;
