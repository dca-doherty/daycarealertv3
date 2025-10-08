import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, ProgressBar, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { fetchCities } from '../utils/apiSelector';
import '../styles/DaycareQuestionnaire.css';

const DaycareQuestionnaire = ({ onSubmit, initialValues }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [progress, setProgress] = useState(25);
  const [cities, setCities] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState({
    // Step 1: Child Information
    ageGroup: initialValues?.ageGroup || '',
    specialNeeds: initialValues?.specialNeeds || false,
    // New field for multiple children
    multipleChildren: initialValues?.multipleChildren || false,
    numberOfChildren: initialValues?.numberOfChildren || 1,
    
    // Step 2: Location Preferences
    location: {
      address: initialValues?.location?.address || '',
      city: initialValues?.location?.city || '',
      state: initialValues?.location?.state || 'TX',
      zipCode: initialValues?.location?.zipCode || '',
      lat: initialValues?.location?.lat || '',
      lng: initialValues?.location?.lng || '',
    },
    radius: initialValues?.radius || 10,
    
    // Step 3: Service Preferences
    transportation: initialValues?.transportation || false,
    extendedHours: initialValues?.extendedHours || false,
    priceRange: initialValues?.priceRange || '',
    
    // Step 4: Quality Priorities
    qualities: initialValues?.qualities || []
  });
  
  // Fetch cities for the location dropdown
  useEffect(() => {
    const loadCities = async () => {
      try {
        const citiesList = await fetchCities();
        setCities(citiesList);
      } catch (error) {
        console.error('Error loading cities:', error);
        setError('Failed to load cities. Please try again later.');
      }
    };
    
    loadCities();
  }, []);
  
  // Update progress bar based on current step
  useEffect(() => {
    setProgress((step / totalSteps) * 100);
  }, [step]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Handle location field changes
  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [name]: value
      }
    }));
  };
  
  // Handle quality checkboxes
  const handleQualityChange = (quality) => {
    setFormData(prev => {
      const qualities = [...prev.qualities];
      
      if (qualities.includes(quality)) {
        // Remove quality if already selected
        return {
          ...prev,
          qualities: qualities.filter(q => q !== quality)
        };
      } else {
        // Add quality if not already selected
        return {
          ...prev,
          qualities: [...qualities, quality]
        };
      }
    });
  };
  
  // Handle getting current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            location: {
              ...prev.location,
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          }));
          setUseCurrentLocation(true);
          setLocationLoading(false);
          setSuccess('Location detected successfully!');
          setTimeout(() => setSuccess(''), 3000);
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get current location. Please enter your address manually.');
          setLocationLoading(false);
          setUseCurrentLocation(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser. Please enter your address manually.');
    }
  };
  
  // Handle moving to the next step
  const handleNextStep = () => {
    // Validate current step
    if (step === 1 && !formData.ageGroup) {
      setError('Please select your child\'s age group.');
      return;
    }
    
    if (step === 2) {
      if (!useCurrentLocation && !formData.location.city) {
        setError('Please select a city or use current location.');
        return;
      }
      
      // Make sure we have location data
      if (!useCurrentLocation && !formData.location.city) {
        setError('Location information is required. Please select a city or use current location.');
        return;
      }
      
      // If using current location but failed to get coordinates
      if (useCurrentLocation && (!formData.location.lat || !formData.location.lng)) {
        setError('Unable to get your current location. Please try again or select a city instead.');
        return;
      }
    }
    
    // Clear any errors
    setError('');
    
    // Move to next step
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Submit the form on the last step
      handleSubmit();
    }
  };
  
  // Handle moving to the previous step
  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    // Final validation
    if (formData.qualities.length === 0) {
      setError('Please select at least one quality priority.');
      return;
    }
    
    // If we have a city but no coordinates, try to geocode the city
    if (!useCurrentLocation && formData.location.city && 
        (!formData.location.lat || !formData.location.lng)) {
      
      setLocationLoading(true);
      setError('');
      
      try {
        // Use a free geocoding service to get coordinates for the city
        // This is a simple implementation that works for major cities
        const geocodingUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(formData.location.city)}&state=texas&country=usa&format=json`;
        
        const response = await fetch(geocodingUrl);
        const data = await response.json();
        
        if (data && data.length > 0) {
          // Update location with coordinates
          const updatedFormData = {
            ...formData,
            location: {
              ...formData.location,
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon)
            }
          };
          
          setFormData(updatedFormData);
          
          // Call the onSubmit function passed as a prop
          onSubmit(updatedFormData);
          
          // Navigate to recommendations page
          navigate('/recommendations', { state: { formData: updatedFormData } });
        } else {
          setError('Could not find coordinates for the selected city. Please try a different city or use current location.');
        }
      } catch (error) {
        console.error('Error geocoding city:', error);
        setError('Error finding location coordinates. Please try a different city or use current location.');
      } finally {
        setLocationLoading(false);
      }
    } else {
      // Clear any errors
      setError('');
      
      // Call the onSubmit function passed as a prop
      onSubmit(formData);
      
      // Navigate to recommendations page
      navigate('/recommendations', { state: { formData } });
    }
  };

  return (
    <Container className="daycare-questionnaire">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="questionnaire-card shadow-sm">
            <Card.Header className="text-center">
              <h3 className="mb-0">Daycare Recommendation Finder</h3>
              <ProgressBar now={progress} className="mt-2" variant="primary" />
              <div className="step-indicator">Step {step} of {totalSteps}</div>
            </Card.Header>
            
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}
              
              {/* Step 1: Child Information */}
              {step === 1 && (
                <div className="step-content">
                  <h4 className="step-title">Child Information</h4>
                  <p className="step-description">Tell us about your child so we can find the right daycare options.</p>
                  
                  <Form.Group className="mb-4">
                    <Form.Label>Age Group</Form.Label>
                    <div className="age-group-selector">
                      <Form.Check
                        type="radio"
                        id="infant"
                        name="ageGroup"
                        value="infant"
                        label="Infant (0-12 months)"
                        checked={formData.ageGroup === 'infant'}
                        onChange={handleChange}
                        className="age-group-option"
                      />
                      <Form.Check
                        type="radio"
                        id="toddler"
                        name="ageGroup"
                        value="toddler"
                        label="Toddler (1-2 years)"
                        checked={formData.ageGroup === 'toddler'}
                        onChange={handleChange}
                        className="age-group-option"
                      />
                      <Form.Check
                        type="radio"
                        id="preschool"
                        name="ageGroup"
                        value="preschool"
                        label="Preschool (3-5 years)"
                        checked={formData.ageGroup === 'preschool'}
                        onChange={handleChange}
                        className="age-group-option"
                      />
                      <Form.Check
                        type="radio"
                        id="school-age"
                        name="ageGroup"
                        value="school-age"
                        label="School-age (6+ years)"
                        checked={formData.ageGroup === 'school-age'}
                        onChange={handleChange}
                        className="age-group-option"
                      />
                    </div>
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      id="specialNeeds"
                      name="specialNeeds"
                      label="My child has special needs or accommodations"
                      checked={formData.specialNeeds}
                      onChange={handleChange}
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      id="multipleChildren"
                      name="multipleChildren"
                      label="I'm looking for care for multiple children"
                      checked={formData.multipleChildren}
                      onChange={handleChange}
                    />
                  </Form.Group>
                  
                  {formData.multipleChildren && (
                    <Form.Group className="mb-3">
                      <Form.Label>Number of children</Form.Label>
                      <Form.Select
                        name="numberOfChildren"
                        value={formData.numberOfChildren}
                        onChange={handleChange}
                      >
                        {[1, 2, 3, 4, 5].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted">
                        All children will use the age group selected above. For different age groups, you can create separate searches.
                      </Form.Text>
                    </Form.Group>
                  )}
                </div>
              )}
              
              {/* Step 2: Location Preferences */}
              {step === 2 && (
                <div className="step-content">
                  <h4 className="step-title">Location Preferences</h4>
                  <p className="step-description">Let us know where you're looking for daycare options.</p>
                  
                  <Form.Group className="mb-3">
                    <Button 
                      variant={useCurrentLocation ? "primary" : "outline-primary"}
                      onClick={getCurrentLocation}
                      disabled={locationLoading}
                      className="mb-3 w-100"
                    >
                      {locationLoading ? 'Getting Location...' : 'Use My Current Location'}
                    </Button>
                  </Form.Group>
                  
                  {!useCurrentLocation && (
                    <>
                      <Form.Group className="mb-3">
                        <Form.Label>City</Form.Label>
                        <Form.Select
                          name="city"
                          value={formData.location.city}
                          onChange={handleLocationChange}
                        >
                          <option value="">Select a city</option>
                          {cities.map(city => (
                            <option key={city} value={city.toUpperCase()}>{city}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>ZIP Code (Optional)</Form.Label>
                        <Form.Control
                          type="text"
                          name="zipCode"
                          value={formData.location.zipCode}
                          onChange={handleLocationChange}
                          placeholder="Enter ZIP code for more accurate results"
                        />
                      </Form.Group>
                    </>
                  )}
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Search Radius (miles)</Form.Label>
                    <div className="d-flex align-items-center">
                      <Form.Range
                        name="radius"
                        min="1"
                        max="30"
                        value={formData.radius}
                        onChange={handleChange}
                        className="flex-grow-1 me-2"
                      />
                      <span className="radius-value">{formData.radius} miles</span>
                    </div>
                  </Form.Group>
                </div>
              )}
              
              {/* Step 3: Service Preferences */}
              {step === 3 && (
                <div className="step-content">
                  <h4 className="step-title">Service Preferences</h4>
                  <p className="step-description">What services and features are important to you?</p>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Monthly Budget (per child)</Form.Label>
                    <Form.Select
                      name="priceRange"
                      value={formData.priceRange}
                      onChange={handleChange}
                    >
                      <option value="">Select a price range</option>
                      <option value="1000">Under $1,000/month</option>
                      <option value="1500">$1,000 - $1,500/month</option>
                      <option value="2000">$1,500 - $2,000/month</option>
                      <option value="2500">$2,000 - $2,500/month</option>
                      <option value="99999">No specific budget</option>
                    </Form.Select>
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      id="transportation"
                      name="transportation"
                      label="Transportation services needed"
                      checked={formData.transportation}
                      onChange={handleChange}
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      id="extendedHours"
                      name="extendedHours"
                      label="Extended hours needed (early morning/late evening)"
                      checked={formData.extendedHours}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </div>
              )}
              
              {/* Step 4: Quality Priorities */}
              {step === 4 && (
                <div className="step-content">
                  <h4 className="step-title">Quality Priorities</h4>
                  <p className="step-description">Select the top qualities that matter most to you (choose at least one).</p>
                  
                  <div className="quality-options">
                    <Card 
                      className={`quality-card ${formData.qualities.includes('education') ? 'selected' : ''}`}
                      onClick={() => handleQualityChange('education')}
                    >
                      <Card.Body>
                        <div className="quality-icon"><span role="img" aria-label="Education">🎓</span></div>
                        <div className="quality-name">Education</div>
                      </Card.Body>
                    </Card>
                    
                    <Card 
                      className={`quality-card ${formData.qualities.includes('safety') ? 'selected' : ''}`}
                      onClick={() => handleQualityChange('safety')}
                    >
                      <Card.Body>
                        <div className="quality-icon"><span role="img" aria-label="Safety">🛡️</span></div>
                        <div className="quality-name">Safety</div>
                      </Card.Body>
                    </Card>
                    
                    <Card 
                      className={`quality-card ${formData.qualities.includes('affordability') ? 'selected' : ''}`}
                      onClick={() => handleQualityChange('affordability')}
                    >
                      <Card.Body>
                        <div className="quality-icon"><span role="img" aria-label="Affordability">💰</span></div>
                        <div className="quality-name">Affordability</div>
                      </Card.Body>
                    </Card>
                    
                    <Card 
                      className={`quality-card ${formData.qualities.includes('activities') ? 'selected' : ''}`}
                      onClick={() => handleQualityChange('activities')}
                    >
                      <Card.Body>
                        <div className="quality-icon"><span role="img" aria-label="Activities">🎨</span></div>
                        <div className="quality-name">Activities</div>
                      </Card.Body>
                    </Card>
                    
                    <Card 
                      className={`quality-card ${formData.qualities.includes('meals') ? 'selected' : ''}`}
                      onClick={() => handleQualityChange('meals')}
                    >
                      <Card.Body>
                        <div className="quality-icon"><span role="img" aria-label="Meals">🍎</span></div>
                        <div className="quality-name">Meals/Nutrition</div>
                      </Card.Body>
                    </Card>
                    
                    <Card 
                      className={`quality-card ${formData.qualities.includes('convenience') ? 'selected' : ''}`}
                      onClick={() => handleQualityChange('convenience')}
                    >
                      <Card.Body>
                        <div className="quality-icon"><span role="img" aria-label="Convenience">📍</span></div>
                        <div className="quality-name">Convenience</div>
                      </Card.Body>
                    </Card>
                    
                    <Card 
                      className={`quality-card ${formData.qualities.includes('experience') ? 'selected' : ''}`}
                      onClick={() => handleQualityChange('experience')}
                    >
                      <Card.Body>
                        <div className="quality-icon"><span role="img" aria-label="Experience">⏱️</span></div>
                        <div className="quality-name">Experience</div>
                      </Card.Body>
                    </Card>
                  </div>
                  
                  <div className="selected-qualities-summary">
                    {formData.qualities.length > 0 ? (
                      <p>Selected: {formData.qualities.join(', ')}</p>
                    ) : (
                      <p>No qualities selected</p>
                    )}
                  </div>
                </div>
              )}
            </Card.Body>
            
            <Card.Footer>
              <div className="d-flex justify-content-between">
                <Button 
                  variant="outline-secondary" 
                  onClick={handlePrevStep}
                  disabled={step === 1}
                >
                  Back
                </Button>
                
                <Button 
                  variant="primary" 
                  onClick={handleNextStep}
                  disabled={locationLoading}
                >
                  {locationLoading ? 'Processing...' : (step === totalSteps ? 'Find Daycares' : 'Next')}
                </Button>
              </div>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DaycareQuestionnaire;