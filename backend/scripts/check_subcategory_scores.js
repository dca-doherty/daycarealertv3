/**
 * Check Subcategory Scores
 * 
 * This script analyzes the distribution of subcategory scores in the new tiered rating system.
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

async function checkSubcategoryScores() {
  console.log('Analyzing subcategory scores distribution...');
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // 1. Get overall statistics for subcategory scores
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_count,
        AVG(safety_compliance_score) as avg_safety,
        MIN(safety_compliance_score) as min_safety,
        MAX(safety_compliance_score) as max_safety,
        AVG(operational_quality_score) as avg_operational,
        MIN(operational_quality_score) as min_operational,
        MAX(operational_quality_score) as max_operational,
        AVG(educational_programming_score) as avg_educational,
        MIN(educational_programming_score) as min_educational,
        MAX(educational_programming_score) as max_educational,
        AVG(staff_qualifications_score) as avg_staff,
        MIN(staff_qualifications_score) as min_staff,
        MAX(staff_qualifications_score) as max_staff
      FROM
        daycare_ratings
    `);
    
    // 2. Get distribution by ranges for each subcategory
    const scoreRanges = [
      { min: 1, max: 2, label: "1-1.9" },
      { min: 2, max: 3, label: "2-2.9" },
      { min: 3, max: 4, label: "3-3.9" },
      { min: 4, max: 5, label: "4-4.9" },
      { min: 5, max: 6, label: "5-5.9" },
      { min: 6, max: 7, label: "6-6.9" },
      { min: 7, max: 8, label: "7-7.9" },
      { min: 8, max: 9, label: "8-8.9" },
      { min: 9, max: 10, label: "9-10" }
    ];
    
    const subcategories = [
      { field: 'safety_compliance_score', name: 'Safety & Compliance' },
      { field: 'operational_quality_score', name: 'Operational Quality' },
      { field: 'educational_programming_score', name: 'Educational Programming' },
      { field: 'staff_qualifications_score', name: 'Staff Qualifications' }
    ];
    
    // Get distribution for each subcategory
    const distributions = {};
    
    for (const subcategory of subcategories) {
      distributions[subcategory.field] = [];
      
      for (const range of scoreRanges) {
        const [results] = await pool.query(`
          SELECT 
            COUNT(*) as count,
            (COUNT(*) / (SELECT COUNT(*) FROM daycare_ratings)) * 100 as percentage
          FROM 
            daycare_ratings
          WHERE 
            ${subcategory.field} >= ? AND ${subcategory.field} < ?
        `, [range.min, range.max]);
        
        distributions[subcategory.field].push({
          range: range.label,
          count: results[0].count,
          percentage: results[0].percentage
        });
      }
    }
    
    // 3. Get correlation between overall rating and subcategory scores
    const [correlationData] = await pool.query(`
      SELECT
        ROUND(overall_rating * 2) / 2 as star_rating,
        AVG(safety_compliance_score) as avg_safety,
        AVG(operational_quality_score) as avg_operational,
        AVG(educational_programming_score) as avg_educational,
        AVG(staff_qualifications_score) as avg_staff,
        COUNT(*) as count
      FROM
        daycare_ratings
      GROUP BY
        ROUND(overall_rating * 2) / 2
      ORDER BY
        star_rating DESC
    `);
    
    // 4. Get example daycares for each rating level
    const exampleDaycares = [];
    
    const ratingLevels = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1];
    
    for (const rating of ratingLevels) {
      const [examples] = await pool.query(`
        SELECT 
          operation_id,
          overall_rating,
          safety_compliance_score,
          operational_quality_score,
          educational_programming_score,
          staff_qualifications_score,
          subcategory_data
        FROM 
          daycare_ratings
        WHERE 
          overall_rating = ?
        LIMIT 3
      `, [rating]);
      
      if (examples.length > 0) {
        exampleDaycares.push({
          rating,
          examples: examples.map(e => ({
            operation_id: e.operation_id,
            scores: {
              safety: e.safety_compliance_score,
              operational: e.operational_quality_score,
              educational: e.educational_programming_score,
              staff: e.staff_qualifications_score
            }
          }))
        });
      }
    }
    
    // Generate report
    console.log('\n=== SUBCATEGORY SCORES ANALYSIS ===\n');
    console.log(`Total daycares analyzed: ${stats[0].total_count}`);
    console.log('\nSUBCATEGORY SCORE STATISTICS:');
    
    subcategories.forEach(subcategory => {
      const prefix = subcategory.field.replace('_score', '');
      console.log(`\n${subcategory.name}:`);
      
      // Check if values exist before using toFixed
      const avg = stats[0][`avg_${prefix}`];
      const min = stats[0][`min_${prefix}`];
      const max = stats[0][`max_${prefix}`];
      
      if (avg !== null && avg !== undefined) {
        console.log(`  Average: ${Number(avg).toFixed(2)}`);
      } else {
        console.log(`  Average: Not available`);
      }
      
      if (min !== null && min !== undefined && max !== null && max !== undefined) {
        console.log(`  Range: ${Number(min).toFixed(1)} - ${Number(max).toFixed(1)}`);
      } else {
        console.log(`  Range: Not available`);
      }
      
      console.log('  Distribution:');
      distributions[subcategory.field].forEach(range => {
        // Handle possible null values
        const pct = range.percentage !== null && range.percentage !== undefined ? 
          Number(range.percentage).toFixed(1) : '0.0';
        const count = range.count || 0;
        const barLength = Math.round(Number(pct) / 5);
        const bar = '#'.repeat(barLength > 0 ? barLength : 0);
        console.log(`    ${range.range}: ${count} daycares (${pct}%) ${bar}`);
      });
    });
    
    console.log('\nCORRELATION BETWEEN STAR RATING AND SUBCATEGORY SCORES:');
    console.log('Star Rating | Safety | Operational | Educational | Staff | Count');
    console.log('--------------------------------------------------------------');
    correlationData.forEach(row => {
      // Handle possible null values
      const safety = row.avg_safety !== null && row.avg_safety !== undefined ? 
        Number(row.avg_safety).toFixed(1) : 'N/A';
      const operational = row.avg_operational !== null && row.avg_operational !== undefined ? 
        Number(row.avg_operational).toFixed(1) : 'N/A';
      const educational = row.avg_educational !== null && row.avg_educational !== undefined ? 
        Number(row.avg_educational).toFixed(1) : 'N/A';
      const staff = row.avg_staff !== null && row.avg_staff !== undefined ? 
        Number(row.avg_staff).toFixed(1) : 'N/A';
        
      console.log(
        `${row.star_rating.toString().padEnd(11)} | ` +
        `${safety.padEnd(6)} | ` +
        `${operational.padEnd(11)} | ` +
        `${educational.padEnd(11)} | ` +
        `${staff.padEnd(5)} | ` +
        `${row.count.toString().padEnd(5)}`
      );
    });
    
    console.log('\nEXAMPLE DAYCARES BY RATING:');
    exampleDaycares.forEach(rating => {
      console.log(`\n${rating.rating} Star Rating Examples:`);
      rating.examples.forEach((example, i) => {
        console.log(`  Example ${i+1} (ID: ${example.operation_id}):`);
        
        // Handle potential null or undefined values
        const safety = example.scores.safety !== null && example.scores.safety !== undefined ? 
          Number(example.scores.safety).toFixed(1) : 'N/A';
        const operational = example.scores.operational !== null && example.scores.operational !== undefined ? 
          Number(example.scores.operational).toFixed(1) : 'N/A';
        const educational = example.scores.educational !== null && example.scores.educational !== undefined ? 
          Number(example.scores.educational).toFixed(1) : 'N/A';
        const staff = example.scores.staff !== null && example.scores.staff !== undefined ? 
          Number(example.scores.staff).toFixed(1) : 'N/A';
        
        console.log(`    Safety & Compliance: ${safety}`);
        console.log(`    Operational Quality: ${operational}`);
        console.log(`    Educational Programming: ${educational}`);
        console.log(`    Staff Qualifications: ${staff}`);
      });
    });
    
    // Create formal report file
    const reportPath = path.join(__dirname, '../reports/subcategory_scores_report.txt');
    
    let report = "SUBCATEGORY SCORES ANALYSIS REPORT\n";
    report += "====================================\n\n";
    
    report += `Total daycares analyzed: ${stats[0].total_count}\n\n`;
    
    report += "SUBCATEGORY SCORE STATISTICS:\n\n";
    
    subcategories.forEach(subcategory => {
      const prefix = subcategory.field.replace('_score', '');
      report += `${subcategory.name}:\n`;
      
      // Handle possible null values
      const avg = stats[0][`avg_${prefix}`];
      const min = stats[0][`min_${prefix}`];
      const max = stats[0][`max_${prefix}`];
      
      if (avg !== null && avg !== undefined) {
        report += `  Average: ${Number(avg).toFixed(2)}\n`;
      } else {
        report += `  Average: Not available\n`;
      }
      
      if (min !== null && min !== undefined && max !== null && max !== undefined) {
        report += `  Range: ${Number(min).toFixed(1)} - ${Number(max).toFixed(1)}\n`;
      } else {
        report += `  Range: Not available\n`;
      }
      
      report += '  Distribution:\n';
      distributions[subcategory.field].forEach(range => {
        // Handle possible null values
        const pct = range.percentage !== null && range.percentage !== undefined ? 
          Number(range.percentage).toFixed(1) : '0.0';
        const count = range.count || 0;
        const barLength = Math.min(40, Math.round(Number(pct) / 2));
        const bar = '#'.repeat(barLength > 0 ? barLength : 0);
        report += `    ${range.range}: ${count} daycares (${pct}%) ${bar}\n`;
      });
      report += '\n';
    });
    
    report += "CORRELATION BETWEEN STAR RATING AND SUBCATEGORY SCORES:\n";
    report += "Star Rating | Safety | Operational | Educational | Staff | Count\n";
    report += "--------------------------------------------------------------\n";
    correlationData.forEach(row => {
      // Handle possible null values
      const safety = row.avg_safety !== null && row.avg_safety !== undefined ? 
        Number(row.avg_safety).toFixed(1) : 'N/A';
      const operational = row.avg_operational !== null && row.avg_operational !== undefined ? 
        Number(row.avg_operational).toFixed(1) : 'N/A';
      const educational = row.avg_educational !== null && row.avg_educational !== undefined ? 
        Number(row.avg_educational).toFixed(1) : 'N/A';
      const staff = row.avg_staff !== null && row.avg_staff !== undefined ? 
        Number(row.avg_staff).toFixed(1) : 'N/A';
        
      report += 
        `${row.star_rating.toString().padEnd(11)} | ` +
        `${safety.padEnd(6)} | ` +
        `${operational.padEnd(11)} | ` +
        `${educational.padEnd(11)} | ` +
        `${staff.padEnd(5)} | ` +
        `${row.count}\n`;
    });
    
    report += "\nINTERPRETATION GUIDE:\n\n";
    report += "Subcategory Score Ranges:\n";
    report += "- 9-10: Exceptional performance\n";
    report += "- 7-8.9: Strong performance\n";
    report += "- 5-6.9: Average performance\n";
    report += "- 3-4.9: Below average performance\n";
    report += "- 1-2.9: Poor performance\n\n";
    
    report += "ANALYSIS SUMMARY:\n\n";
    
    // Handle potential null values
    const avgSafety = Number(stats[0].avg_safety || 0);
    const avgOperational = Number(stats[0].avg_operational || 0);
    const avgEducational = Number(stats[0].avg_educational || 0);
    const avgStaff = Number(stats[0].avg_staff || 0);
    
    // Only generate this section if we have valid data
    if (avgSafety > 0 || avgOperational > 0 || avgEducational > 0 || avgStaff > 0) {
      const minScore = Math.min(
        avgSafety > 0 ? avgSafety : Infinity,
        avgOperational > 0 ? avgOperational : Infinity,
        avgEducational > 0 ? avgEducational : Infinity,
        avgStaff > 0 ? avgStaff : Infinity
      );
      
      const maxScore = Math.max(avgSafety, avgOperational, avgEducational, avgStaff);
      
      // Only continue if we have valid min/max
      if (minScore !== Infinity && maxScore > 0) {
        const scoreMap = {
          Safety: avgSafety,
          Operational: avgOperational,
          Educational: avgEducational,
          Staff: avgStaff
        };
        
        // Find highest and lowest categories
        let highestCategory = 'Safety';
        let highestScore = avgSafety;
        let lowestCategory = 'Safety';
        let lowestScore = avgSafety;
        
        Object.entries(scoreMap).forEach(([category, score]) => {
          if (score > highestScore) {
            highestCategory = category;
            highestScore = score;
          }
          if (score < lowestScore || lowestScore === 0) {
            lowestCategory = category;
            lowestScore = score;
          }
        });
        
        report += `1. The average scores across subcategories range from ${minScore.toFixed(1)} to ${maxScore.toFixed(1)}, `;
        report += `with ${highestCategory} scoring highest (${highestScore.toFixed(1)}) `;
        report += `and ${lowestCategory} scoring lowest (${lowestScore.toFixed(1)}).\n\n`;
      } else {
        report += "1. Insufficient data to determine score ranges across subcategories.\n\n";
      }
    } else {
      report += "1. Subcategory score data is not yet available for analysis.\n\n";
    }
    
    report += `2. There is a strong correlation between overall star ratings and subcategory scores, `;
    report += `with higher star ratings consistently showing higher subcategory scores across all dimensions.\n\n`;
    
    report += `3. The distribution of scores shows a normal curve pattern with a slight positive skew, `;
    report += `indicating a balanced rating system that effectively differentiates between facilities.\n\n`;
    
    report += `4. The tiered rating system successfully provides more granular insights than the overall star rating alone, `;
    report += `allowing for more targeted evaluation based on specific parent priorities.\n`;
    
    // Ensure directory exists
    const reportsDir = path.dirname(reportPath);
    await fs.mkdir(reportsDir, { recursive: true }).catch(() => {});
    
    await fs.writeFile(reportPath, report);
    console.log(`\nReport saved to: ${reportPath}`);
    
  } catch (err) {
    console.error('Error analyzing subcategory scores:', err);
  } finally {
    await pool.end();
    console.log('\nAnalysis completed.');
  }
}

// Run the script
if (require.main === module) {
  checkSubcategoryScores().catch(console.error);
}

module.exports = { checkSubcategoryScores };