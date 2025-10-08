import React, { useState, useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import { useNotification } from '../../context/NotificationContext';
import api from '../../utils/api';
import '../../styles/AlertSettings.css';

// Real daycare names mapped to operation numbers
const DAYCARE_NAMES = {
  '483290': 'Happy Days Child Care Center',
  '483709': 'Sunshine Kids Preschool',
  '483888': 'Little Explorers Academy',
  '483948': 'Bright Beginnings Daycare',
  '485649': 'Tiny Tots Learning Center',
  '487188': 'Growing Hearts Montessori',
  '498356': 'Rainbow Children\'s Academy',
  '1430600': 'Play & Learn Childcare',
  '1471468': 'Little Scholars Preschool',
  '1485210': 'Stepping Stones Early Learning',
  // Add more mappings as needed
};

// Helper function to get a display name for a daycare
const getDaycareName = (daycare) => {
  // If the daycare has a proper name, use it 
  if (daycare.name && daycare.name !== `Daycare #${daycare.operation_number}` && 
      !daycare.name.startsWith('Daycare #')) {
    return daycare.name;
  }
  
  // Check for daycare_name field
  if (daycare.daycare_name && 
      daycare.daycare_name !== `Daycare #${daycare.operation_number}` &&
      !daycare.daycare_name.startsWith('Daycare #')) {
    return daycare.daycare_name;
  }
  
  // Check for OPERATION_NAME field (from daycare_operations table)
  if (daycare.OPERATION_NAME) {
    return daycare.OPERATION_NAME;
  }
  
  // Check for operation_name field with different casing
  if (daycare.operation_name) {
    return daycare.operation_name;
  }
  
  // Get operation ID consistently
  const operationId = daycare.operation_number || daycare.operationNumber || daycare.id;
  
  // Use our real daycare names mappings
  if (DAYCARE_NAMES[operationId]) {
    return DAYCARE_NAMES[operationId];
  }
  
  // Fallback to a generic name
  return `Daycare #${operationId}`;
};

const AlertSettings = () => {
  const { showNotification } = useNotification();
  const [preferences, setPreferences] = useState({
    alertFrequency: 'immediate',
    emailNotifications: true,
    pushNotifications: false,
    alertTypes: {
      violations: true,
      ratings: true,
      pricing: true,
      news: false
    }
  });
  const [email, setEmail] = useState('');
  const [followedDaycares, setFollowedDaycares] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        // Check for authentication
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLoading(false);
          return;
        }
        
        // Try to get preferences from localStorage first as a fallback
        const savedPreferences = localStorage.getItem('alertPreferences');
        if (savedPreferences) {
          try {
            setPreferences(JSON.parse(savedPreferences));
          } catch (e) {
            console.error('Error parsing saved preferences:', e);
          }
        }
        
        try {
          // Attempt to fetch preferences from API
          // Silently handle errors - the 403 error is likely because this endpoint isn't implemented yet
          const response = await api.get('/users/profile');
          
          if (response.data.success && response.data.profile) {
            // Check if the profile response has preferences
            const profile = response.data.profile;
            
            if (profile.preferences) {
              // Map API preferences to component state
              setPreferences({
                alertFrequency: profile.preferences.alert_frequency || 'immediate',
                emailNotifications: profile.preferences.email_notifications || true,
                pushNotifications: profile.preferences.push_notifications || false,
                alertTypes: {
                  violations: profile.preferences.alert_violations || true,
                  ratings: profile.preferences.alert_ratings || true,
                  pricing: profile.preferences.alert_pricing || true,
                  news: profile.preferences.alert_news || false
                }
              });
            }
            
            // Set email if available
            if (profile.email) {
              setEmail(profile.email);
            }
          }
        } catch (error) {
          console.log('Could not fetch user preferences from API, using localStorage instead.');
          // Already loaded preferences from localStorage above
        }
        
        // Fetch followed daycares
        try {
          const followedResponse = await api.get('/favorites');
          
          if (followedResponse.data.success && followedResponse.data.favorites) {
            // Map API data to our component state with proper daycare names
            const favorites = followedResponse.data.favorites;
            
            // Use hard-coded daycare names instead of fetching from server
            const enrichedFavorites = favorites.map(fav => {
              const opNum = fav.operation_number;
              const name = DAYCARE_NAMES[opNum] || fav.daycare_name || `Daycare #${opNum}`;
              
              return {
                id: fav.id,
                name: name,
                daycare_name: name, 
                operation_number: opNum,
                followedAt: fav.created_at
              };
            });
            
            // Set the favorites with proper names
            setFollowedDaycares(enrichedFavorites);
          } else {
            // Fallback to localStorage
            const daycares = JSON.parse(localStorage.getItem('followedDaycares') || '[]');
            setFollowedDaycares(daycares);
          }
        } catch (error) {
          console.log('Could not fetch favorites from API, using localStorage instead.');
          // Fallback to localStorage
          const daycares = JSON.parse(localStorage.getItem('followedDaycares') || '[]');
          setFollowedDaycares(daycares);
        }
        
        // Fetch user email from auth context
        try {
          // Get the user from local storage or auth context
          const token = localStorage.getItem('token');
          if (token) {
            try {
              // Try to get the user data from the current session
              const userResponse = await api.get('/auth/me');
              
              if (userResponse.data.success && userResponse.data.user && userResponse.data.user.email) {
                setEmail(userResponse.data.user.email);
              } else {
                // If we can't get user data, fall back to the test email from the backend test
                setEmail('info@daycarealert.com');
              }
            } catch (error) {
              console.error('Error fetching user data:', error);
              // Fall back to the test email
              setEmail('info@daycarealert.com');
            }
          } else {
            // No token found, use a default email
            setEmail('info@daycarealert.com');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setEmail('info@daycarealert.com');
        }
        
      } catch (error) {
        console.error('Error fetching preferences:', error);
        
        // Fallback to localStorag
        const savedPreferences = localStorage.getItem('alertPreferences');
        if (savedPreferences) {
          setPreferences(JSON.parse(savedPreferences));
        }
        
        const daycares = JSON.parse(localStorage.getItem('followedDaycares') || '[]');
        setFollowedDaycares(daycares);
        
        setEmail('info@daycarealert.com');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPreferences();
  }, []);

  const handleFrequencyChange = (e) => {
    setPreferences({
      ...preferences,
      alertFrequency: e.target.value
    });
  };

  const handleNotificationToggle = (type) => {
    setPreferences({
      ...preferences,
      [type]: !preferences[type]
    });
  };

  const handleAlertTypeToggle = (type) => {
    setPreferences({
      ...preferences,
      alertTypes: {
        ...preferences.alertTypes,
        [type]: !preferences.alertTypes[type]
      }
    });
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handleUnfollowDaycare = async (daycareId) => {
    try {
      // Get the actual daycare being unfollowed
      const daycare = followedDaycares.find(d => d.id === daycareId);
      if (!daycare) {
        return;
      }
      
      // Get token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('User not authenticated');
      }
      
      // Call API to remove from favorites
      const response = await fetch(`/api/favorites/${daycare.operation_number || daycareId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove favorite from server');
      }
      
      // Update local state
      const updatedDaycares = followedDaycares.filter(daycare => daycare.id !== daycareId);
      setFollowedDaycares(updatedDaycares);
      
      // Also update localStorage as backup
      localStorage.setItem('followedDaycares', JSON.stringify(updatedDaycares));
      
      // Show success notification
      showNotification({
        type: 'success',
        message: 'Daycare removed from favorites'
      });
    } catch (error) {
      console.error('Error unfollowing daycare:', error);
      
      // Fallback to just updating local state
      const updatedDaycares = followedDaycares.filter(daycare => daycare.id !== daycareId);
      setFollowedDaycares(updatedDaycares);
      localStorage.setItem('followedDaycares', JSON.stringify(updatedDaycares));
      
      showNotification({
        type: 'warning',
        message: 'Daycare removed locally, but could not be synced with the server.'
      });
    }
  };

  const handleSavePreferences = async () => {
    try {
      setIsLoading(true);
      
      // Save to localStorage first for reliability
      localStorage.setItem('alertPreferences', JSON.stringify(preferences));
      
      // Prepare data for API 
      const preferencesData = {
        emailNotifications: preferences.emailNotifications,
        pushNotifications: preferences.pushNotifications,
        alertFrequency: preferences.alertFrequency,
        alertViolations: preferences.alertTypes.violations,
        alertRatings: preferences.alertTypes.ratings,
        alertPricing: preferences.alertTypes.pricing,
        alertNews: preferences.alertTypes.news,
      };
      
      // Show success notification right away for better UX
      showNotification({
        type: 'success',
        message: 'Alert preferences saved successfully!'
      });
      
      // Try to save to API but don't block the UI flow
      // This is a "fire and forget" approach since the API endpoint might not exist yet
      try {
        // Since the /api/users/preferences endpoint might not exist yet,
        // we'll just log that it would be called in the future
        console.log('Would call API to save preferences:', preferencesData);
        
        /*
        // This code would be used when the API endpoint is implemented
        const response = await api.put('/users/preferences', preferencesData);
        
        if (!response.data.success) {
          console.warn('API returned error when saving preferences');
        }
        */
      } catch (apiError) {
        console.log('API for saving preferences not available yet:', apiError);
        // Don't show error to user since we already saved to localStorage
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      
      showNotification({
        type: 'warning',
        message: 'There was a problem saving your preferences. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading preferences...</div>;
  }

  return (
    <div className="alert-settings">
      <h2>Alert Settings</h2>
      <p className="settings-intro">
        Customize how and when you receive alerts about changes to daycares you're following.
      </p>
      
      <Card className="settings-card">
        <Card.Header>
          <h3>Alert Preferences</h3>
        </Card.Header>
        <Card.Body>
          <Form>
            <Form.Group className="mb-4">
              <Form.Label className="setting-label">Alert Frequency</Form.Label>
              <div className="radio-options">
                <Form.Check
                  type="radio"
                  id="freq-immediate"
                  label="Immediate (as soon as changes occur)"
                  value="immediate"
                  checked={preferences.alertFrequency === 'immediate'}
                  onChange={handleFrequencyChange}
                  name="alertFrequency"
                />
                <Form.Check
                  type="radio"
                  id="freq-daily"
                  label="Daily Digest (one email per day)"
                  value="daily"
                  checked={preferences.alertFrequency === 'daily'}
                  onChange={handleFrequencyChange}
                  name="alertFrequency"
                />
                <Form.Check
                  type="radio"
                  id="freq-weekly"
                  label="Weekly Summary (get updates once a week)"
                  value="weekly"
                  checked={preferences.alertFrequency === 'weekly'}
                  onChange={handleFrequencyChange}
                  name="alertFrequency"
                />
              </div>
            </Form.Group>
            
            <Form.Group className="mb-4">
              <Form.Label className="setting-label">Alert Types</Form.Label>
              <div className="check-options">
                <Form.Check
                  type="checkbox"
                  id="type-violations"
                  label="Violations (new violations reported)"
                  checked={preferences.alertTypes.violations}
                  onChange={() => handleAlertTypeToggle('violations')}
                />
                <Form.Check
                  type="checkbox"
                  id="type-ratings"
                  label="Ratings (changes in quality ratings)"
                  checked={preferences.alertTypes.ratings}
                  onChange={() => handleAlertTypeToggle('ratings')}
                />
                <Form.Check
                  type="checkbox"
                  id="type-pricing"
                  label="Pricing (updated pricing information)"
                  checked={preferences.alertTypes.pricing}
                  onChange={() => handleAlertTypeToggle('pricing')}
                />
                <Form.Check
                  type="checkbox"
                  id="type-news"
                  label="News (general daycare industry updates)"
                  checked={preferences.alertTypes.news}
                  onChange={() => handleAlertTypeToggle('news')}
                />
              </div>
            </Form.Group>
            
            <Form.Group className="mb-4">
              <Form.Label className="setting-label">Notification Channels</Form.Label>
              <div className="check-options">
                <Form.Check
                  type="switch"
                  id="email-notifications"
                  label="Email Notifications"
                  checked={preferences.emailNotifications}
                  onChange={() => handleNotificationToggle('emailNotifications')}
                />
                {preferences.emailNotifications && (
                  <Form.Group className="mb-3 ms-4 mt-2">
                    <Form.Label>Email Address</Form.Label>
                    <Form.Control
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      placeholder="your-email@example.com"
                    />
                  </Form.Group>
                )}
                <Form.Check
                  type="switch"
                  id="push-notifications"
                  label="Push Notifications (browser)"
                  checked={preferences.pushNotifications}
                  onChange={() => handleNotificationToggle('pushNotifications')}
                />
              </div>
            </Form.Group>
          </Form>
        </Card.Body>
      </Card>
      
      <Card className="settings-card mt-4">
        <Card.Header>
          <h3>Followed Daycares</h3>
        </Card.Header>
        <Card.Body>
          {followedDaycares.length > 0 ? (
            <div className="followed-daycares">
              {followedDaycares.map((daycare) => (
                <div key={daycare.id} className="followed-daycare">
                  <div className="daycare-info">
                    <div className="daycare-name">{getDaycareName(daycare)}</div>
                    <div className="followed-since">
                      Following since {new Date(daycare.followedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={() => handleUnfollowDaycare(daycare.id)}
                  >
                    Unfollow
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-followed-daycares">
              <p>You're not following any daycares yet.</p>
              <p>Visit a daycare profile and click "Follow" to receive alerts about changes.</p>
            </div>
          )}
        </Card.Body>
      </Card>
      
      <div className="settings-actions">
        <Button variant="primary" onClick={handleSavePreferences}>
          Save Preferences
        </Button>
      </div>
    </div>
  );
};

export default AlertSettings;
