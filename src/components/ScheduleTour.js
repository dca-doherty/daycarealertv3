import React, { useState, useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';
import '../styles/TableEnhancements.css';

const ScheduleTour = ({ daycare }) => {
  console.log('ScheduleTour rendered with daycare:', daycare);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    childCount: '1',
    ageGroups: [],
    comments: ''
  });
  
  const notificationContext = useNotification();
  console.log('Notification context:', notificationContext);
  
  // Safely extract showNotification or create a fallback
  const showNotification = (notification) => {
    try {
      if (notificationContext && typeof notificationContext.showNotification === 'function') {
        return notificationContext.showNotification(notification);
      } else {
        console.error('showNotification not available, would show:', notification);
        // Create a manual notification as fallback
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.top = '20px';
        div.style.right = '20px';
        div.style.background = notification.type === 'success' ? '#28a745' : '#17a2b8';
        div.style.color = 'white';
        div.style.padding = '15px';
        div.style.borderRadius = '5px';
        div.style.zIndex = '9999';
        div.textContent = notification.message;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), notification.duration || 5000);
      }
    } catch (err) {
      console.error('Error in showNotification fallback:', err);
    }
  };
  
  // Handle modal scrolling when opened
  useEffect(() => {
    if (showModal) {
      // Scroll to top of modal when opened
      const modalContent = document.querySelector('.schedule-modal-content');
      if (modalContent) {
        modalContent.scrollTop = 0;
      }
      
      // Make sure body doesn't scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [showModal]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
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
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
    
    // Debug - log the daycare object structure
    console.log('Daycare object structure:', JSON.stringify(daycare, null, 2));
    
    console.log('Tour request data to submit:', tourRequestData);
    
    try {
      // Log API URL for debugging
      const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:8082'}/api/tours`;
      console.log('Environment REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
      console.log('Submitting tour request to:', apiUrl);
      console.log('Tour request data:', tourRequestData);
      
      // Send the data to the backend API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tourRequestData)
      });
      
      console.log('API Response status:', response.status);
      
      const result = await response.json();
      console.log('API Response data:', result);
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit tour request');
      }
      
      console.log('Tour request submitted successfully:', result);
      
      // Check if daycare and its properties exist
      const daycareName = daycare?.operation_name || 'this daycare';
      console.log('Preparing to show notification for daycare:', daycareName);
      
      // Create a direct DOM notification to ensure something appears
      const directNotification = document.createElement('div');
      directNotification.style.position = 'fixed';
      directNotification.style.top = '20px';
      directNotification.style.right = '20px';
      directNotification.style.backgroundColor = '#28a745';
      directNotification.style.color = 'white';
      directNotification.style.padding = '15px';
      directNotification.style.borderRadius = '5px';
      directNotification.style.zIndex = '9999';
      directNotification.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
      directNotification.style.fontWeight = 'bold';
      directNotification.style.minWidth = '300px';
      directNotification.style.maxWidth = '400px';
      directNotification.textContent = `Your tour request for ${daycareName} has been submitted. They will contact you shortly.`;
      document.body.appendChild(directNotification);
      
      // Remove after 6 seconds
      setTimeout(() => {
        directNotification.style.opacity = '0';
        directNotification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => directNotification.remove(), 300);
      }, 6000);
      
      // Also try the context-based notification system
      showNotification({
        type: 'success',
        message: `Your tour request for ${daycareName} has been submitted. They will contact you shortly.`,
        duration: 6000
      });
      
      console.log('Notification function called successfully');
      
      // Hide the modal and reset form
      setShowModal(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        date: '',
        time: '',
        childCount: '1',
        ageGroups: [],
        comments: ''
      });
    } catch (error) {
      console.error('Error submitting tour request:', error);
      
      // Show error notification
      showNotification({
        type: 'error',
        message: `Failed to submit tour request: ${error.message}. Please try again.`,
        duration: 6000
      });
      
      // Fallback alert if notification system fails
      try {
        const errorNotification = document.createElement('div');
        errorNotification.style.position = 'fixed';
        errorNotification.style.top = '20px';
        errorNotification.style.right = '20px';
        errorNotification.style.backgroundColor = '#dc3545';
        errorNotification.style.color = 'white';
        errorNotification.style.padding = '15px';
        errorNotification.style.borderRadius = '5px';
        errorNotification.style.zIndex = '9999';
        errorNotification.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        errorNotification.style.fontWeight = 'bold';
        errorNotification.style.minWidth = '300px';
        errorNotification.style.maxWidth = '400px';
        errorNotification.textContent = `Failed to submit tour request: ${error.message}. Please try again.`;
        document.body.appendChild(errorNotification);
        
        setTimeout(() => {
          errorNotification.style.opacity = '0';
          errorNotification.style.transition = 'opacity 0.3s ease';
          setTimeout(() => errorNotification.remove(), 300);
        }, 6000);
      } catch (notificationError) {
        console.error('Error showing notification:', notificationError);
        alert(`Failed to submit tour request: ${error.message}. Please try again.`);
      }
    }
  };
  
  // Generate available times for the dropdown
  const getTimes = () => {
    const times = [];
    for (let i = 9; i <= 16; i++) {
      times.push(`${i}:00`);
      if (i !== 16) times.push(`${i}:30`);
    }
    return times;
  };
  
  // Get tomorrow's date as default
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };
  
  return (
    <>
      <button 
        className="schedule-tour-button"
        onClick={() => setShowModal(true)}
      >
        <span role="img" aria-label="calendar">📅</span>Tour
      </button>
      
      {showModal && (
        <div className="schedule-modal" onClick={(e) => {
          // Close when clicking outside the modal content
          if (e.target.className === 'schedule-modal') {
            setShowModal(false);
          }
        }}>
          <div className="schedule-modal-content">
            <div className="schedule-modal-header">
              <h3 className="schedule-modal-title">Schedule a Tour at {daycare.operation_name}</h3>
              <button 
                className="schedule-modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            
            <form className="schedule-form" onSubmit={handleSubmit}>
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
                    min={getTomorrowDate()}
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
                    {getTimes().map(time => (
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
              
              <div className="schedule-modal-footer">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-button"
                >
                  Schedule Tour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ScheduleTour;