/**
 * Check the structure of database tables
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

async function checkTableStructure() {
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Get list of all tables
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map(table => Object.values(table)[0]);
    
    console.log('Tables in database:');
    tableNames.forEach(table => console.log(`- ${table}`));
    
    // Check structure of key tables
    const tablesToCheck = [
      'non_compliance',
      'revised_non_compliance',
      'risk_analysis',
      'daycare_operations',
      'inspections',
      'violations'
    ];
    
    for (const tableName of tablesToCheck) {
      if (tableNames.includes(tableName)) {
        console.log(`\nStructure of ${tableName} table:`);
        const [columns] = await pool.query(`DESCRIBE ${tableName}`);
        columns.forEach(col => {
          console.log(`- ${col.Field}: ${col.Type}${col.Null === 'NO' ? ' NOT NULL' : ''}${col.Key === 'PRI' ? ' (PRIMARY KEY)' : ''}`);
        });
        
        // Get count of records
        const [countResult] = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`Total records: ${countResult[0].count}`);
        
        // Get date fields in the table
        const dateColumns = columns
          .filter(col => 
            col.Type.includes('date') || 
            col.Type.includes('time') || 
            col.Field.toLowerCase().includes('date'))
          .map(col => col.Field);
        
        if (dateColumns.length > 0) {
          console.log(`Date/time columns: ${dateColumns.join(', ')}`);
          
          // Check for non-null date values in each date column
          for (const dateCol of dateColumns) {
            const [dateStats] = await pool.query(`
              SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN ${dateCol} IS NULL THEN 1 ELSE 0 END) as null_count,
                SUM(CASE WHEN ${dateCol} IS NOT NULL THEN 1 ELSE 0 END) as non_null_count,
                MIN(${dateCol}) as min_date,
                MAX(${dateCol}) as max_date
              FROM 
                ${tableName}
            `);
            
            console.log(`\nStats for ${dateCol}:`);
            console.log(`- Null values: ${dateStats[0].null_count} (${((dateStats[0].null_count / dateStats[0].total) * 100).toFixed(1)}%)`);
            console.log(`- Non-null values: ${dateStats[0].non_null_count} (${((dateStats[0].non_null_count / dateStats[0].total) * 100).toFixed(1)}%)`);
            
            if (dateStats[0].non_null_count > 0) {
              console.log(`- Oldest date: ${dateStats[0].min_date}`);
              console.log(`- Latest date: ${dateStats[0].max_date}`);
              
              // Get sample of records with dates
              const [samples] = await pool.query(`
                SELECT * 
                FROM ${tableName} 
                WHERE ${dateCol} IS NOT NULL 
                ORDER BY ${dateCol} DESC 
                LIMIT 5
              `);
              
              console.log(`\nSample records with ${dateCol}:`);
              samples.forEach((sample, index) => {
                console.log(`Record ${index + 1}:`);
                Object.entries(sample).forEach(([key, value]) => {
                  if (key === dateCol || key === 'OPERATION_ID' || key === 'operation_id' || key === 'id' || key === 'NON_COMPLIANCE_ID') {
                    console.log(`  ${key}: ${value}`);
                  }
                });
              });
            }
          }
        } else {
          console.log('No date or time columns found in this table');
        }
      } else {
        console.log(`\nTable '${tableName}' does not exist in the database`);
      }
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
checkTableStructure().catch(console.error);