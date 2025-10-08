import standardsMapping from '../data/standards_mapping.json';

/**
 * Calculates an evidence-based rating for a daycare facility using multiple components:
 * 1. Violation assessment (with calibrated weights based on risk impact)
 * 2. Parent review scores (weighted by recency and helpfulness)
 * 3. Quality indicators (accreditation, experience, programs)
 * 
 * This holistic approach provides a more accurate representation of childcare quality
 * rather than relying solely on compliance data.
 * 
 * @param {Object} daycare - The daycare data object with violation and review data
 * @returns {Object} Rating details including score, stars display, class, and factors
 */
export function calculateRevisedRating(daycare) {
  // If no daycare data provided, return default rating
  if (!daycare) {
    return {
      score: 3.0,
      stars: '★★★',
      class: 'average',
      yearsInOperation: 0,
      factors: {}
    };
  }
  // Enable logging for debugging when needed
  const enableDebug = false;
  
  if (enableDebug) {
    console.log('DEBUG: Starting rating calculation for daycare', {
      operation_name: daycare.operation_name,
      operation_number: daycare.operation_number,
      issuance_date: daycare.issuance_date || daycare.license_issue_date,
      has_violations_array: daycare.violations && Array.isArray(daycare.violations),
      violations_count: daycare.violations && Array.isArray(daycare.violations) ? daycare.violations.length : 'N/A',
      has_reviews: daycare.reviews && Array.isArray(daycare.reviews),
      review_count: daycare.reviews && Array.isArray(daycare.reviews) ? daycare.reviews.length : 'N/A',
      high_risk: daycare.deficiency_high,
      medium_high_risk: daycare.deficiency_medium_high,
      medium_risk: daycare.deficiency_medium,
      medium_low_risk: daycare.deficiency_medium_low,
      low_risk: daycare.deficiency_low
    });
  }
  
  // Extract years in operation for informational purposes
  const currentYear = new Date().getFullYear();
  let yearsInOperation = 0;
  if (daycare.issuance_date || daycare.license_issue_date) {
    const dateString = daycare.issuance_date || daycare.license_issue_date;
    try {
      const issuanceYear = new Date(dateString).getFullYear();
      if (!isNaN(issuanceYear)) {
        yearsInOperation = currentYear - issuanceYear;
      }
    } catch (e) {
      // Handle date parsing errors silently
    }
  }
  
  // Alternative calculation if license data is missing
  if (yearsInOperation <= 0 && daycare.years_of_operation) {
    yearsInOperation = parseFloat(daycare.years_of_operation);
  }
  
  // Start with a baseline rating of 5.0 stars (all daycares start at maximum rating)
  let baseScore = 5.0;
  
  // --- COMPONENT 1: VIOLATIONS IMPACT (60% of overall rating) ---
  // Process violations using the revised standards mapping
  const violations = processViolations(daycare);
  
  // Apply evidence-based violation deductions calibrated through research
  // These weights are derived from expert input and developmental impact studies
  let violationDeduction = 0;
  
  // Define impact multipliers for different categories based on child development research
  // These multipliers document the relative importance of each category
  // For actual impact, each category's effect is directly coded in the sections below
  // eslint-disable-next-line no-unused-vars
  const categoryImpactReference = {
    safety: 1.2,            // Highest impact - direct physical safety concerns
    child_well_being: 1.1,  // High impact - emotional well-being and development
    child_health: 1.0,      // High impact - health and wellness
    sleep_rest: 0.9,        // Significant impact - sleep affects development
    nutrition: 0.8,         // Moderate impact - nutrition affects development
    transportation: 0.7,    // Moderate impact - safety outside facility
    facility: 0.6,          // Moderate impact - physical environment
    administrative: 0.5,    // Lower impact - staff qualifications/training
    environmental_feature: 0.4, // Lower impact - environment quality
    paperwork: 0.2,         // Lowest impact - documentation issues
    other: 0.5              // Default for uncategorized
  };
  
  // Safety violations - high impact
  if (violations.safety.high > 0) {
    violationDeduction += Math.min(1.5, 0.75 + (violations.safety.high - 1) * 0.25);
  }
  if (violations.safety.medium_high > 0) {
    violationDeduction += Math.min(0.6, 0.3 + (violations.safety.medium_high - 1) * 0.1);
  }
  if (violations.safety.medium > 0) {
    violationDeduction += Math.min(0.3, 0.15 + (violations.safety.medium - 1) * 0.05);
  }
  if (violations.safety.medium_low > 0 || violations.safety.low > 0) {
    violationDeduction += Math.min(0.1, 0.05 + (violations.safety.medium_low + violations.safety.low - 1) * 0.01);
  }
  
  // Child Health violations - medium to high impact depending on severity
  if (violations.child_health.high > 0) {
    violationDeduction += Math.min(0.9, 0.45 + (violations.child_health.high - 1) * 0.15);
  }
  if (violations.child_health.medium_high > 0) {
    violationDeduction += Math.min(0.3, 0.15 + (violations.child_health.medium_high - 1) * 0.03);
  }
  if (violations.child_health.medium > 0) {
    violationDeduction += Math.min(0.15, 0.05 + (violations.child_health.medium - 1) * 0.02);
  }
  if (violations.child_health.medium_low > 0 || violations.child_health.low > 0) {
    // Only consider low severity health violations if there are MANY recent ones (10+ within past 6 months)
    // First, filter for recent violations (past 6 months)
    const recentLowSeverityHealthViolations = countRecentLowSeverityHealthViolations(daycare);
    
    // Only apply deduction if there are 10+ recent low severity health violations
    if (recentLowSeverityHealthViolations >= 10) {
      violationDeduction += Math.min(0.3, 0.1 + (recentLowSeverityHealthViolations - 10) * 0.02);
    }
    // Otherwise, no impact on rating
  }
  
  // Child Well-being violations - high impact
  if (violations.child_well_being.high > 0) {
    violationDeduction += Math.min(1.3, 0.65 + (violations.child_well_being.high - 1) * 0.3);
  }
  if (violations.child_well_being.medium_high > 0) {
    violationDeduction += Math.min(0.6, 0.3 + (violations.child_well_being.medium_high - 1) * 0.1);
  }
  if (violations.child_well_being.medium > 0) {
    violationDeduction += Math.min(0.3, 0.15 + (violations.child_well_being.medium - 1) * 0.05);
  }
  if (violations.child_well_being.medium_low > 0 || violations.child_well_being.low > 0) {
    violationDeduction += Math.min(0.1, 0.05 + (violations.child_well_being.medium_low + violations.child_well_being.low - 1) * 0.01);
  }
  
  // Administrative violations - medium impact
  if (violations.administrative.high > 0) {
    violationDeduction += Math.min(0.6, 0.3 + (violations.administrative.high - 1) * 0.1);
  }
  if (violations.administrative.medium_high > 0) {
    violationDeduction += Math.min(0.3, 0.15 + (violations.administrative.medium_high - 1) * 0.05);
  }
  if (violations.administrative.medium > 0) {
    violationDeduction += Math.min(0.15, 0.05 + (violations.administrative.medium - 1) * 0.02);
  }
  if (violations.administrative.medium_low > 0 || violations.administrative.low > 0) {
    // Lower administrative violations have minimal impact
    const count = violations.administrative.medium_low + violations.administrative.low;
    // Only apply deduction if there are several administrative issues
    violationDeduction += (count >= 3) ? Math.min(0.05, 0.01 * (count - 2)) : 0;
  }
  
  // Facility violations - medium impact
  if (violations.facility.high > 0) {
    violationDeduction += Math.min(0.8, 0.4 + (violations.facility.high - 1) * 0.15);
  }
  if (violations.facility.medium_high > 0) {
    violationDeduction += Math.min(0.4, 0.2 + (violations.facility.medium_high - 1) * 0.07);
  }
  if (violations.facility.medium > 0) {
    violationDeduction += Math.min(0.2, 0.1 + (violations.facility.medium - 1) * 0.03);
  }
  if (violations.facility.medium_low > 0 || violations.facility.low > 0) {
    const count = violations.facility.medium_low + violations.facility.low;
    violationDeduction += (count >= 2) ? Math.min(0.08, 0.02 * (count - 1)) : 0;
  }
  
  // Transportation violations - medium impact
  if (violations.transportation.high > 0) {
    violationDeduction += Math.min(0.8, 0.4 + (violations.transportation.high - 1) * 0.15);
  }
  if (violations.transportation.medium_high > 0) {
    violationDeduction += Math.min(0.4, 0.2 + (violations.transportation.medium_high - 1) * 0.07);
  }
  if (violations.transportation.medium > 0) {
    violationDeduction += Math.min(0.2, 0.1 + (violations.transportation.medium - 1) * 0.03);
  }
  if (violations.transportation.medium_low > 0 || violations.transportation.low > 0) {
    const count = violations.transportation.medium_low + violations.transportation.low;
    violationDeduction += (count >= 2) ? Math.min(0.08, 0.02 * (count - 1)) : 0;
  }
  
  // Nutrition violations - low impact
  if (violations.nutrition.high > 0) {
    violationDeduction += Math.min(0.5, 0.25 + (violations.nutrition.high - 1) * 0.1);
  }
  if (violations.nutrition.medium_high > 0) {
    violationDeduction += Math.min(0.25, 0.1 + (violations.nutrition.medium_high - 1) * 0.05);
  }
  if (violations.nutrition.medium > 0 || 
      violations.nutrition.medium_low > 0 || 
      violations.nutrition.low > 0) {
    // Lower nutrition violations have minimal impact
    const count = violations.nutrition.medium + 
                 violations.nutrition.medium_low + 
                 violations.nutrition.low;
    violationDeduction += (count >= 3) ? Math.min(0.1, 0.02 * (count - 2)) : 0;
  }
  
  // Sleep/Rest violations - medium impact
  if (violations.sleep_rest.high > 0) {
    violationDeduction += Math.min(0.7, 0.35 + (violations.sleep_rest.high - 1) * 0.12);
  }
  if (violations.sleep_rest.medium_high > 0) {
    violationDeduction += Math.min(0.35, 0.15 + (violations.sleep_rest.medium_high - 1) * 0.05);
  }
  if (violations.sleep_rest.medium > 0 || 
      violations.sleep_rest.medium_low > 0 || 
      violations.sleep_rest.low > 0) {
    const count = violations.sleep_rest.medium + 
                 violations.sleep_rest.medium_low + 
                 violations.sleep_rest.low;
    violationDeduction += (count >= 2) ? Math.min(0.15, 0.05 * (count - 1)) : 0;
  }
  
  // Environmental Feature violations - low impact
  if (violations.environmental_feature.high > 0) {
    violationDeduction += Math.min(0.4, 0.2 + (violations.environmental_feature.high - 1) * 0.05);
  }
  if (violations.environmental_feature.medium_high > 0 || 
      violations.environmental_feature.medium > 0 || 
      violations.environmental_feature.medium_low > 0 || 
      violations.environmental_feature.low > 0) {
    // Lower environmental violations have minimal impact
    const count = violations.environmental_feature.medium_high + 
                 violations.environmental_feature.medium + 
                 violations.environmental_feature.medium_low + 
                 violations.environmental_feature.low;
    violationDeduction += (count >= 4) ? Math.min(0.1, 0.02 * (count - 3)) : 0;
  }
  
  // Paperwork violations - lowest impact
  // Only consider if there are multiple paperwork issues
  const paperworkCount = violations.paperwork.high + 
                        violations.paperwork.medium_high + 
                        violations.paperwork.medium + 
                        violations.paperwork.medium_low + 
                        violations.paperwork.low;
                        
  if (paperworkCount >= 10) {
    // Only significant number of paperwork issues may indicate broader compliance problems
    violationDeduction += Math.min(0.15, 0.03 + (paperworkCount - 10) * 0.01);
  } else if (paperworkCount >= 5) {
    // Very minor impact for a few paperwork issues
    violationDeduction += 0.03;
  }
  // Less than 5 paperwork violations have no impact
  
  // Other uncategorized violations
  if (violations.other.high > 0) {
    violationDeduction += Math.min(0.5, 0.25 + (violations.other.high - 1) * 0.1);
  }
  if (violations.other.medium_high > 0) {
    violationDeduction += Math.min(0.25, 0.1 + (violations.other.medium_high - 1) * 0.05);
  }
  if (violations.other.medium > 0) {
    violationDeduction += Math.min(0.15, 0.05 + (violations.other.medium - 1) * 0.02);
  }
  
  // Apply the total violation deduction with a weight of 60% toward the overall score
  const violationScore = Math.max(1.0, baseScore - violationDeduction);
  
  // --- COMPONENT 2: PARENT REVIEW SCORE (20% of overall rating) ---
  // Calculate parent review score if available
  let parentReviewScore = 3.0; // Default neutral score
  
  // First, check if we have a pre-calculated score from the integration system
  if (daycare.parent_review_score !== undefined && daycare.parent_review_count > 0) {
    parentReviewScore = parseFloat(daycare.parent_review_score);
    console.log(`Using pre-calculated parent review score: ${parentReviewScore.toFixed(1)} 
      from ${daycare.parent_review_count} reviews`);
  }
  // Otherwise, calculate from reviews if available
  else if (daycare.reviews && Array.isArray(daycare.reviews) && daycare.reviews.length > 0) {
    let weightedSum = 0;
    let weightTotal = 0;
    
    daycare.reviews.forEach(review => {
      // Base rating (assuming a 1-5 scale)
      const rating = parseFloat(review.rating) || 3.0;
      
      // Recency weight: newer reviews count more
      const reviewDate = new Date(review.date || review.submittedAt || Date.now());
      const ageInMonths = (Date.now() - reviewDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      const recencyWeight = Math.max(0.5, 1 - (ageInMonths / 24)); // Reviews lose half weight after 2 years
      
      // Helpfulness weight: more helpful reviews count more (if helpfulVotes exists)
      const helpfulVotes = parseInt(review.helpfulVotes || review.helpful || review.helpfulCount || 0, 10);
      const usefulnessWeight = Math.min(1.5, 1 + (helpfulVotes / 10));
      
      // Calculate final weight for this review
      const reviewWeight = recencyWeight * usefulnessWeight;
      
      // Add to weighted sums
      weightedSum += rating * reviewWeight;
      weightTotal += reviewWeight;
    });
    
    // Calculate weighted average if we have reviews
    if (weightTotal > 0) {
      parentReviewScore = weightedSum / weightTotal;
    }
  }
  
  // --- COMPONENT 3: QUALITY INDICATORS (20% of overall rating) ---
  let qualityBonus = 0;
  
  // Accreditation is a major positive factor
  const isAccredited = daycare.accredited === 'Yes' || 
                       (daycare.programs_provided && daycare.programs_provided.includes('Accredited'));
  if (isAccredited) {
    qualityBonus += 0.75;
  }
  
  // Staff-to-child ratio is important
  if (daycare.staff_to_child_ratio) {
    let ratio = 0;
    
    // Handle different formats of ratio data
    if (typeof daycare.staff_to_child_ratio === 'string' && daycare.staff_to_child_ratio.includes(':')) {
      const parts = daycare.staff_to_child_ratio.split(':');
      if (parts.length === 2) {
        const staff = parseInt(parts[0], 10);
        const children = parseInt(parts[1], 10);
        if (!isNaN(staff) && !isNaN(children) && staff > 0) {
          ratio = children / staff; // Children per staff member
        }
      }
    } else {
      ratio = parseFloat(daycare.staff_to_child_ratio);
    }
    
    if (!isNaN(ratio) && ratio > 0) {
      // Better (lower) ratios improve score
      if (ratio <= 4) qualityBonus += 0.8;        // Excellent ratio
      else if (ratio <= 6) qualityBonus += 0.5;   // Very good ratio
      else if (ratio <= 8) qualityBonus += 0.3;   // Good ratio
      else if (ratio >= 15) baseScore -= 0.4;     // Poor ratio
    }
  }
  
  // Years in operation indicates stability
  if (yearsInOperation >= 10) qualityBonus += 0.5;
  else if (yearsInOperation >= 5) qualityBonus += 0.3;
  else if (yearsInOperation >= 2) qualityBonus += 0.1;
  
  // Educational programs and services
  if (daycare.programs_provided && typeof daycare.programs_provided === 'string') {
    const programs = daycare.programs_provided.toLowerCase();
    
    // Extract special services and programs for display
    const specialServices = [];
    const programOfferings = [];
    
    // Educational programs
    if (programs.includes('montessori') || programs.includes('educational') || programs.includes('skill classes')) {
      qualityBonus += 0.4;
      programOfferings.push('Educational Curriculum');
    }
    
    // Language programs
    if (programs.includes('language') || programs.includes('bilingual')) {
      qualityBonus += 0.3;
      programOfferings.push('Language Program');
    }
    
    // Special needs accommodation
    if (programs.includes('special needs')) {
      qualityBonus += 0.3;
      specialServices.push('Special Needs Support');
    }
    
    // Extended hours/flexibility
    if (programs.includes('extended hours')) {
      qualityBonus += 0.2;
      programOfferings.push('Extended Hours');
    }
    
    // Part-time care
    if (programs.includes('part time') || programs.includes('part-time')) {
      qualityBonus += 0.1;
      programOfferings.push('Part-Time Care');
    }
    
    // Meals/snacks provided
    if (programs.includes('meals') || programs.includes('lunch')) {
      qualityBonus += 0.2;
      specialServices.push('Meals Provided');
    }
    
    if (programs.includes('snacks')) {
      qualityBonus += 0.1;
      specialServices.push('Snacks Provided');
    }
    
    // Transportation
    if (programs.includes('transportation') || programs.includes('shuttle') || programs.includes('bus service')) {
      qualityBonus += 0.2;
      specialServices.push('Transportation');
    }
    
    // Infant care (often requires special facilities/training)
    if (programs.includes('infant') || programs.includes('baby')) {
      qualityBonus += 0.15;
      programOfferings.push('Infant Care');
    }
    
    // Summer programs
    if (programs.includes('summer') || programs.includes('camp')) {
      qualityBonus += 0.1;
      programOfferings.push('Summer Programs');
    }
    
    // Before/after school programs
    if (programs.includes('before school') || programs.includes('after school') || programs.includes('before/after')) {
      qualityBonus += 0.15;
      programOfferings.push('Before/After School');
    }
    
    // Store the extracted programs and services
    daycare.extractedPrograms = programOfferings;
    daycare.extractedServices = specialServices;
  }
  
  // Inspection history - bonus for compliance
  const totalInspections = parseInt(daycare.total_inspections || daycare.total_inspections_2yr || 0, 10);
  // If they've passed multiple inspections with no serious safety, health, or well-being violations
  const hasSeriousViolations = violations.safety.high > 0 || 
                              violations.child_health.high > 0 || 
                              violations.child_well_being.high > 0;
  if (totalInspections > 0 && !hasSeriousViolations) {
    qualityBonus += Math.min(0.5, totalInspections * 0.1); // Cap at 0.5
  }
  
  // Convert qualityBonus to a 1-5 scale quality score
  const qualityScore = Math.min(5.0, 3.0 + qualityBonus);
  
  // --- CALCULATE FINAL WEIGHTED SCORE ---
  // Weight each component according to its importance in determining childcare quality
  const componentWeights = {
    violations: 0.6,   // 60% - Compliance and safety are most important
    reviews: 0.2,      // 20% - Parent satisfaction is important
    quality: 0.2       // 20% - Quality indicators provide context
  };
  
  // Calculate weighted final score
  let finalScore = (
    (violationScore * componentWeights.violations) +
    (parentReviewScore * componentWeights.reviews) +
    (qualityScore * componentWeights.quality)
  );
  
  // Ensure score is within the full 1-5 range
  finalScore = Math.max(1.0, Math.min(5.0, finalScore));
  
  // Generate star display - rounded to nearest half star
  const roundedScore = Math.round(finalScore * 2) / 2; // Round to nearest 0.5
  const fullStars = Math.floor(roundedScore);
  const halfStar = roundedScore % 1 === 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  
  const stars = '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(emptyStars);
  
  // Determine rating class based on score
  let ratingClass;
  if (finalScore >= 4.0) ratingClass = 'excellent';
  else if (finalScore >= 3.0) ratingClass = 'good';
  else if (finalScore >= 2.0) ratingClass = 'average';
  else ratingClass = 'poor';
  
  // Calculate factors for explanation with enhanced transparency
  const factors = {
    // Component scores for clear communication to parents
    componentScores: {
      violationScore: {
        score: violationScore,
        weight: componentWeights.violations,
        contribution: violationScore * componentWeights.violations
      },
      parentReviewScore: {
        score: parentReviewScore,
        weight: componentWeights.reviews,
        contribution: parentReviewScore * componentWeights.reviews,
        reviewCount: daycare.parent_review_count || daycare.reviews?.length || 0
      },
      qualityScore: {
        score: qualityScore,
        weight: componentWeights.quality,
        contribution: qualityScore * componentWeights.quality
      }
    },
    
    // Legacy factors (maintained for compatibility)
    violations: -violationDeduction,
    quality: qualityBonus,
    
    // Detailed violation breakdown
    violationsByCategory: {
      safety: violations.safety,
      child_health: violations.child_health,
      child_well_being: violations.child_well_being,
      administrative: violations.administrative,
      facility: violations.facility,
      paperwork: violations.paperwork,
      transportation: violations.transportation,
      nutrition: violations.nutrition,
      sleep_rest: violations.sleep_rest,
      environmental_feature: violations.environmental_feature,
      other: violations.other
    },
    
    // Quality indicators
    inspectionsPassed: (totalInspections > 0 && !hasSeriousViolations) ? totalInspections : 0,
    accredited: isAccredited ? 1 : 0,
    
    // Programs and special services extracted from daycare data
    programs: daycare.extractedPrograms || [],
    specialServices: daycare.extractedServices || [],
    
    // Staff-to-child ratio for display
    staffToChildRatio: daycare.staff_to_child_ratio || null,
    
    // Rating methodology info
    ratingMethodology: "evidence-based-composite",
    ratingVersion: "2.0"
  };
  
  // Enable logging for debugging specific daycares if needed
  if (enableDebug && daycare.operation_name && daycare.operation_name.includes('Meadow Oaks Academy')) {
    console.log('DEBUG: Completed rating calculation for Meadow Oaks Academy', {
      finalScore,
      stars,
      class: ratingClass,
      yearsInOperation,
      violationDeduction,
      qualityBonus,
      baseScore,
      totalViolationsByCategory: Object.entries(violations).reduce((acc, [category, levels]) => {
        acc[category] = Object.values(levels).reduce((sum, count) => sum + count, 0);
        return acc;
      }, {})
    });
  }
  
  // No special overrides - all daycares are treated consistently
  
  // Return complete rating information for all other daycares
  return {
    score: finalScore,
    stars,
    class: ratingClass,
    yearsInOperation,
    factors
  };
}

/**
 * Process violations and categorize them according to the standards mapping
 * @param {Object} daycare - The daycare data object
 * @returns {Object} Categorized violation counts
 */
function processViolations(daycare) {
  // Initialize violation counts by category and risk level
  const violations = {
    safety: { high: 0, medium_high: 0, medium: 0, medium_low: 0, low: 0, none: 0 },
    child_health: { high: 0, medium_high: 0, medium: 0, medium_low: 0, low: 0, none: 0 },
    child_well_being: { high: 0, medium_high: 0, medium: 0, medium_low: 0, low: 0, none: 0 },
    administrative: { high: 0, medium_high: 0, medium: 0, medium_low: 0, low: 0, none: 0 },
    facility: { high: 0, medium_high: 0, medium: 0, medium_low: 0, low: 0, none: 0 },
    paperwork: { high: 0, medium_high: 0, medium: 0, medium_low: 0, low: 0, none: 0 },
    transportation: { high: 0, medium_high: 0, medium: 0, medium_low: 0, low: 0, none: 0 },
    nutrition: { high: 0, medium_high: 0, medium: 0, medium_low: 0, low: 0, none: 0 },
    sleep_rest: { high: 0, medium_high: 0, medium: 0, medium_low: 0, low: 0, none: 0 },
    environmental_feature: { high: 0, medium_high: 0, medium: 0, medium_low: 0, low: 0, none: 0 },
    other: { high: 0, medium_high: 0, medium: 0, medium_low: 0, low: 0, none: 0 }
  };
  
  // Check if we have detailed violation data
  if (daycare.violations && Array.isArray(daycare.violations)) {
    // Process each violation
    daycare.violations.forEach(violation => {
      try {
        const standardNumber = violation.standard_number || '';
        
        // Look up the standard in our mapping
        // First try exact match
        let standardInfo = standardsMapping[standardNumber];
        
        // If not found, try with subsection
        if (!standardInfo && standardNumber.includes('(')) {
          const baseStandard = standardNumber.split('(')[0];
          const subsection = standardNumber.match(/\(([^)]+)\)/);
          const subsectionValue = subsection ? subsection[1] : '';
          
          // Try with exact subsection
          if (subsectionValue) {
            standardInfo = standardsMapping[`${baseStandard}(${subsectionValue})`];
          }
          
          // If still not found, try base standard
          if (!standardInfo) {
            standardInfo = standardsMapping[baseStandard];
          }
        }
        
        // If still not found, try base standard without section numbers
        if (!standardInfo && standardNumber.includes('.')) {
          standardInfo = standardsMapping[standardNumber.split('.')[0]];
        }
        
        if (standardInfo) {
          // Use the revised rating and category
          let revisedRating = standardInfo.revised_rating;
          const category = standardInfo.category.toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
          
          // Check if the violation has been corrected
          const isCorrected = violation.narrative && 
                            (violation.narrative.toLowerCase().includes('corrected on') || 
                             violation.correction_date || 
                             violation.corrected === true || 
                             violation.corrected === 'Y' ||
                             violation.corrected === 'Yes');
          
          // Check how old the violation is
          let violationDate = null;
          if (violation.date || violation.inspection_date) {
            violationDate = new Date(violation.date || violation.inspection_date);
          } else if (violation.narrative && violation.narrative.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)) {
            // Try to extract date from narrative if available
            const dateMatch = violation.narrative.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
            if (dateMatch) {
              violationDate = new Date(dateMatch[0]);
            }
          }
          
          // Calculate time-based severity reduction
          const now = new Date();
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(now.getFullYear() - 1);
          
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(now.getMonth() - 3);
          
          // Further downgrade rating based on time and correction status
          if (isCorrected) {
            // Corrected violations get significant downgrade
            if (revisedRating === 'High') revisedRating = 'Medium';
            else if (revisedRating === 'Medium High') revisedRating = 'Medium Low';
            else if (revisedRating === 'Medium') revisedRating = 'Low';
            else if (revisedRating === 'Medium Low') revisedRating = 'Low';
            // Low remains Low
            
            // Additional time-based reduction for corrected violations
            if (violationDate) {
              // Older than 1 year: no impact at all (don't count)
              if (violationDate < oneYearAgo) {
                return; // Skip this violation entirely
              }
              // 6 months to 1 year old: further downgrade
              else if (violationDate < sixMonthsAgo) {
                if (revisedRating === 'Medium') revisedRating = 'Low';
                else if (revisedRating === 'Medium Low') revisedRating = 'Low';
              }
            }
          } else if (violationDate) {
            // Uncorrected violations also get time-based reduction
            
            // Older than 1 year: significant downgrade
            if (violationDate < oneYearAgo) {
              if (revisedRating === 'High') revisedRating = 'Medium Low';
              else if (revisedRating === 'Medium High') revisedRating = 'Low';
              else if (revisedRating === 'Medium') revisedRating = 'Low'; 
              else revisedRating = 'Low';
            }
            // 6 months to 1 year old: moderate downgrade
            else if (violationDate < sixMonthsAgo) {
              if (revisedRating === 'High') revisedRating = 'Medium';
              else if (revisedRating === 'Medium High') revisedRating = 'Medium';
              else if (revisedRating === 'Medium') revisedRating = 'Medium Low';
            }
            // 3-6 months old: slight downgrade
            else if (violationDate < threeMonthsAgo) {
              if (revisedRating === 'High') revisedRating = 'Medium High';
              else if (revisedRating === 'Medium High') revisedRating = 'Medium';
            }
            // Less than 3 months: no additional time-based reduction
          }
          
          // Map to the appropriate risk level counter
          const riskLevelMap = {
            'High': 'high', 
            'Medium High': 'medium_high', 
            'Medium': 'medium', 
            'Medium Low': 'medium_low', 
            'Low': 'low',
            'None': 'none'
          };
          
          // If rating is "None", skip this violation completely
          if (revisedRating === 'None') {
            return; // Skip this violation entirely
          }
          
          const riskLevel = riskLevelMap[revisedRating] || 'medium';
          
          // Map category name to our structure
          let mappedCategory = category;
          if (category === 'child_health' || category === 'health') {
            mappedCategory = 'child_health';
          } else if (category === 'child_well_being' || category === 'well_being' || category === 'well-being') {
            mappedCategory = 'child_well_being';
          } else if (category === 'environmental_feature' || category === 'environmental') {
            mappedCategory = 'environmental_feature';
          } else if (category === 'sleep_rest' || category === 'sleep' || category === 'rest') {
            mappedCategory = 'sleep_rest';
          } else if (!violations[category]) {
            mappedCategory = 'other';
          }
          
          // Increment the appropriate counter
          if (violations[mappedCategory]) {
            violations[mappedCategory][riskLevel]++;
          } else {
            violations.other[riskLevel]++;
          }
        } else {
          // If standard not found in mapping, use the original risk level as fallback
          let originalRiskLevel = violation.risk_level || 'medium';
          originalRiskLevel = originalRiskLevel.toLowerCase().replace(/-/g, '_');
          
          // Add to other category since we don't know the specific category
          if (['high', 'medium_high', 'medium', 'medium_low', 'low'].includes(originalRiskLevel)) {
            violations.other[originalRiskLevel]++;
          } else {
            violations.other.medium++; // Default to medium if risk level unknown
          }
        }
      } catch (error) {
        console.error('Error processing violation:', error);
        // If there's an error, count it as a medium risk other violation
        violations.other.medium++;
      }
    });
  } else {
    // Handle legacy data format - count violations by risk level
    // and categorize them based on keyword matching in violation_details if available
    
    // Count violations by risk level
    const highRiskCount = parseInt(daycare.deficiency_high || daycare.high_risk_violations || 0, 10);
    const mediumHighRiskCount = parseInt(daycare.deficiency_medium_high || daycare.medium_high_risk_violations || 0, 10);
    const mediumRiskCount = parseInt(daycare.deficiency_medium || daycare.medium_risk_violations || 0, 10);
    const mediumLowRiskCount = parseInt(daycare.deficiency_medium_low || daycare.medium_low_risk_violations || 0, 10);
    const lowRiskCount = parseInt(daycare.deficiency_low || daycare.low_risk_violations || 0, 10);
    
    // If we have violation details, try to categorize them based on keywords
    if (daycare.violation_details && typeof daycare.violation_details === 'string') {
      const details = daycare.violation_details.toLowerCase();
      
      // Define keyword patterns for each category
      const keywordPatterns = {
        safety: ['safety', 'hazard', 'danger', 'supervision', 'ratio', 'unattended', 'emergency', 'fire', 'evacuation'],
        child_health: ['health', 'medical', 'medication', 'illness', 'hygiene', 'sanitary', 'clean', 'food allergy'],
        child_well_being: ['abuse', 'neglect', 'wellbeing', 'emotional', 'development', 'discipline'],
        administrative: ['staff', 'employee', 'caregiver', 'director', 'qualifications', 'training'],
        facility: ['facility', 'building', 'equipment', 'furniture', 'playground', 'maintenance'],
        paperwork: ['record', 'document', 'form', 'file', 'report', 'policy', 'procedure'],
        transportation: ['transport', 'vehicle', 'car', 'bus', 'van', 'drive'],
        nutrition: ['food', 'meal', 'nutrition', 'feeding', 'snack', 'formula'],
        sleep_rest: ['sleep', 'nap', 'rest', 'crib', 'bed', 'bedding'],
        environmental_feature: ['environment', 'feature', 'display', 'posting', 'label', 'sign']
      };
      
      // Count occurrences of each category's keywords
      const categoryCounts = {};
      Object.keys(keywordPatterns).forEach(category => {
        categoryCounts[category] = keywordPatterns[category].reduce((count, keyword) => {
          const regex = new RegExp(keyword, 'gi');
          const matches = (details.match(regex) || []).length;
          return count + matches;
        }, 0);
      });
      
      // Find the primary categories based on keyword counts
      const sortedCategories = Object.entries(categoryCounts)
                              .sort((a, b) => b[1] - a[1])
                              .filter(entry => entry[1] > 0)
                              .map(entry => entry[0]);
      
      // Distribute violations proportionally to the matched categories
      if (sortedCategories.length > 0) {
        // Distribute high risk violations
        distributeViolations(violations, 'high', highRiskCount, sortedCategories);
        
        // Distribute medium-high risk violations
        distributeViolations(violations, 'medium_high', mediumHighRiskCount, sortedCategories);
        
        // Distribute medium risk violations
        distributeViolations(violations, 'medium', mediumRiskCount, sortedCategories);
        
        // Distribute medium-low risk violations
        distributeViolations(violations, 'medium_low', mediumLowRiskCount, sortedCategories);
        
        // Distribute low risk violations
        distributeViolations(violations, 'low', lowRiskCount, sortedCategories);
      } else {
        // If no categories matched, put all in 'other'
        violations.other.high += highRiskCount;
        violations.other.medium_high += mediumHighRiskCount;
        violations.other.medium += mediumRiskCount;
        violations.other.medium_low += mediumLowRiskCount;
        violations.other.low += lowRiskCount;
      }
    } else {
      // Without detailed info, we'll distribute violations based on typical patterns
      
      // High risk violations typically relate to safety and health
      if (highRiskCount > 0) {
        const safetyCount = Math.ceil(highRiskCount * 0.6); // 60% to safety
        const healthCount = Math.ceil(highRiskCount * 0.3); // 30% to health
        const otherCount = highRiskCount - safetyCount - healthCount; // Remainder to other
        
        violations.safety.high += safetyCount;
        violations.child_health.high += healthCount;
        violations.other.high += Math.max(0, otherCount);
      }
      
      // Medium-high violations distributed among several categories
      if (mediumHighRiskCount > 0) {
        const safetyCount = Math.ceil(mediumHighRiskCount * 0.3); // 30% to safety
        const adminCount = Math.ceil(mediumHighRiskCount * 0.25); // 25% to administrative
        const healthCount = Math.ceil(mediumHighRiskCount * 0.2); // 20% to health
        const facilityCount = Math.ceil(mediumHighRiskCount * 0.15); // 15% to facility
        const otherCount = mediumHighRiskCount - safetyCount - adminCount - healthCount - facilityCount;
        
        violations.safety.medium_high += safetyCount;
        violations.administrative.medium_high += adminCount;
        violations.child_health.medium_high += healthCount;
        violations.facility.medium_high += facilityCount;
        violations.other.medium_high += Math.max(0, otherCount);
      }
      
      // Medium violations more spread out
      if (mediumRiskCount > 0) {
        const adminCount = Math.ceil(mediumRiskCount * 0.3); // 30% to administrative
        const paperworkCount = Math.ceil(mediumRiskCount * 0.25); // 25% to paperwork
        const facilityCount = Math.ceil(mediumRiskCount * 0.2); // 20% to facility
        const healthCount = Math.ceil(mediumRiskCount * 0.15); // 15% to health
        const otherCount = mediumRiskCount - adminCount - paperworkCount - facilityCount - healthCount;
        
        violations.administrative.medium += adminCount;
        violations.paperwork.medium += paperworkCount;
        violations.facility.medium += facilityCount;
        violations.child_health.medium += healthCount;
        violations.other.medium += Math.max(0, otherCount);
      }
      
      // Medium-low typically administrative and paperwork
      if (mediumLowRiskCount > 0) {
        const paperworkCount = Math.ceil(mediumLowRiskCount * 0.5); // 50% to paperwork
        const adminCount = Math.ceil(mediumLowRiskCount * 0.3); // 30% to administrative
        const otherCount = mediumLowRiskCount - paperworkCount - adminCount;
        
        violations.paperwork.medium_low += paperworkCount;
        violations.administrative.medium_low += adminCount;
        violations.other.medium_low += Math.max(0, otherCount);
      }
      
      // Low violations primarily paperwork
      if (lowRiskCount > 0) {
        const paperworkCount = Math.ceil(lowRiskCount * 0.7); // 70% to paperwork
        const otherCount = lowRiskCount - paperworkCount;
        
        violations.paperwork.low += paperworkCount;
        violations.other.low += Math.max(0, otherCount);
      }
    }
  }
  
  return violations;
}

/**
 * Helper function to distribute violations across categories
 * @param {Object} violations - The violations object to update
 * @param {string} riskLevel - The risk level (high, medium_high, etc.)
 * @param {number} count - The number of violations to distribute
 * @param {Array<string>} categories - The categories to distribute violations to
 */
function distributeViolations(violations, riskLevel, count, categories) {
  if (count <= 0 || categories.length === 0) return;
  
  // Calculate how to distribute the violations
  const totalCategories = Math.min(categories.length, 3); // Use at most 3 categories
  const primaryCount = Math.ceil(count * 0.5); // 50% to primary category
  const secondaryCount = totalCategories > 1 ? Math.ceil(count * 0.3) : 0; // 30% to secondary
  const tertiaryCount = totalCategories > 2 ? count - primaryCount - secondaryCount : 0;
  
  // Distribute to the categories
  violations[categories[0]][riskLevel] += primaryCount;
  
  if (totalCategories > 1 && secondaryCount > 0) {
    violations[categories[1]][riskLevel] += secondaryCount;
  }
  
  if (totalCategories > 2 && tertiaryCount > 0) {
    violations[categories[2]][riskLevel] += tertiaryCount;
  }
  
  // If there's any remainder, add to the other category
  const remainingCount = count - primaryCount - secondaryCount - tertiaryCount;
  if (remainingCount > 0) {
    violations.other[riskLevel] += remainingCount;
  }
}

/**
 * Count the number of low and medium-low severity health violations from the past 6 months
 * @param {Object} daycare - The daycare data
 * @returns {number} - Count of recent low severity health violations
 */
function countRecentLowSeverityHealthViolations(daycare) {
  if (!daycare.violations || !Array.isArray(daycare.violations)) {
    return 0;
  }
  
  // Calculate the date 6 months ago
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  // Count low severity health violations in the past 6 months
  let count = 0;
  
  daycare.violations.forEach(violation => {
    try {
      // Check if it's a health violation
      const isHealthViolation = violation.category === 'child_health' || 
                              violation.category === 'health' ||
                              (violation.standard_description && 
                               (violation.standard_description.toLowerCase().includes('health') ||
                                violation.standard_description.toLowerCase().includes('medical') ||
                                violation.standard_description.toLowerCase().includes('medication') ||
                                violation.standard_description.toLowerCase().includes('illness') ||
                                violation.standard_description.toLowerCase().includes('injury')));
      
      // Check if it's low severity
      const isLowSeverity = violation.risk_level === 'Medium Low' || 
                          violation.risk_level === 'Low' ||
                          violation.standard_revised_rating === 'Medium Low' ||
                          violation.standard_revised_rating === 'Low';
      
      // Check date if available
      let isRecent = true;
      if (violation.date || violation.inspection_date) {
        const violationDate = new Date(violation.date || violation.inspection_date);
        isRecent = violationDate >= sixMonthsAgo;
      }
      
      // If it meets all criteria, count it
      if (isHealthViolation && isLowSeverity && isRecent) {
        count++;
      }
    } catch (error) {
      // Ignore errors in processing violations
    }
  });
  
  return count;
}

export default calculateRevisedRating;