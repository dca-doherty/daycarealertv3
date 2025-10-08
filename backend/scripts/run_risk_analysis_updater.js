#!/usr/bin/env node

/**
 * Risk Analysis Updater for Production Server
 * 
 * This script is designed to run on the production server to update the risk_analysis table
 * based on the latest daycare operations and non-compliance data.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const natural = require('natural');
const fs = require('fs').promises;
const path = require('path');

// Import enhanced risk factors and recommendation templates
const { 
  RISK_FACTOR_KEYWORDS, 
  RECOMMENDATION_TEMPLATES 
} = require('./enhanced_risk_factors');

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

// NLP tools
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;
const stemmer = natural.PorterStemmer;

// Risk level weights for scoring
const RISK_WEIGHTS = {
  'High': 10,
  'Medium High': 5,
  'Medium': 2,
  'Medium Low': 1,
  'Low': 0.5
};

// Age-based risk factor decay
// (violation age in days : multiplier for the risk score)
const VIOLATION_AGE_DECAY = {
  90: 1.0,    // Less than 3 months old - full impact
  180: 0.9,   // 3-6 months old - 90% impact
  365: 0.8,   // 6-12 months old - 80% impact
  730: 0.6,   // 1-2 years old - 60% impact
  1095: 0.4,  // 2-3 years old - 40% impact
  1460: 0.3,  // 3-4 years old - 30% impact
  1825: 0.2,  // 4-5 years old - 20% impact
  3650: 0.1   // Over 5 years old - 10% impact
};

// Violation standards to exclude from risk calculation
const EXCLUDED_VIOLATION_STANDARDS = [
  'HRC42.041(a) - Illegal Operation - Not Licensed'
];

// Category importance for analysis
const CATEGORY_IMPORTANCE = {
  'Safety': 1.5,
  'Health': 1.3,
  'Child Well-being': 1.4,
  'Paperwork': 0.7,
  'Administrative': 0.8,
  'Facility': 1.0,
  'Transportation': 1.2,
  'Sleep/Rest': 1.3
};

// Age factors - newer daycares might require more scrutiny
const YEARS_IN_OPERATION_FACTORS = {
  0: 1.3,  // Less than 1 year
  1: 1.2,  // 1 year
  2: 1.1,  // 2 years
  10: 0.9, // 10+ years
  15: 0.85 // 15+ years
};

// Update risk analysis table structure if needed
async function ensureTableStructure(pool) {
  console.log('Checking risk_analysis table structure...');
  
  try {
    // Check if table exists
    const [tables] = await pool.query(`SHOW TABLES LIKE 'risk_analysis'`);
    
    if (tables.length === 0) {
      console.log('Creating risk_analysis table...');
      await pool.query(`
        CREATE TABLE risk_analysis (
          id INT NOT NULL AUTO_INCREMENT,
          operation_id VARCHAR(50) NOT NULL,
          analysis_summary TEXT,
          risk_factors JSON,
          parent_recommendations JSON,
          total_violations INT DEFAULT 0,
          high_risk_count INT DEFAULT 0,
          medium_high_risk_count INT DEFAULT 0,
          medium_risk_count INT DEFAULT 0,
          low_risk_count INT DEFAULT 0,
          adverse_actions_count INT DEFAULT 0,
          risk_score DECIMAL(5,2),
          last_analysis_date DATE,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY (operation_id),
          INDEX (risk_score)
        )
      `);
      console.log('Table created successfully');
      return;
    }
    
    // Check for required columns
    const [columns] = await pool.query(`DESCRIBE risk_analysis`);
    const columnNames = columns.map(col => col.Field);
    
    // Check if operation_id exists (vs older operation_number)
    if (!columnNames.includes('operation_id') && columnNames.includes('operation_number')) {
      console.log('Renaming operation_number to operation_id...');
      await pool.query(`ALTER TABLE risk_analysis CHANGE COLUMN operation_number operation_id VARCHAR(50) NOT NULL`);
    }
    
    // Add any missing columns
    const requiredColumns = [
      { name: 'risk_factors', type: 'JSON' },
      { name: 'parent_recommendations', type: 'JSON' },
      { name: 'high_risk_count', type: 'INT DEFAULT 0' },
      { name: 'medium_high_risk_count', type: 'INT DEFAULT 0' },
      { name: 'medium_risk_count', type: 'INT DEFAULT 0' },
      { name: 'low_risk_count', type: 'INT DEFAULT 0' },
      { name: 'adverse_actions_count', type: 'INT DEFAULT 0' },
      { name: 'risk_score', type: 'DECIMAL(5,2)' },
      { name: 'last_analysis_date', type: 'DATE' }
    ];
    
    for (const col of requiredColumns) {
      if (!columnNames.includes(col.name)) {
        console.log(`Adding missing column: ${col.name}`);
        await pool.query(`ALTER TABLE risk_analysis ADD COLUMN ${col.name} ${col.type}`);
      }
    }
    
    console.log('Table structure is up-to-date');
  } catch (err) {
    console.error('Error checking table structure:', err);
    throw err;
  }
}

// Helper function to extract keywords from text
function extractKeywords(text) {
  if (!text) return [];
  
  // Clean and normalize text
  const cleaned = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Tokenize and stem words
  const tokens = tokenizer.tokenize(cleaned);
  
  // Filter out stop words
  const stopWords = ['and', 'the', 'is', 'in', 'at', 'of', 'for', 'with', 'on', 'to', 'a', 'an'];
  const filteredTokens = tokens.filter(token => 
    token.length > 2 && !stopWords.includes(token)
  );
  
  // Stem words for better matching
  const stemmed = filteredTokens.map(token => stemmer.stem(token));
  
  return Array.from(new Set([...filteredTokens, ...stemmed]));
}

// Get years in operation, handling null dates
function getYearsInOperation(issuanceDate) {
  if (!issuanceDate) return null;
  
  const today = new Date();
  const issueDate = new Date(issuanceDate);
  
  // Check if valid date
  if (isNaN(issueDate.getTime())) return null;
  
  const diffTime = Math.abs(today - issueDate);
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  
  return diffYears;
}

// Get age-related risk factor based on years in operation
function getAgeFactor(yearsInOperation) {
  if (!yearsInOperation) return 1.0;
  
  // Start with default factor
  let factor = 1.0;
  
  // Apply factors based on years in operation
  Object.entries(YEARS_IN_OPERATION_FACTORS).forEach(([years, adjustFactor]) => {
    if (yearsInOperation <= parseInt(years)) {
      factor = Math.max(factor, adjustFactor);
    }
  });
  
  return factor;
}

// Calculate the age decay factor for a violation based on its date
function getViolationAgeFactor(violationDate) {
  if (!violationDate) return 0.1; // Default to old violation if no date
  
  const today = new Date();
  const vDate = new Date(violationDate);
  
  // Check if valid date
  if (isNaN(vDate.getTime())) return 0.1;
  
  // Calculate age in days
  const diffTime = Math.abs(today - vDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Find the appropriate decay factor based on age
  let ageFactor = 0.1; // Default to old violation
  
  for (const [days, factor] of Object.entries(VIOLATION_AGE_DECAY)) {
    if (diffDays <= parseInt(days)) {
      ageFactor = factor;
      break;
    }
  }
  
  return ageFactor;
}

// Check if a violation should be excluded based on its standard and correction status
function shouldExcludeViolation(violation) {
  // Exclude if the standard is in the excluded list and has a corrected date
  if (EXCLUDED_VIOLATION_STANDARDS.includes(violation.STANDARD_NUMBER_DESCRIPTION) && 
      violation.CORRECTED_DATE) {
    return true;
  }
  return false;
}

// Generate risk analysis for all daycares or a specific one
async function generateRiskAnalysis(pool, specificDaycareId = null) {
  console.log('Generating risk analysis...');
  
  // Build the WHERE clause if a specific daycare is requested
  const whereClause = specificDaycareId ? 
    `WHERE d.OPERATION_NUMBER = '${specificDaycareId}'` : '';
  
  // Get list of daycares to analyze
  const [daycares] = await pool.query(`
    SELECT 
      d.OPERATION_NUMBER,
      d.OPERATION_ID,
      d.OPERATION_NAME,
      d.OPERATION_TYPE,
      d.CITY,
      d.COUNTY,
      d.LICENSED_TO_SERVE_AGES,
      d.PROGRAMMATIC_SERVICES,
      d.TOTAL_CAPACITY,
      d.HOURS_OF_OPERATION,
      d.DAYS_OF_OPERATION,
      d.ACCEPTS_CHILD_CARE_SUBSIDIES,
      d.ADVERSE_ACTION,
      d.ISSUANCE_DATE,
      d.TOTAL_INSPECTIONS,
      d.TOTAL_VIOLATIONS,
      d.HIGH_RISK_VIOLATIONS,
      d.MEDIUM_HIGH_RISK_VIOLATIONS,
      d.MEDIUM_RISK_VIOLATIONS,
      d.LOW_RISK_VIOLATIONS,
      DATEDIFF(CURRENT_DATE, d.ISSUANCE_DATE) / 365 as years_in_operation
    FROM 
      daycare_operations d
    ${whereClause}
  `);
  
  console.log(`Found ${daycares.length} daycares to analyze`);
  
  // Track progress counters
  let processedCount = 0;
  let withViolationsCount = 0;
  let withoutViolationsCount = 0;
  
  // Create an array to process daycares in batches
  const batchSize = 500;
  const totalBatches = Math.ceil(daycares.length / batchSize);
  
  // Process in batches to optimize memory usage
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIdx = batchIndex * batchSize;
    const endIdx = Math.min((batchIndex + 1) * batchSize, daycares.length);
    
    console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (records ${startIdx + 1}-${endIdx})`);
    
    // Process batch of daycares
    for (let i = startIdx; i < endIdx; i++) {
      const daycare = daycares[i];
      
      // Increment counter and log progress
      processedCount++;
      if (processedCount % 100 === 0 || processedCount === daycares.length) {
        console.log(`Progress: Processed ${processedCount}/${daycares.length} daycares...`);
      }
      
      // Get violations for this daycare using the actual OPERATION_ID
      const [violations] = await pool.query(`
        SELECT 
          r.STANDARD_NUMBER_DESCRIPTION,
          r.REVISED_RISK_LEVEL,
          r.CATEGORY,
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
      
      // Filter out excluded violations
      const filteredViolations = violations.filter(v => !shouldExcludeViolation(v));
      
      // Skip daycares with no violations after filtering
      if (filteredViolations.length === 0) {
        withoutViolationsCount++;
        
        // Create minimal analysis for centers with no violations
        // Generate basic risk factors based on daycare attributes
        const defaultRiskFactors = generateDefaultRiskFactors(daycare);
        
        // Calculate a minimal risk score - even compliant daycares should have a baseline score
        // This ensures empty arrays and zero values are avoided
        let baselineRiskScore = 1.0; // Start with minimal score
        
        // Adjust for adverse actions if any
        if (daycare.ADVERSE_ACTION === 'Y') {
          baselineRiskScore = 5.0;
        }
        
        // Newer daycares get slightly higher baseline score
        const ageFactor = getAgeFactor(daycare.years_in_operation);
        baselineRiskScore *= ageFactor;
        
        // Very large facilities might have slightly higher baseline
        if (daycare.TOTAL_CAPACITY && daycare.TOTAL_CAPACITY > 100) {
          baselineRiskScore *= 1.2;
        }
        
        // Recommendations - start with general ones
        const baseRecommendations = RECOMMENDATION_TEMPLATES.general.slice(0, 5);
        
        // Add age-specific recommendations if applicable
        if (daycare.LICENSED_TO_SERVE_AGES && daycare.LICENSED_TO_SERVE_AGES.toLowerCase().includes('infant')) {
          // Add infant-specific recommendations
          if (RECOMMENDATION_TEMPLATES.infants && RECOMMENDATION_TEMPLATES.infants.length > 0) {
            baseRecommendations.push(RECOMMENDATION_TEMPLATES.infants[0]);
          }
        }
        
        const minimalAnalysis = {
          analysisSummary: generateMinimalAnalysis(daycare),
          riskFactors: defaultRiskFactors,
          recommendations: baseRecommendations,
          riskScore: Math.min(10, baselineRiskScore), // Cap at 10 for compliant facilities
          violationCounts: {
            'High': 0,
            'Medium High': 0, 
            'Medium': 0,
            'Medium Low': 0,
            'Low': 0
          },
          adverseActionsCount: daycare.ADVERSE_ACTION === 'Y' ? 1 : 0
        };
        
        // Save minimal analysis to database using the actual OPERATION_ID
        await saveAnalysisToDB(pool, daycare.OPERATION_ID, minimalAnalysis);
        continue;
      }
      
      // Increment counter for daycares with violations
      withViolationsCount++;
      
      // Count violations by risk level and category
      const riskCounts = {
        'High': 0,
        'Medium High': 0, 
        'Medium': 0,
        'Medium Low': 0,
        'Low': 0
      };
      
      const categoryCounts = {};
      const adverseActionsCount = daycare.ADVERSE_ACTION === 'Y' ? 1 : 0;
      
      // Process all violation text for keyword analysis
      let allNarratives = '';
      let allStandards = '';
      
      // Keep track of violation text by risk level for better analysis
      const violationTextByRisk = {
        'High': [],
        'Medium High': [],
        'Medium': [],
        'Medium Low': [],
        'Low': []
      };
      
      // Process all violations with age-adjusted risk impact
      let ageAdjustedRiskScore = 0;
      
      filteredViolations.forEach(violation => {
        // Count by risk level
        const riskLevel = violation.REVISED_RISK_LEVEL || 'Unknown';
        if (riskCounts[riskLevel] !== undefined) {
          riskCounts[riskLevel]++;
        }
        
        // Count by category
        const category = violation.CATEGORY || 'Unknown';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        
        // Collect text for analysis
        if (violation.NARRATIVE) {
          allNarratives += ' ' + violation.NARRATIVE;
          if (violationTextByRisk[riskLevel]) {
            violationTextByRisk[riskLevel].push(violation.NARRATIVE);
          }
        }
        
        if (violation.STANDARD_NUMBER_DESCRIPTION) {
          allStandards += ' ' + violation.STANDARD_NUMBER_DESCRIPTION;
        }
        
        // Calculate age-adjusted risk contribution for this violation
        const baseRiskContribution = RISK_WEIGHTS[riskLevel] || 0;
        const ageFactor = getViolationAgeFactor(violation.ACTIVITY_DATE);
        ageAdjustedRiskScore += baseRiskContribution * ageFactor;
      });
      
      // Calculate violation age - prioritize recent violations
      const recentViolations = filteredViolations.filter(v => 
        v.ACTIVITY_DATE && new Date(v.ACTIVITY_DATE) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      );
      
      const recentHighRisk = recentViolations.filter(v => 
        v.REVISED_RISK_LEVEL === 'High' || v.REVISED_RISK_LEVEL === 'Medium High'
      ).length;
      
      // Use the age-adjusted risk score instead of manually calculating
      let riskScore = ageAdjustedRiskScore;
      
      // Factor in recency of high-risk violations
      if (recentHighRisk > 0) {
        riskScore *= 1.2;
      }
      
      // Factor in adverse actions
      if (adverseActionsCount > 0) {
        riskScore *= 1.5;
      }
      
      // Adjust for center age
      const ageFactor = getAgeFactor(daycare.years_in_operation);
      riskScore *= ageFactor;
      
      // Adjust for total inspection count (more inspections = more opportunities for violations)
      const totalInspections = daycare.TOTAL_INSPECTIONS || 1;
      riskScore = riskScore / Math.sqrt(totalInspections);
      
      // Cap the risk score at 100
      riskScore = Math.min(100, Math.max(0, riskScore));
      
      // Extract keywords from all violation text
      const combinedText = allNarratives + ' ' + allStandards;
      const extractedKeywords = extractKeywords(combinedText);
      
      // Identify risk factors based on violation text and keywords
      const riskFactors = identifyRiskFactors(
        combinedText, 
        extractedKeywords, 
        riskCounts, 
        filteredViolations,
        violationTextByRisk
      );
      
      // Generate recommendations based on risk factors
      const recommendations = generateRecommendations(riskFactors);
      
      // Generate detailed analysis summary
      const analysisSummary = generateAnalysisSummary(
        daycare, 
        filteredViolations, 
        riskCounts,
        categoryCounts, 
        riskScore, 
        riskFactors,
        recentViolations
      );
      
      // Save everything to database
      const analysisData = {
        analysisSummary,
        riskFactors,
        recommendations,
        riskScore,
        violationCounts: riskCounts,
        adverseActionsCount
      };
      
      await saveAnalysisToDB(pool, daycare.OPERATION_ID, analysisData);
      
      // Only log high risk daycares to reduce output
      if (riskScore > 70) {
        console.log(`High risk analysis complete for ${daycare.OPERATION_NAME} (Risk Score: ${riskScore.toFixed(2)})`);
      }
    }
    
    // Add a small delay between batches to allow garbage collection
    if (batchIndex < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Show summary statistics
  console.log('-----------------------------------------------------------');
  console.log('Risk analysis generation complete!');
  console.log(`Total daycares processed: ${processedCount}`);
  console.log(`Daycares with violations: ${withViolationsCount} (${((withViolationsCount/processedCount)*100).toFixed(1)}%)`);
  console.log(`Daycares without violations: ${withoutViolationsCount} (${((withoutViolationsCount/processedCount)*100).toFixed(1)}%)`);
  console.log('-----------------------------------------------------------');
}

// Generate default risk factors for facilities with no violations
function generateDefaultRiskFactors(daycare) {
  const defaultFactors = [];
  
  // New facility risk factor
  if (daycare.years_in_operation !== null && daycare.years_in_operation < 2) {
    defaultFactors.push({
      category: 'operational_experience',
      description: 'Limited operational history',
      severity: 'Low',
      matches: 1,
      keywords: ['new facility', 'recent opening'],
      examples: []
    });
  }
  
  // Large capacity factor
  if (daycare.TOTAL_CAPACITY && daycare.TOTAL_CAPACITY > 100) {
    defaultFactors.push({
      category: 'facility_size',
      description: 'Large facility capacity',
      severity: 'Low',
      matches: 1,
      keywords: ['large capacity', 'high enrollment'],
      examples: []
    });
  }
  
  // Age-specific factors
  if (daycare.LICENSED_TO_SERVE_AGES) {
    const ageText = daycare.LICENSED_TO_SERVE_AGES.toLowerCase();
    
    if (ageText.includes('infant')) {
      defaultFactors.push({
        category: 'infant_care',
        description: 'Infant care considerations',
        severity: 'Low',
        matches: 1,
        keywords: ['infant care', 'baby'],
        examples: []
      });
    }
    
    if (ageText.includes('toddler')) {
      defaultFactors.push({
        category: 'toddler_care',
        description: 'Toddler safety considerations',
        severity: 'Low',
        matches: 1,
        keywords: ['toddler', 'young children'],
        examples: []
      });
    }
  }
  
  // Special services factors
  if (daycare.PROGRAMMATIC_SERVICES) {
    const servicesText = daycare.PROGRAMMATIC_SERVICES.toLowerCase();
    
    if (servicesText.includes('special needs')) {
      defaultFactors.push({
        category: 'special_needs',
        description: 'Special needs accommodation',
        severity: 'Low',
        matches: 1,
        keywords: ['special needs', 'accommodation'],
        examples: []
      });
    }
    
    if (servicesText.includes('transportation')) {
      defaultFactors.push({
        category: 'transportation',
        description: 'Transportation safety considerations',
        severity: 'Low',
        matches: 1,
        keywords: ['transportation', 'vehicle safety'],
        examples: []
      });
    }
  }
  
  // Adverse action factors (if applicable)
  if (daycare.ADVERSE_ACTION === 'Y') {
    defaultFactors.push({
      category: 'regulatory_history',
      description: 'History of adverse regulatory actions',
      severity: 'Medium',
      matches: 1,
      keywords: ['adverse action', 'regulatory'],
      examples: []
    });
  }
  
  // If we have no factors at all, add a general note
  if (defaultFactors.length === 0) {
    defaultFactors.push({
      category: 'general',
      description: 'General childcare considerations',
      severity: 'Low',
      matches: 1,
      keywords: ['childcare', 'general safety'],
      examples: []
    });
  }
  
  return defaultFactors;
}

// Generate a minimal analysis for daycares with no violations
function generateMinimalAnalysis(daycare) {
  let summary = `${daycare.OPERATION_NAME} is a ${daycare.OPERATION_TYPE?.toLowerCase() || 'daycare'} located in ${daycare.CITY || 'Texas'}`;
  
  if (daycare.LICENSED_TO_SERVE_AGES) {
    summary += ` licensed to serve children aged ${daycare.LICENSED_TO_SERVE_AGES}`;
  }
  
  if (daycare.TOTAL_CAPACITY) {
    summary += ` with a capacity of ${daycare.TOTAL_CAPACITY} children`;
  }
  
  summary += `. `;
  
  if (daycare.years_in_operation) {
    summary += `The facility has been in operation for approximately ${Math.round(daycare.years_in_operation)} years. `;
  }
  
  if (daycare.TOTAL_INSPECTIONS) {
    summary += `It has undergone ${daycare.TOTAL_INSPECTIONS} inspections with no documented violations. `;
  }
  
  summary += `Based on available data, this facility has maintained compliance with licensing standards. `;
  
  // Add additional context about services if available
  if (daycare.PROGRAMMATIC_SERVICES) {
    summary += `The facility offers ${daycare.PROGRAMMATIC_SERVICES}. `;
  }
  
  if (daycare.HOURS_OF_OPERATION) {
    summary += `Operating hours are ${daycare.HOURS_OF_OPERATION}`;
    if (daycare.DAYS_OF_OPERATION) {
      summary += ` on ${daycare.DAYS_OF_OPERATION}`;
    }
    summary += `. `;
  }
  
  if (daycare.ACCEPTS_CHILD_CARE_SUBSIDIES === 'Y') {
    summary += `This facility accepts child care subsidies. `;
  }
  
  summary += `While the absence of violations is a positive indicator, this analysis is based solely on inspection records and should be supplemented with a personal visit and further research.`;
  
  return summary;
}

// Identify risk factors based on violation text and extracted keywords
function identifyRiskFactors(text, keywords, riskCounts, violations, violationTextByRisk) {
  const riskFactors = [];
  
  // Process each risk factor category
  Object.entries(RISK_FACTOR_KEYWORDS).forEach(([category, data]) => {
    // Check for keyword matches in the text
    const { keywords: categoryKeywords, description } = data;
    
    // Count how many keywords from this category appear in the text
    let matchCount = 0;
    const matchedKeywords = [];
    
    categoryKeywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        matchCount++;
        matchedKeywords.push(keyword);
      }
    });
    
    // If we have matches, create a risk factor
    if (matchCount > 0) {
      // Determine severity based on related violations
      let severity = 'Low';
      let violationExamples = [];
      
      // Check if high risk violations contain these keywords
      const highRiskText = violationTextByRisk['High'].join(' ').toLowerCase();
      const mediumHighRiskText = violationTextByRisk['Medium High'].join(' ').toLowerCase();
      
      const keywordInHighRisk = matchedKeywords.some(k => 
        highRiskText.includes(k.toLowerCase())
      );
      
      const keywordInMediumHighRisk = matchedKeywords.some(k => 
        mediumHighRiskText.includes(k.toLowerCase())
      );
      
      // Find example violations related to this factor
      violations.forEach(violation => {
        if (violation.NARRATIVE && matchedKeywords.some(k => 
          violation.NARRATIVE.toLowerCase().includes(k.toLowerCase())
        )) {
          // Keep track of examples, prioritizing high risk ones
          if (violation.REVISED_RISK_LEVEL === 'High' || violation.REVISED_RISK_LEVEL === 'Medium High') {
            violationExamples.unshift({
              description: violation.STANDARD_NUMBER_DESCRIPTION,
              risk: violation.REVISED_RISK_LEVEL,
              date: violation.ACTIVITY_DATE
            });
          } else {
            violationExamples.push({
              description: violation.STANDARD_NUMBER_DESCRIPTION,
              risk: violation.REVISED_RISK_LEVEL,
              date: violation.ACTIVITY_DATE
            });
          }
        }
      });
      
      // Determine severity based on findings
      if (keywordInHighRisk || (riskCounts['High'] > 0 && matchCount >= 3)) {
        severity = 'High';
      } else if (keywordInMediumHighRisk || (riskCounts['Medium High'] > 0 && matchCount >= 2)) {
        severity = 'Medium';
      }
      
      // Create the risk factor entry
      riskFactors.push({
        category,
        description,
        severity,
        matches: matchCount,
        keywords: matchedKeywords.slice(0, 5), // Top 5 matched keywords
        examples: violationExamples.slice(0, 2)  // Top 2 examples
      });
    }
  });
  
  // Sort risk factors by severity then match count
  riskFactors.sort((a, b) => {
    const severityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
    if (severityOrder[b.severity] !== severityOrder[a.severity]) {
      return severityOrder[b.severity] - severityOrder[a.severity];
    }
    return b.matches - a.matches;
  });
  
  return riskFactors;
}

// Generate recommendations based on identified risk factors
function generateRecommendations(riskFactors) {
  const recommendations = [];
  const categories = new Set();
  
  // Add recommendations based on risk factors, prioritizing higher severity
  riskFactors.forEach(factor => {
    if (RECOMMENDATION_TEMPLATES[factor.category]) {
      categories.add(factor.category);
      
      // Determine how many recommendations to include based on severity
      const recCount = factor.severity === 'High' ? 3 : 
                       factor.severity === 'Medium' ? 2 : 1;
      
      // Add recommendations for this category
      const categoryRecs = RECOMMENDATION_TEMPLATES[factor.category];
      categoryRecs.slice(0, recCount).forEach(rec => {
        if (!recommendations.includes(rec)) {
          recommendations.push(rec);
        }
      });
    }
  });
  
  // Add general recommendations
  const generalRecsToAdd = Math.min(5, 10 - recommendations.length);
  if (generalRecsToAdd > 0) {
    RECOMMENDATION_TEMPLATES.general.slice(0, generalRecsToAdd).forEach(rec => {
      if (!recommendations.includes(rec)) {
        recommendations.push(rec);
      }
    });
  }
  
  // Add one recommendation from any major category not yet covered
  const importantCategories = ['supervision', 'safety', 'health', 'training'];
  importantCategories.forEach(category => {
    if (!categories.has(category) && recommendations.length < 12) {
      const firstRec = RECOMMENDATION_TEMPLATES[category][0];
      if (!recommendations.includes(firstRec)) {
        recommendations.push(firstRec);
      }
    }
  });
  
  // Limit total recommendations
  return recommendations.slice(0, 12);
}

// Generate comprehensive analysis summary
function generateAnalysisSummary(daycare, violations, riskCounts, categoryCounts, riskScore, riskFactors, recentViolations) {
  let summary = '';
  
  // Daycare profile section
  summary += `${daycare.OPERATION_NAME} is a ${daycare.OPERATION_TYPE?.toLowerCase() || 'daycare'} located in ${daycare.CITY || 'Texas'}`;
  
  if (daycare.LICENSED_TO_SERVE_AGES) {
    summary += ` licensed to serve children aged ${daycare.LICENSED_TO_SERVE_AGES}`;
  }
  
  if (daycare.TOTAL_CAPACITY) {
    summary += ` with a capacity of ${daycare.TOTAL_CAPACITY} children`;
  }
  
  summary += `. `;
  
  // Operational history
  if (daycare.years_in_operation) {
    summary += `The facility has been in operation for approximately ${Math.round(daycare.years_in_operation)} years. `;
  }
  
  if (daycare.TOTAL_INSPECTIONS) {
    summary += `It has undergone ${daycare.TOTAL_INSPECTIONS} inspections `;
    
    if (violations.length > 0) {
      summary += `with a total of ${violations.length} documented violations. `;
    } else {
      summary += `with no documented violations. `;
    }
  }
  
  // Violations summary
  if (violations.length > 0) {
    // Risk level distribution
    summary += `Violation breakdown by risk level: `;
    
    const riskLevelStrings = [];
    if (riskCounts['High'] > 0) {
      riskLevelStrings.push(`${riskCounts['High']} high risk`);
    }
    if (riskCounts['Medium High'] > 0) {
      riskLevelStrings.push(`${riskCounts['Medium High']} medium-high risk`);
    }
    if (riskCounts['Medium'] > 0) {
      riskLevelStrings.push(`${riskCounts['Medium']} medium risk`);
    }
    if ((riskCounts['Medium Low'] || 0) + (riskCounts['Low'] || 0) > 0) {
      riskLevelStrings.push(`${(riskCounts['Medium Low'] || 0) + (riskCounts['Low'] || 0)} low-risk`);
    }
    
    summary += riskLevelStrings.join(', ') + '. ';
    
    // Category distribution - focus on the top categories
    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);
    
    if (topCategories.length > 0) {
      summary += `The primary concern areas are `;
      summary += topCategories
        .map(([category, count]) => `${category.toLowerCase()} (${count} violations)`)
        .join(' and ') + '. ';
    }
    
    // Recent violations
    if (recentViolations.length > 0) {
      const recentHighRisk = recentViolations.filter(v => v.REVISED_RISK_LEVEL === 'High').length;
      const recentMediumHighRisk = recentViolations.filter(v => v.REVISED_RISK_LEVEL === 'Medium High').length;
      
      summary += `In the past year, there have been ${recentViolations.length} violations`;
      
      if (recentHighRisk > 0 || recentMediumHighRisk > 0) {
        summary += `, including ${recentHighRisk + recentMediumHighRisk} higher-risk concerns`;
      }
      
      summary += `. `;
    }
    
    // Highlight key risk factors if available
    if (riskFactors.length > 0) {
      const highSeverityFactors = riskFactors.filter(f => f.severity === 'High');
      const mediumSeverityFactors = riskFactors.filter(f => f.severity === 'Medium');
      
      if (highSeverityFactors.length > 0) {
        summary += `Key areas of concern include `;
        summary += highSeverityFactors
          .slice(0, 2)
          .map(f => f.description.toLowerCase())
          .join(' and ') + '. ';
      } else if (mediumSeverityFactors.length > 0) {
        summary += `Areas to note include `;
        summary += mediumSeverityFactors
          .slice(0, 2)
          .map(f => f.description.toLowerCase())
          .join(' and ') + '. ';
      }
    }
    
    // Add note if facility has adverse actions
    if (daycare.ADVERSE_ACTION === 'Y') {
      summary += `This facility has had adverse regulatory actions taken against it. `;
    }
    
    // Add note about violation age if there are older violations
    const oldViolations = violations.filter(v => {
      if (!v.ACTIVITY_DATE) return false;
      const vDate = new Date(v.ACTIVITY_DATE);
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      return vDate < threeYearsAgo;
    });
    
    if (oldViolations.length > 0 && oldViolations.length === violations.length) {
      summary += `All violations are over three years old. `;
    } else if (oldViolations.length > 0) {
      summary += `${oldViolations.length} of the ${violations.length} violations are over three years old. `;
    }
  }
  
  // Risk assessment and conclusion
  if (riskScore < 10) {
    summary += `Overall, this facility shows minimal compliance concerns based on inspection history.`;
  } else if (riskScore < 30) {
    summary += `Overall, this facility shows moderate compliance concerns that may warrant attention.`;
  } else if (riskScore < 60) {
    summary += `Overall, this facility shows significant compliance concerns that warrant careful consideration.`;
  } else {
    summary += `Overall, this facility shows serious compliance issues that require thorough evaluation before enrollment.`;
  }
  
  // Add disclaimer
  summary += ` This analysis is based on inspection records and should be supplemented with a personal visit and further research.`;
  
  return summary;
}

// Save analysis results to database
async function saveAnalysisToDB(pool, operationId, analysisData) {
  // Check if operationId is defined and non-null
  if (!operationId) {
    console.error('Error: Attempted to save analysis with null or undefined operation_id');
    return false;
  }
  
  const {
    analysisSummary,
    riskFactors,
    recommendations,
    riskScore,
    violationCounts,
    adverseActionsCount
  } = analysisData;
  
  try {
    // Get the daycare operations data to ensure we have accurate counts
    const [daycareData] = await pool.query(`
      SELECT 
        TOTAL_VIOLATIONS,
        HIGH_RISK_VIOLATIONS,
        MEDIUM_HIGH_RISK_VIOLATIONS,
        MEDIUM_RISK_VIOLATIONS,
        LOW_RISK_VIOLATIONS,
        ADVERSE_ACTION
      FROM 
        daycare_operations
      WHERE 
        OPERATION_ID = ?
    `, [operationId]);
    
    // Use values from daycare_operations as default, but prefer revised_non_compliance counts if available
    let totalViolations = 0;
    let highRiskCount = 0;
    let mediumHighRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;
    let hasAdverseAction = 0;
    
    // Get values from daycare_operations if available
    if (daycareData && daycareData.length > 0) {
      const daycare = daycareData[0];
      totalViolations = daycare.TOTAL_VIOLATIONS || 0;
      highRiskCount = daycare.HIGH_RISK_VIOLATIONS || 0;
      mediumHighRiskCount = daycare.MEDIUM_HIGH_RISK_VIOLATIONS || 0;
      mediumRiskCount = daycare.MEDIUM_RISK_VIOLATIONS || 0;
      lowRiskCount = daycare.LOW_RISK_VIOLATIONS || 0;
      hasAdverseAction = daycare.ADVERSE_ACTION === 'Y' ? 1 : 0;
    }
    
    // If we have violation counts from revised_non_compliance, use those instead
    if (violationCounts && Object.keys(violationCounts).length > 0) {
      const calculatedTotal = Object.values(violationCounts).reduce((sum, count) => sum + count, 0);
      if (calculatedTotal > 0) {
        totalViolations = calculatedTotal;
        highRiskCount = violationCounts['High'] || 0;
        mediumHighRiskCount = violationCounts['Medium High'] || 0;
        mediumRiskCount = violationCounts['Medium'] || 0;
        lowRiskCount = (violationCounts['Medium Low'] || 0) + (violationCounts['Low'] || 0);
      }
    }
    
    // Use the specified adverse actions count if provided, otherwise use from daycare_operations
    const finalAdverseActionCount = adverseActionsCount !== undefined ? adverseActionsCount : hasAdverseAction;
    
    // Log warning if any invalid data is detected
    if (!analysisSummary) {
      console.warn(`Warning: Empty analysis summary for operation ${operationId}`);
    }
    
    await pool.query(`
      INSERT INTO risk_analysis (
        operation_id,
        analysis_summary,
        risk_factors,
        parent_recommendations,
        total_violations,
        high_risk_count,
        medium_high_risk_count,
        medium_risk_count,
        low_risk_count,
        adverse_actions_count,
        risk_score,
        last_analysis_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE)
      ON DUPLICATE KEY UPDATE
        analysis_summary = VALUES(analysis_summary),
        risk_factors = VALUES(risk_factors),
        parent_recommendations = VALUES(parent_recommendations),
        total_violations = VALUES(total_violations),
        high_risk_count = VALUES(high_risk_count),
        medium_high_risk_count = VALUES(medium_high_risk_count),
        medium_risk_count = VALUES(medium_risk_count),
        low_risk_count = VALUES(low_risk_count),
        adverse_actions_count = VALUES(adverse_actions_count),
        risk_score = VALUES(risk_score),
        last_analysis_date = CURRENT_DATE
    `, [
      operationId,
      analysisSummary || '',
      JSON.stringify(riskFactors || []),
      JSON.stringify(recommendations || []),
      totalViolations,
      highRiskCount,
      mediumHighRiskCount,
      mediumRiskCount,
      lowRiskCount,
      finalAdverseActionCount,
      riskScore || 0
    ]);
    
    return true;
  } catch (err) {
    console.error(`Error saving analysis for operation ${operationId}:`, err);
    return false;
  }
}

// Main function
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  const specificDaycareId = args[0]; // optional: specific daycare to analyze
  
  console.log(`Starting risk analysis ${specificDaycareId ? 'for daycare: ' + specificDaycareId : 'for all daycares'}...`);
  console.log(`Database: ${dbConfig.database} using Unix socket connection`);
  // Create connection pool
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // Check DB connection
    console.log('Testing database connection...');
    await pool.query('SELECT 1');
    console.log('Database connection successful');
    
    // Ensure table structure is correct
    await ensureTableStructure(pool);
    
    // Create a backup of the current risk_analysis table if it exists
    console.log('Creating backup of current risk_analysis table if it exists...');
    const [tables] = await pool.query(`SHOW TABLES LIKE 'risk_analysis'`);
    if (tables.length > 0) {
      console.log('Creating backup table risk_analysis_backup...');
      await pool.query('DROP TABLE IF EXISTS risk_analysis_backup');
      await pool.query('CREATE TABLE risk_analysis_backup LIKE risk_analysis');
      await pool.query('INSERT INTO risk_analysis_backup SELECT * FROM risk_analysis');
      console.log('Backup complete');
    }
    
    // Generate the risk analysis
    await generateRiskAnalysis(pool, specificDaycareId);
    
    console.log('Process completed successfully!');
  } catch (err) {
    console.error('Error generating risk analysis:', err);
    console.error(err.stack);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
