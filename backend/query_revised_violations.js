/**
 * Query Revised Violations
 * 
 * This script provides a tool for querying and analyzing the
 * revised non-compliance violations.
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

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';

// Available commands
const COMMANDS = {
  'stats': analyzeViolationStats,
  'changes': showRiskChanges,
  'category': showCategoryData,
  'daycare': analyzeDaycareViolations,
  'risk': showRiskLevelData,
  'help': showHelp
};

async function main() {
  // Create connection pool
  const pool = await mysql.createPool(dbConfig);
  
  try {
    // Execute the requested command
    if (COMMANDS[command]) {
      await COMMANDS[command](pool, args.slice(1));
    } else {
      console.log(`Unknown command: ${command}`);
      await showHelp();
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

// Show help information
async function showHelp() {
  console.log('\nUsage: node query_revised_violations.js [command] [options]');
  console.log('\nAvailable commands:');
  console.log('  stats             - Show overall statistics');
  console.log('  changes           - Show risk level changes');
  console.log('  category [name]   - Show data for a specific category');
  console.log('  daycare [id]      - Analyze violations for a specific daycare');
  console.log('  risk [level]      - Show data for a specific risk level');
  console.log('  help              - Show this help information');
  
  console.log('\nExamples:');
  console.log('  node query_revised_violations.js stats');
  console.log('  node query_revised_violations.js category "Safety"');
  console.log('  node query_revised_violations.js daycare 1460830');
  console.log('  node query_revised_violations.js risk "High"');
}

// Analyze overall violation statistics
async function analyzeViolationStats(pool) {
  console.log('\n=== Overall Violation Statistics ===');
  
  // Get overall violation counts
  const [totalCounts] = await pool.query(`
    SELECT
      COUNT(*) as total_violations,
      SUM(CASE WHEN ORIGINAL_RISK_LEVEL != REVISED_RISK_LEVEL THEN 1 ELSE 0 END) as changed_violations,
      COUNT(DISTINCT OPERATION_ID) as unique_daycares
    FROM violation_risk_comparison
  `);
  
  console.log(`Total violations: ${totalCounts[0].total_violations}`);
  console.log(`Violations with changed risk level: ${totalCounts[0].changed_violations} (${(totalCounts[0].changed_violations / totalCounts[0].total_violations * 100).toFixed(2)}%)`);
  console.log(`Unique daycares with violations: ${totalCounts[0].unique_daycares}`);
  
  // Get category distribution
  const [categoryData] = await pool.query(`
    SELECT
      CATEGORY,
      COUNT(*) as count,
      (COUNT(*) / (SELECT COUNT(*) FROM violation_risk_comparison)) * 100 as percentage
    FROM violation_risk_comparison
    GROUP BY CATEGORY
    ORDER BY count DESC
  `);
  
  console.log('\nViolation Categories:');
  for (const category of categoryData) {
    console.log(`  ${category.CATEGORY}: ${category.count} (${parseFloat(category.percentage).toFixed(2)}%)`);
  }
  
  // Get risk level comparison
  const [riskComparison] = await pool.query(`
    SELECT
      'Original' as type,
      ORIGINAL_RISK_LEVEL as risk_level,
      COUNT(*) as count,
      COUNT(*) / (SELECT COUNT(*) FROM violation_risk_comparison) * 100 as percentage
    FROM violation_risk_comparison
    GROUP BY ORIGINAL_RISK_LEVEL
    UNION ALL
    SELECT
      'Revised' as type,
      REVISED_RISK_LEVEL as risk_level,
      COUNT(*) as count,
      COUNT(*) / (SELECT COUNT(*) FROM violation_risk_comparison) * 100 as percentage
    FROM violation_risk_comparison
    GROUP BY REVISED_RISK_LEVEL
    ORDER BY type, risk_level
  `);
  
  console.log('\nRisk Level Comparison:');
  console.log('Original Risk Levels:');
  for (const risk of riskComparison.filter(r => r.type === 'Original')) {
    console.log(`  ${risk.risk_level || 'Unknown'}: ${risk.count} (${parseFloat(risk.percentage).toFixed(2)}%)`);
  }
  
  console.log('Revised Risk Levels:');
  for (const risk of riskComparison.filter(r => r.type === 'Revised')) {
    console.log(`  ${risk.risk_level || 'Unknown'}: ${risk.count} (${parseFloat(risk.percentage).toFixed(2)}%)`);
  }
}

// Show risk level changes
async function showRiskChanges(pool) {
  console.log('\n=== Risk Level Changes ===');
  
  // Get risk level change counts
  const [changeData] = await pool.query(`
    SELECT
      ORIGINAL_RISK_LEVEL,
      REVISED_RISK_LEVEL,
      COUNT(*) as count,
      COUNT(*) / (SELECT COUNT(*) FROM violation_risk_comparison WHERE ORIGINAL_RISK_LEVEL != REVISED_RISK_LEVEL) * 100 as percentage
    FROM violation_risk_comparison
    WHERE ORIGINAL_RISK_LEVEL != REVISED_RISK_LEVEL
    GROUP BY ORIGINAL_RISK_LEVEL, REVISED_RISK_LEVEL
    ORDER BY count DESC
  `);
  
  console.log('Risk Level Changes:');
  for (const change of changeData) {
    console.log(`  ${change.ORIGINAL_RISK_LEVEL} → ${change.REVISED_RISK_LEVEL}: ${change.count} (${parseFloat(change.percentage).toFixed(2)}%)`);
  }
  
  // Get risk change type counts
  const [changeTypeData] = await pool.query(`
    SELECT
      RISK_CHANGE_TYPE,
      COUNT(*) as count,
      COUNT(*) / (SELECT COUNT(*) FROM violation_risk_comparison WHERE ORIGINAL_RISK_LEVEL != REVISED_RISK_LEVEL) * 100 as percentage
    FROM violation_risk_comparison
    WHERE ORIGINAL_RISK_LEVEL != REVISED_RISK_LEVEL
    GROUP BY RISK_CHANGE_TYPE
    ORDER BY count DESC
  `);
  
  console.log('\nRisk Change Types:');
  for (const type of changeTypeData) {
    console.log(`  ${type.RISK_CHANGE_TYPE}: ${type.count} (${parseFloat(type.percentage).toFixed(2)}%)`);
  }
  
  // Get category risk changes
  const [categoryChanges] = await pool.query(`
    SELECT
      CATEGORY,
      RISK_CHANGE_TYPE,
      COUNT(*) as count
    FROM violation_risk_comparison
    WHERE ORIGINAL_RISK_LEVEL != REVISED_RISK_LEVEL
    GROUP BY CATEGORY, RISK_CHANGE_TYPE
    ORDER BY CATEGORY, RISK_CHANGE_TYPE
  `);
  
  console.log('\nCategory Risk Changes:');
  let currentCategory = '';
  for (const change of categoryChanges) {
    if (currentCategory !== change.CATEGORY) {
      currentCategory = change.CATEGORY;
      console.log(`\n  ${currentCategory}:`);
    }
    console.log(`    ${change.RISK_CHANGE_TYPE}: ${change.count}`);
  }
}

// Show data for a specific category
async function showCategoryData(pool, args) {
  const category = args[0];
  
  if (!category) {
    console.log('Please specify a category. Available categories:');
    const [categories] = await pool.query(`
      SELECT DISTINCT CATEGORY FROM violation_risk_comparison
      ORDER BY CATEGORY
    `);
    for (const cat of categories) {
      console.log(`  - ${cat.CATEGORY}`);
    }
    return;
  }
  
  console.log(`\n=== Data for Category: ${category} ===`);
  
  // Check if category exists
  const [categoryCheck] = await pool.query(`
    SELECT COUNT(*) as count FROM violation_risk_comparison 
    WHERE CATEGORY = ?
  `, [category]);
  
  if (categoryCheck[0].count === 0) {
    console.log(`Category "${category}" not found. Please check the spelling.`);
    return;
  }
  
  // Get category statistics
  const [categoryStats] = await pool.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN ORIGINAL_RISK_LEVEL != REVISED_RISK_LEVEL THEN 1 ELSE 0 END) as changed,
      (SUM(CASE WHEN ORIGINAL_RISK_LEVEL != REVISED_RISK_LEVEL THEN 1 ELSE 0 END) / COUNT(*)) * 100 as change_percentage
    FROM violation_risk_comparison
    WHERE CATEGORY = ?
  `, [category]);
  
  console.log(`Total violations: ${categoryStats[0].total}`);
  console.log(`Changed risk levels: ${categoryStats[0].changed} (${parseFloat(categoryStats[0].change_percentage).toFixed(2)}%)`);
  
  // Get risk level distribution
  const [riskDistribution] = await pool.query(`
    SELECT
      'Original' as type,
      ORIGINAL_RISK_LEVEL as risk_level,
      COUNT(*) as count,
      COUNT(*) / (SELECT COUNT(*) FROM violation_risk_comparison WHERE CATEGORY = ?) * 100 as percentage
    FROM violation_risk_comparison
    WHERE CATEGORY = ?
    GROUP BY ORIGINAL_RISK_LEVEL
    UNION ALL
    SELECT
      'Revised' as type,
      REVISED_RISK_LEVEL as risk_level,
      COUNT(*) as count,
      COUNT(*) / (SELECT COUNT(*) FROM violation_risk_comparison WHERE CATEGORY = ?) * 100 as percentage
    FROM violation_risk_comparison
    WHERE CATEGORY = ?
    GROUP BY REVISED_RISK_LEVEL
    ORDER BY type, risk_level
  `, [category, category, category, category]);
  
  console.log('\nRisk Level Distribution:');
  console.log('Original:');
  for (const risk of riskDistribution.filter(r => r.type === 'Original')) {
    console.log(`  ${risk.risk_level || 'Unknown'}: ${risk.count} (${parseFloat(risk.percentage).toFixed(2)}%)`);
  }
  
  console.log('Revised:');
  for (const risk of riskDistribution.filter(r => r.type === 'Revised')) {
    console.log(`  ${risk.risk_level || 'Unknown'}: ${risk.count} (${parseFloat(risk.percentage).toFixed(2)}%)`);
  }
  
  // Get most common standards
  const [commonStandards] = await pool.query(`
    SELECT
      STANDARD_NUMBER_DESCRIPTION,
      COUNT(*) as count
    FROM violation_risk_comparison
    WHERE CATEGORY = ?
    GROUP BY STANDARD_NUMBER_DESCRIPTION
    ORDER BY count DESC
    LIMIT 10
  `, [category]);
  
  console.log('\nMost Common Standards:');
  for (const std of commonStandards) {
    console.log(`  ${std.STANDARD_NUMBER_DESCRIPTION}: ${std.count}`);
  }
}

// Analyze violations for a specific daycare
async function analyzeDaycareViolations(pool, args) {
  const daycareId = args[0];
  
  if (!daycareId) {
    console.log('Please specify a daycare ID.');
    return;
  }
  
  console.log(`\n=== Violations for Daycare ID: ${daycareId} ===`);
  
  // Check if daycare exists
  const [daycareCheck] = await pool.query(`
    SELECT 
      OPERATION_ID, 
      OPERATION_NAME, 
      CITY,
      COUNT(*) as violation_count
    FROM violation_risk_comparison 
    WHERE OPERATION_ID = ?
    GROUP BY OPERATION_ID, OPERATION_NAME, CITY
  `, [daycareId]);
  
  if (daycareCheck.length === 0) {
    console.log(`Daycare with ID "${daycareId}" not found or has no violations.`);
    return;
  }
  
  console.log(`Daycare: ${daycareCheck[0].OPERATION_NAME || 'Unknown'}`);
  console.log(`Location: ${daycareCheck[0].CITY || 'Unknown'}`);
  console.log(`Total Violations: ${daycareCheck[0].violation_count}`);
  
  // Get risk level changes for this daycare
  const [riskChanges] = await pool.query(`
    SELECT
      ORIGINAL_RISK_LEVEL,
      REVISED_RISK_LEVEL,
      COUNT(*) as count
    FROM violation_risk_comparison
    WHERE OPERATION_ID = ? AND ORIGINAL_RISK_LEVEL != REVISED_RISK_LEVEL
    GROUP BY ORIGINAL_RISK_LEVEL, REVISED_RISK_LEVEL
    ORDER BY count DESC
  `, [daycareId]);
  
  if (riskChanges.length > 0) {
    console.log('\nRisk Level Changes:');
    for (const change of riskChanges) {
      console.log(`  ${change.ORIGINAL_RISK_LEVEL} → ${change.REVISED_RISK_LEVEL}: ${change.count}`);
    }
  } else {
    console.log('\nNo risk level changes for this daycare.');
  }
  
  // Get category breakdown
  const [categories] = await pool.query(`
    SELECT
      CATEGORY,
      COUNT(*) as count,
      COUNT(*) / (SELECT COUNT(*) FROM violation_risk_comparison WHERE OPERATION_ID = ?) * 100 as percentage
    FROM violation_risk_comparison
    WHERE OPERATION_ID = ?
    GROUP BY CATEGORY
    ORDER BY count DESC
  `, [daycareId, daycareId]);
  
  console.log('\nViolation Categories:');
  for (const cat of categories) {
    console.log(`  ${cat.CATEGORY}: ${cat.count} (${parseFloat(cat.percentage).toFixed(2)}%)`);
  }
  
  // Get recent violations
  const [recentViolations] = await pool.query(`
    SELECT
      ACTIVITY_DATE,
      STANDARD_NUMBER_DESCRIPTION,
      ORIGINAL_RISK_LEVEL,
      REVISED_RISK_LEVEL,
      CATEGORY,
      NARRATIVE
    FROM violation_risk_comparison
    WHERE OPERATION_ID = ?
    ORDER BY ACTIVITY_DATE DESC
    LIMIT 5
  `, [daycareId]);
  
  if (recentViolations.length > 0) {
    console.log('\nRecent Violations:');
    for (const violation of recentViolations) {
      const activityDate = violation.ACTIVITY_DATE 
        ? new Date(violation.ACTIVITY_DATE).toLocaleDateString() 
        : 'Unknown date';
      
      console.log(`\n  Date: ${activityDate}`);
      console.log(`  Standard: ${violation.STANDARD_NUMBER_DESCRIPTION}`);
      console.log(`  Risk: ${violation.ORIGINAL_RISK_LEVEL} → ${violation.REVISED_RISK_LEVEL}`);
      console.log(`  Category: ${violation.CATEGORY}`);
      
      if (violation.NARRATIVE) {
        const narrativePreview = violation.NARRATIVE.length > 100 
          ? violation.NARRATIVE.substring(0, 100) + '...' 
          : violation.NARRATIVE;
        console.log(`  Description: ${narrativePreview}`);
      }
    }
  }
}

// Show data for a specific risk level
async function showRiskLevelData(pool, args) {
  const riskLevel = args[0];
  
  if (!riskLevel) {
    console.log('Please specify a risk level (High, Medium High, Medium, Medium Low, or Low).');
    return;
  }
  
  console.log(`\n=== Data for Risk Level: ${riskLevel} ===`);
  
  // Check valid risk level
  if (!['High', 'Medium High', 'Medium', 'Medium Low', 'Low'].includes(riskLevel)) {
    console.log('Invalid risk level. Please use: High, Medium High, Medium, Medium Low, or Low.');
    return;
  }
  
  // Get statistics for this risk level
  const [originalStats] = await pool.query(`
    SELECT COUNT(*) as count FROM violation_risk_comparison 
    WHERE ORIGINAL_RISK_LEVEL = ?
  `, [riskLevel]);
  
  const [revisedStats] = await pool.query(`
    SELECT COUNT(*) as count FROM violation_risk_comparison 
    WHERE REVISED_RISK_LEVEL = ?
  `, [riskLevel]);
  
  console.log(`Violations with original risk level ${riskLevel}: ${originalStats[0].count}`);
  console.log(`Violations with revised risk level ${riskLevel}: ${revisedStats[0].count}`);
  console.log(`Change: ${revisedStats[0].count - originalStats[0].count} (${((revisedStats[0].count - originalStats[0].count) / originalStats[0].count * 100).toFixed(2)}%)`);
  
  // Get category breakdown for this risk level
  const [categoryBreakdown] = await pool.query(`
    SELECT
      CATEGORY,
      COUNT(*) as count,
      COUNT(*) / (SELECT COUNT(*) FROM violation_risk_comparison WHERE REVISED_RISK_LEVEL = ?) * 100 as percentage
    FROM violation_risk_comparison
    WHERE REVISED_RISK_LEVEL = ?
    GROUP BY CATEGORY
    ORDER BY count DESC
  `, [riskLevel, riskLevel]);
  
  console.log(`\nCategory breakdown for ${riskLevel} risk level (revised):`);
  for (const cat of categoryBreakdown) {
    console.log(`  ${cat.CATEGORY}: ${cat.count} (${parseFloat(cat.percentage).toFixed(2)}%)`);
  }
  
  // Get daycares with most violations at this risk level
  const [topDaycares] = await pool.query(`
    SELECT
      OPERATION_ID,
      OPERATION_NAME,
      CITY,
      COUNT(*) as count
    FROM violation_risk_comparison
    WHERE REVISED_RISK_LEVEL = ?
    GROUP BY OPERATION_ID, OPERATION_NAME, CITY
    ORDER BY count DESC
    LIMIT 10
  `, [riskLevel]);
  
  console.log(`\nTop daycares with ${riskLevel} risk level violations (revised):`);
  for (const daycare of topDaycares) {
    console.log(`  ${daycare.OPERATION_NAME || daycare.OPERATION_ID} (${daycare.CITY || 'Unknown'}): ${daycare.count}`);
  }
  
  // Get most common standards at this risk level
  const [commonStandards] = await pool.query(`
    SELECT
      STANDARD_NUMBER_DESCRIPTION,
      COUNT(*) as count
    FROM violation_risk_comparison
    WHERE REVISED_RISK_LEVEL = ?
    GROUP BY STANDARD_NUMBER_DESCRIPTION
    ORDER BY count DESC
    LIMIT 10
  `, [riskLevel]);
  
  console.log(`\nMost common standards with ${riskLevel} risk level (revised):`);
  for (const std of commonStandards) {
    console.log(`  ${std.STANDARD_NUMBER_DESCRIPTION}: ${std.count}`);
  }
}

// Run the script
main().catch(console.error);