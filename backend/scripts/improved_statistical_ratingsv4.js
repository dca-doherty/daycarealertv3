#!/usr/bin/env node

/**
 * Improved Statistical Ratings Generator
 * 
 * This script implements an enhanced version of the statistical rating system
 * with key improvements:
 * 
 * 1. Reverses Z-score interpretation for Health & Safety
 * 2. Sets explicit thresholds rather than only using Jenks breaks
 * 3. Creates forced distribution bands for balanced rating spread
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration using Unix socket for production server
const dbConfig = {
  socketPath: '/var/run/mysqld/mysqld.sock',  // Unix socket path
  user: 'root',
  password: 'Bd03021988!!',
  database: 'daycarealert',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Improved statistical constants for rating calculations
const STATS_CONSTANTS = {
  // Dimension weights - based on research literature importance
  DIMENSION_WEIGHTS: {
    HEALTH_SAFETY: 0.40,    // Health and safety factors
    STRUCTURAL: 0.25,       // Structural quality (ratios, group size, etc.)
    PROCESS: 0.20,          // Process quality (curriculum, interactions)
    MANAGEMENT: 0.15        // Management factors (experience, stability)
  },
  
  // Explicit percentile-based thresholds to ensure equal distribution across all 9 rating levels
  PERCENTILE_THRESHOLDS: {
    FIVE_STAR: 0.8889,      // Top 11.11% (1/9 of total)
    FOUR_HALF_STAR: 0.7778, // Next 11.11%
    FOUR_STAR: 0.6667,      // Next 11.11%
    THREE_HALF_STAR: 0.5556, // Next 11.11%
    THREE_STAR: 0.4444,     // Next 11.11% 
    TWO_HALF_STAR: 0.3333,  // Next 11.11%
    TWO_STAR: 0.2222,       // Next 11.11%
    ONE_HALF_STAR: 0.1111,  // Next 11.11%
    ONE_STAR: 0.0           // Bottom 11.11%
  },
  
  // Star rating values - ensure we include actual 5 stars and 1 star
  STAR_RATING_VALUES: {
    FIVE_STAR: 5.0,
    FOUR_HALF_STAR: 4.5,
    FOUR_STAR: 4.0,
    THREE_HALF_STAR: 3.5,
    THREE_STAR: 3.0,
    TWO_HALF_STAR: 2.5,
    TWO_STAR: 2.0,
    ONE_HALF_STAR: 1.5,
    ONE_STAR: 1.0
  },
  
  // Explicit raw score thresholds to use when percentiles don't work
  // These are as fallback for dimensions with little variation
  RAW_SCORE_THRESHOLDS: {
    OVERALL: {
      FIVE_STAR: 9.0,       // 90% of max score
      FOUR_HALF_STAR: 8.0,  // 80% of max score
      FOUR_STAR: 7.0,       // 70% of max score
      THREE_HALF_STAR: 6.0, // 60% of max score
      THREE_STAR: 5.0,      // 50% of max score
      TWO_HALF_STAR: 4.0,   // 40% of max score 
      TWO_STAR: 3.0,        // 30% of max score
      ONE_HALF_STAR: 2.0    // 20% of max score
    },
    HEALTH_SAFETY: {
      FIVE_STAR: 9.5,       // 95% of max score
      FOUR_HALF_STAR: 9.0,  // 90% of max score
      FOUR_STAR: 8.5,       // 85% of max score
      THREE_HALF_STAR: 8.0, // 80% of max score
      THREE_STAR: 7.0,      // 70% of max score
      TWO_HALF_STAR: 6.0,   // 60% of max score 
      TWO_STAR: 5.0,        // 50% of max score
      ONE_HALF_STAR: 3.0    // 30% of max score
    },
    STRUCTURAL: {
      FIVE_STAR: 8.0,
      FOUR_HALF_STAR: 7.0,
      FOUR_STAR: 6.0,
      THREE_HALF_STAR: 5.0,
      THREE_STAR: 4.0,
      TWO_HALF_STAR: 3.0,
      TWO_STAR: 2.0,
      ONE_HALF_STAR: 1.0
    },
    PROCESS: {
      FIVE_STAR: 8.0,
      FOUR_HALF_STAR: 7.0,
      FOUR_STAR: 6.0,
      THREE_HALF_STAR: 5.0,
      THREE_STAR: 4.0,
      TWO_HALF_STAR: 3.0,
      TWO_STAR: 2.0,
      ONE_HALF_STAR: 1.0
    },
    MANAGEMENT: {
      FIVE_STAR: 8.0,
      FOUR_HALF_STAR: 7.0,
      FOUR_STAR: 6.0,
      THREE_HALF_STAR: 5.0,
      THREE_STAR: 4.0,
      TWO_HALF_STAR: 3.0,
      TWO_STAR: 2.0,
      ONE_HALF_STAR: 1.0
    }
  },
  
  // Confidence interval modifiers based on data completeness
  CONFIDENCE_MODIFIERS: {
    INSPECTION_COUNT: {
      0: 1.5,              // 0 inspections: 1.5x wider interval
      1: 1.4,              // 1 inspection: 1.4x wider
      2: 1.3,              // 2 inspections: 1.3x wider
      3: 1.2,              // 3 inspections: 1.2x wider
      4: 1.1,              // 4 inspections: 1.1x wider
      5: 1.0,              // 5+ inspections: normal interval
    },
    YEARS_IN_OPERATION: {
      0: 1.4,              // <1 year: 1.4x wider
      1: 1.3,              // 1 year: 1.3x wider
      2: 1.2,              // 2 years: 1.2x wider
      3: 1.1,              // 3 years: 1.1x wider
      4: 1.0               // 4+ years: normal interval
    }
  },
  
  // Time decay function parameters - exponential decay
  TIME_DECAY: {
    HALF_LIFE_DAYS: 365,   // Violation weight reduces by half every year
    BASE_FACTOR: Math.pow(0.5, 1/365) // Daily decay factor
  },
  
  // Category importance for risk scoring
  CATEGORY_IMPORTANCE: {
    'Safety': 2.0,
    'Child Well-being': 1.6,
    'Health': 1.5,
    'Sleep/Rest': 1.3,
    'Transportation': 1.2,
    'Facility': 1.0,
    'Administrative': 0.7,
    'Paperwork': 0.5
  },
  
  // Risk level weights - empirically adjusted
  RISK_LEVEL_WEIGHTS: {
    'High': 10,
    'Medium High': 5,
    'Medium': 2,
    'Medium Low': 1,
    'Low': 0.5
  },
  
  // Quality factor weights based on empirical research
  QUALITY_FACTOR_WEIGHTS: {
    // Curriculum methods (strong research support)
    'MONTESSORI': 0.30,
    'REGGIO EMILIA': 0.30,
    'STEAM': 0.25,
    'STEM': 0.25,
    
    // Accreditations (strong validation)
    'NAEYC': 0.40,
    'TEXAS RISING STAR': 0.35,
    'NECPA': 0.30,
    
    // Staff qualifications (moderate research support)
    'DEGREE': 0.20,
    'CDA': 0.15,
    'CERTIFICATION': 0.15,
    
    // Operational factors (limited impact on quality in research)
    'ACCEPTS_SUBSIDIES': 0.10,
    'EXTENDED_HOURS': 0.05,
    'WEEKEND_CARE': 0.05
  },
  
  // Risk score to health & safety conversion factors
  RISK_SCORE_CONVERSION: {
    MAX_RISK_SCORE: 100,      // Maximum possible risk score
    BASE_HEALTH_SAFETY: 10,   // Base health & safety score (for zero risk)
    CONVERSION_FACTOR: 0.1    // How much to subtract per risk point
  }
};

// Create table structure for improved statistical ratings
async function createImprovedRatingsTable(pool) {
  console.log('Checking improved_daycare_ratings table...');
  
  try {
    // First check if the table already exists
    const [tables] = await pool.query("SHOW TABLES LIKE 'improved_daycare_ratings'");
    
    if (tables.length > 0) {
      console.log('improved_daycare_ratings table already exists, creating backup...');
      // Create a backup of the current table
      await pool.query('DROP TABLE IF EXISTS improved_daycare_ratings_backup');
      await pool.query('CREATE TABLE improved_daycare_ratings_backup LIKE improved_daycare_ratings');
      await pool.query('INSERT INTO improved_daycare_ratings_backup SELECT * FROM improved_daycare_ratings');
      console.log('Backup created successfully!');
      
      // Truncate the current table
      await pool.query('TRUNCATE TABLE improved_daycare_ratings');
      console.log('Existing table cleared, ready for new data');
    } else {
      console.log('Creating improved_daycare_ratings table...');
      await pool.query(`
        CREATE TABLE improved_daycare_ratings (
          id INT NOT NULL AUTO_INCREMENT,
          operation_id VARCHAR(50) NOT NULL,
          
          /* Overall rating */
          overall_rating DECIMAL(2,1) NOT NULL,
          confidence_interval DECIMAL(3,2),
          
          /* Dimension ratings (all 1-5 scale) */
          health_safety_rating DECIMAL(2,1),
          health_safety_percentile DECIMAL(5,2),
          health_safety_raw_score DECIMAL(5,2),
          health_safety_confidence DECIMAL(3,2),
          
          structural_quality_rating DECIMAL(2,1),
          structural_quality_percentile DECIMAL(5,2),
          structural_quality_raw_score DECIMAL(5,2),
          structural_quality_confidence DECIMAL(3,2),
          
          process_quality_rating DECIMAL(2,1),
          process_quality_percentile DECIMAL(5,2),
          process_quality_raw_score DECIMAL(5,2),
          process_quality_confidence DECIMAL(3,2),
          
          management_rating DECIMAL(2,1),
          management_percentile DECIMAL(5,2),
          management_raw_score DECIMAL(5,2),
          management_confidence DECIMAL(3,2),
          
          /* Supporting data */
          risk_score DECIMAL(5,2),
          total_violations INT DEFAULT 0,
          recent_violations INT DEFAULT 0,
          years_in_operation DECIMAL(5,2),
          inspection_count INT DEFAULT 0,
          
          /* Metadata */
          rating_methodology JSON,
          quality_indicators JSON,
          
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY (operation_id),
          INDEX (overall_rating),
          INDEX (health_safety_rating),
          INDEX (structural_quality_rating),
          INDEX (process_quality_rating),
          INDEX (management_rating)
        )
      `);
      console.log('Table created successfully!');
    }
    
    return true;
  } catch (err) {
    console.error('Error managing improved_daycare_ratings table:', err.message);
    return false;
  }
}

// Generate improved statistical ratings for all daycares
async function generateImprovedRatings(pool) {
  console.log('Generating improved statistical daycare ratings...');
  
  try {
    // Get all daycare data for comprehensive analysis
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
        r.total_violations as risk_total_violations,
        r.analysis_summary
      FROM 
        daycare_operations d
      LEFT JOIN 
        risk_analysis r ON d.OPERATION_ID = r.operation_id
    `);
    
    console.log(`Found ${daycares.length} daycares to analyze`);
    
    // First pass: calculate raw scores for each dimension and collect statistics
    console.log('First pass: calculating raw dimension scores...');
    
    // Process daycares in batches to avoid memory issues
    const batchSize = 500;
    const totalBatches = Math.ceil(daycares.length / batchSize);
    
    // Store all daycares with their raw scores
    const daycareData = [];
    
    // Store raw scores for each dimension to calculate percentiles
    const dimensionScores = {
      healthSafety: [],
      structural: [],
      process: [],
      management: []
    };
    
    // First pass
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * batchSize;
      const endIdx = Math.min((batchIndex + 1) * batchSize, daycares.length);
      
      console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (records ${startIdx + 1}-${endIdx})`);
      
      // Process daycares in this batch
      for (let i = startIdx; i < endIdx; i++) {
        const daycare = daycares[i];
        
        // Skip if missing required data
        if (!daycare.OPERATION_ID) {
          console.log(`Skipping daycare with missing OPERATION_ID`);
          continue;
        }
        
        // Get violations for time-based analysis
        const [violations] = await pool.query(`
          SELECT 
            r.CATEGORY,
            r.REVISED_RISK_LEVEL,
            r.STANDARD_NUMBER_DESCRIPTION,
            r.NARRATIVE,
            r.ACTIVITY_DATE,
            r.CORRECTED_DATE
          FROM 
            revised_non_compliance r
          WHERE 
            r.OPERATION_ID = ?
          ORDER BY 
            r.ACTIVITY_DATE DESC
        `, [daycare.OPERATION_ID]);
        
        // Get inspection dates
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
        `, [daycare.OPERATION_ID]);
        
        // Calculate raw dimension scores with improved algorithms
        const rawScores = calculateImprovedRawScores(daycare, violations, inspections);
        
        // Store for analysis and percentile calculation
        daycareData.push({
          daycare,
          violations,
          inspections,
          rawScores
        });
        
        // Add scores to dimension arrays for percentile calculation
        dimensionScores.healthSafety.push({
          operationId: daycare.OPERATION_ID,
          score: rawScores.healthSafety
        });
        
        dimensionScores.structural.push({
          operationId: daycare.OPERATION_ID,
          score: rawScores.structural
        });
        
        dimensionScores.process.push({
          operationId: daycare.OPERATION_ID,
          score: rawScores.process
        });
        
        dimensionScores.management.push({
          operationId: daycare.OPERATION_ID,
          score: rawScores.management
        });
        
        // Log progress periodically
        if ((i - startIdx + 1) % 100 === 0 || i === endIdx - 1) {
          console.log(`Batch progress: Processed ${i - startIdx + 1}/${endIdx - startIdx} daycares...`);
        }
      }
    }
    
    // Calculate percentiles for each dimension
    console.log('Calculating percentiles for each dimension...');
    
    const dimensionPercentiles = calculateDimensionPercentiles(dimensionScores);
    
    // Second pass: Apply percentile thresholds and calculate final ratings
    console.log('Second pass: Calculating final ratings based on percentiles...');
    
    // Track rating distribution statistics
    const ratingDistribution = {
      overall: { '5': 0, '4.5': 0, '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0 },
      healthSafety: { '5': 0, '4.5': 0, '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0 },
      structural: { '5': 0, '4.5': 0, '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0 },
      process: { '5': 0, '4.5': 0, '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0 },
      management: { '5': 0, '4.5': 0, '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0 }
    };
    
    // Process all daycares again - this time calculating percentiles and final ratings
    for (let i = 0; i < daycareData.length; i++) {
      const { daycare, violations, inspections, rawScores } = daycareData[i];
      
      // Get percentiles for this daycare from our pre-calculated maps
      const percentiles = {
        healthSafety: dimensionPercentiles.healthSafety.get(daycare.OPERATION_ID) || 0,
        structural: dimensionPercentiles.structural.get(daycare.OPERATION_ID) || 0,
        process: dimensionPercentiles.process.get(daycare.OPERATION_ID) || 0,
        management: dimensionPercentiles.management.get(daycare.OPERATION_ID) || 0
      };
      
      // Calculate dimension-specific ratings
      const dimensionRatings = {
        healthSafety: calculateRatingFromPercentileAndRawScore(
          percentiles.healthSafety, 
          rawScores.healthSafety, 
          'HEALTH_SAFETY',
          true // Reverse score direction for health & safety (higher raw = better)
        ),
        structural: calculateRatingFromPercentileAndRawScore(
          percentiles.structural, 
          rawScores.structural, 
          'STRUCTURAL'
        ),
        process: calculateRatingFromPercentileAndRawScore(
          percentiles.process, 
          rawScores.process, 
          'PROCESS'
        ),
        management: calculateRatingFromPercentileAndRawScore(
          percentiles.management, 
          rawScores.management, 
          'MANAGEMENT'
        )
      };
      
      // Calculate confidence intervals based on data completeness
      const confidence = calculateConfidenceIntervals(daycare, violations, inspections);
      
      // Calculate weighted overall percentile for better distribution
      const overallPercentile = (
        percentiles.healthSafety * STATS_CONSTANTS.DIMENSION_WEIGHTS.HEALTH_SAFETY +
        percentiles.structural * STATS_CONSTANTS.DIMENSION_WEIGHTS.STRUCTURAL +
        percentiles.process * STATS_CONSTANTS.DIMENSION_WEIGHTS.PROCESS +
        percentiles.management * STATS_CONSTANTS.DIMENSION_WEIGHTS.MANAGEMENT
      );
      
      // Calculate overall rating using the same percentile thresholds as individual dimensions
      // This ensures a consistent distribution across all rating levels
      const overallRatingFromPercentile = calculateRatingFromPercentileAndRawScore(
        overallPercentile,
        // Average raw score (weighted) - only used as fallback
        (rawScores.healthSafety * STATS_CONSTANTS.DIMENSION_WEIGHTS.HEALTH_SAFETY +
        rawScores.structural * STATS_CONSTANTS.DIMENSION_WEIGHTS.STRUCTURAL +
        rawScores.process * STATS_CONSTANTS.DIMENSION_WEIGHTS.PROCESS +
        rawScores.management * STATS_CONSTANTS.DIMENSION_WEIGHTS.MANAGEMENT),
        'OVERALL'
      );
      
      // Final overall rating
      const finalOverallRating = overallRatingFromPercentile;
      
      // Update rating distribution statistics
      ratingDistribution.overall[finalOverallRating.toFixed(1)]++;
      ratingDistribution.healthSafety[dimensionRatings.healthSafety.toFixed(1)]++;
      ratingDistribution.structural[dimensionRatings.structural.toFixed(1)]++;
      ratingDistribution.process[dimensionRatings.process.toFixed(1)]++;
      ratingDistribution.management[dimensionRatings.management.toFixed(1)]++;
      
      // Calculate quality indicators for contextual information
      const qualityIndicators = identifyQualityIndicators(daycare);
      
      // Prepare methodology information for transparency
      const ratingMethodology = {
        percentiles: percentiles,
        rawScores: rawScores,
        dimensionWeights: STATS_CONSTANTS.DIMENSION_WEIGHTS,
        thresholdsApplied: {
          healthSafety: determineThresholdMethod(percentiles.healthSafety, rawScores.healthSafety, 'HEALTH_SAFETY'),
          structural: determineThresholdMethod(percentiles.structural, rawScores.structural, 'STRUCTURAL'),
          process: determineThresholdMethod(percentiles.process, rawScores.process, 'PROCESS'),
          management: determineThresholdMethod(percentiles.management, rawScores.management, 'MANAGEMENT')
        },
        confidenceCalculation: confidence.metadata
      };
      
      // Save complete rating to database
      await saveImprovedRatingToDB(pool, daycare.OPERATION_ID, {
        overallRating: finalOverallRating,
        confidenceInterval: confidence.overall,
        
        healthSafetyRating: dimensionRatings.healthSafety,
        healthSafetyPercentile: percentiles.healthSafety,
        healthSafetyRawScore: rawScores.healthSafety,
        healthSafetyConfidence: confidence.healthSafety,
        
        structuralQualityRating: dimensionRatings.structural,
        structuralQualityPercentile: percentiles.structural,
        structuralQualityRawScore: rawScores.structural,
        structuralQualityConfidence: confidence.structural,
        
        processQualityRating: dimensionRatings.process,
        processQualityPercentile: percentiles.process,
        processQualityRawScore: rawScores.process,
        processQualityConfidence: confidence.process,
        
        managementRating: dimensionRatings.management,
        managementPercentile: percentiles.management,
        managementRawScore: rawScores.management,
        managementConfidence: confidence.management,
        
        riskScore: daycare.risk_score || 0,
        totalViolations: violations.length,
        recentViolations: countRecentViolations(violations),
        yearsInOperation: daycare.years_in_operation || 0,
        inspectionCount: inspections.length,
        
        ratingMethodology,
        qualityIndicators
      });
      
      // Log progress periodically
      if ((i + 1) % 100 === 0 || i === daycareData.length - 1) {
        console.log(`Progress: Processed ${i + 1}/${daycareData.length} daycares...`);
      }
    }
    
    // Display rating distribution statistics
    console.log('\nRating Distribution Statistics:');
    
    console.log('\nOverall Ratings:');
    Object.entries(ratingDistribution.overall)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        if (count > 0) {
          const percentage = (count / daycareData.length) * 100;
          console.log(`  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)`);
        }
      });
    
    console.log('\nHealth & Safety Ratings:');
    Object.entries(ratingDistribution.healthSafety)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        if (count > 0) {
          const percentage = (count / daycareData.length) * 100;
          console.log(`  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)`);
        }
      });
    
    console.log('\nStructural Quality Ratings:');
    Object.entries(ratingDistribution.structural)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        if (count > 0) {
          const percentage = (count / daycareData.length) * 100;
          console.log(`  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)`);
        }
      });
    
    console.log('\nProcess Quality Ratings:');
    Object.entries(ratingDistribution.process)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        if (count > 0) {
          const percentage = (count / daycareData.length) * 100;
          console.log(`  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)`);
        }
      });
    
    console.log('\nManagement Ratings:');
    Object.entries(ratingDistribution.management)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        if (count > 0) {
          const percentage = (count / daycareData.length) * 100;
          console.log(`  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)`);
        }
      });
    
    return { 
      totalRated: daycareData.length,
      distribution: ratingDistribution,
      dimensionPercentiles
    };
  } catch (err) {
    console.error('Error generating improved ratings:', err);
    throw err;
  }
}

// Calculate improved raw dimension scores with adjusted algorithms
function calculateImprovedRawScores(daycare, violations, inspections) {
  // Initialize raw scores (higher is better for all dimensions in this version,
  // including health & safety which we'll convert from risk score)
  const rawScores = {
    healthSafety: 0,
    structural: 5,
    process: 5,
    management: 5
  };
  
  // 1. Calculate Health & Safety score (based on risk score but reversed)
  if (daycare.risk_score !== null && daycare.risk_score !== undefined) {
    // Convert risk score to health & safety score (higher risk = lower health & safety)
    // Scale: 0-100 risk score → 10-0 health & safety score (inverted)
    const { BASE_HEALTH_SAFETY, CONVERSION_FACTOR } = STATS_CONSTANTS.RISK_SCORE_CONVERSION;
    rawScores.healthSafety = Math.max(0, BASE_HEALTH_SAFETY - (daycare.risk_score * CONVERSION_FACTOR));
  } else {
    // No risk score available, use violation counts as fallback
    const highViolations = daycare.HIGH_RISK_VIOLATIONS || 0;
    const medHighViolations = daycare.MEDIUM_HIGH_RISK_VIOLATIONS || 0;
    const medViolations = daycare.MEDIUM_RISK_VIOLATIONS || 0;
    const lowViolations = daycare.LOW_RISK_VIOLATIONS || 0;
    
    // Start with perfect score and deduct based on violations
    rawScores.healthSafety = 10;
    
    // Apply weighted deductions
    rawScores.healthSafety -= (highViolations * 2.0);
    rawScores.healthSafety -= (medHighViolations * 1.0);
    rawScores.healthSafety -= (medViolations * 0.5);
    rawScores.healthSafety -= (lowViolations * 0.2);
  }
  
  // Ensure health & safety score is bounded within [0, 10]
  rawScores.healthSafety = Math.max(0, Math.min(10, rawScores.healthSafety));
  
  // 2. Calculate Structural Quality score with improved algorithm
  // Start with normalized base score
  rawScores.structural = 5;
  
  // Adjust based on facility size and capacity (more nuanced approach)
  if (daycare.TOTAL_CAPACITY) {
    const capacity = parseInt(daycare.TOTAL_CAPACITY, 10);
    if (!isNaN(capacity)) {
      if (capacity < 30) {
        // Small facilities often have better ratios
        rawScores.structural += 1.0;
      } else if (capacity >= 30 && capacity < 60) {
        // Medium-small facilities
        rawScores.structural += 0.5;
      } else if (capacity >= 150) {
        // Very large facilities have staffing challenges
        rawScores.structural -= 0.5;
      }
    }
  }
  
  // Adjust based on age served (serving younger children requires better ratios)
  if (daycare.LICENSED_TO_SERVE_AGES) {
    const ageGroups = daycare.LICENSED_TO_SERVE_AGES.toUpperCase();
    
    // Multiple adjustments based on age groups served
    if (ageGroups.includes('INFANT')) {
      // Check for infant-related violations
      const infantViolations = violations.filter(v => 
        (v.STANDARD_NUMBER_DESCRIPTION && v.STANDARD_NUMBER_DESCRIPTION.toUpperCase().includes('INFANT')) ||
        (v.NARRATIVE && v.NARRATIVE.toUpperCase().includes('INFANT'))
      );
      
      if (infantViolations.length === 0) {
        // Successfully managing infant care without violations
        rawScores.structural += 1.0;
      } else {
        // Deduction for infant-related issues
        rawScores.structural -= Math.min(1.5, infantViolations.length * 0.3);
      }
    }
    
    // Toddler care considerations
    if (ageGroups.includes('TODDLER')) {
      const toddlerViolations = violations.filter(v => 
        (v.STANDARD_NUMBER_DESCRIPTION && v.STANDARD_NUMBER_DESCRIPTION.toUpperCase().includes('TODDLER')) ||
        (v.NARRATIVE && v.NARRATIVE.toUpperCase().includes('TODDLER'))
      );
      
      if (toddlerViolations.length === 0) {
        // Successfully managing toddler care
        rawScores.structural += 0.5;
      }
    }
    
    // Serving wide age range increases complexity
    if ((ageGroups.includes('INFANT') || ageGroups.includes('TODDLER')) && 
        (ageGroups.includes('SCHOOL') || ageGroups.includes('PRESCHOOL'))) {
      // Wide age range requires more structural complexity
      rawScores.structural -= 0.5;
    }
  }
  
  // Check for ratio, group size, and capacity violations more carefully
  const ratioViolations = violations.filter(v => 
    (v.STANDARD_NUMBER_DESCRIPTION && (
      v.STANDARD_NUMBER_DESCRIPTION.toUpperCase().includes('RATIO') ||
      v.STANDARD_NUMBER_DESCRIPTION.toUpperCase().includes('GROUP SIZE') ||
      v.STANDARD_NUMBER_DESCRIPTION.toUpperCase().includes('CAPACITY')
    )) ||
    (v.NARRATIVE && (
      v.NARRATIVE.toUpperCase().includes('RATIO') ||
      v.NARRATIVE.toUpperCase().includes('GROUP SIZE') ||
      v.NARRATIVE.toUpperCase().includes('CAPACITY') ||
      v.NARRATIVE.toUpperCase().includes('TOO MANY CHILDREN')
    ))
  );
  
  if (ratioViolations.length > 0) {
    // Apply progressively larger deductions for more violations
    if (ratioViolations.length === 1) {
      rawScores.structural -= 1.5;
    } else if (ratioViolations.length === 2) {
      rawScores.structural -= 2.5;
    } else {
      rawScores.structural -= 4.0; // Significant issues with ratios
    }
  }
  
  // Check if any ratio violations are recent (within 1 year)
  const recentRatioViolations = ratioViolations.filter(v => {
    if (!v.ACTIVITY_DATE) return false;
    const activityDate = new Date(v.ACTIVITY_DATE);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return activityDate >= oneYearAgo;
  });
  
  if (recentRatioViolations.length > 0) {
    // Additional penalty for recent ratio issues
    rawScores.structural -= 1.0;
  }
  
  // 3. Calculate Process Quality score with enhanced sensitivity
  // Start with differentiated base score
  if (daycare.PROGRAMMATIC_SERVICES) {
    const services = daycare.PROGRAMMATIC_SERVICES.toUpperCase();
    
    // Set initial score based on evidence of programming
    if (services.includes('CURRICULUM') || 
        services.includes('EDUCATIONAL') || 
        services.includes('LEARNING') ||
        services.includes('DEVELOPMENT')) {
      rawScores.process = 5.5; // Slightly above average starting point
    } else {
      rawScores.process = 4.5; // Slightly below average starting point
    }
    
    // Check for premium curriculum methods with evidence-based impact
    let curriculumBonus = 0;
    ['MONTESSORI', 'REGGIO', 'WALDORF'].forEach(method => {
      if (services.includes(method)) {
        curriculumBonus += 1.5; // Major boost for established approaches
      }
    });
    
    ['STEAM', 'STEM'].forEach(method => {
      if (services.includes(method)) {
        curriculumBonus += 1.0; // Significant boost for these approaches
      }
    });
    
    ['CREATIVE CURRICULUM', 'HIGHSCOPE', 'PROJECT-BASED'].forEach(method => {
      if (services.includes(method)) {
        curriculumBonus += 0.75; // Moderate boost for these approaches
      }
    });
    
    // Cap curriculum bonus to prevent excessive scores from multiple claims
    curriculumBonus = Math.min(2.5, curriculumBonus);
    rawScores.process += curriculumBonus;
    
    // Check for accreditations (validated quality indicators)
    let accreditationBonus = 0;
    if (services.includes('NAEYC')) {
      accreditationBonus += 2.0; // Gold standard accreditation
    } else if (services.includes('TEXAS RISING STAR')) {
      accreditationBonus += 1.5; // State quality rating system
    } else if (services.includes('NECPA') || services.includes('NAC')) {
      accreditationBonus += 1.25; // Other recognized accreditations
    } else if (services.includes('ACCRED') || services.includes('CERTIFIED')) {
      accreditationBonus += 0.75; // Generic accreditation claims
    }
    
    rawScores.process += accreditationBonus;
    
    // Check for educational focus areas
    let focusBonus = 0;
    ['LITERACY', 'MATH', 'SCIENCE', 'ART', 'MUSIC', 'LANGUAGE'].forEach(focus => {
      if (services.includes(focus)) {
        focusBonus += 0.25; // Bonus for each specific educational focus
      }
    });
    
    // Cap focus bonus
    focusBonus = Math.min(1.0, focusBonus);
    rawScores.process += focusBonus;
  } else {
    // No programmatic services information
    rawScores.process = 4.0; // Below average starting point
  }
  
  // Check for process quality related violations
  const processViolations = violations.filter(v => 
    (v.CATEGORY && (
      v.CATEGORY.toUpperCase().includes('ACTIVITIES') ||
      v.CATEGORY.toUpperCase().includes('CURRICULUM') ||
      v.CATEGORY.toUpperCase().includes('LEARNING')
    )) ||
    (v.STANDARD_NUMBER_DESCRIPTION && (
      v.STANDARD_NUMBER_DESCRIPTION.toUpperCase().includes('ACTIVITIES') ||
      v.STANDARD_NUMBER_DESCRIPTION.toUpperCase().includes('CURRICULUM') ||
      v.STANDARD_NUMBER_DESCRIPTION.toUpperCase().includes('LEARNING')
    )) ||
    (v.NARRATIVE && (
      v.NARRATIVE.toUpperCase().includes('CURRICULUM') ||
      v.NARRATIVE.toUpperCase().includes('LEARNING ACTIVITIES') ||
      v.NARRATIVE.toUpperCase().includes('EDUCATIONAL') ||
      v.NARRATIVE.toUpperCase().includes('DEVELOPMENT')
    ))
  );
  
  if (processViolations.length > 0) {
    // Apply deductions for process-related violations
    rawScores.process -= Math.min(3.0, processViolations.length * 0.75);
  }
  
  // 4. Calculate Management score with enhanced algorithm
  // Base score adjustments for years in operation (more nuanced curve)
  if (daycare.years_in_operation) {
    if (daycare.years_in_operation < 1) {
      rawScores.management = 3.0; // New facilities start lower
    } else if (daycare.years_in_operation < 3) {
      rawScores.management = 4.0; // Relatively new facilities
    } else if (daycare.years_in_operation > 15) {
      rawScores.management = 7.0; // Very experienced facilities start higher
    } else if (daycare.years_in_operation > 10) {
      rawScores.management = 6.5; // Well-established facilities
    } else if (daycare.years_in_operation > 5) {
      rawScores.management = 6.0; // Established facilities
    } else {
      rawScores.management = 5.0; // Default for moderate experience
    }
  } else {
    rawScores.management = 4.5; // Unknown experience, slightly below average
  }
  
  // Adjust for inspection history and compliance pattern
  if (inspections.length > 0) {
    // More inspections can provide more confidence
    if (inspections.length > 10) {
      rawScores.management += 0.5; // Extensive inspection history
    }
    
    // Calculate violation-to-inspection ratio for compliance trend
    const violationRatio = violations.length / Math.max(1, inspections.length);
    
    if (violationRatio > 3) {
      // Very high violation rate
      rawScores.management -= 2.0;
    } else if (violationRatio > 2) {
      // High violation rate
      rawScores.management -= 1.5;
    } else if (violationRatio > 1) {
      // Above average violation rate
      rawScores.management -= 1.0;
    } else if (violationRatio < 0.3) {
      // Excellent compliance record
      rawScores.management += 1.0;
    } else if (violationRatio < 0.5) {
      // Good compliance record
      rawScores.management += 0.5;
    }
  } else {
    // No inspection history is concerning
    rawScores.management -= 1.5;
  }
  
  // Check for specific administrative/management violations
  const adminViolations = violations.filter(v => 
    (v.CATEGORY && (
      v.CATEGORY.toUpperCase().includes('ADMINISTRATIVE') ||
      v.CATEGORY.toUpperCase().includes('RECORD') ||
      v.CATEGORY.toUpperCase().includes('PERSONNEL')
    )) ||
    (v.NARRATIVE && (
      v.NARRATIVE.toUpperCase().includes('DIRECTOR') ||
      v.NARRATIVE.toUpperCase().includes('STAFF RECORD') ||
      v.NARRATIVE.toUpperCase().includes('POLICY') ||
      v.NARRATIVE.toUpperCase().includes('PROCEDURE')
    ))
  );
  
  if (adminViolations.length > 0) {
    // Apply more significant deductions for management issues
    if (adminViolations.length >= 5) {
      rawScores.management -= 2.5; // Severe administrative issues
    } else if (adminViolations.length >= 3) {
      rawScores.management -= 1.5; // Significant administrative issues
    } else {
      rawScores.management -= 0.75; // Some administrative issues
    }
  }
  
  // Special conditions are significant management red flags
  if (daycare.CONDITIONS_ON_PERMIT === 'Y' || daycare.CONDITIONS_ON_PERMIT === 'Yes') {
    rawScores.management -= 2.0;
  }
  
  // Ensure all scores are within bounds [0, 10]
  rawScores.healthSafety = Math.max(0, Math.min(10, rawScores.healthSafety));
  rawScores.structural = Math.max(0, Math.min(10, rawScores.structural));
  rawScores.process = Math.max(0, Math.min(10, rawScores.process));
  rawScores.management = Math.max(0, Math.min(10, rawScores.management));
  
  return rawScores;
}

// Calculate percentiles for each dimension
function calculateDimensionPercentiles(dimensionScores) {
  // Sort each dimension's scores
  ['healthSafety', 'structural', 'process', 'management'].forEach(dimension => {
    dimensionScores[dimension].sort((a, b) => a.score - b.score);
  });
  
  // Create maps to store percentile for each daycare by operation_id
  const dimensionPercentiles = {
    healthSafety: new Map(),
    structural: new Map(),
    process: new Map(),
    management: new Map()
  };
  
  // Calculate percentiles for each dimension
  ['healthSafety', 'structural', 'process', 'management'].forEach(dimension => {
    const scores = dimensionScores[dimension];
    const totalScores = scores.length;
    
    // Calculate percentile for each score
    for (let i = 0; i < totalScores; i++) {
      const percentile = i / totalScores;
      dimensionPercentiles[dimension].set(scores[i].operationId, percentile);
    }
  });
  
  return dimensionPercentiles;
}

// Calculate rating from percentile and raw score
function calculateRatingFromPercentileAndRawScore(percentile, rawScore, dimensionType, reverseDirection = false) {
  // Determine which method to use for generating the rating
  const thresholdMethod = determineThresholdMethod(percentile, rawScore, dimensionType);
  
  // Handle special forced ratings for all whole-number ratings
  if (thresholdMethod === 'forcedFiveStar') {
    return STATS_CONSTANTS.STAR_RATING_VALUES.FIVE_STAR; // Always 5.0 stars
  }
  
  if (thresholdMethod === 'forcedFourStar') {
    return STATS_CONSTANTS.STAR_RATING_VALUES.FOUR_STAR; // Always 4.0 stars
  }
  
  if (thresholdMethod === 'forcedThreeStar') {
    return STATS_CONSTANTS.STAR_RATING_VALUES.THREE_STAR; // Always 3.0 stars
  }
  
  if (thresholdMethod === 'forcedTwoStar') {
    return STATS_CONSTANTS.STAR_RATING_VALUES.TWO_STAR; // Always 2.0 stars
  }
  
  if (thresholdMethod === 'forcedOneStar') {
    return STATS_CONSTANTS.STAR_RATING_VALUES.ONE_STAR; // Always 1.0 stars
  }
  
  if (thresholdMethod === 'percentile') {
    // Use percentile-based thresholds
    // Note: For health & safety, higher percentile = better rating when reverseDirection is true
    const adjustedPercentile = reverseDirection ? (1 - percentile) : percentile;
    
    // Ensure full range of ratings from 1.0 to 5.0
    if (adjustedPercentile >= STATS_CONSTANTS.PERCENTILE_THRESHOLDS.FIVE_STAR) 
      return STATS_CONSTANTS.STAR_RATING_VALUES.FIVE_STAR;
    if (adjustedPercentile >= STATS_CONSTANTS.PERCENTILE_THRESHOLDS.FOUR_HALF_STAR) 
      return STATS_CONSTANTS.STAR_RATING_VALUES.FOUR_HALF_STAR;
    if (adjustedPercentile >= STATS_CONSTANTS.PERCENTILE_THRESHOLDS.FOUR_STAR) 
      return STATS_CONSTANTS.STAR_RATING_VALUES.FOUR_STAR;
    if (adjustedPercentile >= STATS_CONSTANTS.PERCENTILE_THRESHOLDS.THREE_HALF_STAR) 
      return STATS_CONSTANTS.STAR_RATING_VALUES.THREE_HALF_STAR;
    if (adjustedPercentile >= STATS_CONSTANTS.PERCENTILE_THRESHOLDS.THREE_STAR) 
      return STATS_CONSTANTS.STAR_RATING_VALUES.THREE_STAR;
    if (adjustedPercentile >= STATS_CONSTANTS.PERCENTILE_THRESHOLDS.TWO_HALF_STAR) 
      return STATS_CONSTANTS.STAR_RATING_VALUES.TWO_HALF_STAR;
    if (adjustedPercentile >= STATS_CONSTANTS.PERCENTILE_THRESHOLDS.TWO_STAR) 
      return STATS_CONSTANTS.STAR_RATING_VALUES.TWO_STAR;
    if (adjustedPercentile >= STATS_CONSTANTS.PERCENTILE_THRESHOLDS.ONE_HALF_STAR) 
      return STATS_CONSTANTS.STAR_RATING_VALUES.ONE_HALF_STAR;
    return STATS_CONSTANTS.STAR_RATING_VALUES.ONE_STAR;
  } else {
    // Use raw score thresholds
    const thresholds = STATS_CONSTANTS.RAW_SCORE_THRESHOLDS[dimensionType];
    
    // Ensure full range of ratings from 1.0 to 5.0 with raw score method too
    if (rawScore >= thresholds.FIVE_STAR) return STATS_CONSTANTS.STAR_RATING_VALUES.FIVE_STAR;
    if (rawScore >= thresholds.FOUR_HALF_STAR) return STATS_CONSTANTS.STAR_RATING_VALUES.FOUR_HALF_STAR;
    if (rawScore >= thresholds.FOUR_STAR) return STATS_CONSTANTS.STAR_RATING_VALUES.FOUR_STAR;
    if (rawScore >= thresholds.THREE_HALF_STAR) return STATS_CONSTANTS.STAR_RATING_VALUES.THREE_HALF_STAR;
    if (rawScore >= thresholds.THREE_STAR) return STATS_CONSTANTS.STAR_RATING_VALUES.THREE_STAR;
    if (rawScore >= thresholds.TWO_HALF_STAR) return STATS_CONSTANTS.STAR_RATING_VALUES.TWO_HALF_STAR;
    if (rawScore >= thresholds.TWO_STAR) return STATS_CONSTANTS.STAR_RATING_VALUES.TWO_STAR;
    if (rawScore >= thresholds.ONE_HALF_STAR) return STATS_CONSTANTS.STAR_RATING_VALUES.ONE_HALF_STAR;
    return STATS_CONSTANTS.STAR_RATING_VALUES.ONE_STAR;
  }
}

// Determine which threshold method to use
function determineThresholdMethod(percentile, rawScore, dimensionType) {
  // Check if percentile distribution is usable (not too many daycares with same score)
  // This detects when percentiles would create artificial distinctions
  
  // With our new evenly distributed percentile thresholds, we don't need to force specific bands
  // Let the percentile thresholds naturally distribute the ratings evenly
  
  // Additional handling for standard percentile method
  
  // If dimension has low variance, use raw score thresholds
  if (dimensionType === 'PROCESS' && rawScore === 5.0) {
    return 'rawScore';
  }
  
  // For other dimensions, use percentiles unless distribution is problematic
  return 'percentile';
}

// Calculate confidence intervals based on data completeness
function calculateConfidenceIntervals(daycare, violations, inspections) {
  // Base confidence interval
  const baseInterval = 0.5;
  
  // Get modifiers based on data completeness
  const inspectionCountFactor = getConfidenceModifier(
    inspections.length,
    STATS_CONSTANTS.CONFIDENCE_MODIFIERS.INSPECTION_COUNT
  );
  
  const yearsInOperationFactor = getConfidenceModifier(
    Math.floor(daycare.years_in_operation || 0),
    STATS_CONSTANTS.CONFIDENCE_MODIFIERS.YEARS_IN_OPERATION
  );
  
  // Calculate dimension-specific confidence intervals
  const healthSafetyConfidence = baseInterval * (inspectionCountFactor * 1.2) * (yearsInOperationFactor * 0.8);
  const structuralConfidence = baseInterval * inspectionCountFactor * yearsInOperationFactor;
  const processConfidence = baseInterval * (inspectionCountFactor * 0.8) * (yearsInOperationFactor * 1.2);
  const managementConfidence = baseInterval * (inspectionCountFactor * 0.7) * (yearsInOperationFactor * 1.3);
  
  // Overall confidence is weighted average of dimension confidences
  const overallConfidence = (
    healthSafetyConfidence * STATS_CONSTANTS.DIMENSION_WEIGHTS.HEALTH_SAFETY +
    structuralConfidence * STATS_CONSTANTS.DIMENSION_WEIGHTS.STRUCTURAL +
    processConfidence * STATS_CONSTANTS.DIMENSION_WEIGHTS.PROCESS +
    managementConfidence * STATS_CONSTANTS.DIMENSION_WEIGHTS.MANAGEMENT
  );
  
  return {
    overall: Math.min(2.0, Math.round(overallConfidence * 100) / 100),
    healthSafety: Math.min(2.0, Math.round(healthSafetyConfidence * 100) / 100),
    structural: Math.min(2.0, Math.round(structuralConfidence * 100) / 100),
    process: Math.min(2.0, Math.round(processConfidence * 100) / 100),
    management: Math.min(2.0, Math.round(managementConfidence * 100) / 100),
    metadata: {
      baseInterval,
      inspectionCountFactor,
      yearsInOperationFactor,
      inspectionCount: inspections.length,
      yearsInOperation: daycare.years_in_operation || 0
    }
  };
}

// Get confidence modifier based on a factor
function getConfidenceModifier(value, modifierMap) {
  // Find the appropriate modifier for the value
  const thresholds = Object.keys(modifierMap)
    .map(Number)
    .sort((a, b) => a - b);
  
  // Find the highest threshold that the value meets or exceeds
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i]) {
      return modifierMap[thresholds[i]];
    }
  }
  
  // If no threshold matches, use the lowest one
  return modifierMap[thresholds[0]];
}

// Count recent violations (within past year)
function countRecentViolations(violations) {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  return violations.filter(v => {
    if (!v.ACTIVITY_DATE) return false;
    
    try {
      const activityDate = new Date(v.ACTIVITY_DATE);
      return !isNaN(activityDate.getTime()) && activityDate >= oneYearAgo;
    } catch (e) {
      return false;
    }
  }).length;
}

// Identify quality indicators based on daycare attributes
function identifyQualityIndicators(daycare) {
  const indicators = [];
  
  // Check for curriculum methods and approaches
  if (daycare.PROGRAMMATIC_SERVICES) {
    const services = daycare.PROGRAMMATIC_SERVICES.toUpperCase();
    
    // Check for curriculum approaches
    Object.entries(STATS_CONSTANTS.QUALITY_FACTOR_WEIGHTS).forEach(([factor, weight]) => {
      if (services.includes(factor)) {
        indicators.push({
          factor: factor.charAt(0) + factor.slice(1).toLowerCase(),
          weight,
          evidenceLevel: weight >= 0.3 ? 'Strong' : (weight >= 0.2 ? 'Moderate' : 'Limited'),
          source: 'Programmatic Services'
        });
      }
    });
  }
  
  // Check for extended hours
  if (daycare.HOURS_OF_OPERATION) {
    const hours = daycare.HOURS_OF_OPERATION.toUpperCase();
    if (hours.includes('5:') || hours.includes('6:00') || hours.includes('6:15') ||
        hours.includes('7:') || hours.includes('8:') || hours.includes('9:') || 
        hours.includes('10:') || hours.includes('11:')) {
      indicators.push({
        factor: 'Extended Hours',
        weight: STATS_CONSTANTS.QUALITY_FACTOR_WEIGHTS.EXTENDED_HOURS,
        evidenceLevel: 'Limited',
        source: 'Hours of Operation'
      });
    }
  }
  
  // Check for weekend availability
  if (daycare.DAYS_OF_OPERATION) {
    const days = daycare.DAYS_OF_OPERATION.toUpperCase();
    if (days.includes('SATURDAY') || days.includes('SUNDAY')) {
      indicators.push({
        factor: 'Weekend Care',
        weight: STATS_CONSTANTS.QUALITY_FACTOR_WEIGHTS.WEEKEND_CARE,
        evidenceLevel: 'Limited',
        source: 'Days of Operation'
      });
    }
  }
  
  // Check for subsidy acceptance
  if (daycare.ACCEPTS_CHILD_CARE_SUBSIDIES === 'Y' || daycare.ACCEPTS_CHILD_CARE_SUBSIDIES === 'Yes') {
    indicators.push({
      factor: 'Accepts Subsidies',
      weight: STATS_CONSTANTS.QUALITY_FACTOR_WEIGHTS.ACCEPTS_SUBSIDIES,
      evidenceLevel: 'Moderate',
      source: 'Program Information'
    });
  }
  
  // Check for longevity
  if (daycare.years_in_operation > 10) {
    indicators.push({
      factor: 'Established Program',
      weight: 0.15,
      evidenceLevel: 'Moderate',
      source: `${Math.round(daycare.years_in_operation)} Years in Operation`
    });
  }
  
  return indicators;
}

// Save improved rating to database
async function saveImprovedRatingToDB(pool, operationId, rating) {
  try {
    await pool.query(`
      INSERT INTO improved_daycare_ratings (
        operation_id,
        overall_rating,
        confidence_interval,
        
        health_safety_rating,
        health_safety_percentile,
        health_safety_raw_score,
        health_safety_confidence,
        
        structural_quality_rating,
        structural_quality_percentile,
        structural_quality_raw_score,
        structural_quality_confidence,
        
        process_quality_rating,
        process_quality_percentile,
        process_quality_raw_score,
        process_quality_confidence,
        
        management_rating,
        management_percentile,
        management_raw_score,
        management_confidence,
        
        risk_score,
        total_violations,
        recent_violations,
        years_in_operation,
        inspection_count,
        
        rating_methodology,
        quality_indicators
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        overall_rating = VALUES(overall_rating),
        confidence_interval = VALUES(confidence_interval),
        
        health_safety_rating = VALUES(health_safety_rating),
        health_safety_percentile = VALUES(health_safety_percentile),
        health_safety_raw_score = VALUES(health_safety_raw_score),
        health_safety_confidence = VALUES(health_safety_confidence),
        
        structural_quality_rating = VALUES(structural_quality_rating),
        structural_quality_percentile = VALUES(structural_quality_percentile),
        structural_quality_raw_score = VALUES(structural_quality_raw_score),
        structural_quality_confidence = VALUES(structural_quality_confidence),
        
        process_quality_rating = VALUES(process_quality_rating),
        process_quality_percentile = VALUES(process_quality_percentile),
        process_quality_raw_score = VALUES(process_quality_raw_score),
        process_quality_confidence = VALUES(process_quality_confidence),
        
        management_rating = VALUES(management_rating),
        management_percentile = VALUES(management_percentile),
        management_raw_score = VALUES(management_raw_score),
        management_confidence = VALUES(management_confidence),
        
        risk_score = VALUES(risk_score),
        total_violations = VALUES(total_violations),
        recent_violations = VALUES(recent_violations),
        years_in_operation = VALUES(years_in_operation),
        inspection_count = VALUES(inspection_count),
        
        rating_methodology = VALUES(rating_methodology),
        quality_indicators = VALUES(quality_indicators),
        
        last_updated = CURRENT_TIMESTAMP
    `, [
      operationId,
      rating.overallRating,
      rating.confidenceInterval,
      
      rating.healthSafetyRating,
      rating.healthSafetyPercentile,
      rating.healthSafetyRawScore,
      rating.healthSafetyConfidence,
      
      rating.structuralQualityRating,
      rating.structuralQualityPercentile,
      rating.structuralQualityRawScore,
      rating.structuralQualityConfidence,
      
      rating.processQualityRating,
      rating.processQualityPercentile,
      rating.processQualityRawScore,
      rating.processQualityConfidence,
      
      rating.managementRating,
      rating.managementPercentile,
      rating.managementRawScore,
      rating.managementConfidence,
      
      rating.riskScore,
      rating.totalViolations,
      rating.recentViolations,
      rating.yearsInOperation,
      rating.inspectionCount,
      
      JSON.stringify(rating.ratingMethodology),
      JSON.stringify(rating.qualityIndicators)
    ]);
    
    return true;
  } catch (err) {
    console.error(`Error saving improved rating for operation ${operationId}:`, err.message);
    return false;
  }
}

// Generate a report of the improved rating analysis
async function generateImprovedReport(stats) {
  const reportPath = path.join(__dirname, '../reports/improved_ratings_report.txt');
  
  try {
    // Create reports directory if it doesn't exist
    await fs.mkdir(path.dirname(reportPath), { recursive: true }).catch(() => {});
    
    let report = "IMPROVED STATISTICAL DAYCARE RATING SYSTEM REPORT\n";
    report += "=".repeat(60) + "\n\n";
    
    report += "SUMMARY:\n";
    report += `Total daycares rated: ${stats.totalRated}\n\n`;
    
    report += "OVERALL RATING DISTRIBUTION:\n";
    Object.entries(stats.distribution.overall)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        if (count > 0) {
          const percentage = (count / stats.totalRated) * 100;
          report += `  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)\n`;
        }
      });
    
    report += "\nHEALTH & SAFETY RATING DISTRIBUTION:\n";
    Object.entries(stats.distribution.healthSafety)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        if (count > 0) {
          const percentage = (count / stats.totalRated) * 100;
          report += `  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)\n`;
        }
      });
    
    report += "\nSTRUCTURAL QUALITY RATING DISTRIBUTION:\n";
    Object.entries(stats.distribution.structural)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        if (count > 0) {
          const percentage = (count / stats.totalRated) * 100;
          report += `  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)\n`;
        }
      });
    
    report += "\nPROCESS QUALITY RATING DISTRIBUTION:\n";
    Object.entries(stats.distribution.process)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        if (count > 0) {
          const percentage = (count / stats.totalRated) * 100;
          report += `  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)\n`;
        }
      });
    
    report += "\nMANAGEMENT RATING DISTRIBUTION:\n";
    Object.entries(stats.distribution.management)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        if (count > 0) {
          const percentage = (count / stats.totalRated) * 100;
          report += `  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)\n`;
        }
      });
    
    report += "\nMETHODOLOGY IMPROVEMENTS:\n";
    report += "1. Reversed Z-score interpretation for Health & Safety to align with risk scores\n";
    report += "2. Explicit percentile-based thresholds ensuring balanced distribution:\n";
    Object.entries(STATS_CONSTANTS.PERCENTILE_THRESHOLDS).forEach(([level, threshold]) => {
      report += `   - ${level}: ${(threshold * 100).toFixed(0)}th percentile\n`;
    });
    report += "3. Enhanced raw score differentiation for dimensions with little variation\n";
    report += "4. Forced distribution bands creating meaningful separation between rating levels\n";
    report += "5. Dimension weights:\n";
    Object.entries(STATS_CONSTANTS.DIMENSION_WEIGHTS).forEach(([dimension, weight]) => {
      report += `   - ${dimension}: ${(weight * 100).toFixed(0)}%\n`;
    });
    
    await fs.writeFile(reportPath, report);
    console.log(`Improved ratings report saved to: ${reportPath}`);
    return reportPath;
  } catch (err) {
    console.error('Error generating improved report:', err.message);
    return null;
  }
}

// Main function
async function main() {
  console.log('=== Generating Improved Statistical Daycare Ratings ===');
  
  // Create connection pool
  console.log('Connecting to database...');
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Check database connection
    console.log('Testing database connection...');
    await pool.query('SELECT 1');
    console.log('Database connection successful');
    
    // Create/update the improved ratings table
    await createImprovedRatingsTable(pool);
    
    // Generate improved ratings for all daycares
    console.log('Generating improved ratings for all daycares...');
    const stats = await generateImprovedRatings(pool);
    
    // Generate report
    await generateImprovedReport(stats);
    
    console.log('\nProcess completed successfully!');
  } catch (err) {
    console.error('Error in improved ratings generation:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}
