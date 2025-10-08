/**
 * Create Revised Non-Compliance Table
 * 
 * This script creates a new table called 'revised_non_compliance' based on the 'non_compliance' table,
 * with reclassified risk levels using NLP analysis of the standard descriptions.
 * 
 * The categorization and risk level adjustment is based on actual analysis of the database content.
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

// Define categories and keywords based on actual data analysis
const CATEGORIES = {
  'Safety': [
    'safety', 'hazard', 'emergency', 'fire', 'supervision', 'supervised', 
    'injury', 'danger', 'accident', 'secure', 'evacuation', 'drowning',
    'poison', 'toxic', 'choking', 'burn', 'electrical', 'fence', 'fall',
    'playground', 'ratio', 'first aid', 'CPR', 'proximity', 'visual awareness',
    'auditory', 'firearms', 'weapon', 'rescue', 'security'
  ],
  
  'Health': [
    'health', 'medical', 'medication', 'medicine', 'illness', 'disease', 
    'infection', 'immunization', 'vaccination', 'allergy', 'allergic', 
    'sanitary', 'hygiene', 'clean', 'sanitize', 'diaper', 'handwashing',
    'nutrition', 'food', 'feeding', 'breast milk', 'formula', 'menu',
    'physician', 'prescription', 'nurse', 'doctor', 'heat', 'cold', 'hearing',
    'vision', 'screening', 'physical'
  ],
  
  'Child Well-being': [
    'abuse', 'neglect', 'discipline', 'punishment', 'emotional', 'development',
    'restriction', 'restraint', 'guidance', 'behavior', 'wellbeing', 'timeout',
    'child rights', 'mental health', 'trauma', 'prohibited', 'maltreatment', 
    'corporal', 'psychological', 'comfort', 'nurturing', 'loving', 'caring'
  ],
  
  'Paperwork': [
    'record', 'document', 'report', 'form', 'file', 'admission', 'information',
    'notification', 'statement', 'signed', 'signature', 'verification', 'receipt',
    'plan', 'policy', 'procedure', 'documentation', 'maintained', 'available',
    'posting', 'posted', 'registration', 'permit', 'license', 'certificate'
  ],
  
  'Facility': [
    'facility', 'building', 'grounds', 'equipment', 'furnishing', 'maintenance',
    'repair', 'floor', 'ceiling', 'wall', 'bathroom', 'kitchen', 'storage',
    'door', 'window', 'lighting', 'ventilation', 'temperature', 'space',
    'square feet', 'structure', 'surfacing', 'loose-fill', 'impact'
  ],
  
  'Administrative': [
    'training', 'orientation', 'annual', 'hours', 'caregiver', 'employee',
    'personnel', 'director', 'staff', 'qualification', 'background check',
    'professional development', 'experience', 'education', 'clock hours',
    'schedule', 'ratio', 'group size', 'requirement', 'compliance'
  ],
  
  'Transportation': [
    'transportation', 'vehicle', 'car', 'bus', 'van', 'field trip',
    'seat belt', 'car seat', 'booster', 'driver', 'license', 'insurance'
  ],
  
  'Sleep/Rest': [
    'sleep', 'nap', 'rest', 'crib', 'mattress', 'bedding', 'blanket',
    'pillow', 'SIDS', 'sudden infant death', 'restrictive device'
  ]
};

// High severity indicators regardless of category
const HIGH_SEVERITY_INDICATORS = [
  'immediate danger', 'serious', 'severe', 'critical', 'emergency',
  'abuse', 'neglect', 'unsupervised', 'fail to supervise',
  'background check', 'criminal history', 'unsecured', 'unprotected',
  'fire inspection', 'fire safety', 'weapons', 'firearms',
  'serious injury', 'drowning', 'fall', 'medication error'
];

// Low severity indicators regardless of category
const LOW_SEVERITY_INDICATORS = [
  'post', 'display', 'sign', 'label', 'report number', 'admission date',
  'operational policies', 'current employees', 'affidavit', 'update',
  'name of director', 'telephone number', 'documentation of'
];

// Count keyword matches in text
function countCategoryMatches(text, categoryMap) {
  const counts = {};
  
  if (!text) return { bestCategory: 'Unknown', counts: {} };
  
  text = text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryMap)) {
    counts[category] = 0;
    
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        counts[category]++;
      }
    }
  }
  
  // Find the category with the most matches
  let bestCategory = 'Unknown';
  let highestCount = 0;
  
  for (const [category, count] of Object.entries(counts)) {
    if (count > highestCount) {
      highestCount = count;
      bestCategory = category;
    }
  }
  
  // If no strong match found, use standard number prefix to determine category
  if (highestCount === 0) {
    if (text.includes('746.5101') || text.includes('747.5101')) return { bestCategory: 'Safety', counts };
    if (text.includes('746.34') || text.includes('747.34')) return { bestCategory: 'Facility', counts };
    if (text.includes('746.130') || text.includes('747.130')) return { bestCategory: 'Administrative', counts };
    if (text.includes('746.60') || text.includes('747.60')) return { bestCategory: 'Paperwork', counts };
    if (text.includes('746.280') || text.includes('747.280')) return { bestCategory: 'Sleep/Rest', counts };
    if (text.includes('746.36') || text.includes('747.36')) return { bestCategory: 'Health', counts };
  }
  
  return { bestCategory, counts };
}

// Determine the severity level based on description
function determineRiskSeverity(description, originalRisk) {
  if (!description) return originalRisk;
  
  description = description.toLowerCase();
  
  // First check for high severity indicators
  for (const indicator of HIGH_SEVERITY_INDICATORS) {
    if (description.includes(indicator.toLowerCase())) {
      return 'High';
    }
  }
  
  // Then check for low severity indicators
  for (const indicator of LOW_SEVERITY_INDICATORS) {
    if (description.includes(indicator.toLowerCase())) {
      return 'Low';
    }
  }
  
  // Otherwise use original risk
  return originalRisk;
}

// Function to determine the revised risk level
function determineRevisedRiskLevel(standardDescription, originalRiskLevel) {
  if (!originalRiskLevel || originalRiskLevel === 'Unspecified') {
    return originalRiskLevel;
  }
  
  // Determine the category of the standard
  const { bestCategory } = countCategoryMatches(standardDescription, CATEGORIES);
  
  // Determine baseline severity
  const severity = determineRiskSeverity(standardDescription, originalRiskLevel);
  
  // Apply category-specific rules for risk level adjustment
  switch (bestCategory) {
    case 'Safety':
      // Safety issues generally maintain high risk ratings
      if (originalRiskLevel === 'High') return 'High';
      if (severity === 'High') return 'High';
      return originalRiskLevel;
    
    case 'Health':
      // Health concerns maintain medium-high to high ratings
      if (originalRiskLevel === 'High') return 'High';
      if (severity === 'High') return 'High';
      if (originalRiskLevel === 'Medium High') return 'Medium High';
      if (originalRiskLevel === 'Medium' && 
          (standardDescription.includes('medication') || 
           standardDescription.includes('allergy'))) {
        return 'Medium High';
      }
      return originalRiskLevel;
    
    case 'Child Well-being':
      // Child well-being maintains high severity
      if (originalRiskLevel === 'High') return 'High';
      if (severity === 'High') return 'High';
      return originalRiskLevel;
    
    case 'Paperwork':
      // Paperwork issues are generally downgraded
      if (originalRiskLevel === 'High') return 'Medium';
      if (originalRiskLevel === 'Medium High') return 'Medium';
      if (originalRiskLevel === 'Medium' && severity === 'Low') return 'Medium Low';
      return originalRiskLevel;
    
    case 'Facility':
      // Facility issues adjusted based on safety impact
      if (severity === 'High') return originalRiskLevel;
      if (originalRiskLevel === 'High' && 
          !standardDescription.includes('fire') && 
          !standardDescription.includes('hazard')) {
        return 'Medium High';
      }
      if (originalRiskLevel === 'Medium High' && severity === 'Low') {
        return 'Medium';
      }
      return originalRiskLevel;
    
    case 'Administrative':
      // Administrative issues generally downgraded
      if (originalRiskLevel === 'High' && !standardDescription.includes('background check')) {
        return 'Medium High';
      }
      if (originalRiskLevel === 'Medium High' && 
          (standardDescription.includes('orientation') ||
           standardDescription.includes('clock hours') ||
           standardDescription.includes('annual training'))) {
        return 'Medium';
      }
      return originalRiskLevel;
    
    case 'Transportation':
      // Transportation issues maintain risk level due to safety implications
      return originalRiskLevel;
    
    case 'Sleep/Rest':
      // Sleep safety is critical for infants
      if (standardDescription.includes('infant') || 
          standardDescription.includes('crib') ||
          standardDescription.includes('SIDS')) {
        return 'High';
      }
      return originalRiskLevel;
    
    default:
      // Default behavior: keep original risk level
      return originalRiskLevel;
  }
}

// Create the revised_non_compliance table
async function createRevisedTable(pool) {
  console.log('Creating revised_non_compliance table...');
  
  try {
    // First check if the table already exists
    const [tables] = await pool.query(
      "SHOW TABLES LIKE 'revised_non_compliance'"
    );
    
    if (tables.length > 0) {
      console.log('Table revised_non_compliance already exists, dropping it...');
      await pool.query('DROP TABLE revised_non_compliance');
    }
    
    // Create the table based on the non_compliance structure, adding new columns
    await pool.query(`
      CREATE TABLE revised_non_compliance (
        id INT NOT NULL AUTO_INCREMENT,
        NON_COMPLIANCE_ID VARCHAR(255),
        OPERATION_ID VARCHAR(50) NOT NULL,
        ACTIVITY_ID VARCHAR(50),
        SECTION_ID VARCHAR(50),
        STANDARD_NUMBER_DESCRIPTION TEXT,
        STANDARD_RISK_LEVEL VARCHAR(50),
        NARRATIVE TEXT,
        TECHNICAL_ASSISTANCE_GIVEN VARCHAR(10),
        CORRECTED_AT_INSPECTION VARCHAR(10),
        CORRECTED_DATE DATE,
        DATE_CORRECTION_VERIFIED DATE,
        ACTIVITY_DATE DATE,
        LAST_UPDATED TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        REVISED_RISK_LEVEL VARCHAR(50),
        CATEGORY VARCHAR(50),
        PRIMARY KEY (id),
        UNIQUE KEY (NON_COMPLIANCE_ID),
        INDEX (OPERATION_ID),
        INDEX (STANDARD_RISK_LEVEL),
        INDEX (REVISED_RISK_LEVEL),
        INDEX (CATEGORY)
      )
    `);
    
    console.log('Table created successfully!');
    return true;
  } catch (err) {
    console.error('Error creating table:', err.message);
    return false;
  }
}

// Process records in batches to avoid memory issues
async function processRecordsInBatches(pool, batchSize = 1000) {
  console.log(`Processing records in batches of ${batchSize}...`);
  
  try {
    // Get total count
    const [countResult] = await pool.query('SELECT COUNT(*) as count FROM non_compliance');
    const totalRecords = countResult[0].count;
    console.log(`Total records to process: ${totalRecords}`);
    
    // Initialize counters for statistics
    const stats = {
      processed: 0,
      changed: 0,
      categories: {},
      originalRiskLevels: {},
      revisedRiskLevels: {},
      riskChanges: {}
    };
    
    // Process in batches
    let offset = 0;
    const totalBatches = Math.ceil(totalRecords / batchSize);
    
    while (offset < totalRecords) {
      console.log(`Processing batch ${Math.floor(offset / batchSize) + 1} of ${totalBatches}...`);
      
      // Get a batch of records
      const [records] = await pool.query(
        'SELECT * FROM non_compliance LIMIT ? OFFSET ?',
        [batchSize, offset]
      );
      
      if (records.length === 0) {
        break; // No more records
      }
      
      // Process each record
      const values = [];
      const placeholders = [];
      
      for (const record of records) {
        const { bestCategory } = countCategoryMatches(record.STANDARD_NUMBER_DESCRIPTION, CATEGORIES);
        const revisedRiskLevel = determineRevisedRiskLevel(
          record.STANDARD_NUMBER_DESCRIPTION, 
          record.STANDARD_RISK_LEVEL
        );
        
        // Update statistics
        stats.processed++;
        
        // Track categories
        stats.categories[bestCategory] = (stats.categories[bestCategory] || 0) + 1;
        
        // Track risk levels
        stats.originalRiskLevels[record.STANDARD_RISK_LEVEL || 'Unknown'] = 
          (stats.originalRiskLevels[record.STANDARD_RISK_LEVEL || 'Unknown'] || 0) + 1;
        
        stats.revisedRiskLevels[revisedRiskLevel || 'Unknown'] = 
          (stats.revisedRiskLevels[revisedRiskLevel || 'Unknown'] || 0) + 1;
        
        // Track risk level changes
        if (record.STANDARD_RISK_LEVEL !== revisedRiskLevel) {
          stats.changed++;
          
          const changeKey = `${record.STANDARD_RISK_LEVEL || 'Unknown'} → ${revisedRiskLevel || 'Unknown'}`;
          stats.riskChanges[changeKey] = (stats.riskChanges[changeKey] || 0) + 1;
        }
        
        // Add to values for batch insert
        values.push(
          record.NON_COMPLIANCE_ID, 
          record.OPERATION_ID,
          record.ACTIVITY_ID,
          record.SECTION_ID,
          record.STANDARD_NUMBER_DESCRIPTION,
          record.STANDARD_RISK_LEVEL,
          record.NARRATIVE,
          record.TECHNICAL_ASSISTANCE_GIVEN,
          record.CORRECTED_AT_INSPECTION,
          record.CORRECTED_DATE,
          record.DATE_CORRECTION_VERIFIED,
          record.ACTIVITY_DATE,
          record.LAST_UPDATED,
          revisedRiskLevel,
          bestCategory
        );
        
        placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      }
      
      // Insert the batch
      if (values.length > 0) {
        const sql = `
          INSERT INTO revised_non_compliance (
            NON_COMPLIANCE_ID, OPERATION_ID, ACTIVITY_ID, SECTION_ID, 
            STANDARD_NUMBER_DESCRIPTION, STANDARD_RISK_LEVEL, NARRATIVE,
            TECHNICAL_ASSISTANCE_GIVEN, CORRECTED_AT_INSPECTION, 
            CORRECTED_DATE, DATE_CORRECTION_VERIFIED, ACTIVITY_DATE,
            LAST_UPDATED, REVISED_RISK_LEVEL, CATEGORY
          ) VALUES ${placeholders.join(', ')}
        `;
        
        await pool.query(sql, values);
      }
      
      offset += batchSize;
      console.log(`Progress: ${Math.min(offset, totalRecords)}/${totalRecords} records (${Math.round(Math.min(offset, totalRecords) / totalRecords * 100)}%)`);
    }
    
    return stats;
  } catch (err) {
    console.error('Error processing records:', err.message);
    throw err;
  }
}

// Generate a report of the revisions
async function generateReport(stats) {
  const reportPath = path.join(__dirname, '../reports/risk_level_revision_report.txt');
  
  // Ensure directory exists
  const reportsDir = path.dirname(reportPath);
  await fs.mkdir(reportsDir, { recursive: true }).catch(() => {});
  
  const changePercentage = (stats.changed / stats.processed) * 100;
  
  let report = "DAYCARE VIOLATION RATING REVISION REPORT\n";
  report += "=".repeat(50) + "\n\n";
  
  report += "SUMMARY:\n";
  report += `Total violations analyzed: ${stats.processed}\n`;
  report += `Total ratings changed: ${stats.changed} (${changePercentage.toFixed(2)}%)\n\n`;
  
  report += "CATEGORY DISTRIBUTION:\n";
  Object.entries(stats.categories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      const percentage = (count / stats.processed) * 100;
      report += `${category}: ${count} violations (${percentage.toFixed(2)}%)\n`;
    });
  report += "\n";
  
  report += "ORIGINAL RISK LEVEL DISTRIBUTION:\n";
  Object.entries(stats.originalRiskLevels)
    .sort((a, b) => b[1] - a[1])
    .forEach(([level, count]) => {
      const percentage = (count / stats.processed) * 100;
      report += `${level}: ${count} violations (${percentage.toFixed(2)}%)\n`;
    });
  report += "\n";
  
  report += "REVISED RISK LEVEL DISTRIBUTION:\n";
  Object.entries(stats.revisedRiskLevels)
    .sort((a, b) => b[1] - a[1])
    .forEach(([level, count]) => {
      const percentage = (count / stats.processed) * 100;
      report += `${level}: ${count} violations (${percentage.toFixed(2)}%)\n`;
    });
  report += "\n";
  
  report += "RISK LEVEL CHANGES:\n";
  Object.entries(stats.riskChanges)
    .sort((a, b) => b[1] - a[1])
    .forEach(([change, count]) => {
      const percentage = (count / stats.changed) * 100;
      report += `${change}: ${count} violations (${percentage.toFixed(2)}% of changes)\n`;
    });
  
  await fs.writeFile(reportPath, report);
  return reportPath;
}

// Main function
async function main() {
  console.log('=== Creating Revised Non-Compliance Table ===');
  
  // Create connection pool
  console.log('Connecting to database...');
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Create the revised table structure
    const tableCreated = await createRevisedTable(pool);
    if (!tableCreated) {
      console.error('Could not create revised table. Exiting...');
      return;
    }
    
    // Process the records
    console.log('Processing records from non_compliance table...');
    const stats = await processRecordsInBatches(pool);
    
    // Generate a report
    console.log('Generating revision report...');
    const reportPath = await generateReport(stats);
    
    console.log(`\nProcess completed successfully!`);
    console.log(`Total records processed: ${stats.processed}`);
    console.log(`Records with changed risk levels: ${stats.changed} (${(stats.changed / stats.processed * 100).toFixed(2)}%)`);
    console.log(`Report saved to: ${reportPath}`);
    
    // Print top 5 changes
    console.log('\nTop 5 risk level changes:');
    Object.entries(stats.riskChanges)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([change, count], i) => {
        console.log(`${i+1}. ${change}: ${count} violations`);
      });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(console.error);