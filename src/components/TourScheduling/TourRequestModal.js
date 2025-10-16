import React, { useState } from 'react';
import './TourRequestModal.css';

const TourRequestModal = ({ isOpen, onClose, selectedDaycares, onSubmit }) => {
  const [formData, setFormData] = useState({
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    parentAddress: '',
    numberOfChildren: 1,
    childrenAges: [''],
    preferredStartDate: '',
    availableDays: [],
    preferredTimeSlots: [],
    additionalNotes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlots = ['Morning (8am-12pm)', 'Afternoon (12pm-4pm)', 'Evening (4pm-6pm)', 'Flexible'];
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      if (name === 'availableDays') {
        setFormData(prev => ({
          ...prev,
          availableDays: checked
            ? [...prev.availableDays, value]
            : prev.availableDays.filter(day => day !== value)
        }));
      } else if (name === 'preferredTimeSlots') {
        setFormData(prev => ({
          ...prev,
          preferredTimeSlots: checked
            ? [...prev.preferredTimeSlots, value]
            : prev.preferredTimeSlots.filter(slot => slot !== value)
        }));
      }
    } else if (name === 'numberOfChildren') {
      const numChildren = parseInt(value) || 1;
      const newAges = Array(numChildren).fill('').map((_, i) => formData.childrenAges[i] || '');
      setFormData(prev => ({
        ...prev,
        numberOfChildren: numChildren,
        childrenAges: newAges
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleChildAgeChange = (index, value) => {
    const newAges = [...formData.childrenAges];
    newAges[index] = value;
    setFormData(prev => ({
      ...prev,
      childrenAges: newAges
    }));
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.parentName.trim()) {
      newErrors.parentName = 'Name is required';
    }
    
    if (!formData.parentEmail.trim()) {
      newErrors.parentEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parentEmail)) {
      newErrors.parentEmail = 'Invalid email format';
    }
    
    if (!formData.parentPhone.trim()) {
      newErrors.parentPhone = 'Phone number is required';
    }
    
    if (formData.availableDays.length === 0) {
      newErrors.availableDays = 'Please select at least one available day';
    }
    
    if (formData.preferredTimeSlots.length === 0) {
      newErrors.preferredTimeSlots = 'Please select at least one time slot';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      await onSubmit(formData);
      // Form will be reset by parent component
    } catch (error) {
      console.error('Error submitting tour request:', error);
      setErrors({ submit: 'Failed to submit request. Please try again.' });
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="tour-modal-overlay" onClick={onClose}>
      <div className="tour-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tour-modal-header">
          <h2>Schedule Daycare Tours</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="tour-modal-content">
          <div className="selected-daycares-summary">
            <h3>Selected Daycares ({selectedDaycares.length})</h3>
            <div className="daycares-list">
              {selectedDaycares.map(daycare => (
                <div key={daycare.operation_id} className="summary-daycare-item">
                  <span className="checkmark">✓</span>
                  <span>{daycare.operation_name}</span>
                </div>
              ))}
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="tour-request-form">
            <div className="form-section">
              <h3>Parent Information</h3>
              
              <div className="form-group">
                <label htmlFor="parentName">Full Name *</label>
                <input
                  type="text"
                  id="parentName"
                  name="parentName"
                  value={formData.parentName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className={errors.parentName ? 'error' : ''}
                />
                {errors.parentName && <span className="error-message">{errors.parentName}</span>}
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="parentEmail">Email Address *</label>
                  <input
                    type="email"
                    id="parentEmail"
                    name="parentEmail"
                    value={formData.parentEmail}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    className={errors.parentEmail ? 'error' : ''}
                  />
                  {errors.parentEmail && <span className="error-message">{errors.parentEmail}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="parentPhone">Phone Number *</label>
                  <input
                    type="tel"
                    id="parentPhone"
                    name="parentPhone"
                    value={formData.parentPhone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                    className={errors.parentPhone ? 'error' : ''}
                  />
                  {errors.parentPhone && <span className="error-message">{errors.parentPhone}</span>}
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="parentAddress">Address (Optional)</label>
                <input
                  type="text"
                  id="parentAddress"
                  name="parentAddress"
                  value={formData.parentAddress}
                  onChange={handleChange}
                  placeholder="Your home address"
                />
              </div>
            </div>
            
            <div className="form-section">
              <h3>Child Information</h3>
              
              <div className="form-group">
                <label htmlFor="numberOfChildren">Number of Children *</label>
                <select
                  id="numberOfChildren"
                  name="numberOfChildren"
                  value={formData.numberOfChildren}
                  onChange={handleChange}
                >
                  {[1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
              
              <div className="children-ages">
                <label>Children's Ages (years)</label>
                <div className="ages-grid">
                  {formData.childrenAges.map((age, index) => (
                    <input
                      key={index}
                      type="number"
                      min="0"
                      max="18"
                      value={age}
                      onChange={(e) => handleChildAgeChange(index, e.target.value)}
                      placeholder={`Child ${index + 1} age`}
                      className="age-input"
                    />
                  ))}
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="preferredStartDate">Preferred Start Date</label>
                <input
                  type="date"
                  id="preferredStartDate"
                  name="preferredStartDate"
                  value={formData.preferredStartDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            
            <div className="form-section">
              <h3>Tour Availability</h3>
              
              <div className="form-group">
                <label>Available Days for Tour *</label>
                <div className="checkbox-grid">
                  {daysOfWeek.map(day => (
                    <label key={day} className="checkbox-label">
                      <input
                        type="checkbox"
                        name="availableDays"
                        value={day}
                        checked={formData.availableDays.includes(day)}
                        onChange={handleChange}
                      />
                      <span>{day}</span>
                    </label>
                  ))}
                </div>
                {errors.availableDays && <span className="error-message">{errors.availableDays}</span>}
              </div>
              
              <div className="form-group">
                <label>Preferred Time Slots *</label>
                <div className="checkbox-grid">
                  {timeSlots.map(slot => (
                    <label key={slot} className="checkbox-label">
                      <input
                        type="checkbox"
                        name="preferredTimeSlots"
                        value={slot}
                        checked={formData.preferredTimeSlots.includes(slot)}
                        onChange={handleChange}
                      />
                      <span>{slot}</span>
                    </label>
                  ))}
                </div>
                {errors.preferredTimeSlots && <span className="error-message">{errors.preferredTimeSlots}</span>}
              </div>
            </div>
            
            <div className="form-section">
              <div className="form-group">
                <label htmlFor="additionalNotes">Additional Notes or Questions (Optional)</label>
                <textarea
                  id="additionalNotes"
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleChange}
                  placeholder="Any special requirements, questions, or information the daycare should know..."
                  rows="4"
                />
              </div>
            </div>
            
            {errors.submit && (
              <div className="submit-error">
                {errors.submit}
              </div>
            )}
            
            <div className="form-actions">
              <button type="button" onClick={onClose} className="cancel-btn">
                Cancel
              </button>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Submitting...' : `Send ${selectedDaycares.length} Tour Request${selectedDaycares.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TourRequestModal;
