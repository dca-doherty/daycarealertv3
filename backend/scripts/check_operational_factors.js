/**
 * Check Operational Factors Impact
 * 
 * This script analyzes how the new operational factors affect daycare ratings,
 * showing statistics on which factors are most common and their impact.
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

async function checkOperationalFactors() {
  console.log('Analyzing operational factors impact on ratings...');
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // First, analyze the quality indicators stored in the ratings table
    const [ratings] = await pool.query(`
      SELECT operation_id, overall_rating, quality_indicators
      FROM daycare_ratings
    `);
    
    console.log(`Found ${ratings.length} daycare ratings to analyze`);
    
    // Track indicators statistics
    const indicators = {};
    let totalWithOperationalFactors = 0;
    
    // Process each daycare's quality indicators
    for (const rating of ratings) {
      try {
        // Parse the quality indicators
        const qualityIndicators = JSON.parse(rating.quality_indicators);
        
        // Flag for tracking if this daycare has operational factors
        let hasOperationalFactor = false;
        
        if (Array.isArray(qualityIndicators)) {
          qualityIndicators.forEach(indicator => {
            const name = indicator.indicator;
            
            // Check if this is one of our operational factors
            const operationalFactorKeywords = [
              'subsidies', 'morning care', 'evening', '24-hour', 'Saturday', 
              'Sunday', '7-day', 'infant care', 'wide age range', 'capacity',
              'permit', 'closed'
            ];
            
            // Check if this is an operational factor
            const isOperationalFactor = operationalFactorKeywords.some(keyword => 
              name.toLowerCase().includes(keyword.toLowerCase())
            );
            
            if (isOperationalFactor) {
              hasOperationalFactor = true;
              
              if (!indicators[name]) {
                indicators[name] = {
                  count: 0,
                  totalImpact: 0,
                  avgImpact: 0
                };
              }
              
              indicators[name].count++;
              
              // Parse the impact value (e.g. "+0.2 stars" -> 0.2)
              let impactValue = 0;
              const impactMatch = indicator.impact.match(/([+-]?\d+\.\d+)/);
              if (impactMatch) {
                impactValue = parseFloat(impactMatch[1]);
                indicators[name].totalImpact += impactValue;
              }
            }
          });
        }
        
        // Count daycares with at least one operational factor
        if (hasOperationalFactor) {
          totalWithOperationalFactors++;
        }
        
      } catch (err) {
        console.warn(`Error parsing quality indicators for ${rating.operation_id}:`, err.message);
      }
    }
    
    // Calculate average impact for each indicator
    Object.keys(indicators).forEach(name => {
      indicators[name].avgImpact = indicators[name].totalImpact / indicators[name].count;
    });
    
    // Get operational data directly from the database for analysis
    const [operationalData] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN ACCEPTS_CHILD_CARE_SUBSIDIES = 'Y' THEN 1 ELSE 0 END) as accepts_subsidies,
        SUM(CASE WHEN HOURS_OF_OPERATION LIKE '%6:00%' OR HOURS_OF_OPERATION LIKE '%5:%' THEN 1 ELSE 0 END) as early_morning,
        SUM(CASE WHEN HOURS_OF_OPERATION LIKE '%7:%' OR HOURS_OF_OPERATION LIKE '%8:%' OR HOURS_OF_OPERATION LIKE '%9:%' OR HOURS_OF_OPERATION LIKE '%10:%' THEN 1 ELSE 0 END) as evening_care,
        SUM(CASE WHEN DAYS_OF_OPERATION LIKE '%SATURDAY%' OR DAYS_OF_OPERATION LIKE '%SAT%' THEN 1 ELSE 0 END) as saturday_care,
        SUM(CASE WHEN DAYS_OF_OPERATION LIKE '%SUNDAY%' OR DAYS_OF_OPERATION LIKE '%SUN%' THEN 1 ELSE 0 END) as sunday_care,
        SUM(CASE WHEN LICENSED_TO_SERVE_AGES LIKE '%INFANT%' THEN 1 ELSE 0 END) as infant_care,
        SUM(CASE WHEN CONDITIONS_ON_PERMIT = 'Y' THEN 1 ELSE 0 END) as conditions_on_permit,
        SUM(CASE WHEN TEMPORARILY_CLOSED = 'Y' THEN 1 ELSE 0 END) as temporarily_closed,
        SUM(CASE WHEN CAST(TOTAL_CAPACITY AS UNSIGNED) > 100 THEN 1 ELSE 0 END) as large_capacity
      FROM daycare_operations
    `);
    
    // Print report
    console.log('\n=== OPERATIONAL FACTORS IMPACT REPORT ===\n');
    console.log(`Total daycares with ratings: ${ratings.length}`);
    console.log(`Daycares with operational factors in ratings: ${totalWithOperationalFactors} (${((totalWithOperationalFactors / ratings.length) * 100).toFixed(1)}%)\n`);
    
    console.log('QUALITY INDICATORS FREQUENCY AND IMPACT:');
    Object.entries(indicators)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([name, stats]) => {
        console.log(`- ${name}: ${stats.count} daycares (${((stats.count / ratings.length) * 100).toFixed(1)}%), Avg impact: ${stats.avgImpact.toFixed(2)} stars`);
      });
    
    console.log('\nRAW OPERATIONAL DATA FROM DATABASE:');
    const total = operationalData[0].total;
    console.log(`- Accepts subsidies: ${operationalData[0].accepts_subsidies} (${((operationalData[0].accepts_subsidies / total) * 100).toFixed(1)}%)`);
    console.log(`- Early morning care: ${operationalData[0].early_morning} (${((operationalData[0].early_morning / total) * 100).toFixed(1)}%)`);
    console.log(`- Evening care: ${operationalData[0].evening_care} (${((operationalData[0].evening_care / total) * 100).toFixed(1)}%)`);
    console.log(`- Saturday care: ${operationalData[0].saturday_care} (${((operationalData[0].saturday_care / total) * 100).toFixed(1)}%)`);
    console.log(`- Sunday care: ${operationalData[0].sunday_care} (${((operationalData[0].sunday_care / total) * 100).toFixed(1)}%)`);
    console.log(`- Infant care: ${operationalData[0].infant_care} (${((operationalData[0].infant_care / total) * 100).toFixed(1)}%)`);
    console.log(`- Conditions on permit: ${operationalData[0].conditions_on_permit} (${((operationalData[0].conditions_on_permit / total) * 100).toFixed(1)}%)`);
    console.log(`- Temporarily closed: ${operationalData[0].temporarily_closed} (${((operationalData[0].temporarily_closed / total) * 100).toFixed(1)}%)`);
    console.log(`- Large capacity (>100): ${operationalData[0].large_capacity} (${((operationalData[0].large_capacity / total) * 100).toFixed(1)}%)`);
    
    // Compare ratings before and after operational factors
    console.log('\nIMPACT ON RATING DISTRIBUTION:');
    console.log('For accurate comparison, run this after generating new ratings and compare with previous distribution.');
    
    // Get current rating distribution
    const [ratingDistribution] = await pool.query(`
      SELECT 
        ROUND(overall_rating * 2) / 2 as rating, 
        COUNT(*) as count
      FROM 
        daycare_ratings
      GROUP BY 
        ROUND(overall_rating * 2) / 2
      ORDER BY 
        rating DESC
    `);
    
    console.log('\nCURRENT RATING DISTRIBUTION:');
    ratingDistribution.forEach(row => {
      const percentage = (row.count / ratings.length) * 100;
      const bar = "★".repeat(Math.round(parseFloat(row.rating)));
      console.log(`${row.rating} stars (${bar}): ${row.count} daycares (${percentage.toFixed(2)}%)`);
    });
    
  } catch (err) {
    console.error('Error analyzing operational factors:', err);
  } finally {
    await pool.end();
    console.log('\nAnalysis completed.');
  }
}

// Run the script
if (require.main === module) {
  checkOperationalFactors().catch(console.error);
}

module.exports = { checkOperationalFactors };