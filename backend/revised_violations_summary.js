/**
 * Revised Violations Summary
 * 
 * This script generates a comprehensive summary of the revised_non_compliance table,
 * showing how risk levels were reclassified and the impact of the changes.
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
  console.log('Generating Revised Violations Summary...');
  
  // Create connection pool
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // Gather key statistics
    const stats = {};
    
    // 1. Basic counts
    const [basicCounts] = await pool.query(`
      SELECT
        COUNT(*) as total_violations,
        COUNT(DISTINCT OPERATION_ID) as total_daycares,
        SUM(CASE WHEN STANDARD_RISK_LEVEL != REVISED_RISK_LEVEL THEN 1 ELSE 0 END) as changed_violations
      FROM revised_non_compliance
    `);
    
    stats.totalViolations = basicCounts[0].total_violations;
    stats.totalDaycares = basicCounts[0].total_daycares;
    stats.changedViolations = basicCounts[0].changed_violations;
    stats.changePercentage = (stats.changedViolations / stats.totalViolations * 100).toFixed(2);
    
    // 2. Risk level distributions
    const [riskDistributions] = await pool.query(`
      SELECT
        'Original' as type,
        STANDARD_RISK_LEVEL as risk_level,
        COUNT(*) as count
      FROM revised_non_compliance
      GROUP BY STANDARD_RISK_LEVEL
      UNION ALL
      SELECT
        'Revised' as type,
        REVISED_RISK_LEVEL as risk_level,
        COUNT(*) as count
      FROM revised_non_compliance
      GROUP BY REVISED_RISK_LEVEL
      ORDER BY type, CASE 
        WHEN risk_level = 'High' THEN 1
        WHEN risk_level = 'Medium High' THEN 2
        WHEN risk_level = 'Medium' THEN 3
        WHEN risk_level = 'Medium Low' THEN 4
        WHEN risk_level = 'Low' THEN 5
        ELSE 6
      END
    `);
    
    stats.originalRisk = {};
    stats.revisedRisk = {};
    
    riskDistributions.forEach(row => {
      if (row.type === 'Original') {
        stats.originalRisk[row.risk_level || 'Unknown'] = row.count;
      } else {
        stats.revisedRisk[row.risk_level || 'Unknown'] = row.count;
      }
    });
    
    // 3. Category distribution
    const [categoryDistribution] = await pool.query(`
      SELECT
        CATEGORY,
        COUNT(*) as total,
        SUM(CASE WHEN STANDARD_RISK_LEVEL != REVISED_RISK_LEVEL THEN 1 ELSE 0 END) as changed
      FROM revised_non_compliance
      GROUP BY CATEGORY
      ORDER BY total DESC
    `);
    
    stats.categories = categoryDistribution;
    
    // 4. Risk level changes
    const [riskChanges] = await pool.query(`
      SELECT
        STANDARD_RISK_LEVEL as from_risk,
        REVISED_RISK_LEVEL as to_risk,
        COUNT(*) as count
      FROM revised_non_compliance
      WHERE STANDARD_RISK_LEVEL != REVISED_RISK_LEVEL
      GROUP BY STANDARD_RISK_LEVEL, REVISED_RISK_LEVEL
      ORDER BY count DESC
      LIMIT 10
    `);
    
    stats.topChanges = riskChanges;
    
    // 5. Most common standards by category
    const categories = ['Safety', 'Health', 'Paperwork', 'Administrative', 'Child Well-being'];
    stats.topStandards = {};
    
    for (const category of categories) {
      const [standards] = await pool.query(`
        SELECT
          STANDARD_NUMBER_DESCRIPTION as standard,
          COUNT(*) as count
        FROM revised_non_compliance
        WHERE CATEGORY = ?
        GROUP BY STANDARD_NUMBER_DESCRIPTION
        ORDER BY count DESC
        LIMIT 5
      `, [category]);
      
      stats.topStandards[category] = standards;
    }
    
    // 6. Change types (Upgraded vs Downgraded)
    const [changeTypes] = await pool.query(`
      SELECT
        CASE
          WHEN STANDARD_RISK_LEVEL = 'High' AND REVISED_RISK_LEVEL IN ('Medium High', 'Medium', 'Medium Low', 'Low') THEN 'Downgraded from High'
          WHEN STANDARD_RISK_LEVEL = 'Medium High' AND REVISED_RISK_LEVEL IN ('Medium', 'Medium Low', 'Low') THEN 'Downgraded from Medium High'
          WHEN STANDARD_RISK_LEVEL IN ('Medium', 'Medium Low', 'Low') AND REVISED_RISK_LEVEL = 'High' THEN 'Upgraded to High'
          WHEN STANDARD_RISK_LEVEL IN ('Medium', 'Medium Low', 'Low') AND REVISED_RISK_LEVEL = 'Medium High' THEN 'Upgraded to Medium High'
          ELSE 'Other Change'
        END as change_type,
        COUNT(*) as count
      FROM revised_non_compliance
      WHERE STANDARD_RISK_LEVEL != REVISED_RISK_LEVEL
      GROUP BY change_type
      ORDER BY count DESC
    `);
    
    stats.changeTypes = changeTypes;
    
    // Generate the report
    let report = "REVISED NON-COMPLIANCE VIOLATIONS SUMMARY\n";
    report += "=" .repeat(50) + "\n\n";
    
    // Basic statistics
    report += "OVERVIEW\n";
    report += "-".repeat(30) + "\n";
    report += `Total Violations: ${stats.totalViolations}\n`;
    report += `Total Daycares: ${stats.totalDaycares}\n`;
    report += `Violations with Changed Risk Levels: ${stats.changedViolations} (${stats.changePercentage}%)\n\n`;
    
    // Risk level comparison
    report += "RISK LEVEL COMPARISON\n";
    report += "-".repeat(30) + "\n";
    report += "| Risk Level   | Original  | Revised   | Change     |\n";
    report += "|--------------|-----------|-----------|------------|\n";
    
    const riskLevels = ['High', 'Medium High', 'Medium', 'Medium Low', 'Low', 'Unknown'];
    for (const level of riskLevels) {
      const original = stats.originalRisk[level] || 0;
      const revised = stats.revisedRisk[level] || 0;
      const change = revised - original;
      const changeStr = change > 0 ? `+${change}` : `${change}`;
      const changePct = original > 0 ? ((change / original) * 100).toFixed(2) + '%' : 'N/A';
      
      report += `| ${level.padEnd(12)} | ${original.toString().padEnd(9)} | ${revised.toString().padEnd(9)} | ${changeStr} (${changePct}) |\n`;
    }
    report += '\n';
    
    // Categories
    report += "VIOLATION CATEGORIES\n";
    report += "-".repeat(30) + "\n";
    report += "| Category          | Total     | Changed   | % Changed |\n";
    report += "|-------------------|-----------|-----------|----------|\n";
    
    for (const cat of stats.categories) {
      const changePct = ((cat.changed / cat.total) * 100).toFixed(2);
      report += `| ${cat.CATEGORY.padEnd(17)} | ${cat.total.toString().padEnd(9)} | ${cat.changed.toString().padEnd(9)} | ${changePct}% |\n`;
    }
    report += '\n';
    
    // Top risk level changes
    report += "TOP RISK LEVEL CHANGES\n";
    report += "-".repeat(30) + "\n";
    
    for (const change of stats.topChanges) {
      const pct = ((change.count / stats.changedViolations) * 100).toFixed(2);
      report += `${change.from_risk} → ${change.to_risk}: ${change.count} violations (${pct}%)\n`;
    }
    report += '\n';
    
    // Change types
    report += "RISK LEVEL CHANGE TYPES\n";
    report += "-".repeat(30) + "\n";
    
    for (const type of stats.changeTypes) {
      const pct = ((type.count / stats.changedViolations) * 100).toFixed(2);
      report += `${type.change_type}: ${type.count} violations (${pct}%)\n`;
    }
    report += '\n';
    
    // Top standards by category
    report += "TOP STANDARDS BY CATEGORY\n";
    report += "-".repeat(30) + "\n";
    
    for (const category of categories) {
      report += `\n${category} Category:\n`;
      for (const std of stats.topStandards[category]) {
        report += `- ${std.standard}: ${std.count} violations\n`;
      }
    }
    
    // Write the report to a file
    const reportPath = path.join(__dirname, 'reports/revised_violations_summary.txt');
    await fs.mkdir(path.dirname(reportPath), { recursive: true }).catch(() => {});
    await fs.writeFile(reportPath, report);
    
    console.log(`Summary report saved to: ${reportPath}`);
    console.log('\nSummary of revised non-compliance violations:');
    console.log(`Total violations: ${stats.totalViolations}`);
    console.log(`Changed risk levels: ${stats.changedViolations} (${stats.changePercentage}%)`);
    console.log('Risk level changes:');
    console.log(`- High risk violations: ${stats.originalRisk['High']} → ${stats.revisedRisk['High']} (${((stats.revisedRisk['High'] - stats.originalRisk['High']) / stats.originalRisk['High'] * 100).toFixed(2)}%)`);
    console.log(`- Medium High risk violations: ${stats.originalRisk['Medium High']} → ${stats.revisedRisk['Medium High']} (${((stats.revisedRisk['Medium High'] - stats.originalRisk['Medium High']) / stats.originalRisk['Medium High'] * 100).toFixed(2)}%)`);
    
  } catch (err) {
    console.error('Error generating summary:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(console.error);