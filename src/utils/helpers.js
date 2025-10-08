// Import the revised rating calculator
import calculateRevisedRating from './revised_rating';

/**
 * Calculates a simpler, violation-based rating for a daycare facility.
 * Focuses primarily on violations within a 2-year rolling window.
 * 
 * This implementation now uses the revised rating system which incorporates
 * categorized standards with revised risk levels.
 *
 * @param {Object} daycare - The daycare data object
 * @param {number} [cityAverageRating=3.5] - Optional average rating for the city (not currently used)
 * @returns {Object} Rating details including score, stars display, class, and years in operation
 */
export function calculateRating(daycare, cityAverageRating = 3.5) {
  // Use the revised rating implementation
  return calculateRevisedRating(daycare);
}

/**
 * Helper function to get violation counts from different data structures
 * @param {Object} daycare - The daycare data object
 * @param {string} level - The violation level to retrieve
 * @returns {number} The count of violations at that level
 */
function getViolationCount(daycare, level) {
  if (!daycare) return 0;
  
  let count = 0;
  
  // Try different formats of data structure
  if (level === 'high') {
    // High Risk Violations: Safety and supervision failures that put children at immediate risk
    count = parseInt(daycare.deficiency_high || daycare.high_risk_violations || 0, 10);
    
    // If we have violation_details, also check for specific high-risk keywords
    if (daycare.violation_details && typeof daycare.violation_details === 'string') {
      const highRiskKeywords = [
        'child left unattended', 'serious injury', 'emergency protocol', 
        'transportation safety', 'failure to report', 'abuse', 'neglect',
        'unsupervised access', 'dangerous condition', 'critical supervision'
      ];
      
      // Count each occurrence of high-risk keywords
      const additionalCount = highRiskKeywords.reduce((total, keyword) => {
        const regex = new RegExp(keyword, 'gi');
        const matches = (daycare.violation_details.match(regex) || []).length;
        return total + matches;
      }, 0);
      
      // Add any additional violations found in the details
      count += additionalCount;
    }
  } else if (level === 'medium_high') {
    // Medium-High Risk: Important violations that affect quality of care
    count = parseInt(daycare.deficiency_medium_high || daycare.medium_high_risk_violations || 0, 10);
    
    // Check violation details for medium-high risk keywords
    if (daycare.violation_details && typeof daycare.violation_details === 'string') {
      const medHighRiskKeywords = [
        'supervision', 'staff ratio', 'staff-to-child', 'sanitation', 
        'background check', 'medication administration', 'safety hazard'
      ];
      
      const additionalCount = medHighRiskKeywords.reduce((total, keyword) => {
        const regex = new RegExp(keyword, 'gi');
        const matches = (daycare.violation_details.match(regex) || []).length;
        return total + matches;
      }, 0);
      
      count += additionalCount;
    }
  } else if (level === 'medium') {
    // Medium Risk: Moderate violations that need attention
    count = parseInt(daycare.deficiency_medium || daycare.medium_risk_violations || 0, 10);
    
    // Check violation details for medium risk keywords
    if (daycare.violation_details && typeof daycare.violation_details === 'string') {
      const medRiskKeywords = [
        'minor supervision', 'playground', 'moderate safety', 
        'food preparation', 'training', 'record-keeping'
      ];
      
      const additionalCount = medRiskKeywords.reduce((total, keyword) => {
        const regex = new RegExp(keyword, 'gi');
        const matches = (daycare.violation_details.match(regex) || []).length;
        return total + matches;
      }, 0);
      
      count += additionalCount;
    }
  } else if (level === 'low') {
    // Low Risk: Minor administrative or procedural issues
    count = parseInt(daycare.deficiency_low || daycare.low_risk_violations || 0, 10);
    
    // Check violation details for low risk keywords
    if (daycare.violation_details && typeof daycare.violation_details === 'string') {
      const lowRiskKeywords = [
        'paperwork', 'documentation', 'posting', 'signage', 
        'minor cleanliness', 'administrative'
      ];
      
      const additionalCount = lowRiskKeywords.reduce((total, keyword) => {
        const regex = new RegExp(keyword, 'gi');
        const matches = (daycare.violation_details.match(regex) || []).length;
        return total + matches;
      }, 0);
      
      count += additionalCount;
    }
  }
  
  // Apply reasonable caps to prevent outliers from skewing ratings
  const maxCounts = {
    'high': 10,
    'medium_high': 15, 
    'medium': 20,
    'low': 30
  };
  
  // Cap the count but ensure we don't hide the existence of violations
  count = Math.min(count, maxCounts[level] || 100);
  
  return isNaN(count) ? 0 : count;
}

/**
 * Calculate the educational quality and program offerings impact on rating
 * @param {Object} daycare - The daycare data object
 * @returns {number} Program quality score addition
 */
// eslint-disable-next-line no-unused-vars
function calculateProgramQuality(daycare) {
  let score = 0;
  
  // Check programs offered
  const programsOffered = daycare.programs_provided || '';
  
  // Education programs boost score
  if (programsOffered.includes('Montessori') || 
      programsOffered.includes('Educational') ||
      programsOffered.includes('Skill Classes')) {
    score += 0.2;
  }
  
  // Additional services like meals can be a plus
  if (programsOffered.includes('Meals Provided') || 
      programsOffered.includes('Snacks Provided')) {
    score += 0.1;
  }
  
  // Special needs accommodation is positive
  if (programsOffered.includes('Special Needs')) {
    score += 0.2;
  }
  
  // Foreign language programs are valuable
  if (programsOffered.includes('Language') || 
      programsOffered.includes('Bilingual')) {
    score += 0.2;
  }
  
  return Math.min(0.5, score); // Cap total bonus at 0.5
}


export function estimateDaycarePrice(daycare) {
  // ML-inspired pricing model using multiple weighted factors and nonlinear relationships
  
  // Extract and prepare features
  // Don't call calculateRating here to avoid circular dependency
  // Instead, extract the years in operation directly
  let yearsInOperation = 0;
  if (daycare.issuance_date || daycare.license_issue_date) {
    const dateString = daycare.issuance_date || daycare.license_issue_date;
    try {
      const currentYear = new Date().getFullYear();
      const issuanceYear = new Date(dateString).getFullYear();
      if (!isNaN(issuanceYear)) {
        yearsInOperation = currentYear - issuanceYear;
      }
    } catch (e) {
      // Handle date parsing errors silently
    }
  }
  
  // Use a simple quality score instead of the full rating
  const qualityScore = calculateQualityScore(daycare) / 10; // 0-1 scale
  
  const zipCode = daycare.zip_code || '75001'; // Default to a midrange Dallas area zipcode if not available
  const programsOffered = daycare.programs_provided || '';
  const city = daycare.city || 'Dallas'; // Default to Dallas if not available
  
  // Base price calculation using a more complex model
  // National average is around $1,200/month, but varies significantly by region
  const basePrice = 1200;
  
  // ===== Feature extraction and normalization =====
  
  // 1. Location-based features
  const zipCodeFactor = getZipCodeFactor(zipCode);
  const locationFactor = getLocationFactor(city) * zipCodeFactor;
  
  // 2. Quality features (non-linear relationship)
  // Use the quality score we calculated earlier instead of the rating to avoid circular dependency
  const qualityFactor = Math.pow(1.15, (qualityScore * 5) - 3); // Convert quality 0-1 to 0-5 scale
  
  // 3. Demographic features - income levels affect pricing
  const incomeFactor = getIncomeFactorByLocation(city, zipCode);
  
  // 4. Program features - more sophisticated handling of program offerings
  const programFeatures = extractProgramFeatures(programsOffered);
  
  // 5. Age group features
  const ageGroupFactor = getEnhancedAgeGroupFactor(daycare.age_groups, daycare.licensed_to_serve_ages);
  
  // 6. Operational features
  // Use the years in operation we calculated earlier
  const experienceFactor = 1 + (Math.log(Math.max(1, yearsInOperation)) / 10); // Diminishing returns for experience
  
  // 7. Size and capacity features (non-linear relationship)
  const capacityFactor = getCapacityFactorEnhanced(daycare.total_capacity);
  
  // 8. Compliance and safety features
  const complianceFactor = getComplianceFactor(daycare);
  
  // 9. Additional services
  const servicesFactor = 1 + 
    (daycare.meals_provided ? 0.08 : 0) +
    (daycare.extended_hours ? 0.15 : 0) +
    (daycare.transportation_provided ? 0.12 : 0) +
    (programFeatures.weekend ? 0.18 : 0) +
    (programFeatures.night ? 0.20 : 0);
    
  // 10. Competition factor based on location
  const competitionFactor = getCompetitionFactor(city, zipCode);
  
  // ===== ML-inspired weighted model =====
  // Each coefficient represents the "weight" learned by our model
  // These weights would normally be derived from training data
  const coefficients = {
    base: 1.0,
    location: 0.35,       // 35% influence from location
    quality: 0.25,        // 25% influence from quality
    income: 0.20,         // 20% influence from area income
    programs: 0.10,       // 10% influence from programs
    ageGroup: 0.30,       // 30% influence from age groups
    experience: 0.05,     // 5% influence from experience
    capacity: -0.10,      // -10% influence from capacity (economies of scale)
    compliance: 0.15,     // 15% influence from compliance
    services: 0.20,       // 20% influence from additional services
    competition: -0.10    // -10% influence from competition
  };
  
  // Combined ML model - weighted sum of factors
  const modelOutput = basePrice * (
    1 +
    (coefficients.location * (locationFactor - 1)) +
    (coefficients.quality * (qualityFactor - 1)) +
    (coefficients.income * (incomeFactor - 1)) +
    (coefficients.programs * (programFeatures.weight - 1)) +
    (coefficients.ageGroup * (ageGroupFactor - 1)) +
    (coefficients.experience * (experienceFactor - 1)) +
    (coefficients.capacity * (capacityFactor - 1)) +
    (coefficients.compliance * (complianceFactor - 1)) +
    (coefficients.services * (servicesFactor - 1)) +
    (coefficients.competition * (competitionFactor - 1))
  );
  
  // Apply nonlinear transformations and bounds
  const minPrice = 600;   // Minimum reasonable price
  const maxPrice = 3500;  // Maximum reasonable price
  
  // Ensure price stays within reasonable bounds
  const finalPrice = Math.max(minPrice, Math.min(maxPrice, modelOutput));
  
  // Round to nearest $5
  return Math.round(finalPrice / 5) * 5;
}

// Enhanced capacity factor with nonlinear relationship
function getCapacityFactorEnhanced(capacity) {
  if (!capacity) return 1;
  const numCapacity = parseInt(capacity, 10) || 50;
  // Economies of scale with diminishing returns
  return 1.2 - (0.2 * Math.min(1, Math.log(numCapacity) / Math.log(150)));
}

// Compliance factor based on violations and inspections
function getComplianceFactor(daycare) {
  // Default if no data
  if (!daycare) return 1;
  
  // Base factor
  let factor = 1;
  
  // High risk violations severely impact factor
  const highRisk = parseInt(daycare.deficiency_high || 0, 10);
  factor -= highRisk * 0.05;
  
  // Medium risk violations impact factor moderately
  const medRisk = parseInt(daycare.deficiency_medium_high || 0, 10) + parseInt(daycare.deficiency_medium || 0, 10);
  factor -= medRisk * 0.02;
  
  // Low risk violations impact factor slightly
  const lowRisk = parseInt(daycare.deficiency_low || 0, 10);
  factor -= lowRisk * 0.01;
  
  // Positive impact for passing inspections
  const inspections = parseInt(daycare.total_inspections || 0, 10);
  if (inspections > 0 && highRisk === 0) {
    factor += 0.05; // Bonus for passing inspections with no high risk violations
  }
  
  // Ensure factor stays in reasonable range
  return Math.max(0.8, Math.min(1.2, factor));
}

// Enhanced age group factor
function getEnhancedAgeGroupFactor(ageGroups, licensedAges) {
  // First try based on age_groups field
  if (ageGroups) {
    if (typeof ageGroups === 'string') {
      if (ageGroups.toLowerCase().includes('infant')) return 1.45;
      if (ageGroups.toLowerCase().includes('toddler')) return 1.35;
      if (ageGroups.toLowerCase().includes('preschool') || ageGroups.toLowerCase().includes('pre-k')) return 1.20;
    } else if (Array.isArray(ageGroups)) {
      if (ageGroups.some(g => g.toLowerCase().includes('infant'))) return 1.45;
      if (ageGroups.some(g => g.toLowerCase().includes('toddler'))) return 1.35;
      if (ageGroups.some(g => g.toLowerCase().includes('preschool') || g.toLowerCase().includes('pre-k'))) return 1.20;
    }
  }
  
  // Then try based on licensed_to_serve_ages field
  if (licensedAges) {
    if (licensedAges.toLowerCase().includes('infant') || 
        licensedAges.toLowerCase().includes('0 month') || 
        licensedAges.toLowerCase().includes('6 week')) return 1.45;
    if (licensedAges.toLowerCase().includes('toddler') || 
        licensedAges.toLowerCase().includes('1 year') || 
        licensedAges.toLowerCase().includes('2 year')) return 1.35;
    if (licensedAges.toLowerCase().includes('preschool') || 
        licensedAges.toLowerCase().includes('pre-k') || 
        licensedAges.toLowerCase().includes('3 year') || 
        licensedAges.toLowerCase().includes('4 year')) return 1.20;
  }
  
  return 1.10; // Default for school age or unknown
}

// Enhanced program feature extraction
function extractProgramFeatures(programsProvided) {
  const features = {
    educational: false,
    weekend: false,
    night: false,
    meals: false,
    transportation: false,
    specialNeeds: false,
    accredited: false,
    afterSchool: false,
    weight: 1.0
  };
  
  if (!programsProvided) return features;
  
  const programs = typeof programsProvided === 'string' 
    ? programsProvided.split(',').map(p => p.trim().toLowerCase())
    : [];
  
  // Feature detection
  features.educational = programs.some(p => 
    p.includes('montessori') || 
    p.includes('preschool') ||
    p.includes('pre-k') ||
    p.includes('educational') ||
    p.includes('skill classes')
  );
  
  features.weekend = programs.some(p => p.includes('weekend'));
  features.night = programs.some(p => p.includes('night'));
  features.meals = programs.some(p => p.includes('meal') || p.includes('snack'));
  features.transportation = programs.some(p => p.includes('transport'));
  features.specialNeeds = programs.some(p => p.includes('special needs'));
  features.accredited = programs.some(p => p.includes('accredited'));
  features.afterSchool = programs.some(p => p.includes('after school'));
  
  // Calculate weight based on features
  features.weight = 1.0;
  if (features.educational) features.weight += 0.15;
  if (features.weekend) features.weight += 0.20;
  if (features.night) features.weight += 0.25;
  if (features.meals) features.weight += 0.10;
  if (features.transportation) features.weight += 0.15;
  if (features.specialNeeds) features.weight += 0.30;
  if (features.accredited) features.weight += 0.20;
  if (features.afterSchool) features.weight += 0.05;
  
  return features;
}

// Income factor by location
function getIncomeFactorByLocation(city, zipCode) {
  // Zipcode-based income factors (would be more extensive in a real model)
  const zipCodeIncomeFactors = {
    // Dallas area
    '75201': 1.45, // Downtown Dallas - high income
    '75225': 1.50, // Highland Park - very high income
    '75243': 1.15, // Northeast Dallas - moderate income
    '75211': 0.95, // Southwest Dallas - lower income
    
    // Houston area
    '77005': 1.55, // West University - very high income
    '77024': 1.50, // Memorial - high income
    '77004': 1.10, // Third Ward - moderate income
    '77033': 0.90, // South Park - lower income
    
    // Austin area
    '78746': 1.55, // West Lake Hills - very high income
    '78704': 1.40, // South Austin - high income
    '78741': 1.20, // East Austin - moderate-high income
    '78744': 1.00, // Southeast Austin - moderate income
    
    // San Antonio area
    '78258': 1.40, // Stone Oak - high income
    '78209': 1.35, // Alamo Heights - high income
    '78207': 0.90, // West Side - lower income
    
    // Default modifiers for common areas
    '75001': 1.20, // Default Dallas suburb
    '77001': 1.25, // Default Houston
    '78701': 1.35, // Default Austin
    '78201': 1.15, // Default San Antonio
  };
  
  // Try zipcode first if available
  if (zipCode && zipCodeIncomeFactors[zipCode]) {
    return zipCodeIncomeFactors[zipCode];
  }
  
  // Fall back to city-based estimate
  return getLocationFactor(city);
}

// Competition factor based on area
function getCompetitionFactor(city, zipCode) {
  // High competition areas have lower prices due to market forces
  const highCompetitionAreas = [
    'DALLAS', 'HOUSTON', 'AUSTIN', 'SAN ANTONIO', 
    'PLANO', 'FRISCO', 'IRVING', 'ARLINGTON'
  ];
  
  // Medium competition areas
  const mediumCompetitionAreas = [
    'FORT WORTH', 'EL PASO', 'MCKINNEY', 'DENTON',
    'CARROLLTON', 'ROUND ROCK', 'WACO', 'RICHARDSON'
  ];
  
  const cityUpper = city ? city.toUpperCase() : '';
  
  if (highCompetitionAreas.includes(cityUpper)) {
    return 0.95; // 5% reduction due to high competition
  } else if (mediumCompetitionAreas.includes(cityUpper)) {
    return 0.98; // 2% reduction due to medium competition
  }
  
  return 1.0; // No competition adjustment for other areas
}

// Zipcode-based factor for more granular location pricing
function getZipCodeFactor(zipCode) {
  // This would be based on more granular data in a real model
  // Just a small sample for demonstration
  const zipFactors = {
    // High-end zipcodes
    '75225': 1.25, // Highland Park (Dallas)
    '77005': 1.30, // West University (Houston)
    '78746': 1.30, // Westlake (Austin)
    '78209': 1.20, // Alamo Heights (San Antonio)
    
    // Mid-range zipcodes
    '75082': 1.05, // Richardson
    '75093': 1.10, // Plano
    '77024': 1.15, // Memorial (Houston)
    '78704': 1.15, // South Austin
    
    // Lower-cost zipcodes
    '75211': 0.90, // Oak Cliff (Dallas)
    '77033': 0.85, // South Park (Houston)
    '78744': 0.90, // Southeast Austin
    '78207': 0.85, // West Side (San Antonio)
  };
  
  return zipFactors[zipCode] || 1.0;
}

function getLocationFactor(city) {
  const cityFactors = {
    'Austin': 1.3,          // High income, high cost of living
    'Houston': 1.25,        // High income, high cost of living
    'Dallas': 1.3,          // High income, high cost of living
    'San Antonio': 1.2,     // Moderate income, moderate cost of living
    'Fort Worth': 1.2,      // Moderate income, moderate cost of living
    'El Paso': 1.05,        // Lower income, lower cost of living
    'Arlington': 1.15,      // Moderate income
    'Corpus Christi': 1.1,  // Moderate income
    'Plano': 1.35,          // High income, high cost of living
    'Laredo': 1.05,         // Lower income, lower cost of living
    'Lubbock': 1.1,         // Moderate income
    'Garland': 1.15,        // Moderate income
    'Irving': 1.2,          // High income, moderate cost of living
    'Amarillo': 1.1,        // Moderate income
    'Grand Prairie': 1.15,  // Moderate income
    'McKinney': 1.3,        // High income, high cost of living
    'Frisco': 1.4,          // High income, high cost of living
    'Brownsville': 1.05,    // Lower income, lower cost of living
    'Pasadena': 1.1,        // Moderate income
    'Killeen': 1.05,        // Lower income, lower cost of living
    'McAllen': 1.05,        // Lower income, lower cost of living
    'Waco': 1.1,            // Moderate income
    'Carrollton': 1.2,      // Moderate to high income
    'Midland': 1.3,         // High income due to oil industry
    'Abilene': 1.1,         // Moderate income
    'Denton': 1.15,         // Moderate income
    'Beaumont': 1.1,        // Moderate income
    'Round Rock': 1.25,     // High income, high cost of living
    'Odessa': 1.25,         // High income due to oil industry
    'Wichita Falls': 1.05,  // Lower income
    'College Station': 1.1, // Moderate income
    'Lewisville': 1.2,      // Moderate to high income
    'Tyler': 1.1,           // Moderate income
    'Pearland': 1.25,       // High income, high cost of living
    'San Angelo': 1.1,      // Moderate income
    'Allen': 1.3,           // High income, high cost of living
    'League City': 1.25,    // High income, high cost of living
    'Sugar Land': 1.35,     // High income, high cost of living
    'Longview': 1.1,        // Moderate income
    'Edinburg': 1.05,       // Lower income
    'Mission': 1.05,        // Lower income
    'Bryan': 1.05,          // Lower income
    'Baytown': 1.1,         // Moderate income
    'Pharr': 1.05,          // Lower income
    'Temple': 1.1,          // Moderate income
    'Missouri City': 1.25,  // High income, high cost of living
    'Flower Mound': 1.35,   // High income, high cost of living
    'New Braunfels': 1.2,   // Moderate to high income
    'Cedar Park': 1.3,      // High income, high cost of living
    'Mansfield': 1.25,      // High income, high cost of living
    'Georgetown': 1.25,     // High income, high cost of living
    'Conroe': 1.15,         // Moderate income
    'Victoria': 1.1,        // Moderate income
    'Rowlett': 1.2,         // Moderate to high income
    'Pflugerville': 1.25,   // High income, high cost of living
    'Spring': 1.2,          // Moderate to high income
    'Euless': 1.15,         // Moderate income
    'Port Arthur': 1.05,    // Lower income
  };

  // Default factor for any city not listed
  return cityFactors[city] || 1.0;
}

/**
 * Get median household income based on location
 * @param {string} city - The city name
 * @param {string} zipCode - The zip code
 * @returns {number} - Median annual household income in dollars
 */
// eslint-disable-next-line no-unused-vars
function getMedianIncomeByLocation(city, zipCode) {
  // Data for median household income by zip code (annual income in dollars)
  // These would be expanded with real data in a production environment
  const zipCodeIncomes = {
    // Dallas area
    '75201': 85000, // Downtown Dallas
    '75225': 110000, // Highland Park
    '75243': 60000, // Northeast Dallas
    '75211': 45000, // Southwest Dallas
    
    // Houston area
    '77005': 120000, // West University
    '77024': 115000, // Memorial
    '77004': 55000, // Third Ward
    '77033': 40000, // South Park
    
    // Austin area
    '78746': 125000, // West Lake Hills
    '78704': 85000, // South Austin
    '78741': 60000, // East Austin
    '78744': 48000, // Southeast Austin
    
    // San Antonio area
    '78258': 90000, // Stone Oak
    '78209': 85000, // Alamo Heights
    '78207': 35000, // West Side
    
    // Default values
    '75001': 65000, // Default Dallas suburb
    '77001': 68000, // Default Houston
    '78701': 75000, // Default Austin
    '78201': 52000, // Default San Antonio
  };
  
  // City-based income data as fallback
  const cityIncomes = {
    'Austin': 71000,
    'Dallas': 65000,
    'Houston': 68000,
    'San Antonio': 52000,
    'Fort Worth': 60000,
    'El Paso': 48000,
    'Plano': 95000,
    'Frisco': 100000,
    'Irving': 64000,
    'Arlington': 58000,
    'McKinney': 93000,
    'Lubbock': 52000,
    'Midland': 75000,
    'Garland': 60000,
    'Sugar Land': 105000
  };
  
  // Try to get income by zip code first
  if (zipCode && zipCodeIncomes[zipCode]) {
    return zipCodeIncomes[zipCode];
  }
  
  // Fall back to city-based data
  if (city && cityIncomes[city]) {
    return cityIncomes[city];
  }
  
  // Default if no data available
  return 65000; // Average Texas household income
}

/**
 * Calculate quality score for a daycare on a scale of 0-10
 * @param {Object} daycare - The daycare data object
 * @returns {number} - Quality score from 0-10
 */
function calculateQualityScore(daycare) {
  let score = 5; // Start at 5 (middle of 0-10 scale)
  
  // --- FACTOR: VIOLATIONS IMPACT ---
  // Count violations by severity
  const highRiskViolations = getViolationCount(daycare, 'high');
  const mediumHighRiskViolations = getViolationCount(daycare, 'medium_high');
  const mediumRiskViolations = getViolationCount(daycare, 'medium');
  const lowRiskViolations = getViolationCount(daycare, 'low');
  
  // Apply appropriate penalties based on violation severity
  if (highRiskViolations > 0) {
    // High risk violations severely impact quality
    score -= Math.min(3.0, 1.5 + (highRiskViolations - 1) * 0.5);
  }
  
  if (mediumHighRiskViolations > 0) {
    // Medium-high risk violations have significant impact
    score -= Math.min(2.0, 1.0 + (mediumHighRiskViolations - 1) * 0.25);
  }
  
  if (mediumRiskViolations > 0) {
    // Medium risk violations have moderate impact
    score -= Math.min(1.0, 0.5 + (mediumRiskViolations - 1) * 0.1);
  }
  
  if (lowRiskViolations > 0) {
    // Low risk violations have minimal impact
    score -= Math.min(0.5, 0.2 + (lowRiskViolations - 1) * 0.05);
  }
  
  // --- FACTOR: ACCREDITATION ---
  const isAccredited = daycare.accredited === 'Yes' || 
    (daycare.programs_provided && daycare.programs_provided.includes('Accredited'));
  
  if (isAccredited) {
    score += 2.0;
  }
  
  // --- FACTOR: STAFF-TO-CHILD RATIO ---
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
      if (ratio <= 4) score += 2.0;        // Excellent ratio
      else if (ratio <= 6) score += 1.5;   // Very good ratio
      else if (ratio <= 8) score += 1.0;   // Good ratio
      else if (ratio >= 15) score -= 1.0;  // Poor ratio
    }
  }
  
  // --- FACTOR: YEARS IN OPERATION ---
  const yearsInOperation = daycare.yearsInOperation || 0;
  if (yearsInOperation >= 10) score += 1.5;
  else if (yearsInOperation >= 5) score += 1.0;
  else if (yearsInOperation >= 2) score += 0.5;
  
  // --- FACTOR: EDUCATIONAL PROGRAMS ---
  if (daycare.programs_provided) {
    const programs = daycare.programs_provided.toLowerCase();
    
    // Educational programs
    if (programs.includes('montessori') || 
        programs.includes('educational') || 
        programs.includes('skill classes')) {
      score += 1.0;
    }
    
    // Language programs
    if (programs.includes('language') || programs.includes('bilingual')) {
      score += 0.8;
    }
    
    // Special needs accommodation
    if (programs.includes('special needs')) {
      score += 0.8;
    }
    
    // Extended hours/flexibility
    if (programs.includes('extended hours')) {
      score += 0.6;
    }
  }
  
  // --- FACTOR: INSPECTION COMPLIANCE ---
  // More passed inspections improves quality score
  const totalInspections = parseInt(daycare.total_inspections || daycare.total_inspections_2yr || 0, 10);
  
  // Bonus for clean inspections
  if (totalInspections > 0) {
    if (highRiskViolations === 0 && mediumHighRiskViolations === 0) {
      // Perfect record - bigger bonus
      score += Math.min(1.5, totalInspections * 0.2);
    } else if (highRiskViolations === 0) {
      // No high risk violations - moderate bonus
      score += Math.min(1.0, totalInspections * 0.15);
    }
  }
  
  // Ensure score is within 0-10 range
  return Math.max(0, Math.min(10, score));
}

/**
 * Calculate location accessibility score on a scale of 0-1
 * @param {Object} daycare - The daycare data object
 * @returns {number} - Location score from 0-1
 */
// eslint-disable-next-line no-unused-vars
function calculateLocationAccessibility(daycare) {
  // Default to a middle value
  let score = 0.7;
  
  // --- FACTOR: CITY CENTER PROXIMITY ---
  // Major cities have better accessibility infrastructure
  const city = (daycare.city || '').toLowerCase();
  const majorCities = ['austin', 'dallas', 'houston', 'san antonio', 'fort worth', 'plano', 'frisco'];
  if (majorCities.includes(city)) {
    score += 0.1;
  }
  
  // --- FACTOR: TRANSPORTATION OPTIONS ---
  if (daycare.programs_provided && 
      daycare.programs_provided.toLowerCase().includes('transportation')) {
    score += 0.15;
  }
  
  // --- FACTOR: ZIP CODE LOCATION ---
  // Some zip codes have better accessibility based on location
  // This would be expanded with real data in a production environment
  const accessibleZips = {
    '75201': 0.95, // Downtown Dallas
    '77002': 0.95, // Downtown Houston
    '78701': 0.95, // Downtown Austin
    '78205': 0.95, // Downtown San Antonio
    '75093': 0.85, // Plano
    '75034': 0.85, // Frisco
    '75039': 0.85, // Irving
    '77024': 0.90, // Memorial, Houston
    '78704': 0.90, // South Austin
    '78209': 0.85, // Alamo Heights, San Antonio
  };
  
  if (daycare.zip_code && accessibleZips[daycare.zip_code]) {
    // Use the better score between default and zip-specific
    score = Math.max(score, accessibleZips[daycare.zip_code]);
  }
  
  // Ensure score is within 0-1 range
  return Math.max(0, Math.min(1, score));
}