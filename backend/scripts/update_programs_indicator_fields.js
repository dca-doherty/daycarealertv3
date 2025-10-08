/**
 * Update Program Indicator Fields in Daycare Finder
 * 
 * This script adds and populates Boolean indicator fields for each program
 * in the programs_provided field to make searching easier and more efficient
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

// List of possible program values
const PROGRAM_TYPES = [
  { id: 'school_age_care', label: 'School Age Care' },
  { id: 'before_school_care', label: 'Before School Care' },
  { id: 'after_school_care', label: 'After School Care' },
  { id: 'meals_provided', label: 'Meals Provided' },
  { id: 'snacks_provided', label: 'Snacks Provided' },
  { id: 'drop_in_care', label: 'Drop-In Care' },
  { id: 'part_time_care', label: 'Part Time Care' },
  { id: 'transportation_school', label: 'Transportation to/from School' },
  { id: 'field_trips', label: 'Field Trips' },
  { id: 'accredited', label: 'Accredited' },
  { id: 'skill_classes', label: 'Skill Classes' },
  { id: 'special_needs', label: 'Children with Special Needs' },
  { id: 'night_care', label: 'Night Care' }
];

// Add Boolean columns for each program type
async function addProgramColumns() {
  console.log('Adding program indicator columns to daycare_finder table...');
  
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Check if columns already exist
    const [columns] = await pool.query('DESCRIBE daycare_finder');
    const existingColumns = columns.map(col => col.Field.toLowerCase());
    
    // Add missing columns
    for (const program of PROGRAM_TYPES) {
      const columnName = `has_${program.id}`;
      
      if (!existingColumns.includes(columnName.toLowerCase())) {
        console.log(`Adding column ${columnName}...`);
        await pool.query(`
          ALTER TABLE daycare_finder
          ADD COLUMN ${columnName} BOOLEAN DEFAULT FALSE
        `);
      } else {
        console.log(`Column ${columnName} already exists`);
      }
    }
    
    console.log('All program indicator columns added successfully');
    return true;
  } catch (err) {
    console.error('Error adding program columns:', err);
    return false;
  } finally {
    await pool.end();
  }
}

// Update indicator fields based on programs_provided values
async function updateProgramIndicators() {
  console.log('Updating program indicator fields...');
  
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Get records with programs_provided values
    const [records] = await pool.query(`
      SELECT id, operation_id, programs_provided 
      FROM daycare_finder 
      WHERE programs_provided IS NOT NULL
    `);
    
    console.log(`Found ${records.length} records with programs_provided values`);
    
    // Process in batches for better performance
    const BATCH_SIZE = 100;
    let processed = 0;
    
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        for (const record of batch) {
          if (!record.programs_provided) continue;
          
          // Prepare update query parts
          const updateParts = [];
          const programList = record.programs_provided.split(',').map(p => p.trim());
          
          // Check each program type
          for (const program of PROGRAM_TYPES) {
            const columnName = `has_${program.id}`;
            const hasProgram = programList.some(p => 
              p.toLowerCase() === program.label.toLowerCase()
            );
            
            if (hasProgram) {
              updateParts.push(`${columnName} = TRUE`);
            }
          }
          
          // Update the record if we have indicators to set
          if (updateParts.length > 0) {
            await connection.query(`
              UPDATE daycare_finder
              SET ${updateParts.join(', ')}
              WHERE id = ?
            `, [record.id]);
          }
        }
        
        await connection.commit();
        processed += batch.length;
        console.log(`Processed ${processed}/${records.length} records`);
      } catch (err) {
        await connection.rollback();
        console.error('Error processing batch:', err);
      } finally {
        connection.release();
      }
    }
    
    console.log('Program indicators updated successfully');
    
    // Create index for each indicator column
    console.log('Creating indices for program indicator fields...');
    
    for (const program of PROGRAM_TYPES) {
      const columnName = `has_${program.id}`;
      const indexName = `idx_${columnName}`;
      
      try {
        await pool.query(`
          CREATE INDEX ${indexName} ON daycare_finder(${columnName})
        `);
        console.log(`Created index ${indexName}`);
      } catch (err) {
        console.error(`Error creating index ${indexName}:`, err.message);
      }
    }
    
    return processed;
  } catch (err) {
    console.error('Error updating program indicators:', err);
    return 0;
  } finally {
    await pool.end();
  }
}

// Main function
async function main() {
  console.log('Starting program indicator update process...');
  
  // Step 1: Add columns
  const columnsAdded = await addProgramColumns();
  if (!columnsAdded) {
    console.error('Unable to proceed: Column addition failed');
    process.exit(1);
  }
  
  // Step 2: Update indicators
  const updatedCount = await updateProgramIndicators();
  console.log(`Updated ${updatedCount} records with program indicators`);
  
  console.log('\nProcess completed successfully!');
}

// Run the script
if (require.main === module) {
  main().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

module.exports = {
  addProgramColumns,
  updateProgramIndicators
};