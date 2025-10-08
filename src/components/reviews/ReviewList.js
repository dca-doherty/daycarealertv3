import React, { useState } from 'react';
import { FaThumbsUp, FaFlag, FaCheck, FaUserCircle, FaEdit, FaTrash, FaReply } from 'react-icons/fa';
import StarRating from './StarRating';
import '../../styles/ReviewList.css';

const VerificationBadge = () => (
  <div className="verification-badge" title="Verified Review">
    <FaCheck /> Verified
  </div>
);

const PendingBadge = () => (
  <div className="pending-badge" title="Pending Approval">
    Pending Approval
  </div>
);

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  } catch (err) {
    console.error('Error formatting date:', err);
    return 'Invalid date';
  }
};

const getCategoryLabel = (categoryValue) => {
  const categories = {
    'general': 'General Review',
    'safety': 'Safety Concern',
    'staff': 'Staff Feedback',
    'facility': 'Facility Issue',
    'positive': 'Positive Experience',
    'curriculum': 'Curriculum & Learning',
    'administration': 'Administration & Communication'
  };
  
  return categories[categoryValue] || 'General Review';
};

const getCategoryIcon = (categoryValue) => {
  switch(categoryValue) {
    case 'safety':
      return <span className="category-icon safety" role="img" aria-label="Warning">⚠️</span>;
    case 'staff':
      return <span className="category-icon staff" role="img" aria-label="People">👥</span>;
    case 'facility':
      return <span className="category-icon facility" role="img" aria-label="Building">🏢</span>;
    case 'positive':
      return <span className="category-icon positive" role="img" aria-label="Thumbs up">👍</span>;
    case 'curriculum':
      return <span className="category-icon curriculum" role="img" aria-label="Books">📚</span>;
    case 'administration':
      return <span className="category-icon administration" role="img" aria-label="Clipboard">📋</span>;
    default:
      return <span className="category-icon general" role="img" aria-label="Speech bubble">💬</span>;
  }
};

const confirmAction = (message) => {
  return window.confirm(message);
};

const ReviewItem = ({ review, onHelpfulClick, onReportClick, onRespond, onEdit, onDelete, currentUserId, isAdmin }) => {
  const [isHelpfulClicked, setIsHelpfulClicked] = useState(false);
  const [isReportClicked, setIsReportClicked] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [responseText, setResponseText] = useState('');

  const handleHelpfulClick = () => {
    if (!isHelpfulClicked) {
      setIsHelpfulClicked(true);
      onHelpfulClick(review.id);
    }
  };

  const handleReportClick = () => {
    if (!isReportClicked) {
      setIsReportClicked(true);
      onReportClick(review.id);
    }
  };
  
  const handleResponseSubmit = () => {
    if (responseText.trim()) {
      onRespond(review.id, responseText);
      setResponseText('');
      setShowResponse(false);
    }
  };
  
  const handleEditClick = () => {
    onEdit(review.id);
  };
  
  const handleDeleteClick = () => {
    if (confirmAction('Are you sure you want to delete this review? This action cannot be undone.')) {
      onDelete(review.id);
    }
  };
  
  const isOwnReview = currentUserId && review.userId === currentUserId;

  return (
    <div className={`review-item ${review.category ? `category-${review.category}` : ''} ${review.pending ? 'pending-review' : ''}`}>
      <div className="review-header">
        <div className="review-user">
          <FaUserCircle className="user-icon" />
          <div className="user-info">
            <div className="user-name">{review.userName}</div>
            <div className="review-meta">
              {formatDate(review.submittedAt)}
              {review.verified && <VerificationBadge />}
              {review.pending && <PendingBadge />}
              {review.category && (
                <div className="review-category">
                  {getCategoryIcon(review.category)}
                  {getCategoryLabel(review.category)}
                </div>
              )}
            </div>
          </div>
        </div>
        <StarRating value={review.rating} readOnly={true} size={16} />
      </div>
      
      <div className="review-content">
        <p>{review.text}</p>
        
        <div className="review-details">
          {review.experienceDate && (
            <span className="review-date">
              <strong>Experience Date:</strong> {formatDate(review.experienceDate)}
            </span>
          )}
          
          {(review.childAge || review.attendance) && (
            <div className="review-attendance">
              {review.childAge && <span><strong>Child's age:</strong> {review.childAge}</span>}
              {review.attendance && <span><strong>Attended:</strong> {review.attendance}</span>}
            </div>
          )}
          
          {review.photos && review.photos.length > 0 && (
            <div className="review-photos">
              {review.photos.map((photo, index) => (
                <img 
                  key={index} 
                  src={photo.url || photo} 
                  alt={`Attachment ${index + 1}`} 
                  className="review-photo"
                  onClick={() => window.open(photo.url || photo, '_blank')}
                />
              ))}
            </div>
          )}
        </div>
        
        {review.response && (
          <div className="admin-response">
            <div className="response-header">
              <strong>Response from management:</strong>
              {review.responseDate && <span className="response-date">{formatDate(review.responseDate)}</span>}
            </div>
            <p>{review.response}</p>
          </div>
        )}
      </div>
      
      <div className="review-footer">
        <div className="review-actions-left">
          <button 
            className={`review-action helpful ${isHelpfulClicked ? 'clicked' : ''}`}
            onClick={handleHelpfulClick}
            disabled={isHelpfulClicked}
            aria-label="Mark review as helpful"
          >
            <FaThumbsUp /> Helpful {review.helpfulCount > 0 && `(${review.helpfulCount})`}
          </button>
          
          <button 
            className={`review-action report ${isReportClicked ? 'clicked' : ''}`}
            onClick={handleReportClick}
            disabled={isReportClicked}
            aria-label="Report inappropriate review"
          >
            <FaFlag /> Report
          </button>
        </div>
        
        <div className="review-actions-right">
          {isAdmin && !review.response && (
            <button
              className="review-action respond"
              onClick={() => setShowResponse(!showResponse)}
              aria-label="Respond to review"
            >
              <FaReply /> Respond
            </button>
          )}
          
          {isOwnReview && (
            <>
              <button 
                className="review-action edit"
                onClick={handleEditClick}
                aria-label="Edit review"
              >
                <FaEdit /> Edit
              </button>
              <button 
                className="review-action delete"
                onClick={handleDeleteClick}
                aria-label="Delete review"
              >
                <FaTrash /> Delete
              </button>
            </>
          )}
        </div>
      </div>
      
      {showResponse && (
        <div className="response-form">
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Write a response to this review..."
            rows={3}
            className="form-control"
          />
          <div className="response-actions">
            <button 
              className="btn-cancel" 
              onClick={() => setShowResponse(false)}
              type="button"
            >
              Cancel
            </button>
            <button 
              className="btn-submit" 
              onClick={handleResponseSubmit}
              disabled={!responseText.trim()}
              type="button"
            >
              Submit Response
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ReviewList = ({ 
  reviews, 
  onHelpfulClick, 
  onReportClick, 
  onRespond, 
  onEdit, 
  onDelete, 
  currentUserId, 
  isAdmin = false 
}) => {
  const [sortOrder, setSortOrder] = useState('newest');
  const [filterRating, setFilterRating] = useState(0);
  const [filterCategory, setFilterCategory] = useState('');

  const getSortedReviews = () => {
    let filtered = [...reviews];
    
    // Filter by rating if needed
    if (filterRating > 0) {
      filtered = filtered.filter(review => review.rating === filterRating);
    }
    
    // Filter by category if needed
    if (filterCategory) {
      filtered = filtered.filter(review => review.category === filterCategory);
    }
    
    // Sort reviews based on selected sort order
    switch (sortOrder) {
      case 'newest':
        return filtered.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      case 'oldest':
        return filtered.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
      case 'highest':
        return filtered.sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return filtered.sort((a, b) => a.rating - b.rating);
      case 'helpful':
        return filtered.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
      default:
        return filtered;
    }
  };

  const sortedReviews = getSortedReviews();
  
  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((acc, review) => acc + (Number(review.rating) || 0), 0);
    return total / reviews.length;
  };
  
  const getRatingCounts = () => {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach(review => {
      const rating = Number(review.rating);
      if (!isNaN(rating) && rating >= 1 && rating <= 5) {
        counts[rating - 1]++;
      }
    });
    return counts.reverse(); // Reverse to show 5 stars first
  };
  
  const getCategoryCounts = () => {
    const counts = {};
    reviews.forEach(review => {
      if (review.category) {
        counts[review.category] = (counts[review.category] || 0) + 1;
      }
    });
    return counts;
  };
  
  const categoryCounts = getCategoryCounts();
  const ratingCounts = getRatingCounts();
  const totalReviews = reviews.length;
  const averageRating = getAverageRating();

  return (
    <div className="review-list-container">
      {reviews.length > 0 ? (
        <>
          <div className="review-summary">
            <div className="rating-overview">
              <div className="average-rating">
                <div className="rating-number">{isNaN(averageRating) ? '0.0' : averageRating.toFixed(1)}</div>
                <StarRating value={isNaN(averageRating) ? 0 : averageRating} readOnly={true} />
                <div className="total-reviews">{totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}</div>
              </div>
              
              <div className="rating-bars">
                {[5, 4, 3, 2, 1].map(star => (
                  <div 
                    key={star} 
                    className={`rating-bar-row ${filterRating === star ? 'active' : ''}`}
                    onClick={() => setFilterRating(filterRating === star ? 0 : star)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={filterRating === star}
                    aria-label={`Filter by ${star} star reviews`}
                  >
                    <div className="rating-bar-label">{star} Star</div>
                    <div className="rating-bar-container">
                      <div 
                        className="rating-bar-fill" 
                        style={{ width: `${totalReviews ? (ratingCounts[5-star] / totalReviews) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <div className="rating-bar-count">{ratingCounts[5-star]}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="review-filter-sort">
              <div className="active-filters">
                {filterRating > 0 && (
                  <div className="active-filter">
                    Showing only {filterRating}-star reviews
                    <button 
                      className="clear-filter" 
                      onClick={() => setFilterRating(0)}
                      aria-label="Clear star rating filter"
                    >
                      Clear
                    </button>
                  </div>
                )}
                
                {filterCategory && (
                  <div className="active-filter">
                    Showing only {getCategoryLabel(filterCategory)}
                    <button 
                      className="clear-filter" 
                      onClick={() => setFilterCategory('')}
                      aria-label="Clear category filter"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
              
              <div className="filter-sort-controls">
                <div className="filter-control">
                  <label htmlFor="category-filter">Filter by:</label>
                  <select 
                    id="category-filter"
                    value={filterCategory} 
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="filter-select"
                    aria-label="Filter reviews by category"
                  >
                    <option value="">All Categories</option>
                    <option value="general">General Reviews {categoryCounts.general ? `(${categoryCounts.general})` : ''}</option>
                    <option value="safety">Safety Concerns {categoryCounts.safety ? `(${categoryCounts.safety})` : ''}</option>
                    <option value="staff">Staff Feedback {categoryCounts.staff ? `(${categoryCounts.staff})` : ''}</option>
                    <option value="facility">Facility Issues {categoryCounts.facility ? `(${categoryCounts.facility})` : ''}</option>
                    <option value="positive">Positive Experiences {categoryCounts.positive ? `(${categoryCounts.positive})` : ''}</option>
                    <option value="curriculum">Curriculum & Learning {categoryCounts.curriculum ? `(${categoryCounts.curriculum})` : ''}</option>
                    <option value="administration">Administration {categoryCounts.administration ? `(${categoryCounts.administration})` : ''}</option>
                  </select>
                </div>
                
                <div className="sort-controls">
                  <label htmlFor="sort-order">Sort by:</label>
                  <select 
                    id="sort-order"
                    value={sortOrder} 
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="sort-select"
                    aria-label="Sort reviews"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="highest">Highest Rating</option>
                    <option value="lowest">Lowest Rating</option>
                    <option value="helpful">Most Helpful</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="review-items">
            {sortedReviews.map(review => (
              <ReviewItem 
                key={review.id} 
                review={review} 
                onHelpfulClick={onHelpfulClick} 
                onReportClick={onReportClick}
                onRespond={onRespond}
                onEdit={onEdit}
                onDelete={onDelete}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
              />
            ))}
          </div>
          
          {sortedReviews.length === 0 && (
            <div className="no-matching-reviews">
              <p>No reviews match your current filters. <button className="clear-all-filters" onClick={() => { setFilterRating(0); setFilterCategory(''); }}>Clear all filters</button></p>
            </div>
          )}
        </>
      ) : (
        <div className="no-reviews">
          <p>There are no reviews yet for this daycare.</p>
          <p>Be the first to share your experience and help other parents make informed decisions.</p>
        </div>
      )}
    </div>
  );
};

export default ReviewList;