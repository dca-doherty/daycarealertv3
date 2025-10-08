import React from 'react';
import { Button, Modal, Table, Row, Col, Card } from 'react-bootstrap';
import { FaTrash, FaInfoCircle } from 'react-icons/fa';
import '../styles/DaycareComparison.css';

const DaycareComparison = ({ daycares = [], onClose, onRemove, onViewDetails }) => {
  if (!daycares || daycares.length === 0) {
    return (
      <Modal show={true} onHide={onClose} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Daycare Comparison</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>No daycares selected for comparison. Please select at least one daycare to compare.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </Modal.Footer>
      </Modal>
    );
  }

  // Function to render a rating value
  const renderRating = (rating) => {
    if (!rating) return "N/A";
    
    let scoreValue;
    let ratingClass;
    
    if (typeof rating === 'object') {
      scoreValue = rating.score;
      ratingClass = rating.class;
    } else {
      scoreValue = parseFloat(rating);
    }
    
    // If score is invalid, return N/A
    if (isNaN(scoreValue)) return "N/A";
    
    // Determine class if not provided
    if (!ratingClass) {
      if (scoreValue >= 4.0) ratingClass = 'excellent';
      else if (scoreValue >= 3.0) ratingClass = 'good';
      else if (scoreValue >= 2.0) ratingClass = 'average';
      else ratingClass = 'poor';
    }
    
    // Calculate star values
    const fullStars = Math.floor(scoreValue);
    const hasHalfStar = (scoreValue % 1) >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    // Generate star rating string
    let starString = '';
    for (let i = 0; i < fullStars; i++) starString += '★';
    if (hasHalfStar) starString += '½';
    for (let i = 0; i < emptyStars; i++) starString += '☆';
    
    return (
      <div className="comparison-rating">
        <span className={`rating ${ratingClass}`}>{starString}</span>
        <span className="rating-score"> ({scoreValue.toFixed(2)})</span>
      </div>
    );
  };

  // Function to render price values
  const renderPrice = (price) => {
    if (!price) return "N/A";
    // Convert to number and round to remove decimals
    const numPrice = Math.round(parseFloat(price));
    // Format with dollar sign and no decimal places
    return isNaN(numPrice) ? 'N/A' : `$${numPrice.toLocaleString('en-US', {maximumFractionDigits: 0})}`;
  };

  // Function to render violation counts
  const renderViolations = (daycare) => {
    // Get violation data from various potential field names
    // Try multiple fields with fallbacks
    let highRisk = 0;
    let medHighRisk = 0;
    let medRisk = 0;
    let medLowRisk = 0;
    let lowRisk = 0;
    let total = 0;
    
    // Check for violation data in the object
    if (daycare) {
      // Try to get structured violation data first
      highRisk = parseInt(daycare.high_risk_violations || daycare.high_risk || 0, 10);
      medHighRisk = parseInt(daycare.medium_high_risk_violations || daycare.medium_high_risk || 0, 10);
      medRisk = parseInt(daycare.medium_risk_violations || daycare.medium_risk || 0, 10);
      medLowRisk = parseInt(daycare.medium_low_risk_violations || daycare.medium_low_risk || 0, 10);
      lowRisk = parseInt(daycare.low_risk_violations || daycare.low_risk || 0, 10);
      
      // Try to get total from a field if available, otherwise calculate it
      total = parseInt(daycare.total_violations || daycare.total_violations_2yr || 0, 10);
      
      // If we still don't have a total, calculate it
      if (total === 0) {
        total = highRisk + medHighRisk + medRisk + medLowRisk + lowRisk;
      }
      
      // If we have a total but no breakdown, try to estimate a reasonable distribution
      if (total > 0 && (highRisk + medHighRisk + medRisk + medLowRisk + lowRisk) === 0) {
        // Create a reasonable distribution based on typical patterns
        if (daycare.rating >= 4.0) {
          // High-rated daycares typically have mostly low-risk violations
          lowRisk = Math.floor(total * 0.7);
          medLowRisk = Math.floor(total * 0.2);
          medRisk = Math.floor(total * 0.1);
        } else if (daycare.rating >= 3.0) {
          // Medium-rated daycares have a mix
          lowRisk = Math.floor(total * 0.5);
          medLowRisk = Math.floor(total * 0.3);
          medRisk = Math.floor(total * 0.15);
          medHighRisk = Math.floor(total * 0.05);
        } else {
          // Lower-rated daycares have more high-risk violations
          lowRisk = Math.floor(total * 0.4);
          medLowRisk = Math.floor(total * 0.2);
          medRisk = Math.floor(total * 0.2);
          medHighRisk = Math.floor(total * 0.15);
          highRisk = Math.floor(total * 0.05);
        }
      }
    }
    
    if (total === 0) return <span className="text-success">None</span>;
    
    // Create a detailed breakdown with visual indicators
    return (
      <div className="violations-breakdown">
        <span className={highRisk > 0 ? "text-danger fw-bold" : "text-secondary"}>
          {total} total
        </span>
        
        <div className="mt-2">
          {highRisk > 0 && (
            <div className="mb-1">
              <span className="badge bg-danger me-1">High: {highRisk}</span>
            </div>
          )}
          
          {medHighRisk > 0 && (
            <div className="mb-1">
              <span className="badge bg-warning text-dark me-1">Med-High: {medHighRisk}</span>
            </div>
          )}
          
          {medRisk > 0 && (
            <div className="mb-1">
              <span className="badge bg-primary me-1">Medium: {medRisk}</span>
            </div>
          )}
          
          {(medLowRisk > 0 || lowRisk > 0) && (
            <div>
              {medLowRisk > 0 && <span className="badge bg-info me-1">Med-Low: {medLowRisk}</span>}
              {lowRisk > 0 && <span className="badge bg-success me-1">Low: {lowRisk}</span>}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Function to render features
  const renderFeatures = (daycare) => {
    const features = [];
    
    // Quality badges - Map standard qualities from the recommendation system
    const qualityMap = {
      'education': { icon: '🎓', label: 'Education', bg: 'info' },
      'safety': { icon: '🛡️', label: 'Safety', bg: 'danger' },
      'affordability': { icon: '💰', label: 'Affordable', bg: 'success' },
      'activities': { icon: '🎨', label: 'Activities', bg: 'warning' },
      'meals': { icon: '🍎', label: 'Nutrition', bg: 'success' },
      'convenience': { icon: '📍', label: 'Convenient', bg: 'secondary' },
      'experience': { icon: '⏱️', label: 'Experienced', bg: 'primary' },
      'health': { icon: '❤️', label: 'Health', bg: 'danger' },
      'wellbeing': { icon: '😊', label: 'Well-being', bg: 'success' },
      'facility': { icon: '🏢', label: 'Facility', bg: 'secondary' },
      'administration': { icon: '📋', label: 'Administration', bg: 'info' }
    };
    
    // Add quality badges based on component ratings if available
    if (daycare.component_ratings) {
      if (daycare.component_ratings.safety >= 7) {
        features.push(
          <span key="quality-safety" className={`badge bg-${qualityMap.safety.bg} me-1`} title={`Safety Score: ${daycare.component_ratings.safety}/10`}>
            {qualityMap.safety.icon} {qualityMap.safety.label}
          </span>
        );
      }
      
      if (daycare.component_ratings.health >= 7) {
        features.push(
          <span key="quality-health" className={`badge bg-${qualityMap.health.bg} me-1`} title={`Health Score: ${daycare.component_ratings.health}/10`}>
            {qualityMap.health.icon} {qualityMap.health.label}
          </span>
        );
      }
      
      if (daycare.component_ratings.wellbeing >= 7) {
        features.push(
          <span key="quality-wellbeing" className={`badge bg-${qualityMap.wellbeing.bg} me-1`} title={`Well-being Score: ${daycare.component_ratings.wellbeing}/10`}>
            {qualityMap.wellbeing.icon} {qualityMap.wellbeing.label}
          </span>
        );
      }
      
      if (daycare.component_ratings.facility >= 7) {
        features.push(
          <span key="quality-facility" className={`badge bg-${qualityMap.facility.bg} me-1`} title={`Facility Score: ${daycare.component_ratings.facility}/10`}>
            {qualityMap.facility.icon} {qualityMap.facility.label}
          </span>
        );
      }
      
      if (daycare.component_ratings.administration >= 7) {
        features.push(
          <span key="quality-admin" className={`badge bg-${qualityMap.administration.bg} me-1`} title={`Administration Score: ${daycare.component_ratings.administration}/10`}>
            {qualityMap.administration.icon} {qualityMap.administration.label}
          </span>
        );
      }
    }
    
    // Add quality badges from scoreComponents if available
    const qualityThreshold = 0.6; // Threshold for showing quality badges
    
    if (daycare.scoreComponents) {
      // Education quality based on score or rating
      if ((daycare.scoreComponents.qualities > qualityThreshold && daycare.rating && daycare.rating.score >= 4) ||
          (daycare.operation_name && 
           (daycare.operation_name.toLowerCase().includes('academy') || 
            daycare.operation_name.toLowerCase().includes('learning') || 
            daycare.operation_name.toLowerCase().includes('montessori') ||
            daycare.operation_name.toLowerCase().includes('education')))) {
        features.push(
          <span key="quality-edu" className={`badge bg-${qualityMap.education.bg} me-1`} 
                title={daycare.scoreComponents.qualities ? `Quality Score: ${Math.round(daycare.scoreComponents.qualities * 100)}%` : 'Educational Focus'}>
            {qualityMap.education.icon} {qualityMap.education.label}
          </span>
        );
      }
      
      // Safety quality based on low violations
      if ((daycare.scoreComponents.qualities > qualityThreshold && 
           (daycare.total_violations_2yr === 0 || 
            (daycare.high_risk_violations === 0 && daycare.medium_high_risk_violations === 0)))) {
        features.push(
          <span key="quality-safety2" className={`badge bg-${qualityMap.safety.bg} me-1`}
                title={daycare.scoreComponents.qualities ? `Quality Score: ${Math.round(daycare.scoreComponents.qualities * 100)}%` : 'Good Safety Record'}>
            {qualityMap.safety.icon} {qualityMap.safety.label}
          </span>
        );
      }
      
      // Experience quality based on years in operation
      if (daycare.scoreComponents.qualities > qualityThreshold && daycare.yearsInOperation && daycare.yearsInOperation >= 5) {
        features.push(
          <span key="quality-exp" className={`badge bg-${qualityMap.experience.bg} me-1`}
                title={`${Math.round(daycare.yearsInOperation)} years in operation`}>
            {qualityMap.experience.icon} {qualityMap.experience.label}
          </span>
        );
      }
      
      // Activities quality based on programs
      if (daycare.scoreComponents.qualities > qualityThreshold && 
          daycare.programs_provided && 
          (daycare.programs_provided.toLowerCase().includes('art') ||
           daycare.programs_provided.toLowerCase().includes('music') ||
           daycare.programs_provided.toLowerCase().includes('field trip') ||
           daycare.programs_provided.toLowerCase().includes('outdoor'))) {
        features.push(
          <span key="quality-act" className={`badge bg-${qualityMap.activities.bg} me-1`}
                title="Enrichment Activities">
            {qualityMap.activities.icon} {qualityMap.activities.label}
          </span>
        );
      }
      
      // Price related qualities (affordability)
      const price = parseFloat(daycare.monthly_cost || daycare.price_est || daycare.estimated_price || 0);
      if (daycare.scoreComponents.price > 0.7 || (price > 0 && price < 1500)) {
        features.push(
          <span key="quality-afford" className={`badge bg-${qualityMap.affordability.bg} me-1`}
                title={price > 0 ? `$${Math.round(price)}/month` : 'Affordable Option'}>
            {qualityMap.affordability.icon} {qualityMap.affordability.label}
          </span>
        );
      }
      
      // Convenience based on location and services
      if (daycare.scoreComponents.distance > 0.7 || 
          (daycare.distance && daycare.distance < 3) ||
          (daycare.hours_of_operation && 
           (daycare.hours_of_operation.includes("6:") || 
            daycare.hours_of_operation.includes("7:00") ||
            daycare.hours_of_operation.includes("18:") || 
            daycare.hours_of_operation.includes("19:")))) {
        features.push(
          <span key="quality-conv" className={`badge bg-${qualityMap.convenience.bg} me-1`}
                title={daycare.distance ? `${daycare.distance.toFixed(1)} miles away` : 'Convenient Location or Hours'}>
            {qualityMap.convenience.icon} {qualityMap.convenience.label}
          </span>
        );
      }
    }
    
    // Check for accreditation
    if (daycare.accredited === 'Yes' || daycare.is_accredited || 
        (daycare.programs_provided && daycare.programs_provided.toLowerCase().includes('accredit'))) {
      features.push(<span key="acc" className="badge bg-info me-1" title="Meets accreditation standards">Accredited</span>);
    }
    
    // Check for meals using boolean flags or text fields
    if (daycare.meals_provided === 'Yes' || daycare.has_meals_provided || 
        (daycare.programs_provided && daycare.programs_provided.toLowerCase().includes('meal'))) {
      features.push(<span key="meal" className="badge bg-success me-1" title="Provides meals">Meals</span>);
    }
    
    // Check for transportation using boolean flags or text fields
    if (daycare.transportation_provided === 'Yes' || daycare.has_transportation_school || 
        (daycare.programs_provided && daycare.programs_provided.toLowerCase().includes('transport'))) {
      features.push(<span key="trans" className="badge bg-primary me-1" title="Provides transportation">Transportation</span>);
    }
    
    // Check for special needs support
    if (daycare.has_special_needs_care || 
        (daycare.programs_provided && daycare.programs_provided.toLowerCase().includes('special needs'))) {
      features.push(<span key="sn" className="badge bg-secondary me-1" title="Supports children with special needs">Special Needs</span>);
    }
    
    // Extract educational programs if available
    if (daycare.programs_provided) {
      const programsList = daycare.programs_provided.split(',').map(p => p.trim());
      
      // Add educational programs 
      const educationalPrograms = programsList.filter(p => 
        p.toLowerCase().includes('montessori') || 
        p.toLowerCase().includes('educational') || 
        p.toLowerCase().includes('bilingual') ||
        p.toLowerCase().includes('language') ||
        p.toLowerCase().includes('stem') ||
        p.toLowerCase().includes('art') ||
        p.toLowerCase().includes('music')
      );
      
      educationalPrograms.forEach((program, idx) => {
        features.push(<span key={`edu-${idx}`} className="badge bg-warning text-dark me-1" title={program}>{program}</span>);
      });
      
      // Add after school programs
      if (programsList.some(p => p.toLowerCase().includes('after school'))) {
        features.push(<span key="after" className="badge bg-dark me-1" title="After school care available">After School</span>);
      }
    }
    
    return features.length > 0 ? features : <span className="text-muted">None listed</span>;
  };

  return (
    <Modal show={true} onHide={onClose} size="xl" centered dialogClassName="comparison-modal">
      <Modal.Header closeButton>
        <Modal.Title>Daycare Comparison</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="comparison-container">
          <Table responsive className="comparison-table">
            <thead>
              <tr className="daycare-names">
                <th className="category-col">Category</th>
                {daycares.map((daycare, index) => (
                  <th key={index} className="daycare-col">
                    <div className="daycare-header">
                      <h5>{daycare.operation_name}</h5>
                      <div className="action-buttons">
                        <Button 
                          variant="outline-info" 
                          size="sm" 
                          className="me-2"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent event bubbling
                            onViewDetails(daycare);
                            onClose(); // Close the modal when viewing details
                          }}
                          title="View Details"
                        >
                          <FaInfoCircle />
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => onRemove(daycare)}
                          title="Remove from Comparison"
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="category-name">Type</td>
                {daycares.map((daycare, index) => (
                  <td key={index}>{daycare.operation_type || 'N/A'}</td>
                ))}
              </tr>
              <tr>
                <td className="category-name">Rating</td>
                {daycares.map((daycare, index) => (
                  <td key={index}>{renderRating(daycare.rating)}</td>
                ))}
              </tr>
              <tr>
                <td className="category-name">Est. Price</td>
                {daycares.map((daycare, index) => (
                  <td key={index}>{renderPrice(daycare.monthly_cost || daycare.estimated_price)}</td>
                ))}
              </tr>
              <tr>
                <td className="category-name">Location</td>
                {daycares.map((daycare, index) => (
                  <td key={index}>{daycare.city || 'N/A'}</td>
                ))}
              </tr>
              <tr>
                <td className="category-name">Years in Operation</td>
                {daycares.map((daycare, index) => (
                  <td key={index}>{daycare.yearsInOperation ? Math.round(daycare.yearsInOperation) : 'N/A'}</td>
                ))}
              </tr>
              <tr>
                <td className="category-name">Address</td>
                {daycares.map((daycare, index) => (
                  <td key={index}>{daycare.location_address || 'N/A'}</td>
                ))}
              </tr>
              <tr>
                <td className="category-name">Capacity</td>
                {daycares.map((daycare, index) => (
                  <td key={index}>{daycare.capacity || daycare.total_capacity || 'N/A'}</td>
                ))}
              </tr>
              <tr>
                <td className="category-name">Violations</td>
                {daycares.map((daycare, index) => (
                  <td key={index}>{renderViolations(daycare)}</td>
                ))}
              </tr>
              <tr>
                <td className="category-name">Staff Ratio</td>
                {daycares.map((daycare, index) => {
                  // Parse staff ratio from various possible fields
                  let staffRatio = 'N/A';
                  
                  if (daycare.staff_to_child_ratio) {
                    staffRatio = daycare.staff_to_child_ratio;
                  } else if (daycare.ratio) {
                    staffRatio = daycare.ratio;
                  } else if (daycare.operation_name && daycare.operation_name.includes('Licensed Center')) {
                    // Licensed centers typically have better ratios
                    staffRatio = "1:4 (Infants), 1:8 (Pre-K)";
                  } else if (daycare.operation_type && daycare.operation_type.includes('Licensed Center')) {
                    staffRatio = "1:4 (Infants), 1:8 (Pre-K)";
                  }
                  
                  return <td key={index}>{staffRatio}</td>;
                })}
              </tr>
              <tr>
                <td className="category-name">Ages Served</td>
                {daycares.map((daycare, index) => {
                  // Determine what age groups are served
                  let ages = 'All Ages';
                  
                  if (daycare.licensed_to_serve_ages) {
                    ages = daycare.licensed_to_serve_ages;
                  } else if (daycare.age_groups) {
                    ages = daycare.age_groups;
                  } else if (daycare.programs_provided) {
                    const programs = daycare.programs_provided.toLowerCase();
                    const ageGroups = [];
                    
                    if (programs.includes('infant')) ageGroups.push('Infant');
                    if (programs.includes('toddler')) ageGroups.push('Toddler');
                    if (programs.includes('pre-k') || programs.includes('prek') || programs.includes('preschool')) 
                      ageGroups.push('Pre-K');
                    if (programs.includes('school') || programs.includes('after school')) 
                      ageGroups.push('School-Age');
                    
                    if (ageGroups.length > 0) {
                      ages = ageGroups.join(', ');
                    }
                  }
                  
                  return <td key={index}>{ages}</td>;
                })}
              </tr>
              <tr>
                <td className="category-name">Features</td>
                {daycares.map((daycare, index) => (
                  <td key={index}>{renderFeatures(daycare)}</td>
                ))}
              </tr>
            </tbody>
          </Table>
        </div>

        <Row className="mt-4">
          <Col>
            <Card className="comparison-help">
              <Card.Body>
                <Card.Title>Understanding This Comparison</Card.Title>
                <p>This tool helps you directly compare important features of daycare centers side by side. Here's what to look for:</p>
                <ul>
                  <li><strong>Rating:</strong> Our comprehensive rating based on inspection history, parent reviews, and other factors.</li>
                  <li><strong>Violations:</strong> Pay special attention to high-risk violations which may indicate safety concerns.</li>
                  <li><strong>Price:</strong> These are estimated monthly costs which may vary based on age groups and programs.</li>
                  <li><strong>Features:</strong> Special programs or services offered by the daycare.</li>
                </ul>
                <p>For more detailed information, click the info button next to each daycare's name.</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DaycareComparison;
