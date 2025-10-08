/**
 * Analyze Standard Descriptions in Non-Compliance Table
 * 
 * This script analyzes the STANDARD_NUMBER_DESCRIPTION field in the non_compliance table
 * to identify common keywords and patterns.
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

// Main function
async function analyzeStandards() {
  console.log('=== Analyzing Standard Descriptions ===');
  
  // Create connection pool
  console.log('Connecting to database...');
  const pool = mysql.createPool(dbConfig);
  
  try {
    // 1. Risk level distribution
    console.log('\nAnalyzing risk level distribution...');
    const [riskLevels] = await pool.query(`
      SELECT STANDARD_RISK_LEVEL, COUNT(*) as count 
      FROM non_compliance 
      GROUP BY STANDARD_RISK_LEVEL 
      ORDER BY count DESC
    `);
    
    console.log('Risk level distribution:');
    riskLevels.forEach(level => {
      console.log(`${level.STANDARD_RISK_LEVEL || 'NULL'}: ${level.count}`);
    });
    
    // 2. Extract keywords from standard descriptions
    console.log('\nExtracting keywords from standard descriptions...');
    
    // Get most common words in standard descriptions
    const [wordCounts] = await pool.query(`
      SELECT 
        SUBSTRING_INDEX(SUBSTRING_INDEX(STANDARD_NUMBER_DESCRIPTION, ' ', n.n), ' ', -1) as word,
        COUNT(*) as count
      FROM 
        non_compliance
        JOIN (
          SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
          SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION
          SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
        ) n ON LENGTH(STANDARD_NUMBER_DESCRIPTION) - LENGTH(REPLACE(STANDARD_NUMBER_DESCRIPTION, ' ', '')) >= n.n - 1
      WHERE 
        STANDARD_NUMBER_DESCRIPTION IS NOT NULL
        AND LENGTH(SUBSTRING_INDEX(SUBSTRING_INDEX(STANDARD_NUMBER_DESCRIPTION, ' ', n.n), ' ', -1)) > 3
        AND SUBSTRING_INDEX(SUBSTRING_INDEX(STANDARD_NUMBER_DESCRIPTION, ' ', n.n), ' ', -1) NOT REGEXP '^[0-9]+$'
        AND SUBSTRING_INDEX(SUBSTRING_INDEX(STANDARD_NUMBER_DESCRIPTION, ' ', n.n), ' ', -1) NOT IN (
          'with', 'must', 'that', 'have', 'from', 'this', 'your', 'each', 'when', 'were',
          'they', 'been', 'than', 'which', 'their', 'also', 'into', 'other', 'some', 'what'
        )
      GROUP BY 
        word
      ORDER BY 
        count DESC
      LIMIT 100
    `);
    
    console.log('\nTop 50 words in standard descriptions:');
    wordCounts.slice(0, 50).forEach((row, i) => {
      console.log(`${i+1}. ${row.word} (${row.count})`);
    });
    
    // 3. Sample standards by risk level
    console.log('\nSampling standards by risk level...');
    
    let allSamples = [];
    
    for (const level of riskLevels) {
      const riskLevel = level.STANDARD_RISK_LEVEL;
      if (!riskLevel) continue;
      
      const [samples] = await pool.query(`
        SELECT 
          STANDARD_NUMBER_DESCRIPTION, STANDARD_RISK_LEVEL,
          COUNT(*) as frequency
        FROM non_compliance
        WHERE STANDARD_RISK_LEVEL = ?
        GROUP BY STANDARD_NUMBER_DESCRIPTION, STANDARD_RISK_LEVEL
        ORDER BY frequency DESC
        LIMIT 5
      `, [riskLevel]);
      
      allSamples.push({ riskLevel, samples });
    }
    
    console.log('\nMost common standards by risk level:');
    for (const { riskLevel, samples } of allSamples) {
      console.log(`\n--- ${riskLevel} ---`);
      samples.forEach((sample, i) => {
        console.log(`[${i+1}] (${sample.frequency} occurrences)`);
        console.log(sample.STANDARD_NUMBER_DESCRIPTION);
      });
    }
    
    // 4. Find standards that might be misclassified
    console.log('\nPotential keyword categories (proposed classification):');
    
    // Define initial category lists
    const categories = {
      'Safety': ['safety', 'hazard', 'emergency', 'fire', 'supervision', 'injury', 'dangerous'],
      'Health': ['health', 'medical', 'medication', 'illness', 'disease', 'sanitary', 'immunization'],
      'Paperwork': ['record', 'document', 'form', 'signature', 'signed', 'filed', 'report'],
      'Facility': ['building', 'equipment', 'playground', 'fence', 'repair', 'maintenance'],
      'Training': ['training', 'orientation', 'education', 'certificate', 'course', 'qualification'],
      'Child Care': ['child', 'infant', 'toddler', 'activity', 'play', 'care', 'development']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      console.log(`\n--- ${category} ---`);
      
      // Find standards containing these keywords
      const categoryKeywords = keywords.map(k => `%${k}%`);
      const placeholders = categoryKeywords.map(() => 'STANDARD_NUMBER_DESCRIPTION LIKE ?').join(' OR ');
      
      const [categoryStandards] = await pool.query(`
        SELECT 
          STANDARD_NUMBER_DESCRIPTION, STANDARD_RISK_LEVEL,
          COUNT(*) as frequency
        FROM non_compliance
        WHERE ${placeholders}
        GROUP BY STANDARD_NUMBER_DESCRIPTION, STANDARD_RISK_LEVEL
        ORDER BY frequency DESC
        LIMIT 5
      `, categoryKeywords);
      
      if (categoryStandards.length > 0) {
        categoryStandards.forEach((std, i) => {
          console.log(`[${i+1}] ${std.STANDARD_RISK_LEVEL} (${std.frequency} occurrences)`);
          console.log(std.STANDARD_NUMBER_DESCRIPTION);
        });
      } else {
        console.log('No matching standards found');
      }
    }
    
    // 5. Generate a report
    const reportPath = path.join(__dirname, '../reports/standard_analysis_report.txt');
    
    // Ensure directory exists
    const reportsDir = path.dirname(reportPath);
    await fs.mkdir(reportsDir, { recursive: true }).catch(() => {});
    
    let report = "STANDARD DESCRIPTION ANALYSIS REPORT\n";
    report += "=".repeat(50) + "\n\n";
    
    report += "RISK LEVEL DISTRIBUTION:\n";
    riskLevels.forEach(level => {
      report += `${level.STANDARD_RISK_LEVEL || 'NULL'}: ${level.count}\n`;
    });
    report += "\n";
    
    report += "TOP 100 WORDS IN STANDARD DESCRIPTIONS:\n";
    wordCounts.forEach((row, i) => {
      report += `${i+1}. ${row.word} (${row.count})\n`;
    });
    report += "\n";
    
    report += "MOST COMMON STANDARDS BY RISK LEVEL:\n";
    for (const { riskLevel, samples } of allSamples) {
      report += `\n--- ${riskLevel} ---\n`;
      samples.forEach((sample, i) => {
        report += `[${i+1}] (${sample.frequency} occurrences)\n`;
        report += `${sample.STANDARD_NUMBER_DESCRIPTION}\n`;
      });
    }
    report += "\n";
    
    report += "PROPOSED CATEGORY KEYWORDS:\n";
    for (const [category, keywords] of Object.entries(categories)) {
      report += `\n${category}: ${keywords.join(', ')}\n`;
    }
    
    await fs.writeFile(reportPath, report);
    console.log(`\nFull analysis report saved to: ${reportPath}`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
analyzeStandards().catch(console.error);