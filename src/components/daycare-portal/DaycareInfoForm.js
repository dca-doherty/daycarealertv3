import React, { useState, useEffect, useCallback } from 'react';
import { Form, Button, Row, Col, Alert, Spinner, Card } from 'react-bootstrap';
import '../../styles/DaycarePortal.css';

const DaycareInfoForm = ({ daycareId }) => {
  const [formData, setFormData] = useState({
    accreditation_info: '',
    teacher_certifications: '',
    student_count_infants: 0,
    student_count_toddlers: 0,
    student_count_preschool: 0,
    student_count_school_age: 0,
    open_spots_infants: 0,
    open_spots_toddlers: 0,
    open_spots_preschool: 0,
    open_spots_school_age: 0,
    price_infants: '',
    price_toddlers: '',
    price_preschool: '',
    price_school_age: '',
    curriculum_details: '',
    staff_ratio_infants: '',
    staff_ratio_toddlers: '',
    staff_ratio_preschool: '',
    staff_ratio_school_age: '',
    hours_of_operation: '',
    security_features: '',
    meal_options: '',
    transportation_provided: false,
    amenities: []
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Amenities options
  const amenitiesOptions = [
    'Playground',
    'Indoor Play Area',
    'Outdoor Garden',
    'Computer Lab',
    'Library',
    'Music Room',
    'Art Studio',
    'Swimming Pool',
    'Security Cameras',
    'Secure Entry',
    'Meal Plan',
    'Special Needs Support',
    'Bilingual Education',
    'Transportation',
    'Extended Hours',
    'Weekend Care',
    'Summer Programs',
    'Field Trips'
  ];
  
  const fetchDaycareDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`https://api.daycarealert.com/api/daycare-portal/daycare-details`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch daycare details');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Convert amenities from string or object to array
        let amenities = [];
        
        if (data.data.amenities) {
          if (Array.isArray(data.data.amenities)) {
            amenities = data.data.amenities;
          } else if (typeof data.data.amenities === 'string') {
            try {
              amenities = JSON.parse(data.data.amenities);
            } catch (e) {
              console.error('Error parsing amenities JSON:', e);
            }
          }
        }
        
        // Update form data with fetched details
        setFormData({
          ...formData,
          ...data.data,
          amenities
        });
      }
    } catch (err) {
      console.error('Error fetching daycare details:', err);
      setError('Failed to load daycare details');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setFormData, setLoading, setError, formData]);
  
  useEffect(() => {
    fetchDaycareDetails();
  }, [fetchDaycareDetails]);
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle checkboxes
    if (type === 'checkbox') {
      if (name === 'transportation_provided') {
        setFormData({
          ...formData,
          [name]: checked
        });
      } else if (name.startsWith('amenity-')) {
        const amenity = name.replace('amenity-', '');
        
        if (checked) {
          // Add to amenities array
          setFormData({
            ...formData,
            amenities: [...formData.amenities, amenity]
          });
        } else {
          // Remove from amenities array
          setFormData({
            ...formData,
            amenities: formData.amenities.filter(a => a !== amenity)
          });
        }
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    // Clear any error or success messages when user edits form
    if (error) setError('');
    if (success) setSuccess('');
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const response = await fetch(`https://api.daycarealert.com/api/daycare-portal/daycare-details`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save daycare details');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Daycare information saved successfully!');
        
        // Update form data with any modified values from the server
        if (data.data) {
          let amenities = formData.amenities;
          
          if (data.data.amenities) {
            if (Array.isArray(data.data.amenities)) {
              amenities = data.data.amenities;
            } else if (typeof data.data.amenities === 'string') {
              try {
                amenities = JSON.parse(data.data.amenities);
              } catch (e) {
                console.error('Error parsing amenities JSON:', e);
              }
            }
          }
          
          setFormData({
            ...formData,
            ...data.data,
            amenities
          });
        }
      } else {
        setError(data.message || 'Failed to save daycare details');
      }
    } catch (err) {
      console.error('Error saving daycare details:', err);
      setError('Failed to save daycare details');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading daycare information...</p>
      </div>
    );
  }

  return (
    <div className="daycare-info-form">
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      <p className="mb-4">
        Complete the information below to keep your daycare profile up to date. This information will help parents find your daycare and understand your offerings.
      </p>
      
      <Form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">General Information</h5>
          </Card.Header>
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Label>Accreditations</Form.Label>
              <Form.Control
                as="textarea"
                name="accreditation_info"
                value={formData.accreditation_info || ''}
                onChange={handleInputChange}
                placeholder="List any accreditations your daycare has achieved (e.g., NAEYC, AdvancED)"
                rows={2}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Teacher Certifications</Form.Label>
              <Form.Control
                as="textarea"
                name="teacher_certifications"
                value={formData.teacher_certifications || ''}
                onChange={handleInputChange}
                placeholder="List typical certifications your teachers hold (e.g., CDA, ECE Degree)"
                rows={2}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Curriculum Details</Form.Label>
              <Form.Control
                as="textarea"
                name="curriculum_details"
                value={formData.curriculum_details || ''}
                onChange={handleInputChange}
                placeholder="Describe your curriculum approach (e.g., Montessori, Play-based, Academic)"
                rows={3}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Hours of Operation</Form.Label>
              <Form.Control
                type="text"
                name="hours_of_operation"
                value={formData.hours_of_operation || ''}
                onChange={handleInputChange}
                placeholder="e.g., Monday-Friday 7:00 AM - 6:00 PM"
              />
            </Form.Group>
          </Card.Body>
        </Card>
        
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">Enrollment & Capacity</h5>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <h6>Current Student Count</h6>
                <Form.Group className="mb-3">
                  <Form.Label>Infants (0-1 year)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    name="student_count_infants"
                    value={formData.student_count_infants || 0}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Toddlers (1-3 years)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    name="student_count_toddlers"
                    value={formData.student_count_toddlers || 0}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Preschool (3-5 years)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    name="student_count_preschool"
                    value={formData.student_count_preschool || 0}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>School Age (5+ years)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    name="student_count_school_age"
                    value={formData.student_count_school_age || 0}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <h6>Open Spots Available</h6>
                <Form.Group className="mb-3">
                  <Form.Label>Infants (0-1 year)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    name="open_spots_infants"
                    value={formData.open_spots_infants || 0}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Toddlers (1-3 years)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    name="open_spots_toddlers"
                    value={formData.open_spots_toddlers || 0}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Preschool (3-5 years)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    name="open_spots_preschool"
                    value={formData.open_spots_preschool || 0}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>School Age (5+ years)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    name="open_spots_school_age"
                    value={formData.open_spots_school_age || 0}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row className="mt-3">
              <Col md={6}>
                <h6>Staff-to-Child Ratios</h6>
                <Form.Group className="mb-3">
                  <Form.Label>Infants Ratio</Form.Label>
                  <Form.Control
                    type="text"
                    name="staff_ratio_infants"
                    value={formData.staff_ratio_infants || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., 1:4"
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Toddlers Ratio</Form.Label>
                  <Form.Control
                    type="text"
                    name="staff_ratio_toddlers"
                    value={formData.staff_ratio_toddlers || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., 1:6"
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Preschool Ratio</Form.Label>
                  <Form.Control
                    type="text"
                    name="staff_ratio_preschool"
                    value={formData.staff_ratio_preschool || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., 1:10"
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>School Age Ratio</Form.Label>
                  <Form.Control
                    type="text"
                    name="staff_ratio_school_age"
                    value={formData.staff_ratio_school_age || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., 1:12"
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <h6>Monthly Tuition Rates</h6>
                <Form.Group className="mb-3">
                  <Form.Label>Infants (0-1 year)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    name="price_infants"
                    value={formData.price_infants || ''}
                    onChange={handleInputChange}
                    placeholder="$"
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Toddlers (1-3 years)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    name="price_toddlers"
                    value={formData.price_toddlers || ''}
                    onChange={handleInputChange}
                    placeholder="$"
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Preschool (3-5 years)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    name="price_preschool"
                    value={formData.price_preschool || ''}
                    onChange={handleInputChange}
                    placeholder="$"
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>School Age (5+ years)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    name="price_school_age"
                    value={formData.price_school_age || ''}
                    onChange={handleInputChange}
                    placeholder="$"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">Facilities & Services</h5>
          </Card.Header>
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Label>Security Features</Form.Label>
              <Form.Control
                as="textarea"
                name="security_features"
                value={formData.security_features || ''}
                onChange={handleInputChange}
                placeholder="Describe security measures (e.g., cameras, keycard entry, background checks)"
                rows={2}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Meal Options</Form.Label>
              <Form.Control
                as="textarea"
                name="meal_options"
                value={formData.meal_options || ''}
                onChange={handleInputChange}
                placeholder="Describe meal program (e.g., breakfast and lunch provided, snacks included)"
                rows={2}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                id="transportation_provided"
                name="transportation_provided"
                label="Transportation provided to/from school"
                checked={formData.transportation_provided || false}
                onChange={handleInputChange}
              />
            </Form.Group>
            
            <Form.Group className="mb-4">
              <Form.Label>Amenities</Form.Label>
              <div className="amenities-grid">
                {amenitiesOptions.map(amenity => (
                  <Form.Check
                    key={amenity}
                    type="checkbox"
                    id={`amenity-${amenity}`}
                    name={`amenity-${amenity}`}
                    label={amenity}
                    checked={formData.amenities.includes(amenity)}
                    onChange={handleInputChange}
                  />
                ))}
              </div>
            </Form.Group>
          </Card.Body>
        </Card>
        
        <div className="d-grid">
          <Button
            variant="primary"
            type="submit"
            size="lg"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Daycare Information'}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default DaycareInfoForm;
