/**
 * Test Accreditation Premiums
 * 
 * This script tests the impact of various quality indicators on cost estimation
 * by creating sample daycare records with different accreditations and qualifications.
 */
require('dotenv').config();
const { 
  calculateCost: calculateCostV3,
  detectAccreditation,
  detectEducationCredentials,
  detectCurriculum
} = require('./scripts/generate_cost_estimation_v3');

// Create a base daycare object
const baseDaycare = {
  OPERATION_ID: 'TEST123',
  OPERATION_NUMBER: 'TEST-123',
  OPERATION_NAME: 'Test Daycare Center',
  OPERATION_TYPE: 'Licensed Child Care Center',
  CITY: 'DALLAS',
  COUNTY: 'DALLAS',
  ZIP: '75201',
  LICENSED_TO_SERVE_AGES: 'infant, toddler, preschool',
  PROGRAMMATIC_SERVICES: 'We provide breakfast, lunch, and afternoon snacks. We have a play-based curriculum.',
  TOTAL_CAPACITY: 40,
  HOURS_OF_OPERATION: 'Monday-Friday 7:00 AM - 6:00 PM',
  DAYS_OF_OPERATION: 'Monday through Friday',
  ISSUANCE_DATE: '2018-01-01',
  years_in_operation: 7
};

// Mock risk data
const mockRiskData = {
  risk_score: 15
};

// Create variations with different quality indicators
const testScenarios = [
  {
    name: 'Base Daycare (No Quality Indicators)',
    daycare: { ...baseDaycare }
  },
  {
    name: 'NAEYC Accredited Center',
    daycare: { 
      ...baseDaycare, 
      OPERATION_NAME: 'NAEYC Accredited Daycare',
      PROGRAMMATIC_SERVICES: baseDaycare.PROGRAMMATIC_SERVICES + ' We are proudly NAEYC accredited.'
    }
  },
  {
    name: 'Texas Rising Star Center',
    daycare: { 
      ...baseDaycare, 
      OPERATION_NAME: 'Rising Star Daycare',
      PROGRAMMATIC_SERVICES: baseDaycare.PROGRAMMATIC_SERVICES + ' We are a Texas Rising Star certified provider.'
    }
  },
  {
    name: 'Multiple Accreditations',
    daycare: { 
      ...baseDaycare, 
      OPERATION_NAME: 'Multi-Accredited Daycare',
      PROGRAMMATIC_SERVICES: baseDaycare.PROGRAMMATIC_SERVICES + ' We are NAEYC accredited and Texas School Ready certified.'
    }
  },
  {
    name: 'Staff with CDA Credentials',
    daycare: { 
      ...baseDaycare, 
      OPERATION_NAME: 'CDA Certified Daycare',
      PROGRAMMATIC_SERVICES: baseDaycare.PROGRAMMATIC_SERVICES + ' All our lead teachers have Child Development Associate (CDA) credentials.'
    }
  },
  {
    name: 'Highly Educated Staff',
    daycare: { 
      ...baseDaycare, 
      OPERATION_NAME: 'Educated Staff Daycare',
      PROGRAMMATIC_SERVICES: baseDaycare.PROGRAMMATIC_SERVICES + ' Our director has a Masters degree in Early Childhood Education and all lead teachers have Bachelors degrees.'
    }
  },
  {
    name: 'Reggio Emilia Approach',
    daycare: { 
      ...baseDaycare, 
      OPERATION_NAME: 'Reggio Emilia Daycare',
      PROGRAMMATIC_SERVICES: baseDaycare.PROGRAMMATIC_SERVICES + ' We follow the Reggio Emilia approach to early childhood education.'
    }
  },
  {
    name: 'HighScope Curriculum',
    daycare: { 
      ...baseDaycare, 
      OPERATION_NAME: 'HighScope Daycare',
      PROGRAMMATIC_SERVICES: baseDaycare.PROGRAMMATIC_SERVICES + ' We implement the HighScope curriculum in all classrooms.'
    }
  },
  {
    name: 'Montessori Program',
    daycare: { 
      ...baseDaycare, 
      OPERATION_NAME: 'Montessori Daycare',
      OPERATION_TYPE: 'Montessori',
      PROGRAMMATIC_SERVICES: baseDaycare.PROGRAMMATIC_SERVICES + ' We are a Montessori program with AMI certified teachers.'
    }
  },
  {
    name: 'Premium Center (All Quality Indicators)',
    daycare: { 
      ...baseDaycare, 
      OPERATION_NAME: 'Premium Quality Daycare',
      PROGRAMMATIC_SERVICES: baseDaycare.PROGRAMMATIC_SERVICES + ' We are NAEYC accredited with Texas Rising Star certification. Our director has a Masters degree in Early Childhood Education and all teachers have Bachelors degrees or CDA credentials. We implement the Reggio Emilia approach combined with Montessori principles. Our teachers are AMI certified.'
    }
  },
  // Sample of a realistic high-end daycare
  {
    name: 'Real-World Premium Example',
    daycare: { 
      ...baseDaycare, 
      OPERATION_NAME: 'Children\'s Courtyard Prestonwood',
      CITY: 'PLANO',
      ZIP: '75024',
      TOTAL_CAPACITY: 75,
      PROGRAMMATIC_SERVICES: 'We provide breakfast, lunch, and afternoon snacks. We are a NAEYC accredited center offering a research-based curriculum focused on developing the whole child. Our program includes Spanish language immersion, music, art, and STEM activities. All lead teachers have Bachelors degrees in Early Childhood Education or related fields. We offer extended hours, transportation services for school-age children, and special enrichment programs.'
    }
  }
];

// Test and compare the results
function runTests() {
  console.log('Testing Quality Indicator Premiums on Cost Estimation\n');
  
  const results = [];
  
  for (const scenario of testScenarios) {
    // Calculate cost
    const costData = calculateCostV3(scenario.daycare, mockRiskData, {}, {});
    
    // Detect quality indicators
    const accreditations = detectAccreditation(scenario.daycare.PROGRAMMATIC_SERVICES);
    const educations = detectEducationCredentials(scenario.daycare.PROGRAMMATIC_SERVICES);
    const curricula = detectCurriculum(scenario.daycare.PROGRAMMATIC_SERVICES);
    
    // Store results
    results.push({
      name: scenario.name,
      monthly_cost: costData.cost_estimate,
      weekly_cost: costData.weekly_cost,
      factors: costData.calculation_factors,
      accreditations,
      educations,
      curricula
    });
  }
  
  // Display results
  console.log('Cost Estimates by Scenario:');
  console.log('==========================');
  
  const baseResult = results[0];
  
  for (const result of results) {
    console.log(`\n${result.name}:`);
    console.log(`Monthly Cost: $${result.monthly_cost}`);
    console.log(`Weekly Cost: $${result.weekly_cost}`);
    
    // Show difference from base
    if (result !== baseResult) {
      const monthlyDiff = result.monthly_cost - baseResult.monthly_cost;
      const weeklyDiff = result.weekly_cost - baseResult.weekly_cost;
      const percentDiff = (monthlyDiff / baseResult.monthly_cost) * 100;
      
      console.log(`Difference from Base: $${monthlyDiff}/month ($${weeklyDiff}/week, ${percentDiff.toFixed(2)}%)`);
    }
    
    // Show quality indicators
    if (result.accreditations.length > 0) {
      console.log(`Accreditations Detected: ${result.accreditations.join(', ')}`);
      console.log(`Accreditation Premium: ${result.factors.accreditation_adjustment}%`);
    }
    
    if (result.educations.length > 0) {
      console.log(`Education Credentials Detected: ${result.educations.join(', ')}`);
      console.log(`Education Premium: ${result.factors.education_adjustment}%`);
    }
    
    if (result.curricula.length > 0) {
      console.log(`Curriculum Approaches Detected: ${result.curricula.join(', ')}`);
      console.log(`Curriculum Premium: ${result.factors.curriculum_adjustment}%`);
    }
  }
  
  // Analyze premium impact
  console.log('\n\nSummary of Quality Premium Impacts:');
  console.log('===================================');
  
  // Calculate average premium by type
  const accreditationResults = results.filter(r => r.accreditations.length > 0 && r.name !== 'Premium Center (All Quality Indicators)');
  const educationResults = results.filter(r => r.educations.length > 0 && r.name !== 'Premium Center (All Quality Indicators)');
  const curriculumResults = results.filter(r => r.curricula.length > 0 && r.name !== 'Premium Center (All Quality Indicators)');
  
  if (accreditationResults.length > 0) {
    const avgAccredPremium = accreditationResults.reduce((sum, r) => sum + r.factors.accreditation_adjustment, 0) / accreditationResults.length;
    const avgAccredDiff = accreditationResults.reduce((sum, r) => sum + (r.monthly_cost - baseResult.monthly_cost), 0) / accreditationResults.length;
    const avgAccredPercentDiff = (avgAccredDiff / baseResult.monthly_cost) * 100;
    
    console.log(`Average Accreditation Premium: ${avgAccredPremium.toFixed(2)}%`);
    console.log(`Average Monthly Cost Increase: $${avgAccredDiff.toFixed(2)} (${avgAccredPercentDiff.toFixed(2)}%)`);
  }
  
  if (educationResults.length > 0) {
    const avgEduPremium = educationResults.reduce((sum, r) => sum + r.factors.education_adjustment, 0) / educationResults.length;
    const avgEduDiff = educationResults.reduce((sum, r) => sum + (r.monthly_cost - baseResult.monthly_cost), 0) / educationResults.length;
    const avgEduPercentDiff = (avgEduDiff / baseResult.monthly_cost) * 100;
    
    console.log(`\nAverage Education Premium: ${avgEduPremium.toFixed(2)}%`);
    console.log(`Average Monthly Cost Increase: $${avgEduDiff.toFixed(2)} (${avgEduPercentDiff.toFixed(2)}%)`);
  }
  
  if (curriculumResults.length > 0) {
    const avgCurrPremium = curriculumResults.reduce((sum, r) => sum + r.factors.curriculum_adjustment, 0) / curriculumResults.length;
    const avgCurrDiff = curriculumResults.reduce((sum, r) => sum + (r.monthly_cost - baseResult.monthly_cost), 0) / curriculumResults.length;
    const avgCurrPercentDiff = (avgCurrDiff / baseResult.monthly_cost) * 100;
    
    console.log(`\nAverage Curriculum Premium: ${avgCurrPremium.toFixed(2)}%`);
    console.log(`Average Monthly Cost Increase: $${avgCurrDiff.toFixed(2)} (${avgCurrPercentDiff.toFixed(2)}%)`);
  }
  
  // Show premium center results
  const premiumCenter = results.find(r => r.name === 'Premium Center (All Quality Indicators)');
  const realWorldExample = results.find(r => r.name === 'Real-World Premium Example');
  
  console.log('\nPremium Center (Combined Quality Indicators):');
  console.log(`Total Monthly Cost: $${premiumCenter.monthly_cost}`);
  console.log(`Total Weekly Cost: $${premiumCenter.weekly_cost}`);
  console.log(`Total Quality Premium: ${(premiumCenter.factors.accreditation_adjustment + 
    premiumCenter.factors.education_adjustment + 
    premiumCenter.factors.curriculum_adjustment).toFixed(2)}%`);
  console.log(`Difference from Base: $${premiumCenter.monthly_cost - baseResult.monthly_cost}/month (${((premiumCenter.monthly_cost - baseResult.monthly_cost) / baseResult.monthly_cost * 100).toFixed(2)}%)`);

  console.log('\nReal-World Premium Example:');
  console.log(`Total Monthly Cost: $${realWorldExample.monthly_cost}`);
  console.log(`Total Weekly Cost: $${realWorldExample.weekly_cost}`);
  console.log(`Total Quality Premium: ${(realWorldExample.factors.accreditation_adjustment + 
    realWorldExample.factors.education_adjustment + 
    realWorldExample.factors.curriculum_adjustment).toFixed(2)}%`);
  console.log(`Difference from Base: $${realWorldExample.monthly_cost - baseResult.monthly_cost}/month (${((realWorldExample.monthly_cost - baseResult.monthly_cost) / baseResult.monthly_cost * 100).toFixed(2)}%)`);
}

// Run the tests
runTests();