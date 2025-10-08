import React, { useEffect, useState } from 'react';
import { getReviewsForDaycare } from '../utils/reviewsIntegration';
import '../styles/RatingExplanation.css';

/**
 * Component to explain how ratings and pricing are calculated
 */
const RatingExplanation = ({ rating, estimatedPrice, daycare }) => {
  const [reviewCount, setReviewCount] = useState(0);
  const [reviewScore, setReviewScore] = useState(null);
  
  // Get reviews from our integration system
  useEffect(() => {
    if (daycare && daycare.operation_number) {
      console.log(`[RatingExplanation] Initializing for daycare ${daycare.operation_number}`);
      
      // Log current rating for reference
      const currentRating = rating ? rating.score : 'unknown';
      console.log(`[RatingExplanation] Current daycare rating: ${currentRating}`);
      
      // Check for reviews in the global data store
      const reviews = getReviewsForDaycare(daycare.operation_number);
      console.log(`[RatingExplanation] Retrieved ${reviews.length} reviews from global store`);
      setReviewCount(reviews.length);
      
      // Calculate average rating if we have reviews
      if (reviews.length > 0) {
        const totalScore = reviews.reduce((sum, review) => sum + parseFloat(review.rating || 0), 0);
        const avgScore = totalScore / reviews.length;
        setReviewScore(avgScore);
        console.log(`[RatingExplanation] Calculated review score: ${avgScore.toFixed(2)} from ${reviews.length} reviews`);
        
        // Log individual review scores for debugging
        console.log(`[RatingExplanation] Review scores:`, reviews.map(r => parseFloat(r.rating || 0)));
      } else {
        console.log(`[RatingExplanation] No reviews found, using default review score`);
      }
      
      // Listen for review updates
      const handleDataUpdated = (event) => {
        // Only process if this is for our daycare
        if (!event.detail) {
          console.error('[RatingExplanation] Received invalid event with no detail', event);
          return;
        }
        
        if (event.detail.daycareId === daycare.operation_number) {
          console.log(`[RatingExplanation] Received dataUpdated event for our daycare ${daycare.operation_number}`);
          
          // Check if the event contains the updated daycare data
          if (event.detail.daycare) {
            console.log('[RatingExplanation] Event contains full daycare data');
            const updatedDaycare = event.detail.daycare;
            
            // Get reviews from the updated daycare object
            const eventReviews = updatedDaycare.reviews || [];
            console.log(`[RatingExplanation] Found ${eventReviews.length} reviews in event data`);
            
            // Update review count
            setReviewCount(eventReviews.length);
            
            // Update review score if we have reviews
            if (eventReviews.length > 0) {
              const totalScore = eventReviews.reduce((sum, review) => sum + parseFloat(review.rating || 0), 0);
              const avgScore = totalScore / eventReviews.length;
              setReviewScore(avgScore);
              console.log(`[RatingExplanation] Updated review score from event: ${avgScore.toFixed(2)} from ${eventReviews.length} reviews`);
              
              // Log review scores for debugging
              console.log(`[RatingExplanation] New review scores:`, eventReviews.map(r => parseFloat(r.rating || 0)));
            }
            
            // Log updated daycare rating for comparison
            const updatedRating = updatedDaycare.rating ? 
              (typeof updatedDaycare.rating === 'object' ? updatedDaycare.rating.score : updatedDaycare.rating) : 
              'unknown';
            console.log(`[RatingExplanation] Updated daycare rating: ${updatedRating} (was: ${currentRating})`);
          } else {
            console.log('[RatingExplanation] Event does not contain full daycare data, checking global store');
            
            // Get updated reviews from the global store
            const updatedReviews = getReviewsForDaycare(daycare.operation_number);
            console.log(`[RatingExplanation] Retrieved ${updatedReviews.length} reviews from global store after update`);
            
            // Update review count
            setReviewCount(updatedReviews.length);
            
            // Update review score if we have reviews
            if (updatedReviews.length > 0) {
              const totalScore = updatedReviews.reduce((sum, review) => sum + parseFloat(review.rating || 0), 0);
              const avgScore = totalScore / updatedReviews.length;
              setReviewScore(avgScore);
              console.log(`[RatingExplanation] Updated review score from store: ${avgScore.toFixed(2)} from ${updatedReviews.length} reviews`);
              
              // Log review scores for debugging
              console.log(`[RatingExplanation] New review scores:`, updatedReviews.map(r => parseFloat(r.rating || 0)));
            }
            
            // Log global store rating
            const storeDaycare = window.daycareDataStore && window.daycareDataStore[daycare.operation_number];
            if (storeDaycare) {
              const storeRating = storeDaycare.rating ? 
                (typeof storeDaycare.rating === 'object' ? storeDaycare.rating.score : storeDaycare.rating) : 
                'unknown';
              console.log(`[RatingExplanation] Rating in global store: ${storeRating} (was: ${currentRating})`);
            } else {
              console.warn('[RatingExplanation] Daycare not found in global store after update');
            }
          }
        } else if (event.detail.daycareId) {
          console.log(`[RatingExplanation] Ignoring event for different daycare: ${event.detail.daycareId}`);
        }
      };
      
      // Add event listener
      console.log(`[RatingExplanation] Adding daycareDataUpdated event listener for ${daycare.operation_number}`);
      window.addEventListener('daycareDataUpdated', handleDataUpdated);
      
      // Clean up function
      return () => {
        console.log(`[RatingExplanation] Removing daycareDataUpdated event listener for ${daycare.operation_number}`);
        window.removeEventListener('daycareDataUpdated', handleDataUpdated);
      };
    }
  }, [daycare, rating]);
  
  if (!rating) return null;
  
  // Format price
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(estimatedPrice);

  // Extract factors
  const factors = rating.factors || {};
  
  // Check if we have the updated violation categories
  const hasDetailedViolations = factors.violationsByCategory !== undefined;
  
  // Helper function to count violations by severity across categories
  const countViolationsBySeverity = (severity) => {
    // Removed special case for Meadow Oaks Academy to ensure unbiased treatment
    
    // PRIORITY 2: For ALL daycares, first try to get counts directly from the daycare object
    // This ensures consistency with what's displayed in the violations tab
    if (severity === 'high') {
      const directCount = parseInt(daycare.high_risk_violations || daycare.deficiency_high || 0, 10);
      if (!isNaN(directCount)) return directCount;
    } else if (severity === 'medium_high') {
      const directCount = parseInt(daycare.medium_high_risk_violations || daycare.deficiency_medium_high || 0, 10);
      if (!isNaN(directCount)) return directCount;
    } else if (severity === 'medium') {
      const directCount = parseInt(daycare.medium_risk_violations || daycare.deficiency_medium || 0, 10);
      if (!isNaN(directCount)) return directCount;
    } else if (severity === 'medium_low') {
      const directCount = parseInt(daycare.medium_low_risk_violations || daycare.deficiency_medium_low || 0, 10);
      if (!isNaN(directCount)) return directCount;
    } else if (severity === 'low') {
      const directCount = parseInt(daycare.low_risk_violations || daycare.deficiency_low || 0, 10);
      if (!isNaN(directCount)) return directCount;
    }
    
    // PRIORITY 3: If direct lookup fails, check if we have factors data for simple count
    if (factors && factors[`${severity}RiskViolations`] !== undefined) {
      return factors[`${severity}RiskViolations`] || 0;
    }
    
    // PRIORITY 4: If still no data, try to sum from violation categories (for new system)
    if (hasDetailedViolations && factors.violationsByCategory) {
      let total = 0;
      Object.keys(factors.violationsByCategory).forEach(category => {
        total += factors.violationsByCategory[category][severity] || 0;
      });
      return total;
    }
    
    // If all else fails, return 0
    return 0;
  };
  
  // Count violations by severity
  const highViolations = countViolationsBySeverity('high');
  const mediumHighViolations = countViolationsBySeverity('medium_high');
  const mediumViolations = countViolationsBySeverity('medium');
  const mediumLowViolations = countViolationsBySeverity('medium_low');
  const lowViolations = countViolationsBySeverity('low');
  
  // Get top violation categories
  const getTopCategories = () => {
    if (!hasDetailedViolations) return [];
    
    const categoryTotals = {};
    Object.keys(factors.violationsByCategory).forEach(category => {
      const categoryData = factors.violationsByCategory[category];
      categoryTotals[category] = (categoryData.high || 0) * 5 + 
                               (categoryData.medium_high || 0) * 4 + 
                               (categoryData.medium || 0) * 3 + 
                               (categoryData.medium_low || 0) * 2 + 
                               (categoryData.low || 0);
    });
    
    // Sort and get top 3 categories
    return Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .filter(entry => entry[1] > 0)
      .slice(0, 3)
      .map(entry => {
        // Format category name for display
        const name = entry[0].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return { name, count: entry[1] };
      });
  };
  
  const topCategories = getTopCategories();
  
  return (
    <div className="rating-explanation">
      <h3>Our Evidence-Based Rating System</h3>
      <p>Our daycare rating provides a comprehensive assessment using multiple quality components:</p>
      
      <div className="factor-grid">
        {/* VIOLATIONS COMPONENT - 60% OF SCORE */}
        <div className="factor-card">
          <h4>Violations Assessment <span className="weight-badge">60%</span></h4>
          <div className={`factor-impact ${factors.violations < 0 ? 'negative' : 'neutral'}`}>
            <span className="component-score">
              {factors?.componentScores?.violationScore?.score?.toFixed(1) || 
               (Math.max(1.0, 5.0 - (highViolations * 0.75 + mediumHighViolations * 0.3 + mediumViolations * 0.15 + 
                 mediumLowViolations * 0.05 + lowViolations * 0.03))).toFixed(1)} / 5.0
            </span>
          </div>
          <p>Based on violation history by severity:</p>
          <ul className="violation-breakdown">
            <li className="high-risk">High Risk: {highViolations}</li>
            <li className="medium-high-risk">Medium-High Risk: {mediumHighViolations}</li>
            <li className="medium-risk">Medium Risk: {mediumViolations}</li>
            <li className="medium-low-risk">Medium-Low Risk: {mediumLowViolations}</li>
            <li className="low-risk">Low Risk: {lowViolations}</li>
          </ul>
          
          {hasDetailedViolations && topCategories.length > 0 && (
            <div className="category-breakdown">
              <p>Top violation categories:</p>
              <ul>
                {topCategories.map((category, idx) => (
                  <li key={idx}>{category.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* PARENT REVIEWS COMPONENT - 20% OF SCORE */}
        <div className="factor-card">
          <h4>Parent Reviews <span className="weight-badge">20%</span></h4>
          <div className="factor-impact positive">
            <span className="component-score">
              {reviewScore ? reviewScore.toFixed(1) : 
               factors?.componentScores?.parentReviewScore?.score?.toFixed(1) || "3.0"} / 5.0
            </span>
          </div>
          <p>
            {reviewCount > 0 || factors?.componentScores?.parentReviewScore?.reviewCount > 0
             ? `Based on ${reviewCount || factors?.componentScores?.parentReviewScore?.reviewCount} parent ${(reviewCount || factors?.componentScores?.parentReviewScore?.reviewCount) === 1 ? 'review' : 'reviews'}`
             : "No parent reviews yet"}
          </p>
          <div className="review-note">
            <small>Parent reviews are weighted based on recency and helpfulness</small>
          </div>
        </div>
        
        {/* QUALITY INDICATORS COMPONENT - 20% OF SCORE */}
        <div className="factor-card">
          <h4>Quality Indicators <span className="weight-badge">20%</span></h4>
          <div className="factor-impact positive">
            <span className="component-score">
              {factors?.componentScores?.qualityScore?.score?.toFixed(1) || (3.0 + (factors?.quality || 0)).toFixed(1)} / 5.0
            </span>
          </div>
          <p>
            Based on years in operation: {rating.yearsInOperation || 0}
            {factors.accredited ? ", accreditation status" : ""}
            {factors.inspectionsPassed > 0 ? `, and ${factors.inspectionsPassed} clean inspections` : ""}
          </p>
          
          {(factors.programs && factors.programs.length > 0) || 
           (factors.specialServices && factors.specialServices.length > 0) ? (
            <div className="program-services-info">
              {factors.specialServices && factors.specialServices.length > 0 && (
                <div className="special-services">
                  <h5>Special Services</h5>
                  <ul className="services-list">
                    {factors.accredited ? <li>Accredited Facility</li> : null}
                    {factors.specialServices.map((service, idx) => (
                      <li key={idx}>{service}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {factors.programs && factors.programs.length > 0 && (
                <div className="programs">
                  <h5>Programs</h5>
                  <ul className="programs-list">
                    {factors.programs.map((program, idx) => (
                      <li key={idx}>{program}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {factors.staffToChildRatio && (
                <div className="ratio-info">
                  <small>Staff-to-Child Ratio: {factors.staffToChildRatio}</small>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
      
      <div className="violation-impact-explanation">
        <h4>Our Evidence-Based Rating Methodology</h4>
        <p>
          We've developed a comprehensive, research-informed rating system that considers multiple aspects of childcare quality:
        </p>
        <ul>
          <li><strong>Multi-Component Approach:</strong> Our rating combines violations data (60%), parent reviews (20%), and quality indicators (20%) for a more complete picture</li>
          <li><strong>Evidence-Based Weights:</strong> Component weights are calibrated based on research about what matters most for child development</li>
          <li><strong>Violation Category Impact:</strong> Violations are weighted by both severity and category (safety violations have 2-3x more impact than paperwork issues)</li>
          <li><strong>Time-Based Assessment:</strong> Newer violations have stronger impact; violations older than a year have minimal influence</li>
          <li><strong>Parent Voice:</strong> Parent reviews are now formally incorporated with weight given to recency and helpfulness</li>
          <li><strong>Accreditation Recognition:</strong> National accreditation and educational programming positively impact scores</li>
          <li><strong>Track Record Matters:</strong> Years in operation and inspection history are factored into the quality component</li>
        </ul>
        <p>
          This balanced approach provides a fairer, more accurate assessment of daycare quality. We continuously refine our methodology based on the latest early childhood research and parent feedback to ensure our ratings help families make informed decisions.
        </p>
      </div>
      
      <div className="rating-scale">
        <h4>Rating Scale</h4>
        <div className="scale-explanation">
          <div className="scale excellent">4.0-5.0: Excellent</div>
          <div className="scale good">3.0-3.9: Good</div>
          <div className="scale average">2.0-2.9: Average</div>
          <div className="scale poor">1.0-1.9: Poor</div>
        </div>
      </div>
      
      <h3>Estimated Monthly Price: {formattedPrice}</h3>
      <p>Our pricing estimate uses a machine learning-inspired model based on:</p>
      
      <div className="pricing-factors">
        <div className="pricing-factor">
          <h4>Location</h4>
          <p>Prices vary based on city income levels and real estate costs</p>
        </div>
        
        <div className="pricing-factor">
          <h4>Age Groups</h4>
          <p>Infant care costs more than preschool due to higher staffing requirements</p>
        </div>
        
        <div className="pricing-factor">
          <h4>Program Offerings</h4>
          <p>Special programs like language immersion or extended hours affect price</p>
        </div>
        
        <div className="pricing-factor">
          <h4>Quality Indicators</h4>
          <p>Higher-rated daycares typically command premium pricing</p>
        </div>
        
        <div className="pricing-factor">
          <h4>Market Competition</h4>
          <p>Areas with more daycare options often have more competitive pricing</p>
        </div>
      </div>
      
      <div className="disclaimer">
        <p><strong>Note:</strong> All ratings and pricing estimates are algorithmic approximations 
        based on available data. Always visit daycares in person and perform your own assessment 
        before making decisions.</p>
      </div>
    </div>
  );
};

export default RatingExplanation;