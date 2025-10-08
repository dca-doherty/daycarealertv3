import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Tab, Tabs } from 'react-bootstrap';
import { FaExclamationTriangle, FaBell, FaBellSlash, FaCheck, FaStream } from 'react-icons/fa';
import AlertSettings from '../components/alerts/AlertSettings';
import PageHeader from '../components/PageHeader';
import headerImage from '../images/pexels-cottonbro-3661356.jpg';
import '../styles/Alerts.css';
import { API_URL } from '../config';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('alerts');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch real alerts from backend API
    const fetchUserAlerts = async () => {
      try {
        setIsLoading(true);
        
        // Check if user is authenticated
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('User not authenticated, showing sample alerts');
          loadSampleAlerts();
          return;
        }
        
        // Try to fetch from the backend API
        try {
          // Get notifications from API
          // Try to use the alerts endpoint, since notifications endpoint might not exist yet
          const response = await fetch(`${API_URL}/alerts`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.alerts)) {
              // Transform API data to match our alert structure
              const apiAlerts = data.alerts.map(alert => ({
                id: alert.id.toString(),
                type: alert.alert_type || 'update',
                daycareId: alert.operation_number,
                daycareName: 'Daycare ' + alert.operation_number, // Fetch daycare name in a production app
                message: `Alert for ${alert.alert_type} changes`,
                date: new Date(alert.created_at || alert.updated_at || Date.now()),
                read: false, // The API doesn't have read status yet
                details: {}
              }));
              
              setAlerts(apiAlerts);
              setIsLoading(false);
              return;
            }
          }
          
          // If API fails or returns unexpected data, show sample alerts
          console.log('API returned invalid data, showing sample alerts');
          loadSampleAlerts();
          
        } catch (apiError) {
          console.error('Error fetching from API:', apiError);
          loadSampleAlerts();
        }
      } catch (error) {
        console.error('Error in fetchUserAlerts:', error);
        loadSampleAlerts();
      }
    };
    
    // Fallback function to load sample alerts
    const loadSampleAlerts = () => {
      // Sample data for demo purposes
      const sampleAlerts = [
        {
          id: '1',
          type: 'violation',
          daycareId: '123456',
          daycareName: 'Happy Kids Daycare',
          message: 'New violation reported for Happy Kids Daycare',
          date: new Date(),
          read: false,
          details: {
            violationType: 'Safety',
            riskLevel: 'Medium',
            description: 'Playground equipment maintenance issue'
          }
        },
        {
          id: '2',
          type: 'inspection',
          daycareId: '789012',
          daycareName: 'Sunshine Learning Center',
          message: 'New inspection scheduled for Sunshine Learning Center',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000),
          read: true,
          details: {
            inspectionType: 'Annual',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        },
        {
          id: '3',
          type: 'rating_change',
          daycareId: '345678',
          daycareName: 'Little Explorers Preschool',
          message: 'Rating changed for Little Explorers Preschool',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          read: false,
          details: {
            oldRating: 3,
            newRating: 4
          }
        }
      ];
      
      setAlerts(sampleAlerts);
      setIsLoading(false);
    };

    fetchUserAlerts();
  }, []);
  
  // Helper function to generate alert messages
  const getAlertIcon = (type) => {
    switch (type) {
      case 'violation':
        return <FaExclamationTriangle className="alert-icon violation" />;
      case 'rating':
        return <FaCheck className="alert-icon rating" />;
      case 'pricing':
        return <FaStream className="alert-icon pricing" />;
      case 'news':
        return <FaBell className="alert-icon news" />;
      default:
        return <FaBell className="alert-icon" />;
    }
  };

  // Filter alerts by read/unread status
  const unreadAlerts = alerts.filter(alert => !alert.read);
  const readAlerts = alerts.filter(alert => alert.read);

  const markAsRead = async (alertId) => {
    // Update local state immediately for better UX
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, read: true } : alert
    ));
    
    // Try to update on backend if we have a token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Use the alerts API that exists instead of notifications API
        const response = await fetch(`${API_URL}/alerts/${alertId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ is_read: true })
        });
        
        if (!response.ok) {
          console.warn('Failed to mark notification as read on server');
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  const markAllAsRead = async () => {
    // Update local state immediately for better UX
    setAlerts(alerts.map(alert => ({ ...alert, read: true })));
    
    // Try to update on backend if we have a token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // This endpoint might not exist, but we'll try something similar
        const response = await fetch(`${API_URL}/alerts/mark-all-read`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.warn('Failed to mark all notifications as read on server');
        }
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
      }
    }
  };

  const deleteAlert = async (alertId) => {
    // Update local state immediately for better UX
    setAlerts(alerts.filter(alert => alert.id !== alertId));
    
    // Try to delete on backend if we have a token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Use the alerts API endpoint
        const response = await fetch(`${API_URL}/alerts/${alertId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          console.warn('Failed to delete notification on server');
        }
      } catch (error) {
        console.error('Error deleting notification:', error);
      }
    }
  };

  const getAlertBadge = (type) => {
    switch (type) {
      case 'violation':
        return <Badge bg="danger">Violation</Badge>;
      case 'rating':
        return <Badge bg="success">Rating</Badge>;
      case 'pricing':
        return <Badge bg="warning" text="dark">Pricing</Badge>;
      case 'news':
        return <Badge bg="info">News</Badge>;
      default:
        return <Badge bg="secondary">Update</Badge>;
    }
  };

  const renderAlertItem = (alert) => (
    <Card key={alert.id} className={`alert-item ${alert.read ? 'read' : 'unread'}`}>
      <Card.Body>
        <div className="alert-header">
          {getAlertIcon(alert.type)}
          <div className="alert-meta">
            {getAlertBadge(alert.type)}
            <div className="alert-time">{alert.date.toLocaleDateString()}</div>
          </div>
        </div>
        
        <div className="alert-content">
          {alert.daycareName && (
            <div className="alert-source">{alert.daycareName}</div>
          )}
          <div className="alert-message">{alert.message}</div>
        </div>
        
        <div className="alert-actions">
          {!alert.read && (
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={() => markAsRead(alert.id)}
            >
              Mark as Read
            </Button>
          )}
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={() => deleteAlert(alert.id)}
          >
            Delete
          </Button>
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <div className="alerts-page">
      <PageHeader title="Alerts & Notification Settings" backgroundImage={headerImage} />
      <Container>
        <Row className="justify-content-center">
          <Col md={10}>
            <Tabs 
              activeKey={activeTab} 
              onSelect={k => setActiveTab(k)}
              className="mb-4"
            >
              <Tab eventKey="alerts" title="Your Alerts">
                <div className="alerts-tab-content">
                  {isLoading ? (
                    <div className="loading-alerts">Loading alerts...</div>
                  ) : (
                    <>
                      <div className="alerts-header">
                        <h3>Alerts & Notifications</h3>
                        {unreadAlerts.length > 0 && (
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={markAllAsRead}
                          >
                            Mark All as Read
                          </Button>
                        )}
                      </div>
                      
                      {unreadAlerts.length > 0 ? (
                        <div className="unread-alerts">
                          <h4>Unread Alerts ({unreadAlerts.length})</h4>
                          <div className="alerts-list">
                            {unreadAlerts.map(renderAlertItem)}
                          </div>
                        </div>
                      ) : (
                        <div className="no-unread-alerts">
                          <FaBellSlash className="empty-icon" />
                          <p>You're all caught up! No unread alerts.</p>
                        </div>
                      )}
                      
                      {readAlerts.length > 0 && (
                        <div className="read-alerts mt-4">
                          <h4>Previous Alerts ({readAlerts.length})</h4>
                          <div className="alerts-list">
                            {readAlerts.map(renderAlertItem)}
                          </div>
                        </div>
                      )}
                      
                      {alerts.length === 0 && (
                        <div className="no-alerts">
                          <FaBellSlash className="empty-icon" />
                          <p>You don't have any alerts yet.</p>
                          <p>Follow daycares to receive updates about changes.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Tab>
              <Tab eventKey="settings" title="Alert Settings">
                <AlertSettings />
              </Tab>
            </Tabs>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Alerts;
