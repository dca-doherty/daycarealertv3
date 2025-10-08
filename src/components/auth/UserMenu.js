import React from 'react';
import { NavDropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaUser, FaSignOutAlt, FaCog, FaBell } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import '../../styles/Auth.css';

const UserMenu = () => {
  const { user, logout } = useAuth();
  const { showNotification } = useNotification();

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      showNotification({
        type: 'success',
        message: 'You have been logged out successfully.'
      });
    } else {
      showNotification({
        type: 'error',
        message: 'Failed to log out. Please try again.'
      });
    }
  };

  return (
    <NavDropdown
      title={
        <span>
          <FaUser className="me-1" />
          {user?.username || 'User'}
        </span>
      }
      id="user-menu-dropdown"
      align="end"
      className="user-menu"
      menuVariant="light"
    >
      <NavDropdown.Item as={Link} to="/profile">
        <FaUser className="me-2" /> My Profile
      </NavDropdown.Item>
      
      <NavDropdown.Item as={Link} to="/alerts">
        <FaBell className="me-2" /> My Alerts
      </NavDropdown.Item>
      
      <NavDropdown.Item as={Link} to="/account">
        <FaCog className="me-2" /> Account Settings
      </NavDropdown.Item>
      
      <NavDropdown.Divider />
      
      <NavDropdown.Item onClick={handleLogout}>
        <FaSignOutAlt className="me-2" /> Logout
      </NavDropdown.Item>
    </NavDropdown>
  );
};

export default UserMenu;