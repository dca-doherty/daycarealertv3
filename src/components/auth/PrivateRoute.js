import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
// import { Modal, Button } from 'react-bootstrap';

const PrivateRoute = ({ children, adminRequired = false }) => {
  const { isAuthenticated, loading, user, showAuthModal } = useAuth();
  const location = useLocation();

  // Effect to show auth modal when not authenticated
  useEffect(() => {
    if (!isAuthenticated() && !loading) {
      // Show registration message and open auth modal
      const message = "You need to register or log in to access this page.";
      alert(message); // Simple alert for immediate feedback

      // Open the auth modal
      if (showAuthModal) {
        showAuthModal();
      }
    }
  }, [isAuthenticated, loading, showAuthModal]);

  // Show loading state
  if (loading) {
    return <div>Loading...</div>;
  }

  // Redirect to home if not authenticated
  if (!isAuthenticated()) {
    // Save the current location to redirect back after login
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check if user is admin when required
  if (adminRequired && (!user || user.role !== 'admin')) {
    // Redirect to home if user doesn't have admin access
    return <Navigate to="/home" replace />;
  }

  // Render the protected component
  return children;
};

export default PrivateRoute;
