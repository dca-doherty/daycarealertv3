import React, { useState, useEffect } from 'react';
import { Container, Form, Row, Col, Button, Card, Alert } from 'react-bootstrap';
import { estimateDaycarePrice } from '../utils/helpers';
import { fetchCities } from '../utils/dbFirstApi'; // Use the improved fetchCities with fallbacks
import { trackCostEstimation, trackFilterUse, trackCityInterest } from '../utils/analytics';
import PageHeader from '../components/PageHeader';
import estimatorImage from '../images/pexels-naomi-shi-374023-1001914.jpg';
import '../styles/CostEstimator.css';

const CostEstimator = () => {
  const [location, setLocation] = useState({
    city: '',
    zipCode: ''
  });
  
  const [childDetails, setChildDetails] = useState({
    ageGroup: '',
    specialNeeds: false,
    numberOfChildren: 1,
    daysPerWeek: 5
  });
  
  const [programPreferences, setProgramPreferences] = useState({
    educational: false,
    montessori: false,
    language: false,
    extendedHours: false,
    weekend: false,
    meals: false,
    transportation: false,
    afterSchool: false,
    accredited: false,
    outdoorFocus: false,
    artsProgram: false,
    fullTimeOnly: false,
    securityFeatures: false
  });
  
  const [estimatedCost, setEstimatedCost] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [cities, setCities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zipCodeError, setZipCodeError] = useState('');
  
  // Load cities from API
  useEffect(() => {
    const loadCities = async () => {
      setIsLoading(true);
      try {
        const citiesData = await fetchCities();
        if (citiesData && citiesData.length > 0) {
          setCities(citiesData);
        } else {
          // Fall back to default cities if API returns empty
          setCities([
            "ABILENE", "AMARILLO", "ARLINGTON", "AUSTIN", "BEAUMONT", "CORPUS CHRISTI", 
            "DALLAS", "DENTON", "EL PASO", "FORT WORTH", "FRISCO", "GALVESTON", "GARLAND", 
            "HOUSTON", "IRVING", "LUBBOCK", "MCALLEN", "MCKINNEY", "MIDLAND", "ODESSA",
            "PLANO", "SAN ANGELO", "SAN ANTONIO", "TYLER", "WACO", "WICHITA FALLS"
          ]);
        }
        setError(null);
      } catch (err) {
        console.error("Error loading cities:", err);
        setError("Unable to load cities. Using default values.");
        // Fall back to default cities
        setCities([
          "ABILENE", "AMARILLO", "ARLINGTON", "AUSTIN", "BEAUMONT", "CORPUS CHRISTI", 
          "DALLAS", "DENTON", "EL PASO", "FORT WORTH", "FRISCO", "GALVESTON", "GARLAND", 
          "HOUSTON", "IRVING", "LUBBOCK", "MCALLEN", "MCKINNEY", "MIDLAND", "ODESSA",
          "PLANO", "SAN ANGELO", "SAN ANTONIO", "TYLER", "WACO", "WICHITA FALLS"
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCities();
  }, []);
  
  const ageGroups = [
    { value: "infant", label: "Infant (0-12 months)", factor: 1.45 },
    { value: "toddler", label: "Toddler (1-2 years)", factor: 1.35 },
    { value: "preschool", label: "Preschool (3-5 years)", factor: 1.20 },
    { value: "schoolAge", label: "School Age (6+ years)", factor: 1.10 }
  ];
  
  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'zipCode') {
      // Clear previous error
      setZipCodeError('');
      
      // Only allow digits
      const digitsOnly = value.replace(/[^\d]/g, '');
      
      // Basic validation for Texas ZIP codes
      if (digitsOnly.length > 0 && digitsOnly.length < 5) {
        setZipCodeError('Please enter a complete 5-digit ZIP code');
      } else if (digitsOnly.length === 5) {
        // Texas ZIP codes start with 75-79 or 88
        const prefix = parseInt(digitsOnly.substring(0, 2), 10);
        if (!((prefix >= 75 && prefix <= 79) || prefix === 88)) {
          setZipCodeError('Please enter a valid Texas ZIP code');
        }
      } else if (digitsOnly.length > 5) {
        // Truncate to 5 digits
        return setLocation(prev => ({
          ...prev,
          [name]: digitsOnly.substring(0, 5)
        }));
      }
      
      setLocation(prev => ({
        ...prev,
        [name]: digitsOnly
      }));
    } else {
      // Track city selection in analytics
      if (name === 'city' && value) {
        trackFilterUse('city', value);
        // Also track as SEO city interest
        trackCityInterest(value);
      }
      
      setLocation(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleChildDetailsChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Track age group selection in analytics
    if (name === 'ageGroup' && value) {
      const selectedAgeGroup = ageGroups.find(group => group.value === value);
      trackFilterUse('ageGroup', selectedAgeGroup ? selectedAgeGroup.label : value);
    } else if (name === 'daysPerWeek' && value) {
      trackFilterUse('daysPerWeek', value);
    }
    
    setChildDetails(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleProgramPreferencesChange = (e) => {
    const { name, checked } = e.target;
    
    // Track program preference changes in analytics
    trackFilterUse(`program_${name}`, checked ? 'yes' : 'no');
    
    setProgramPreferences(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  const calculateEstimate = () => {
    // Validate input fields
    if (!location.city) {
      return;
    }
    
    if (location.zipCode && location.zipCode.length > 0 && location.zipCode.length < 5) {
      setZipCodeError('Please enter a complete 5-digit ZIP code');
      return;
    }
    
    setIsCalculating(true);
    
    // Create a more comprehensive synthetic daycare object with the user's preferences
    const syntheticDaycare = {
      city: location.city,
      zip_code: location.zipCode || getDefaultZipForCity(location.city),
      
      // Age group information - enhanced with better matching 
      age_groups: childDetails.ageGroup,
      licensed_to_serve_ages: getAgeGroupDescription(childDetails.ageGroup),
      
      // Create a programs_provided string based on selected preferences
      programs_provided: createProgramsString(),
      
      // Additional factors that may affect pricing - improved ratio calculation
      staff_to_child_ratio: getStaffRatioForAge(childDetails.ageGroup),
      
      // Additional service indicators
      meals_provided: programPreferences.meals ? "Yes" : "No",
      extended_hours: programPreferences.extendedHours ? "Yes" : "No",
      transportation_provided: programPreferences.transportation ? "Yes" : "No",
      
      // Determine accreditation status
      accredited: programPreferences.accredited ? "Yes" : "No",
      
      // Reasonable defaults based on typical daycares
      total_capacity: programPreferences.montessori ? "60" : "80", // Smaller capacity for specialized programs
      total_inspections: "6",
      license_issue_date: "2018-01-01", // ~5 years in operation
      
      // Compliance record adjusted based on accreditation and quality factors
      deficiency_high: programPreferences.accredited ? "0" : "1",
      deficiency_medium_high: programPreferences.accredited ? "0" : "1",
      deficiency_medium: programPreferences.accredited ? "1" : "2",
      deficiency_low: programPreferences.accredited ? "1" : "2",
      
      // Store user preferences for additional calculations
      user_preferences: {
        numberOfChildren: childDetails.numberOfChildren,
        daysPerWeek: childDetails.daysPerWeek,
        fullTimeOnly: programPreferences.fullTimeOnly,
        securityFeatures: programPreferences.securityFeatures,
        specialNeeds: childDetails.specialNeeds
      }
    };
    
    // Calculate the price with a slight delay for visual feedback
    setTimeout(() => {
      try {
        // Get base price from helper function
        let price = estimateDaycarePrice(syntheticDaycare);
        let adjustments = [];
        
        // Apply adjustments based on additional factors
        
        // Special needs adjustment
        if (childDetails.specialNeeds) {
          const specialNeedsRate = price * 0.15; // 15% premium
          price += specialNeedsRate;
          adjustments.push({
            name: 'Special Needs Support',
            amount: `+$${Math.round(specialNeedsRate)}`,
            description: 'Additional resources and support for special needs'
          });
        }
        
        // Adjust for number of children (sibling discount)
        if (childDetails.numberOfChildren > 1) {
          // First child full price, additional children get 10% discount
          const firstChildPrice = price;
          const siblingDiscount = price * 0.1; // 10% discount per sibling
          const siblingPrice = price - siblingDiscount;
          const totalSiblingPrice = siblingPrice * (childDetails.numberOfChildren - 1);
          const totalPrice = firstChildPrice + totalSiblingPrice;
          const discount = price * (childDetails.numberOfChildren) - totalPrice;
          
          adjustments.push({
            name: 'Multiple Children',
            amount: `-$${Math.round(discount)}`,
            description: `${childDetails.numberOfChildren - 1} additional ${childDetails.numberOfChildren - 1 === 1 ? 'child' : 'children'} with 10% sibling discount`
          });
          
          price = totalPrice;
        }
        
        // Adjust for part-time attendance with progressive rate
        if (childDetails.daysPerWeek < 5) {
          const fullWeekPrice = price;
          
          // Progressive premium based on days per week
          // Fewer days = higher premium per day
          const premiumFactors = {
            2: 1.25, // 25% premium for 2 days
            3: 1.15, // 15% premium for 3 days
            4: 1.08  // 8% premium for 4 days
          };
          
          const premiumFactor = premiumFactors[childDetails.daysPerWeek] || 1.1;
          const dailyRate = fullWeekPrice / 5 * premiumFactor;
          const partTimePrice = dailyRate * childDetails.daysPerWeek;
          const priceDifference = partTimePrice - (fullWeekPrice * childDetails.daysPerWeek / 5);
          
          adjustments.push({
            name: 'Part-Time Rate',
            amount: `+$${Math.round(priceDifference)}`,
            description: `${childDetails.daysPerWeek} days per week (${Math.round((premiumFactor - 1) * 100)}% premium on daily rate)`
          });
          
          price = partTimePrice;
        }
        
        // Add premium for security features
        if (programPreferences.securityFeatures) {
          price += 120; // $120 premium for security features (increased from $100)
          
          adjustments.push({
            name: 'Security Features',
            amount: '+$120',
            description: 'Advanced security monitoring and access control'
          });
        }
        
        // Programs-based special adjustments
        if (programPreferences.montessori && programPreferences.language) {
          // Special premium for combined prestigious programs
          const specialProgramPremium = price * 0.1; // 10% premium
          price += specialProgramPremium;
          
          adjustments.push({
            name: 'Premium Program Combination',
            amount: `+$${Math.round(specialProgramPremium)}`,
            description: 'Combined Montessori and Language immersion programs'
          });
        }
        
        // Round to nearest $5
        price = Math.round(price / 5) * 5;
        
        // Track cost estimation in analytics
        trackCostEstimation(
          location.city,
          getAgeGroupDescription(childDetails.ageGroup),
          price
        );
        
        // Store adjustments with the price for display
        setEstimatedCost({
          price, 
          adjustments
        });
        setIsCalculating(false);
      } catch (error) {
        console.error("Error calculating price:", error);
        setEstimatedCost(null);
        setError("Unable to calculate price. Please try adjusting your selections.");
        setIsCalculating(false);
      }
    }, 800); // Slight delay to show the calculation is "working"
  };
  
  // Helper function to get default ZIP codes for major cities
  const getDefaultZipForCity = (city) => {
    const cityZips = {
      'Austin': '78701',
      'Dallas': '75201',
      'Fort Worth': '76102',
      'Houston': '77002',
      'San Antonio': '78205',
      'Plano': '75023',
      'Frisco': '75034',
      'Irving': '75062',
      'Arlington': '76010',
      'Corpus Christi': '78401',
      'El Paso': '79901',
      'Lubbock': '79401',
      'Garland': '75040',
      'McKinney': '75069',
      'Midland': '79701'
    };
    
    return cityZips[city] || '75001'; // Default to a Dallas area ZIP
  };
  
  // Helper function to convert age group to descriptive text for API
  const getAgeGroupDescription = (ageGroup) => {
    switch(ageGroup) {
      case 'infant':
        return 'Infant: 0 months-17 months';
      case 'toddler':
        return 'Toddler: 18 months-35 months';
      case 'preschool':
        return 'Preschool: 3 years-5 years';
      case 'schoolAge':
        return 'School age: 5 years-12 years';
      default:
        return '';
    }
  };
  
  const createProgramsString = () => {
    let programs = [];
    
    if (programPreferences.educational) programs.push("Educational");
    if (programPreferences.montessori) programs.push("Montessori");
    if (programPreferences.language) programs.push("Language");
    if (programPreferences.extendedHours) programs.push("Extended Hours");
    if (programPreferences.weekend) programs.push("Weekend");
    if (programPreferences.meals) programs.push("Meals Provided");
    if (programPreferences.transportation) programs.push("Transportation");
    if (programPreferences.afterSchool) programs.push("After School");
    if (programPreferences.accredited) programs.push("Accredited");
    if (programPreferences.outdoorFocus) programs.push("Outdoor Focus");
    if (programPreferences.artsProgram) programs.push("Arts Program");
    if (programPreferences.securityFeatures) programs.push("Security Features");
    if (childDetails.specialNeeds) programs.push("Special Needs");
    
    return programs.join(", ");
  };
  
  const getStaffRatioForAge = (ageGroup) => {
    switch(ageGroup) {
      case 'infant': return "1:4";
      case 'toddler': return "1:6";
      case 'preschool': return "1:10";
      case 'schoolAge': return "1:15";
      default: return "1:8";
    }
  };
  
  // Helper function for rendering accessible checkboxes
  const renderAccessibleCheckbox = (id, label) => (
    <div className="custom-control custom-checkbox">
      <input
        type="checkbox"
        className="custom-control-input"
        id={id}
        name={id}
        checked={programPreferences[id]}
        onChange={handleProgramPreferencesChange}
      />
      <label className="custom-control-label" htmlFor={id}>
        {label}
      </label>
    </div>
  );
  
  const resetForm = () => {
    setLocation({
      city: '',
      zipCode: ''
    });
    
    setChildDetails({
      ageGroup: '',
      specialNeeds: false,
      numberOfChildren: 1,
      daysPerWeek: 5
    });
    
    setProgramPreferences({
      educational: false,
      montessori: false,
      language: false,
      extendedHours: false,
      weekend: false,
      meals: false,
      transportation: false,
      afterSchool: false,
      accredited: false,
      outdoorFocus: false,
      artsProgram: false,
      fullTimeOnly: false,
      securityFeatures: false
    });
    
    setEstimatedCost(null);
  };
  
  return (
    <div className="cost-estimator-page">
      <PageHeader 
        title="Daycare Cost Estimator"
        backgroundImage={estimatorImage}
      />
      
      <Container className="cost-estimator-container">
        <p className="estimator-description">
          Use this tool to estimate your monthly childcare costs based on your location, 
          child's age, and program preferences. Keep in mind that these are estimates and 
          actual costs may vary.
        </p>
      
      <Form className="estimator-form cost-estimator-form">
        <Card className="mb-4">
          <Card.Header className="mobile-responsive-header">Location Information</Card.Header>
          <Card.Body className="mobile-responsive-card-body">
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="city-select">City</Form.Label>
                  <Form.Select 
                    id="city-select"
                    className="mobile-friendly-select"
                    name="city"
                    value={location.city}
                    onChange={handleLocationChange}
                    required
                    disabled={isLoading}
                  >
                    <option value="">
                      {isLoading ? "Loading cities..." : "Select a city"}
                    </option>
                    {!isLoading && cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </Form.Select>
                  {isLoading && (
                    <Form.Text className="text-muted">
                      Loading available cities from database...
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="zip-code">ZIP Code (optional)</Form.Label>
                  <Form.Control
                    id="zip-code"
                    type="text"
                    name="zipCode"
                    value={location.zipCode}
                    onChange={handleLocationChange}
                    placeholder="Enter ZIP code for more accurate estimates"
                    isInvalid={!!zipCodeError}
                    maxLength={5}
                  />
                  <Form.Control.Feedback type="invalid">
                    {zipCodeError}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Texas ZIP codes only. If left blank, we'll use a default for your selected city.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        <Card className="mb-4">
          <Card.Header className="mobile-responsive-header">Child Information</Card.Header>
          <Card.Body className="mobile-responsive-card-body">
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="age-group">Age Group</Form.Label>
                  <Form.Select 
                    id="age-group"
                    className="mobile-friendly-select"
                    name="ageGroup"
                    value={childDetails.ageGroup}
                    onChange={handleChildDetailsChange}
                    required
                  >
                    <option value="">Select age group</option>
                    {ageGroups.map(age => (
                      <option key={age.value} value={age.value}>{age.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="number-of-children">Number of Children</Form.Label>
                  <Form.Select 
                    id="number-of-children"
                    className="mobile-friendly-select"
                    name="numberOfChildren"
                    value={childDetails.numberOfChildren}
                    onChange={handleChildDetailsChange}
                  >
                    {[1, 2, 3, 4, 5].map(num => (
                      <option key={num} value={num}>{num} {num === 1 ? 'child' : 'children'}</option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Sibling discounts may apply for multiple children
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="days-per-week">Days Per Week</Form.Label>
                  <Form.Select 
                    id="days-per-week"
                    className="mobile-friendly-select"
                    name="daysPerWeek"
                    value={childDetails.daysPerWeek}
                    onChange={handleChildDetailsChange}
                  >
                    {[2, 3, 4, 5].map(days => (
                      <option key={days} value={days}>{days} days/week</option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Part-time care is typically more expensive per day
                  </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-3 special-needs-checkbox">
                  <div className="custom-control custom-checkbox">
                    <input
                      type="checkbox"
                      className="custom-control-input"
                      id="specialNeeds"
                      name="specialNeeds"
                      checked={childDetails.specialNeeds}
                      onChange={handleChildDetailsChange}
                    />
                    <label className="custom-control-label" htmlFor="specialNeeds">
                      Special needs accommodations
                    </label>
                  </div>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        <Card className="mb-4">
          <Card.Header className="mobile-responsive-header">Program Preferences</Card.Header>
          <Card.Body className="mobile-responsive-card-body">
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  {renderAccessibleCheckbox("educational", "Educational program")}
                </Form.Group>
                <Form.Group className="mb-3">
                  {renderAccessibleCheckbox("montessori", "Montessori program")}
                </Form.Group>
                <Form.Group className="mb-3">
                  {renderAccessibleCheckbox("language", "Language/bilingual program")}
                </Form.Group>
                <Form.Group className="mb-3">
                  {renderAccessibleCheckbox("artsProgram", "Arts & music program")}
                </Form.Group>
                <Form.Group className="mb-3">
                  {renderAccessibleCheckbox("outdoorFocus", "Outdoor/nature focus")}
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  {renderAccessibleCheckbox("extendedHours", "Extended hours")}
                </Form.Group>
                <Form.Group className="mb-3">
                  {renderAccessibleCheckbox("weekend", "Weekend care")}
                </Form.Group>
                <Form.Group className="mb-3">
                  {renderAccessibleCheckbox("afterSchool", "After-school program")}
                </Form.Group>
                <Form.Group className="mb-3">
                  {renderAccessibleCheckbox("fullTimeOnly", "Full-time enrollment only")}
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  {renderAccessibleCheckbox("meals", "Meals provided")}
                </Form.Group>
                <Form.Group className="mb-3">
                  {renderAccessibleCheckbox("transportation", "Transportation")}
                </Form.Group>
                <Form.Group className="mb-3">
                  {renderAccessibleCheckbox("accredited", "Accredited facility")}
                </Form.Group>
                <Form.Group className="mb-3">
                  {renderAccessibleCheckbox("securityFeatures", "Advanced security features")}
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        <div className="button-group mobile-friendly-buttons">
          <Button 
            variant="primary"
            className="mobile-friendly-button"
            onClick={calculateEstimate}
            disabled={!location.city || !childDetails.ageGroup || isCalculating}
          >
            {isCalculating ? 'Calculating...' : 'Calculate Estimate'}
          </Button>
          <Button 
            variant="outline-secondary"
            className="mobile-friendly-button" 
            onClick={resetForm}
          >
            Reset
          </Button>
        </div>
      </Form>
      
      {error && (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      )}
      
      {estimatedCost && (
        <div className="estimate-result">
          <Card className="estimate-card">
            <Card.Header className="mobile-responsive-header"><h3>Estimated Monthly Cost</h3></Card.Header>
            <Card.Body className="mobile-responsive-card-body">
              <div className="price-display">
                <span className="currency">$</span>
                <span className="amount">{estimatedCost.price}</span>
                <span className="period">/month</span>
              </div>
              <div className="estimate-details">
                <h4>Pricing Breakdown:</h4>
                <div className="pricing-factors">
                  <div className="pricing-factor base-price">
                    <span className="factor-label">Base rate for {location.city}</span>
                    <span className="factor-value">Base price</span>
                  </div>
                  
                  {estimatedCost.adjustments.map((adjustment, index) => (
                    <div className="pricing-factor" key={index}>
                      <span className="factor-label">{adjustment.name}</span>
                      <span className={`factor-value ${adjustment.amount.startsWith('-') ? 'discount' : 'premium'}`}>
                        {adjustment.amount.startsWith('+') || adjustment.amount.startsWith('-') 
                          ? adjustment.amount 
                          : `+$${adjustment.amount}`}
                      </span>
                      <small className="factor-description">{adjustment.description}</small>
                    </div>
                  ))}
                  
                  <div className="pricing-factor total">
                    <span className="factor-label">Total Monthly Cost</span>
                    <span className="factor-value">${estimatedCost.price}</span>
                  </div>
                </div>
              </div>
              
              <div className="additional-factors mt-4">
                <h5>Additional Price Factors:</h5>
                <ul>
                  {childDetails.ageGroup === 'infant' && (
                    <li>
                      <strong>Infant Care:</strong> Typically 35-45% more expensive due to higher staff ratios required.
                    </li>
                  )}
                  {childDetails.ageGroup === 'toddler' && (
                    <li>
                      <strong>Toddler Care:</strong> Typically 25-35% more expensive than preschool rates.
                    </li>
                  )}
                  {programPreferences.accredited && (
                    <li>
                      <strong>Accredited Facility:</strong> Higher standards usually result in premium pricing.
                    </li>
                  )}
                  {location.zipCode && (
                    <li>
                      <strong>ZIP Code {location.zipCode}:</strong> Location-specific pricing factors applied.
                    </li>
                  )}
                </ul>
              </div>
              
              <p className="estimate-note mt-3">
                This estimate is based on your selections, regional averages, and Texas daycare pricing data. 
                Actual prices may vary based on specific daycare providers, their current capacity, 
                and other factors not included in this calculator.
              </p>
              <p className="estimate-tip">
                <strong>Tip:</strong> Contact multiple daycares in your area to compare prices and 
                available programs. Many providers offer sibling discounts, flexible payment plans, 
                and occasional promotional rates for new enrollments.
              </p>
            </Card.Body>
          </Card>
        </div>
      )}
      </Container>
    </div>
  );
};

export default CostEstimator;