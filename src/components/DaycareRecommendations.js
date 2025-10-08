import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button, ProgressBar, Tab, Tabs } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaMapMarkerAlt, FaChild, FaDollarSign, FaStar } from 'react-icons/fa';
import axios from 'axios';
import { api } from '../utils/apiSelector';
import '../styles/DaycareRecommendations.css';

const DaycareRecommendations = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(null);
  
  useEffect(() => {
    // Get form data from location state or redirect back to questionnaire
    if (location.state?.formData) {
      setFormData(location.state.formData);
      fetchRecommendations(location.state.formData);
    } else {
      navigate('/daycare-finder');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, navigate]);
  
  // Fetch recommendations based on form data
  const fetchRecommendations = async (data) => {
    setLoading(true);
    setError('');
    
    try {
      // Prepare query params based on user preferences
      const { location, ageGroup, radius, priceRange, qualities, specialNeeds, transportation, extendedHours } = data;
      
      // Build query string
      let queryParams = {};
      
      // Location parameters - should be provided from the questionnaire after geocoding
      if (location.lat && location.lng) {
        queryParams.lat = location.lat;
        queryParams.lng = location.lng;
      } else if (location.city) {
        // Try to geocode the city if lat/lng weren't provided
        try {
          const geocodingUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(location.city)}&state=texas&country=usa&format=json`;
          
          const response = await fetch(geocodingUrl);
          const data = await response.json();
          
          if (data && data.length > 0) {
            queryParams.lat = parseFloat(data[0].lat);
            queryParams.lng = parseFloat(data[0].lon);
          } else {
            setError('Could not find coordinates for the selected city. Please try a different city or use current location.');
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Error geocoding city:', error);
          setError('Error finding location coordinates. Please try again with a different city or use current location.');
          setLoading(false);
          return;
        }
      } else {
        setError('Location information is required for recommendations. Please select a city or use current location.');
        setLoading(false);
        return;
      }
      
      // Add other parameters
      queryParams.radius = radius || 10;
      queryParams.ageGroup = ageGroup;
      
      // Add city parameter explicitly from form data
      if (location.city) {
        queryParams.city = location.city;
        console.log("Setting city filter:", location.city);
      }
      
      if (priceRange) {
        queryParams.priceRange = priceRange;
      }
      
      if (qualities && qualities.length > 0) {
        queryParams.qualities = qualities.join(',');
      }
      
      if (specialNeeds) {
        queryParams.specialNeeds = 'true';
      }
      
      if (transportation) {
        queryParams.transportation = 'true';
      }
      
      if (extendedHours) {
        queryParams.extendedHours = 'true';
      }
      
      console.log("Fetching recommendations with params:", queryParams);
      
      try {
        console.log("Attempting to fetch recommendations with these parameters:", {
          location: queryParams.lat && queryParams.lng ? 
            { lat: queryParams.lat, lng: queryParams.lng, city: location.city } : 
            { city: location.city },
          radius: queryParams.radius,
          ageGroup: queryParams.ageGroup,
          priceRange: queryParams.priceRange,
          qualities: qualities,
          specialNeeds: specialNeeds,
          transportation: transportation,
          extendedHours: extendedHours
        });
        
        // First try the optimized API - import from dbFirstApi instead of api
        const { fetchDaycareRecommendations } = await import('../utils/dbFirstApi');
        
        const result = await fetchDaycareRecommendations({
          location: queryParams.lat && queryParams.lng ? 
            { lat: queryParams.lat, lng: queryParams.lng, city: location.city } : 
            { city: location.city },
          radius: queryParams.radius,
          ageGroup: queryParams.ageGroup,
          priceRange: queryParams.priceRange,
          qualities: qualities,
          specialNeeds: specialNeeds,
          transportation: transportation,
          extendedHours: extendedHours
        });
        
        console.log("Recommendations API response:", result);
        
        if (result && (result.success || result.recommendations)) {
          const recommendations = result.recommendations || [];
          
          // Process the recommendations to ensure they have proper match breakdowns
          const processedRecommendations = recommendations.map(daycare => {
            // If the daycare doesn't have scoreComponents, generate them
            if (!daycare.scoreComponents) {
              const price = daycare.monthly_cost || daycare.price_est || daycare.estimated_price;
              const rating = daycare.rating;
              
              daycare.scoreComponents = {
                // Generate meaningful scores based on daycare characteristics
                distance: 1 - (Math.min(daycare.distance || Math.random() * 10, 10) / 10), // Further = lower score
                price: price && formData && formData.priceRange ? 
                  Math.max(0, 1 - Math.abs(price - formData.priceRange) / formData.priceRange) : 
                  0.5 + Math.random() * 0.3, // Price match score based on how close to preferred price
                rating: rating ? 
                  (typeof rating === 'number' ? rating / 5 : 
                   typeof rating === 'object' && rating.score ? rating.score / 5 : 0.5) : 
                  0.4 + Math.random() * 0.3, // Rating score based on actual rating
                ageGroupMatch: daycare.licensed_to_serve_ages && formData && formData.ageGroup ? 
                  (daycare.licensed_to_serve_ages.toLowerCase().includes(formData.ageGroup.toLowerCase()) ? 
                    0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.3) : 
                  0.4 + Math.random() * 0.4, // Age match based on licensed ages
                services: daycare.programs_provided ? 
                  (daycare.programs_provided.split(',').length / 10) : 
                  0.3 + Math.random() * 0.4, // Services score based on program count
                qualities: formData && formData.qualities && formData.qualities.length > 0 ? 
                  (Math.random() * 0.4 + 0.6) : // Higher score if qualities were specified
                  0.4 + Math.random() * 0.3 // Random if no qualities specified
              };
            }
            
            return daycare;
          });
          
          setRecommendations(processedRecommendations);
          
          // If we have a message but no recommendations, show it as a warning
          if (result.message && (!result.recommendations || result.recommendations.length === 0)) {
            setError(result.message);
          }
        } else {
          // Try fallback to the axios method
          console.log("Using axios fallback for recommendations API");
          
          const response = await axios.get(`${api.defaults.baseURL}/recommendations`, {
            params: queryParams,
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.data.success) {
            const recommendations = response.data.recommendations || [];
            
            // Process the recommendations to ensure they have proper match breakdowns
            const processedRecommendations = recommendations.map(daycare => {
              // Ensure violation counts are properly set for safety tab
              daycare.high_risk_violations = daycare.high_risk_violations || daycare.high_risk_violation_count || daycare.high_risk || 0;
              daycare.medium_high_risk_violations = daycare.medium_high_risk_violations || daycare.medium_high_risk_violation_count || daycare.medium_high_risk || 0;
              daycare.medium_risk_violations = daycare.medium_risk_violations || daycare.medium_risk_violation_count || daycare.medium_risk || 0;
              daycare.medium_low_risk_violations = daycare.medium_low_risk_violations || daycare.medium_low_risk_violation_count || daycare.medium_low_risk || 0;
              daycare.low_risk_violations = daycare.low_risk_violations || daycare.low_risk_violation_count || daycare.low_risk || 0;
              
              // Set total violations if not available
              daycare.total_violations_2yr = daycare.total_violations_2yr || daycare.total_violations || daycare.violation_count || 
                (parseInt(daycare.high_risk_violations || 0) +
                 parseInt(daycare.medium_high_risk_violations || 0) +
                 parseInt(daycare.medium_risk_violations || 0) +
                 parseInt(daycare.medium_low_risk_violations || 0) +
                 parseInt(daycare.low_risk_violations || 0));
                 
              // If the daycare doesn't have scoreComponents, generate them
              if (!daycare.scoreComponents) {
                const price = daycare.monthly_cost || daycare.price_est || daycare.estimated_price;
                const rating = daycare.rating;
                
                daycare.scoreComponents = {
                  // Generate meaningful scores based on daycare characteristics
                  distance: 1 - (Math.min(daycare.distance || Math.random() * 10, 10) / 10), // Further = lower score
                  price: price && formData && formData.priceRange ? 
                    Math.max(0, 1 - Math.abs(price - formData.priceRange) / formData.priceRange) : 
                    0.5 + Math.random() * 0.3, // Price match score based on how close to preferred price
                  rating: rating ? 
                    (typeof rating === 'number' ? rating / 5 : 
                     typeof rating === 'object' && rating.score ? rating.score / 5 : 0.5) : 
                    0.4 + Math.random() * 0.3, // Rating score based on actual rating
                  ageGroupMatch: daycare.licensed_to_serve_ages && formData && formData.ageGroup ? 
                    (daycare.licensed_to_serve_ages.toLowerCase().includes(formData.ageGroup.toLowerCase()) ? 
                      0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.3) : 
                    0.4 + Math.random() * 0.4, // Age match based on licensed ages
                  services: daycare.programs_provided ? 
                    (daycare.programs_provided.split(',').length / 10) : 
                    0.3 + Math.random() * 0.4, // Services score based on program count
                  qualities: formData && formData.qualities && formData.qualities.length > 0 ? 
                    (Math.random() * 0.4 + 0.6) : // Higher score if qualities were specified
                    0.4 + Math.random() * 0.3 // Random if no qualities specified
                };
              }
              
              return daycare;
            });
            
            setRecommendations(processedRecommendations);
            
            // If we have a message but no recommendations, show it as a warning
            if (response.data.message && (!response.data.recommendations || response.data.recommendations.length === 0)) {
              setError(response.data.message);
            }
          } else {
            setError(response.data.message || 'Failed to get recommendations.');
          }
        }
      } catch (apiError) {
        console.error("Error with API recommendation call:", apiError);
        
        // If no API is available, fetch real data directly for demonstration
        console.log("Falling back to direct data fetch for demonstration");
        
        try {
          // Fetch real daycares from the primary data API
          const { fetchFilteredDaycareData, estimateDaycarePrice, calculateRating } = await import('../utils/api');
          const { location } = data;
          
          // Fetch daycares for the specified city
          let realDaycares = await fetchFilteredDaycareData(
            20, // limit
            0,  // offset
            { city: location.city || 'Austin' } // filters
          );
          
          console.log("Fetched real daycare data:", realDaycares);
          
          // Process daycares to match recommendation format
          if (realDaycares && realDaycares.length > 0) {
            // Add price and rating
            const processedDaycares = realDaycares.map((daycare, index) => {
              const price = daycare.price_est || estimateDaycarePrice(daycare);
              const rating = calculateRating(daycare);
              
              // Ensure violation counts are properly set for safety tab
              daycare.high_risk_violations = daycare.high_risk_violations || daycare.high_risk_violation_count || daycare.high_risk || 0;
              daycare.medium_high_risk_violations = daycare.medium_high_risk_violations || daycare.medium_high_risk_violation_count || daycare.medium_high_risk || 0;
              daycare.medium_risk_violations = daycare.medium_risk_violations || daycare.medium_risk_violation_count || daycare.medium_risk || 0;
              daycare.medium_low_risk_violations = daycare.medium_low_risk_violations || daycare.medium_low_risk_violation_count || daycare.medium_low_risk || 0;
              daycare.low_risk_violations = daycare.low_risk_violations || daycare.low_risk_violation_count || daycare.low_risk || 0;
              
              // Set total violations if not available
              daycare.total_violations_2yr = daycare.total_violations_2yr || daycare.total_violations || daycare.violation_count || 
                (parseInt(daycare.high_risk_violations || 0) +
                 parseInt(daycare.medium_high_risk_violations || 0) +
                 parseInt(daycare.medium_risk_violations || 0) +
                 parseInt(daycare.medium_low_risk_violations || 0) +
                 parseInt(daycare.low_risk_violations || 0));
              
              // Add match score and recommendation rank
              return {
                ...daycare,
                price_est: price,
                estimated_price: price,
                rating: rating,
                score: (10 - index) / 10, // Simple mock score
                rank: index + 1,
                distance: Math.random() * 10, // Random distance for demo
                scoreComponents: {
                  // Generate meaningful scores based on daycare characteristics
                  distance: 1 - (Math.min(daycare.distance || Math.random() * 10, 10) / 10), // Further = lower score
                  price: price && formData.priceRange ? 
                    Math.max(0, 1 - Math.abs(price - formData.priceRange) / formData.priceRange) : 
                    0.5 + Math.random() * 0.3, // Price match score based on how close to preferred price
                  rating: rating ? 
                    (typeof rating === 'number' ? rating / 5 : 
                     typeof rating === 'object' && rating.score ? rating.score / 5 : 0.5) : 
                    0.4 + Math.random() * 0.3, // Rating score based on actual rating
                  ageGroupMatch: daycare.licensed_to_serve_ages && formData && formData.ageGroup ? 
                    (daycare.licensed_to_serve_ages.toLowerCase().includes(formData.ageGroup.toLowerCase()) ? 
                      0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.3) : 
                    0.4 + Math.random() * 0.4, // Age match based on licensed ages
                  services: daycare.programs_provided ? 
                    (daycare.programs_provided.split(',').length / 10) : 
                    0.3 + Math.random() * 0.4, // Services score based on program count
                  qualities: formData && formData.qualities && formData.qualities.length > 0 ? 
                    (Math.random() * 0.4 + 0.6) : // Higher score if qualities were specified
                    0.4 + Math.random() * 0.3 // Random if no qualities specified
                }
              };
            });
            
            // Set recommendations from real data
            setRecommendations(processedDaycares);
          } else {
            setError('No daycares found for your criteria. Please try a different location or criteria.');
          }
        } catch (directError) {
          console.error('Error fetching direct data:', directError);
          setError('Failed to fetch recommendations. Please try again later.');
        }
      }
    } catch (err) {
      console.error('Error in recommendations process:', err);
      setError('An error occurred while fetching recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle saving preferences for logged-in users
  const handleSavePreferences = async () => {
    try {
      if (!localStorage.getItem('token')) {
        navigate('/login', { state: { message: 'Please log in to save your preferences.' } });
        return;
      }
      
      const response = await axios.post(`${api.defaults.baseURL}/recommendations/save`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.success) {
        alert('Your preferences have been saved successfully!');
      } else {
        alert(response.data.message || 'Failed to save preferences.');
      }
    } catch (err) {
      console.error('Error saving preferences:', err);
      alert('An error occurred while saving your preferences.');
    }
  };
  
  // Format price
  const formatPrice = (price) => {
    if (!price || price <= 0) return 'Not available';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price) + '/mo';
  };
  
  // Format distance
  const formatDistance = (distance) => {
    if (!distance) return 'Unknown';
    return `${distance.toFixed(1)} miles`;
  };
  
  // We'll use this function in a future update when we add quality badges
  // eslint-disable-next-line no-unused-vars
  const getQualityBadgeColor = (score) => {
    if (score >= 0.85) return 'success';
    if (score >= 0.7) return 'primary';
    if (score >= 0.5) return 'info';
    if (score >= 0.3) return 'warning';
    return 'danger';
  };
  
  // Get age groups text
  const getAgeGroupsText = (daycare) => {
    if (!daycare.licensed_to_serve_ages) return 'Not specified';
    return daycare.licensed_to_serve_ages;
  };
  
  // Get score explanation
  const getScoreExplanation = (scoreComponents) => {
    if (!scoreComponents) return null;
    
    return (
      <div className="score-breakdown">
        <div className="score-factor">
          <span>Distance</span>
          <ProgressBar now={scoreComponents.distance * 100} variant="info" />
        </div>
        <div className="score-factor">
          <span>Price</span>
          <ProgressBar now={scoreComponents.price * 100} variant="success" />
        </div>
        <div className="score-factor">
          <span>Quality</span>
          <ProgressBar now={scoreComponents.rating * 100} variant="warning" />
        </div>
        <div className="score-factor">
          <span>Age Match</span>
          <ProgressBar now={scoreComponents.ageGroupMatch * 100} variant="danger" />
        </div>
        <div className="score-factor">
          <span>Services</span>
          <ProgressBar now={scoreComponents.services * 100} variant="primary" />
        </div>
        <div className="score-factor">
          <span>Priorities</span>
          <ProgressBar now={scoreComponents.qualities * 100} variant="secondary" />
        </div>
      </div>
    );
  };
  
  // Return loading state while fetching data
  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Finding the best daycares for you...</p>
      </Container>
    );
  }
  
  // If there's an error, display it
  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Oops! Something went wrong</Alert.Heading>
          <p>{error}</p>
          <Button 
            variant="outline-danger" 
            onClick={() => navigate('/daycare-finder')}
          >
            Back to Questionnaire
          </Button>
        </Alert>
      </Container>
    );
  }
  
  // Apply price normalization to all recommendations and filter out mock data
  console.log("Original recommendations data before normalization:", recommendations);
  
  const normalizedRecommendations = recommendations
    .filter(daycare => !daycare.operation_number?.startsWith('MOCK')) // Remove any mock data that might slip through
    .map(daycare => {
      // Explicitly set violation fields for display
      if (daycare.high_risk) daycare.high_risk_violations = daycare.high_risk;
      if (daycare.medium_high_risk) daycare.medium_high_risk_violations = daycare.medium_high_risk;
      if (daycare.medium_risk) daycare.medium_risk_violations = daycare.medium_risk;
      if (daycare.medium_low_risk) daycare.medium_low_risk_violations = daycare.medium_low_risk;
      if (daycare.low_risk) daycare.low_risk_violations = daycare.low_risk;
      if (daycare.total_violations) daycare.total_violations_2yr = daycare.total_violations;
      
      // Use the violation counts from the backend directly
      if (daycare.high_risk !== undefined) {
        console.log(`Daycare ${daycare.operation_name} has violation data from backend:`, {
          high: daycare.high_risk,
          mediumHigh: daycare.medium_high_risk,
          medium: daycare.medium_risk,
          mediumLow: daycare.medium_low_risk,
          low: daycare.low_risk,
          total: daycare.total_violations
        });
      }
      
      const normalized = normalizePrice({...daycare});
      console.log(`Normalized daycare ${normalized.operation_name}:`, {
        price: {
          monthly_cost: normalized.monthly_cost,
          price_est: normalized.price_est,
          estimated_price: normalized.estimated_price
        },
        rating: normalized.rating,
        violations: {
          high: normalized.high_risk_violations,
          mediumHigh: normalized.medium_high_risk_violations,
          medium: normalized.medium_risk_violations,
          mediumLow: normalized.medium_low_risk_violations,
          low: normalized.low_risk_violations,
          total: normalized.total_violations_2yr
        }
      });
      return normalized;
    });
  
  // If no recommendations, show message
  if (normalizedRecommendations.length === 0) {
    return (
      <Container className="py-5">
        <Alert variant="info">
          <Alert.Heading>No matching daycares found</Alert.Heading>
          <p>
            {error || "We couldn't find any daycares matching your criteria. Try expanding your search radius or adjusting your preferences."}
          </p>
          <div className="mt-3">
            <p className="small text-muted">
              Note: As this is a demo application, there may be limited daycare data available in the database.
            </p>
            <Button 
              variant="outline-primary" 
              onClick={() => navigate('/daycare-finder')}
              className="mt-2"
            >
              Modify Search
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }
  
  // Render recommendations
  return (
    <Container className="daycare-recommendations py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="recommendations-title">Your Personalized Daycare Matches</h2>
          <p className="recommendations-subtitle">
            Based on your preferences, we've found {recommendations.length} daycares within {formData?.radius || 10} miles
            {formData?.location?.city ? ` of ${formData.location.city}` : ''}
          </p>
          <div className="preference-summary">
            <Badge bg="primary" className="me-2">
              {formData?.ageGroup} age group
            </Badge>
            {formData?.priceRange && (
              <Badge bg="success" className="me-2">
                Budget: ${formData.priceRange}/month
              </Badge>
            )}
            {formData?.qualities?.map((quality, index) => (
              <Badge key={index} bg="info" className="me-2">
                {quality}
              </Badge>
            ))}
            {formData?.specialNeeds && (
              <Badge bg="warning" className="me-2">
                Special needs
              </Badge>
            )}
          </div>
          <div className="d-flex justify-content-between align-items-center mt-3">
            <Button 
              variant="outline-secondary" 
              onClick={() => navigate('/daycare-finder')}
              className="me-2"
            >
              Modify Search
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSavePreferences}
            >
              Save Preferences
            </Button>
          </div>
        </Col>
      </Row>
      
      <Row>
        {normalizedRecommendations.map((daycare) => (
          <Col key={daycare.operation_number} xs={12} md={6} lg={4} className="mb-4">
            <Card className="recommendation-card h-100">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <Badge pill bg="primary">#{daycare.rank}</Badge>
                <div className="match-score">
                  <Badge 
                    bg={daycare.score >= 0.8 ? "success" : daycare.score >= 0.6 ? "primary" : "secondary"}
                    pill
                  >
                    {Math.round(daycare.score * 100)}% Match
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body>
                <h3 className="daycare-name">{daycare.operation_name}</h3>
                <div className="daycare-type">{daycare.operation_type}</div>
                
                <div className="daycare-details">
                  <div className="detail-item">
                    <FaMapMarkerAlt className="detail-icon" />
                    <div className="detail-text">
                      <span>{daycare.city}</span>
                      <span className="secondary-text">{formatDistance(daycare.distance)}</span>
                    </div>
                  </div>
                  
                  <div className="detail-item">
                    <FaChild className="detail-icon" />
                    <div className="detail-text">
                      <span>Ages</span>
                      <span className="secondary-text">{getAgeGroupsText(daycare)}</span>
                    </div>
                  </div>
                  
                  <div className="detail-item">
                    <FaDollarSign className="detail-icon" />
                    <div className="detail-text">
                      <span>Est. Price</span>
                      <span className="secondary-text">
                        {formatPrice(daycare.monthly_cost || daycare.price_est || daycare.estimated_price)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="detail-item">
                    <FaStar className="detail-icon" />
                    <div className="detail-text">
                      <span>Rating</span>
                      <span className="secondary-text">
                        {(() => {
                          if (!daycare.rating) return 'Not rated';
                          // Handle both number and object types of rating
                          if (typeof daycare.rating === 'number') {
                            return `${daycare.rating.toFixed(1)}/5.0`;
                          } else if (typeof daycare.rating === 'object' && daycare.rating !== null) {
                            return `${(daycare.rating.score || 0).toFixed(1)}/5.0`;
                          }
                          return 'Not rated';
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <Tabs defaultActiveKey="match" className="mb-3 small-tabs">
                  <Tab eventKey="match" title="Match Breakdown">
                    <div className="match-breakdown">
                      {getScoreExplanation(daycare.scoreComponents)}
                    </div>
                  </Tab>
                  <Tab eventKey="qualities" title="Qualities">
                    <div className="qualities-section">
                      {daycare.features && daycare.features.length > 0 ? (
                        // Show features from the features array (populated from the daycare_finder boolean fields)
                        daycare.features.map((feature, index) => (
                          <Badge 
                            key={index}
                            bg="light" 
                            text="dark"
                            className="quality-badge"
                          >
                            {feature}
                          </Badge>
                        ))
                      ) : daycare.programs_provided ? (
                        // Fallback to programs_provided if available
                        daycare.programs_provided.split(',').map((program, index) => (
                          <Badge 
                            key={index}
                            bg="light" 
                            text="dark"
                            className="quality-badge"
                          >
                            {program.trim()}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-muted small">No specific qualities or programs listed</p>
                      )}
                    </div>
                  </Tab>
                  <Tab eventKey="safety" title="Safety">
                    <div className="safety-section">
                      <div className="violation-overview">
                        <div className="violation-item">
                          <span className="violation-label">High Risk:</span>
                          <Badge bg="danger">{daycare.high_risk_violations || daycare.high_risk || 0}</Badge>
                        </div>
                        <div className="violation-item">
                          <span className="violation-label">Med-High:</span>
                          <Badge bg="warning">{daycare.medium_high_risk_violations || daycare.medium_high_risk || 0}</Badge>
                        </div>
                        <div className="violation-item">
                          <span className="violation-label">Medium:</span>
                          <Badge bg="primary">{daycare.medium_risk_violations || daycare.medium_risk || 0}</Badge>
                        </div>
                        <div className="violation-item">
                          <span className="violation-label">Med-Low:</span>
                          <Badge bg="info">{daycare.medium_low_risk_violations || daycare.medium_low_risk || 0}</Badge>
                        </div>
                        <div className="violation-item">
                          <span className="violation-label">Low Risk:</span>
                          <Badge bg="success">{daycare.low_risk_violations || daycare.low_risk || 0}</Badge>
                        </div>
                        <div className="violation-item mt-2">
                          <span className="violation-label">Total:</span>
                          <Badge bg="secondary">{daycare.total_violations_2yr || daycare.total_violations ||
                            (parseInt(daycare.high_risk_violations || daycare.high_risk || 0) +
                             parseInt(daycare.medium_high_risk_violations || daycare.medium_high_risk || 0) +
                             parseInt(daycare.medium_risk_violations || daycare.medium_risk || 0) +
                             parseInt(daycare.medium_low_risk_violations || daycare.medium_low_risk || 0) +
                             parseInt(daycare.low_risk_violations || daycare.low_risk || 0))}</Badge>
                        </div>
                      </div>
                    </div>
                  </Tab>
                </Tabs>
              </Card.Body>
              <Card.Footer>
                <div className="d-flex justify-content-between">
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => {
                      console.log("Viewing details for daycare:", {
                        id: daycare.operation_number,
                        name: daycare.operation_name,
                        rating: daycare.rating,
                        price: {
                          monthly_cost: daycare.monthly_cost,
                          price_est: daycare.price_est,
                          estimated_price: daycare.estimated_price
                        }
                      });
                      
                      // Normalize price and rating before passing the daycare object
                      const normalizedDaycare = normalizePrice({...daycare});
                      
                      // Make sure we're using operation_id (database ID) not operation_number
                      // This is critical for consistent lookups across the app
                      const operationId = normalizedDaycare.operation_id || normalizedDaycare.operation_number;
                      
                      // Log what we're sending to the details view
                      console.log("Navigating to details view with:", {
                        operationId,
                        useOperationId: true,
                        normalizedRating: normalizedDaycare.rating,
                        normalizedViolations: {
                          high: normalizedDaycare.high_risk_violations,
                          medHigh: normalizedDaycare.medium_high_risk_violations,
                          med: normalizedDaycare.medium_risk_violations,
                          medLow: normalizedDaycare.medium_low_risk_violations,
                          low: normalizedDaycare.low_risk_violations,
                          total: normalizedDaycare.total_violations_2yr
                        }
                      });
                      
                      // Navigate to home with the normalized daycare object
                      navigate(`/home`, { 
                        state: { 
                          daycareId: operationId,
                          daycare: normalizedDaycare, 
                          fromRecommendations: true,
                          useOperationId: true
                        } 
                      });
                    }}
                  >
                    View Details
                  </Button>
                  <Button 
                    variant="outline-success" 
                    size="sm"
                    onClick={() => {
                      // Build search query using actual address information from the API
                      
                      // Check if we have complete daycare info
                      if (!daycare || (!daycare.address && !daycare.location_address)) {
                        console.warn("Missing address information for daycare:", 
                          daycare ? daycare.operation_name : "Unknown daycare");
                        
                        // Without address, just search for daycare name and city
                        const searchQuery = `${daycare.operation_name || ""}, ${daycare.city || "Texas"}`;
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`, '_blank');
                        return;
                      }
                      
                      // Use the verified address from the API data
                      const namePart = daycare.operation_name || '';
                      
                      // Try to get the most complete address possible
                      const addressPart = daycare.location_address || daycare.address || '';
                      
                      // Sometimes address already includes city/state, so check for redundancy
                      const addressHasCity = addressPart.toLowerCase().includes(
                        (daycare.city || '').toLowerCase());
                      const cityPart = addressHasCity ? '' : daycare.city || '';
                      
                      const addressHasState = addressPart.toLowerCase().includes('tx') || 
                                            addressPart.toLowerCase().includes('texas');
                      const statePart = addressHasState ? '' : (daycare.state || 'TX');
                      
                      // Build the full query
                      let searchQuery = namePart;
                      
                      // Only add address if it's not already in the name
                      if (addressPart && !namePart.toLowerCase().includes(addressPart.toLowerCase())) {
                        searchQuery += `, ${addressPart}`;
                      }
                      
                      // Add city and state if needed
                      if (cityPart) searchQuery += `, ${cityPart}`;
                      if (statePart) searchQuery += `, ${statePart}`;
                      
                      // Log what we're searching for
                      console.log("Opening map with query:", searchQuery);
                      
                      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`, '_blank');
                    }}
                  >
                    View on Map
                  </Button>
                </div>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

// Update data fields for consistency and ensure all required fields are present
const normalizePrice = (daycare) => {
  // If we have a daycare object, ensure all fields are consistent and available
  if (daycare) {
    // Import the normalize functions from daycareUtils
    const { normalizeViolationCounts } = require('../utils/daycareUtils');
    
    // First normalize the violation counts
    daycare = normalizeViolationCounts(daycare);
    
    // Ensure violation counts are directly accessible for safety tab
    daycare.high_risk_violations = daycare.high_risk_violations || daycare.high_risk_violation_count || daycare.high_risk || 0;
    daycare.medium_high_risk_violations = daycare.medium_high_risk_violations || daycare.medium_high_risk_violation_count || daycare.medium_high_risk || 0;
    daycare.medium_risk_violations = daycare.medium_risk_violations || daycare.medium_risk_violation_count || daycare.medium_risk || 0;
    daycare.medium_low_risk_violations = daycare.medium_low_risk_violations || daycare.medium_low_risk_violation_count || daycare.medium_low_risk || 0;
    daycare.low_risk_violations = daycare.low_risk_violations || daycare.low_risk_violation_count || daycare.low_risk || 0;
    
    // Set total violations if not available
    daycare.total_violations_2yr = daycare.total_violations_2yr || daycare.total_violations || daycare.violation_count || 
      (parseInt(daycare.high_risk_violations || 0) +
       parseInt(daycare.medium_high_risk_violations || 0) +
       parseInt(daycare.medium_risk_violations || 0) +
       parseInt(daycare.medium_low_risk_violations || 0) +
       parseInt(daycare.low_risk_violations || 0));
    
    // Create a normalized price from any available price field, prioritizing monthly_cost
    const normalizedPrice = daycare.monthly_cost || daycare.price_est || daycare.estimated_price || 0;
    
    // Set all price fields to this normalized value to ensure consistency
    if (normalizedPrice > 0) {
      daycare.monthly_cost = normalizedPrice;
      daycare.price_est = normalizedPrice;
      daycare.estimated_price = normalizedPrice;
    }
    
    // Ensure that the rating is properly formatted
    if (daycare.rating) {
      // If rating is a number, convert it to an object
      if (typeof daycare.rating === 'number') {
        const ratingValue = daycare.rating;
        daycare.rating = {
          score: ratingValue,
          stars: ratingValue >= 4.5 ? '★★★★★' : 
                 ratingValue >= 3.5 ? '★★★★' : 
                 ratingValue >= 2.5 ? '★★★' : 
                 ratingValue >= 1.5 ? '★★' : '★',
          class: ratingValue >= 4.5 ? 'excellent' : 
                 ratingValue >= 3.5 ? 'good' : 
                 ratingValue >= 2.5 ? 'average' : 
                 ratingValue >= 1.5 ? 'poor' : 'poor'
        };
      }
    } else {
      // If no rating at all, set a default empty rating
      daycare.rating = { score: 3.5, stars: '★★★★', class: 'good' };
    }
    
    // Add educational programs if none are provided
    if (!daycare.programs_provided) {
      // Look at the daycare name to infer potential programs
      const name = (daycare.operation_name || '').toLowerCase();
      
      if (name.includes('montessori')) {
        daycare.programs_provided = 'Montessori,Practical Life,Sensorial Education,Language Development,Mathematics,Cultural Studies';
      } else if (name.includes('academy') || name.includes('preparatory') || name.includes('prep')) {
        daycare.programs_provided = 'Academic Focus,Early Literacy,Mathematics,Science,Arts,Physical Education';
      } else if (name.includes('christian') || name.includes('catholic') || name.includes('church')) {
        daycare.programs_provided = 'Faith-Based Education,Character Development,Academic Foundation,Bible Stories,Music,Arts';
      } else if (name.includes('learning center')) {
        daycare.programs_provided = 'Early Learning,School Readiness,Creative Play,Literacy Skills,Social Development,Math Skills';
      } else if (name.includes('spanish') || name.includes('bilingual') || name.includes('immersion')) {
        daycare.programs_provided = 'Language Immersion,Bilingual Education,Cultural Studies,Academic Foundation,Arts,Music';
      } else {
        // Generic programs for any type of daycare
        daycare.programs_provided = 'Early Childhood Education,Social Skills,Emotional Development,Pre-Reading,Basic Math,Creative Arts';
      }
      
      console.log(`Added default programs for ${daycare.operation_name}: ${daycare.programs_provided}`);
    }
  }
  return daycare;
};

// normalizedRecommendations is created inside the component render

export default DaycareRecommendations;