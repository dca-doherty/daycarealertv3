/**
 * Check for dates in inspections table
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

async function checkInspectionsDates() {
  const pool = mysql.createPool(dbConfig);
  
  try {
    // First check if inspections table exists
    const [tables] = await pool.query(`SHOW TABLES LIKE 'inspections'`);
    
    if (tables.length === 0) {
      console.log('Inspections table does not exist in the database.');
      return;
    }
    
    // Check inspections table date fields
    const [inspectionsStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_inspections,
        SUM(CASE WHEN INSPECTION_DATE IS NULL THEN 1 ELSE 0 END) as null_dates,
        SUM(CASE WHEN INSPECTION_DATE IS NOT NULL THEN 1 ELSE 0 END) as non_null_dates,
        MIN(INSPECTION_DATE) as oldest_date,
        MAX(INSPECTION_DATE) as newest_date
      FROM 
        inspections
    `);
    
    console.log('\nInspections Table Date Statistics:');
    console.log(`Total inspections: ${inspectionsStats[0].total_inspections}`);
    console.log(`Inspections with null dates: ${inspectionsStats[0].null_dates} (${((inspectionsStats[0].null_dates / inspectionsStats[0].total_inspections) * 100).toFixed(1)}%)`);
    console.log(`Inspections with dates: ${inspectionsStats[0].non_null_dates} (${((inspectionsStats[0].non_null_dates / inspectionsStats[0].total_inspections) * 100).toFixed(1)}%)`);
    console.log(`Oldest inspection date: ${inspectionsStats[0].oldest_date}`);
    console.log(`Newest inspection date: ${inspectionsStats[0].newest_date}`);
    
    // Get distribution of dates by year
    const [yearDistribution] = await pool.query(`
      SELECT 
        YEAR(INSPECTION_DATE) as year,
        COUNT(*) as count,
        ROUND(COUNT(*) / (SELECT COUNT(*) FROM inspections WHERE INSPECTION_DATE IS NOT NULL) * 100, 1) as percentage
      FROM 
        inspections
      WHERE
        INSPECTION_DATE IS NOT NULL
      GROUP BY
        YEAR(INSPECTION_DATE)
      ORDER BY
        year DESC
    `);
    
    console.log('\nInspection Date Distribution by Year:');
    yearDistribution.forEach(row => {
      console.log(`${row.year}: ${row.count} inspections (${row.percentage}%)`);
    });
    
    // Check recent inspections (past year)
    const [recentInspections] = await pool.query(`
      SELECT 
        COUNT(*) as count
      FROM 
        inspections
      WHERE
        INSPECTION_DATE IS NOT NULL
        AND INSPECTION_DATE >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
    `);
    
    console.log(`\nInspections in the past year: ${recentInspections[0].count}`);
    
    // Sample recent inspections
    console.log('\nSample of Recent Inspections:');
    const [recentSample] = await pool.query(`
      SELECT 
        OPERATION_ID,
        INSPECTION_DATE,
        INSPECTION_TYPE,
        INVESTIGATION_ID,
        INVESTIGATION_NUMBER
      FROM 
        inspections
      WHERE
        INSPECTION_DATE IS NOT NULL
      ORDER BY
        INSPECTION_DATE DESC
      LIMIT 10
    `);
    
    recentSample.forEach(inspection => {
      console.log(`Operation ID: ${inspection.OPERATION_ID}`);
      console.log(`Date: ${inspection.INSPECTION_DATE}`);
      console.log(`Type: ${inspection.INSPECTION_TYPE}`);
      console.log(`Investigation ID: ${inspection.INVESTIGATION_ID}`);
      console.log(`Investigation Number: ${inspection.INVESTIGATION_NUMBER}`);
      console.log('---');
    });
    
    // Check if we can link inspections to violations
    console.log('\nChecking if inspections can be linked to violations:');
    const [linkStats] = await pool.query(`
      SELECT
        i.OPERATION_ID,
        i.INSPECTION_DATE,
        COUNT(r.id) as related_violations
      FROM
        inspections i
      LEFT JOIN
        revised_non_compliance r ON i.OPERATION_ID = r.OPERATION_ID
      WHERE
        i.INSPECTION_DATE IS NOT NULL
      GROUP BY
        i.OPERATION_ID, i.INSPECTION_DATE
      ORDER BY
        related_violations DESC
      LIMIT 5
    `);
    
    linkStats.forEach(link => {
      console.log(`Operation ID: ${link.OPERATION_ID}, Inspection Date: ${link.INSPECTION_DATE}, Related Violations: ${link.related_violations}`);
    });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
checkInspectionsDates().catch(console.error);