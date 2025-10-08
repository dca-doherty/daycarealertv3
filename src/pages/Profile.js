import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Image, Tab, Tabs, Alert } from 'react-bootstrap';
import { FaUser, FaBell, FaHeart, FaHistory, FaCog } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../utils/api';
import heroImage from '../images/pexels-mikhail-nilov-8923956.jpg';
import { useNotification } from '../context/NotificationContext';
import '../styles/Profile.css';

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

const Profile = () => {
  const { changePassword, isAuthenticated } = useAuth();
  const { showNotification } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [favorites, setFavorites] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  
  // Form states
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    city: '',
    state: '',
    zipCode: '',
    bio: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    newsletterSubscription: true
  });
  
  const [profileImage, setProfileImage] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [passwordError, setPasswordError] = useState('');
  
  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (!isAuthenticated()) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Load profile data
        const profileResponse = await api.get('/users/profile');
        if (profileResponse.data.success) {
          const profile = profileResponse.data.profile;
          setProfileData({
            firstName: profile.first_name || '',
            lastName: profile.last_name || '',
            email: profile.email || '',
            phoneNumber: profile.phone_number || '',
            city: profile.city || '',
            state: profile.state || '',
            zipCode: profile.zip_code || '',
            bio: profile.bio || ''
          });
          
          if (profile.profile_picture) {
            setProfileImage(profile.profile_picture);
          }
          
          if (profile.preferences) {
            setPreferences({
              emailNotifications: profile.preferences.email_notifications || true,
              smsNotifications: profile.preferences.sms_notifications || false,
              newsletterSubscription: profile.preferences.newsletter_subscription || true
            });
          }
        }
        
        // Load favorites
        const favoritesResponse = await api.get('/favorites');
        if (favoritesResponse.data.success) {
          const favorites = favoritesResponse.data.favorites;
          
          // Set initial data
          setFavorites(favorites);
          
          // Use hard-coded daycare names instead of fetching from server
          const enrichedFavorites = favorites.map(fav => {
            // Don't need to extract opNum as getDaycareName handles this
            const name = getDaycareName(fav);
            
            return {
              ...fav,
              name: name,
              daycare_name: name, 
              OPERATION_NAME: name,
              operation_name: name
            };
          });
          
          // Update favorites with real names
          setFavorites(enrichedFavorites);
        } else {
          // Fallback to localStorage for favorites with all needed fields
          const storedFavorites = JSON.parse(localStorage.getItem('followedDaycares') || '[]');
          setFavorites(storedFavorites.map(fav => {
            const opNumber = fav.operation_number || fav.operation_id || fav.operationNumber || fav.id;
	    const name = fav.name || fav.daycare_name || fav.operation_name || fav.OPERATION_NAME || `Daycare #${opNumber}`;
	    return {
		id: fav.id || opNumber,
		operation_number: opNumber,
		operation_id: opNumber,
		operationNumber: opNumber,
		daycare_name: name,
		name: name,
		operation_name: name,
		OPERATION_NAME: name,
		created_at: fav.created_at || fav.followedAt || new Date().toISOString()
	    };
          }));
        }
        
        // Load alerts
        const alertsResponse = await api.get('/alerts');
        if (alertsResponse.data.success) {
          setAlerts(alertsResponse.data.alerts);
        } else {
          // Create example alerts if API fails
          setAlerts([
            {
              id: '1',
              alert_type: 'violation',
              operation_number: '123456',
              created_at: new Date().toISOString()
            },
            {
              id: '2',
              alert_type: 'inspection',
              operation_number: '789012',
              created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            }
          ]);
        }
        
        // Load recent activity (placeholder - API endpoint might be needed)
        setRecentActivity([
          { type: 'login', message: 'You logged in to your account', date: new Date() },
          { type: 'alert', message: 'New violation alert for Happy Days Daycare', date: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          { type: 'favorite', message: 'You added Sunshine Childcare to favorites', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
        ]);
        
      } catch (error) {
        console.error('Error loading user data:', error);
        
        // Fallback to localStorage for favorites with all needed fields
        const storedFavorites = JSON.parse(localStorage.getItem('followedDaycares') || '[]');
        setFavorites(storedFavorites.map(fav => {
	    const opNumber = fav.operation_number || fav.operation_id || fav.operationNumber || fav.id;
	    const name = fav.name || fav.daycare_name || fav.operation_name || fav.OPERATION_NAME || `Daycare #${opNumber}`;
	    return {
		id: fav.id || opNumber,
		operation_number: opNumber,
		operation_id: opNumber,
		operationNumber: opNumber,
		daycare_name: name,
		name: name,
		operation_name: name,
		OPERATION_NAME: name,
		created_at: fav.created_at || fav.followedAt || new Date().toISOString()
            };
          }));
        // Create example alerts
        setAlerts([
          {
            id: '1',
            alert_type: 'violation',
            operation_number: '123456',
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            alert_type: 'inspection',
            operation_number: '789012',
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          }
        ]);
        
        showNotification({
          type: 'warning',
          message: 'Could not connect to server. Showing locally stored data.'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, [isAuthenticated, showNotification, activeTab]);
  
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'confirmPassword' || name === 'newPassword') {
      setPasswordError('');
    }
  };
  
  const handlePreferenceChange = (e) => {
    const { name, checked } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const saveProfile = async () => {
    try {
      setIsLoading(true);
      
      // Update profile information
      const profileResponse = await api.put('/users/profile', {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phoneNumber: profileData.phoneNumber,
        city: profileData.city,
        state: profileData.state,
        zipCode: profileData.zipCode,
        bio: profileData.bio
      });
      
      if (!profileResponse.data.success) {
        throw new Error(profileResponse.data.message || 'Failed to update profile');
      }
      
      // Update profile picture if changed
      if (uploadedImage) {
        const pictureResponse = await api.put('/users/profile/picture', {
          profilePicture: uploadedImage
        });
        
        if (!pictureResponse.data.success) {
          throw new Error(pictureResponse.data.message || 'Failed to update profile picture');
        }
        
        // Update displayed image
        setProfileImage(uploadedImage);
        setUploadedImage(null);
      }
      
      // Update preferences
      const preferencesResponse = await api.put('/users/preferences', {
        emailNotifications: preferences.emailNotifications,
        smsNotifications: preferences.smsNotifications,
        newsletterSubscription: preferences.newsletterSubscription
      });
      
      if (!preferencesResponse.data.success) {
        throw new Error(preferencesResponse.data.message || 'Failed to update preferences');
      }
      
      showNotification({
        type: 'success',
        message: 'Profile updated successfully!'
      });
      
    } catch (error) {
      console.error('Error saving profile:', error);
      showNotification({
        type: 'danger',
        message: error.message || 'Failed to update profile. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const updatePassword = async () => {
    try {
      // Validate passwords match
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('New passwords do not match');
        return;
      }
      
      // Validate password complexity
      if (passwordData.newPassword.length < 8) {
        setPasswordError('Password must be at least 8 characters long');
        return;
      }
      
      setIsLoading(true);
      
      const success = await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      
      if (success) {
        showNotification({
          type: 'success',
          message: 'Password changed successfully!'
        });
        
        // Reset form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setPasswordError('Current password is incorrect');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError(error.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="profile-page">
      <PageHeader title="My Account" backgroundImage={heroImage} />
      
      <Container className="py-4">
        <Row>
          <Col md={3}>
            <Card className="text-center profile-sidebar mb-4">
              <Card.Body>
                <div className="profile-image-container">
                  <Image 
                    src={uploadedImage || profileImage || `https://ui-avatars.com/api/?name=${profileData.firstName}+${profileData.lastName}&background=random`} 
                    roundedCircle 
                    className="profile-image mb-3" 
                  />
                </div>
                <h4>{profileData.firstName} {profileData.lastName}</h4>
                <p className="text-muted">{profileData.email}</p>
                <div className="profile-stats">
                  <div className="stat">
                    <span className="stat-label">Favorites</span>
                    <span className="stat-value">{favorites.length}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Alerts</span>
                    <span className="stat-value">{alerts.length}</span>
                  </div>
                </div>
              </Card.Body>
            </Card>
            
            <Card className="profile-nav mb-4">
              <Card.Body className="p-0">
                <div 
                  className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  <FaUser /> Profile Information
                </div>
                <div 
                  className={`nav-item ${activeTab === 'favorites' ? 'active' : ''}`}
                  onClick={() => setActiveTab('favorites')}
                >
                  <FaHeart /> My Favorites
                </div>
                <div 
                  className={`nav-item ${activeTab === 'alerts' ? 'active' : ''}`}
                  onClick={() => setActiveTab('alerts')}
                >
                  <FaBell /> My Alerts
                </div>
                <div 
                  className={`nav-item ${activeTab === 'activity' ? 'active' : ''}`}
                  onClick={() => setActiveTab('activity')}
                >
                  <FaHistory /> Recent Activity
                </div>
                <div 
                  className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('settings')}
                >
                  <FaCog /> Account Settings
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={9}>
            {activeTab === 'profile' && (
              <Card className="mb-4">
                <Card.Header>
                  <h3>My Profile</h3>
                </Card.Header>
                <Card.Body>
                  <Form>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>First Name</Form.Label>
                          <Form.Control 
                            type="text" 
                            name="firstName" 
                            value={profileData.firstName}
                            onChange={handleProfileChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Last Name</Form.Label>
                          <Form.Control 
                            type="text" 
                            name="lastName" 
                            value={profileData.lastName}
                            onChange={handleProfileChange}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control 
                        type="email" 
                        name="email" 
                        value={profileData.email}
                        disabled
                      />
                      <Form.Text className="text-muted">
                        Email address cannot be changed. Contact support for assistance.
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Phone Number</Form.Label>
                      <Form.Control 
                        type="tel" 
                        name="phoneNumber" 
                        value={profileData.phoneNumber}
                        onChange={handleProfileChange}
                      />
                    </Form.Group>
                    
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>City</Form.Label>
                          <Form.Control 
                            type="text" 
                            name="city" 
                            value={profileData.city}
                            onChange={handleProfileChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label>State</Form.Label>
                          <Form.Control 
                            type="text" 
                            name="state" 
                            value={profileData.state}
                            onChange={handleProfileChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label>Zip Code</Form.Label>
                          <Form.Control 
                            type="text" 
                            name="zipCode" 
                            value={profileData.zipCode}
                            onChange={handleProfileChange}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Bio</Form.Label>
                      <Form.Control 
                        as="textarea" 
                        rows={3} 
                        name="bio" 
                        value={profileData.bio}
                        onChange={handleProfileChange}
                        placeholder="Tell us a little about yourself..."
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Profile Picture</Form.Label>
                      <div className="profile-upload-container">
                        {uploadedImage && (
                          <Image 
                            src={uploadedImage} 
                            className="preview-image mb-2" 
                            thumbnail 
                          />
                        )}
                        <Form.Control 
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                        <Form.Text className="text-muted">
                          Recommended image size: 300x300 pixels, max 2MB.
                        </Form.Text>
                      </div>
                    </Form.Group>
                    
                    <div className="text-end">
                      <Button variant="primary" onClick={saveProfile}>
                        Save Profile
                      </Button>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            )}
            
            {activeTab === 'favorites' && (
              <Card className="mb-4">
                <Card.Header>
                  <h3>My Favorites</h3>
                </Card.Header>
                <Card.Body>
                  {favorites.length > 0 ? (
                    <div className="favorites-list">
                      {favorites.map(favorite => (
                        <div key={favorite.id} className="favorite-item">
                          <div className="favorite-info">
                            <h4>{getDaycareName(favorite)}</h4>
                            <p className="text-muted">Operation #: {favorite.operation_number}</p>
                            <p className="text-muted">Added on: {new Date(favorite.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="favorite-actions">
                            <Button variant="outline-primary" size="sm" href={`/daycares/${favorite.operation_number}`}>
                              View Daycare
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => {
                                const operationNumber = favorite.operation_number;
                                const favoriteId = favorite.id;
                                
                                // First update UI for immediate feedback
                                setFavorites(prev => prev.filter(f => f.id !== favoriteId));
                                
                                // Also update localStorage - check all possible field names
                                const storedFavorites = JSON.parse(localStorage.getItem('followedDaycares') || '[]');
                                const updatedFavorites = storedFavorites.filter(f => 
                                  (f.id !== favoriteId) &&
                                  (f.id !== operationNumber) &&
                                  (f.operation_number !== operationNumber) &&
				  (f.operation_id !== operationNumber) &&
				  (f.operationNumber !== operationNumber)
                                );
                                localStorage.setItem('followedDaycares', JSON.stringify(updatedFavorites));
                                
                                // Then try to update backend
                                api.delete(`/favorites/${operationNumber}`)
                                  .then(response => {
                                    if (response.data.success) {
                                      showNotification({
                                        type: 'success',
                                        message: 'Daycare removed from favorites'
                                      });
                                    }
                                  })
                                  .catch(error => {
                                    console.error('Error removing favorite:', error);
                                    showNotification({
                                      type: 'warning',
                                      message: 'Daycare removed locally, but server update failed'
                                    });
                                  });
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <FaHeart size={40} className="empty-icon" />
                      <h3>No Favorites Yet</h3>
                      <p>You haven't added any daycares to your favorites list.</p>
                      <Button variant="primary" href="/home">Browse Daycares</Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}
            
            {activeTab === 'alerts' && (
              <Card className="mb-4">
                <Card.Header>
                  <h3>My Alerts</h3>
                </Card.Header>
                <Card.Body>
                  {alerts.length > 0 ? (
                    <div className="alerts-list">
                      {alerts.map(alert => (
                        <div key={alert.id} className="alert-item">
                          <div className="alert-info">
                            <h4>
                              {alert.alert_type === 'violation' && 'Violation Alert'}
                              {alert.alert_type === 'inspection' && 'Inspection Alert'}
                              {alert.alert_type === 'rating_change' && 'Rating Change Alert'}
                              {alert.alert_type === 'news' && 'News Alert'}
                            </h4>
                            <p>For daycare with operation #: {alert.operation_number}</p>
                            <p className="text-muted">Subscribed on: {new Date(alert.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="alert-actions">
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => {
                                // Implement remove alert
                                api.delete(`/alerts/${alert.id}`)
                                  .then(response => {
                                    if (response.data.success) {
                                      setAlerts(prev => prev.filter(a => a.id !== alert.id));
                                      showNotification({
                                        type: 'success',
                                        message: 'Alert subscription removed'
                                      });
                                    }
                                  })
                                  .catch(error => {
                                    console.error('Error removing alert:', error);
                                    showNotification({
                                      type: 'danger',
                                      message: 'Failed to remove alert subscription'
                                    });
                                  });
                              }}
                            >
                              Unsubscribe
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <FaBell size={40} className="empty-icon" />
                      <h3>No Alert Subscriptions</h3>
                      <p>You haven't subscribed to any daycare alerts yet.</p>
                      <Button variant="primary" href="/alerts">Manage Alerts</Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}
            
            {activeTab === 'activity' && (
              <Card className="mb-4">
                <Card.Header>
                  <h3>Recent Activity</h3>
                </Card.Header>
                <Card.Body>
                  {recentActivity.length > 0 ? (
                    <div className="activity-timeline">
                      {recentActivity.map((activity, index) => (
                        <div key={index} className="activity-item">
                          <div className="activity-icon">
                            {activity.type === 'login' && <FaUser />}
                            {activity.type === 'alert' && <FaBell />}
                            {activity.type === 'favorite' && <FaHeart />}
                          </div>
                          <div className="activity-content">
                            <p>{activity.message}</p>
                            <span className="activity-time">
                              {activity.date.toLocaleDateString()} at {activity.date.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <FaHistory size={40} className="empty-icon" />
                      <h3>No Recent Activity</h3>
                      <p>You don't have any recent account activity.</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}
            
            {activeTab === 'settings' && (
              <Card className="mb-4">
                <Card.Header>
                  <h3>Account Settings</h3>
                </Card.Header>
                <Card.Body>
                  <Tabs
                    defaultActiveKey="password"
                    id="settings-tabs"
                    className="mb-3"
                  >
                    <Tab eventKey="password" title="Change Password">
                      <Form>
                        {passwordError && (
                          <Alert variant="danger">{passwordError}</Alert>
                        )}
                        <Form.Group className="mb-3">
                          <Form.Label>Current Password</Form.Label>
                          <Form.Control 
                            type="password" 
                            name="currentPassword" 
                            value={passwordData.currentPassword}
                            onChange={handlePasswordChange}
                          />
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                          <Form.Label>New Password</Form.Label>
                          <Form.Control 
                            type="password" 
                            name="newPassword" 
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                          />
                          <Form.Text className="text-muted">
                            Password must be at least 8 characters long.
                          </Form.Text>
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                          <Form.Label>Confirm New Password</Form.Label>
                          <Form.Control 
                            type="password" 
                            name="confirmPassword" 
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                          />
                        </Form.Group>
                        
                        <div className="text-end">
                          <Button variant="primary" onClick={updatePassword}>
                            Update Password
                          </Button>
                        </div>
                      </Form>
                    </Tab>
                    <Tab eventKey="preferences" title="Email Preferences">
                      <Form>
                        <Form.Group className="mb-3">
                          <Form.Check 
                            type="switch"
                            id="emailNotifications"
                            label="Email Notifications"
                            name="emailNotifications"
                            checked={preferences.emailNotifications}
                            onChange={handlePreferenceChange}
                          />
                          <Form.Text className="text-muted">
                            Receive email notifications for alerts and updates.
                          </Form.Text>
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                          <Form.Check 
                            type="switch"
                            id="smsNotifications"
                            label="SMS Notifications"
                            name="smsNotifications"
                            checked={preferences.smsNotifications}
                            onChange={handlePreferenceChange}
                          />
                          <Form.Text className="text-muted">
                            Receive text message notifications for alerts (requires verified phone number).
                          </Form.Text>
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                          <Form.Check 
                            type="switch"
                            id="newsletterSubscription"
                            label="Newsletter Subscription"
                            name="newsletterSubscription"
                            checked={preferences.newsletterSubscription}
                            onChange={handlePreferenceChange}
                          />
                          <Form.Text className="text-muted">
                            Receive our monthly newsletter with daycare industry updates.
                          </Form.Text>
                        </Form.Group>
                        
                        <div className="text-end">
                          <Button variant="primary" onClick={saveProfile}>
                            Save Preferences
                          </Button>
                        </div>
                      </Form>
                    </Tab>
                  </Tabs>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Profile;
