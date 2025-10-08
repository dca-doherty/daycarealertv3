/**
 * Utility to integrate review data with daycare ratings
 * 
 * This file helps resolve the issue where reviews fetched from the API
 * aren't being correctly integrated into the Quality Ratings tab.
 */

import { calculateRating } from './helpers';

/**
 * Updates a daycare object with review data and recalculates the rating
 * @param {Object} daycare - The daycare object to update
 * @param {Array} reviews - The array of reviews to integrate
 * @returns {Object} Updated daycare with reviews and new rating
 */
export const updateDaycareWithReviews = (daycare, reviews) => {
  if (!daycare || !reviews || !Array.isArray(reviews)) {
    console.log(`WARNING: Invalid data passed to updateDaycareWithReviews:`, {
      hasDaycare: !!daycare,
      hasReviews: !!reviews,
      isArray: reviews && Array.isArray(reviews)
    });
    return daycare;
  }
  
  console.log(`[DEBUG] updateDaycareWithReviews starting for daycare ${daycare.operation_number}`, {
    operation_name: daycare.operation_name,
    existing_rating: daycare.rating ? (typeof daycare.rating === 'object' ? daycare.rating.score : daycare.rating) : 'none',
    review_count: reviews.length
  });
  
  // Calculate the average review score
  let reviewScore = 3.0; // Default
  if (reviews.length > 0) {
    const total = reviews.reduce((sum, review) => sum + parseFloat(review.rating || 0), 0);
    reviewScore = total / reviews.length;
    
    console.log(`[DEBUG] Calculated review score: ${reviewScore.toFixed(2)} from ${reviews.length} reviews`);
    console.log(`[DEBUG] Review ratings:`, reviews.map(r => parseFloat(r.rating || 0)));
  }
  
  // Create an updated daycare object with the reviews and calculated scores
  const updatedDaycare = {
    ...daycare,
    reviews: reviews,
    // Add calculated review data to help other components
    parent_review_score: reviewScore,
    parent_review_count: reviews.length,
    // Force update these fields to ensure they're calculated correctly
    review_rating: reviewScore
  };
  
  // Save the original rating for comparison
  const originalRating = daycare.rating ? 
    (typeof daycare.rating === 'object' ? daycare.rating.score : daycare.rating) : 
    null;
  
  // Recalculate the rating with the new reviews
  console.log(`[DEBUG] Before recalculating rating for ${daycare.operation_number}`);
  const updatedRating = calculateRating(updatedDaycare);
  console.log(`[DEBUG] After recalculating rating for ${daycare.operation_number}:`, {
    score: updatedRating.score,
    stars: updatedRating.stars,
    class: updatedRating.class
  });
  
  // Include the new rating in the daycare object
  updatedDaycare.calculatedRating = updatedRating;
  
  // Add these properties directly to simplify updates in other components
  updatedDaycare.rating = updatedRating;
  
  console.log(`[RATING CHANGE] Daycare ${daycare.operation_name} (${daycare.operation_number}): 
    Original: ${originalRating !== null ? originalRating.toFixed(2) : 'N/A'}
    New: ${updatedRating.score.toFixed(2)}
    Change: ${originalRating !== null ? (updatedRating.score - originalRating).toFixed(2) : 'N/A'}
    Based on ${reviews.length} reviews with average score ${reviewScore.toFixed(2)}`);
  
  return updatedDaycare;
};

/**
 * Initialize the global reviews integration
 * Sets up the event listeners and handlers for reviews updates
 */
export const initializeReviewsIntegration = () => {
  console.log('[EVENT SYSTEM] Initializing reviews integration system');
  
  // Create a global store for daycare data
  if (!window.daycareDataStore) {
    window.daycareDataStore = {};
    console.log('[EVENT SYSTEM] Created global daycareDataStore');
  } else {
    console.log('[EVENT SYSTEM] Global daycareDataStore already exists with', 
      Object.keys(window.daycareDataStore).length, 'daycares');
  }
  
  // Remove any existing event listeners to prevent duplicates
  const existingHandler = window.daycareReviewsUpdatedHandler;
  if (existingHandler) {
    console.log('[EVENT SYSTEM] Removing existing daycareReviewsUpdated handler');
    window.removeEventListener('daycareReviewsUpdated', existingHandler);
  }
  
  // Create a new handler and store a reference to it
  const reviewsUpdatedHandler = (event) => {
    console.log('[EVENT SYSTEM] Received daycareReviewsUpdated event', event);
    
    if (!event.detail || !event.detail.daycareId || !event.detail.reviews) {
      console.error('[EVENT SYSTEM] Invalid event detail in daycareReviewsUpdated event', event.detail);
      return;
    }
    
    const { daycareId, reviews } = event.detail;
    console.log(`[EVENT SYSTEM] Processing reviews for daycare: ${daycareId}, got ${reviews.length} reviews`);
    
    // Update the global store with the new reviews
    if (window.daycareDataStore[daycareId]) {
      console.log(`[EVENT SYSTEM] Daycare ${daycareId} found in global store, updating with ${reviews.length} reviews`);
      
      // Get current rating before update for comparison
      const currentDaycare = window.daycareDataStore[daycareId];
      const currentRating = currentDaycare.rating ? 
        (typeof currentDaycare.rating === 'object' ? currentDaycare.rating.score : currentDaycare.rating) : 
        'unknown';
      
      console.log(`[EVENT SYSTEM] Current rating before update: ${currentRating}`);
      
      // Update the global store with the new data
      window.daycareDataStore[daycareId] = updateDaycareWithReviews(
        window.daycareDataStore[daycareId],
        reviews
      );
      
      // Log the updated rating for debugging
      const updatedDaycare = window.daycareDataStore[daycareId];
      const newRating = updatedDaycare.rating.score.toFixed(2);
      console.log(`[EVENT SYSTEM] Updated global store with new rating: ${newRating} (was: ${currentRating})`);
      
      // Make a copy of the daycare to dispatch with the event
      // This ensures components have immediate access to the updated data
      const daycareForEvent = { ...updatedDaycare };
      
      // Dispatch an event to notify components of the update
      const updateEvent = new CustomEvent('daycareDataUpdated', {
        detail: { 
          daycareId,
          updatedAt: new Date().toISOString(),
          // Include the full updated daycare object for immediate use
          daycare: daycareForEvent
        }
      });
      
      console.log(`[EVENT SYSTEM] Dispatching daycareDataUpdated event for daycare: ${daycareId} with rating ${newRating}`);
      window.dispatchEvent(updateEvent);
      
      // Log an auditable record for debugging
      console.log(`[RATING UPDATE COMPLETE] 
        Daycare: ${updatedDaycare.operation_name} (${daycareId})
        Previous rating: ${currentRating}
        New rating: ${newRating}
        Reviews: ${reviews.length}
        Event time: ${new Date().toISOString()}
      `);
    } else {
      console.warn(`[EVENT SYSTEM] Received review update for daycare: ${daycareId} but it's not in the global store`);
      console.log(`[EVENT SYSTEM] Current keys in store:`, Object.keys(window.daycareDataStore));
    }
  };
  
  // Store reference to the handler
  window.daycareReviewsUpdatedHandler = reviewsUpdatedHandler;
  
  // Set up the event handler for review updates
  window.addEventListener('daycareReviewsUpdated', reviewsUpdatedHandler);
  console.log('[EVENT SYSTEM] Added daycareReviewsUpdated event listener');
};

/**
 * Dispatch a reviews update event
 * Call this function when new reviews are fetched to notify the system
 */
export const dispatchReviewsUpdate = (daycareId, reviews) => {
  if (!daycareId) {
    console.error('[EVENT SYSTEM] Cannot dispatch review update: Missing daycareId');
    return;
  }
  
  if (!reviews || !Array.isArray(reviews)) {
    console.error('[EVENT SYSTEM] Cannot dispatch review update: Invalid reviews data', reviews);
    return;
  }
  
  console.log(`[EVENT SYSTEM] Preparing to dispatch reviews update for daycare ${daycareId}`);
  console.log(`[EVENT SYSTEM] Update contains ${reviews.length} reviews`);
  
  // Log reviews data for debugging
  if (reviews.length > 0) {
    console.log(`[EVENT SYSTEM] First review in update:`, {
      date: reviews[0].date || reviews[0].submittedAt,
      rating: reviews[0].rating,
      comment: reviews[0].comment ? reviews[0].comment.substring(0, 50) + '...' : 'No comment'
    });
    
    // Log review scores
    console.log(`[EVENT SYSTEM] Review ratings:`, reviews.map(r => parseFloat(r.rating || 0)));
    
    // Calculate average review score for logging
    const total = reviews.reduce((sum, review) => sum + parseFloat(review.rating || 0), 0);
    const avgScore = total / reviews.length;
    console.log(`[EVENT SYSTEM] Average review score in update: ${avgScore.toFixed(2)}`);
  }
  
  // Check if daycare is in the global store
  const existingDaycare = window.daycareDataStore && window.daycareDataStore[daycareId];
  if (existingDaycare) {
    console.log(`[EVENT SYSTEM] Daycare ${daycareId} exists in global store`);
    
    // Log existing rating for comparison
    const existingRating = existingDaycare.rating ? 
      (typeof existingDaycare.rating === 'object' ? existingDaycare.rating.score : existingDaycare.rating) : 
      'unknown';
    console.log(`[EVENT SYSTEM] Current rating in store before update: ${existingRating}`);
  } else {
    console.log(`[EVENT SYSTEM] Warning: Daycare ${daycareId} not found in global store before dispatching event`);
  }
  
  // Create a custom event with detailed timing information
  const eventDetail = { 
    daycareId, 
    reviews,
    dispatchTime: new Date().toISOString(),
    reviewCount: reviews.length
  };
  
  // Dispatch the update event
  console.log(`[EVENT SYSTEM] Dispatching daycareReviewsUpdated event for daycare ${daycareId}`);
  window.dispatchEvent(new CustomEvent('daycareReviewsUpdated', {
    detail: eventDetail
  }));
  
  console.log(`[EVENT SYSTEM] Successfully dispatched reviews update event for daycare ${daycareId}`);
};

/**
 * Store a daycare in the global store
 * Call this from the DaycareDetails component when a daycare is loaded
 */
export const storeDaycare = (daycare) => {
  if (!daycare) {
    console.error('[EVENT SYSTEM] Cannot store null daycare in global store');
    return;
  }
  
  if (!daycare.operation_number) {
    console.error('[EVENT SYSTEM] Cannot store daycare without operation_number', daycare);
    return;
  }
  
  // Initialize the global store if needed
  if (!window.daycareDataStore) {
    console.log('[EVENT SYSTEM] Creating global daycareDataStore');
    window.daycareDataStore = {};
  }
  
  // Check if daycare already exists in store
  const existingDaycare = window.daycareDataStore[daycare.operation_number];
  if (existingDaycare) {
    // Log existing rating for comparison
    const existingRating = existingDaycare.rating ? 
      (typeof existingDaycare.rating === 'object' ? existingDaycare.rating.score : existingDaycare.rating) : 
      'unknown';
    
    // Get new daycare rating
    const newRating = daycare.rating ? 
      (typeof daycare.rating === 'object' ? daycare.rating.score : daycare.rating) : 
      'unknown';
    
    console.log(`[EVENT SYSTEM] Updating existing daycare ${daycare.operation_number} (${daycare.operation_name}) in global store`);
    console.log(`[EVENT SYSTEM] Rating change: ${existingRating} → ${newRating}`);
  } else {
    console.log(`[EVENT SYSTEM] Adding new daycare ${daycare.operation_number} (${daycare.operation_name}) to global store`);
    
    // Log initial rating
    const initialRating = daycare.rating ? 
      (typeof daycare.rating === 'object' ? daycare.rating.score : daycare.rating) : 
      'unknown';
    console.log(`[EVENT SYSTEM] Initial rating: ${initialRating}`);
  }
  
  // Store the daycare data
  window.daycareDataStore[daycare.operation_number] = daycare;
  
  // Log information about the stored daycare
  console.log(`[EVENT SYSTEM] Successfully stored daycare ${daycare.operation_number} in global store`);
  console.log(`[EVENT SYSTEM] Global store now contains ${Object.keys(window.daycareDataStore).length} daycares`);
};

/**
 * Get reviews for a daycare from the global store
 */
export const getReviewsForDaycare = (daycareId) => {
  if (!daycareId) {
    console.error('[EVENT SYSTEM] Cannot get reviews: Missing daycareId');
    return [];
  }
  
  if (!window.daycareDataStore) {
    console.warn(`[EVENT SYSTEM] Global daycareDataStore doesn't exist yet, returning empty reviews for ${daycareId}`);
    return [];
  }
  
  if (!window.daycareDataStore[daycareId]) {
    console.warn(`[EVENT SYSTEM] Daycare ${daycareId} not found in global store, returning empty reviews`);
    return [];
  }
  
  const reviews = window.daycareDataStore[daycareId].reviews || [];
  console.log(`[EVENT SYSTEM] Retrieved ${reviews.length} reviews for daycare ${daycareId} from global store`);
  
  if (reviews.length > 0) {
    // Calculate average score for debugging
    const totalScore = reviews.reduce((sum, review) => sum + parseFloat(review.rating || 0), 0);
    const avgScore = totalScore / reviews.length;
    console.log(`[EVENT SYSTEM] Average review score: ${avgScore.toFixed(2)} from ${reviews.length} reviews`);
  }
  
  return reviews;
};

// Initialize the reviews integration system
initializeReviewsIntegration();