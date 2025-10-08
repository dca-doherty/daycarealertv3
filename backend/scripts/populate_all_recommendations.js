/**
 * Populate Parent Recommendations for All Daycares
 * 
 * This script populates the parent_recommendations field for all daycares in the risk_analysis table
 * with realistic, daycare-specific recommendations based on their operation type and other characteristics.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

// Import recommendations template data
const { RECOMMENDATION_TEMPLATES } = require('./enhanced_risk_factors');

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Specialized recommendation templates based on daycare type
const SPECIALIZED_TEMPLATES = {
  // For daycares with "infant" in their name or operation type
  infant: [
    "Ask about their safe sleep policies for infants and how they follow SIDS prevention guidelines",
    "Inquire about their feeding schedules and how they handle breast milk/formula storage",
    "Ask about their diaper changing procedures and how they prevent cross-contamination",
    "Discuss their policy on daily reports for infant activities, feedings, and diaper changes",
    "Ask about their staff-to-infant ratios and how individual attention is provided",
    "Inquire about how often toys and surfaces in the infant room are sanitized",
    "Ask about their procedures for comforting upset babies and handling separation anxiety",
    "Discuss their approach to infant developmental activities and stimulation",
    "Ask how they handle infant sleep schedules and nap routines",
    "Inquire about their emergency procedures specific to non-mobile infants"
  ],
  
  // For Montessori schools
  montessori: [
    "Ask about their adherence to Montessori principles and curriculum",
    "Inquire about the teachers' Montessori certification and training",
    "Ask about the age grouping of classrooms and mixed-age interaction",
    "Discuss their approach to self-directed learning and choice",
    "Ask about the specific Montessori materials available in each classroom",
    "Inquire about how they balance freedom and structure in the classroom",
    "Ask about their approach to teaching practical life skills",
    "Discuss how they handle assessment without traditional testing",
    "Ask about their philosophy on child-led vs. teacher-led activities",
    "Inquire about parent education opportunities regarding Montessori methods"
  ],
  
  // For religious affiliated centers
  religious: [
    "Ask about how religious education is integrated into the curriculum",
    "Inquire about religious observances and how they're celebrated",
    "Ask about their approach to teaching values and character development",
    "Discuss how they accommodate families of different faith backgrounds",
    "Ask about the balance between religious and secular education",
    "Inquire about the qualifications of staff teaching religious content",
    "Ask about prayer or worship activities during the day",
    "Discuss their approach to holidays from different traditions",
    "Ask about religious dietary restrictions or observations",
    "Inquire about how they handle difficult questions about faith from children"
  ],
  
  // For learning centers and academies
  learning: [
    "Ask about their curriculum framework and educational philosophy",
    "Inquire about how they assess learning progress and development",
    "Ask about the balance between academic preparation and play-based learning",
    "Discuss their approach to early literacy and language development",
    "Ask about their math and science educational activities",
    "Inquire about their teacher qualifications and educational backgrounds",
    "Ask about their approach to kindergarten readiness",
    "Discuss their policy on homework or home reinforcement activities",
    "Ask about enrichment programs or special classes offered",
    "Inquire about how they accommodate different learning styles"
  ]
};

// Get recommendations based on daycare characteristics
function generateRecommendationsForDaycare(daycare) {
  let recommendations = [];
  const specializedSets = [];
  
  // Check operation type for specialized templates
  const operationType = (daycare.OPERATION_TYPE || '').toLowerCase();
  const operationName = (daycare.OPERATION_NAME || '').toLowerCase();
  
  // Check for infant care
  if (operationType.includes('infant') || operationName.includes('infant') || operationName.includes('baby')) {
    specializedSets.push('infant');
  }
  
  // Check for Montessori
  if (operationType.includes('montessori') || operationName.includes('montessori')) {
    specializedSets.push('montessori');
  }
  
  // Check for religious affiliation
  if (operationName.includes('christian') || operationName.includes('catholic') || 
      operationName.includes('lutheran') || operationName.includes('baptist') ||
      operationName.includes('jewish') || operationName.includes('bible') ||
      operationName.includes('church') || operationName.includes('temple') ||
      operationName.includes('faith')) {
    specializedSets.push('religious');
  }
  
  // Check for learning centers/academies
  if (operationName.includes('learning') || operationName.includes('academy') || 
      operationName.includes('school') || operationName.includes('education') ||
      operationName.includes('prep') || operationName.includes('academic')) {
    specializedSets.push('learning');
  }
  
  // Add recommendations from specialized templates (5 from each relevant category)
  for (const templateType of specializedSets) {
    const templateRecs = SPECIALIZED_TEMPLATES[templateType] || [];
    // Add 5 items from this template to our recommendations
    recommendations = recommendations.concat(templateRecs.slice(0, 5));
  }
  
  // If we don't have enough specialized recommendations, add general ones
  if (recommendations.length < 5) {
    recommendations = recommendations.concat(RECOMMENDATION_TEMPLATES.general.slice(0, 5));
  }
  
  // Add some health & safety recommendations for all daycares
  recommendations = recommendations.concat(RECOMMENDATION_TEMPLATES.health.slice(0, 3));
  
  // Add safety recommendations
  recommendations = recommendations.concat(RECOMMENDATION_TEMPLATES.safety.slice(0, 2));
  
  // Ensure recommendations are unique and limit to 12 total
  const uniqueRecs = [...new Set(recommendations)].slice(0, 12);
  
  return uniqueRecs;
}

// Populate recommendations for all daycares
async function populateAllRecommendations() {
  console.log('Starting recommendation population for all daycares...');
  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');
    
    // Get all active daycares
    const [daycares] = await connection.execute(
      'SELECT OPERATION_ID, OPERATION_NAME, OPERATION_TYPE FROM daycare_operations WHERE OPERATION_STATUS = "Y"'
    );
    
    console.log(`Found ${daycares.length} active daycares`);
    
    // Process each daycare
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const daycare of daycares) {
      const operationId = daycare.OPERATION_ID;
      
      // Check if this daycare already has recommendations
      const [existing] = await connection.execute(
        'SELECT parent_recommendations FROM risk_analysis WHERE operation_id = ?',
        [operationId]
      );
      
      // Skip if recommendations already exist and aren't empty
      if (existing.length > 0 && 
          existing[0].parent_recommendations && 
          existing[0].parent_recommendations !== '[]' &&
          existing[0].parent_recommendations !== 'null') {
        // Check if it's valid
        try {
          const parsed = JSON.parse(existing[0].parent_recommendations);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`Skipping daycare #${operationId}: already has ${parsed.length} recommendations`);
            skipped++;
            continue;
          }
        } catch (e) {
          // Parse error means we should regenerate
          console.log(`Daycare #${operationId} has invalid JSON for parent_recommendations - regenerating`);
        }
      }
      
      try {
        // Generate custom recommendations for this daycare
        const recommendations = generateRecommendationsForDaycare(daycare);
        const recommendationsJson = JSON.stringify(recommendations);
        
        // Check if record exists in risk_analysis
        if (existing.length > 0) {
          // Update existing record
          await connection.execute(
            'UPDATE risk_analysis SET parent_recommendations = ? WHERE operation_id = ?',
            [recommendationsJson, operationId]
          );
        } else {
          // Create new record
          await connection.execute(
            'INSERT INTO risk_analysis (operation_id, parent_recommendations, last_updated) VALUES (?, ?, NOW())',
            [operationId, recommendationsJson]
          );
        }
        
        console.log(`Updated recommendations for daycare #${operationId} (${daycare.OPERATION_NAME})`);
        updated++;
      } catch (error) {
        console.error(`Error updating daycare #${operationId}:`, error);
        failed++;
      }
    }
    
    console.log('\nRecommendation Population Summary:');
    console.log(`Total daycares: ${daycares.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (already had recommendations): ${skipped}`);
    console.log(`Failed: ${failed}`);
    
  } catch (error) {
    console.error('Error in database operations:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the script
populateAllRecommendations().catch(console.error);