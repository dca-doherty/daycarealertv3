/**
 * Update Daycare Finder Table Structure
 * 
 * This script optimizes the daycare_finder table by:
 * 1. Breaking out licensed_to_serve_ages into Boolean indicator fields
 * 2. Removing unused or redundant fields
 * 3. Adding missing program type indicators
 * 4. Indexing fields for better search performance
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

// Age categories to break out from licensed_to_serve_ages
const AGE_CATEGORIES = [
  { id: 'serves_infant', label: 'Infant' },
  { id: 'serves_toddler', label: 'Toddler' },
  { id: 'serves_preschool', label: 'Pre-Kindergarten' },
  { id: 'serves_school_age', label: 'School' }
];

// Program types from programs_provided field
const PROGRAM_TYPES = [
  { id: 'has_school_age_care', label: 'School Age Care' },
  { id: 'has_before_school_care', label: 'Before School Care' },
  { id: 'has_after_school_care', label: 'After School Care' },
  { id: 'has_meals_provided', label: 'Meals Provided' },
  { id: 'has_snacks_provided', label: 'Snacks Provided' },
  { id: 'has_drop_in_care', label: 'Drop-In Care' },
  { id: 'has_part_time_care', label: 'Part Time Care' },
  { id: 'has_transportation_school', label: 'Transportation to/from School' },
  { id: 'has_field_trips', label: 'Field Trips' },
  { id: 'has_accredited', label: 'Accredited' },
  { id: 'has_skill_classes', label: 'Skill Classes' },
  { id: 'has_special_needs', label: 'Children with Special Needs' },
  { id: 'has_night_care', label: 'Night Care' },
  { id: 'has_weekend_care', label: 'Weekend Care' },
  { id: 'has_get_well_care', label: 'Get Well Care' }
];

// Fields to remove (rarely used or redundant)
const FIELDS_TO_REMOVE = [
  'cost_age_group',
  'cost_age_multiplier',
  'cost_operation_type_multiplier',
  'cost_service_adjustment',
  'cost_risk_adjustment',
  'cost_experience_adjustment',
  'cost_location_adjustment',
  'cost_capacity_adjustment',
  'cost_hours_adjustment',
  'cost_accreditation_adjustment',
  'cost_education_adjustment',
  'cost_curriculum_adjustment',
  'quality_transportation',
  'quality_meals_provided',
  'quality_special_needs',
  'quality_language_immersion',
  'quality_montessori',
  'quality_religious',
  'quality_afterschool',
  'quality_summer_programs',
  'quality_enrichment',
  'quality_early_drop',
  'quality_late_pick',
  'accredited_naeyc',
  'accredited_necpa',
  'accredited_nafcc',
  'accredited_coa',
  'accredited_cognia',
  'accredited_apple',
  'accredited_tx_rising',
  'accredited_tx_school_ready',
  'education_cda',
  'education_associates',
  'education_bachelors',
  'education_masters',
  'education_montessori_cert',
  'curriculum_highscope',
  'curriculum_reggio',
  'curriculum_waldorf',
  'curriculum_banks',
  'curriculum_creative',
  'curriculum_project',
  'curriculum_emergent'
];

// Add age group indicator columns
async function addAgeGroupColumns(pool) {
  console.log('Adding age group indicator columns...');
  
  try {
    // Check which columns already exist
    const [columns] = await pool.query('DESCRIBE daycare_finder');
    const existingColumns = columns.map(col => col.Field.toLowerCase());
    
    // Add missing age group columns
    for (const ageCategory of AGE_CATEGORIES) {
      const columnName = ageCategory.id;
      
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
    
    console.log('All age group columns added successfully');
    return true;
  } catch (err) {
    console.error('Error adding age group columns:', err);
    return false;
  }
}

// Add missing program type columns
async function addMissingProgramColumns(pool) {
  console.log('Checking for missing program type columns...');
  
  try {
    // Check which columns already exist
    const [columns] = await pool.query('DESCRIBE daycare_finder');
    const existingColumns = columns.map(col => col.Field.toLowerCase());
    
    // Add missing program columns
    for (const programType of PROGRAM_TYPES) {
      const columnName = programType.id;
      
      if (!existingColumns.includes(columnName.toLowerCase())) {
        console.log(`Adding missing program column ${columnName}...`);
        await pool.query(`
          ALTER TABLE daycare_finder
          ADD COLUMN ${columnName} BOOLEAN DEFAULT FALSE
        `);
      }
    }
    
    console.log('All program type columns checked/added');
    return true;
  } catch (err) {
    console.error('Error adding program columns:', err);
    return false;
  }
}

// Remove unused fields
async function removeUnusedFields(pool) {
  console.log('Removing unused fields...');
  
  try {
    // Check which columns exist
    const [columns] = await pool.query('DESCRIBE daycare_finder');
    const existingColumns = columns.map(col => col.Field.toLowerCase());
    
    // Remove fields that exist in the table
    for (const field of FIELDS_TO_REMOVE) {
      if (existingColumns.includes(field.toLowerCase())) {
        console.log(`Removing field ${field}...`);
        await pool.query(`
          ALTER TABLE daycare_finder
          DROP COLUMN ${field}
        `);
      } else {
        console.log(`Field ${field} does not exist or was already removed`);
      }
    }
    
    console.log('All unused fields removed successfully');
    return true;
  } catch (err) {
    console.error('Error removing unused fields:', err);
    return false;
  }
}

// Update age group indicators based on licensed_to_serve_ages
async function updateAgeGroupIndicators(pool) {
  console.log('Updating age group indicators...');
  
  try {
    for (const ageCategory of AGE_CATEGORIES) {
      console.log(`Updating ${ageCategory.id}...`);
      
      await pool.query(`
        UPDATE daycare_finder
        SET ${ageCategory.id} = 
          CASE 
            WHEN licensed_to_serve_ages LIKE ? THEN TRUE
            ELSE FALSE
          END
        WHERE licensed_to_serve_ages IS NOT NULL
      `, [`%${ageCategory.label}%`]);
    }
    
    console.log('Age group indicators updated successfully');
    
    // Create index for each age group column
    console.log('Creating indices for age group fields...');
    
    for (const ageCategory of AGE_CATEGORIES) {
      try {
        const indexName = `idx_${ageCategory.id}`;
        await pool.query(`
          CREATE INDEX ${indexName} ON daycare_finder(${ageCategory.id})
        `);
        console.log(`Created index ${indexName}`);
      } catch (err) {
        console.error(`Error creating index for ${ageCategory.id}:`, err.message);
      }
    }
    
    return true;
  } catch (err) {
    console.error('Error updating age group indicators:', err);
    return false;
  }
}

// Update program indicators for newly added columns
async function updateProgramIndicators(pool) {
  console.log('Updating program indicators for any new columns...');
  
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
            const columnName = program.id;
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
        
        if (processed % 1000 === 0 || processed === records.length) {
          console.log(`Processed ${processed}/${records.length} records`);
        }
      } catch (err) {
        await connection.rollback();
        console.error('Error processing batch:', err);
      } finally {
        connection.release();
      }
    }
    
    console.log('Program indicators updated successfully');
    
    // Create index for any new program indicator columns
    console.log('Creating indices for program indicator fields...');
    
    for (const program of PROGRAM_TYPES) {
      const columnName = program.id;
      const indexName = `idx_${columnName}`;
      
      try {
        await pool.query(`
          CREATE INDEX ${indexName} ON daycare_finder(${columnName})
        `);
        console.log(`Created index ${indexName}`);
      } catch (err) {
        if (err.message.includes('Duplicate key name') || err.message.includes('already exists')) {
          console.log(`Index ${indexName} already exists, skipping`);
        } else {
          console.error(`Error creating index ${indexName}:`, err.message);
        }
      }
    }
    
    return processed;
  } catch (err) {
    console.error('Error updating program indicators:', err);
    return 0;
  }
}

// Check the table structure after changes
async function showTableStructure(pool) {
  console.log('\n=== DAYCARE FINDER TABLE STRUCTURE AFTER CHANGES ===');
  
  try {
    // Get all columns
    const [columns] = await pool.query('DESCRIBE daycare_finder');
    const columnInfo = columns.map(col => `${col.Field} (${col.Type})`);
    
    // Group columns by category for better readability
    const idColumns = columnInfo.filter(col => col.includes('id') || col.startsWith('operation_'));
    const basicColumns = columnInfo.filter(col => !col.includes('id') && !col.startsWith('operation_') && 
      !col.startsWith('has_') && !col.startsWith('serves_') && !col.startsWith('cost_') && 
      !col.startsWith('quality_') && !col.startsWith('accredited_') && !col.startsWith('education_') && 
      !col.startsWith('curriculum_'));
    const ageColumns = columnInfo.filter(col => col.startsWith('serves_'));
    const programColumns = columnInfo.filter(col => col.startsWith('has_'));
    
    console.log('ID and Operation Columns:');
    console.log(idColumns.join('\n'));
    
    console.log('\nBasic Information Columns:');
    console.log(basicColumns.join('\n'));
    
    console.log('\nAge Group Indicator Columns:');
    console.log(ageColumns.join('\n'));
    
    console.log('\nProgram Indicator Columns:');
    console.log(programColumns.join('\n'));
    
    // Get index information
    const [indexes] = await pool.query('SHOW INDEX FROM daycare_finder');
    const indexNames = [...new Set(indexes.map(idx => idx.Key_name))];
    
    console.log('\nTable Indexes:');
    console.log(indexNames.join('\n'));
    
    // Get record count
    const [countResult] = await pool.query('SELECT COUNT(*) as count FROM daycare_finder');
    console.log(`\nTotal Records: ${countResult[0].count}`);
    
    return true;
  } catch (err) {
    console.error('Error showing table structure:', err);
    return false;
  }
}

// Main function
async function main() {
  console.log('Starting daycare_finder structure optimization...');
  
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Step 1: Add age group indicator columns
    await addAgeGroupColumns(pool);
    
    // Step 2: Add any missing program type columns
    await addMissingProgramColumns(pool);
    
    // Step 3: Remove unused fields
    await removeUnusedFields(pool);
    
    // Step 4: Update age group indicators
    await updateAgeGroupIndicators(pool);
    
    // Step 5: Update program indicators for new columns
    const updatedCount = await updateProgramIndicators(pool);
    console.log(`Updated ${updatedCount} records with program indicators`);
    
    // Step 6: Show the optimized table structure
    await showTableStructure(pool);
    
    console.log('\nDaycare finder table structure optimized successfully!');
  } catch (err) {
    console.error('Error optimizing table structure:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  main().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

module.exports = {
  addAgeGroupColumns,
  addMissingProgramColumns,
  removeUnusedFields,
  updateAgeGroupIndicators,
  updateProgramIndicators
};