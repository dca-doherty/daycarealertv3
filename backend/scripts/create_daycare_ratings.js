/**
 * Create Daycare Ratings Table
 * 
 * This script creates a new table called 'daycare_ratings' that provides a 1-5 star 
 * rating system for daycares based on risk analysis and compliance data.
 * 
 * The rating incorporates data from:
 * - revised_non_compliance (for detailed violation categories and revised risk levels)
 * - risk_analysis (for comprehensive risk scores and analysis)
 * - daycare_operations (for operational metrics)
 * - daycare_cost_estimates (for price/quality correlation)
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Rating algorithm constants
const RATING_CONSTANTS = {
  // Risk score thresholds for base rating - adjusted to create more balanced distribution
  RISK_SCORE_THRESHOLDS: [
    { threshold: 5, baseRating: 5.0 },    // Extremely low risk (5 stars) - more restrictive
    { threshold: 15, baseRating: 4.5 },   // Very low risk (4.5 stars)
    { threshold: 25, baseRating: 4.0 },   // Low risk (4 stars)
    { threshold: 35, baseRating: 3.5 },   // Low-moderate risk (3.5 stars)
    { threshold: 45, baseRating: 3.0 },   // Moderate risk (3 stars)
    { threshold: 55, baseRating: 2.5 },   // Moderate-high risk (2.5 stars)
    { threshold: 70, baseRating: 2.0 },   // High risk (2 stars)
    { threshold: 85, baseRating: 1.5 },   // Very high risk (1.5 stars)
    { threshold: Infinity, baseRating: 1.0 }  // Extremely high risk (1 star)
  ],

  // Category weights for calculating category-specific scores
  // Enhanced to better reflect the comprehensive quality indicators
  CATEGORY_WEIGHTS: {
    'Safety': 2.0,              // Most important - direct safety impact
    'Child Well-being': 1.5,    // Very important for child development
    'Health': 1.5,              // Very important for child health
    'Sleep/Rest': 1.2,          // Important for infant safety especially
    'Transportation': 1.0,      // Important when provided
    'Facility': 0.8,            // Moderate importance
    'Administrative': 0.6,      // Increased importance (staff qualifications)
    'Paperwork': 0.4,           // Documentation of compliance
    'Nutrition': 1.0,           // Added for nutrition and meals
    'Physical Activity': 0.8    // Added for physical development
  },

  // Risk level weights for calculating violations impact - increased weight to improve differentiation
  RISK_LEVEL_WEIGHTS: {
    'High': 1.5,            // Increased from 1.0
    'Medium High': 1.0,     // Increased from 0.7
    'Medium': 0.6,          // Increased from 0.4
    'Medium Low': 0.3,      // Increased from 0.2
    'Low': 0.15             // Increased from 0.1
  },

  // Time recency factors (more recent violations count more)
  TIME_RECENCY_FACTOR: {
    RECENT_3_MONTHS: 1.0,      // Last 3 months: full weight
    RECENT_6_MONTHS: 0.8,      // 3-6 months: 80% weight
    RECENT_12_MONTHS: 0.6,     // 6-12 months: 60% weight
    RECENT_24_MONTHS: 0.3,     // 12-24 months: 30% weight
    OLDER: 0.1                 // Older than 24 months: 10% weight
  },

  // Quality indicators for potential rating boost
  QUALITY_INDICATORS: {
    // Accreditations that can increase star rating
    ACCREDITATIONS: {
      'NAEYC': 0.5,               // National Association for the Education of Young Children
      'NECPA': 0.4,               // National Early Childhood Program Accreditation
      'NAC': 0.4,                 // National Accreditation Commission
      'NAFCC': 0.3,               // National Association for Family Child Care
      'TEXAS RISING STAR': 0.5,   // Texas Rising Star program
      'ADVANCED': 0.3,            // AdvancED accreditation (Cognia)
      'COGNIA': 0.3,              // Cognia (formerly AdvancED)
      'CARF': 0.3,                // Commission on Accreditation of Rehabilitation Facilities
      'COA': 0.3,                 // Council on Accreditation
      'APPLE': 0.3,               // Accredited Professional Preschool Learning Environment
      'ACSI': 0.3,                // Association of Christian Schools International
      'CCLI': 0.3,                // Child Care Licensing Indicator
      'SACS': 0.3,                // Southern Association of Colleges and Schools
      'NAA': 0.3,                 // National Afterschool Association
      'NAREA': 0.3,               // North American Reggio Emilia Alliance
      'QUALITY RATED': 0.3,       // Quality Rated
      'QRIS': 0.3,                // Quality Rating and Improvement System
      'STARS': 0.3,               // Various STARS programs
      'BRIGHT FROM THE START': 0.3, // Georgia's early learning program
      'NAMC': 0.3,                // North American Montessori Center
      'QUALITY STAR': 0.3         // QualityStar program
    },

    // Premium curriculum methods
    CURRICULUM_METHODS: {
      'MONTESSORI': 0.4,
      'REGGIO EMILIA': 0.4,
      'WALDORF': 0.4,
      'HIGHSCOPE': 0.3,
      'CREATIVE CURRICULUM': 0.3,
      'PROJECT APPROACH': 0.3,
      'STEM': 0.3,
      'STEAM': 0.3,
      'PLAY-BASED': 0.2,
      'EMERGENT': 0.2,
      'BANK STREET': 0.3,
      'INQUIRY-BASED': 0.3,
      'WHOLE CHILD': 0.3,
      'LANGUAGE IMMERSION': 0.3,
      'BILINGUAL': 0.3,
      'SPANISH': 0.2,
      'FRENCH': 0.2,
      'MANDARIN': 0.2,
      'DEVELOPMENTAL': 0.2,
      'CONSTRUCTIVIST': 0.3
    },
    
    // Staff qualifications and education
    STAFF_QUALIFICATIONS: {
      'DEGREE': 0.3,               // Staff with degrees
      'DEGREED': 0.3,              // Degreed staff
      'CERTIFIED': 0.3,            // Certified staff
      'TEACHER': 0.2,              // Qualified teachers
      'CDA': 0.3,                  // Child Development Associate
      'EARLY CHILDHOOD': 0.3,      // Early childhood specialization
      'MASTER': 0.4,               // Master's degree
      'MASTERS': 0.4,              // Master's degree(s)
      'BACHELOR': 0.3,             // Bachelor's degree
      'ASSOCIATE': 0.2,            // Associate's degree
      'CREDENTIAL': 0.2,           // Professional credentials
      'LICENSED': 0.2,             // Licensed professionals
      'CERTIFICATION': 0.2,        // Certifications
      'CERTIFIED TEACHERS': 0.3    // Certified teachers
    },
    
    // Health, nutrition and physical activity
    HEALTH_AND_NUTRITION: {
      'ORGANIC': 0.2,              // Organic meals
      'NUTRITIOUS': 0.2,           // Nutritious meals emphasized
      'BALANCED': 0.2,             // Balanced meals
      'PHYSICAL': 0.2,             // Physical activity emphasis
      'OUTDOOR': 0.2,              // Outdoor activities
      'GARDEN': 0.2,               // Gardening/nature activities
      'GARDENING': 0.1,            // Gardening/nature programs
      'USDA': 0.1,                 // USDA food program
      'EXERCISE': 0.2,             // Exercise programs
      'YOGA': 0.1,                 // Yoga/mindfulness
      'HEALTH': 0.2,               // Health focus
      'DANCE': 0.1,                // Dance programs
      'MUSIC': 0.1,                // Music programs
      'ART': 0.1                   // Art programs
    },
    
    // Additional comprehensive services 
    COMPREHENSIVE_SERVICES: {
      'SUBSIDIES': 0.2,            // Accepts child care subsidies
      'EXTENDED HOURS': 0.2,       // Extended care hours
      'WEEKEND': 0.2,              // Weekend availability
      'EVENING': 0.2,              // Evening care
      'TRANSPORTATION': 0.1,       // Transportation service
      'INFANT': 0.1,               // Specialized infant care
      'SPECIAL NEEDS': 0.2,        // Special needs accommodation
      'INCLUSION': 0.2,            // Inclusive environment
      'AFTER SCHOOL': 0.1,         // After school programs
      'SUMMER': 0.1,               // Summer programs
      'CAMERA': 0.2,               // Camera systems
      'SECURE': 0.2,               // Secure facility
      'SECURITY': 0.2,             // Enhanced security measures 
      'SMALL GROUP': 0.2,          // Small group sizes
      'LOW RATIO': 0.3,            // Low staff-to-child ratios
      'GIFTED': 0.2,               // Gifted program
      'FAITH-BASED': 0.1,          // Faith-based programs
      'ENRICHMENT': 0.2            // Enrichment programs
    }
  }
};

// Create the daycare_ratings table
async function createRatingsTable(pool) {
  console.log('Creating daycare_ratings table...');
  
  try {
    // First check if the table already exists
    const [tables] = await pool.query(
      "SHOW TABLES LIKE 'daycare_ratings'"
    );
    
    if (tables.length > 0) {
      console.log('Table daycare_ratings already exists, dropping it...');
      await pool.query('DROP TABLE daycare_ratings');
    }
    
    // Create the new table
    await pool.query(`
      CREATE TABLE daycare_ratings (
        id INT NOT NULL AUTO_INCREMENT,
        operation_id VARCHAR(50) NOT NULL,
        overall_rating DECIMAL(2,1) NOT NULL,
        
        /* Original category ratings */
        safety_rating DECIMAL(2,1),
        health_rating DECIMAL(2,1),
        wellbeing_rating DECIMAL(2,1),
        facility_rating DECIMAL(2,1),
        admin_rating DECIMAL(2,1),
        
        /* New subcategory ratings on 1-10 scale */
        safety_compliance_score DECIMAL(3,1),
        operational_quality_score DECIMAL(3,1),
        educational_programming_score DECIMAL(3,1),
        staff_qualifications_score DECIMAL(3,1),
        
        /* Original fields */
        risk_score DECIMAL(5,2),
        violation_count INT DEFAULT 0,
        high_risk_violation_count INT DEFAULT 0,
        recent_violations_count INT DEFAULT 0,
        rating_factors TEXT,
        quality_indicators TEXT,
        
        /* Additional data for tiered display */
        subcategory_data TEXT,
        
        last_updated TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY (operation_id),
        INDEX (overall_rating),
        INDEX (safety_rating),
        INDEX (health_rating),
        INDEX (safety_compliance_score),
        INDEX (operational_quality_score)
      )
    `);
    
    console.log('Table created successfully!');
    return true;
  } catch (err) {
    console.error('Error creating table:', err.message);
    return false;
  }
}

// Process all daycares for ratings
async function generateRatings(pool) {
  console.log('Generating daycare ratings...');
  
  try {
    // Get list of all daycares with related data including operational factors
    const [daycares] = await pool.query(`
      SELECT 
        d.OPERATION_ID,
        d.OPERATION_NAME,
        d.OPERATION_TYPE,
        d.CITY,
        d.COUNTY,
        d.TOTAL_INSPECTIONS,
        d.TOTAL_VIOLATIONS,
        d.HIGH_RISK_VIOLATIONS,
        d.MEDIUM_HIGH_RISK_VIOLATIONS,
        d.MEDIUM_RISK_VIOLATIONS,
        d.LOW_RISK_VIOLATIONS,
        d.ISSUANCE_DATE,
        d.PROGRAMMATIC_SERVICES,
        d.ACCEPTS_CHILD_CARE_SUBSIDIES,
        d.HOURS_OF_OPERATION,
        d.DAYS_OF_OPERATION,
        d.TOTAL_CAPACITY,
        d.LICENSED_TO_SERVE_AGES,
        d.CONDITIONS_ON_PERMIT,
        d.OPERATION_STATUS,
        d.TEMPORARILY_CLOSED,
        DATEDIFF(CURRENT_DATE, d.ISSUANCE_DATE) / 365 as years_in_operation,
        r.risk_score,
        r.high_risk_count,
        r.medium_high_risk_count,
        r.medium_risk_count,
        r.low_risk_count,
        c.weekly_cost,
        c.calculation_factors
      FROM 
        daycare_operations d
      LEFT JOIN 
        risk_analysis r ON d.OPERATION_ID = r.operation_id
      LEFT JOIN 
        daycare_cost_estimates c ON d.OPERATION_ID = c.operation_id
    `);
    
    console.log(`Found ${daycares.length} daycares to rate`);
    
    // Track rating statistics
    const stats = {
      totalRated: 0,
      ratingsDistribution: {
        '5': 0, '4.5': 0, '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0
      },
      averageRating: 0,
      totalRatingScore: 0
    };
    
    // Process each daycare
    for (const daycare of daycares) {
      // Get violation data from revised_non_compliance table, and join with the most recent
      // inspection date for each operation to determine recency
      const [violations] = await pool.query(`
        SELECT 
          r.CATEGORY,
          r.REVISED_RISK_LEVEL,
          r.STANDARD_NUMBER_DESCRIPTION,
          r.NARRATIVE,
          r.NON_COMPLIANCE_ID,
          r.CORRECTED_DATE,
          n.CORRECTED_DATE as original_corrected_date
        FROM 
          revised_non_compliance r
        LEFT JOIN
          non_compliance n ON r.NON_COMPLIANCE_ID = n.NON_COMPLIANCE_ID
        WHERE 
          r.OPERATION_ID = ?
      `, [daycare.OPERATION_ID]);
      
      // Also get the most recent inspection dates for this daycare to determine recency
      const [inspections] = await pool.query(`
        SELECT 
          ACTIVITY_DATE
        FROM 
          inspections
        WHERE 
          OPERATION_ID = ?
          AND ACTIVITY_DATE IS NOT NULL
        ORDER BY 
          ACTIVITY_DATE DESC
        LIMIT 5
      `, [daycare.OPERATION_ID]);
      
      // Calculate the rating
      const rating = calculateRating(daycare, violations, inspections);
      
      // Save to database
      await saveRatingToDB(pool, daycare.OPERATION_ID, rating);
      
      // Update statistics
      stats.totalRated++;
      const roundedRating = Math.round(rating.overall_rating * 2) / 2; // Round to nearest 0.5
      stats.ratingsDistribution[roundedRating.toString()]++;
      stats.totalRatingScore += rating.overall_rating;
      
      // Log progress periodically
      if (stats.totalRated % 100 === 0) {
        console.log(`Progress: Rated ${stats.totalRated}/${daycares.length} daycares...`);
      }
    }
    
    // Calculate final statistics
    stats.averageRating = stats.totalRatingScore / stats.totalRated;
    
    console.log('Rating generation complete!');
    console.log(`Total daycares rated: ${stats.totalRated}`);
    console.log(`Average rating: ${stats.averageRating.toFixed(2)} stars`);
    console.log('Rating distribution:');
    Object.entries(stats.ratingsDistribution)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        const percentage = (count / stats.totalRated) * 100;
        console.log(`  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)`);
      });
    
    return stats;
  } catch (err) {
    console.error('Error generating ratings:', err.message);
    throw err;
  }
}

// Calculate subcategory ratings (1-10 scale)
function calculateSubcategoryRatings(daycare, violations, ratingResult) {
  const subcategory = {
    safety_compliance: 0,
    operational_quality: 0,
    educational_programming: 0,
    staff_qualifications: 0,
    descriptions: {
      safety_compliance: "Measures regulatory compliance and safety factors including violation history, risk scores, and safety protocols.",
      operational_quality: "Evaluates hours of operation, weekend availability, subsidy acceptance, and other operational conveniences.",
      educational_programming: "Assesses curriculum quality, accreditations, and educational approach based on available information.",
      staff_qualifications: "Examines staff credentials, training levels, and professional development opportunities."
    }
  };
  
  // 1. Safety & Compliance Score (1-10)
  // Based primarily on risk scores and violation history
  if (daycare.risk_score !== null && daycare.risk_score !== undefined) {
    // Convert risk score to 1-10 scale (inverted, lower risk score = higher rating)
    // Risk scores typically range from 0-100+ so we map across this range
    subcategory.safety_compliance = Math.max(1, 10 - (daycare.risk_score / 10));
  } else {
    // Fallback based on violation counts
    const totalViolations = violations.length || 0;
    const highRiskViolations = ratingResult.high_risk_violation_count || 0;
    
    // Start with perfect score and deduct based on violations
    subcategory.safety_compliance = 10;
    
    // Deduct for violations (more weight on high risk)
    subcategory.safety_compliance -= (highRiskViolations * 1.5);
    subcategory.safety_compliance -= ((totalViolations - highRiskViolations) * 0.5);
    
    // Ensure score is within 1-10 range
    subcategory.safety_compliance = Math.max(1, Math.min(10, subcategory.safety_compliance));
  }
  
  // 2. Operational Quality Score (1-10)
  // Based on operational indicators collected earlier
  const operationalIndicators = ratingResult.quality_indicators.filter(i => 
    i.category === 'operational' || 
    i.indicator.includes('child care subsidies') ||
    i.indicator.includes('morning care') ||
    i.indicator.includes('evening') ||
    i.indicator.includes('Saturday') ||
    i.indicator.includes('Sunday') ||
    i.indicator.includes('infant care') ||
    i.indicator.includes('wide age range') ||
    i.indicator.includes('capacity')
  );
  
  // Start with base score and add for operational qualities
  subcategory.operational_quality = 5;
  
  // Add points for each operational indicator
  operationalIndicators.forEach(indicator => {
    // Extract boost value from impact string
    const boostMatch = indicator.impact.match(/([+-]?\d+\.\d+)/);
    if (boostMatch) {
      // Convert from star scale to 10-point scale (roughly 5x)
      const boostValue = parseFloat(boostMatch[1]) * 5;
      subcategory.operational_quality += boostValue;
    }
  });
  
  // Special adjustments
  if (daycare.TEMPORARILY_CLOSED === 'Y' || daycare.OPERATION_STATUS === 'INACTIVE') {
    subcategory.operational_quality = Math.max(1, subcategory.operational_quality - 5);
  }
  
  // Ensure score is within 1-10 range
  subcategory.operational_quality = Math.max(1, Math.min(10, subcategory.operational_quality));
  
  // 3. Educational Programming Score (1-10)
  // Based on curriculum indicators, accreditations, etc.
  const educationalIndicators = ratingResult.quality_indicators.filter(i => 
    i.indicator.includes('curriculum') ||
    i.indicator.includes('accreditation') ||
    i.indicator.includes('Montessori') ||
    i.indicator.includes('STEM') ||
    i.indicator.includes('Waldorf') ||
    i.indicator.includes('Reggio')
  );
  
  // Start with average score and adjust based on indicators
  subcategory.educational_programming = 5;
  
  educationalIndicators.forEach(indicator => {
    // Extract boost value and convert to 10-point scale
    const boostMatch = indicator.impact.match(/([+-]?\d+\.\d+)/);
    if (boostMatch) {
      const boostValue = parseFloat(boostMatch[1]) * 7; // Higher multiplier for educational factors
      subcategory.educational_programming += boostValue;
    }
  });
  
  // Check program services for educational keywords
  if (daycare.PROGRAMMATIC_SERVICES) {
    const programServices = daycare.PROGRAMMATIC_SERVICES.toUpperCase();
    const educationalKeywords = [
      'CURRICULUM', 'EDUCATION', 'LEARNING', 'DEVELOPMENT', 
      'ACADEMIC', 'SCHOOL READINESS', 'COGNITIVE'
    ];
    
    // Add points for educational keywords
    educationalKeywords.forEach(keyword => {
      if (programServices.includes(keyword)) {
        subcategory.educational_programming += 0.5;
      }
    });
  }
  
  // Ensure score is within 1-10 range
  subcategory.educational_programming = Math.max(1, Math.min(10, subcategory.educational_programming));
  
  // 4. Staff Qualifications Score (1-10)
  // Based on staff qualification indicators
  const staffIndicators = ratingResult.quality_indicators.filter(i => 
    i.indicator.includes('staff qualification') ||
    i.indicator.includes('degree') ||
    i.indicator.includes('certified') ||
    i.indicator.includes('CDA') ||
    i.indicator.includes('Master')
  );
  
  // Start with average score
  subcategory.staff_qualifications = 5;
  
  staffIndicators.forEach(indicator => {
    // Extract boost value and convert to 10-point scale
    const boostMatch = indicator.impact.match(/([+-]?\d+\.\d+)/);
    if (boostMatch) {
      const boostValue = parseFloat(boostMatch[1]) * 8; // Higher multiplier for staff qualifications
      subcategory.staff_qualifications += boostValue;
    }
  });
  
  // Check program services for staff qualification keywords
  if (daycare.PROGRAMMATIC_SERVICES) {
    const programServices = daycare.PROGRAMMATIC_SERVICES.toUpperCase();
    const staffKeywords = [
      'CERTIFIED TEACHER', 'DEGREE', 'CREDENTIAL', 'QUALIFIED', 
      'TRAINED', 'EXPERIENCED', 'PROFESSIONAL'
    ];
    
    // Add points for staff qualification keywords
    staffKeywords.forEach(keyword => {
      if (programServices.includes(keyword)) {
        subcategory.staff_qualifications += 0.5;
      }
    });
  }
  
  // Ensure score is within 1-10 range
  subcategory.staff_qualifications = Math.max(1, Math.min(10, subcategory.staff_qualifications));
  
  // Round all scores to one decimal place
  subcategory.safety_compliance = Math.round(subcategory.safety_compliance * 10) / 10;
  subcategory.operational_quality = Math.round(subcategory.operational_quality * 10) / 10;
  subcategory.educational_programming = Math.round(subcategory.educational_programming * 10) / 10;
  subcategory.staff_qualifications = Math.round(subcategory.staff_qualifications * 10) / 10;
  
  return subcategory;
}

// Calculate star rating for a daycare
function calculateRating(daycare, violations, inspections = []) {
  // Initialize rating object
  const ratingResult = {
    overall_rating: 3.0, // Default is 3 stars if no data
    safety_rating: null,
    health_rating: null,
    wellbeing_rating: null,
    facility_rating: null,
    admin_rating: null,
    risk_score: daycare.risk_score || 0,
    violation_count: violations.length,
    high_risk_violation_count: 0,
    recent_violations_count: 0,
    rating_factors: [],
    quality_indicators: [],
    safety_compliance_score: null,
    operational_quality_score: null,
    educational_programming_score: null,
    staff_qualifications_score: null,
    subcategory_data: null
  };
  
  // Determine if the violations are recent based on most recent inspection dates
  // and correction dates from the violations
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  // Count violations that have been corrected within the past year as recent
  ratingResult.recent_violations_count = violations.filter(v => {
    const correctedDate = v.CORRECTED_DATE ? new Date(v.CORRECTED_DATE) : null;
    return correctedDate && correctedDate >= oneYearAgo;
  }).length;
  
  // STEP 1: Calculate base rating from risk score
  if (daycare.risk_score !== null && daycare.risk_score !== undefined) {
    // Find appropriate base rating from thresholds
    for (const { threshold, baseRating } of RATING_CONSTANTS.RISK_SCORE_THRESHOLDS) {
      if (daycare.risk_score <= threshold) {
        ratingResult.overall_rating = baseRating;
        break;
      }
    }
    
    // Track reasoning for this rating
    ratingResult.rating_factors.push({
      factor: 'Base risk score',
      impact: 'primary',
      details: `Risk score of ${typeof daycare.risk_score === 'number' ? daycare.risk_score.toFixed(2) : daycare.risk_score} corresponds to a ${ratingResult.overall_rating} star base rating`
    });
  } else {
    // No risk score, use violation counts as fallback
    const highViolations = daycare.HIGH_RISK_VIOLATIONS || 0;
    const medHighViolations = daycare.MEDIUM_HIGH_RISK_VIOLATIONS || 0;
    const medViolations = daycare.MEDIUM_RISK_VIOLATIONS || 0;
    
    // Simple algorithm based on violation counts
    if (highViolations > 5 || (highViolations + medHighViolations) > 10) {
      ratingResult.overall_rating = 1.0;
    } else if (highViolations > 2 || (highViolations + medHighViolations) > 5) {
      ratingResult.overall_rating = 2.0;
    } else if (highViolations > 0 || medHighViolations > 2 || medViolations > 5) {
      ratingResult.overall_rating = 3.0;
    } else if (medHighViolations > 0 || medViolations > 2) {
      ratingResult.overall_rating = 4.0;
    } else {
      ratingResult.overall_rating = 5.0;
    }
    
    // Track reasoning for this rating
    ratingResult.rating_factors.push({
      factor: 'Violation counts',
      impact: 'primary',
      details: `${highViolations} high, ${medHighViolations} medium-high, and ${medViolations} medium risk violations`
    });
  }
  
  // STEP 2: Calculate category-specific ratings
  const categoryScores = {};
  const categoryViolations = {};
  
  // Only process if we have violations data
  if (violations && violations.length > 0) {
    // Count recent violations
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    // Count of violations by recency
    let recentViolations = { 
      threeMonths: 0,
      sixMonths: 0,
      oneYear: 0,
      twoYears: 0,
      older: 0,
      total: violations.length
    };
    
    // Process violations by category and recency
    violations.forEach(violation => {
      const category = violation.CATEGORY || 'Unknown';
      const riskLevel = violation.REVISED_RISK_LEVEL || 'Low';
      
      // Parse date more carefully to avoid invalid dates
      let activityDate = null;
      if (violation.ACTIVITY_DATE) {
        try {
          activityDate = new Date(violation.ACTIVITY_DATE);
          // Check for invalid date
          if (isNaN(activityDate.getTime())) {
            activityDate = null;
          }
        } catch (e) {
          activityDate = null;
        }
      }
      
      // Initialize category if not present
      if (!categoryViolations[category]) {
        categoryViolations[category] = [];
      }
      
      // Count high risk violations
      if (riskLevel === 'High') {
        ratingResult.high_risk_violation_count++;
      }
      
      // For all violations, determine recency status and time-based factors
      // A violation is considered recent if it happened in the last year
      // Assigning more weight to recent violations
      let timeRecencyFactor = RATING_CONSTANTS.TIME_RECENCY_FACTOR.OLDER;
      if (activityDate) {
        const today = new Date();
        const daysSinceViolation = Math.floor((today - activityDate) / (1000 * 60 * 60 * 24));
        
        // Mark all violations from the past year as "recent"
        if (daysSinceViolation <= 365) {
          ratingResult.recent_violations_count++;
        }
        
        // Determine time factor for scoring
        if (activityDate >= threeMonthsAgo) {
          timeRecencyFactor = RATING_CONSTANTS.TIME_RECENCY_FACTOR.RECENT_3_MONTHS;
          recentViolations.threeMonths++;
        } else if (activityDate >= sixMonthsAgo) {
          timeRecencyFactor = RATING_CONSTANTS.TIME_RECENCY_FACTOR.RECENT_6_MONTHS;
          recentViolations.sixMonths++;
        } else if (activityDate >= oneYearAgo) {
          timeRecencyFactor = RATING_CONSTANTS.TIME_RECENCY_FACTOR.RECENT_12_MONTHS;
          recentViolations.oneYear++;
        } else if (activityDate >= twoYearsAgo) {
          timeRecencyFactor = RATING_CONSTANTS.TIME_RECENCY_FACTOR.RECENT_24_MONTHS;
          recentViolations.twoYears++;
        } else {
          recentViolations.older++;
        }
      } else {
        // If no date, count as older
        recentViolations.older++;
      }
      
      // Get risk level weight
      const riskLevelWeight = RATING_CONSTANTS.RISK_LEVEL_WEIGHTS[riskLevel] || 0.1;
      
      // Calculate violation weight based on risk level and recency
      const violationWeight = riskLevelWeight * timeRecencyFactor;
      
      // Add to category violations with weight
      categoryViolations[category].push({
        description: violation.STANDARD_NUMBER_DESCRIPTION,
        riskLevel,
        date: violation.ACTIVITY_DATE,
        weight: violationWeight
      });
    });
    
    // Set recent violations count (all violations within last 12 months)
    ratingResult.recent_violations_count = recentViolations.threeMonths + 
                                          recentViolations.sixMonths + 
                                          recentViolations.oneYear;
    
    // Calculate category scores
    Object.entries(categoryViolations).forEach(([category, violations]) => {
      // Skip unknown category
      if (category === 'Unknown') return;
      
      // Calculate category weight
      const categoryWeight = RATING_CONSTANTS.CATEGORY_WEIGHTS[category] || 0.5;
      
      // Sum violation weights in this category
      let violationScore = 0;
      violations.forEach(v => {
        violationScore += v.weight;
      });
      
      // Calculate final category score (higher violation score = lower rating)
      const baseScore = 5.0;
      let categoryScore = baseScore - (violationScore * categoryWeight);
      
      // Ensure score is in valid range
      categoryScore = Math.max(1.0, Math.min(5.0, categoryScore));
      
      // Save category score
      categoryScores[category] = categoryScore;
    });
    
    // Map category scores to rating fields
    if (categoryScores['Safety']) {
      ratingResult.safety_rating = categoryScores['Safety'];
    }
    
    if (categoryScores['Health']) {
      ratingResult.health_rating = categoryScores['Health'];
    }
    
    if (categoryScores['Child Well-being']) {
      ratingResult.wellbeing_rating = categoryScores['Child Well-being'];
    }
    
    if (categoryScores['Facility']) {
      ratingResult.facility_rating = categoryScores['Facility'];
    }
    
    if (categoryScores['Administrative'] || categoryScores['Paperwork']) {
      // Average if both exist, otherwise use the one that exists
      if (categoryScores['Administrative'] && categoryScores['Paperwork']) {
        ratingResult.admin_rating = (categoryScores['Administrative'] + categoryScores['Paperwork']) / 2;
      } else {
        ratingResult.admin_rating = categoryScores['Administrative'] || categoryScores['Paperwork'];
      }
    }
    
    // Track significant category scores as rating factors
    Object.entries(categoryScores)
      .filter(([_, score]) => score < 4.0) // Only include categories with lower scores
      .sort((a, b) => a[1] - b[1]) // Sort by score ascending (worst first)
      .slice(0, 3) // Take worst 3
      .forEach(([category, score]) => {
        ratingResult.rating_factors.push({
          factor: `${category} issues`,
          impact: score < 2.5 ? 'major negative' : 'moderate negative',
          details: `${category} rated ${score.toFixed(1)} out of 5 stars`
        });
      });
  }
  
  // STEP 3: Apply quality indicators for potential boosts
  let qualityBoost = 0;
  const qualityIndicators = [];
  
  // Check for specific accreditations and curriculum types
  if (daycare.PROGRAMMATIC_SERVICES) {
    const programServices = (daycare.PROGRAMMATIC_SERVICES || '').toUpperCase();
    
    // Helper function to find matches and add quality indicators
    const findMatches = (category, categoryName) => {
      Object.entries(category).forEach(([keyword, boost]) => {
        // More robust matching - look for whole words or phrases
        const regex = new RegExp(`\\b${keyword}\\b|\\b${keyword}S\\b|\\b${keyword}ES\\b|\\b${keyword}'S\\b`, 'i');
        if (regex.test(programServices) || programServices.includes(keyword)) {
          qualityBoost += boost;
          qualityIndicators.push({
            indicator: `${keyword.charAt(0) + keyword.slice(1).toLowerCase()} ${categoryName}`,
            impact: `+${boost.toFixed(1)} stars`
          });
        }
      });
    };
    
    // Check for each category of quality indicators
    findMatches(RATING_CONSTANTS.QUALITY_INDICATORS.ACCREDITATIONS, 'accreditation');
    findMatches(RATING_CONSTANTS.QUALITY_INDICATORS.CURRICULUM_METHODS, 'curriculum');
    findMatches(RATING_CONSTANTS.QUALITY_INDICATORS.STAFF_QUALIFICATIONS, 'staff qualification');
    findMatches(RATING_CONSTANTS.QUALITY_INDICATORS.HEALTH_AND_NUTRITION, 'health program');
    findMatches(RATING_CONSTANTS.QUALITY_INDICATORS.COMPREHENSIVE_SERVICES, 'service');
  }
  
  // Check operational factors directly from daycare_operations table
  
  // Track subcategory boosts
  let operationalBoost = 0;
  
  // 1. Check if the daycare accepts subsidies
  if (daycare.ACCEPTS_CHILD_CARE_SUBSIDIES === 'Y' || 
      daycare.ACCEPTS_CHILD_CARE_SUBSIDIES === 'Yes') {
    const subsidyBoost = 0.06;  // Further reduced from 0.1
    operationalBoost += subsidyBoost;
    qualityIndicators.push({
      indicator: 'Accepts child care subsidies',
      impact: `+${subsidyBoost.toFixed(2)} stars`,
      category: 'operational'
    });
  }
  
  // 2. Check for extended hours of operation
  if (daycare.HOURS_OF_OPERATION) {
    const hours = daycare.HOURS_OF_OPERATION.toUpperCase();
    
    // Check for extended hours (early morning before 6:30 AM)
    if (hours.includes('5:') || hours.includes('6:00') || hours.includes('6:15')) {
      const earlyHoursBoost = 0.03;  // Further reduced from 0.05
      operationalBoost += earlyHoursBoost;
      qualityIndicators.push({
        indicator: 'Early morning care available',
        impact: `+${earlyHoursBoost.toFixed(2)} stars`,
        category: 'operational'
      });
    }
    
    // Check for late evening care (after 6:30 PM)
    if (hours.includes('7:') || hours.includes('8:') || hours.includes('9:') || 
        hours.includes('10:') || hours.includes('11:') || hours.includes('12 AM') || 
        hours.includes('MIDNIGHT') || hours.includes('OVERNIGHT')) {
      const lateHoursBoost = 0.06;  // Further reduced from 0.1
      operationalBoost += lateHoursBoost;
      qualityIndicators.push({
        indicator: 'Evening/extended care available',
        impact: `+${lateHoursBoost.toFixed(2)} stars`,
        category: 'operational'
      });
    }
    
    // Check for 24-hour care
    if (hours.includes('24 HOUR') || hours.includes('24-HOUR') || 
        hours.includes('24/7') || hours.includes('ROUND THE CLOCK')) {
      const allDayBoost = 0.09;  // Further reduced from 0.15
      operationalBoost += allDayBoost;
      qualityIndicators.push({
        indicator: '24-hour care available',
        impact: `+${allDayBoost.toFixed(2)} stars`,
        category: 'operational'
      });
    }
  }
  
  // 3. Check for weekend operation
  if (daycare.DAYS_OF_OPERATION) {
    const days = daycare.DAYS_OF_OPERATION.toUpperCase();
    
    // Check for Saturday operation
    if (days.includes('SATURDAY') || days.includes('SAT')) {
      const saturdayBoost = 0.03;  // Further reduced from 0.05
      operationalBoost += saturdayBoost;
      qualityIndicators.push({
        indicator: 'Saturday care available',
        impact: `+${saturdayBoost.toFixed(2)} stars`,
        category: 'operational'
      });
    }
    
    // Check for Sunday operation
    if (days.includes('SUNDAY') || days.includes('SUN')) {
      const sundayBoost = 0.06;  // Further reduced from 0.1
      operationalBoost += sundayBoost;
      qualityIndicators.push({
        indicator: 'Sunday care available',
        impact: `+${sundayBoost.toFixed(2)} stars`,
        category: 'operational'
      });
    }
    
    // Check for 7-day operation
    if (days.includes('7 DAY') || days.includes('SEVEN DAY') || 
        days.includes('EVERYDAY') || days.includes('EVERY DAY') ||
        days.includes('ALL WEEK')) {
      const allWeekBoost = 0.09;  // Further reduced from 0.15
      operationalBoost += allWeekBoost;
      qualityIndicators.push({
        indicator: '7-day care available',
        impact: `+${allWeekBoost.toFixed(2)} stars`,
        category: 'operational'
      });
    }
  }
  
  // 4. Check for special conditions
  if (daycare.CONDITIONS_ON_PERMIT === 'Y' || daycare.CONDITIONS_ON_PERMIT === 'Yes') {
    // This is actually a negative factor - special conditions usually indicate restrictions
    const conditionsPenalty = -0.3;  // Keeping strong penalty
    operationalBoost += conditionsPenalty;
    qualityIndicators.push({
      indicator: 'Special conditions on permit',
      impact: `${conditionsPenalty.toFixed(1)} stars`,
      category: 'operational'
    });
  }
  
  // 5. Check capacity - larger facilities may offer more resources/programs
  if (daycare.TOTAL_CAPACITY) {
    const capacity = parseInt(daycare.TOTAL_CAPACITY, 10);
    if (!isNaN(capacity) && capacity > 100) {
      const largeCapacityBoost = 0.03;  // Further reduced from 0.05
      operationalBoost += largeCapacityBoost;
      qualityIndicators.push({
        indicator: 'Large capacity facility',
        impact: `+${largeCapacityBoost.toFixed(2)} stars`,
        category: 'operational'
      });
    }
  }
  
  // 6. Special age-group offerings
  if (daycare.LICENSED_TO_SERVE_AGES) {
    const ageGroups = daycare.LICENSED_TO_SERVE_AGES.toUpperCase();
    
    // Check for infant care - more specialized and demanding
    if (ageGroups.includes('INFANT') || ageGroups.includes('0-17 MONTHS')) {
      const infantCareBoost = 0.06;  // Further reduced from 0.1
      operationalBoost += infantCareBoost;
      qualityIndicators.push({
        indicator: 'Specialized infant care',
        impact: `+${infantCareBoost.toFixed(2)} stars`,
        category: 'operational'
      });
    }
    
    // Check for broad age range - indicates comprehensive services
    if ((ageGroups.includes('INFANT') || ageGroups.includes('0-17')) && 
        (ageGroups.includes('SCHOOL') || ageGroups.includes('5 YEARS') || 
         ageGroups.includes('6 YEARS') || ageGroups.includes('7 YEARS'))) {
      const ageRangeBoost = 0.03;  // Further reduced from 0.05
      operationalBoost += ageRangeBoost;
      qualityIndicators.push({
        indicator: 'Serves wide age range',
        impact: `+${ageRangeBoost.toFixed(2)} stars`,
        category: 'operational'
      });
    }
  }
  
  // Add operational boost to quality boost after calculating total
  qualityBoost += operationalBoost;
  
  // Check cost estimation calculation factors for quality indicators
  if (daycare.calculation_factors) {
    try {
      // Parse JSON if it's a string
      const factors = typeof daycare.calculation_factors === 'string' 
        ? JSON.parse(daycare.calculation_factors) 
        : daycare.calculation_factors;
      
      // Check for quality premium factors
      if (factors.qualityPremiums) {
        Object.entries(factors.qualityPremiums).forEach(([premium, value]) => {
          if (value > 0) {
            // Convert percentage premium to rating boost (max 0.5 stars)
            const premiumBoost = Math.min(0.5, value / 100);
            qualityBoost += premiumBoost;
            
            qualityIndicators.push({
              indicator: `${premium} premium`,
              impact: `+${premiumBoost.toFixed(1)} stars`
            });
          }
        });
      }
    } catch (err) {
      console.warn(`Error parsing calculation factors for ${daycare.OPERATION_ID}:`, err.message);
    }
  }
  
  // Experience boost for long-established daycares
  if (daycare.years_in_operation > 10) {
    const experienceBoost = Math.min(0.3, (daycare.years_in_operation - 10) * 0.02);
    qualityBoost += experienceBoost;
    qualityIndicators.push({
      indicator: `${Math.round(daycare.years_in_operation)} years experience`,
      impact: `+${experienceBoost.toFixed(1)} stars`
    });
  }
  
  // Special case: Meadow Oaks Academy is known to be a Montessori school
  if (daycare.OPERATION_NAME && daycare.OPERATION_NAME.includes('Meadow Oaks')) {
    const montessoriBoost = 0.4;
    qualityBoost += montessoriBoost;
    qualityIndicators.push({
      indicator: 'Montessori curriculum (special case)',
      impact: `+${montessoriBoost.toFixed(1)} stars`
    });
  }
  
  // Apply progressive diminishing returns to quality boost
  // First tier (0-0.1): 100% value
  // Second tier (0.1-0.2): 80% value
  // Third tier (0.2-0.3): 60% value 
  // Fourth tier (0.3-0.4): 40% value
  // Fifth tier (0.4+): 20% value
  let progressiveBoost = 0;
  
  if (qualityBoost > 0) {
    // First 0.1 points at full value
    const tier1 = Math.min(0.1, qualityBoost);
    progressiveBoost += tier1 * 1.0;
    
    // Next 0.1 points at 80% value
    if (qualityBoost > 0.1) {
      const tier2 = Math.min(0.1, qualityBoost - 0.1);
      progressiveBoost += tier2 * 0.8;
      
      // Next 0.1 points at 60% value
      if (qualityBoost > 0.2) {
        const tier3 = Math.min(0.1, qualityBoost - 0.2);
        progressiveBoost += tier3 * 0.6;
        
        // Next 0.1 points at 40% value
        if (qualityBoost > 0.3) {
          const tier4 = Math.min(0.1, qualityBoost - 0.3);
          progressiveBoost += tier4 * 0.4;
          
          // Any remaining points at 20% value
          if (qualityBoost > 0.4) {
            const tier5 = qualityBoost - 0.4;
            progressiveBoost += tier5 * 0.2;
          }
        }
      }
    }
  } else {
    // For negative values (penalties), keep the full value
    progressiveBoost = qualityBoost;
  }
  
  // Cap the total quality boost at 0.4 stars to avoid rating inflation
  // Adjusted from 0.6 to 0.4 for better distribution
  qualityBoost = Math.min(0.4, progressiveBoost);
  
  // Apply the boost to the overall rating
  if (qualityBoost > 0) {
    const originalRating = ratingResult.overall_rating;
    ratingResult.overall_rating = Math.min(5.0, originalRating + qualityBoost);
    
    // Track this adjustment
    ratingResult.rating_factors.push({
      factor: 'Quality indicators',
      impact: 'positive',
      details: `+${qualityBoost.toFixed(1)} star boost for quality factors`
    });
  }
  
  // Save quality indicators to result
  ratingResult.quality_indicators = qualityIndicators;
  
  // STEP 4: Final adjustments and capping
  
  // Check operational status - if temporarily closed, cap rating more strictly
  if (daycare.TEMPORARILY_CLOSED === 'Y' || daycare.TEMPORARILY_CLOSED === 'Yes' ||
      daycare.OPERATION_STATUS === 'INACTIVE' || daycare.OPERATION_STATUS === 'CLOSED') {
    const originalRating = ratingResult.overall_rating;
    ratingResult.overall_rating = Math.min(2.5, originalRating);  // Reduced from 3.0 to 2.5
    
    if (originalRating > 2.5) {
      ratingResult.rating_factors.push({
        factor: 'Temporarily closed',
        impact: 'major negative',
        details: 'Maximum rating capped at 2.5 due to facility being temporarily closed or inactive'
      });
    }
  }
  
  // Recent serious violations can cap the maximum rating
  if (ratingResult.high_risk_violation_count > 0 && ratingResult.recent_violations_count > 0) {
    const originalRating = ratingResult.overall_rating;
    ratingResult.overall_rating = Math.min(4.0, originalRating);
    
    if (originalRating > 4.0) {
      ratingResult.rating_factors.push({
        factor: 'Recent high-risk violations',
        impact: 'negative',
        details: 'Maximum rating capped at 4.0 due to recent serious violations'
      });
    }
  }
  
  // Very high-risk daycares can't exceed 3 stars regardless of quality indicators
  if (daycare.risk_score > 60) {
    const originalRating = ratingResult.overall_rating;
    ratingResult.overall_rating = Math.min(3.0, originalRating);
    
    if (originalRating > 3.0) {
      ratingResult.rating_factors.push({
        factor: 'High overall risk',
        impact: 'major negative',
        details: 'Maximum rating capped at 3.0 due to significant risk factors'
      });
    }
  }
  
  // Finally, round to nearest 0.5
  ratingResult.overall_rating = Math.round(ratingResult.overall_rating * 2) / 2;
  
  // Calculate and add subcategory ratings (1-10 scale)
  const subcategoryRatings = calculateSubcategoryRatings(daycare, violations, ratingResult);
  
  // Add subcategory scores to rating result
  ratingResult.safety_compliance_score = subcategoryRatings.safety_compliance;
  ratingResult.operational_quality_score = subcategoryRatings.operational_quality;
  ratingResult.educational_programming_score = subcategoryRatings.educational_programming;
  ratingResult.staff_qualifications_score = subcategoryRatings.staff_qualifications;
  
  // Store the subcategory data including descriptions for the API
  ratingResult.subcategory_data = JSON.stringify({
    scores: {
      safety_compliance: subcategoryRatings.safety_compliance,
      operational_quality: subcategoryRatings.operational_quality,
      educational_programming: subcategoryRatings.educational_programming,
      staff_qualifications: subcategoryRatings.staff_qualifications
    },
    descriptions: subcategoryRatings.descriptions,
    tooltip_info: {
      safety_compliance: "Safety & Compliance rating evaluates the daycare's adherence to regulatory standards and safety practices based on inspection history and risk assessment.",
      operational_quality: "Operational Quality rating considers factors like extended hours, weekend availability, accessibility, and operational convenience for families.",
      educational_programming: "Educational Programming rating assesses the quality and comprehensiveness of curriculum and educational approach based on available information.",
      staff_qualifications: "Staff Qualifications rating examines indicators of staff education, certification, and professional development."
    }
  });
  
  return ratingResult;
}

// Save rating data to database
async function saveRatingToDB(pool, operationId, ratingData) {
  try {
    // Ensure rating factors and quality indicators are properly processed
    const ratingFactors = Array.isArray(ratingData.rating_factors) ? ratingData.rating_factors : [];
    const qualityIndicators = Array.isArray(ratingData.quality_indicators) ? ratingData.quality_indicators : [];
    
    // Serialize to JSON with proper error handling
    let ratingFactorsJson, qualityIndicatorsJson;
    
    try {
      ratingFactorsJson = JSON.stringify(ratingFactors);
    } catch (e) {
      console.warn(`Error stringifying rating factors for ${operationId}:`, e.message);
      ratingFactorsJson = '[]';
    }
    
    try {
      qualityIndicatorsJson = JSON.stringify(qualityIndicators);
    } catch (e) {
      console.warn(`Error stringifying quality indicators for ${operationId}:`, e.message);
      qualityIndicatorsJson = '[]';
    }
    
    await pool.query(`
      INSERT INTO daycare_ratings (
        operation_id,
        overall_rating,
        safety_rating,
        health_rating,
        wellbeing_rating,
        facility_rating,
        admin_rating,
        safety_compliance_score,
        operational_quality_score,
        educational_programming_score,
        staff_qualifications_score,
        risk_score,
        violation_count,
        high_risk_violation_count,
        recent_violations_count,
        rating_factors,
        quality_indicators,
        subcategory_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        overall_rating = VALUES(overall_rating),
        safety_rating = VALUES(safety_rating),
        health_rating = VALUES(health_rating),
        wellbeing_rating = VALUES(wellbeing_rating),
        facility_rating = VALUES(facility_rating),
        admin_rating = VALUES(admin_rating),
        safety_compliance_score = VALUES(safety_compliance_score),
        operational_quality_score = VALUES(operational_quality_score),
        educational_programming_score = VALUES(educational_programming_score),
        staff_qualifications_score = VALUES(staff_qualifications_score),
        risk_score = VALUES(risk_score),
        violation_count = VALUES(violation_count),
        high_risk_violation_count = VALUES(high_risk_violation_count),
        recent_violations_count = VALUES(recent_violations_count),
        rating_factors = VALUES(rating_factors),
        quality_indicators = VALUES(quality_indicators),
        subcategory_data = VALUES(subcategory_data),
        last_updated = CURRENT_TIMESTAMP
    `, [
      operationId,
      ratingData.overall_rating,
      ratingData.safety_rating,
      ratingData.health_rating,
      ratingData.wellbeing_rating,
      ratingData.facility_rating,
      ratingData.admin_rating,
      ratingData.safety_compliance_score,
      ratingData.operational_quality_score,
      ratingData.educational_programming_score,
      ratingData.staff_qualifications_score,
      ratingData.risk_score,
      ratingData.violation_count,
      ratingData.high_risk_violation_count,
      ratingData.recent_violations_count,
      ratingFactorsJson,
      qualityIndicatorsJson,
      ratingData.subcategory_data
    ]);
    
    return true;
  } catch (err) {
    console.error(`Error saving rating for operation ${operationId}:`, err);
    return false;
  }
}

// Generate a report of the rating statistics
async function generateReport(stats) {
  const reportPath = path.join(__dirname, '../reports/daycare_ratings_report.txt');
  
  // Ensure directory exists
  const reportsDir = path.dirname(reportPath);
  await fs.mkdir(reportsDir, { recursive: true }).catch(() => {});
  
  let report = "DAYCARE STAR RATING REPORT\n";
  report += "=".repeat(50) + "\n\n";
  
  report += "SUMMARY:\n";
  report += `Total daycares rated: ${stats.totalRated}\n`;
  report += `Average rating: ${stats.averageRating.toFixed(2)} stars\n\n`;
  
  report += "RATING DISTRIBUTION:\n";
  Object.entries(stats.ratingsDistribution)
    .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
    .forEach(([rating, count]) => {
      const percentage = (count / stats.totalRated) * 100;
      const bar = "★".repeat(Math.round(parseFloat(rating)));
      report += `${rating} stars (${bar}): ${count} daycares (${percentage.toFixed(2)}%)\n`;
    });
    
  // Add information about operational factors impact with balanced approach
  report += "\nOPERATIONAL FACTORS (BALANCED APPROACH):\n";
  report += "The rating system includes these operational factors with refined weights:\n";
  report += "- Extended hours of operation (early morning: +0.03, evening: +0.06, 24-hour: +0.09)\n";
  report += "- Weekend availability (Saturday: +0.03, Sunday: +0.06, 7-day: +0.09)\n";
  report += "- Acceptance of child care subsidies (+0.06)\n";
  report += "- Specialized infant care (+0.06) and broad age range coverage (+0.03)\n";
  report += "- Facility size and capacity (+0.03 for large facilities)\n";
  report += "- Operational status and permit conditions (up to -0.3 penalty)\n\n";
  report += "These factors use a progressive scoring system with diminishing returns:\n";
  report += "- First 0.1 points: 100% value\n";
  report += "- Next 0.1 points: 80% value\n";
  report += "- Next 0.1 points: 60% value\n";
  report += "- Next 0.1 points: 40% value\n";
  report += "- Any additional: 20% value\n\n";
  report += "The maximum quality boost is capped at +0.4 stars, with stronger penalties\n";
  report += "for facilities with permit conditions or temporary closures (max 2.5 stars).\n\n";
  
  report += "NEW TIERED RATING SYSTEM:\n";
  report += "In addition to the overall star rating, each daycare is now evaluated on four key dimensions\n";
  report += "using a 1-10 scale for more granular assessment:\n\n";
  report += "1. Safety & Compliance (1-10): Regulatory compliance and safety metrics\n";
  report += "2. Operational Quality (1-10): Hours, weekend availability, accessibility features\n";
  report += "3. Educational Programming (1-10): Curriculum quality and educational approach\n";
  report += "4. Staff Qualifications (1-10): Staff education, certification, and professional development\n\n";
  report += "This tiered system allows parents to see both a simple overall rating and detailed\n";
  report += "category-specific scores that align with their individual priorities.\n";
  
  await fs.writeFile(reportPath, report);
  return reportPath;
}

// Main function
async function main() {
  console.log('=== Creating Daycare Ratings Table ===');
  
  // Create connection pool
  console.log('Connecting to database...');
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Create the ratings table structure
    const tableCreated = await createRatingsTable(pool);
    if (!tableCreated) {
      console.error('Could not create ratings table. Exiting...');
      return;
    }
    
    // Generate ratings for all daycares
    console.log('Generating ratings for all daycares...');
    const stats = await generateRatings(pool);
    
    // Generate a report
    console.log('Generating rating report...');
    const reportPath = await generateReport(stats);
    
    console.log(`\nProcess completed successfully!`);
    console.log(`Report saved to: ${reportPath}`);
    
    // Print top-level stats
    console.log('\nRating distribution:');
    Object.entries(stats.ratingsDistribution)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        const percentage = (count / stats.totalRated) * 100;
        console.log(`${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)`);
      });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createRatingsTable,
  calculateRating,
  generateRatings
};