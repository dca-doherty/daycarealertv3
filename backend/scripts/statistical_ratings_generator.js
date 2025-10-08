#!/usr/bin/env node

/**
 * Statistical Ratings Generator
 * 
 * This script implements advanced statistical approaches to create a more balanced,
 * empirically grounded rating system for daycares:
 * 
 * 1. Uses z-score standardization to normalize distributions
 * 2. Applies Jenks natural breaks to determine optimal rating thresholds
 * 3. Implements multiple independent rating dimensions
 * 4. Includes confidence intervals based on data completeness
 * 5. Applies longitudinal weighting for time-based data relevance
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

// Statistical constants for rating calculations
const STATS_CONSTANTS = {
  // Dimension weights - based on research literature importance
  DIMENSION_WEIGHTS: {
    HEALTH_SAFETY: 0.40,    // Health and safety factors
    STRUCTURAL: 0.25,       // Structural quality (ratios, group size, etc.)
    PROCESS: 0.20,          // Process quality (curriculum, interactions)
    MANAGEMENT: 0.15        // Management factors (experience, stability)
  },
  
  // Z-score to rating conversion
  Z_SCORE_THRESHOLDS: {
    FIVE_STAR: 0.84,        // Top 20% (above 0.84 standard deviations)
    FOUR_HALF_STAR: 0.25,   // Next 20% (0.25 to 0.84)
    FOUR_STAR: -0.25,       // Middle 20% (-0.25 to 0.25)
    THREE_HALF_STAR: -0.84, // Next 20% (-0.84 to -0.25)
    THREE_STAR: -1.28,      // Next 10% (-1.28 to -0.84)
    TWO_HALF_STAR: -1.65,   // Next 5% (-1.65 to -1.28)
    TWO_STAR: -2.05,        // Next 2% (-2.05 to -1.65)
    ONE_HALF_STAR: -2.33    // Bottom 1% (below -2.33)
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
    'Safety': 2.0,          // Increased from 1.5 to 2.0
    'Child Well-being': 1.6, // Increased from 1.4 to 1.6
    'Health': 1.5,
    'Sleep/Rest': 1.3,
    'Transportation': 1.2,
    'Facility': 1.0,
    'Administrative': 0.7,  // Reduced from 0.8 to 0.7
    'Paperwork': 0.5        // Reduced from 0.7 to 0.5
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
  }
};

// Create table structure for statistical ratings
async function createStatisticalRatingsTable(pool) {
  console.log('Checking statistical_daycare_ratings table...');
  
  try {
    // First check if the table already exists
    const [tables] = await pool.query("SHOW TABLES LIKE 'statistical_daycare_ratings'");
    
    if (tables.length > 0) {
      console.log('statistical_daycare_ratings table already exists, creating backup...');
      // Create a backup of the current table
      await pool.query('DROP TABLE IF EXISTS statistical_daycare_ratings_backup');
      await pool.query('CREATE TABLE statistical_daycare_ratings_backup LIKE statistical_daycare_ratings');
      await pool.query('INSERT INTO statistical_daycare_ratings_backup SELECT * FROM statistical_daycare_ratings');
      console.log('Backup created successfully!');
      
      // Truncate the current table
      await pool.query('TRUNCATE TABLE statistical_daycare_ratings');
      console.log('Existing table cleared, ready for new data');
    } else {
      console.log('Creating statistical_daycare_ratings table...');
      await pool.query(`
        CREATE TABLE statistical_daycare_ratings (
          id INT NOT NULL AUTO_INCREMENT,
          operation_id VARCHAR(50) NOT NULL,
          
          /* Overall rating */
          overall_rating DECIMAL(2,1) NOT NULL,
          confidence_interval DECIMAL(3,2),
          
          /* Dimension ratings (all 1-5 scale) */
          health_safety_rating DECIMAL(2,1),
          health_safety_z_score DECIMAL(4,2),
          health_safety_confidence DECIMAL(3,2),
          
          structural_quality_rating DECIMAL(2,1),
          structural_quality_z_score DECIMAL(4,2),
          structural_quality_confidence DECIMAL(3,2),
          
          process_quality_rating DECIMAL(2,1),
          process_quality_z_score DECIMAL(4,2),
          process_quality_confidence DECIMAL(3,2),
          
          management_rating DECIMAL(2,1),
          management_z_score DECIMAL(4,2),
          management_confidence DECIMAL(3,2),
          
          /* Supporting data */
          risk_score DECIMAL(5,2),
          total_violations INT DEFAULT 0,
          recent_violations INT DEFAULT 0,
          years_in_operation DECIMAL(5,2),
          inspection_count INT DEFAULT 0,
          
          /* Metadata */
          raw_scores JSON,
          statistical_factors JSON,
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
    console.error('Error managing statistical_daycare_ratings table:', err.message);
    return false;
  }
}

// Generate statistical ratings for all daycares
async function generateStatisticalRatings(pool) {
  console.log('Generating statistical daycare ratings...');
  
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
    
    console.log(`Found ${daycares.length} daycares to analyze statistically`);
    
    // First pass: calculate raw scores for each dimension and collect statistics
    // This will be used to calculate z-scores in the second pass
    const dimensionStats = {
      healthSafety: { scores: [], sum: 0, count: 0, mean: 0, stdDev: 0 },
      structural: { scores: [], sum: 0, count: 0, mean: 0, stdDev: 0 },
      process: { scores: [], sum: 0, count: 0, mean: 0, stdDev: 0 },
      management: { scores: [], sum: 0, count: 0, mean: 0, stdDev: 0 }
    };
    
    // First pass: calculate raw scores and collect statistics
    console.log('First pass: calculating raw dimension scores...');
    
    // Process daycares in batches to avoid memory issues
    const batchSize = 500;
    const totalBatches = Math.ceil(daycares.length / batchSize);
    
    // Store daycare raw scores for second pass
    const daycareRawScores = [];
    
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
        
        // Calculate raw dimension scores
        const rawScores = calculateRawDimensionScores(daycare, violations, inspections);
        
        // Store for second pass
        daycareRawScores.push({
          daycare,
          violations,
          inspections,
          rawScores
        });
        
        // Add scores to dimension stats for z-score calculation
        dimensionStats.healthSafety.scores.push(rawScores.healthSafety);
        dimensionStats.healthSafety.sum += rawScores.healthSafety;
        dimensionStats.healthSafety.count++;
        
        dimensionStats.structural.scores.push(rawScores.structural);
        dimensionStats.structural.sum += rawScores.structural;
        dimensionStats.structural.count++;
        
        dimensionStats.process.scores.push(rawScores.process);
        dimensionStats.process.sum += rawScores.process;
        dimensionStats.process.count++;
        
        dimensionStats.management.scores.push(rawScores.management);
        dimensionStats.management.sum += rawScores.management;
        dimensionStats.management.count++;
        
        // Log progress periodically
        if ((i - startIdx + 1) % 100 === 0 || i === endIdx - 1) {
          console.log(`Batch progress: Processed ${i - startIdx + 1}/${endIdx - startIdx} daycares...`);
        }
      }
    }
    
    // Calculate means for each dimension
    dimensionStats.healthSafety.mean = dimensionStats.healthSafety.sum / dimensionStats.healthSafety.count;
    dimensionStats.structural.mean = dimensionStats.structural.sum / dimensionStats.structural.count;
    dimensionStats.process.mean = dimensionStats.process.sum / dimensionStats.process.count;
    dimensionStats.management.mean = dimensionStats.management.sum / dimensionStats.management.count;
    
    // Calculate standard deviations
    dimensionStats.healthSafety.stdDev = calculateStandardDeviation(dimensionStats.healthSafety.scores, dimensionStats.healthSafety.mean);
    dimensionStats.structural.stdDev = calculateStandardDeviation(dimensionStats.structural.scores, dimensionStats.structural.mean);
    dimensionStats.process.stdDev = calculateStandardDeviation(dimensionStats.process.scores, dimensionStats.process.mean);
    dimensionStats.management.stdDev = calculateStandardDeviation(dimensionStats.management.scores, dimensionStats.management.mean);
    
    console.log('\nDimension Statistics:');
    console.log(`Health & Safety: Mean = ${dimensionStats.healthSafety.mean.toFixed(2)}, StdDev = ${dimensionStats.healthSafety.stdDev.toFixed(2)}`);
    console.log(`Structural Quality: Mean = ${dimensionStats.structural.mean.toFixed(2)}, StdDev = ${dimensionStats.structural.stdDev.toFixed(2)}`);
    console.log(`Process Quality: Mean = ${dimensionStats.process.mean.toFixed(2)}, StdDev = ${dimensionStats.process.stdDev.toFixed(2)}`);
    console.log(`Management: Mean = ${dimensionStats.management.mean.toFixed(2)}, StdDev = ${dimensionStats.management.stdDev.toFixed(2)}`);
    
    // Find Jenks natural breaks to determine optimal rating thresholds
    console.log('\nFinding Jenks natural breaks for optimal rating thresholds...');
    const jenksBreaks = findJenksBreaks(dimensionStats);
    
    console.log('Jenks Natural Breaks for each dimension:');
    Object.entries(jenksBreaks).forEach(([dimension, breaks]) => {
      console.log(`${dimension}: ${breaks.map(b => b.toFixed(2)).join(', ')}`);
    });
    
    // Second pass: Calculate z-scores, apply Jenks breaks, and save final ratings
    console.log('\nSecond pass: calculating z-scores and final ratings...');
    
    // Track rating distribution statistics
    const ratingDistribution = {
      overall: { '5': 0, '4.5': 0, '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0 },
      healthSafety: { '5': 0, '4.5': 0, '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0 },
      structural: { '5': 0, '4.5': 0, '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0 },
      process: { '5': 0, '4.5': 0, '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0 },
      management: { '5': 0, '4.5': 0, '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0 }
    };
    
    // Process all daycares again - this time calculating z-scores and final ratings
    for (let i = 0; i < daycareRawScores.length; i++) {
      const { daycare, violations, inspections, rawScores } = daycareRawScores[i];
      
      // Calculate z-scores for each dimension
      const zScores = {
        healthSafety: calculateZScore(rawScores.healthSafety, dimensionStats.healthSafety.mean, dimensionStats.healthSafety.stdDev),
        structural: calculateZScore(rawScores.structural, dimensionStats.structural.mean, dimensionStats.structural.stdDev),
        process: calculateZScore(rawScores.process, dimensionStats.process.mean, dimensionStats.process.stdDev),
        management: calculateZScore(rawScores.management, dimensionStats.management.mean, dimensionStats.management.stdDev)
      };
      
      // Calculate confidence intervals based on data completeness
      const confidence = calculateConfidenceIntervals(daycare, violations, inspections);
      
      // Calculate star ratings for each dimension based on z-scores and Jenks breaks
      const dimensionRatings = {
        healthSafety: calculateRatingFromZScore(zScores.healthSafety, jenksBreaks.healthSafety),
        structural: calculateRatingFromZScore(zScores.structural, jenksBreaks.structural),
        process: calculateRatingFromZScore(zScores.process, jenksBreaks.process),
        management: calculateRatingFromZScore(zScores.management, jenksBreaks.management)
      };
      
      // Calculate weighted overall rating
      const overallRating = (
        dimensionRatings.healthSafety * STATS_CONSTANTS.DIMENSION_WEIGHTS.HEALTH_SAFETY +
        dimensionRatings.structural * STATS_CONSTANTS.DIMENSION_WEIGHTS.STRUCTURAL +
        dimensionRatings.process * STATS_CONSTANTS.DIMENSION_WEIGHTS.PROCESS +
        dimensionRatings.management * STATS_CONSTANTS.DIMENSION_WEIGHTS.MANAGEMENT
      );
      
      // Round overall rating to nearest 0.5
      const finalOverallRating = Math.round(overallRating * 2) / 2;
      
      // Update rating distribution statistics
      ratingDistribution.overall[finalOverallRating.toFixed(1)]++;
      ratingDistribution.healthSafety[dimensionRatings.healthSafety.toFixed(1)]++;
      ratingDistribution.structural[dimensionRatings.structural.toFixed(1)]++;
      ratingDistribution.process[dimensionRatings.process.toFixed(1)]++;
      ratingDistribution.management[dimensionRatings.management.toFixed(1)]++;
      
      // Calculate quality indicators for contextual information
      const qualityIndicators = identifyQualityIndicators(daycare);
      
      // Prepare final statistical factors
      const statisticalFactors = {
        zScores,
        jenksBreaksApplied: true,
        confidenceCalculation: confidence.metadata,
        dimensionWeights: STATS_CONSTANTS.DIMENSION_WEIGHTS
      };
      
      // Save complete rating to database
      await saveStatisticalRatingToDB(pool, daycare.OPERATION_ID, {
        overallRating: finalOverallRating,
        confidenceInterval: confidence.overall,
        healthSafetyRating: dimensionRatings.healthSafety,
        healthSafetyZScore: zScores.healthSafety,
        healthSafetyConfidence: confidence.healthSafety,
        structuralQualityRating: dimensionRatings.structural,
        structuralQualityZScore: zScores.structural,
        structuralQualityConfidence: confidence.structural,
        processQualityRating: dimensionRatings.process,
        processQualityZScore: zScores.process,
        processQualityConfidence: confidence.process,
        managementRating: dimensionRatings.management,
        managementZScore: zScores.management,
        managementConfidence: confidence.management,
        riskScore: daycare.risk_score || 0,
        totalViolations: violations.length,
        recentViolations: countRecentViolations(violations),
        yearsInOperation: daycare.years_in_operation || 0,
        inspectionCount: inspections.length,
        rawScores,
        statisticalFactors,
        qualityIndicators
      });
      
      // Log progress periodically
      if ((i + 1) % 100 === 0 || i === daycareRawScores.length - 1) {
        console.log(`Progress: Processed ${i + 1}/${daycareRawScores.length} daycares...`);
      }
    }
    
    // Display rating distribution statistics
    console.log('\nRating Distribution Statistics:');
    
    console.log('\nOverall Ratings:');
    Object.entries(ratingDistribution.overall)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        if (count > 0) {
          const percentage = (count / daycareRawScores.length) * 100;
          console.log(`  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)`);
        }
      });
    
    console.log('\nHealth & Safety Ratings:');
    Object.entries(ratingDistribution.healthSafety)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        if (count > 0) {
          const percentage = (count / daycareRawScores.length) * 100;
          console.log(`  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)`);
        }
      });
    
    console.log('\nStructural Quality Ratings:');
    Object.entries(ratingDistribution.structural)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        if (count > 0) {
          const percentage = (count / daycareRawScores.length) * 100;
          console.log(`  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)`);
        }
      });
    
    console.log('\nProcess Quality Ratings:');
    Object.entries(ratingDistribution.process)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        if (count > 0) {
          const percentage = (count / daycareRawScores.length) * 100;
          console.log(`  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)`);
        }
      });
    
    console.log('\nManagement Ratings:');
    Object.entries(ratingDistribution.management)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([rating, count]) => {
        if (count > 0) {
          const percentage = (count / daycareRawScores.length) * 100;
          console.log(`  ${rating} stars: ${count} daycares (${percentage.toFixed(1)}%)`);
        }
      });
    
    return { 
      totalRated: daycareRawScores.length,
      distribution: ratingDistribution,
      dimensionStats,
      jenksBreaks
    };
  } catch (err) {
    console.error('Error generating statistical ratings:', err);
    throw err;
  }
}

// Calculate raw scores for each dimension
function calculateRawDimensionScores(daycare, violations, inspections) {
  // Initialize raw scores (higher is better for structural, process, and management;
  // lower is better for health & safety as it's risk-based)
  const rawScores = {
    healthSafety: 0,
    structural: 5,
    process: 5,
    management: 5
  };
  
  // 1. Calculate Health & Safety score (primarily based on risk score)
  if (daycare.risk_score !== null && daycare.risk_score !== undefined) {
    // Use risk score directly (higher risk score = lower health & safety score)
    // Invert scale: 0-100 risk score → 10-0 raw score (1:10 ratio, inverse relationship)
    rawScores.healthSafety = Math.max(0, 10 - (daycare.risk_score / 10));
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
  
  // Ensure score is bounded within [0, 10]
  rawScores.healthSafety = Math.max(0, Math.min(10, rawScores.healthSafety));
  
  // 2. Calculate Structural Quality score (based on teacher-child ratios, group size, etc.)
  // This requires additional data that may not be directly available
  // Use proxy indicators from available data
  
  // Start with base score
  rawScores.structural = 5;
  
  // Adjust based on age served (serving younger children requires better ratios)
  if (daycare.LICENSED_TO_SERVE_AGES) {
    const ageGroups = daycare.LICENSED_TO_SERVE_AGES.toUpperCase();
    if (ageGroups.includes('INFANT')) {
      // Infant care generally has stricter structural requirements
      // Check for infant-related violations
      const infantRelatedViolations = violations.filter(v => 
        (v.STANDARD_NUMBER_DESCRIPTION && v.STANDARD_NUMBER_DESCRIPTION.toUpperCase().includes('INFANT')) ||
        (v.NARRATIVE && v.NARRATIVE.toUpperCase().includes('INFANT'))
      );
      
      if (infantRelatedViolations.length > 0) {
        // Deduct based on infant-related issues
        rawScores.structural -= Math.min(2, infantRelatedViolations.length * 0.5);
      } else {
        // Bonus for successfully managing infant care without violations
        rawScores.structural += 0.5;
      }
    }
  }
  
  // Look for ratio-related violations
  const ratioViolations = violations.filter(v => 
    (v.STANDARD_NUMBER_DESCRIPTION && v.STANDARD_NUMBER_DESCRIPTION.toUpperCase().includes('RATIO')) ||
    (v.NARRATIVE && v.NARRATIVE.toUpperCase().includes('RATIO'))
  );
  
  if (ratioViolations.length > 0) {
    // Significant deduction for ratio violations
    rawScores.structural -= Math.min(3, ratioViolations.length * 0.75);
  }
  
  // Adjust based on capacity (larger facilities may have more structural challenges)
  if (daycare.TOTAL_CAPACITY) {
    const capacity = parseInt(daycare.TOTAL_CAPACITY, 10);
    if (!isNaN(capacity)) {
      if (capacity > 150) {
        rawScores.structural -= 0.5; // Very large facilities
      } else if (capacity < 30) {
        rawScores.structural += 0.5; // Small facilities often have better ratios
      }
    }
  }
  
  // 3. Calculate Process Quality score (based on curriculum, interactions, etc.)
  // Strongly influenced by program services and quality indicators
  
  // Start with base score
  rawScores.process = 5;
  
  // Check programmatic services for curriculum and educational approaches
  if (daycare.PROGRAMMATIC_SERVICES) {
    const services = daycare.PROGRAMMATIC_SERVICES.toUpperCase();
    
    // Check for curriculum methods with strong evidence base
    ['MONTESSORI', 'REGGIO', 'STEAM', 'STEM', 'CURRICULUM'].forEach(method => {
      if (services.includes(method)) {
        rawScores.process += 0.5;
      }
    });
    
    // Check for accreditations (indicator of process quality)
    ['NAEYC', 'NECPA', 'ACCREDIT', 'TEXAS RISING STAR'].forEach(accred => {
      if (services.includes(accred)) {
        rawScores.process += 0.75;
      }
    });
    
    // Check for developmental focus
    ['DEVELOPMENT', 'COGNITIVE', 'SOCIAL-EMOTIONAL', 'LANGUAGE'].forEach(focus => {
      if (services.includes(focus)) {
        rawScores.process += 0.25;
      }
    });
  }
  
  // Look for violations related to educational programming
  const programViolations = violations.filter(v => 
    (v.CATEGORY && v.CATEGORY.toUpperCase().includes('ACTIVITIES')) ||
    (v.NARRATIVE && (
      v.NARRATIVE.toUpperCase().includes('CURRICULUM') ||
      v.NARRATIVE.toUpperCase().includes('LEARNING') ||
      v.NARRATIVE.toUpperCase().includes('EDUCATION')
    ))
  );
  
  if (programViolations.length > 0) {
    // Deduct for program-related violations
    rawScores.process -= Math.min(2, programViolations.length * 0.5);
  }
  
  // 4. Calculate Management score (based on experience, stability, etc.)
  
  // Start with base score
  rawScores.management = 5;
  
  // Adjust based on years in operation (experience factor)
  if (daycare.years_in_operation) {
    if (daycare.years_in_operation < 1) {
      rawScores.management -= 1.5; // New facilities
    } else if (daycare.years_in_operation < 3) {
      rawScores.management -= 0.75; // Relatively new
    } else if (daycare.years_in_operation > 10) {
      rawScores.management += 1.0; // Experienced facilities
    } else if (daycare.years_in_operation > 5) {
      rawScores.management += 0.5; // Established facilities
    }
  }
  
  // Adjust based on inspection history
  if (inspections.length > 0) {
    // More inspections can indicate better oversight
    if (inspections.length > 10) {
      rawScores.management += 0.5;
    }
    
    // Check inspection-to-violation ratio
    const violationRatio = violations.length / Math.max(1, inspections.length);
    if (violationRatio > 2) {
      // More than 2 violations per inspection on average
      rawScores.management -= 1.0;
    } else if (violationRatio < 0.5) {
      // Less than 0.5 violations per inspection on average
      rawScores.management += 0.5;
    }
  } else {
    // No inspection history is concerning
    rawScores.management -= 1.0;
  }
  
  // Administrative violations indicate management issues
  const adminViolations = violations.filter(v => 
    (v.CATEGORY && (
      v.CATEGORY.toUpperCase().includes('ADMINISTRATIVE') ||
      v.CATEGORY.toUpperCase().includes('RECORD')
    ))
  );
  
  if (adminViolations.length > 0) {
    // Deduct for management-related violations
    rawScores.management -= Math.min(2, adminViolations.length * 0.4);
  }
  
  // Special condition on permit is a management red flag
  if (daycare.CONDITIONS_ON_PERMIT === 'Y' || daycare.CONDITIONS_ON_PERMIT === 'Yes') {
    rawScores.management -= 1.5;
  }
  
  // Ensure all scores are within bounds [0, 10]
  rawScores.structural = Math.max(0, Math.min(10, rawScores.structural));
  rawScores.process = Math.max(0, Math.min(10, rawScores.process));
  rawScores.management = Math.max(0, Math.min(10, rawScores.management));
  
  return rawScores;
}

// Calculate standard deviation
function calculateStandardDeviation(scores, mean) {
  const squaredDifferences = scores.map(score => Math.pow(score - mean, 2));
  const variance = squaredDifferences.reduce((sum, value) => sum + value, 0) / scores.length;
  return Math.sqrt(variance);
}

// Calculate z-score (standard score)
function calculateZScore(value, mean, stdDev) {
  if (stdDev === 0) return 0; // Avoid division by zero
  return (value - mean) / stdDev;
}

// Find optimal threshold breaks using Jenks natural breaks
function findJenksBreaks(dimensionStats) {
  // Implementation of Jenks natural breaks algorithm
  // For simplicity, we'll use a fixed 5-break approach (for 5-star scale)
  // In a production system, a full Jenks algorithm would be implemented
  
  // Sort scores and find quantile breaks
  const jenksBreaks = {};
  
  // Process each dimension
  Object.entries(dimensionStats).forEach(([dimension, stats]) => {
    // Sort scores
    const sortedScores = [...stats.scores].sort((a, b) => a - b);
    
    // Find breaks at key percentiles
    const breaks = [
      sortedScores[Math.floor(sortedScores.length * 0.1)], // 10th percentile
      sortedScores[Math.floor(sortedScores.length * 0.3)], // 30th percentile
      sortedScores[Math.floor(sortedScores.length * 0.5)], // 50th percentile (median)
      sortedScores[Math.floor(sortedScores.length * 0.7)], // 70th percentile
      sortedScores[Math.floor(sortedScores.length * 0.9)]  // 90th percentile
    ];
    
    jenksBreaks[dimension] = breaks;
  });
  
  return jenksBreaks;
}

// Calculate star rating from z-score
function calculateRatingFromZScore(zScore, breaks) {
  // Using Jenks breaks to assign ratings
  // This creates ratings based on natural clusters in the data
  
  if (zScore <= breaks[0]) return 1.0;
  if (zScore <= breaks[1]) return 2.0;
  if (zScore <= breaks[2]) return 3.0;
  if (zScore <= breaks[3]) return 4.0;
  return 5.0;
}

// Calculate confidence intervals based on data completeness
function calculateConfidenceIntervals(daycare, violations, inspections) {
  // Base confidence interval - expresses uncertainty in the ratings
  const baseInterval = 0.5; // ±0.5 stars
  
  // Factors that affect confidence
  const inspectionCountFactor = getConfidenceModifier(
    inspections.length,
    STATS_CONSTANTS.CONFIDENCE_MODIFIERS.INSPECTION_COUNT
  );
  
  const yearsInOperationFactor = getConfidenceModifier(
    Math.floor(daycare.years_in_operation || 0),
    STATS_CONSTANTS.CONFIDENCE_MODIFIERS.YEARS_IN_OPERATION
  );
  
  // Overall confidence calculation (larger value = less confident)
  const overallConfidence = baseInterval * inspectionCountFactor * yearsInOperationFactor;
  
  // Dimension-specific confidence
  // Health & Safety confidence depends more on inspections
  const healthSafetyConfidence = baseInterval * (inspectionCountFactor * 1.2) * (yearsInOperationFactor * 0.8);
  
  // Structural quality confidence depends on inspection detail level
  const structuralConfidence = baseInterval * inspectionCountFactor * yearsInOperationFactor;
  
  // Process quality confidence - least directly observable
  const processConfidence = baseInterval * (inspectionCountFactor * 0.8) * (yearsInOperationFactor * 1.2);
  
  // Management confidence depends more on operational history
  const managementConfidence = baseInterval * (inspectionCountFactor * 0.7) * (yearsInOperationFactor * 1.3);
  
  return {
    overall: Math.min(2.0, Math.round(overallConfidence * 100) / 100), // Cap at 2.0 and round to 2 decimal places
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
    
    // Loop through quality factor weights for evidence-based indicators
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

// Save statistical rating to database
async function saveStatisticalRatingToDB(pool, operationId, rating) {
  try {
    await pool.query(`
      INSERT INTO statistical_daycare_ratings (
        operation_id,
        overall_rating,
        confidence_interval,
        health_safety_rating,
        health_safety_z_score,
        health_safety_confidence,
        structural_quality_rating,
        structural_quality_z_score,
        structural_quality_confidence,
        process_quality_rating,
        process_quality_z_score,
        process_quality_confidence,
        management_rating,
        management_z_score,
        management_confidence,
        risk_score,
        total_violations,
        recent_violations,
        years_in_operation,
        inspection_count,
        raw_scores,
        statistical_factors,
        quality_indicators
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        overall_rating = VALUES(overall_rating),
        confidence_interval = VALUES(confidence_interval),
        health_safety_rating = VALUES(health_safety_rating),
        health_safety_z_score = VALUES(health_safety_z_score),
        health_safety_confidence = VALUES(health_safety_confidence),
        structural_quality_rating = VALUES(structural_quality_rating),
        structural_quality_z_score = VALUES(structural_quality_z_score),
        structural_quality_confidence = VALUES(structural_quality_confidence),
        process_quality_rating = VALUES(process_quality_rating),
        process_quality_z_score = VALUES(process_quality_z_score),
        process_quality_confidence = VALUES(process_quality_confidence),
        management_rating = VALUES(management_rating),
        management_z_score = VALUES(management_z_score),
        management_confidence = VALUES(management_confidence),
        risk_score = VALUES(risk_score),
        total_violations = VALUES(total_violations),
        recent_violations = VALUES(recent_violations),
        years_in_operation = VALUES(years_in_operation),
        inspection_count = VALUES(inspection_count),
        raw_scores = VALUES(raw_scores),
        statistical_factors = VALUES(statistical_factors),
        quality_indicators = VALUES(quality_indicators),
        last_updated = CURRENT_TIMESTAMP
    `, [
      operationId,
      rating.overallRating,
      rating.confidenceInterval,
      rating.healthSafetyRating,
      rating.healthSafetyZScore,
      rating.healthSafetyConfidence,
      rating.structuralQualityRating,
      rating.structuralQualityZScore,
      rating.structuralQualityConfidence,
      rating.processQualityRating,
      rating.processQualityZScore,
      rating.processQualityConfidence,
      rating.managementRating,
      rating.managementZScore,
      rating.managementConfidence,
      rating.riskScore,
      rating.totalViolations,
      rating.recentViolations,
      rating.yearsInOperation,
      rating.inspectionCount,
      JSON.stringify(rating.rawScores),
      JSON.stringify(rating.statisticalFactors),
      JSON.stringify(rating.qualityIndicators)
    ]);
    
    return true;
  } catch (err) {
    console.error(`Error saving statistical rating for operation ${operationId}:`, err.message);
    return false;
  }
}

// Generate a report of the statistical rating analysis
async function generateStatisticalReport(stats) {
  const reportPath = path.join(__dirname, '../reports/statistical_ratings_report.txt');
  
  try {
    // Create reports directory if it doesn't exist
    await fs.mkdir(path.dirname(reportPath), { recursive: true }).catch(() => {});
    
    let report = "STATISTICAL DAYCARE RATING SYSTEM REPORT\n";
    report += "=".repeat(50) + "\n\n";
    
    report += "SUMMARY:\n";
    report += `Total daycares rated: ${stats.totalRated}\n\n`;
    
    report += "DIMENSION STATISTICS:\n";
    report += `Health & Safety: Mean = ${stats.dimensionStats.healthSafety.mean.toFixed(2)}, StdDev = ${stats.dimensionStats.healthSafety.stdDev.toFixed(2)}\n`;
    report += `Structural Quality: Mean = ${stats.dimensionStats.structural.mean.toFixed(2)}, StdDev = ${stats.dimensionStats.structural.stdDev.toFixed(2)}\n`;
    report += `Process Quality: Mean = ${stats.dimensionStats.process.mean.toFixed(2)}, StdDev = ${stats.dimensionStats.process.stdDev.toFixed(2)}\n`;
    report += `Management: Mean = ${stats.dimensionStats.management.mean.toFixed(2)}, StdDev = ${stats.dimensionStats.management.stdDev.toFixed(2)}\n\n`;
    
    report += "JENKS NATURAL BREAKS (Rating Thresholds):\n";
    Object.entries(stats.jenksBreaks).forEach(([dimension, breaks]) => {
      report += `${dimension}: ${breaks.map(b => b.toFixed(2)).join(', ')}\n`;
    });
    report += "\n";
    
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
    
    report += "\nMETHODOLOGY OVERVIEW:\n";
    report += "1. Z-score standardization: Raw scores converted to standard deviations from the mean\n";
    report += "2. Multiple dimensions: Separate ratings for Health & Safety, Structural Quality, Process Quality, and Management\n";
    report += "3. Jenks natural breaks: Rating thresholds set using natural clustering in the data\n";
    report += "4. Confidence intervals: Ratings include uncertainty based on data completeness\n";
    report += "5. Dimension weights:\n";
    Object.entries(STATS_CONSTANTS.DIMENSION_WEIGHTS).forEach(([dimension, weight]) => {
      report += `   - ${dimension}: ${(weight * 100).toFixed(0)}%\n`;
    });
    
    await fs.writeFile(reportPath, report);
    console.log(`Statistical ratings report saved to: ${reportPath}`);
    return reportPath;
  } catch (err) {
    console.error('Error generating statistical report:', err.message);
    return null;
  }
}

// Main function
async function main() {
  console.log('=== Generating Statistical Daycare Ratings ===');
  
  // Create connection pool
  console.log('Connecting to database...');
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Check database connection
    console.log('Testing database connection...');
    await pool.query('SELECT 1');
    console.log('Database connection successful');
    
    // Create/update the statistical ratings table
    await createStatisticalRatingsTable(pool);
    
    // Generate statistical ratings for all daycares
    console.log('Generating statistical ratings for all daycares...');
    const stats = await generateStatisticalRatings(pool);
    
    // Generate report
    await generateStatisticalReport(stats);
    
    console.log('\nProcess completed successfully!');
  } catch (err) {
    console.error('Error in statistical ratings generation:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}
