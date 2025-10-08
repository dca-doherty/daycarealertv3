/**
 * This script updates sample parent_recommendations in the risk_analysis table for testing.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

// Import recommendations template data
const { RECOMMENDATION_TEMPLATES } = require('./scripts/enhanced_risk_factors');

// Sample daycares to update
const SAMPLE_DAYCARES = [
  {
    id: '1390588', // Visionary Montessori Academy at Main
    type: 'montessori',
    recommendations: [
      "Ask about their Montessori curriculum and the specific materials used in each classroom",
      "Inquire about teacher training and certification in Montessori principles",
      "Ask about how they assess child progress without traditional testing methods",
      "Discuss how they handle transitions between focused work periods",
      "Ask about their mixed-age grouping philosophy and implementation",
      "Inquire about their approach to discipline and guidance in line with Montessori principles",
      "Ask how they balance freedom and structure in the classroom environment",
      "Discuss their policy on screen time and technology use in a Montessori setting",
      "Ask about parent education opportunities related to Montessori philosophy",
      "Inquire about their illness policy and specific symptoms that require staying home"
    ]
  },
  {
    id: '1469898', // My Learning Tree Academy LLC
    type: 'learning',
    recommendations: [
      "Ask about their curriculum and daily learning activities for each age group",
      "Inquire about their approach to early literacy and language development",
      "Ask about their assessment process and how they track developmental progress",
      "Discuss how teachers communicate learning milestones with parents",
      "Ask about their teacher qualifications and training related to early education",
      "Inquire about their balance between play-based and structured learning",
      "Ask about their approach to STEM activities for young children",
      "Discuss their policy on homework or home reinforcement activities",
      "Ask about special learning programs or enrichment activities offered",
      "Inquire about how they accommodate different learning styles and abilities"
    ]
  },
  {
    id: '230682', // Meadow Oaks Academy
    type: 'academy',
    recommendations: [
      "Ask about their academic standards and how they compare to local schools",
      "Inquire about their approach to standardized test preparation",
      "Ask about their curriculum for core subjects like math, reading, and science",
      "Discuss teacher qualifications and ongoing professional development",
      "Ask about class sizes and student-to-teacher ratios in each grade",
      "Inquire about their approach to homework and academic expectations",
      "Ask about enrichment programs in arts, music, or foreign languages",
      "Discuss their technology integration in the classroom",
      "Ask about their approach to supporting both advanced and struggling students",
      "Inquire about their illness policy and how absences affect academic progress"
    ]
  },
  {
    id: '1246630', // Xplor
    type: 'specialty',
    recommendations: [
      "Ask about their specialty curriculum or focus areas that set them apart",
      "Inquire about their unique approach to child development or education",
      "Ask about special programs or enrichment activities they offer",
      "Discuss any partnerships with community organizations or specialists",
      "Ask about their approach to outdoor exploration and nature-based learning",
      "Inquire about any special certifications or training their staff receives",
      "Ask about their food program and approach to nutrition education",
      "Discuss their policy on field trips and community engagement",
      "Ask about their approach to cultural diversity and inclusion",
      "Inquire about their documentation and assessment of non-traditional learning"
    ]
  }
];

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Update parent recommendations for sample daycares
async function updateSampleRecommendations() {
  console.log('Starting sample recommendations update...');
  
  // Create database connection
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');
    
    // Process each sample daycare
    for (const daycare of SAMPLE_DAYCARES) {
      console.log(`Processing daycare ID ${daycare.id}...`);
      
      // Check if daycare exists in risk_analysis table
      const [exists] = await connection.execute(
        'SELECT COUNT(*) as count FROM risk_analysis WHERE operation_id = ?',
        [daycare.id]
      );
      
      // Add general recommendations to the specific ones
      const recommendations = [
        ...daycare.recommendations, 
        ...RECOMMENDATION_TEMPLATES.health.slice(0, 2)
      ];
      
      if (exists[0].count > 0) {
        // Update existing record
        console.log(`Updating existing record for daycare ${daycare.id}`);
        await connection.execute(
          'UPDATE risk_analysis SET parent_recommendations = ? WHERE operation_id = ?',
          [JSON.stringify(recommendations), daycare.id]
        );
      } else {
        // Create new record
        console.log(`Creating new record for daycare ${daycare.id}`);
        await connection.execute(
          'INSERT INTO risk_analysis (operation_id, parent_recommendations, last_updated) VALUES (?, ?, NOW())',
          [daycare.id, JSON.stringify(recommendations)]
        );
      }
      
      console.log(`Successfully updated recommendations for daycare ${daycare.id}`);
    }
    
    console.log('Sample recommendations update completed successfully!');
  } catch (error) {
    console.error('Error updating sample recommendations:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the update
updateSampleRecommendations().catch(console.error);