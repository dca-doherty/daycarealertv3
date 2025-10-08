// Script to add coordinates to daycare records
require('dotenv').config();
const mysql = require('mysql2/promise');

// Define city coordinates (approximate center points)
const CITY_COORDINATES = {
  'Dallas': { lat: 32.7767, lng: -96.7970 },
  'Fort Worth': { lat: 32.7555, lng: -97.3308 },
  'Austin': { lat: 30.2672, lng: -97.7431 },
  'Houston': { lat: 29.7604, lng: -95.3698 },
  'San Antonio': { lat: 29.4241, lng: -98.4936 },
  'Plano': { lat: 33.0198, lng: -96.6989 },
  'Irving': { lat: 32.8140, lng: -96.9489 },
  'Arlington': { lat: 32.7357, lng: -97.1081 },
  'Garland': { lat: 32.9126, lng: -96.6389 },
  'McKinney': { lat: 33.1972, lng: -96.6397 },
  'Frisco': { lat: 33.1507, lng: -96.8236 },
  'Denton': { lat: 33.2148, lng: -97.1331 },
  'Richardson': { lat: 32.9484, lng: -96.7299 },
  'Carrollton': { lat: 32.9756, lng: -96.8897 },
  'Lewisville': { lat: 33.0461, lng: -96.9944 },
  'Allen': { lat: 33.1031, lng: -96.6706 },
  'Flower Mound': { lat: 33.0145, lng: -97.0969 },
  'Cedar Park': { lat: 30.5051, lng: -97.8202 },
  'Euless': { lat: 32.8371, lng: -97.0841 },
  'Grapevine': { lat: 32.9342, lng: -97.0780 },
  'League City': { lat: 29.5074, lng: -95.0949 },
  'Sugar Land': { lat: 29.5994, lng: -95.6142 },
  'Katy': { lat: 29.7858, lng: -95.8245 },
  'Tyler': { lat: 32.3513, lng: -95.3010 },
  'Waco': { lat: 31.5493, lng: -97.1467 },
  'Round Rock': { lat: 30.5083, lng: -97.6789 }
};

// Function to add random variation to coordinates within a city
function randomizeCoordinates(baseLat, baseLng, maxDistance = 10) {
  // Convert miles to rough lat/lng offset (1 degree = ~69 miles)
  const maxLatOffset = maxDistance / 69;
  const maxLngOffset = maxDistance / (69 * Math.cos(baseLat * Math.PI / 180));
  
  // Add random offset in random direction
  const latOffset = (Math.random() * 2 - 1) * maxLatOffset;
  const lngOffset = (Math.random() * 2 - 1) * maxLngOffset;
  
  return {
    lat: baseLat + latOffset,
    lng: baseLng + lngOffset
  };
}

async function addCoordinates() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'daycarealert',
      multipleStatements: true
    });
    
    // Get count of daycares with cities we know
    const [cityRecords] = await connection.query(`
      SELECT city, COUNT(*) as count 
      FROM daycares 
      WHERE city IN (${Object.keys(CITY_COORDINATES).map(city => `'${city}'`).join(',')})
      GROUP BY city
    `);
    
    console.log('Daycares by city:');
    cityRecords.forEach(record => {
      console.log(`${record.city}: ${record.count} daycares`);
    });
    
    // Process each city
    for (const cityRecord of cityRecords) {
      const city = cityRecord.city;
      const baseCoords = CITY_COORDINATES[city];
      
      if (!baseCoords) continue;
      
      console.log(`Adding coordinates for ${cityRecord.count} daycares in ${city}...`);
      
      // Get daycares for this city that don't have coordinates
      const [daycares] = await connection.query(`
        SELECT id, operation_number, operation_name
        FROM daycares
        WHERE city = ? AND (latitude IS NULL OR longitude IS NULL)
        LIMIT 100
      `, [city]);
      
      // Add coordinates to each daycare
      for (const daycare of daycares) {
        const coords = randomizeCoordinates(baseCoords.lat, baseCoords.lng, 10);
        
        await connection.query(`
          UPDATE daycares
          SET latitude = ?, longitude = ?
          WHERE id = ?
        `, [coords.lat, coords.lng, daycare.id]);
        
        console.log(`  Updated ${daycare.operation_name} with coordinates: ${coords.lat}, ${coords.lng}`);
      }
    }
    
    // Get final count
    const [result] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM daycares 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `);
    
    console.log(`\nFinished! ${result[0].count} daycares now have coordinates.`);
    
  } catch (error) {
    console.error('Error updating daycare coordinates:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the function
addCoordinates()
  .then(() => console.log('Process completed.'))
  .catch(err => console.error('Error in main process:', err));