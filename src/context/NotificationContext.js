import React, { createContext, useContext, useState, useEffect } from 'react';
import '../styles/Notification.css';

const NotificationContext = createContext({
  showNotification: () => {},
  dismissNotification: () => {}
});

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    console.error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = ({ type = 'info', message, duration = 5000 }) => {
    console.log('showNotification called with:', { type, message, duration });
    
    // Skip showing notification if message is empty or undefined
    if (!message || message.trim() === '') {
      console.warn('Empty notification message not displayed');
      return 'empty-notification';
    }
    
    const id = Date.now().toString();
    console.log('Generated notification ID:', id);
    
    // Directly set the notification instead of using timeouts
    const newNotification = { id, type, message, duration };
    console.log('Setting notification immediately:', newNotification);
    
    // Replace any existing notifications instead of adding to them
    setNotifications([newNotification]);
    
    // Auto dismiss notification after duration
    if (duration !== 0) {
      setTimeout(() => {
        console.log('Auto-dismissing notification:', id);
        dismissNotification(id);
      }, duration);
    }
    
    return id;
  };

  const dismissNotification = (id) => {
    setNotifications(prevNotifications => 
      prevNotifications
        .map(notification => 
          notification.id === id 
            ? { ...notification, dismissed: true } 
            : notification
        )
    );

    // Remove from state after dismiss animation completes
    setTimeout(() => {
      setNotifications(prevNotifications => 
        prevNotifications.filter(notification => notification.id !== id)
      );
    }, 300); // Match the CSS transition duration
  };

  console.log('Current notifications state:', notifications);

  // Force re-render to make sure notifications are shown
  useEffect(() => {
    if (notifications.length > 0) {
      console.log('Notifications present, ensuring they are visible');
      const container = document.querySelector('.notification-container');
      if (container) {
        container.style.display = 'flex';
      }
    }
  }, [notifications]);

  return (
    <NotificationContext.Provider value={{ showNotification, dismissNotification }}>
      {children}
      
      <div className="notification-container" style={{ display: notifications.length > 0 ? 'flex' : 'none' }}>
        {notifications.map(notification => {
          console.log('Rendering notification:', notification);
          if (!notification.message || notification.message.trim() === '') {
            return null;
          }
          
          // Set CSS variable for background color
          const bgColor = notification.type === 'success' 
            ? '#28a745' 
            : notification.type === 'error' 
              ? '#dc3545'
              : notification.type === 'warning'
                ? '#ffc107'
                : '#17a2b8';
                
          return (
            <div 
              key={notification.id}
              className={`notification notification-${notification.type} ${notification.dismissed ? 'dismissed' : ''}`}
              style={{ 
                zIndex: 9999, 
                '--notification-bg-color': bgColor 
              }}
            >
              <div className="notification-content" style={{
                color: 'white', 
                wordBreak: 'break-word', 
                fontSize: '16px', 
                padding: '10px',
                fontWeight: 'bold'
              }}>
                {notification.message}
              </div>
              <button 
                className="notification-dismiss" 
                onClick={() => dismissNotification(notification.id)}
                aria-label="Dismiss notification"
                style={{
                  background: 'none', 
                  border: 'none', 
                  color: 'white', 
                  fontSize: '24px', 
                  cursor: 'pointer',
                  padding: '5px'
                }}
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;