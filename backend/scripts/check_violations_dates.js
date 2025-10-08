/**
 * Check violation dates in both non_compliance and revised_non_compliance tables
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

async function checkViolationDates() {
  const pool = mysql.createPool(dbConfig);
  
  try {
    // First check if non_compliance table has dates
    const [nonComplianceStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_violations,
        SUM(CASE WHEN ACTIVITY_DATE IS NULL THEN 1 ELSE 0 END) as null_dates,
        SUM(CASE WHEN ACTIVITY_DATE IS NOT NULL THEN 1 ELSE 0 END) as non_null_dates,
        MIN(ACTIVITY_DATE) as oldest_date,
        MAX(ACTIVITY_DATE) as newest_date
      FROM 
        non_compliance
    `);
    
    console.log('\nNon Compliance Table Date Statistics:');
    console.log(`Total violations: ${nonComplianceStats[0].total_violations}`);
    console.log(`Violations with null dates: ${nonComplianceStats[0].null_dates} (${((nonComplianceStats[0].null_dates / nonComplianceStats[0].total_violations) * 100).toFixed(1)}%)`);
    console.log(`Violations with dates: ${nonComplianceStats[0].non_null_dates} (${((nonComplianceStats[0].non_null_dates / nonComplianceStats[0].total_violations) * 100).toFixed(1)}%)`);
    console.log(`Oldest violation date: ${nonComplianceStats[0].oldest_date}`);
    console.log(`Newest violation date: ${nonComplianceStats[0].newest_date}`);
    
    // Check matching between revised_non_compliance and non_compliance
    const [matchStats] = await pool.query(`
      SELECT 
        COUNT(r.id) as total_revised_records,
        SUM(CASE WHEN n.NON_COMPLIANCE_ID IS NOT NULL THEN 1 ELSE 0 END) as matched_records,
        SUM(CASE WHEN n.NON_COMPLIANCE_ID IS NULL THEN 1 ELSE 0 END) as unmatched_records
      FROM 
        revised_non_compliance r
      LEFT JOIN 
        non_compliance n ON r.NON_COMPLIANCE_ID = n.NON_COMPLIANCE_ID
    `);
    
    console.log('\nMatching Between Tables:');
    console.log(`Total records in revised_non_compliance: ${matchStats[0].total_revised_records}`);
    console.log(`Records with matching NON_COMPLIANCE_ID in non_compliance: ${matchStats[0].matched_records} (${((matchStats[0].matched_records / matchStats[0].total_revised_records) * 100).toFixed(1)}%)`);
    console.log(`Records without matching NON_COMPLIANCE_ID: ${matchStats[0].unmatched_records} (${((matchStats[0].unmatched_records / matchStats[0].total_revised_records) * 100).toFixed(1)}%)`);
    
    // If we have date data in non_compliance, show a sample of records
    if (nonComplianceStats[0].non_null_dates > 0) {
      const [sampleData] = await pool.query(`
        SELECT 
          n.OPERATION_ID,
          n.NON_COMPLIANCE_ID,
          n.ACTIVITY_DATE,
          r.NON_COMPLIANCE_ID as revised_id,
          r.ACTIVITY_DATE as revised_date
        FROM 
          non_compliance n
        LEFT JOIN 
          revised_non_compliance r ON n.NON_COMPLIANCE_ID = r.NON_COMPLIANCE_ID
        WHERE 
          n.ACTIVITY_DATE IS NOT NULL
        ORDER BY 
          n.ACTIVITY_DATE DESC
        LIMIT 10
      `);
      
      console.log('\nSample of Recent Violation Dates:');
      sampleData.forEach(record => {
        console.log(`Operation ID: ${record.OPERATION_ID}`);
        console.log(`Original Date: ${record.ACTIVITY_DATE}`);
        console.log(`Revised Date: ${record.revised_date || 'NULL'}`);
        console.log(`Matched IDs: ${record.NON_COMPLIANCE_ID === record.revised_id ? 'Yes' : 'No'}`);
        console.log('---');
      });
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
checkViolationDates().catch(console.error);