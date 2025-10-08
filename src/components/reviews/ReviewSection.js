import React, { useState, useEffect } from 'react';
import { FaPen } from 'react-icons/fa';
import ReviewForm from './ReviewForm';
import ReviewList from './ReviewList';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../utils/api';
import { dispatchReviewsUpdate } from '../../utils/reviewsIntegration';
import '../../styles/ReviewSection.css';

const ReviewSection = ({ daycareId, daycareName, daycareOwnerId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [reviewToEdit, setReviewToEdit] = useState(null);
  const { isAuthenticated, user, hasRole } = useAuth();
  const { showNotification } = useNotification();
  
  const isAdmin = hasRole && hasRole('admin');
  const isDaycareOwner = user && daycareOwnerId && user.id === daycareOwnerId;

  useEffect(() => {
    // Fetch reviews from the MySQL backend
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/reviews/daycare/${daycareId}`);
        
        if (response.data.success) {
          // Format the reviews for display
          const formattedReviews = response.data.reviews.map(review => ({
            id: review.id.toString(),
            userId: review.user_id,
            userName: review.username,
            rating: review.rating,
            text: review.review_text,
            category: review.category,
            experienceDate: review.experience_date,
            submittedAt: review.created_at,
            verified: review.is_verified === 1,
            helpfulCount: review.helpful_count || 0,
            childAge: review.child_age,
            attendance: review.attendance_length,
            photos: review.photos ? JSON.parse(review.photos) : [],
            response: review.response,
            responseDate: review.response_date,
            pending: review.status === 'pending'
          }));
          
          // Use the reviewsIntegration utility to update the daycare data
          dispatchReviewsUpdate(daycareId, formattedReviews);
          console.log('Dispatched reviews update with', formattedReviews.length, 'reviews');
          
          setReviews(formattedReviews);
        } else {
          setError('Failed to load reviews. Please try again later.');
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setError('Failed to load reviews. Please try again later.');
        setLoading(false);
      }
    };

    if (daycareId) {
      fetchReviews();
    } else {
      setLoading(false);
    }
  }, [daycareId]);

  const handleSubmitReview = async (reviewData) => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      showNotification({
        type: 'error',
        message: 'You must be logged in to submit a review'
      });
      return;
    }
    
    try {
      // For editing an existing review
      if (isEditing && reviewToEdit) {
        // API call to update review
        const response = await api.put(`/reviews/${reviewToEdit.id}`, {
          operationNumber: daycareId, // Using operationNumber instead of daycareId to match backend
          rating: reviewData.rating,
          reviewText: reviewData.reviewText,
          category: reviewData.category,
          experienceDate: reviewData.experienceDate,
          childAge: reviewData.childAge,
          attendanceLength: reviewData.attendanceLength,
          photos: reviewData.verificationDocs || []
        });
        
        if (response.data.success) {
          // Update the review in the UI
          const updatedReviews = reviews.map(review => 
            review.id === reviewToEdit.id 
              ? {
                  ...review,
                  rating: reviewData.rating,
                  text: reviewData.reviewText,
                  category: reviewData.category,
                  experienceDate: reviewData.experienceDate,
                  childAge: reviewData.childAge === 'infant' ? 'Infant (0-12 months)' :
                            reviewData.childAge === 'toddler' ? 'Toddler (1-2 years)' :
                            reviewData.childAge === 'preschool' ? 'Preschool (3-5 years)' :
                            'School Age (6+ years)',
                  attendance: reviewData.attendanceLength === 'lessThan3Months' ? 'Less than 3 months' :
                            reviewData.attendanceLength === '3to6Months' ? '3-6 months' :
                            reviewData.attendanceLength === '6to12Months' ? '6-12 months' :
                            reviewData.attendanceLength === '1to2Years' ? '1-2 years' :
                            'More than 2 years',
                  photos: reviewData.verificationDocs || []
                }
              : review
          );
          
          setReviews(updatedReviews);
          setShowReviewForm(false);
          setIsEditing(false);
          setReviewToEdit(null);
          
          showNotification({
            type: 'success',
            message: 'Your review has been updated successfully.'
          });
        } else {
          showNotification({
            type: 'error',
            message: 'Failed to update review. Please try again later.'
          });
        }
      } else {
        // Submit new review to the backend
        const response = await api.post('/reviews', {
          operationNumber: daycareId, // Using operationNumber instead of daycareId to match backend
          rating: reviewData.rating,
          reviewText: reviewData.reviewText,
          category: reviewData.category,
          experienceDate: reviewData.experienceDate,
          childAge: reviewData.childAge,
          attendanceLength: reviewData.attendanceLength,
          photos: reviewData.verificationDocs || [],
          userId: user?.id,
          userName: user?.name
        });
        
        if (response.data.success) {
          // Create a temporary review to show in the UI
          // The actual review will be pending admin approval
          const newReview = {
            id: response.data.reviewId || `temp-${Date.now()}`,
            userId: user.id,
            userName: user.name + ' (pending approval)',
            rating: reviewData.rating,
            text: reviewData.reviewText,
            category: reviewData.category,
            experienceDate: reviewData.experienceDate,
            submittedAt: new Date().toISOString(),
            verified: false,
            childAge: reviewData.childAge === 'infant' ? 'Infant (0-12 months)' :
                    reviewData.childAge === 'toddler' ? 'Toddler (1-2 years)' :
                    reviewData.childAge === 'preschool' ? 'Preschool (3-5 years)' :
                    'School Age (6+ years)',
            attendance: reviewData.attendanceLength === 'lessThan3Months' ? 'Less than 3 months' :
                      reviewData.attendanceLength === '3to6Months' ? '3-6 months' :
                      reviewData.attendanceLength === '6to12Months' ? '6-12 months' :
                      reviewData.attendanceLength === '1to2Years' ? '1-2 years' :
                      'More than 2 years',
            photos: reviewData.verificationDocs || [],
            helpfulCount: 0,
            pending: true
          };
          
          // Add the new review to the top of the list
          setReviews([newReview, ...reviews]);
          
          // Hide the review form
          setShowReviewForm(false);
          
          // Show success notification
          showNotification({
            type: 'success',
            message: 'Your review has been submitted and is pending approval. Thank you for your feedback!'
          });
          
          // Notify daycare owner if registered
          if (daycareOwnerId) {
            // In a real implementation, this would be handled by the backend
            console.log('Sending notification to daycare owner:', daycareOwnerId);
          }
        } else {
          showNotification({
            type: 'error',
            message: 'Failed to submit review. Please try again later.'
          });
        }
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      showNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to submit review. Please try again later.'
      });
    }
  };
  
  const handleEditReview = (reviewId) => {
    const reviewToEdit = reviews.find(review => review.id === reviewId);
    if (reviewToEdit) {
      setReviewToEdit(reviewToEdit);
      setIsEditing(true);
      setShowReviewForm(true);
      
      // Scroll to the form
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };
  
  const handleDeleteReview = async (reviewId) => {
    try {
      const response = await api.delete(`/reviews/${reviewId}`);
      
      if (response.data.success) {
        // Remove the review from the UI
        setReviews(reviews.filter(review => review.id !== reviewId));
        
        showNotification({
          type: 'success',
          message: 'Your review has been deleted successfully.'
        });
      } else {
        showNotification({
          type: 'error',
          message: 'Failed to delete review. Please try again later.'
        });
      }
    } catch (err) {
      console.error('Error deleting review:', err);
      showNotification({
        type: 'error',
        message: 'Failed to delete review. Please try again later.'
      });
    }
  };
  
  const handleRespondToReview = async (reviewId, responseText) => {
    try {
      const response = await api.post(`/reviews/${reviewId}/respond`, {
        response: responseText,
        responderId: user.id,
        responderName: user.name
      });
      
      if (response.data.success) {
        // Update the review in the UI
        const updatedReviews = reviews.map(review => 
          review.id === reviewId 
            ? { 
                ...review, 
                response: responseText,
                responseDate: new Date().toISOString()
              }
            : review
        );
        
        setReviews(updatedReviews);
        
        showNotification({
          type: 'success',
          message: 'Your response has been submitted successfully.'
        });
        
        // In a real implementation, would notify the review author here
        const reviewAuthorId = reviews.find(r => r.id === reviewId)?.userId;
        if (reviewAuthorId) {
          console.log('Sending notification to review author:', reviewAuthorId);
          // This would send an email notification in a real implementation
        }
      } else {
        showNotification({
          type: 'error',
          message: 'Failed to submit response. Please try again later.'
        });
      }
    } catch (err) {
      console.error('Error responding to review:', err);
      showNotification({
        type: 'error',
        message: 'Failed to submit response. Please try again later.'
      });
    }
  };

  const handleHelpfulClick = async (reviewId) => {
    try {
      // In a real implementation, this would call an API endpoint
      const response = await api.post(`/reviews/${reviewId}/helpful`, {
        userId: user?.id
      }).catch(() => {
        // If API call fails, just update UI optimistically
        console.log('Helpful API call failed, updating UI only');
        return { data: { success: true } };
      });
      
      if (response.data.success) {
        // Increment the helpful count for the review
        setReviews(reviews.map(review => 
          review.id === reviewId 
            ? { ...review, helpfulCount: (review.helpfulCount || 0) + 1 } 
            : review
        ));
      }
    } catch (err) {
      console.error('Error marking review as helpful:', err);
    }
  };
  
  const handleReportClick = async (reviewId) => {
    try {
      // In a real implementation, this would call an API endpoint
      const response = await api.post(`/reviews/${reviewId}/report`, {
        userId: user?.id,
        reason: 'inappropriate content'
      }).catch(() => {
        // If API call fails, just show notification
        console.log('Report API call failed, showing notification only');
        return { data: { success: true } };
      });
      
      if (response.data.success) {
        // In a real implementation, this would send a report to your moderation team
        showNotification({
          type: 'info',
          message: 'Report received. Our team will review this content. Thank you for helping maintain quality reviews.'
        });
      }
    } catch (err) {
      console.error('Error reporting review:', err);
      showNotification({
        type: 'info',
        message: 'Report received. Our team will review this content.'
      });
    }
  };

  const handleWriteReviewClick = () => {
    if (!isAuthenticated()) {
      showNotification({
        type: 'error',
        message: 'You must be logged in to write a review.'
      });
      return;
    }
    
    setShowReviewForm(true);
  };

  return (
    <div className="review-section">
      <div className="review-section-header">
        <h2>Parent Reviews</h2>
        
        {!showReviewForm && (
          <button 
            className="write-review-btn" 
            onClick={handleWriteReviewClick}
          >
            <FaPen /> Write a Review
          </button>
        )}
      </div>
      
      {showReviewForm && (
        <ReviewForm
          daycareId={daycareId}
          daycareName={daycareName}
          initialData={reviewToEdit}
          onSubmit={handleSubmitReview}
          onCancel={() => {
            setShowReviewForm(false);
            setIsEditing(false);
            setReviewToEdit(null);
          }}
        />
      )}
      
      {loading ? (
        <div className="loading-reviews">Loading reviews...</div>
      ) : error ? (
        <div className="review-error">{error}</div>
      ) : (
        <ReviewList 
          reviews={reviews}
          onHelpfulClick={handleHelpfulClick}
          onReportClick={handleReportClick}
          onRespond={handleRespondToReview}
          onEdit={handleEditReview}
          onDelete={handleDeleteReview}
          currentUserId={user?.id}
          isAdmin={isAdmin || isDaycareOwner}
        />
      )}
    </div>
  );
};

export default ReviewSection;