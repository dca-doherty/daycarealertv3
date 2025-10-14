/**
 * Database service for daycare data
 * Provides methods to fetch daycare data from the local MySQL database first, 
 * with fallback to direct Texas API calls if needed
 */
const { pool } = require('../config/db');
const axios = require('axios');
require('dotenv').config();

// Config
const API_BASE_URL = process.env.API_BASE_URL || 'https://data.texas.gov/resource';
const SOCRATA_APP_TOKEN = process.env.SOCRATA_APP_TOKEN || 'XLZk8nhCZvuJ9UooaKbfng3ed';
const DAYCARE_DATASET = process.env.DAYCARE_DATASET || 'bc5r-88dy';
const VIOLATIONS_DATASET = process.env.VIOLATIONS_DATASET || 'cwsq-xwdj'; // Updated to match frontend config
const INSPECTIONS_DATASET = process.env.INSPECTIONS_DATASET || 'm5q4-3y3d';
const STANDARDS_DATASET = process.env.STANDARDS_DATASET || '7ech-8t9i';

// Set up the API client
const texasApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-App-Token': SOCRATA_APP_TOKEN
  }
});

/**
 * Fetch daycare operations from database first, then fall back to Texas API if needed
 */
const getDaycareOperations = async (limit = 20, offset = 0, filters = {}, sortColumn = '', sortDirection = 'asc') => {
  try {
    console.log('Fetching daycares from local database first...');
    
    // Build the SQL query with LEFT JOINs to include rating, cost estimate and risk analysis data
    // Using operation_id as join key in all tables
    let query = `
      SELECT d.*, 
             r.overall_rating, r.rating_factors, r.quality_indicators, r.risk_score,
             c.monthly_cost, c.weekly_cost, c.calculation_factors,
             ra.analysis_summary, ra.risk_factors, ra.parent_recommendations,
             
             -- Count violations from revised_non_compliance table
             (SELECT COUNT(*) FROM revised_non_compliance rnc WHERE rnc.operation_id = d.operation_id) as total_violations,
             (SELECT COUNT(*) FROM revised_non_compliance rnc WHERE rnc.operation_id = d.operation_id AND rnc.REVISED_RISK_LEVEL = 'High') as high_risk_violations,
             (SELECT COUNT(*) FROM revised_non_compliance rnc WHERE rnc.operation_id = d.operation_id AND rnc.REVISED_RISK_LEVEL = 'Medium High') as medium_high_risk_violations,
             (SELECT COUNT(*) FROM revised_non_compliance rnc WHERE rnc.operation_id = d.operation_id AND rnc.REVISED_RISK_LEVEL = 'Medium') as medium_risk_violations,
             (SELECT COUNT(*) FROM revised_non_compliance rnc WHERE rnc.operation_id = d.operation_id AND rnc.REVISED_RISK_LEVEL = 'Medium Low') as medium_low_risk_violations,
             (SELECT COUNT(*) FROM revised_non_compliance rnc WHERE rnc.operation_id = d.operation_id AND rnc.REVISED_RISK_LEVEL = 'Low') as low_risk_violations
             
      FROM daycare_operations d
      LEFT JOIN daycare_ratings_balanced_view r ON d.operation_id = r.operation_id
      LEFT JOIN daycare_cost_estimates c ON d.operation_id = c.operation_id
      LEFT JOIN risk_analysis ra ON d.operation_id = ra.operation_id
      WHERE d.OPERATION_STATUS = 'Y' 
        AND d.TEMPORARILY_CLOSED = 'NO'
    `;
    
    // Apply filters
    const queryParams = [];
    
    // Add search term filter if provided
    if (filters.searchTerm) {
      const searchTerm = `%${filters.searchTerm}%`;
      query += ` AND (
        d.OPERATION_NAME LIKE ? OR
        d.CITY LIKE ? OR
        d.OPERATION_TYPE LIKE ?
      )`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Add city filter if provided
    if (filters.city) {
      query += ` AND d.CITY = ?`;
      queryParams.push(filters.city);
    }
    
    // Add operation type filter if provided
    if (filters.operation_type) {
      query += ` AND d.OPERATION_TYPE = ?`;
      queryParams.push(filters.operation_type);
    }
    
    // Add price range filter if provided
    if (filters.priceRange) {
      console.log(`Processing price range filter: ${filters.priceRange}`);
      
      // Parse price range and add to WHERE clause
      const rangeParts = filters.priceRange.split('-');
      if (rangeParts.length === 2) {
        const minPrice = parseInt(rangeParts[0], 10);
        const maxPrice = rangeParts[1] === 'up' ? Number.MAX_SAFE_INTEGER : parseInt(rangeParts[1], 10);
        
        if (!isNaN(minPrice) && !isNaN(maxPrice)) {
          console.log(`Price range filter: ${minPrice} to ${maxPrice}`);
          query += ` AND c.monthly_cost >= ? AND c.monthly_cost < ?`;
          queryParams.push(minPrice, maxPrice);
        }
      }
    }
    
    // Add rating filter if provided
    if (filters.rating && filters.rating !== '') {
      console.log(`Processing rating filter: ${filters.rating}`);
      const minRating = parseFloat(filters.rating);
      
      if (!isNaN(minRating)) {
        // CRITICAL FIX: Only apply if it's a valid rating
        console.log(`Rating filter value: ${minRating} - adding to SQL query`);
        query += ` AND r.overall_rating >= ?`;
        queryParams.push(minRating);
      } else {
        console.log(`Invalid rating filter value: ${filters.rating} - ignoring`);
      }
    } else {
      console.log(`No rating filter specified - showing all ratings`);
    }
    
    // Add years in operation filter if provided
    if (filters.yearsInOperation) {
      console.log(`Processing years filter: ${filters.yearsInOperation}`);
      const minYears = parseInt(filters.yearsInOperation, 10);
      
      if (!isNaN(minYears)) {
        // Calculate the cutoff date
        const cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - minYears);
        const cutoffDateString = cutoffDate.toISOString().split('T')[0];
        
        query += ` AND d.ISSUANCE_DATE <= ?`;
        queryParams.push(cutoffDateString);
      }
    }
    
    // Add sorting
    if (sortColumn) {
      const safeDirection = sortDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      // Map frontend column names to database column names
      const columnMapping = {
        'operation_name': 'd.OPERATION_NAME',
        'city': 'd.CITY',
        'operation_type': 'd.OPERATION_TYPE',
        'total_capacity': 'd.TOTAL_CAPACITY',
        'estimated_price': 'c.monthly_cost',
        'rating': 'r.overall_rating',
        // Add more mappings as needed
      };
      
      const dbColumn = columnMapping[sortColumn] || 'd.OPERATION_NAME';
      query += ` ORDER BY ${dbColumn} ${safeDirection}`;
    } else {
      query += ` ORDER BY d.OPERATION_NAME ASC`;
    }
    
    // Add pagination
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);
    
    // Execute the query
    const [rows] = await pool.query(query, queryParams);
    
    if (rows.length > 0) {
      console.log(`Found ${rows.length} daycares in local database`);
      
      // Log a sample row to see what data we're getting from the database
      if (rows[0]) {
        console.log('Sample data from database:');
        console.log('operation_id:', rows[0].operation_id);
        console.log('monthly_cost:', rows[0].monthly_cost);
        console.log('overall_rating:', rows[0].overall_rating);
      }
      
      // Transform the database results to match the format expected by the frontend
      const transformedResults = rows.map(row => {
        // Calculate years in operation if issuance date is available
        let yearsInOperation = null;
        if (row.ISSUANCE_DATE) {
          const issuanceDate = new Date(row.ISSUANCE_DATE);
          const currentDate = new Date();
          yearsInOperation = ((currentDate - issuanceDate) / (1000 * 60 * 60 * 24 * 365.25));
        }
        
        // Format rating data to match what the frontend expects
        let ratingData = null;
        if (row.overall_rating) {
          const ratingScore = parseFloat(row.overall_rating);
          let ratingClass = 'poor';
          let stars = '';
          
          // Determine rating class and stars based on score
          if (ratingScore >= 4.0) {
            ratingClass = 'excellent';
            stars = '★★★★★';
          } else if (ratingScore >= 3.5) {
            ratingClass = 'good';
            stars = '★★★★';
          } else if (ratingScore >= 3.0) {
            ratingClass = 'good';
            stars = '★★★';
          } else if (ratingScore >= 2.5) {
            ratingClass = 'average';
            stars = '★★★';
          } else if (ratingScore >= 2.0) {
            ratingClass = 'average';
            stars = '★★';
          } else if (ratingScore >= 1.0) {
            ratingClass = 'poor';
            stars = '★';
          } else {
            stars = '☆';
          }
          
          ratingData = {
            score: ratingScore,
            class: ratingClass,
            stars: stars,
            factors: row.rating_factors ? JSON.parse(row.rating_factors) : {},
            quality: row.quality_indicators ? JSON.parse(row.quality_indicators) : {},
            yearsInOperation: yearsInOperation
          };
        }
        
        // Parse JSON fields if needed, handling already-parsed objects
        let calculationFactors = null;
        try {
          if (row.calculation_factors) {
            // Check if it's already an object (MySQL JSON datatype)
            if (typeof row.calculation_factors === 'object') {
              calculationFactors = row.calculation_factors;
            } else {
              calculationFactors = JSON.parse(row.calculation_factors);
            }
          }
        } catch(e) {
          console.warn('Error parsing calculation_factors JSON:', e);
        }
        
        let riskFactors = null;
        try {
          if (row.risk_factors) {
            // Check if it's already an object (MySQL JSON datatype)
            if (typeof row.risk_factors === 'object') {
              riskFactors = row.risk_factors;
            } else {
              riskFactors = JSON.parse(row.risk_factors);
            }
          }
        } catch(e) {
          console.warn('Error parsing risk_factors JSON:', e);
        }
        
        let parentRecommendations = null;
        try {
          if (row.parent_recommendations) {
            // Check if it's already an object (MySQL JSON datatype)
            if (typeof row.parent_recommendations === 'object') {
              parentRecommendations = row.parent_recommendations;
            } else {
              parentRecommendations = JSON.parse(row.parent_recommendations);
            }
          }
        } catch(e) {
          console.warn('Error parsing parent_recommendations JSON:', e);
        }
        
        return {
          operation_id: row.operation_id.toString(),
          operation_number: row.operation_id.toString(), // For backward compatibility with frontend
          operation_name: row.operation_name,
          operation_type: row.operation_type,
          location_address: row.location_address,
          city: row.city,
          county: row.county,
          phone_number: row.phone_number,
          issuance_date: row.issuance_date,
          license_issue_date: row.issuance_date, // alias for frontend compatibility
          total_capacity: parseInt(row.total_capacity, 10) || 0,
          email_address: row.email_address,
          website_address: row.website_address,
          administrator_director_name: row.administrator_director_name,
          days_of_operation: row.days_of_operation,
          hours_of_operation: row.hours_of_operation,
          accepts_child_care_subsidies: row.accepts_child_care_subsidies,
          accepts_cccsubsidy: row.accepts_child_care_subsidies, // alias for frontend compatibility
          temporarily_closed: row.temporarily_closed,
          
          // Violation summary counts from revised_non_compliance
          high_risk_violations: row.high_risk_violations || 0,
          medium_high_risk_violations: row.medium_high_risk_violations || 0,
          medium_risk_violations: row.medium_risk_violations || 0,
          medium_low_risk_violations: row.medium_low_risk_violations || 0,
          low_risk_violations: row.low_risk_violations || 0,
          total_violations_2yr: row.total_violations || 0,
          
          // Rating and cost data - use values directly from the database tables
          rating: ratingData,
          overall_rating: ratingData,
          risk_score: row.risk_score,
          estimated_price: row.monthly_cost || null, // From the daycare_cost_estimates table
          monthly_cost: row.monthly_cost || null,
          weekly_cost: row.weekly_cost || null,
          calculation_factors: calculationFactors,
          yearsInOperation: yearsInOperation,
          
          // Risk analysis data
          risk_analysis: row.analysis_summary,
          risk_factors: riskFactors,
          parent_recommendations: parentRecommendations
        };
      });
      
      // Build a count query that includes all the same filters
      let countQuery = `
        SELECT COUNT(*) AS total 
        FROM daycare_operations d
        LEFT JOIN daycare_ratings_balanced_view r ON d.operation_id = r.operation_id
        LEFT JOIN daycare_cost_estimates c ON d.operation_id = c.operation_id
        LEFT JOIN risk_analysis ra ON d.operation_id = ra.operation_id
        WHERE d.OPERATION_STATUS = 'Y' 
          AND d.TEMPORARILY_CLOSED = 'NO'
      `;
      
      // Add all the same filter conditions
      // Since we're reusing the same queryParams array, we don't need to add the values again
      if (filters.searchTerm) {
        countQuery += ` AND (
          d.OPERATION_NAME LIKE ? OR
          d.CITY LIKE ? OR
          d.OPERATION_TYPE LIKE ?
        )`;
      }
      
      if (filters.city) {
        countQuery += ` AND d.CITY = ?`;
      }
      
      if (filters.operation_type) {
        countQuery += ` AND d.OPERATION_TYPE = ?`;
      }
      
      if (filters.priceRange) {
        const rangeParts = filters.priceRange.split('-');
        if (rangeParts.length === 2) {
          const minPrice = parseInt(rangeParts[0], 10);
          const maxPrice = rangeParts[1] === 'up' ? Number.MAX_SAFE_INTEGER : parseInt(rangeParts[1], 10);
          
          if (!isNaN(minPrice) && !isNaN(maxPrice)) {
            countQuery += ` AND c.monthly_cost >= ? AND c.monthly_cost < ?`;
          }
        }
      }
      
      if (filters.rating && filters.rating !== '') {
        const minRating = parseFloat(filters.rating);
        if (!isNaN(minRating)) {
          // CRITICAL FIX: Only apply if it's a valid rating
          console.log(`Count query: Adding rating filter value: ${minRating}`);
          countQuery += ` AND r.overall_rating >= ?`;
        } else {
          console.log(`Count query: Invalid rating filter value: ${filters.rating} - ignoring`);
        }
      } else {
        console.log(`Count query: No rating filter specified`);
      }
      
      if (filters.yearsInOperation) {
        const minYears = parseInt(filters.yearsInOperation, 10);
        if (!isNaN(minYears)) {
          const cutoffDate = new Date();
          cutoffDate.setFullYear(cutoffDate.getFullYear() - minYears);
          const cutoffDateString = cutoffDate.toISOString().split('T')[0];
          
          countQuery += ` AND d.ISSUANCE_DATE <= ?`;
        }
      }
      
      // Execute the count query with the same parameters
      const [countResult] = await pool.query(countQuery, queryParams);
      
      return {
        data: transformedResults,
        total: countResult[0].total,
        source: 'db'
      };
    }
    
    console.log('No results in local database or database error - returning empty results');
    // Only use MySQL database, don't fall back to Texas API
    return { data: [], total: 0, source: 'db' };
  } catch (error) {
    console.error('Error fetching daycares from database:', error);
    
    // Return empty results instead of falling back to Texas API
    console.log('Database error - returning empty results');
    return { data: [], total: 0, source: 'db' };
  }
};

/**
 * Fetch daycare by ID from database, then fall back to Texas API
 */
const getDaycareById = async (operationId) => {
  try {
    console.log(`Fetching daycare #${operationId} from local database first...`);
    
    // Query with joins to get all related information
    const query = `
      SELECT d.*, 
             r.overall_rating, r.rating_factors, r.quality_indicators, r.risk_score,
             c.monthly_cost, c.weekly_cost, c.calculation_factors,
             ra.analysis_summary, ra.risk_factors, ra.parent_recommendations,
             
             -- Count violations from revised_non_compliance table
             (SELECT COUNT(*) FROM revised_non_compliance rnc WHERE rnc.operation_id = d.operation_id) as total_violations,
             (SELECT COUNT(*) FROM revised_non_compliance rnc WHERE rnc.operation_id = d.operation_id AND rnc.REVISED_RISK_LEVEL = 'High') as high_risk_violations,
             (SELECT COUNT(*) FROM revised_non_compliance rnc WHERE rnc.operation_id = d.operation_id AND rnc.REVISED_RISK_LEVEL = 'Medium High') as medium_high_risk_violations,
             (SELECT COUNT(*) FROM revised_non_compliance rnc WHERE rnc.operation_id = d.operation_id AND rnc.REVISED_RISK_LEVEL = 'Medium') as medium_risk_violations,
             (SELECT COUNT(*) FROM revised_non_compliance rnc WHERE rnc.operation_id = d.operation_id AND rnc.REVISED_RISK_LEVEL = 'Medium Low') as medium_low_risk_violations,
             (SELECT COUNT(*) FROM revised_non_compliance rnc WHERE rnc.operation_id = d.operation_id AND rnc.REVISED_RISK_LEVEL = 'Low') as low_risk_violations
             
      FROM daycare_operations d
      LEFT JOIN daycare_ratings_balanced_view r ON d.operation_id = r.operation_id
      LEFT JOIN daycare_cost_estimates c ON d.operation_id = c.operation_id
      LEFT JOIN risk_analysis ra ON d.operation_id = ra.operation_id
      WHERE d.operation_id = ?
    `;
    
    const [rows] = await pool.query(query, [operationId]);
    
    if (rows.length > 0) {
      console.log(`Found daycare #${operationId} in local database`);
      
      // Transform the result to match the expected format
      const daycare = rows[0];
      
      // Calculate years in operation if issuance date is available
      let yearsInOperation = null;
      if (daycare.ISSUANCE_DATE) {
        const issuanceDate = new Date(daycare.ISSUANCE_DATE);
        const currentDate = new Date();
        yearsInOperation = ((currentDate - issuanceDate) / (1000 * 60 * 60 * 24 * 365.25));
      }
      
      // Format rating data to match what the frontend expects
      let ratingData = null;
      if (daycare.overall_rating) {
        const ratingScore = parseFloat(daycare.overall_rating);
        let ratingClass = 'poor';
        let stars = '';
        
        // Determine rating class and stars based on score
        if (ratingScore >= 4.0) {
          ratingClass = 'excellent';
          stars = '★★★★★';
        } else if (ratingScore >= 3.5) {
          ratingClass = 'good';
          stars = '★★★★';
        } else if (ratingScore >= 3.0) {
          ratingClass = 'good';
          stars = '★★★';
        } else if (ratingScore >= 2.5) {
          ratingClass = 'average';
          stars = '★★★';
        } else if (ratingScore >= 2.0) {
          ratingClass = 'average';
          stars = '★★';
        } else if (ratingScore >= 1.0) {
          ratingClass = 'poor';
          stars = '★';
        } else {
          stars = '☆';
        }
        
        ratingData = {
          score: ratingScore,
          class: ratingClass,
          stars: stars,
          factors: daycare.rating_factors ? JSON.parse(daycare.rating_factors) : {},
          quality: daycare.quality_indicators ? JSON.parse(daycare.quality_indicators) : {},
          yearsInOperation: yearsInOperation
        };
      }
      
      // Parse JSON fields if needed, handling already-parsed objects
      let calculationFactors = null;
      try {
        if (daycare.calculation_factors) {
          // Check if it's already an object (MySQL JSON datatype)
          if (typeof daycare.calculation_factors === 'object') {
            calculationFactors = daycare.calculation_factors;
          } else {
            calculationFactors = JSON.parse(daycare.calculation_factors);
          }
        }
      } catch(e) {
        console.warn('Error parsing calculation_factors JSON:', e);
      }
      
      let riskFactors = null;
      try {
        if (daycare.risk_factors) {
          // Check if it's already an object (MySQL JSON datatype)
          if (typeof daycare.risk_factors === 'object') {
            riskFactors = daycare.risk_factors;
          } else {
            riskFactors = JSON.parse(daycare.risk_factors);
          }
        }
      } catch(e) {
        console.warn('Error parsing risk_factors JSON:', e);
      }
      
      let parentRecommendations = null;
      try {
        if (daycare.parent_recommendations) {
          // Check if it's already an object (MySQL JSON datatype)
          if (typeof daycare.parent_recommendations === 'object') {
            parentRecommendations = daycare.parent_recommendations;
          } else {
            parentRecommendations = JSON.parse(daycare.parent_recommendations);
          }
        }
      } catch(e) {
        console.warn('Error parsing parent_recommendations JSON:', e);
      }
      
      // Get recent reviews for this daycare if available
      let reviews = [];
      try {
        const [reviewRows] = await pool.query(
          'SELECT * FROM reviews WHERE daycare_id = ? ORDER BY created_at DESC LIMIT 5', 
          [operationId]
        );
        if (reviewRows.length > 0) {
          reviews = reviewRows;
        }
      } catch (reviewError) {
        console.warn(`Error fetching reviews for daycare #${operationId}:`, reviewError);
      }
      
      return {
        data: {
          operation_id: daycare.operation_id.toString(),
          operation_number: daycare.operation_id.toString(), // For backward compatibility with frontend
          operation_name: daycare.operation_name,
          operation_type: daycare.operation_type,
          location_address: daycare.location_address,
          city: daycare.city,
          county: daycare.county,
          phone_number: daycare.phone_number,
          issuance_date: daycare.issuance_date,
          license_issue_date: daycare.issuance_date, // alias for frontend compatibility
          total_capacity: parseInt(daycare.total_capacity, 10) || 0,
          email_address: daycare.email_address,
          website_address: daycare.website_address,
          administrator_director_name: daycare.administrator_director_name,
          days_of_operation: daycare.days_of_operation,
          hours_of_operation: daycare.hours_of_operation,
          accepts_child_care_subsidies: daycare.accepts_child_care_subsidies,
          accepts_cccsubsidy: daycare.accepts_child_care_subsidies, // alias for frontend compatibility
          temporarily_closed: daycare.temporarily_closed,
          
          // Violation summary counts from revised_non_compliance
          high_risk_violations: daycare.high_risk_violations || 0,
          medium_high_risk_violations: daycare.medium_high_risk_violations || 0,
          medium_risk_violations: daycare.medium_risk_violations || 0,
          medium_low_risk_violations: daycare.medium_low_risk_violations || 0,
          low_risk_violations: daycare.low_risk_violations || 0,
          total_violations_2yr: daycare.total_violations || 0,
          
          // Rating and cost data - use values directly from the database tables
          rating: ratingData,
          overall_rating: ratingData,
          risk_score: daycare.risk_score,
          estimated_price: daycare.monthly_cost || null, // From the daycare_cost_estimates table
          price_est: daycare.monthly_cost || null, // alias for frontend compatibility
          monthly_cost: daycare.monthly_cost || null,
          weekly_cost: daycare.weekly_cost || null,
          calculation_factors: calculationFactors,
          yearsInOperation: yearsInOperation,
          
          // Risk analysis data
          risk_analysis: daycare.analysis_summary,
          risk_factors: riskFactors,
          parent_recommendations: parentRecommendations,
          
          // Reviews data if available
          reviews: reviews,
          
          // Set source so frontend knows this came from our database
          data_source: 'mysql'
        },
        source: 'db'
      };
    }
    
    console.log(`Daycare #${operationId} not found in database - returning null`);
    // Only use MySQL database, don't fall back to Texas API
    return { data: null, source: 'db' };
  } catch (error) {
    console.error(`Error fetching daycare #${operationId} from database:`, error);
    
    // Return null instead of falling back to Texas API
    console.log(`Database error for daycare #${operationId} - returning null`);
    return { data: null, source: 'db' };
  }
};

/**
 * Fetch violations for a daycare from database first, then fall back to Texas API
 */
const getViolationsById = async (operationId) => {
  try {
    console.log(`Fetching violations for daycare #${operationId} from local database first...`);
    
    // Try the revised_non_compliance table first, as it has the updated/corrected data
    const [revisedRows] = await pool.query(
      'SELECT * FROM revised_non_compliance WHERE operation_id = ? ORDER BY activity_date DESC', 
      [operationId]
    );
    
    if (revisedRows.length > 0) {
      console.log(`Found ${revisedRows.length} violations for daycare #${operationId} in revised_non_compliance table`);
      
      // Transform the results to match the expected format
      const transformedViolations = revisedRows.map(row => {
        // Attempt to parse any JSON fields if needed
        let narrative = row.narrative;
        if (typeof narrative === 'string' && (narrative.startsWith('{') || narrative.startsWith('['))) {
          try {
            narrative = JSON.parse(narrative);
          } catch(e) {
            // Not JSON, leave as is
          }
        }
        
        return {
          violation_id: row.non_compliance_id,
          operation_id: row.operation_id,
          operation_number: row.operation_id, // For backward compatibility
          activity_id: row.activity_id,
          section_id: row.section_id,
          standard_number_description: row.standard_number_description,
          narrative: narrative,
          risk_level: formatRiskLevel(row.revised_risk_level || row.standard_risk_level),
          standard_risk_level: row.standard_risk_level,
          revised_risk_level: row.revised_risk_level,
          technical_assistance_given: row.technical_assistance_given || 'NO',
          corrected_at_inspection: row.corrected_at_inspection === 'Y' ? 'Yes' : 'No',
          corrected_date: row.corrected_date,
          violation_date: row.activity_date,
          date_correction_verified: row.date_correction_verified
        };
      });
      
      return {
        data: transformedViolations,
        source: 'db'
      };
    }
    
    // Fall back to the non_compliance table if no data in revised table
    const [nonComplianceRows] = await pool.query(
      'SELECT * FROM non_compliance WHERE operation_id = ? ORDER BY activity_date DESC', 
      [operationId]
    );
    
    if (nonComplianceRows.length > 0) {
      console.log(`Found ${nonComplianceRows.length} violations for daycare #${operationId} in non_compliance table`);
      
      // Transform the results to match the expected format
      const transformedViolations = nonComplianceRows.map(row => {
        // Attempt to parse any JSON fields if needed
        let narrative = row.narrative;
        if (typeof narrative === 'string' && (narrative.startsWith('{') || narrative.startsWith('['))) {
          try {
            narrative = JSON.parse(narrative);
          } catch(e) {
            // Not JSON, leave as is
          }
        }
        
        return {
          violation_id: row.non_compliance_id,
          operation_id: row.operation_id,
          operation_number: row.operation_id, // For backward compatibility
          activity_id: row.activity_id,
          section_id: row.section_id,
          standard_number_description: row.standard_number_description,
          narrative: narrative,
          risk_level: formatRiskLevel(row.revised_risk_level || row.standard_risk_level),
          standard_risk_level: row.standard_risk_level,
          revised_risk_level: row.revised_risk_level,
          technical_assistance_given: row.technical_assistance_given || 'NO',
          corrected_at_inspection: row.corrected_at_inspection === 'Y' ? 'Yes' : 'No',
          corrected_date: row.corrected_date,
          violation_date: row.activity_date,
          date_correction_verified: row.date_correction_verified
        };
      });
      
      return {
        data: transformedViolations,
        source: 'db'
      };
    }
    
    console.log(`No violations found in database for daycare #${operationId} - returning empty array`);
    // Only use MySQL database, don't fall back to Texas API
    return { data: [], source: 'db' };
  } catch (error) {
    console.error(`Error fetching violations for daycare #${operationId} from database:`, error);
    
    // Return empty array instead of falling back to Texas API
    console.log(`Database error for daycare #${operationId} violations - returning empty array`);
    return { data: [], source: 'db' };
  }
};

/**
 * Fetch available cities from database, then fall back to Texas API
 */
const getCities = async () => {
  try {
    console.log('Fetching distinct cities from local database first...');
    
    const [rows] = await pool.query(`
      SELECT DISTINCT city FROM daycare_operations 
      WHERE city IS NOT NULL 
        AND city != '' 
        AND (operation_type = 'Licensed Center' OR operation_type = 'Licensed Child-Care Home')
      ORDER BY city ASC
    `);
    
    if (rows.length > 0) {
      console.log(`Found ${rows.length} cities in local database`);
      
      // Transform the results to match expected format
      const cities = rows.map(row => row.city);
      return {
        data: cities,
        source: 'db'
      };
    }
    
    console.log('No cities found in database - returning empty array');
    // Only use MySQL database, don't fall back to Texas API
    return { data: [], source: 'db' };
  } catch (error) {
    console.error('Error fetching cities from database:', error);
    
    // Return empty array instead of falling back to Texas API
    console.log('Database error for cities - returning empty array');
    return { data: [], source: 'db' };
  }
};

/**
 * Fallback function to fetch daycares from the Texas API
 */
const fetchFromTexasApi = async (limit = 20, offset = 0, filters = {}, sortColumn = '', sortDirection = 'asc') => {
  try {
    console.log('Fetching directly from Texas API...');
    
    // Build the Socrata SoQL query
    let whereClause = "operation_type='Licensed Center' AND temporarily_closed='NO'";
    
    // Add search term filter
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm;
      whereClause += ` AND (
        UPPER(operation_name) LIKE UPPER('%${searchTerm}%') OR 
        UPPER(city) LIKE UPPER('%${searchTerm}%') OR
        UPPER(operation_type) LIKE UPPER('%${searchTerm}%')
      )`;
    }
    
    // Add city filter
    if (filters.city) {
      whereClause += ` AND UPPER(city)=UPPER('${filters.city}')`;
    }
    
    // Add operation type filter
    if (filters.operation_type) {
      whereClause += ` AND UPPER(operation_type)=UPPER('${filters.operation_type}')`;
    }
    
    // Prepare query parameters
    const params = {
      $limit: limit,
      $offset: offset,
      $where: whereClause
    };
    
    // Add sort parameters if provided
    if (sortColumn) {
      const safeDirection = sortDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      // Skip sorting for calculated fields that don't exist in the API
      const calculatedFields = ['estimated_price', 'price', 'rating', 'yearsInOperation'];
      if (!calculatedFields.includes(sortColumn)) {
        params.$order = `${sortColumn} ${safeDirection}`;
      }
    }
    
    // Get data from the API
    const response = await texasApi.get(`/${DAYCARE_DATASET}.json`, { params });
    
    // Get total count for pagination
    const countResponse = await texasApi.get(`/${DAYCARE_DATASET}.json`, {
      params: {
        $select: 'COUNT(*) as count',
        $where: whereClause
      }
    });
    
    const totalCount = countResponse.data[0] ? parseInt(countResponse.data[0].count, 10) : 0;
    
    return {
      data: response.data,
      total: totalCount,
      source: 'api'
    };
  } catch (error) {
    console.error('Error fetching from Texas API:', error);
    // Return empty result to avoid breaking the UI
    return { data: [], total: 0, source: 'api' };
  }
};

/**
 * Fallback function to fetch daycare by ID from the Texas API
 */
const fetchDaycareByIdFromTexasApi = async (operationId) => {
  try {
    console.log(`Fetching daycare #${operationId} directly from Texas API...`);
    
    const response = await texasApi.get(`/${DAYCARE_DATASET}.json`, {
      params: {
        operation_number: operationId // Texas API still uses operation_number 
      }
    });
    
    if (response.data.length > 0) {
      const apiData = response.data[0];
      
      // Add operation_id field for consistency with our database model
      apiData.operation_id = apiData.operation_number;
      
      return {
        data: apiData,
        source: 'api'
      };
    }
    
    return { data: null, source: 'api' };
  } catch (error) {
    console.error(`Error fetching daycare #${operationId} from Texas API:`, error);
    return { data: null, source: 'api' };
  }
};

/**
 * Fallback function to fetch violations by daycare ID from the Texas API
 */
const fetchViolationsByIdFromTexasApi = async (operationId) => {
  try {
    console.log(`Fetching violations for daycare #${operationId} directly from Texas API...`);
    
    // Use the correct API endpoint with appropriate parameters
    const timestamp = new Date().getTime(); // Add timestamp to prevent caching
    
    // First attempt with operation_id parameter
    const response = await texasApi.get(`/${VIOLATIONS_DATASET}.json`, {
      params: {
        operation_id: operationId,
        $limit: 500,
        _: timestamp // Add cache-busting parameter
      }
    });
    
    // If first attempt doesn't work, try with operation_number parameter
    let nonComplianceData = response.data;
    if (nonComplianceData.length === 0) {
      console.log(`No violations found with operation_id=${operationId}, trying with operation_number...`);
      const fallbackResponse = await texasApi.get(`/${VIOLATIONS_DATASET}.json`, {
        params: {
          operation_number: operationId,
          $limit: 500,
          _: timestamp // Add cache-busting parameter
        }
      });
      nonComplianceData = fallbackResponse.data;
    }
    
    // Transform the data to match the expected format in the frontend
    const transformedViolations = nonComplianceData.map(item => ({
      violation_id: item.non_compliance_id || `${item.operation_id}-${item.activity_id}-${Math.random().toString(36).substring(2, 10)}`,
      operation_id: item.operation_id,
      operation_number: item.operation_id, // For backward compatibility
      activity_id: item.activity_id,
      section_id: item.section_id,
      standard_number_description: item.standard_number_description,
      narrative: item.narrative,
      risk_level: formatRiskLevel(item.standard_risk_level),
      standard_risk_level: item.standard_risk_level,
      technical_assistance_given: item.technical_assistance_given || 'NO',
      corrected_at_inspection: item.corrected_at_inspection === 'Y' ? 'Yes' : 'No',
      corrected_date: item.corrected_date,
      violation_date: item.activity_date,
      date_correction_verified: item.date_correction_verified
    }));
    
    return {
      data: transformedViolations,
      source: 'api'
    };
  } catch (error) {
    console.error(`Error fetching violations for daycare #${operationId} from Texas API:`, error);
    return { data: [], source: 'api' };
  }
};

/**
 * Fallback function to fetch cities from the Texas API
 */
const fetchCitiesFromTexasApi = async () => {
  try {
    console.log('Fetching cities directly from Texas API...');
    
    const response = await texasApi.get(`/${DAYCARE_DATASET}.json`, {
      params: {
        $select: 'DISTINCT city',
        $where: "city IS NOT NULL AND city != '' AND operation_type='Licensed Center'",
        $order: 'city ASC',
        $limit: 500
      }
    });
    
    const cities = response.data.map(item => item.city).filter(Boolean);
    
    return {
      data: cities,
      source: 'api'
    };
  } catch (error) {
    console.error('Error fetching cities from Texas API:', error);
    return { data: [], source: 'api' };
  }
};

/**
 * Helper function to convert risk levels to the format expected by the frontend
 */
function formatRiskLevel(riskLevel) {
  if (!riskLevel) return 'Low';
  
  if (riskLevel === 'Medium High') return 'Medium-High';
  if (riskLevel === 'Medium Low') return 'Medium-Low';
  
  // Return the original value if no transform needed
  return riskLevel;
}

/**
 * Get distinct values for a specific field from the database
 */
const getDistinctValues = async (field) => {
  try {
    console.log(`Fetching distinct ${field} values from local database...`);
    
    const validFields = ['operation_type', 'city', 'county', 'state'];
    if (!validFields.includes(field)) {
      throw new Error(`Invalid field: ${field}`);
    }
    
    // Query the database for distinct values
    let query;
    
    if (field === 'operation_type') {
      // For operation_type, only return the specific types we want
      query = `SELECT DISTINCT ${field} FROM daycare_operations 
               WHERE ${field} IN ('Licensed Center', 'Licensed Child-Care Home')
               AND ${field} IS NOT NULL AND ${field} != '' 
               ORDER BY ${field} ASC`;
    } else {
      // For other fields, return all distinct values
      query = `SELECT DISTINCT ${field} FROM daycare_operations 
               WHERE ${field} IS NOT NULL AND ${field} != '' 
               ORDER BY ${field} ASC`;
    }
    
    const [rows] = await pool.query(query);
    
    if (rows.length > 0) {
      console.log(`Found ${rows.length} distinct ${field} values in database`);
      
      // Extract the values from the rows
      const values = rows.map(row => row[field]);
      return {
        data: values,
        source: 'db'
      };
    }
    
    console.log(`No ${field} values found in database - returning hardcoded values if available`);
    
    // Return hardcoded values for operation_type
    if (field === 'operation_type') {
      return {
        data: [
          'Licensed Center',
          'Licensed Child-Care Home'
        ],
        source: 'fallback'
      };
    }
    
    return { data: [], source: 'db' };
  } catch (error) {
    console.error(`Error fetching distinct ${field} values from database:`, error);
    
    // Return hardcoded values for operation_type as fallback
    if (field === 'operation_type') {
      return {
        data: [
          'Licensed Center',
          'Licensed Child-Care Home'
        ],
        source: 'fallback'
      };
    }
    
    return { data: [], source: 'db' };
  }
};

module.exports = {
  getDaycareOperations,
  getDaycareById,
  getViolationsById,
  getCities,
  getDistinctValues
};
