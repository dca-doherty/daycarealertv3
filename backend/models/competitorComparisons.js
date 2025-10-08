const { pool } = require('../config/db');
const logger = require('../utils/logger');

// Get nearby competitors for a daycare
async function getNearbyCompetitors(daycareId, limit = 5) {
  try {
    // First, get the daycare's location
    let daycareLocation;
    
    // Check in daycare_operations table first
    const [operations] = await pool.execute(
      `SELECT OPERATION_ID, OPERATION_NAME, STREET_NUMBER, STREET_NAME, CITY, ZIP_CODE, COUNTY_NAME, 
       LATITUDE, LONGITUDE
       FROM daycare_operations 
       WHERE OPERATION_ID = ?`,
      [daycareId]
    );
    
    if (operations.length > 0) {
      daycareLocation = operations[0];
    } else {
      // Try in daycares table
      const [daycares] = await pool.execute(
        `SELECT operation_number as OPERATION_ID, operation_name as OPERATION_NAME, 
         street_number as STREET_NUMBER, street_name as STREET_NAME, city as CITY, 
         zip_code as ZIP_CODE, county_name as COUNTY_NAME, latitude as LATITUDE,
         longitude as LONGITUDE
         FROM daycares 
         WHERE operation_number = ?`,
        [daycareId]
      );
      
      if (daycares.length === 0) {
        throw new Error(`Daycare with ID ${daycareId} not found`);
      }
      
      daycareLocation = daycares[0];
    }
    
    // If we don't have coordinates, we can't calculate distances
    if (!daycareLocation.LATITUDE || !daycareLocation.LONGITUDE) {
      throw new Error(`Daycare ${daycareId} doesn't have coordinates`);
    }
    
    // Search for nearby daycares in primary table
    const [nearbyOperations] = await pool.execute(
      `SELECT o.OPERATION_ID, o.OPERATION_NAME, o.STREET_NUMBER, o.STREET_NAME, 
       o.CITY, o.ZIP_CODE, o.COUNTY_NAME, o.LATITUDE, o.LONGITUDE,
       (
         6371 * acos(
           cos(radians(?)) * cos(radians(o.LATITUDE)) * cos(radians(o.LONGITUDE) - radians(?)) + 
           sin(radians(?)) * sin(radians(o.LATITUDE))
         )
       ) AS distance_km
       FROM daycare_operations o
       WHERE o.OPERATION_ID != ? AND o.LATITUDE IS NOT NULL AND o.LONGITUDE IS NOT NULL
       HAVING distance_km <= 10
       ORDER BY distance_km
       LIMIT ?`,
      [
        daycareLocation.LATITUDE,
        daycareLocation.LONGITUDE,
        daycareLocation.LATITUDE,
        daycareId,
        limit
      ]
    );
    
    // Convert km to miles and add additional data
    const competitors = await Promise.all(nearbyOperations.map(async competitor => {
      // Convert kilometers to miles
      const distanceMiles = competitor.distance_km * 0.621371;
      
      // Get pricing and rating info
      try {
        const [pricing] = await pool.execute(
          `SELECT AVG(average_weekly_rate) as avg_price, AVG(overall_rating) as avg_rating
           FROM daycares
           WHERE operation_number = ?`,
          [competitor.OPERATION_ID]
        );
        
        const [violations] = await pool.execute(
          `SELECT COUNT(*) as violation_count
           FROM violations
           WHERE operation_id = ?`,
          [competitor.OPERATION_ID]
        );
        
        return {
          id: competitor.OPERATION_ID,
          name: competitor.OPERATION_NAME,
          address: `${competitor.STREET_NUMBER} ${competitor.STREET_NAME}, ${competitor.CITY}, ${competitor.ZIP_CODE}`,
          county: competitor.COUNTY_NAME,
          distance_miles: parseFloat(distanceMiles.toFixed(2)),
          avg_price: pricing[0].avg_price || null,
          rating: pricing[0].avg_rating || null,
          violation_count: violations[0].violation_count || 0
        };
      } catch (err) {
        // If we can't get additional data, return basic info
        return {
          id: competitor.OPERATION_ID,
          name: competitor.OPERATION_NAME,
          address: `${competitor.STREET_NUMBER} ${competitor.STREET_NAME}, ${competitor.CITY}, ${competitor.ZIP_CODE}`,
          county: competitor.COUNTY_NAME,
          distance_miles: parseFloat(distanceMiles.toFixed(2)),
          avg_price: null,
          rating: null,
          violation_count: 0
        };
      }
    }));
    
    return competitors;
  } catch (error) {
    logger.error(`Error getting nearby competitors for daycare ${daycareId}:`, error);
    throw error;
  }
}

// Save a competitor comparison
async function saveCompetitorComparison(daycareId, competitorId, comparisonData) {
  try {
    const {
      distance_miles,
      price_difference_percent,
      rating_difference,
      violation_count_difference,
      market_position
    } = comparisonData;
    
    // Check if this comparison already exists
    const [existing] = await pool.execute(
      'SELECT id FROM competitor_comparisons WHERE daycare_id = ? AND competitor_id = ?',
      [daycareId, competitorId]
    );
    
    if (existing.length > 0) {
      // Update existing record
      const query = `
        UPDATE competitor_comparisons 
        SET distance_miles = ?, price_difference_percent = ?, rating_difference = ?,
        violation_count_difference = ?, market_position = ?
        WHERE id = ?
      `;
      
      await pool.execute(query, [
        distance_miles,
        price_difference_percent,
        rating_difference,
        violation_count_difference,
        market_position,
        existing[0].id
      ]);
      
      return { id: existing[0].id, ...comparisonData };
    } else {
      // Create new record
      const query = `
        INSERT INTO competitor_comparisons (
          daycare_id, competitor_id, distance_miles, price_difference_percent,
          rating_difference, violation_count_difference, market_position
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const [result] = await pool.execute(query, [
        daycareId,
        competitorId,
        distance_miles,
        price_difference_percent,
        rating_difference,
        violation_count_difference,
        market_position
      ]);
      
      return { id: result.insertId, ...comparisonData };
    }
  } catch (error) {
    logger.error(`Error saving competitor comparison for daycare ${daycareId}:`, error);
    throw error;
  }
}

// Get all competitor comparisons for a daycare
async function getCompetitorComparisons(daycareId) {
  try {
    const [rows] = await pool.execute(
      `SELECT cc.*, 
       CASE 
         WHEN do.OPERATION_NAME IS NOT NULL THEN do.OPERATION_NAME
         WHEN d.operation_name IS NOT NULL THEN d.operation_name
         ELSE 'Unknown Daycare'
       END as competitor_name
       FROM competitor_comparisons cc
       LEFT JOIN daycare_operations do ON cc.competitor_id = do.OPERATION_ID
       LEFT JOIN daycares d ON cc.competitor_id = d.operation_number
       WHERE cc.daycare_id = ?
       ORDER BY cc.distance_miles`,
      [daycareId]
    );
    
    return rows;
  } catch (error) {
    logger.error(`Error getting competitor comparisons for daycare ${daycareId}:`, error);
    throw error;
  }
}

// Generate market comparison report
async function generateMarketComparisonReport(daycareId) {
  try {
    // Get the daycare's information
    const [daycare] = await pool.execute(
      `SELECT 
         CASE
           WHEN do.OPERATION_NAME IS NOT NULL THEN do.OPERATION_NAME
           WHEN d.operation_name IS NOT NULL THEN d.operation_name
           ELSE 'Unknown Daycare'
         END as name,
         COALESCE(d.average_weekly_rate, 0) as weekly_rate,
         COALESCE(d.overall_rating, 0) as rating
       FROM (
         SELECT ? as id
       ) as temp
       LEFT JOIN daycare_operations do ON temp.id = do.OPERATION_ID
       LEFT JOIN daycares d ON temp.id = d.operation_number`,
      [daycareId]
    );
    
    if (!daycare[0]) {
      throw new Error(`Daycare with ID ${daycareId} not found`);
    }
    
    // Get all competitor comparisons
    const comparisons = await getCompetitorComparisons(daycareId);
    
    // Get violation counts
    const [violations] = await pool.execute(
      `SELECT COUNT(*) as count FROM violations WHERE operation_id = ?`,
      [daycareId]
    );
    
    // Calculate market summary
    const marketSummary = {
      daycare: {
        id: parseInt(daycareId),
        name: daycare[0].name,
        weekly_rate: daycare[0].weekly_rate,
        rating: daycare[0].rating,
        violations: violations[0].count || 0
      },
      competitors: comparisons.map(comp => ({
        id: comp.competitor_id,
        name: comp.competitor_name,
        distance_miles: comp.distance_miles,
        price_difference_percent: comp.price_difference_percent,
        rating_difference: comp.rating_difference,
        violation_count_difference: comp.violation_count_difference,
        market_position: comp.market_position
      })),
      market_summary: {
        total_competitors: comparisons.length,
        price_comparison: calculateMarketPosition(comparisons, 'price_difference_percent'),
        quality_comparison: calculateMarketPosition(comparisons, 'rating_difference'),
        safety_comparison: calculateMarketPosition(comparisons, 'violation_count_difference', true)
      }
    };
    
    return marketSummary;
  } catch (error) {
    logger.error(`Error generating market comparison for daycare ${daycareId}:`, error);
    throw error;
  }
}

// Helper function to calculate market position summary
function calculateMarketPosition(comparisons, field, inverse = false) {
  if (comparisons.length === 0) return 'No data';
  
  let betterCount = 0;
  let worseCount = 0;
  let similarCount = 0;
  
  comparisons.forEach(comp => {
    const value = comp[field];
    
    // Skip if no value
    if (value === null || value === undefined) {
      return;
    }
    
    // For most metrics, positive means the daycare is better
    // For violation counts, negative means the daycare is better (fewer violations)
    const threshold = 5; // 5% or 0.5 rating points as threshold for "similar"
    
    if (inverse) {
      // For inverse metrics like violation count (where lower is better)
      if (value < -threshold) {
        worseCount++; // Main daycare has more violations
      } else if (value > threshold) {
        betterCount++; // Main daycare has fewer violations
      } else {
        similarCount++; // Similar violation counts
      }
    } else {
      // For regular metrics like price and rating
      if (value > threshold) {
        betterCount++; // Main daycare is better
      } else if (value < -threshold) {
        worseCount++; // Competitor is better
      } else {
        similarCount++; // Similar ratings
      }
    }
  });
  
  const total = betterCount + worseCount + similarCount;
  if (total === 0) return 'No data';
  
  const betterPercent = (betterCount / total) * 100;
  const worsePercent = (worseCount / total) * 100;
  const similarPercent = (similarCount / total) * 100;
  
  if (betterPercent >= 50) {
    return 'Better than most competitors';
  } else if (worsePercent >= 50) {
    return 'Below most competitors';
  } else if (similarPercent >= 50) {
    return 'Similar to most competitors';
  } else if (betterPercent > worsePercent) {
    return 'Slightly better than competitors';
  } else if (worsePercent > betterPercent) {
    return 'Slightly below competitors';
  } else {
    return 'Mixed comparison results';
  }
}

module.exports = {
  getNearbyCompetitors,
  saveCompetitorComparison,
  getCompetitorComparisons,
  generateMarketComparisonReport
};
