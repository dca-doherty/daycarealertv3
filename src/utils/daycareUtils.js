export function calculateRating(daycare) {
    const weights = {
      deficiency_high: -0.5,
      deficiency_medium_high: -0.3,
      deficiency_medium: -0.2,
      deficiency_medium_low: -0.1,
      deficiency_low: -0.05,
      total_inspections: 0.1,
      total_self_reports: 0.05,
      staff_child_ratio: 0.3,
      educational_programs: 0.2,
      years_in_operation: 0.1,
      accreditations: 0.2
    };
  
    let score = 3; // Start with a neutral score
  
    // Calculate score based on deficiencies and inspections
    Object.keys(weights).forEach(key => {
      if (daycare[key]) {
        score += weights[key] * daycare[key];
      }
    });
  
    // Adjust for staff-to-child ratio
    const ratio = daycare.staff_child_ratio || 1/4; // Default to 1:4 if not provided
    score += (ratio > 1/3) ? 0.5 : (ratio > 1/4) ? 0.3 : (ratio > 1/5) ? 0.1 : -0.1;
  
    // Adjust for educational programs
    if (daycare.educational_programs) {
      score += daycare.educational_programs.length * 0.1;
    }
  
    // Adjust for years in operation
    const years = daycare.years_in_operation || 0;
    score += (years > 20) ? 0.5 : (years > 10) ? 0.3 : (years > 5) ? 0.1 : 0;
  
    // Adjust for accreditations
    if (daycare.accreditations) {
      score += daycare.accreditations.length * 0.2;
    }
  
    // Clamp the score between 1 and 5
    score = Math.max(1, Math.min(5, score));
  
    // Round to nearest half star
    const roundedScore = Math.round(score * 2) / 2;
  
    // Generate star rating
    const fullStars = Math.floor(roundedScore);
    const halfStar = roundedScore % 1 !== 0;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  
    const stars = '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(emptyStars);
  
    // Determine rating class
    let ratingClass;
    if (roundedScore >= 4) ratingClass = 'excellent';
    else if (roundedScore >= 3) ratingClass = 'good';
    else if (roundedScore >= 2) ratingClass = 'average';
    else ratingClass = 'poor';
  
    return { score: roundedScore, stars, class: ratingClass };
  }
  
  /**
   * Estimates the monthly cost per child for daycare services using the formula:
   * P = ((S + R + O + M + Pe) / C) × (1 + Mp)
   * 
   * Where:
   * P = Price per child per month
   * S = Staff wages (biggest cost, usually 50-60% of total expenses)
   * R = Rent/mortgage costs for the facility
   * O = Operational costs (food, supplies, utilities, insurance)
   * M = Marketing expenses
   * Pe = Profit expectation (if for-profit)
   * C = Capacity (number of children)
   * Mp = Market premium (competitiveness, demand, and perceived quality)
   * 
   * @param {Object} daycare - The daycare data object
   * @returns {number} Estimated monthly cost per child
   */
export function estimateDaycarePrice(daycare) {
    // If no daycare data provided, return a default price
    if (!daycare) {
      return 900; // National average default
    }
    
    // Extract rating if available, otherwise calculate it
    const rating = daycare.rating || calculateRating(daycare);
    
    // Calculate capacity (C)
    const capacity = parseInt(daycare.total_capacity || '50', 10);
    
    // STAFF WAGES (S) - typically 50-60% of total costs
    // Base staff costs depend on child-to-staff ratios which vary by age group
    const baseStaffCost = 500; // Monthly base cost per child for staff
    const ageFactor = getAgeFactor(daycare.age_groups || '');
    const locationFactor = getLocationFactor(daycare.city || 'Average');
    const staffCostPerChild = baseStaffCost * ageFactor * locationFactor;
    
    // RENT/MORTGAGE (R)
    // Calculate based on required space per child and location
    const baseRentCost = 200; // Monthly base rent cost per child
    const rentPerChild = baseRentCost * locationFactor;
    
    // OPERATIONAL COSTS (O) - food, supplies, utilities, insurance
    const baseOperationalCost = 150; // Monthly base operational cost per child
    
    // Additional services affect operational costs
    const mealsFactor = daycare.meals_provided ? 1.1 : 1;
    const extendedHoursFactor = daycare.extended_hours ? 1.15 : 1;
    const transportationFactor = daycare.transportation_provided ? 1.12 : 1;
    
    const operationalCostsPerChild = baseOperationalCost * mealsFactor * extendedHoursFactor * transportationFactor;
    
    // MARKETING EXPENSES (M) - typically 2-5% of total costs
    const marketingCostPerChild = 30; // Base monthly marketing cost per child
    
    // PROFIT EXPECTATION (Pe) - for for-profit centers
    // Non-profits still need surplus for sustainability but less than for-profits
    let profitExpectation = 0;
    const isNonProfit = daycare.non_profit === true || (typeof daycare.programs_provided === 'string' && 
                        (daycare.programs_provided.toLowerCase().includes('non-profit') || 
                         daycare.programs_provided.toLowerCase().includes('nonprofit')));
    
    if (!isNonProfit) {
      // For-profit centers target 10-15% profit margin
      profitExpectation = (staffCostPerChild + rentPerChild + operationalCostsPerChild + marketingCostPerChild) * 0.12;
    } else {
      // Non-profits still need some surplus for sustainability
      profitExpectation = (staffCostPerChild + rentPerChild + operationalCostsPerChild + marketingCostPerChild) * 0.05;
    }
    
    // Sum all costs divided by capacity to get base price per child
    // (In this implementation, we've already calculated costs per child)
    const baseCost = staffCostPerChild + rentPerChild + operationalCostsPerChild + marketingCostPerChild + profitExpectation;
    
    // MARKET PREMIUM (Mp)
    // Quality and reputation affect what centers can charge
    const qualityPremium = (typeof rating === 'object' ? rating.score : rating) * 0.05;
    
    // Accreditation allows for premium pricing
    const accreditationFactor = daycare.accreditations ? daycare.accreditations.length * 0.05 : 0;
    
    // Capacity affects economies of scale
    const capacityDiscount = getCapacityFactor(capacity) - 1;
    
    // Market competition varies by location
    const competitionFactor = getCompetitionFactor(daycare.city) || 0;
    
    // Combine market premium factors
    const marketPremium = qualityPremium + accreditationFactor + capacityDiscount + competitionFactor;
    
    // Final price calculation: P = ((S + R + O + M + Pe) / C) × (1 + Mp)
    const finalPrice = baseCost * (1 + marketPremium);
    
    // Ensure price is within reasonable bounds
    const minPrice = 600;   // Minimum reasonable price
    const maxPrice = 3000;  // Maximum reasonable price
    
    return Math.round(Math.max(minPrice, Math.min(maxPrice, finalPrice)));
  }
  
  function getLocationFactor(city) {
    const cityFactors = {
      'Austin': 1.2,
      'Houston': 1.1,
      'Dallas': 1.15,
      'San Antonio': 1.05,
    };
    return cityFactors[city] || 1;
  }
  
  function getAgeFactor(ageGroups) {
    if (ageGroups.includes('Infant')) return 1.3;
    if (ageGroups.includes('Toddler')) return 1.2;
    if (ageGroups.includes('Preschool')) return 1.1;
    return 1;
  }
  
  // Commenting out unused function
  // function getRatingFactor(rating) {
  //   return 1 + (rating - 3) * 0.1;
  // }
  
  function getCapacityFactor(capacity) {
    if (capacity > 100) return 0.9;
    if (capacity > 50) return 0.95;
    return 1;
  }
  
  /**
   * Helper function to determine competitive market impact on price
   * Cities with higher competition generally have downward pressure on prices,
   * while cities with less competition allow facilities to charge more
   * 
   * @param {string} city - The city name
   * @returns {number} - Competition factor (negative for high competition, positive for low)
   */
  function getCompetitionFactor(city) {
    if (!city) return 0;
    
    // Cities with high competition generally have lower prices
    const highCompetitionCities = ['Austin', 'Dallas', 'Houston', 'Plano', 'Frisco'];
    
    // Cities with low competition can charge more
    const lowCompetitionCities = ['El Paso', 'Abilene', 'Waco', 'Laredo'];
    
    if (highCompetitionCities.includes(city)) return -0.05;
    if (lowCompetitionCities.includes(city)) return 0.05;
    
    return 0; // Neutral competition for other cities
  }
  
/**
 * Normalize violation risk level counts on a daycare object
 * This ensures consistent field names for all daycare objects regardless of data source
 */
export function normalizeViolationCounts(daycare) {
  if (!daycare) return null;
  
  // Log the object we're normalizing for debugging
  console.log(`[daycareUtils] Starting violation count normalization for ${daycare.operation_name || 'Unknown'} (${daycare.operation_number || daycare.operation_id || 'No ID'})`);
  
  // Check all violation-related fields
  const violationFields = Object.keys(daycare).filter(key => 
    key.includes('violation') || key.includes('risk') || key.includes('deficiency')
  );
  
  if (violationFields.length > 0) {
    console.log('[daycareUtils] Found violation fields:', violationFields);
    console.log('[daycareUtils] Initial values:');
    violationFields.forEach(field => {
      console.log(`  ${field}: ${daycare[field]}`);
    });
  } else {
    console.log('[daycareUtils] No violation fields found in daycare object');
  }
  
  // Create a shallow clone to avoid circular reference issues
  const normalizedDaycare = { ...daycare };
  
  // First, check if the global store has data for this daycare
  const daycareId = daycare.operation_id || daycare.operation_number;
  if (window.daycareDataStore && window.daycareDataStore[daycareId]) {
    console.log(`[daycareUtils] Found data in global store for ${daycareId}`);
    const storedData = window.daycareDataStore[daycareId];
    
    // Use data from the global store as it might be more up-to-date
    if (storedData.high_risk_violations !== undefined) 
      normalizedDaycare.high_risk_violations = parseInt(storedData.high_risk_violations, 10);
    if (storedData.medium_high_risk_violations !== undefined) 
      normalizedDaycare.medium_high_risk_violations = parseInt(storedData.medium_high_risk_violations, 10);
    if (storedData.medium_risk_violations !== undefined) 
      normalizedDaycare.medium_risk_violations = parseInt(storedData.medium_risk_violations, 10);
    if (storedData.medium_low_risk_violations !== undefined) 
      normalizedDaycare.medium_low_risk_violations = parseInt(storedData.medium_low_risk_violations, 10);
    if (storedData.low_risk_violations !== undefined) 
      normalizedDaycare.low_risk_violations = parseInt(storedData.low_risk_violations, 10);
    if (storedData.total_violations_2yr !== undefined) 
      normalizedDaycare.total_violations_2yr = parseInt(storedData.total_violations_2yr, 10);
      
    console.log('[daycareUtils] Using data from global store');
    return normalizedDaycare;
  }
  
  // Check for all possible field name variations for violation counts
  const hasStandardViolationFields = 
    normalizedDaycare.high_risk_violations !== undefined || 
    normalizedDaycare.medium_high_risk_violations !== undefined;
    
  const hasAlternateViolationFields = 
    normalizedDaycare.high_risk !== undefined || 
    normalizedDaycare.medium_high_risk !== undefined ||
    normalizedDaycare.high_risk_violation_count !== undefined;
    
  const hasTotalViolationsOnly = 
    normalizedDaycare.total_violations !== undefined || 
    normalizedDaycare.total_violations_2yr !== undefined ||
    normalizedDaycare.violation_count !== undefined;
  
  console.log('[daycareUtils] Violation field analysis:', {
    hasStandardViolationFields,
    hasAlternateViolationFields,
    hasTotalViolationsOnly
  });
    
  // If standard fields exist, make sure they're numbers
  if (hasStandardViolationFields) {
    console.log('[daycareUtils] Using standard violation fields');
    normalizedDaycare.high_risk_violations = parseInt(normalizedDaycare.high_risk_violations || 0, 10);
    normalizedDaycare.medium_high_risk_violations = parseInt(normalizedDaycare.medium_high_risk_violations || 0, 10);
    normalizedDaycare.medium_risk_violations = parseInt(normalizedDaycare.medium_risk_violations || 0, 10);
    normalizedDaycare.medium_low_risk_violations = parseInt(normalizedDaycare.medium_low_risk_violations || 0, 10);
    normalizedDaycare.low_risk_violations = parseInt(normalizedDaycare.low_risk_violations || 0, 10);
  } 
  // If alternate fields exist, map them to standard fields
  else if (hasAlternateViolationFields) {
    console.log('[daycareUtils] Using alternate violation fields (high_risk format)');
    normalizedDaycare.high_risk_violations = parseInt(normalizedDaycare.high_risk || normalizedDaycare.high_risk_violation_count || 0, 10);
    normalizedDaycare.medium_high_risk_violations = parseInt(normalizedDaycare.medium_high_risk || normalizedDaycare.medium_high_risk_violation_count || 0, 10);
    normalizedDaycare.medium_risk_violations = parseInt(normalizedDaycare.medium_risk || normalizedDaycare.medium_risk_violation_count || 0, 10);
    normalizedDaycare.medium_low_risk_violations = parseInt(normalizedDaycare.medium_low_risk || normalizedDaycare.medium_low_risk_violation_count || 0, 10);
    normalizedDaycare.low_risk_violations = parseInt(normalizedDaycare.low_risk || normalizedDaycare.low_risk_violation_count || 0, 10);
  }
  // Also check for deficiency fields
  else if (normalizedDaycare.deficiency_high !== undefined || normalizedDaycare.deficiency_medium_high !== undefined) {
    console.log('[daycareUtils] Using deficiency-based violation fields');
    normalizedDaycare.high_risk_violations = parseInt(normalizedDaycare.deficiency_high || 0, 10);
    normalizedDaycare.medium_high_risk_violations = parseInt(normalizedDaycare.deficiency_medium_high || 0, 10);
    normalizedDaycare.medium_risk_violations = parseInt(normalizedDaycare.deficiency_medium || 0, 10);
    normalizedDaycare.medium_low_risk_violations = parseInt(normalizedDaycare.deficiency_medium_low || 0, 10);
    normalizedDaycare.low_risk_violations = parseInt(normalizedDaycare.deficiency_low || 0, 10);
  }
  // If only total violations exist, distribute them across risk levels
  else if (hasTotalViolationsOnly) {
    console.log('[daycareUtils] Only total violations found, distributing across risk levels');
    const totalViolations = parseInt(normalizedDaycare.total_violations || normalizedDaycare.total_violations_2yr || normalizedDaycare.violation_count || 0, 10);
    if (totalViolations > 0) {
      // Create a roughly realistic distribution of violation types
      normalizedDaycare.high_risk_violations = Math.floor(totalViolations * 0.15);  // 15% High
      normalizedDaycare.medium_high_risk_violations = Math.floor(totalViolations * 0.35); // 35% Medium-High
      normalizedDaycare.medium_risk_violations = Math.floor(totalViolations * 0.25);  // 25% Medium
      normalizedDaycare.medium_low_risk_violations = Math.floor(totalViolations * 0.15);  // 15% Medium-Low
      normalizedDaycare.low_risk_violations = totalViolations - normalizedDaycare.high_risk_violations -
        normalizedDaycare.medium_high_risk_violations - normalizedDaycare.medium_risk_violations - 
        normalizedDaycare.medium_low_risk_violations;  // Remainder as Low
      
      console.log(`[daycareUtils] Distributed ${totalViolations} total violations:`, {
        high: normalizedDaycare.high_risk_violations,
        medHigh: normalizedDaycare.medium_high_risk_violations,
        med: normalizedDaycare.medium_risk_violations,
        medLow: normalizedDaycare.medium_low_risk_violations,
        low: normalizedDaycare.low_risk_violations
      });
    } else {
      // No violations, set all to 0
      normalizedDaycare.high_risk_violations = 0;
      normalizedDaycare.medium_high_risk_violations = 0;
      normalizedDaycare.medium_risk_violations = 0;
      normalizedDaycare.medium_low_risk_violations = 0;
      normalizedDaycare.low_risk_violations = 0;
      console.log('[daycareUtils] Zero total violations, setting all risk levels to 0');
    }
  }
  // If no violation data exists at all, initialize with zeros
  else {
    console.log('[daycareUtils] No violation data found, initializing with zeros');
    normalizedDaycare.high_risk_violations = 0;
    normalizedDaycare.medium_high_risk_violations = 0;
    normalizedDaycare.medium_risk_violations = 0;
    normalizedDaycare.medium_low_risk_violations = 0;
    normalizedDaycare.low_risk_violations = 0;
    normalizedDaycare.total_violations_2yr = 0;
  }
  
  // Make sure total_violations_2yr is properly set/calculated
  if (normalizedDaycare.total_violations_2yr === undefined) {
    normalizedDaycare.total_violations_2yr = 
      normalizedDaycare.high_risk_violations +
      normalizedDaycare.medium_high_risk_violations +
      normalizedDaycare.medium_risk_violations +
      normalizedDaycare.medium_low_risk_violations +
      normalizedDaycare.low_risk_violations;
    
    console.log(`[daycareUtils] Calculated total_violations_2yr: ${normalizedDaycare.total_violations_2yr}`);
  }
  
  // Update the global store with this normalized data
  if (daycareId && typeof window !== 'undefined') {
    if (!window.daycareDataStore) {
      window.daycareDataStore = {};
    }
    
    window.daycareDataStore[daycareId] = {
      high_risk_violations: normalizedDaycare.high_risk_violations,
      medium_high_risk_violations: normalizedDaycare.medium_high_risk_violations,
      medium_risk_violations: normalizedDaycare.medium_risk_violations,
      medium_low_risk_violations: normalizedDaycare.medium_low_risk_violations,
      low_risk_violations: normalizedDaycare.low_risk_violations,
      total_violations_2yr: normalizedDaycare.total_violations_2yr
    };
    
    console.log(`[daycareUtils] Updated global store for ${daycareId}`);
  }
  
  // Log the final normalized violation counts
  console.log('[daycareUtils] Final normalized violation counts:', {
    high_risk_violations: normalizedDaycare.high_risk_violations,
    medium_high_risk_violations: normalizedDaycare.medium_high_risk_violations,
    medium_risk_violations: normalizedDaycare.medium_risk_violations,
    medium_low_risk_violations: normalizedDaycare.medium_low_risk_violations,
    low_risk_violations: normalizedDaycare.low_risk_violations,
    total_violations_2yr: normalizedDaycare.total_violations_2yr
  });
  
  return normalizedDaycare;
}