/**
 * Update Revised Non-Compliance Table
 * 
 * This script updates the revised_non_compliance table after the main daycare data update.
 * It only adds new non-compliance records that aren't already in the revised table.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

// Database configuration with Socket Connection for Production
const dbConfig = {
  socketPath: '/var/run/mysqld/mysqld.sock',  // Unix socket path
  user: 'root',
  password: 'Bd03021988!!',
  database: 'daycarealert',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Define categories and keywords
const CATEGORIES = {
  'Safety': [
    'safety', 'hazard', 'emergency', 'fire', 'supervision', 'supervised', 
    'injury', 'danger', 'accident', 'secure', 'evacuation', 'drowning',
    'poison', 'toxic', 'choking', 'burn', 'electrical', 'fence', 'fall',
    'playground', 'ratio', 'first aid', 'CPR'
  ],
  
  'Health': [
    'health', 'medical', 'medication', 'medicine', 'illness', 'disease', 
    'infection', 'immunization', 'vaccination', 'allergy', 'allergic', 
    'sanitary', 'hygiene', 'clean', 'sanitize', 'diaper', 'handwashing',
    'nutrition', 'food', 'feeding'
  ],
  
  'Administrative': [
    'training', 'orientation', 'annual', 'hours', 'caregiver', 'employee',
    'personnel', 'director', 'staff', 'qualification', 'background check',
    'clock hours', 'schedule', 'ratio', 'group size'
  ],
  
  'Paperwork': [
    'record', 'document', 'report', 'form', 'file', 'admission', 'information',
    'notification', 'statement', 'signed', 'signature', 'verification', 'receipt',
    'plan', 'policy', 'procedure', 'documentation', 'maintained', 'available'
  ],
  
  'Facility': [
    'facility', 'building', 'grounds', 'equipment', 'furnishing', 'maintenance',
    'repair', 'floor', 'ceiling', 'wall', 'bathroom', 'kitchen', 'storage'
  ]
};

// Count keyword matches
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
  
  return { bestCategory, counts };
}

// Main function
async function main() {
  console.log('=== Updating Revised Non-Compliance Table ===');
  console.log(new Date().toISOString());
  
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Get count of new records
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as count FROM non_compliance nc
      WHERE NOT EXISTS (
        SELECT 1 FROM revised_non_compliance rnc
        WHERE rnc.NON_COMPLIANCE_ID = nc.NON_COMPLIANCE_ID
      )
    `);
    
    const totalNewRecords = countResult[0].count;
    console.log(`Found ${totalNewRecords} new non-compliance records to process`);
    
    if (totalNewRecords === 0) {
      console.log('No new records to process.');
      return;
    }
    
    // Process in batches
    const batchSize = 1000;
    let processed = 0;
    
    while (processed < totalNewRecords) {
      // Get batch of new records
      const [records] = await pool.query(`
        SELECT nc.* FROM non_compliance nc
        WHERE NOT EXISTS (
          SELECT 1 FROM revised_non_compliance rnc
          WHERE rnc.NON_COMPLIANCE_ID = nc.NON_COMPLIANCE_ID
        )
        LIMIT ? OFFSET ?
      `, [batchSize, processed]);
      
      if (records.length === 0) break;
      
      // Process each record
      for (const record of records) {
        const { bestCategory } = countCategoryMatches(record.STANDARD_NUMBER_DESCRIPTION, CATEGORIES);
        
        // Keep original risk level for now (you can add risk adjustment logic later)
        const revisedRiskLevel = record.STANDARD_RISK_LEVEL;
        
        // Insert into revised table
        await pool.query(`
          INSERT INTO revised_non_compliance (
            NON_COMPLIANCE_ID, OPERATION_ID, ACTIVITY_ID, SECTION_ID, 
            STANDARD_NUMBER_DESCRIPTION, STANDARD_RISK_LEVEL, NARRATIVE,
            TECHNICAL_ASSISTANCE_GIVEN, CORRECTED_AT_INSPECTION, 
            CORRECTED_DATE, DATE_CORRECTION_VERIFIED, ACTIVITY_DATE,
            LAST_UPDATED, REVISED_RISK_LEVEL, CATEGORY
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          record.NON_COMPLIANCE_ID, record.OPERATION_ID, record.ACTIVITY_ID, 
          record.SECTION_ID, record.STANDARD_NUMBER_DESCRIPTION, 
          record.STANDARD_RISK_LEVEL, record.NARRATIVE,
          record.TECHNICAL_ASSISTANCE_GIVEN, record.CORRECTED_AT_INSPECTION,
          record.CORRECTED_DATE, record.DATE_CORRECTION_VERIFIED, 
          record.ACTIVITY_DATE, new Date(), revisedRiskLevel, bestCategory
        ]);
      }
      
      processed += records.length;
      console.log(`Processed ${processed}/${totalNewRecords} records (${Math.round(processed/totalNewRecords*100)}%)`);
    }
    
    console.log('Process completed successfully!');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(console.error);
