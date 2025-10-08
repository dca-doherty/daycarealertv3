import React, { useState, useEffect } from 'react';
import '../styles/TableEnhancements.css';

// Types of notifications
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  INFO: 'info'
};

// NotificationContext to manage notifications across the app
export const NotificationContext = React.createContext({
  addNotification: () => {},
  removeNotification: () => {},
  notifications: []
});

// Individual notification component
export const Notification = ({ notification, onClose }) => {
  useEffect(() => {
    // Auto-dismiss after the duration
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, notification.duration);
    
    return () => clearTimeout(timer);
  }, [notification, onClose]);
  
  // Get the appropriate icon based on notification type
  const getIcon = () => {
    switch (notification.type) {
      case NOTIFICATION_TYPES.SUCCESS:
        return '✓';
      case NOTIFICATION_TYPES.WARNING:
        return '⚠';
      case NOTIFICATION_TYPES.ERROR:
        return '✗';
      default:
        return 'ℹ';
    }
  };
  
  return (
    <div className={`notification ${notification.type}`}>
      <div className="notification-icon">{getIcon()}</div>
      <div className="notification-content">
        <div className="notification-title">{notification.title}</div>
        <div className="notification-message">{notification.message}</div>
      </div>
      <button 
        className="notification-close" 
        onClick={() => onClose(notification.id)}
      >
        ×
      </button>
    </div>
  );
};

// NotificationProvider component to wrap the app
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  
  // Add a new notification
  const addNotification = (notification) => {
    const id = Date.now().toString();
    setNotifications(prev => [
      ...prev,
      {
        id,
        type: NOTIFICATION_TYPES.INFO,
        duration: 5000, // Default 5 seconds
        ...notification
      }
    ]);
    return id;
  };
  
  // Remove a notification by id
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };
  
  const value = {
    notifications,
    addNotification,
    removeNotification
  };
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="notification-container">
        {notifications.map(notification => (
          <Notification 
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

// Hook to use notifications
export const useNotification = () => {
  const context = React.useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationProvider;