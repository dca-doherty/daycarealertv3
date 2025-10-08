/**
 * Check Balanced Ratings
 * 
 * This script checks the distribution of the balanced ratings and 
 * compares it with the original ratings.
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

async function checkBalancedRatings() {
  console.log('Checking balanced ratings distribution...');
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // Check if balanced ratings table exists
    const [tables] = await pool.query(`
      SHOW TABLES LIKE 'daycare_ratings_balanced'
    `);
    
    if (tables.length === 0) {
      console.error('Error: daycare_ratings_balanced table does not exist');
      return;
    }
    
    // Get balanced ratings distribution
    const [balancedDistribution] = await pool.query(`
      SELECT 
        ROUND(overall_rating * 2) / 2 as rating, 
        COUNT(*) as count
      FROM 
        daycare_ratings_balanced
      GROUP BY 
        ROUND(overall_rating * 2) / 2
      ORDER BY 
        rating DESC
    `);
    
    // Get original ratings distribution
    const [originalDistribution] = await pool.query(`
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
    
    // Get total counts
    const [balancedTotal] = await pool.query(`
      SELECT COUNT(*) as total FROM daycare_ratings_balanced
    `);
    
    const [originalTotal] = await pool.query(`
      SELECT COUNT(*) as total FROM daycare_ratings
    `);
    
    const balancedTotalCount = balancedTotal[0].total;
    const originalTotalCount = originalTotal[0].total;
    
    // Format distributions for comparison
    const balancedMap = {};
    balancedDistribution.forEach(row => {
      balancedMap[row.rating.toString()] = {
        count: row.count,
        percentage: (row.count / balancedTotalCount) * 100
      };
    });
    
    const originalMap = {};
    originalDistribution.forEach(row => {
      originalMap[row.rating.toString()] = {
        count: row.count,
        percentage: (row.count / originalTotalCount) * 100
      };
    });
    
    // Generate report
    console.log('\n=== BALANCED RATINGS DISTRIBUTION REPORT ===\n');
    console.log(`Total daycares in original ratings: ${originalTotalCount}`);
    console.log(`Total daycares in balanced ratings: ${balancedTotalCount}\n`);
    
    console.log('RATING DISTRIBUTION COMPARISON:');
    console.log('Rating | Original % | Balanced % | Change');
    console.log('--------------------------------------------');
    
    // Get all unique ratings
    const allRatings = new Set([
      ...Object.keys(balancedMap),
      ...Object.keys(originalMap)
    ]);
    
    Array.from(allRatings)
      .sort((a, b) => parseFloat(b) - parseFloat(a))
      .forEach(rating => {
        const originalPct = originalMap[rating]?.percentage || 0;
        const balancedPct = balancedMap[rating]?.percentage || 0;
        const change = balancedPct - originalPct;
        
        console.log(
          `${rating.padEnd(6)} | ${originalPct.toFixed(2).padEnd(10)}% | ${balancedPct.toFixed(2).padEnd(10)}% | ${change > 0 ? '+' : ''}${change.toFixed(2)}%`
        );
      });
    
    // Calculate average ratings
    let originalWeightedSum = 0;
    let balancedWeightedSum = 0;
    
    Object.entries(originalMap).forEach(([rating, data]) => {
      originalWeightedSum += parseFloat(rating) * data.count;
    });
    
    Object.entries(balancedMap).forEach(([rating, data]) => {
      balancedWeightedSum += parseFloat(rating) * data.count;
    });
    
    const originalAvg = originalWeightedSum / originalTotalCount;
    const balancedAvg = balancedWeightedSum / balancedTotalCount;
    
    console.log(`\nAverage original rating: ${originalAvg.toFixed(2)} stars`);
    console.log(`Average balanced rating: ${balancedAvg.toFixed(2)} stars`);
    console.log(`Change: ${balancedAvg > originalAvg ? '+' : ''}${(balancedAvg - originalAvg).toFixed(2)} stars\n`);
    
    // Create formal report file
    const reportPath = path.join(__dirname, '../reports/balanced_ratings_comparison.txt');
    
    let report = "BALANCED RATINGS DISTRIBUTION REPORT\n";
    report += "=====================================\n\n";
    
    report += `Total daycares in original ratings: ${originalTotalCount}\n`;
    report += `Total daycares in balanced ratings: ${balancedTotalCount}\n\n`;
    
    report += `Average original rating: ${originalAvg.toFixed(2)} stars\n`;
    report += `Average balanced rating: ${balancedAvg.toFixed(2)} stars\n`;
    report += `Overall change: ${balancedAvg > originalAvg ? '+' : ''}${(balancedAvg - originalAvg).toFixed(2)} stars\n\n`;
    
    report += "RATING DISTRIBUTION COMPARISON:\n";
    report += "Rating | Original %  | Balanced %  | Change\n";
    report += "--------------------------------------------\n";
    
    Array.from(allRatings)
      .sort((a, b) => parseFloat(b) - parseFloat(a))
      .forEach(rating => {
        const originalPct = originalMap[rating]?.percentage || 0;
        const balancedPct = balancedMap[rating]?.percentage || 0;
        const change = balancedPct - originalPct;
        
        report += `${rating.padEnd(6)} | ${originalPct.toFixed(2).padEnd(11)}% | ${balancedPct.toFixed(2).padEnd(11)}% | ${change > 0 ? '+' : ''}${change.toFixed(2)}%\n`;
      });
    
    report += "\nANALYSIS OF CHANGES:\n";
    const highEndChange = 
      (balancedMap['5']?.percentage || 0) - (originalMap['5']?.percentage || 0) +
      (balancedMap['4.5']?.percentage || 0) - (originalMap['4.5']?.percentage || 0);
    
    const middleTierChange = 
      (balancedMap['4']?.percentage || 0) - (originalMap['4']?.percentage || 0) +
      (balancedMap['3.5']?.percentage || 0) - (originalMap['3.5']?.percentage || 0) +
      (balancedMap['3']?.percentage || 0) - (originalMap['3']?.percentage || 0);
    
    const lowEndChange = 
      (balancedMap['2.5']?.percentage || 0) - (originalMap['2.5']?.percentage || 0) +
      (balancedMap['2']?.percentage || 0) - (originalMap['2']?.percentage || 0) +
      (balancedMap['1.5']?.percentage || 0) - (originalMap['1.5']?.percentage || 0) +
      (balancedMap['1']?.percentage || 0) - (originalMap['1']?.percentage || 0);
    
    report += `High-end ratings (4.5-5 stars): ${highEndChange > 0 ? '+' : ''}${highEndChange.toFixed(2)}%\n`;
    report += `Middle-tier ratings (3-4 stars): ${middleTierChange > 0 ? '+' : ''}${middleTierChange.toFixed(2)}%\n`;
    report += `Low-end ratings (1-2.5 stars): ${lowEndChange > 0 ? '+' : ''}${lowEndChange.toFixed(2)}%\n\n`;
    
    report += "RECOMMENDATIONS:\n";
    
    if (highEndChange > 10) {
      report += "- Consider further reducing weights for operational factors to achieve better distribution\n";
    } else if (highEndChange < -10) {
      report += "- May need to increase some weights slightly to prevent excessive downgrading\n";
    } else {
      report += "- The balanced adjustment has created a better distribution\n";
    }
    
    if (Math.abs(balancedAvg - originalAvg) > 0.5) {
      report += "- The overall average rating changed significantly; consider fine-tuning adjustments\n";
    } else {
      report += "- The average rating remains stable, indicating balanced adjustments\n";
    }
    
    // Ensure directory exists
    const reportsDir = path.dirname(reportPath);
    await fs.mkdir(reportsDir, { recursive: true }).catch(() => {});
    
    await fs.writeFile(reportPath, report);
    console.log(`Report saved to: ${reportPath}`);
    
  } catch (err) {
    console.error('Error checking balanced ratings:', err);
  } finally {
    await pool.end();
    console.log('\nCheck complete.');
  }
}

// Run the script
if (require.main === module) {
  checkBalancedRatings().catch(console.error);
}

module.exports = { checkBalancedRatings };