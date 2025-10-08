import React, { useState, useEffect } from 'react';
import StarRating from './StarRating';
import FileUpload from './FileUpload';
import { useAuth } from '../../context/AuthContext';
import '../../styles/ReviewForm.css';

const ReviewForm = ({ daycareId, daycareName, initialData, onSubmit, onCancel }) => {
  const { isAuthenticated, user } = useAuth();
  const [rating, setRating] = useState(initialData ? initialData.rating : 0);
  const [reviewText, setReviewText] = useState(initialData ? initialData.text : '');
  const [verificationDocs, setVerificationDocs] = useState(initialData?.photos || []);
  const [childAge, setChildAge] = useState(initialData?.childAge ? getChildAgeValue(initialData.childAge) : '');
  const [attendanceLength, setAttendanceLength] = useState(initialData?.attendance ? getAttendanceLengthValue(initialData.attendance) : '');
  const [category, setCategory] = useState(initialData ? initialData.category : '');
  const [experienceDate, setExperienceDate] = useState(initialData?.experienceDate ? new Date(initialData.experienceDate).toISOString().split('T')[0] : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Helper function to convert displayed child age to value
  function getChildAgeValue(displayText) {
    if (displayText?.includes('Infant')) return 'infant';
    if (displayText?.includes('Toddler')) return 'toddler';
    if (displayText?.includes('Preschool')) return 'preschool';
    if (displayText?.includes('School Age')) return 'schoolAge';
    return '';
  }

  // Helper function to convert displayed attendance length to value
  function getAttendanceLengthValue(displayText) {
    if (displayText?.includes('Less than 3 months')) return 'lessThan3Months';
    if (displayText?.includes('3-6 months')) return '3to6Months';
    if (displayText?.includes('6-12 months')) return '6to12Months';
    if (displayText?.includes('1-2 years')) return '1to2Years';
    if (displayText?.includes('More than 2 years')) return 'moreThan2Years';
    return '';
  }

  // Update form when initialData changes (e.g., when editing)
  useEffect(() => {
    if (initialData) {
      setRating(initialData.rating);
      setReviewText(initialData.text);
      setVerificationDocs(initialData.photos || []);
      setChildAge(getChildAgeValue(initialData.childAge));
      setAttendanceLength(getAttendanceLengthValue(initialData.attendance));
      setCategory(initialData.category || '');
      
      if (initialData.experienceDate) {
        try {
          setExperienceDate(new Date(initialData.experienceDate).toISOString().split('T')[0]);
        } catch (err) {
          console.error('Error parsing experience date:', err);
          setExperienceDate('');
        }
      }
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {};
    
    // Check if user is logged in
    if (!isAuthenticated()) {
      newErrors.auth = 'You must be logged in to submit a review';
    }
    
    if (rating === 0) {
      newErrors.rating = 'Please provide a rating';
    }
    
    if (reviewText.trim().length < 20) {
      newErrors.reviewText = 'Please provide a more detailed review (at least 20 characters)';
    }
    
    if (!category) {
      newErrors.category = 'Please select a category for your review';
    }
    
    if (!experienceDate) {
      newErrors.experienceDate = 'Please provide the date of your experience';
    } else {
      // Validate date is not in the future
      const selectedDate = new Date(experienceDate);
      const today = new Date();
      if (selectedDate > today) {
        newErrors.experienceDate = 'Experience date cannot be in the future';
      }
    }
    
    if (!childAge) {
      newErrors.childAge = 'Please select your child\'s age group';
    }
    
    if (!attendanceLength) {
      newErrors.attendanceLength = 'Please select how long your child has attended this daycare';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Scroll to the first error
      const firstError = document.querySelector('.form-error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setIsSubmitting(true);
    
    // Prepare the review data
    const reviewData = {
      daycareId, // This will be converted to operationNumber in ReviewSection
      rating,
      reviewText,
      category,
      experienceDate,
      verificationDocs,
      childAge,
      attendanceLength,
      userId: user?.id, // Include user ID if available
      userName: user?.name || 'Anonymous',
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };
    
    // Submit the review data
    onSubmit(reviewData);
    setIsSubmitting(false);
  };

  return (
    <div className="review-form-container">
      <div className="review-form-header">
        <h2>{initialData ? 'Edit Your Review' : `Write a Review for ${daycareName}`}</h2>
        <p className="review-form-description">
          Your honest feedback helps other parents make informed decisions. All reviews are verified for authenticity.
        </p>
      </div>

      {errors.auth && <div className="auth-error">{errors.auth}</div>}
      
      <form onSubmit={handleSubmit} className="review-form">
        <div className="form-group">
          <label>Your Overall Rating</label>
          <StarRating 
            value={rating} 
            onChange={setRating} 
            size={32}
          />
          {errors.rating && <div className="form-error">{errors.rating}</div>}
          <span className="rating-help">Click on a star to rate</span>
        </div>
        
        <div className="form-row">
          <div className="form-group half">
            <label>Review Category</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className={errors.category ? 'form-control error' : 'form-control'}
            >
              <option value="">Select Category</option>
              <option value="general">General Review</option>
              <option value="safety">Safety Concern</option>
              <option value="staff">Staff Complaint/Praise</option>
              <option value="facility">Facility Issue</option>
              <option value="positive">Positive Experience</option>
              <option value="curriculum">Curriculum & Learning</option>
              <option value="administration">Administration & Communication</option>
            </select>
            {errors.category && <div className="form-error">{errors.category}</div>}
          </div>
          
          <div className="form-group half">
            <label>Date of Experience</label>
            <input
              type="date"
              value={experienceDate}
              onChange={(e) => setExperienceDate(e.target.value)}
              className={errors.experienceDate ? 'form-control error' : 'form-control'}
              max={new Date().toISOString().split('T')[0]} // Limit to today
            />
            {errors.experienceDate && <div className="form-error">{errors.experienceDate}</div>}
          </div>
        </div>
        
        <div className="form-group">
          <label>Your Review</label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience with this daycare. What did you like? What could be improved? What should other parents know before enrolling their children?"
            rows={6}
            className={errors.reviewText ? 'form-control error' : 'form-control'}
          />
          {errors.reviewText && <div className="form-error">{errors.reviewText}</div>}
          <div className="character-count">
            {reviewText.length} characters ({Math.max(0, 20 - reviewText.length)} more needed)
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group half">
            <label>Child's Age Group</label>
            <select 
              value={childAge} 
              onChange={(e) => setChildAge(e.target.value)}
              className={errors.childAge ? 'form-control error' : 'form-control'}
            >
              <option value="">Select Age Group</option>
              <option value="infant">Infant (0-12 months)</option>
              <option value="toddler">Toddler (1-2 years)</option>
              <option value="preschool">Preschool (3-5 years)</option>
              <option value="schoolAge">School Age (6+ years)</option>
            </select>
            {errors.childAge && <div className="form-error">{errors.childAge}</div>}
          </div>
          
          <div className="form-group half">
            <label>Length of Attendance</label>
            <select 
              value={attendanceLength} 
              onChange={(e) => setAttendanceLength(e.target.value)}
              className={errors.attendanceLength ? 'form-control error' : 'form-control'}
            >
              <option value="">Select Duration</option>
              <option value="lessThan3Months">Less than 3 months</option>
              <option value="3to6Months">3-6 months</option>
              <option value="6to12Months">6-12 months</option>
              <option value="1to2Years">1-2 years</option>
              <option value="moreThan2Years">More than 2 years</option>
            </select>
            {errors.attendanceLength && <div className="form-error">{errors.attendanceLength}</div>}
          </div>
        </div>
        
        <div className="form-group">
          <label>Photos (Optional)</label>
          <p className="verification-help">
            You can upload photos of the facility, classroom, or your child's experience.
            Please ensure no other children are visible in the photos for privacy reasons.
          </p>
          <FileUpload 
            files={verificationDocs}
            onChange={setVerificationDocs}
            maxFiles={3}
            acceptedFileTypes={['image/*']}
          />
        </div>
        
        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : initialData ? 'Update Review' : 'Submit Review'}
          </button>
        </div>
        
        <div className="review-tos">
          By submitting this review, you agree to our Review Guidelines and confirm this is your honest, personal experience.
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;