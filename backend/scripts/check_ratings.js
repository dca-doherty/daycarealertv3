/**
 * Check Daycare Ratings
 * 
 * This script queries the daycare_ratings table to show sample records.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

async function checkRatings() {
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Get basic stats
    const [totalCount] = await pool.query('SELECT COUNT(*) as count FROM daycare_ratings');
    console.log(`Total ratings in database: ${totalCount[0].count}`);
    
    // Get distribution
    const [distribution] = await pool.query(`
      SELECT 
        overall_rating, 
        COUNT(*) as count,
        ROUND(COUNT(*) / (SELECT COUNT(*) FROM daycare_ratings) * 100, 1) as percentage
      FROM 
        daycare_ratings
      GROUP BY
        overall_rating
      ORDER BY
        overall_rating DESC
    `);
    
    console.log('\nRating Distribution:');
    distribution.forEach(row => {
      console.log(`${row.overall_rating} stars: ${row.count} daycares (${row.percentage}%)`);
    });
    
    // Get top rated daycares
    console.log('\nTop Rated Daycares:');
    const [topRated] = await pool.query(`
      SELECT 
        r.overall_rating,
        r.safety_rating,
        r.health_rating, 
        r.risk_score,
        d.OPERATION_NAME,
        d.OPERATION_TYPE,
        d.CITY
      FROM 
        daycare_ratings r
      JOIN
        daycare_operations d ON r.operation_id = d.OPERATION_ID
      WHERE
        r.overall_rating = 5
      ORDER BY
        r.safety_rating DESC, r.health_rating DESC
      LIMIT 5
    `);
    
    topRated.forEach(daycare => {
      console.log(`${daycare.OPERATION_NAME} (${daycare.CITY}): ${daycare.overall_rating} stars`);
      console.log(`  Safety: ${daycare.safety_rating || 'N/A'}, Health: ${daycare.health_rating || 'N/A'}, Risk Score: ${daycare.risk_score || 'N/A'}`);
    });
    
    // Get bottom rated daycares
    console.log('\nLowest Rated Daycares:');
    const [lowestRated] = await pool.query(`
      SELECT 
        r.overall_rating,
        r.safety_rating,
        r.health_rating, 
        r.risk_score,
        r.high_risk_violation_count,
        d.OPERATION_NAME,
        d.OPERATION_TYPE,
        d.CITY
      FROM 
        daycare_ratings r
      JOIN
        daycare_operations d ON r.operation_id = d.OPERATION_ID
      ORDER BY
        r.overall_rating ASC, r.risk_score DESC
      LIMIT 5
    `);
    
    lowestRated.forEach(daycare => {
      console.log(`${daycare.OPERATION_NAME} (${daycare.CITY}): ${daycare.overall_rating} stars`);
      console.log(`  Safety: ${daycare.safety_rating || 'N/A'}, Health: ${daycare.health_rating || 'N/A'}, Risk Score: ${daycare.risk_score || 'N/A'}`);
      console.log(`  Total Violations: ${daycare.violation_count || 0}, High Risk: ${daycare.high_risk_violation_count || 0}, Recent: ${daycare.recent_violations_count || 0}`);
    });
    
    // Check specific operation
    console.log('\nMeadow Oaks Academy Rating:');
    const [meadowOaks] = await pool.query(`
      SELECT 
        r.*,
        d.OPERATION_NAME,
        d.CITY,
        d.PROGRAMMATIC_SERVICES
      FROM 
        daycare_ratings r
      JOIN
        daycare_operations d ON r.operation_id = d.OPERATION_ID
      WHERE
        d.OPERATION_NAME LIKE '%Meadow Oaks%'
      LIMIT 1
    `);
    
    if (meadowOaks.length > 0) {
      const daycare = meadowOaks[0];
      console.log(`${daycare.OPERATION_NAME} (${daycare.CITY}): ${daycare.overall_rating} stars`);
      console.log(`  Safety: ${daycare.safety_rating || 'N/A'}, Health: ${daycare.health_rating || 'N/A'}, Wellbeing: ${daycare.wellbeing_rating || 'N/A'}`);
      console.log(`  Risk Score: ${daycare.risk_score || 'N/A'}, Violations: ${daycare.violation_count || 0}, High Risk: ${daycare.high_risk_violation_count || 0}, Recent: ${daycare.recent_violations_count || 0}`);
      console.log(`  PROGRAMMATIC_SERVICES: "${daycare.PROGRAMMATIC_SERVICES || 'N/A'}"`);
      
      try {
        let factors = [];
        let indicators = [];

        try {
          factors = JSON.parse(daycare.rating_factors || '[]');
        } catch (err) {
          console.log('  Could not parse rating_factors JSON');
        }

        try {
          indicators = JSON.parse(daycare.quality_indicators || '[]');
        } catch (err) {
          console.log('  Could not parse quality_indicators JSON');
        }
        
        if (factors.length > 0) {
          console.log('\n  Rating Factors:');
          factors.forEach(factor => {
            console.log(`    - ${factor.factor} (${factor.impact}): ${factor.details}`);
          });
        }
        
        if (indicators.length > 0) {
          console.log('\n  Quality Indicators:');
          indicators.forEach(indicator => {
            console.log(`    - ${indicator.indicator} (${indicator.impact})`);
          });
        } else {
          console.log('  No quality indicators found');
        }
      } catch (e) {
        console.log('  Error parsing fields:', e.message);
      }
    } else {
      console.log('  Not found');
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
checkRatings().catch(console.error);