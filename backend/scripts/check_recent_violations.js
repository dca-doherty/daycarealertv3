/**
 * Check for daycares with recent violations
 * 
 * This script queries the daycare_ratings table to find daycares with recent violations.
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

async function checkRecentViolations() {
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Get statistics on recent violations
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_daycares,
        SUM(CASE WHEN recent_violations_count > 0 THEN 1 ELSE 0 END) as daycares_with_recent,
        SUM(recent_violations_count) as total_recent_violations,
        MAX(recent_violations_count) as max_recent_violations,
        AVG(CASE WHEN recent_violations_count > 0 THEN recent_violations_count ELSE NULL END) as avg_recent_per_daycare
      FROM 
        daycare_ratings
    `);
    
    console.log('\nRecent Violations Statistics:');
    console.log(`Total daycares: ${stats[0].total_daycares}`);
    console.log(`Daycares with recent violations: ${stats[0].daycares_with_recent} (${((stats[0].daycares_with_recent / stats[0].total_daycares) * 100).toFixed(1)}%)`);
    console.log(`Total recent violations: ${stats[0].total_recent_violations}`);
    console.log(`Max recent violations at one daycare: ${stats[0].max_recent_violations}`);
    console.log(`Average recent violations per affected daycare: ${stats[0].avg_recent_per_daycare?.toFixed(1) || 'N/A'}`);
    
    // Get top 10 daycares with most recent violations
    console.log('\nTop 10 Daycares with Most Recent Violations:');
    const [topDaycares] = await pool.query(`
      SELECT 
        r.operation_id,
        r.overall_rating,
        r.risk_score,
        r.recent_violations_count,
        r.violation_count,
        r.high_risk_violation_count,
        d.OPERATION_NAME,
        d.CITY
      FROM 
        daycare_ratings r
      JOIN
        daycare_operations d ON r.operation_id = d.OPERATION_ID
      WHERE
        r.recent_violations_count > 0
      ORDER BY
        r.recent_violations_count DESC, r.high_risk_violation_count DESC
      LIMIT 10
    `);
    
    if (topDaycares.length === 0) {
      console.log('No daycares found with recent violations.');
    } else {
      topDaycares.forEach((daycare, index) => {
        console.log(`${index + 1}. ${daycare.OPERATION_NAME} (${daycare.CITY})`);
        console.log(`   Rating: ${daycare.overall_rating} stars, Risk Score: ${daycare.risk_score?.toFixed(2) || 'N/A'}`);
        console.log(`   Recent Violations: ${daycare.recent_violations_count}, Total: ${daycare.violation_count}, High Risk: ${daycare.high_risk_violation_count}`);
      });
    }
    
    // Get a random sample of daycares with recent violations for verification
    console.log('\nRandom Sample of Daycares with Recent Violations:');
    const [randomSample] = await pool.query(`
      SELECT 
        r.operation_id,
        r.overall_rating,
        r.risk_score,
        r.recent_violations_count,
        r.violation_count,
        d.OPERATION_NAME,
        d.CITY
      FROM 
        daycare_ratings r
      JOIN
        daycare_operations d ON r.operation_id = d.OPERATION_ID
      WHERE
        r.recent_violations_count > 0
      ORDER BY
        RAND()
      LIMIT 5
    `);
    
    if (randomSample.length === 0) {
      console.log('No daycares found with recent violations.');
    } else {
      for (const daycare of randomSample) {
        console.log(`\n${daycare.OPERATION_NAME} (${daycare.CITY})`);
        console.log(`Rating: ${daycare.overall_rating} stars, Risk Score: ${daycare.risk_score?.toFixed(2) || 'N/A'}`);
        console.log(`Recent Violations: ${daycare.recent_violations_count}, Total: ${daycare.violation_count}`);
        
        // Check actual violation dates for verification
        const [violations] = await pool.query(`
          SELECT 
            ACTIVITY_DATE, 
            REVISED_RISK_LEVEL,
            CATEGORY,
            STANDARD_NUMBER_DESCRIPTION
          FROM 
            revised_non_compliance
          WHERE 
            OPERATION_ID = ?
          ORDER BY 
            ACTIVITY_DATE DESC
          LIMIT 5
        `, [daycare.operation_id]);
        
        if (violations.length > 0) {
          console.log('Most recent violations:');
          violations.forEach(v => {
            const date = v.ACTIVITY_DATE ? new Date(v.ACTIVITY_DATE).toLocaleDateString() : 'Unknown date';
            console.log(`  - ${date} | ${v.REVISED_RISK_LEVEL || 'Unknown risk'} | ${v.CATEGORY || 'Unknown category'}`);
            console.log(`    ${v.STANDARD_NUMBER_DESCRIPTION?.substring(0, 100)}...`);
          });
        } else {
          console.log('No violations found in revised_non_compliance table.');
        }
      }
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
checkRecentViolations().catch(console.error);