/**
 * Update Test Daycare Recommendations
 * 
 * This script updates parent_recommendations for specified test daycares
 * to ensure they have proper, custom recommendations.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Test daycares with their custom recommendations
const TEST_DAYCARES = [
  {
    id: '1390588', // Visionary Montessori Academy at Main
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
  },
  {
    id: '483709', // Happy Kids Child Care
    recommendations: [
      "Ask about their daily schedule and how they balance structured activities with free play",
      "Inquire about their approach to positive discipline and behavior management",
      "Ask about their methods for keeping parents informed about their child's day",
      "Discuss their staff-to-child ratios throughout the day",
      "Ask about their health and safety protocols for illness prevention",
      "Inquire about the qualifications and tenure of their teaching staff",
      "Ask about their approach to early childhood education and school readiness",
      "Discuss how they handle separation anxiety, especially for new children",
      "Ask about their outdoor play policies and facilities",
      "Inquire about how they accommodate children with different needs or temperaments"
    ]
  }
];

async function updateTestRecommendations() {
  console.log('Starting update of test daycare recommendations...');
  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');
    
    // Update each test daycare
    for (const daycare of TEST_DAYCARES) {
      try {
        console.log(`Updating daycare #${daycare.id}...`);
        
        // Check if record exists in risk_analysis
        const [existing] = await connection.execute(
          'SELECT COUNT(*) as count FROM risk_analysis WHERE operation_id = ?',
          [daycare.id]
        );
        
        const recommendationsJson = JSON.stringify(daycare.recommendations);
        
        if (existing[0].count > 0) {
          // Update existing record
          await connection.execute(
            'UPDATE risk_analysis SET parent_recommendations = ? WHERE operation_id = ?',
            [recommendationsJson, daycare.id]
          );
          console.log(`Updated existing record for daycare #${daycare.id}`);
        } else {
          // Create new record
          await connection.execute(
            'INSERT INTO risk_analysis (operation_id, parent_recommendations, last_updated) VALUES (?, ?, NOW())',
            [daycare.id, recommendationsJson]
          );
          console.log(`Created new record for daycare #${daycare.id}`);
        }
        
        // Verify the update
        const [verification] = await connection.execute(
          'SELECT parent_recommendations FROM risk_analysis WHERE operation_id = ?',
          [daycare.id]
        );
        
        if (verification.length > 0) {
          console.log(`Verification: Recommendations for daycare #${daycare.id} are now in the database`);
          console.log(`Type: ${typeof verification[0].parent_recommendations}`);
          
          try {
            const parsed = JSON.parse(verification[0].parent_recommendations);
            console.log(`Contains ${parsed.length} recommendations`);
          } catch (e) {
            console.log(`Note: Content is not parseable JSON - stored as: ${verification[0].parent_recommendations.substring(0, 50)}...`);
          }
        } else {
          console.log(`Warning: Could not verify daycare #${daycare.id}`);
        }
      } catch (error) {
        console.error(`Error updating daycare #${daycare.id}:`, error);
      }
    }
    
    console.log('\nTest daycare recommendations update completed!');
    
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
updateTestRecommendations().catch(console.error);