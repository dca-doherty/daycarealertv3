/**
 * Update Daycare Cost Estimates with v3 Model
 * 
 * This script updates all existing daycare cost estimates in the database
 * using the enhanced v3 model with accreditation and quality premiums.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const { 
  calculateCost: calculateCostV3,
  detectAccreditation,
  detectEducationCredentials,
  detectCurriculum
} = require('./scripts/generate_cost_estimation_v3');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

async function updateCostEstimates() {
  const pool = await mysql.createPool(dbConfig);
  
  try {
    console.log('Updating daycare cost estimates with v3 model...');
    
    // Get count of daycares to process
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total FROM daycare_operations
    `);
    const totalDaycares = countResult[0].total;
    console.log(`Found ${totalDaycares} daycares to process`);
    
    // Process daycares in batches directly from the database
    const fetchBatchSize = 500;
    const processBatchSize = 100;
    let offset = 0;
    let processed = 0;
    let updatedCount = 0;
    let qualityPremiumCount = 0;
    let accreditationCount = 0;
    let educationCount = 0;
    let curriculumCount = 0;
    
    // Track premium statistics
    let totalAccreditationPremium = 0;
    let totalEducationPremium = 0;
    let totalCurriculumPremium = 0;
    let maxPremiumIncrease = 0;
    let maxPremiumDaycare = null;
        
    // Process in smaller fetch batches to avoid memory issues
    while (offset < totalDaycares) {
      // Fetch a batch of daycares
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
          DATEDIFF(CURRENT_DATE, d.ISSUANCE_DATE) / 365 as years_in_operation,
          r.risk_score,
          r.high_risk_count,
          r.medium_high_risk_count,
          r.medium_risk_count,
          r.low_risk_count,
          r.total_violations,
          c.monthly_cost as current_monthly,
          c.weekly_cost as current_weekly,
          c.calculation_factors as current_factors
        FROM 
          daycare_operations d
        LEFT JOIN
          risk_analysis r ON d.OPERATION_ID = r.operation_id
        LEFT JOIN
          daycare_cost_estimates c ON d.OPERATION_ID = c.operation_id
        LIMIT ?, ?
      `, [offset, fetchBatchSize]);
      
      console.log(`Fetched ${daycares.length} daycares (offset ${offset} of ${totalDaycares})`);
            
      // Create arrays to store updated cost estimates for this fetch batch
      const updatedEstimates = [];
      
      // Process this fetch batch in smaller processing batches
      for (let i = 0; i < daycares.length; i += processBatchSize) {
        const batch = daycares.slice(i, Math.min(i + processBatchSize, daycares.length));
        
        for (const daycare of batch) {
          // Get risk data
          const riskData = { 
            risk_score: daycare.risk_score,
            high_risk_count: daycare.high_risk_count,
            medium_high_risk_count: daycare.medium_high_risk_count,
            medium_risk_count: daycare.medium_risk_count,
            low_risk_count: daycare.low_risk_count,
            total_violations: daycare.total_violations
          };
          
          // Calculate cost using v3 model
          const newCostData = calculateCostV3(daycare, riskData, {}, {});
          
          // Parse current calculation factors if they exist
          let currentFactors = null;
          try {
            if (daycare.current_factors && typeof daycare.current_factors === 'string') {
              currentFactors = JSON.parse(daycare.current_factors);
            } else if (daycare.current_factors && typeof daycare.current_factors === 'object') {
              // Already parsed by mysql2
              currentFactors = daycare.current_factors;
            }
          } catch (e) {
            // Just use null for currentFactors if there's an error
            if (processed % 1000 === 0) { // Log less frequently to avoid console spam
              console.log(`Error parsing calculation factors for ${daycare.OPERATION_NAME}: ${e.message}`);
            }
          }
          
          // Check if this daycare has any quality premiums
          const hasAccreditation = newCostData.calculation_factors.accreditation_adjustment > 0;
          const hasEducation = newCostData.calculation_factors.education_adjustment > 0;
          const hasCurriculum = newCostData.calculation_factors.curriculum_adjustment > 0;
          
          if (hasAccreditation) {
            accreditationCount++;
            totalAccreditationPremium += newCostData.calculation_factors.accreditation_adjustment;
          }
          
          if (hasEducation) {
            educationCount++;
            totalEducationPremium += newCostData.calculation_factors.education_adjustment;
          }
          
          if (hasCurriculum) {
            curriculumCount++;
            totalCurriculumPremium += newCostData.calculation_factors.curriculum_adjustment;
          }
          
          // Check if it has any quality premium
          const hasQualityPremium = hasAccreditation || hasEducation || hasCurriculum;
          if (hasQualityPremium) {
            qualityPremiumCount++;
          }
          
          // Calculate price difference if there was a previous cost estimate
          let priceDiffPercent = 0;
          if (daycare.current_monthly) {
            priceDiffPercent = ((newCostData.cost_estimate - daycare.current_monthly) / daycare.current_monthly) * 100;
            
            // Track daycare with highest premium increase
            if (priceDiffPercent > maxPremiumIncrease) {
              maxPremiumIncrease = priceDiffPercent;
              maxPremiumDaycare = {
                name: daycare.OPERATION_NAME,
                operationNumber: daycare.OPERATION_NUMBER,
                oldPrice: daycare.current_monthly,
                newPrice: newCostData.cost_estimate,
                increase: priceDiffPercent,
                accreditations: newCostData.calculation_factors.accreditation_features,
                education: newCostData.calculation_factors.education_features,
                curriculum: newCostData.calculation_factors.curriculum_features
              };
            }
          }
          
          // Check for Meadow Oaks Academy - keep its override if it exists
          const isMeadowOaks = daycare.OPERATION_NUMBER === '1786033' || 
                              (daycare.OPERATION_NAME.includes('Meadow Oaks') && daycare.CITY === 'DALLAS');
          
          if (isMeadowOaks && currentFactors && currentFactors.manual_override) {
            console.log(`Preserving manual override for Meadow Oaks Academy (${daycare.OPERATION_NUMBER})`);
            // Keep existing prices but update calculation factors
            newCostData.cost_estimate = daycare.current_monthly;
            newCostData.weekly_cost = daycare.current_weekly;
            newCostData.calculation_factors.manual_override = true;
            newCostData.calculation_factors.override_reason = currentFactors.override_reason || 'Adjusted to match actual reported price';
          }
          
          // Add to updated estimates
          updatedEstimates.push({
            operation_id: daycare.OPERATION_ID,
            operation_number: daycare.OPERATION_NUMBER,
            monthly_cost: newCostData.cost_estimate,
            weekly_cost: newCostData.weekly_cost,
            calculation_factors: JSON.stringify(newCostData.calculation_factors)
          });
          
          // Update counter
          updatedCount++;
        }
        
        processed += batch.length;
        if (processed % 500 === 0 || processed === totalDaycares) {
          console.log(`Processed ${processed}/${totalDaycares} daycares (${(processed/totalDaycares*100).toFixed(2)}%)...`);
        }
      }
      
      // Save updated cost estimates to database for this fetch batch
      console.log(`Saving batch of ${updatedEstimates.length} updated estimates to database...`);
      for (let i = 0; i < updatedEstimates.length; i += processBatchSize) {
        const saveBatch = updatedEstimates.slice(i, Math.min(i + processBatchSize, updatedEstimates.length));
        
        // Use bulk replace to update estimates
        const values = saveBatch.map(estimate => [
          estimate.operation_id,
          estimate.operation_number,
          estimate.monthly_cost,
          estimate.weekly_cost,
          estimate.calculation_factors
        ]);
        
        await pool.query(`
          REPLACE INTO daycare_cost_estimates 
          (operation_id, operation_number, monthly_cost, weekly_cost, calculation_factors)
          VALUES ?
        `, [values]);
      }
      
      console.log(`Saved all estimates for batch at offset ${offset}`);
      
      // Move to the next batch
      offset += fetchBatchSize;
    }
    
    // Report results
    console.log('\nUpdate Summary:');
    console.log(`Total daycares processed: ${totalDaycares}`);
    console.log(`Total updated: ${updatedCount}`);
    console.log(`Daycares with quality premiums: ${qualityPremiumCount} (${((qualityPremiumCount/totalDaycares)*100).toFixed(2)}%)`);
    console.log(`- With accreditation premiums: ${accreditationCount} (${((accreditationCount/totalDaycares)*100).toFixed(2)}%)`);
    console.log(`- With education premiums: ${educationCount} (${((educationCount/totalDaycares)*100).toFixed(2)}%)`);
    console.log(`- With curriculum premiums: ${curriculumCount} (${((curriculumCount/totalDaycares)*100).toFixed(2)}%)`);
    
    if (accreditationCount > 0) {
      console.log(`Average accreditation premium: ${(totalAccreditationPremium/accreditationCount).toFixed(2)}%`);
    }
    
    if (educationCount > 0) {
      console.log(`Average education premium: ${(totalEducationPremium/educationCount).toFixed(2)}%`);
    }
    
    if (curriculumCount > 0) {
      console.log(`Average curriculum premium: ${(totalCurriculumPremium/curriculumCount).toFixed(2)}%`);
    }
    
    if (maxPremiumDaycare) {
      console.log('\nDaycare with highest quality premium:');
      console.log(`- Name: ${maxPremiumDaycare.name} (${maxPremiumDaycare.operationNumber})`);
      console.log(`- Old monthly price: $${maxPremiumDaycare.oldPrice}`);
      console.log(`- New monthly price: $${maxPremiumDaycare.newPrice}`);
      console.log(`- Increase: ${maxPremiumDaycare.increase.toFixed(2)}%`);
      
      if (maxPremiumDaycare.accreditations && maxPremiumDaycare.accreditations.length > 0) {
        console.log(`- Accreditations: ${maxPremiumDaycare.accreditations.join(', ')}`);
      }
      
      if (maxPremiumDaycare.education && maxPremiumDaycare.education.length > 0) {
        console.log(`- Education credentials: ${maxPremiumDaycare.education.join(', ')}`);
      }
      
      if (maxPremiumDaycare.curriculum && maxPremiumDaycare.curriculum.length > 0) {
        console.log(`- Curriculum approaches: ${maxPremiumDaycare.curriculum.join(', ')}`);
      }
    }
    
    console.log('\nCost estimate database has been updated successfully with the v3 model.');
  } catch (err) {
    console.error('Error updating cost estimates:', err);
  } finally {
    await pool.end();
  }
}

// Run the update
updateCostEstimates().catch(console.error);