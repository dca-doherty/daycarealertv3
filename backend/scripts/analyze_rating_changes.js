/**
 * Analyze Rating Changes After Operational Factors Implementation
 * 
 * This script compares the new rating distribution with operational factors
 * to the previous distribution without them.
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

// Previous distribution from report
const previousDistribution = {
  '5.0': { count: 6257, percentage: 40.66 },
  '4.5': { count: 4356, percentage: 28.31 },
  '4.0': { count: 2431, percentage: 15.80 },
  '3.5': { count: 1282, percentage: 8.33 },
  '3.0': { count: 573, percentage: 3.72 },
  '2.5': { count: 280, percentage: 1.82 },
  '2.0': { count: 147, percentage: 0.96 },
  '1.5': { count: 38, percentage: 0.25 },
  '1.0': { count: 25, percentage: 0.16 }
};

// Main function to analyze rating changes
async function analyzeRatingChanges() {
  console.log('Analyzing rating changes after operational factors implementation...');
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // Get current rating distribution
    const [currentDistribution] = await pool.query(`
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
    
    // Calculate total ratings
    const [totalResult] = await pool.query(`
      SELECT COUNT(*) as total FROM daycare_ratings
    `);
    const total = totalResult[0].total;
    
    // Format current distribution for comparison
    const currentDistributionMap = {};
    currentDistribution.forEach(row => {
      // Handle both number and string formats
      const ratingValue = typeof row.rating === 'number' ? row.rating : parseFloat(row.rating);
      const rating = ratingValue.toFixed(1);
      const percentage = (row.count / total) * 100;
      currentDistributionMap[rating] = {
        count: row.count,
        percentage: parseFloat(percentage.toFixed(2))
      };
    });
    
    // Calculate differences
    const differences = {};
    const allRatings = new Set([
      ...Object.keys(previousDistribution), 
      ...Object.keys(currentDistributionMap)
    ]);
    
    allRatings.forEach(rating => {
      const prev = previousDistribution[rating] || { count: 0, percentage: 0 };
      const curr = currentDistributionMap[rating] || { count: 0, percentage: 0 };
      
      differences[rating] = {
        countDiff: curr.count - prev.count,
        percentageDiff: parseFloat((curr.percentage - prev.percentage).toFixed(2)),
        previous: prev,
        current: curr
      };
    });
    
    // Generate report
    let report = "RATING DISTRIBUTION CHANGE ANALYSIS\n";
    report += "==========================================\n\n";
    
    report += "IMPACT OF OPERATIONAL FACTORS ON RATING DISTRIBUTION:\n\n";
    
    report += "SUMMARY:\n";
    const overallShift = calculateAverageRatingShift(previousDistribution, currentDistributionMap, total);
    report += `Average rating shift: ${overallShift > 0 ? '+' : ''}${overallShift.toFixed(2)} stars\n\n`;
    
    report += "RATING DISTRIBUTION COMPARISON:\n";
    report += "Rating | Previous % | Current % | Change    | Assessment\n";
    report += "--------------------------------------------------------\n";
    
    Object.keys(differences)
      .sort((a, b) => parseFloat(b) - parseFloat(a))
      .forEach(rating => {
        const diff = differences[rating];
        const prev = diff.previous.percentage.toFixed(2).padStart(5, ' ');
        const curr = diff.current.percentage.toFixed(2).padStart(5, ' ');
        const change = diff.percentageDiff.toFixed(2);
        const changeStr = (diff.percentageDiff > 0 ? '+' : '') + change;
        const assessment = getAssessment(diff.percentageDiff);
        
        report += `${rating.padStart(6, ' ')} | ${prev}%     | ${curr}%     | ${changeStr.padStart(9, ' ')}% | ${assessment}\n`;
      });
    
    report += "\nOPERATIONAL FACTORS IMPACT:\n";
    report += "The implementation of operational factors in the rating system has caused:\n";
    
    // Analyze high-end vs low-end shifts
    const highEndShift = 
      (currentDistributionMap['5.0']?.percentage || 0) - (previousDistribution['5.0']?.percentage || 0) +
      (currentDistributionMap['4.5']?.percentage || 0) - (previousDistribution['4.5']?.percentage || 0);
    
    const lowEndShift = 
      (currentDistributionMap['1.0']?.percentage || 0) - (previousDistribution['1.0']?.percentage || 0) +
      (currentDistributionMap['1.5']?.percentage || 0) - (previousDistribution['1.5']?.percentage || 0) +
      (currentDistributionMap['2.0']?.percentage || 0) - (previousDistribution['2.0']?.percentage || 0);
    
    if (highEndShift > 5) {
      report += "- A significant shift toward higher ratings, with more 4.5-5 star daycares\n";
      report += "  (This suggests that quality operational factors are prevalent and beneficial)\n";
    } else if (highEndShift > 0) {
      report += "- A moderate shift toward higher ratings\n";
    } else if (highEndShift < 0) {
      report += "- A reduction in the highest ratings, creating a more balanced distribution\n";
    }
    
    if (lowEndShift > 0) {
      report += "- A slight increase in lower ratings, likely due to operational penalties\n";
    } else if (lowEndShift < -1) {
      report += "- A reduction in the lowest ratings, suggesting operational factors are boosting some low-rated daycares\n";
    }
    
    // Analyze middle tier shifts
    const middleTierShift = 
      (currentDistributionMap['3.0']?.percentage || 0) - (previousDistribution['3.0']?.percentage || 0) +
      (currentDistributionMap['3.5']?.percentage || 0) - (previousDistribution['3.5']?.percentage || 0) +
      (currentDistributionMap['4.0']?.percentage || 0) - (previousDistribution['4.0']?.percentage || 0);
    
    if (Math.abs(middleTierShift) > 5) {
      if (middleTierShift > 0) {
        report += "- A significant strengthening of the middle tier (3-4 stars) ratings\n";
      } else {
        report += "- A significant reduction in middle tier (3-4 stars) ratings, with more polarization\n";
      }
    }
    
    // Specific operational factors
    report += "\nKEY OPERATIONAL FACTORS DETECTED:\n";
    
    // Get specific operational indicator counts
    const [qualityIndicators] = await pool.query(`
      SELECT quality_indicators
      FROM daycare_ratings
      WHERE quality_indicators IS NOT NULL AND quality_indicators != '[]'
      LIMIT 10000
    `);
    
    // Analyze sampled quality indicators
    const indicatorCounts = {};
    qualityIndicators.forEach(row => {
      try {
        const indicators = JSON.parse(row.quality_indicators);
        indicators.forEach(ind => {
          const name = ind.indicator;
          const operationalFactorKeywords = [
            'subsidies', 'morning care', 'evening', '24-hour', 'Saturday', 
            'Sunday', '7-day', 'infant care', 'wide age range', 'capacity',
            'permit', 'closed'
          ];
          
          const isOperationalFactor = operationalFactorKeywords.some(keyword => 
            name.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (isOperationalFactor) {
            if (!indicatorCounts[name]) {
              indicatorCounts[name] = { count: 0, totalImpact: 0 };
            }
            
            indicatorCounts[name].count++;
            
            // Parse the impact value
            const impactMatch = ind.impact.match(/([+-]?\d+\.\d+)/);
            if (impactMatch) {
              const impactValue = parseFloat(impactMatch[1]);
              indicatorCounts[name].totalImpact += impactValue;
            }
          }
        });
      } catch (e) {
        // Skip parsing errors
      }
    });
    
    // Report on the most influential operational factors
    const sortedIndicators = Object.entries(indicatorCounts)
      .sort((a, b) => b[1].totalImpact - a[1].totalImpact)
      .slice(0, 10);
    
    sortedIndicators.forEach(([name, info]) => {
      const avgImpact = info.totalImpact / info.count;
      const percentage = (info.count / qualityIndicators.length) * 100;
      report += `- ${name}: Present in ${percentage.toFixed(1)}% of daycares, avg impact: ${avgImpact.toFixed(2)} stars\n`;
    });
    
    // Save the report to a file
    const reportPath = path.join(__dirname, '../reports/rating_changes_report.txt');
    await fs.writeFile(reportPath, report);
    
    // Also print it to console
    console.log(report);
    console.log(`\nReport saved to: ${reportPath}`);
    
  } catch (err) {
    console.error('Error analyzing rating changes:', err);
  } finally {
    await pool.end();
    console.log('\nAnalysis completed.');
  }
}

// Calculate the average rating shift
function calculateAverageRatingShift(previous, current, total) {
  let previousWeightedSum = 0;
  let currentWeightedSum = 0;
  
  // Calculate weighted sums
  for (const rating of Object.keys(previous)) {
    previousWeightedSum += parseFloat(rating) * (previous[rating].percentage / 100);
  }
  
  for (const rating of Object.keys(current)) {
    currentWeightedSum += parseFloat(rating) * (current[rating].percentage / 100);
  }
  
  return currentWeightedSum - previousWeightedSum;
}

// Get an assessment based on the percentage difference
function getAssessment(percentageDiff) {
  if (percentageDiff > 10) return "Major increase";
  if (percentageDiff > 5) return "Significant increase";
  if (percentageDiff > 1) return "Moderate increase";
  if (percentageDiff > 0) return "Slight increase";
  if (percentageDiff === 0) return "No change";
  if (percentageDiff > -1) return "Slight decrease";
  if (percentageDiff > -5) return "Moderate decrease";
  if (percentageDiff > -10) return "Significant decrease";
  return "Major decrease";
}

// Run the script
if (require.main === module) {
  analyzeRatingChanges().catch(console.error);
}

module.exports = { analyzeRatingChanges };