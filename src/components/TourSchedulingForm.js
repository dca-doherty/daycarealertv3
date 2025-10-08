import React, { useState } from 'react';
import { Button, Alert } from 'react-bootstrap';

const TourSchedulingForm = ({ daycare }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: getTomorrowDateString(),
    time: '',
    childCount: '1',
    ageGroups: [],
    comments: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  // Helper function to get tomorrow's date in YYYY-MM-DD format
  function getTomorrowDateString() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle checkbox changes
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => {
      if (checked) {
        return {
          ...prev,
          ageGroups: [...prev.ageGroups, name]
        };
      } else {
        return {
          ...prev,
          ageGroups: prev.ageGroups.filter(group => group !== name)
        };
      }
    });
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    
    try {
      // Prepare the data for the API
      const tourRequestData = {
        daycare_id: daycare?.operation_id || daycare?.id || 0,
        daycare_name: daycare?.operation_name || 'Unknown Daycare',
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        tour_date: formData.date,
        tour_time: formData.time,
        child_count: parseInt(formData.childCount),
        age_groups: formData.ageGroups,
        comments: formData.comments
      };
      
      console.log('Tour request data to submit:', tourRequestData);
      
      // Send the data to the backend API
      const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:8082'}/api/tours`;
      console.log('Submitting tour request to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tourRequestData)
      });
      
      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit tour request');
      }
      
      const result = await response.json();
      console.log('Tour request submitted successfully:', result);
      
      // Show success message
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting tour request:', error);
      setSubmitError('There was an error submitting your request. Please try again: ' + error.message);
    }
  };
  
  // If form has been submitted successfully, show confirmation
  if (submitted) {
    return (
      <Alert variant="success">
        <Alert.Heading>Tour Request Submitted!</Alert.Heading>
        <p>
          Thank you for your interest in {daycare.operation_name}. Your tour request has been submitted successfully.
        </p>
        <p>
          The daycare staff will contact you at {formData.email} or {formData.phone} to confirm your appointment.
        </p>
        <hr />
        <div className="d-flex justify-content-end">
          <Button variant="outline-success" onClick={() => setSubmitted(false)}>
            Submit Another Request
          </Button>
        </div>
      </Alert>
    );
  }
  
  return (
    <form className="schedule-form" onSubmit={handleSubmit}>
      {submitError && (
        <Alert variant="danger" className="mb-4">
          {submitError}
        </Alert>
      )}
      
      <div className="form-group">
        <label htmlFor="name">Your Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Full Name"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder="your@email.com"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="phone">Phone Number</label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          required
          placeholder="(123) 456-7890"
        />
      </div>
      
      <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="date">Preferred Date</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            min={getTomorrowDateString()}
            required
          />
        </div>
        
        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="time">Preferred Time</label>
          <select
            id="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            required
          >
            <option value="">Select a time</option>
            {['9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', 
              '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'].map(time => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="form-group">
        <label htmlFor="childCount">Number of Children</label>
        <select
          id="childCount"
          name="childCount"
          value={formData.childCount}
          onChange={handleChange}
          required
        >
          {[1, 2, 3, 4, 5].map(num => (
            <option key={num} value={num.toString()}>
              {num}
            </option>
          ))}
        </select>
      </div>
      
      <div className="form-group">
        <label>Age Groups (Select all that apply)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {['Infant (0-1)', 'Toddler (1-3)', 'Preschool (3-5)', 'School Age (5+)'].map(ageGroup => (
            <label key={ageGroup} style={{ display: 'flex', alignItems: 'center', marginRight: '10px' }}>
              <input
                type="checkbox"
                name={ageGroup}
                checked={formData.ageGroups.includes(ageGroup)}
                onChange={handleCheckboxChange}
                style={{ marginRight: '5px' }}
              />
              {ageGroup}
            </label>
          ))}
        </div>
      </div>
      
      <div className="form-group">
        <label htmlFor="comments">Additional Comments/Questions</label>
        <textarea
          id="comments"
          name="comments"
          value={formData.comments}
          onChange={handleChange}
          placeholder="Any specific questions or concerns..."
        />
      </div>
      
      <div className="form-submit mt-4">
        <Button 
          type="submit" 
          variant="primary"
        >
          Submit Tour Request
        </Button>
      </div>
    </form>
  );
};

export default TourSchedulingForm;