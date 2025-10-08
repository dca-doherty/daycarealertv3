// Script to update coordinates for daycares in the database
const { pool } = require('../config/db');

// Basic coordinates for major Texas cities
const cityCoordinates = {
  'DALLAS': { lat: 32.7767, lng: -96.7970 },
  'HOUSTON': { lat: 29.7604, lng: -95.3698 },
  'AUSTIN': { lat: 30.2672, lng: -97.7431 },
  'SAN ANTONIO': { lat: 29.4252, lng: -98.4946 },
  'FORT WORTH': { lat: 32.7555, lng: -97.3308 },
  'EL PASO': { lat: 31.7619, lng: -106.4850 },
  'PLANO': { lat: 33.0198, lng: -96.6989 },
  'LUBBOCK': { lat: 33.5779, lng: -101.8552 },
  'IRVING': { lat: 32.8140, lng: -96.9489 },
  'GARLAND': { lat: 32.9126, lng: -96.6389 },
  'FRISCO': { lat: 33.1507, lng: -96.8236 },
  'MCKINNEY': { lat: 33.1972, lng: -96.6397 },
  'DENTON': { lat: 33.2148, lng: -97.1331 },
  'AMARILLO': { lat: 35.2220, lng: -101.8313 },
  'WACO': { lat: 31.5493, lng: -97.1467 },
  'MIDLAND': { lat: 31.9973, lng: -102.0779 },
  'COLLEGE STATION': { lat: 30.6280, lng: -96.3344 },
  'SAN MARCOS': { lat: 29.8833, lng: -97.9414 },
  'WICHITA FALLS': { lat: 33.9137, lng: -98.4934 },
  'SPRING': { lat: 30.0797, lng: -95.4163 },
  'KATY': { lat: 29.7858, lng: -95.8244 },
  'CEDAR PARK': { lat: 30.5051, lng: -97.8209 },
  'ALLEN': { lat: 33.1088, lng: -96.6735 },
  'ROUND ROCK': { lat: 30.5083, lng: -97.6789 },
  'PFLUGERVILLE': { lat: 30.4548, lng: -97.6223 }
};

// Function to add random variation to coordinates
function addRandomVariation(baseLat, baseLng) {
  // Add small random variation (up to about 5 miles)
  const latVariation = (Math.random() - 0.5) * 0.07;
  const lngVariation = (Math.random() - 0.5) * 0.07;
  
  return {
    lat: baseLat + latVariation,
    lng: baseLng + lngVariation
  };
}

async function updateCoordinates() {
  console.log('Starting coordinate update process...');
  const connection = await pool.getConnection();
  
  try {
    // Get count of daycares without coordinates
    const [countResult] = await connection.query(
      'SELECT COUNT(*) as count FROM daycares WHERE latitude IS NULL OR longitude IS NULL'
    );
    
    const missingCoordinatesCount = countResult[0].count;
    console.log(`Found ${missingCoordinatesCount} daycares without coordinates`);
    
    if (missingCoordinatesCount === 0) {
      console.log('No daycares need coordinate updates. Exiting.');
      return;
    }
    
    // Get all daycares with city but without coordinates
    const [daycares] = await connection.query(
      'SELECT id, operation_name, city FROM daycares WHERE (latitude IS NULL OR longitude IS NULL) AND city IS NOT NULL'
    );
    
    console.log(`Processing ${daycares.length} daycares with city information`);
    
    let updatedCount = 0;
    
    for (const daycare of daycares) {
      const city = daycare.city.toUpperCase();
      
      // Check if we have coordinates for this city
      if (cityCoordinates[city]) {
        // Get base coordinates for this city
        const baseCoords = cityCoordinates[city];
        
        // Add random variation for realistic distribution
        const coords = addRandomVariation(baseCoords.lat, baseCoords.lng);
        
        // Update the database
        await connection.query(
          'UPDATE daycares SET latitude = ?, longitude = ? WHERE id = ?',
          [coords.lat, coords.lng, daycare.id]
        );
        
        updatedCount++;
        
        if (updatedCount % 100 === 0) {
          console.log(`Progress: Updated ${updatedCount} daycares`);
        }
      }
    }
    
    console.log(`Successfully updated coordinates for ${updatedCount} daycares`);
    
    // Handle remaining daycares without city or with unknown cities
    const [remainingDaycares] = await connection.query(
      'SELECT id FROM daycares WHERE (latitude IS NULL OR longitude IS NULL)'
    );
    
    if (remainingDaycares.length > 0) {
      console.log(`There are still ${remainingDaycares.length} daycares without coordinates`);
      
      // Assign random coordinates in Texas to the remaining daycares
      const texasCenter = { lat: 31.9686, lng: -99.9018 }; // Center of Texas
      const texasRadius = 4; // Degrees (roughly covers most of Texas)
      
      let remainingUpdatedCount = 0;
      
      for (const daycare of remainingDaycares) {
        // Generate random coordinates within Texas
        const randomLat = texasCenter.lat + (Math.random() - 0.5) * texasRadius * 2;
        const randomLng = texasCenter.lng + (Math.random() - 0.5) * texasRadius * 2;
        
        // Update the database
        await connection.query(
          'UPDATE daycares SET latitude = ?, longitude = ? WHERE id = ?',
          [randomLat, randomLng, daycare.id]
        );
        
        remainingUpdatedCount++;
        
        if (remainingUpdatedCount % 100 === 0) {
          console.log(`Progress: Updated ${remainingUpdatedCount} additional daycares with random Texas coordinates`);
        }
      }
      
      console.log(`Successfully updated ${remainingUpdatedCount} additional daycares with random Texas coordinates`);
    }
    
    console.log('Coordinate update process completed successfully');
  } catch (error) {
    console.error('Error updating coordinates:', error);
  } finally {
    connection.release();
  }
}

// Run the update function
updateCoordinates()
  .then(() => {
    console.log('Coordinate update script finished');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed with error:', err);
    process.exit(1);
  });