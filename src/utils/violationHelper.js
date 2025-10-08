// Helper functions for working with violation data

/**
 * Initialize the global data store for daycare violation data
 */
export function initializeGlobalStore() {
  if (typeof window !== 'undefined' && !window.daycareDataStore) {
    window.daycareDataStore = {};
    console.log('[Global Store] Initialized daycareDataStore');
  }
}

/**
 * Get normalized violation data for a daycare, prioritizing global store data
 * @param {Object} daycare - The daycare object
 * @returns {Object} Normalized violation data
 */
export function getDaycareViolationData(daycare) {
  if (!daycare) return null;
  
  // Get the daycare ID 
  const daycareId = daycare.operation_id || daycare.operation_number;
  if (!daycareId) return null;
  
  // Initialize global store if needed
  initializeGlobalStore();
  
  // First check if we have data in the global store
  if (window.daycareDataStore && window.daycareDataStore[daycareId]) {
    console.log(`[Helper] Using violation data from global store for ${daycareId}`);
    return window.daycareDataStore[daycareId];
  }
  
  // Create a normalized dataset from the daycare object
  let violationData = {
    high_risk_violations: 0,
    medium_high_risk_violations: 0,
    medium_risk_violations: 0,
    medium_low_risk_violations: 0,
    low_risk_violations: 0,
    total_violations_2yr: 0
  };
  
  // Try different field formats
  if (daycare.high_risk_violations !== undefined) {
    violationData.high_risk_violations = parseInt(daycare.high_risk_violations || 0, 10);
    violationData.medium_high_risk_violations = parseInt(daycare.medium_high_risk_violations || 0, 10);
    violationData.medium_risk_violations = parseInt(daycare.medium_risk_violations || 0, 10);
    violationData.medium_low_risk_violations = parseInt(daycare.medium_low_risk_violations || 0, 10);
    violationData.low_risk_violations = parseInt(daycare.low_risk_violations || 0, 10);
  } 
  else if (daycare.high_risk !== undefined) {
    violationData.high_risk_violations = parseInt(daycare.high_risk || 0, 10);
    violationData.medium_high_risk_violations = parseInt(daycare.medium_high_risk || 0, 10);
    violationData.medium_risk_violations = parseInt(daycare.medium_risk || 0, 10);
    violationData.medium_low_risk_violations = parseInt(daycare.medium_low_risk || 0, 10);
    violationData.low_risk_violations = parseInt(daycare.low_risk || 0, 10);
  }
  else if (daycare.violation_count) {
    // If we only have total counts, distribute them proportionally
    const totalViolations = parseInt(daycare.violation_count || 0, 10);
    const highRisk = parseInt(daycare.high_risk_violation_count || 0, 10);
    
    violationData.high_risk_violations = highRisk;
    const remaining = totalViolations - highRisk;
    
    if (remaining > 0) {
      violationData.medium_high_risk_violations = Math.round(remaining * 0.4);
      violationData.medium_risk_violations = Math.round(remaining * 0.3);
      violationData.medium_low_risk_violations = Math.round(remaining * 0.2);
      violationData.low_risk_violations = remaining - 
        violationData.medium_high_risk_violations - 
        violationData.medium_risk_violations - 
        violationData.medium_low_risk_violations;
    }
  }
  
  // Calculate total if not provided
  violationData.total_violations_2yr = daycare.total_violations_2yr || 
    (violationData.high_risk_violations +
     violationData.medium_high_risk_violations +
     violationData.medium_risk_violations +
     violationData.medium_low_risk_violations +
     violationData.low_risk_violations);
  
  // Store in global store for future use
  if (window.daycareDataStore) {
    window.daycareDataStore[daycareId] = violationData;
    console.log(`[Helper] Stored violation data for ${daycareId} in global store`);
  }
  
  return violationData;
}

/**
 * Update violation data in the global store
 * @param {string} daycareId - The daycare ID
 * @param {Object} data - The violation data to store
 */
export function updateViolationData(daycareId, data) {
  if (!daycareId || !data) return;
  
  // Initialize global store if needed
  initializeGlobalStore();
  
  // Update the global store
  if (window.daycareDataStore) {
    window.daycareDataStore[daycareId] = {
      high_risk_violations: parseInt(data.high_risk_violations || 0, 10),
      medium_high_risk_violations: parseInt(data.medium_high_risk_violations || 0, 10),
      medium_risk_violations: parseInt(data.medium_risk_violations || 0, 10),
      medium_low_risk_violations: parseInt(data.medium_low_risk_violations || 0, 10),
      low_risk_violations: parseInt(data.low_risk_violations || 0, 10),
      total_violations_2yr: parseInt(data.total_violations_2yr || 0, 10)
    };
    
    console.log(`[Helper] Updated violation data for ${daycareId} in global store`);
  }
}
