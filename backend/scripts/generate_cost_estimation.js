/**
 * Generate Daycare Cost Estimation Model
 * 
 * This script generates a monthly cost estimation model for daycares based on:
 * 1. Programmatic services offered
 * 2. Ages served (especially infant care)
 * 3. Risk factors and analysis
 * 4. Location and median income by ZIP/county
 * 5. Total capacity (facility size)
 * 6. Years in operation (experience)
 * 7. Hours/days of operation
 * 8. Other economic factors
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

// Base cost factors
const BASE_MONTHLY_COST = 800;  // Base monthly cost in dollars

// Age-related cost multipliers
const AGE_MULTIPLIERS = {
  infant: 1.5,      // Infants (0-17 months) cost 50% more
  toddler: 1.3,     // Toddlers (18-35 months) cost 30% more
  preschool: 1.15,  // Preschool (3-5 years) cost 15% more
  schoolAge: 1.0    // School age children (6+ years) baseline cost
};

// Service-based cost adjustments (percentages)
const SERVICE_ADJUSTMENTS = {
  transportation: 8,        // Transportation service
  extendedHours: 10,        // Extended/overnight hours
  meals: 7,                 // Meals provided
  specialNeeds: 15,         // Special needs accommodations
  languageImmersion: 12,    // Language immersion programs
  montessori: 25,           // Montessori curriculum
  religious: 5,             // Religious programs
  afterSchoolPrograms: 3,   // After school programs
  summerPrograms: 3,        // Summer programs
  enrichmentPrograms: 8,    // Art/music/STEM programs
};

// Operation type cost multipliers
const TYPE_MULTIPLIERS = {
  'Licensed Child Care Center': 1.0,    // baseline
  'Licensed Child-Care Home': 0.9,      // slightly lower costs
  'Licensed Child-Care Home (Group)': 0.95,
  'Registered Child-Care Home': 0.85,
  'Before or After-School Program': 0.75,
  'School-Age Program': 0.75,
  'Listed Family Home': 0.8,
  'Small Employer-Based Child Care': 0.9,
  'Temporary Shelter Child Care': 0.85,
  'Child-Placing Agency': 1.1,
  'Montessori': 1.3,
  'Early Head Start': 0.95,
  'Head Start Program': 0.95
};

// Risk score cost adjustments (discount for high-risk facilities)
const RISK_ADJUSTMENTS = [
  { threshold: 70, discount: 15 },   // High risk (15% discount)
  { threshold: 40, discount: 10 },   // Medium high risk (10% discount)
  { threshold: 20, discount: 5 },    // Medium risk (5% discount)
  { threshold: 10, discount: 0 },    // Low risk (no discount)
  { threshold: 0, premium: 5 }       // Very low risk (5% premium)
];

// Experience-based adjustments
const EXPERIENCE_ADJUSTMENTS = [
  { years: 0, adjustment: -5 },    // New facilities (discount to attract customers)
  { years: 2, adjustment: 0 },     // 2-5 years (baseline)
  { years: 5, adjustment: 3 },     // 5-10 years (small premium)
  { years: 10, adjustment: 5 },    // 10-15 years (medium premium)
  { years: 15, adjustment: 8 }     // 15+ years (larger premium)
];

// County/city median income categories
const LOCATION_ADJUSTMENTS = {
  highIncome: 25,     // High income areas (>$100k median household income)
  upperMiddle: 15,    // Upper middle income ($80k-$100k)
  middle: 0,          // Middle income ($60k-$80k) - baseline
  lowerMiddle: -10,   // Lower middle income ($40k-$60k)
  low: -20            // Low income areas (<$40k)
};

// Capacity-based adjustments (economies of scale)
function getCapacityAdjustment(capacity) {
  if (!capacity) return 0;
  
  if (capacity < 12) return 10;      // Small facilities (<12 children) - higher costs per child
  if (capacity < 30) return 5;       // Small-medium (12-29 children)
  if (capacity < 60) return 0;       // Medium (30-59 children) - baseline
  if (capacity < 100) return -5;     // Medium-large (60-99 children)
  return -10;                        // Large facilities (100+ children) - economies of scale
}

// Hours/days of operation adjustments
function getHoursAdjustment(hours, days) {
  let adjustment = 0;
  
  // Check for extended hours
  if (hours && hours.toLowerCase().includes('24 hour')) {
    adjustment += 15;  // 24-hour care
  } else if (hours) {
    const hourText = hours.toLowerCase();
    
    // Check for early morning hours
    if (hourText.includes('5:00') || hourText.includes('5 a') || 
        hourText.includes('5:30') || hourText.includes('5:45') ||
        hourText.includes('6:00')) {
      adjustment += 5;
    }
    
    // Check for late evening hours
    if (hourText.includes('7 p') || hourText.includes('7:') || 
        hourText.includes('8 p') || hourText.includes('8:') ||
        hourText.includes('9 p') || hourText.includes('9:')) {
      adjustment += 8;
    }
  }
  
  // Check for weekend operations
  if (days && (days.toLowerCase().includes('saturday') || days.toLowerCase().includes('sunday'))) {
    adjustment += 10;  // Weekend care
  }
  
  return adjustment;
}

// Parse median incomes from public data and ZIP codes
async function loadMedianIncomeData() {
  try {
    // First try to load from a local cache file
    try {
      const data = await fs.readFile(path.join(__dirname, 'median_income_data.json'), 'utf8');
      console.log('Loaded median income data from cache file');
      return JSON.parse(data);
    } catch (err) {
      // If file doesn't exist or can't be read, continue to API fetch
      console.log('No cached income data found, will create new dataset');
    }
    
    // Create a comprehensive dataset for all Texas counties
    // This would ideally come from Census API data in production
    const texasCountiesIncomeData = {
      counties: {
        'ANDERSON': { median_income: 45135, category: 'lowerMiddle' },
        'ANDREWS': { median_income: 76312, category: 'middle' },
        'ANGELINA': { median_income: 48429, category: 'lowerMiddle' },
        'ARANSAS': { median_income: 49845, category: 'lowerMiddle' },
        'ARCHER': { median_income: 67188, category: 'middle' },
        'ARMSTRONG': { median_income: 60659, category: 'middle' },
        'ATASCOSA': { median_income: 56207, category: 'lowerMiddle' },
        'AUSTIN': { median_income: 67934, category: 'middle' },
        'BAILEY': { median_income: 43500, category: 'lowerMiddle' },
        'BANDERA': { median_income: 62134, category: 'middle' },
        'BASTROP': { median_income: 69865, category: 'middle' },
        'BAYLOR': { median_income: 42237, category: 'lowerMiddle' },
        'BEE': { median_income: 43795, category: 'lowerMiddle' },
        'BELL': { median_income: 58276, category: 'lowerMiddle' },
        'BEXAR': { median_income: 61705, category: 'middle' },
        'BLANCO': { median_income: 68973, category: 'middle' },
        'BORDEN': { median_income: 67417, category: 'middle' },
        'BOSQUE': { median_income: 53782, category: 'lowerMiddle' },
        'BOWIE': { median_income: 48921, category: 'lowerMiddle' },
        'BRAZORIA': { median_income: 81447, category: 'upperMiddle' },
        'BRAZOS': { median_income: 51970, category: 'lowerMiddle' },
        'BREWSTER': { median_income: 46625, category: 'lowerMiddle' },
        'BRISCOE': { median_income: 39250, category: 'low' },
        'BROOKS': { median_income: 29658, category: 'low' },
        'BROWN': { median_income: 46136, category: 'lowerMiddle' },
        'BURLESON': { median_income: 57123, category: 'lowerMiddle' },
        'BURNET': { median_income: 62967, category: 'middle' },
        'CALDWELL': { median_income: 57830, category: 'lowerMiddle' },
        'CALHOUN': { median_income: 57270, category: 'lowerMiddle' },
        'CALLAHAN': { median_income: 51935, category: 'lowerMiddle' },
        'CAMERON': { median_income: 41123, category: 'lowerMiddle' },
        'CAMP': { median_income: 44043, category: 'lowerMiddle' },
        'CARSON': { median_income: 64279, category: 'middle' },
        'CASS': { median_income: 43780, category: 'lowerMiddle' },
        'CASTRO': { median_income: 43194, category: 'lowerMiddle' },
        'CHAMBERS': { median_income: 91141, category: 'upperMiddle' },
        'CHEROKEE': { median_income: 44168, category: 'lowerMiddle' },
        'CHILDRESS': { median_income: 42143, category: 'lowerMiddle' },
        'CLAY': { median_income: 58355, category: 'lowerMiddle' },
        'COCHRAN': { median_income: 38083, category: 'low' },
        'COKE': { median_income: 47250, category: 'lowerMiddle' },
        'COLEMAN': { median_income: 40938, category: 'lowerMiddle' },
        'COLLIN': { median_income: 105583, category: 'highIncome' },
        'COLLINGSWORTH': { median_income: 39762, category: 'low' },
        'COLORADO': { median_income: 51841, category: 'lowerMiddle' },
        'COMAL': { median_income: 82406, category: 'upperMiddle' },
        'COMANCHE': { median_income: 42772, category: 'lowerMiddle' },
        'CONCHO': { median_income: 45669, category: 'lowerMiddle' },
        'COOKE': { median_income: 61883, category: 'middle' },
        'CORYELL': { median_income: 52053, category: 'lowerMiddle' },
        'COTTLE': { median_income: 37250, category: 'low' },
        'CRANE': { median_income: 64115, category: 'middle' },
        'CROCKETT': { median_income: 55000, category: 'lowerMiddle' },
        'CROSBY': { median_income: 41429, category: 'lowerMiddle' },
        'CULBERSON': { median_income: 42411, category: 'lowerMiddle' },
        'DALLAM': { median_income: 47650, category: 'lowerMiddle' },
        'DALLAS': { median_income: 71839, category: 'middle' },
        'DAWSON': { median_income: 43611, category: 'lowerMiddle' },
        'DEAF SMITH': { median_income: 50400, category: 'lowerMiddle' },
        'DELTA': { median_income: 47115, category: 'lowerMiddle' },
        'DENTON': { median_income: 93573, category: 'upperMiddle' },
        'DEWITT': { median_income: 53272, category: 'lowerMiddle' },
        'DICKENS': { median_income: 38281, category: 'low' },
        'DIMMIT': { median_income: 32628, category: 'low' },
        'DONLEY': { median_income: 45625, category: 'lowerMiddle' },
        'DUVAL': { median_income: 38039, category: 'low' },
        'EASTLAND': { median_income: 43750, category: 'lowerMiddle' },
        'ECTOR': { median_income: 67361, category: 'middle' },
        'EDWARDS': { median_income: 42353, category: 'lowerMiddle' },
        'ELLIS': { median_income: 78118, category: 'middle' },
        'EL PASO': { median_income: 48292, category: 'lowerMiddle' },
        'ERATH': { median_income: 53500, category: 'lowerMiddle' },
        'FALLS': { median_income: 41833, category: 'lowerMiddle' },
        'FANNIN': { median_income: 53436, category: 'lowerMiddle' },
        'FAYETTE': { median_income: 60793, category: 'middle' },
        'FISHER': { median_income: 46141, category: 'lowerMiddle' },
        'FLOYD': { median_income: 43482, category: 'lowerMiddle' },
        'FOARD': { median_income: 37500, category: 'low' },
        'FORT BEND': { median_income: 97743, category: 'upperMiddle' },
        'FRANKLIN': { median_income: 58125, category: 'lowerMiddle' },
        'FREESTONE': { median_income: 51250, category: 'lowerMiddle' },
        'FRIO': { median_income: 45066, category: 'lowerMiddle' },
        'GAINES': { median_income: 59963, category: 'lowerMiddle' },
        'GALVESTON': { median_income: 71876, category: 'middle' },
        'GARZA': { median_income: 47813, category: 'lowerMiddle' },
        'GILLESPIE': { median_income: 65019, category: 'middle' },
        'GLASSCOCK': { median_income: 82188, category: 'upperMiddle' },
        'GOLIAD': { median_income: 56563, category: 'lowerMiddle' },
        'GONZALES': { median_income: 53313, category: 'lowerMiddle' },
        'GRAY': { median_income: 51705, category: 'lowerMiddle' },
        'GRAYSON': { median_income: 59967, category: 'lowerMiddle' },
        'GREGG': { median_income: 53964, category: 'lowerMiddle' },
        'GRIMES': { median_income: 51500, category: 'lowerMiddle' },
        'GUADALUPE': { median_income: 78432, category: 'middle' },
        'HALE': { median_income: 44318, category: 'lowerMiddle' },
        'HALL': { median_income: 37167, category: 'low' },
        'HAMILTON': { median_income: 48667, category: 'lowerMiddle' },
        'HANSFORD': { median_income: 51435, category: 'lowerMiddle' },
        'HARDEMAN': { median_income: 40985, category: 'lowerMiddle' },
        'HARDIN': { median_income: 62500, category: 'middle' },
        'HARRIS': { median_income: 69193, category: 'middle' },
        'HARRISON': { median_income: 52234, category: 'lowerMiddle' },
        'HARTLEY': { median_income: 66250, category: 'middle' },
        'HASKELL': { median_income: 39833, category: 'low' },
        'HAYS': { median_income: 78902, category: 'middle' },
        'HEMPHILL': { median_income: 61635, category: 'middle' },
        'HENDERSON': { median_income: 52997, category: 'lowerMiddle' },
        'HIDALGO': { median_income: 41846, category: 'lowerMiddle' },
        'HILL': { median_income: 50598, category: 'lowerMiddle' },
        'HOCKLEY': { median_income: 52288, category: 'lowerMiddle' },
        'HOOD': { median_income: 68886, category: 'middle' },
        'HOPKINS': { median_income: 50848, category: 'lowerMiddle' },
        'HOUSTON': { median_income: 39941, category: 'low' },
        'HOWARD': { median_income: 57805, category: 'lowerMiddle' },
        'HUDSPETH': { median_income: 39931, category: 'low' },
        'HUNT': { median_income: 56984, category: 'lowerMiddle' },
        'HUTCHINSON': { median_income: 55803, category: 'lowerMiddle' },
        'IRION': { median_income: 61518, category: 'middle' },
        'JACK': { median_income: 53438, category: 'lowerMiddle' },
        'JACKSON': { median_income: 55500, category: 'lowerMiddle' },
        'JASPER': { median_income: 43794, category: 'lowerMiddle' },
        'JEFF DAVIS': { median_income: 48636, category: 'lowerMiddle' },
        'JEFFERSON': { median_income: 51629, category: 'lowerMiddle' },
        'JIM HOGG': { median_income: 38277, category: 'low' },
        'JIM WELLS': { median_income: 43315, category: 'lowerMiddle' },
        'JOHNSON': { median_income: 68397, category: 'middle' },
        'JONES': { median_income: 46250, category: 'lowerMiddle' },
        'KARNES': { median_income: 49583, category: 'lowerMiddle' },
        'KAUFMAN': { median_income: 72280, category: 'middle' },
        'KENDALL': { median_income: 94886, category: 'upperMiddle' },
        'KENEDY': { median_income: 35938, category: 'low' },
        'KENT': { median_income: 51250, category: 'lowerMiddle' },
        'KERR': { median_income: 57123, category: 'lowerMiddle' },
        'KIMBLE': { median_income: 39917, category: 'low' },
        'KING': { median_income: 86458, category: 'upperMiddle' },
        'KINNEY': { median_income: 42989, category: 'lowerMiddle' },
        'KLEBERG': { median_income: 47885, category: 'lowerMiddle' },
        'KNOX': { median_income: 38125, category: 'low' },
        'LAMAR': { median_income: 48421, category: 'lowerMiddle' },
        'LAMB': { median_income: 42308, category: 'lowerMiddle' },
        'LAMPASAS': { median_income: 54707, category: 'lowerMiddle' },
        'LA SALLE': { median_income: 37917, category: 'low' },
        'LAVACA': { median_income: 54375, category: 'lowerMiddle' },
        'LEE': { median_income: 58935, category: 'lowerMiddle' },
        'LEON': { median_income: 56136, category: 'lowerMiddle' },
        'LIBERTY': { median_income: 57964, category: 'lowerMiddle' },
        'LIMESTONE': { median_income: 46250, category: 'lowerMiddle' },
        'LIPSCOMB': { median_income: 52500, category: 'lowerMiddle' },
        'LIVE OAK': { median_income: 47813, category: 'lowerMiddle' },
        'LLANO': { median_income: 54297, category: 'lowerMiddle' },
        'LOVING': { median_income: 80833, category: 'upperMiddle' },
        'LUBBOCK': { median_income: 54775, category: 'lowerMiddle' },
        'LYNN': { median_income: 52656, category: 'lowerMiddle' },
        'MCCULLOCH': { median_income: 43750, category: 'lowerMiddle' },
        'MCLENNAN': { median_income: 49634, category: 'lowerMiddle' },
        'MCMULLEN': { median_income: 72321, category: 'middle' },
        'MADISON': { median_income: 48000, category: 'lowerMiddle' },
        'MARION': { median_income: 38906, category: 'low' },
        'MARTIN': { median_income: 61923, category: 'middle' },
        'MASON': { median_income: 51944, category: 'lowerMiddle' },
        'MATAGORDA': { median_income: 51417, category: 'lowerMiddle' },
        'MAVERICK': { median_income: 38365, category: 'low' },
        'MEDINA': { median_income: 67254, category: 'middle' },
        'MENARD': { median_income: 39063, category: 'low' },
        'MIDLAND': { median_income: 83616, category: 'upperMiddle' },
        'MILAM': { median_income: 47891, category: 'lowerMiddle' },
        'MILLS': { median_income: 45313, category: 'lowerMiddle' },
        'MITCHELL': { median_income: 48125, category: 'lowerMiddle' },
        'MONTAGUE': { median_income: 52917, category: 'lowerMiddle' },
        'MONTGOMERY': { median_income: 89108, category: 'upperMiddle' },
        'MOORE': { median_income: 51579, category: 'lowerMiddle' },
        'MORRIS': { median_income: 41250, category: 'lowerMiddle' },
        'MOTLEY': { median_income: 45625, category: 'lowerMiddle' },
        'NACOGDOCHES': { median_income: 47734, category: 'lowerMiddle' },
        'NAVARRO': { median_income: 50188, category: 'lowerMiddle' },
        'NEWTON': { median_income: 39636, category: 'low' },
        'NOLAN': { median_income: 47083, category: 'lowerMiddle' },
        'NUECES': { median_income: 55063, category: 'lowerMiddle' },
        'OCHILTREE': { median_income: 53750, category: 'lowerMiddle' },
        'OLDHAM': { median_income: 61146, category: 'middle' },
        'ORANGE': { median_income: 58286, category: 'lowerMiddle' },
        'PALO PINTO': { median_income: 49145, category: 'lowerMiddle' },
        'PANOLA': { median_income: 49375, category: 'lowerMiddle' },
        'PARKER': { median_income: 81192, category: 'upperMiddle' },
        'PARMER': { median_income: 46857, category: 'lowerMiddle' },
        'PECOS': { median_income: 49954, category: 'lowerMiddle' },
        'POLK': { median_income: 47831, category: 'lowerMiddle' },
        'POTTER': { median_income: 41688, category: 'lowerMiddle' },
        'PRESIDIO': { median_income: 31492, category: 'low' },
        'RAINS': { median_income: 49699, category: 'lowerMiddle' },
        'RANDALL': { median_income: 69333, category: 'middle' },
        'REAGAN': { median_income: 62500, category: 'middle' },
        'REAL': { median_income: 39250, category: 'low' },
        'RED RIVER': { median_income: 41250, category: 'lowerMiddle' },
        'REEVES': { median_income: 54338, category: 'lowerMiddle' },
        'REFUGIO': { median_income: 46875, category: 'lowerMiddle' },
        'ROBERTS': { median_income: 71250, category: 'middle' },
        'ROBERTSON': { median_income: 45741, category: 'lowerMiddle' },
        'ROCKWALL': { median_income: 100920, category: 'highIncome' },
        'RUNNELS': { median_income: 46923, category: 'lowerMiddle' },
        'RUSK': { median_income: 53320, category: 'lowerMiddle' },
        'SABINE': { median_income: 39107, category: 'low' },
        'SAN AUGUSTINE': { median_income: 38333, category: 'low' },
        'SAN JACINTO': { median_income: 47685, category: 'lowerMiddle' },
        'SAN PATRICIO': { median_income: 56250, category: 'lowerMiddle' },
        'SAN SABA': { median_income: 45417, category: 'lowerMiddle' },
        'SCHLEICHER': { median_income: 50536, category: 'lowerMiddle' },
        'SCURRY': { median_income: 55592, category: 'lowerMiddle' },
        'SHACKELFORD': { median_income: 54737, category: 'lowerMiddle' },
        'SHELBY': { median_income: 42837, category: 'lowerMiddle' },
        'SHERMAN': { median_income: 57292, category: 'lowerMiddle' },
        'SMITH': { median_income: 57885, category: 'lowerMiddle' },
        'SOMERVELL': { median_income: 60350, category: 'middle' },
        'STARR': { median_income: 31760, category: 'low' },
        'STEPHENS': { median_income: 46696, category: 'lowerMiddle' },
        'STERLING': { median_income: 60357, category: 'middle' },
        'STONEWALL': { median_income: 45625, category: 'lowerMiddle' },
        'SUTTON': { median_income: 56375, category: 'lowerMiddle' },
        'SWISHER': { median_income: 43750, category: 'lowerMiddle' },
        'TARRANT': { median_income: 70147, category: 'middle' },
        'TAYLOR': { median_income: 52960, category: 'lowerMiddle' },
        'TERRELL': { median_income: 47917, category: 'lowerMiddle' },
        'TERRY': { median_income: 44615, category: 'lowerMiddle' },
        'THROCKMORTON': { median_income: 41964, category: 'lowerMiddle' },
        'TITUS': { median_income: 50714, category: 'lowerMiddle' },
        'TOM GREEN': { median_income: 55019, category: 'lowerMiddle' },
        'TRAVIS': { median_income: 82717, category: 'upperMiddle' },
        'TRINITY': { median_income: 39583, category: 'low' },
        'TYLER': { median_income: 47875, category: 'lowerMiddle' },
        'UPSHUR': { median_income: 54167, category: 'lowerMiddle' },
        'UPTON': { median_income: 58516, category: 'lowerMiddle' },
        'UVALDE': { median_income: 45936, category: 'lowerMiddle' },
        'VAL VERDE': { median_income: 46997, category: 'lowerMiddle' },
        'VAN ZANDT': { median_income: 55988, category: 'lowerMiddle' },
        'VICTORIA': { median_income: 56151, category: 'lowerMiddle' },
        'WALKER': { median_income: 47245, category: 'lowerMiddle' },
        'WALLER': { median_income: 62425, category: 'middle' },
        'WARD': { median_income: 57188, category: 'lowerMiddle' },
        'WASHINGTON': { median_income: 62885, category: 'middle' },
        'WEBB': { median_income: 46975, category: 'lowerMiddle' },
        'WHARTON': { median_income: 49500, category: 'lowerMiddle' },
        'WHEELER': { median_income: 50708, category: 'lowerMiddle' },
        'WICHITA': { median_income: 53674, category: 'lowerMiddle' },
        'WILBARGER': { median_income: 47083, category: 'lowerMiddle' },
        'WILLACY': { median_income: 31277, category: 'low' },
        'WILLIAMSON': { median_income: 94812, category: 'upperMiddle' },
        'WILSON': { median_income: 76205, category: 'middle' },
        'WINKLER': { median_income: 62500, category: 'middle' },
        'WISE': { median_income: 67387, category: 'middle' },
        'WOOD': { median_income: 52639, category: 'lowerMiddle' },
        'YOAKUM': { median_income: 55625, category: 'lowerMiddle' },
        'YOUNG': { median_income: 54922, category: 'lowerMiddle' },
        'ZAPATA': { median_income: 40938, category: 'lowerMiddle' },
        'ZAVALA': { median_income: 30625, category: 'low' }
      },
      cities: {
        'AUSTIN': { median_income: 88000, category: 'upperMiddle' },
        'HOUSTON': { median_income: 68000, category: 'middle' },
        'DALLAS': { median_income: 72000, category: 'middle' },
        'SAN ANTONIO': { median_income: 62000, category: 'middle' },
        'FORT WORTH': { median_income: 70000, category: 'middle' },
        'EL PASO': { median_income: 47000, category: 'lowerMiddle' },
        'PLANO': { median_income: 108000, category: 'highIncome' },
        'CORPUS CHRISTI': { median_income: 59000, category: 'lowerMiddle' },
        'LAREDO': { median_income: 47000, category: 'lowerMiddle' },
        'LUBBOCK': { median_income: 53000, category: 'lowerMiddle' },
        'ARLINGTON': { median_income: 65000, category: 'middle' },
        'GARLAND': { median_income: 66000, category: 'middle' },
        'IRVING': { median_income: 68000, category: 'middle' },
        'AMARILLO': { median_income: 55000, category: 'lowerMiddle' },
        'GRAND PRAIRIE': { median_income: 70000, category: 'middle' },
        'BROWNSVILLE': { median_income: 39000, category: 'low' },
        'MCKINNEY': { median_income: 105000, category: 'highIncome' },
        'FRISCO': { median_income: 130000, category: 'highIncome' },
        'PASADENA': { median_income: 54000, category: 'lowerMiddle' },
        'MESQUITE': { median_income: 61000, category: 'middle' },
        'KILLEEN': { median_income: 53000, category: 'lowerMiddle' },
        'MCALLEN': { median_income: 45000, category: 'lowerMiddle' },
        'DENTON': { median_income: 64000, category: 'middle' },
        'CARROLLTON': { median_income: 80000, category: 'upperMiddle' },
        'WACO': { median_income: 45000, category: 'lowerMiddle' },
        'BEAUMONT': { median_income: 48000, category: 'lowerMiddle' },
        'RICHARDSON': { median_income: 87000, category: 'upperMiddle' },
        'ROUND ROCK': { median_income: 94000, category: 'upperMiddle' },
        'SUGAR LAND': { median_income: 120000, category: 'highIncome' },
        'COLLEGE STATION': { median_income: 52000, category: 'lowerMiddle' },
        'PEARLAND': { median_income: 110000, category: 'highIncome' },
        'THE WOODLANDS': { median_income: 125000, category: 'highIncome' },
        'LEAGUE CITY': { median_income: 107000, category: 'highIncome' },
        'LEWISVILLE': { median_income: 72000, category: 'middle' },
        'TYLER': { median_income: 54000, category: 'lowerMiddle' },
        'ALLEN': { median_income: 116000, category: 'highIncome' },
        'LONGVIEW': { median_income: 51000, category: 'lowerMiddle' },
        'SPRING': { median_income: 76000, category: 'middle' },
        'MISSION': { median_income: 46000, category: 'lowerMiddle' },
        'EDINBURG': { median_income: 48000, category: 'lowerMiddle' },
        'MIDLAND': { median_income: 82000, category: 'upperMiddle' },
        'ODESSA': { median_income: 65000, category: 'middle' },
        'FLOWER MOUND': { median_income: 137000, category: 'highIncome' },
        'WICHITA FALLS': { median_income: 48000, category: 'lowerMiddle' },
        'CONROE': { median_income: 65000, category: 'middle' },
        'HARLINGEN': { median_income: 41000, category: 'lowerMiddle' },
        'ABILENE': { median_income: 50000, category: 'lowerMiddle' },
        'CEDAR PARK': { median_income: 101000, category: 'highIncome' },
        'SAN ANGELO': { median_income: 54000, category: 'lowerMiddle' },
        'KATY': { median_income: 98000, category: 'upperMiddle' },
        'MANSFIELD': { median_income: 98000, category: 'upperMiddle' },
        'ROWLETT': { median_income: 95000, category: 'upperMiddle' },
        'PFLUGERVILLE': { median_income: 97000, category: 'upperMiddle' },
        'BAYTOWN': { median_income: 58000, category: 'lowerMiddle' },
        'LEANDER': { median_income: 104000, category: 'highIncome' },
        'TEMPLE': { median_income: 56000, category: 'lowerMiddle' },
        'GEORGETOWN': { median_income: 76000, category: 'middle' },
        'NEW BRAUNFELS': { median_income: 73000, category: 'middle' },
        'GALVESTON': { median_income: 60000, category: 'middle' },
        'COPPELL': { median_income: 128000, category: 'highIncome' },
        'VICTORIA': { median_income: 56000, category: 'lowerMiddle' },
        'PHARR': { median_income: 43000, category: 'lowerMiddle' },
        'EULESS': { median_income: 66000, category: 'middle' },
        'DESOTO': { median_income: 69000, category: 'middle' },
        'GRAPEVINE': { median_income: 91000, category: 'upperMiddle' },
        'BELTON': { median_income: 65000, category: 'middle' },
        'SAN MARCOS': { median_income: 40000, category: 'lowerMiddle' },
        'WYLIE': { median_income: 97000, category: 'upperMiddle' },
        'HALTOM CITY': { median_income: 51000, category: 'lowerMiddle' },
        'SOUTHLAKE': { median_income: 189000, category: 'highIncome' },
        'GREENVILLE': { median_income: 50000, category: 'lowerMiddle' },
        'KINGSVILLE': { median_income: 44000, category: 'lowerMiddle' },
        'WEATHERFORD': { median_income: 60000, category: 'middle' },
        'BURLESON': { median_income: 78000, category: 'middle' },
        'FOREST HILL': { median_income: 42000, category: 'lowerMiddle' },
        'CLEBURNE': { median_income: 52000, category: 'lowerMiddle' },
        'DEL RIO': { median_income: 45000, category: 'lowerMiddle' },
        'FRIENDSWOOD': { median_income: 113000, category: 'highIncome' },
        'PALESTINE': { median_income: 40000, category: 'lowerMiddle' },
        'LUFKIN': { median_income: 47000, category: 'lowerMiddle' },
        'WAXAHACHIE': { median_income: 64000, category: 'middle' },
        'PARIS': { median_income: 44000, category: 'lowerMiddle' },
        'BRYAN': { median_income: 44000, category: 'lowerMiddle' },
        'TEXARKANA': { median_income: 42000, category: 'lowerMiddle' },
        'BRENHAM': { median_income: 45000, category: 'lowerMiddle' },
        'ROCKWALL': { median_income: 99000, category: 'upperMiddle' },
        'HUNTSVILLE': { median_income: 42000, category: 'lowerMiddle' },
        'TEXAS CITY': { median_income: 50000, category: 'lowerMiddle' }
      },
      // Adding some sample ZIP codes - in a real implementation this would be more comprehensive
      zips: {
        '78701': { median_income: 110000, category: 'highIncome' },     // Downtown Austin
        '78704': { median_income: 95000, category: 'upperMiddle' },     // South Austin
        '77002': { median_income: 75000, category: 'middle' },          // Downtown Houston
        '77024': { median_income: 150000, category: 'highIncome' },     // Memorial, Houston
        '75205': { median_income: 135000, category: 'highIncome' },     // Highland Park, Dallas
        '75080': { median_income: 90000, category: 'upperMiddle' },     // Richardson
        '78229': { median_income: 60000, category: 'middle' },          // Medical Center, San Antonio
        '78746': { median_income: 170000, category: 'highIncome' },     // West Lake Hills
        '79901': { median_income: 35000, category: 'low' },             // Downtown El Paso
        '76137': { median_income: 65000, category: 'middle' },          // North Fort Worth
        '75093': { median_income: 125000, category: 'highIncome' },     // Plano
        '75034': { median_income: 140000, category: 'highIncome' },     // Frisco
        '78681': { median_income: 97000, category: 'upperMiddle' },     // Round Rock
        '77479': { median_income: 140000, category: 'highIncome' },     // Sugar Land
        '78380': { median_income: 52000, category: 'lowerMiddle' },     // Corpus Christi
        '78666': { median_income: 45000, category: 'lowerMiddle' },     // San Marcos
        '78550': { median_income: 38000, category: 'low' },             // Harlingen
        '79761': { median_income: 60000, category: 'middle' },          // Odessa
        '79707': { median_income: 95000, category: 'upperMiddle' }      // Midland
      }
    };
    
    // Save to a local file for future use
    await fs.writeFile(
      path.join(__dirname, 'median_income_data.json'), 
      JSON.stringify(texasCountiesIncomeData, null, 2)
    );
    
    console.log('Created and saved comprehensive Texas median income data');
    return texasCountiesIncomeData;
  } catch (err) {
    console.error('Error loading median income data:', err);
    // Return a minimal default dataset if there's an error
    return { counties: {}, cities: {}, zips: {} };
  }
}

// Determine income category for a location
function getIncomeCategory(location, incomeData) {
  if (!location) return 'middle'; // Default to middle if no location data
  
  const { county, city, zip } = location;
  
  // Try to match by ZIP code first (most specific)
  if (zip && incomeData.zips[zip]) {
    return incomeData.zips[zip].category;
  }
  
  // Try to match by city
  if (city && incomeData.cities[city]) {
    return incomeData.cities[city].category;
  }
  
  // Try to match by county
  if (county && incomeData.counties[county]) {
    return incomeData.counties[county].category;
  }
  
  // Default to middle income if no match
  return 'middle';
}

// Check if a programmatic service contains any of the keywords
function hasServiceKeywords(service, keywords) {
  if (!service) return false;
  const serviceLower = service.toLowerCase();
  return keywords.some(keyword => serviceLower.includes(keyword.toLowerCase()));
}

// Function to parse ages served and determine the youngest age group
function getYoungestAgeGroup(agesServed) {
  if (!agesServed) return 'schoolAge'; // Default if no data
  
  const agesLower = agesServed.toLowerCase();
  
  // Check for infant care (highest cost)
  if (agesLower.includes('infant') || 
      agesLower.includes('0 year') || 
      agesLower.includes('0-1') || 
      agesLower.includes('0 month') ||
      agesLower.includes('birth')) {
    return 'infant';
  }
  
  // Check for toddler care
  if (agesLower.includes('toddler') || 
      agesLower.includes('1 year') || 
      agesLower.includes('1-2 year') || 
      agesLower.includes('18 month')) {
    return 'toddler';
  }
  
  // Check for preschool
  if (agesLower.includes('preschool') || 
      agesLower.includes('3 year') || 
      agesLower.includes('4 year') || 
      agesLower.includes('pre-k')) {
    return 'preschool';
  }
  
  // Default to school age if no younger groups mentioned
  return 'schoolAge';
}

// Generate cost estimation for a daycare
function calculateCost(daycare, riskData, incomeData) {
  // Start with base cost
  let cost = BASE_MONTHLY_COST;
  
  // 1. Age-based adjustment (youngest age served)
  const youngestAge = getYoungestAgeGroup(daycare.LICENSED_TO_SERVE_AGES);
  cost *= AGE_MULTIPLIERS[youngestAge];
  
  // 2. Adjust by operation type
  const operationType = daycare.OPERATION_TYPE || 'Licensed Child Care Center';
  cost *= TYPE_MULTIPLIERS[operationType] || 1.0;
  
  // 3. Programmatic services adjustment
  let serviceAdjustment = 0;
  
  // Check for various services
  if (daycare.PROGRAMMATIC_SERVICES) {
    const programServices = daycare.PROGRAMMATIC_SERVICES;
    
    // Transportation
    if (hasServiceKeywords(programServices, ['transportation', 'bus service'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.transportation;
    }
    
    // Meals
    if (hasServiceKeywords(programServices, ['meals', 'food', 'breakfast', 'lunch', 'dinner'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.meals;
    }
    
    // Special needs
    if (hasServiceKeywords(programServices, ['special needs', 'disability', 'disabilities', 'therapeutic', 'therapy'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.specialNeeds;
    }
    
    // Language immersion
    if (hasServiceKeywords(programServices, ['language immersion', 'bilingual', 'spanish', 'french', 'chinese', 'dual language'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.languageImmersion;
    }
    
    // Montessori (if not already factored in operation type)
    if (operationType !== 'Montessori' && hasServiceKeywords(programServices, ['montessori'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.montessori;
    }
    
    // Religious programs
    if (hasServiceKeywords(programServices, ['religious', 'christian', 'catholic', 'baptist', 'jewish', 'islamic', 'faith'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.religious;
    }
    
    // After school
    if (hasServiceKeywords(programServices, ['after school', 'afterschool', 'before school', 'before and after'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.afterSchoolPrograms;
    }
    
    // Summer programs
    if (hasServiceKeywords(programServices, ['summer', 'camp'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.summerPrograms;
    }
    
    // Enrichment
    if (hasServiceKeywords(programServices, ['art', 'music', 'stem', 'science', 'enrichment', 'dance', 'creative'])) {
      serviceAdjustment += SERVICE_ADJUSTMENTS.enrichmentPrograms;
    }
  }
  
  // Apply service adjustment
  cost *= (1 + (serviceAdjustment / 100));
  
  // 4. Risk score adjustment
  let riskAdjustment = 0;
  if (riskData && riskData.risk_score !== undefined) {
    // Find the appropriate risk adjustment
    for (const risk of RISK_ADJUSTMENTS) {
      if (riskData.risk_score >= risk.threshold) {
        riskAdjustment = risk.discount ? -risk.discount : (risk.premium || 0);
        break;
      }
    }
  }
  
  // Apply risk adjustment
  cost *= (1 + (riskAdjustment / 100));
  
  // 5. Experience adjustment
  let experienceAdjustment = 0;
  if (daycare.years_in_operation !== undefined) {
    // Find the appropriate experience adjustment
    for (const exp of EXPERIENCE_ADJUSTMENTS) {
      if (daycare.years_in_operation >= exp.years) {
        experienceAdjustment = exp.adjustment;
      } else {
        break;
      }
    }
  }
  
  // Apply experience adjustment
  cost *= (1 + (experienceAdjustment / 100));
  
  // 6. Location/income-based adjustment
  const location = {
    county: daycare.COUNTY,
    city: daycare.CITY,
    zip: daycare.ZIP
  };
  
  const incomeCategory = getIncomeCategory(location, incomeData);
  const locationAdjustment = LOCATION_ADJUSTMENTS[incomeCategory] || 0;
  
  // Apply location adjustment
  cost *= (1 + (locationAdjustment / 100));
  
  // 7. Capacity-based adjustment
  const capacityAdjustment = getCapacityAdjustment(daycare.TOTAL_CAPACITY);
  
  // Apply capacity adjustment
  cost *= (1 + (capacityAdjustment / 100));
  
  // 8. Hours/days of operation adjustment
  const hoursAdjustment = getHoursAdjustment(daycare.HOURS_OF_OPERATION, daycare.DAYS_OF_OPERATION);
  
  // Apply hours/days adjustment
  cost *= (1 + (hoursAdjustment / 100));
  
  // 9. Store calculation factors for transparency
  const factors = {
    base_cost: BASE_MONTHLY_COST,
    age_group: youngestAge,
    age_multiplier: AGE_MULTIPLIERS[youngestAge],
    operation_type: operationType,
    type_multiplier: TYPE_MULTIPLIERS[operationType] || 1.0,
    service_adjustment: serviceAdjustment,
    risk_adjustment: riskAdjustment,
    experience_adjustment: experienceAdjustment,
    location_category: incomeCategory,
    location_adjustment: locationAdjustment,
    capacity_adjustment: capacityAdjustment,
    hours_adjustment: hoursAdjustment
  };
  
  // Round to nearest dollar
  return {
    cost_estimate: Math.round(cost),
    calculation_factors: factors
  };
}

// Create and ensure daycare_cost_estimates table
async function ensureTableStructure(pool) {
  console.log('Checking daycare_cost_estimates table structure...');
  
  try {
    // Check if table exists
    const [tables] = await pool.query(`SHOW TABLES LIKE 'daycare_cost_estimates'`);
    
    if (tables.length === 0) {
      console.log('Creating daycare_cost_estimates table...');
      await pool.query(`
        CREATE TABLE daycare_cost_estimates (
          id INT NOT NULL AUTO_INCREMENT,
          operation_id VARCHAR(50) NOT NULL,
          operation_number VARCHAR(50) NOT NULL,
          monthly_cost DECIMAL(8,2) NOT NULL,
          calculation_factors JSON,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY (operation_id),
          INDEX (monthly_cost)
        )
      `);
      console.log('Table created successfully');
    } else {
      console.log('daycare_cost_estimates table already exists');
    }
  } catch (err) {
    console.error('Error checking/creating table structure:', err);
    throw err;
  }
}

// Save cost estimations to database
async function saveCostEstimatesToDB(pool, costEstimates) {
  console.log(`Saving ${costEstimates.length} cost estimates to database...`);
  
  try {
    // Prepare batch insertion - using REPLACE to handle duplicate operation_ids
    for (let i = 0; i < costEstimates.length; i += 100) {
      const batch = costEstimates.slice(i, i + 100);
      
      // Use bulk insert for better performance
      const values = batch.map(estimate => [
        estimate.operation_id,
        estimate.operation_number,
        estimate.cost_data.cost_estimate,
        JSON.stringify(estimate.cost_data.calculation_factors)
      ]);
      
      await pool.query(`
        REPLACE INTO daycare_cost_estimates 
        (operation_id, operation_number, monthly_cost, calculation_factors)
        VALUES ?
      `, [values]);
      
      // Log progress
      console.log(`Saved batch ${i/100 + 1} of ${Math.ceil(costEstimates.length/100)}`);
    }
    
    console.log('Cost estimates saved successfully');
    return true;
  } catch (err) {
    console.error('Error saving cost estimates:', err);
    return false;
  }
}

// Main function to generate cost estimations
async function generateCostEstimations(pool) {
  console.log('Generating daycare cost estimations...');
  
  try {
    // Load median income data
    const incomeData = await loadMedianIncomeData();
    
    // Get all daycares with necessary fields for cost estimation
    const [daycares] = await pool.query(`
      SELECT 
        d.OPERATION_ID,
        d.OPERATION_NUMBER,
        d.OPERATION_NAME,
        d.OPERATION_TYPE,
        d.CITY,
        d.COUNTY,
        d.ZIP,
        d.LICENSED_TO_SERVE_AGES,
        d.PROGRAMMATIC_SERVICES,
        d.TOTAL_CAPACITY,
        d.HOURS_OF_OPERATION,
        d.DAYS_OF_OPERATION,
        d.ISSUANCE_DATE,
        DATEDIFF(CURRENT_DATE, d.ISSUANCE_DATE) / 365 as years_in_operation
      FROM 
        daycare_operations d
    `);
    
    console.log(`Found ${daycares.length} daycares for cost estimation`);
    
    // Get risk analysis data for all daycares
    const [riskData] = await pool.query(`
      SELECT 
        operation_id,
        risk_score,
        high_risk_count,
        medium_high_risk_count,
        medium_risk_count,
        low_risk_count,
        total_violations
      FROM 
        risk_analysis
    `);
    
    // Create a map of risk data by operation ID for quick lookup
    const riskDataMap = new Map();
    riskData.forEach(risk => {
      riskDataMap.set(risk.operation_id, risk);
    });
    
    console.log(`Retrieved risk data for ${riskData.length} daycares`);
    
    // Calculate cost estimates for each daycare
    const costEstimates = [];
    daycares.forEach((daycare, index) => {
      // Show progress every 100 daycares
      if (index % 100 === 0) {
        console.log(`Processing daycare ${index}/${daycares.length}...`);
      }
      
      // Get risk data for this daycare
      const risk = riskDataMap.get(daycare.OPERATION_ID);
      
      // Calculate the cost estimate
      const costData = calculateCost(daycare, risk, incomeData);
      
      // Add to collection
      costEstimates.push({
        operation_id: daycare.OPERATION_ID,
        operation_number: daycare.OPERATION_NUMBER,
        operation_name: daycare.OPERATION_NAME,
        cost_data: costData
      });
    });
    
    // Save cost estimates to database
    await saveCostEstimatesToDB(pool, costEstimates);
    
    // Return summary statistics
    const costs = costEstimates.map(e => e.cost_data.cost_estimate);
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    const avgCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
    
    console.log('\nCost Estimation Summary:');
    console.log(`Total daycares processed: ${costEstimates.length}`);
    console.log(`Minimum monthly cost: $${minCost}`);
    console.log(`Maximum monthly cost: $${maxCost}`);
    console.log(`Average monthly cost: $${avgCost.toFixed(2)}`);
    
    // Output some example cost estimates for review
    console.log('\nSample Cost Estimates:');
    
    // Show a few examples from different price points
    const sortedEstimates = [...costEstimates].sort((a, b) => a.cost_data.cost_estimate - b.cost_data.cost_estimate);
    const samples = [
      sortedEstimates[0], // lowest
      sortedEstimates[Math.floor(sortedEstimates.length * 0.25)], // 25th percentile
      sortedEstimates[Math.floor(sortedEstimates.length * 0.5)],  // median
      sortedEstimates[Math.floor(sortedEstimates.length * 0.75)], // 75th percentile
      sortedEstimates[sortedEstimates.length - 1] // highest
    ];
    
    samples.forEach(sample => {
      console.log(`${sample.operation_name} (${sample.operation_number}): $${sample.cost_data.cost_estimate}/month`);
    });
    
    return costEstimates;
  } catch (err) {
    console.error('Error generating cost estimations:', err);
    throw err;
  }
}

// Main execution function
async function main() {
  console.log('Starting daycare cost estimation process...');
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Ensure table structure is correct
    await ensureTableStructure(pool);
    
    // Generate and save cost estimations
    await generateCostEstimations(pool);
    
    console.log('Cost estimation process completed successfully!');
  } catch (err) {
    console.error('Error in cost estimation process:', err);
  } finally {
    await pool.end();
  }
}

// Execute the main function
if (require.main === module) {
  main().catch(console.error);
}

// Export functions for use in other modules
module.exports = {
  calculateCost,
  getYoungestAgeGroup,
  getIncomeCategory
};