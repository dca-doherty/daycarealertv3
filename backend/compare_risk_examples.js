/**
 * Compare Risk Level Examples
 * 
 * This script shows examples of violations where the risk level was changed,
 * to help understand the reclassification logic.
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

async function main() {
  console.log('=== Comparison of Risk Level Examples ===');
  
  // Create connection pool
  console.log('Connecting to database...');
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Get examples of each category/risk transition
    const commonChanges = [
      // Administrative downgrades
      { category: 'Administrative', from: 'High', to: 'Medium High' },
      
      // Paperwork downgrades
      { category: 'Paperwork', from: 'Medium High', to: 'Medium' },
      { category: 'Paperwork', from: 'Medium', to: 'Medium Low' },
      { category: 'Paperwork', from: 'High', to: 'Medium' },
      
      // Safety upgrades
      { category: 'Safety', from: 'Medium High', to: 'High' },
      { category: 'Safety', from: 'Medium', to: 'High' },
      
      // Health upgrades
      { category: 'Health', from: 'Medium High', to: 'High' },
      { category: 'Health', from: 'Medium', to: 'Medium High' },
      
      // Child Well-being upgrades
      { category: 'Child Well-being', from: 'Medium High', to: 'High' },
      { category: 'Child Well-being', from: 'Medium', to: 'High' }
    ];
    
    let report = "RISK LEVEL RECLASSIFICATION EXAMPLES\n";
    report += "=====================================\n\n";
    
    for (const change of commonChanges) {
      console.log(`Finding examples of ${change.category} violations changed from ${change.from} to ${change.to}...`);
      
      const [examples] = await pool.query(`
        SELECT 
          NON_COMPLIANCE_ID,
          STANDARD_NUMBER_DESCRIPTION,
          STANDARD_RISK_LEVEL,
          REVISED_RISK_LEVEL,
          CATEGORY,
          NARRATIVE
        FROM 
          revised_non_compliance
        WHERE 
          CATEGORY = ? AND
          STANDARD_RISK_LEVEL = ? AND
          REVISED_RISK_LEVEL = ?
        LIMIT 3
      `, [change.category, change.from, change.to]);
      
      report += `\n${change.category}: ${change.from} → ${change.to}\n`;
      report += "".padEnd(50, "-") + "\n";
      
      if (examples.length === 0) {
        report += "No examples found\n";
        continue;
      }
      
      for (const example of examples) {
        report += `Standard: ${example.STANDARD_NUMBER_DESCRIPTION || 'Not specified'}\n`;
        
        if (example.NARRATIVE) {
          // Truncate narrative if too long
          const narrative = example.NARRATIVE.length > 200 
            ? example.NARRATIVE.substring(0, 200) + "..." 
            : example.NARRATIVE;
          report += `Description: ${narrative}\n`;
        }
        
        report += `Original Risk: ${example.STANDARD_RISK_LEVEL} → Revised Risk: ${example.REVISED_RISK_LEVEL}\n`;
        report += "".padEnd(50, "-") + "\n";
      }
    }
    
    // Find examples of violations that didn't change for comparison
    report += "\nEXAMPLES OF UNCHANGED RISK LEVELS\n";
    report += "".padEnd(50, "-") + "\n";
    
    const categories = ['Safety', 'Paperwork', 'Administrative', 'Health'];
    
    for (const category of categories) {
      const [unchanged] = await pool.query(`
        SELECT 
          STANDARD_NUMBER_DESCRIPTION,
          STANDARD_RISK_LEVEL,
          NARRATIVE
        FROM 
          revised_non_compliance
        WHERE 
          CATEGORY = ? AND
          STANDARD_RISK_LEVEL = REVISED_RISK_LEVEL
        ORDER BY RAND()
        LIMIT 2
      `, [category]);
      
      report += `\n${category} - Unchanged Risk Levels:\n`;
      report += "".padEnd(50, "-") + "\n";
      
      for (const example of unchanged) {
        report += `Standard: ${example.STANDARD_NUMBER_DESCRIPTION || 'Not specified'}\n`;
        report += `Risk Level: ${example.STANDARD_RISK_LEVEL} (unchanged)\n`;
        
        if (example.NARRATIVE) {
          // Truncate narrative if too long
          const narrative = example.NARRATIVE.length > 200 
            ? example.NARRATIVE.substring(0, 200) + "..." 
            : example.NARRATIVE;
          report += `Description: ${narrative}\n`;
        }
        
        report += "".padEnd(50, "-") + "\n";
      }
    }
    
    // Calculate overall changes
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN STANDARD_RISK_LEVEL != REVISED_RISK_LEVEL THEN 1 ELSE 0 END) as changed,
        SUM(CASE WHEN STANDARD_RISK_LEVEL = 'High' AND REVISED_RISK_LEVEL = 'High' THEN 1 ELSE 0 END) as high_unchanged,
        SUM(CASE WHEN STANDARD_RISK_LEVEL = 'High' AND REVISED_RISK_LEVEL != 'High' THEN 1 ELSE 0 END) as high_downgraded,
        SUM(CASE WHEN STANDARD_RISK_LEVEL != 'High' AND REVISED_RISK_LEVEL = 'High' THEN 1 ELSE 0 END) as upgraded_to_high
      FROM revised_non_compliance
    `);
    
    report += "\nSUMMARY STATISTICS\n";
    report += "".padEnd(50, "-") + "\n";
    report += `Total violations: ${stats[0].total}\n`;
    report += `Total changed: ${stats[0].changed} (${(stats[0].changed / stats[0].total * 100).toFixed(2)}%)\n`;
    report += `High risk unchanged: ${stats[0].high_unchanged}\n`;
    report += `High risk downgraded: ${stats[0].high_downgraded}\n`;
    report += `Upgraded to High risk: ${stats[0].upgraded_to_high}\n`;
    
    // Write the report to a file
    const reportPath = path.join(__dirname, 'reports/risk_level_examples.txt');
    await fs.mkdir(path.dirname(reportPath), { recursive: true }).catch(() => {});
    await fs.writeFile(reportPath, report);
    
    console.log(`Report saved to: ${reportPath}`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);