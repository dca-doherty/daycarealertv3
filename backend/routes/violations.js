const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
require('dotenv').config();

// Get violations from the revised_non_compliance table for a specific operation number
router.get('/revised/:operationNumber', async (req, res) => {
  try {
    const { operationNumber } = req.params;
    
    console.log(`Fetching violations for daycare #${operationNumber} from revised_non_compliance table...`);
    
    const [violations] = await pool.query(`
      SELECT * FROM revised_non_compliance 
      WHERE OPERATION_ID = ?
      ORDER BY REVISED_RISK_LEVEL DESC, ACTIVITY_DATE DESC
    `, [operationNumber]);
    
    console.log(`Found ${violations.length} violations for daycare #${operationNumber} in revised_non_compliance table`);
    
    // Transform data for frontend formatting using the actual field names from DB
    const formattedViolations = violations.map(violation => ({
      violation_id: violation.id.toString(),
      operation_number: violation.OPERATION_ID,
      standard_number_description: violation.STANDARD_NUMBER_DESCRIPTION,
      narrative: violation.NARRATIVE,
      risk_level: violation.REVISED_RISK_LEVEL || violation.STANDARD_RISK_LEVEL || 'Low',
      standard_risk_level: violation.STANDARD_RISK_LEVEL || 'Low',
      corrected_at_inspection: violation.CORRECTED_AT_INSPECTION || 'No',
      corrected_date: violation.CORRECTED_DATE,
      violation_date: violation.ACTIVITY_DATE,
      category: violation.CATEGORY || 'General'
    }));
    
    return res.status(200).json({
      success: true,
      violations: formattedViolations,
      source: 'revised_non_compliance'
    });
  } catch (error) {
    console.error('Error fetching revised violations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve revised violations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get consolidated violation report for a daycare
router.get('/:operationNumber', async (req, res) => {
  try {
    const { operationNumber } = req.params;
    
    // First try to get from revised_non_compliance
    const [revisedViolations] = await pool.query(`
      SELECT * FROM revised_non_compliance 
      WHERE OPERATION_ID = ?
      ORDER BY REVISED_RISK_LEVEL DESC, ACTIVITY_DATE DESC
    `, [operationNumber]);
    
    if (revisedViolations.length > 0) {
      console.log(`Using ${revisedViolations.length} violations from revised_non_compliance table`);
      
      // Transform data using the actual field names from DB
      const formattedViolations = revisedViolations.map(violation => ({
        violation_id: violation.id.toString(),
        operation_number: violation.OPERATION_ID,
        standard_number_description: violation.STANDARD_NUMBER_DESCRIPTION,
        narrative: violation.NARRATIVE,
        risk_level: violation.REVISED_RISK_LEVEL || violation.STANDARD_RISK_LEVEL || 'Low',
        standard_risk_level: violation.STANDARD_RISK_LEVEL || 'Low',
        corrected_at_inspection: violation.CORRECTED_AT_INSPECTION || 'No',
        corrected_date: violation.CORRECTED_DATE,
        violation_date: violation.ACTIVITY_DATE,
        category: violation.CATEGORY || 'General'
      }));
      
      return res.status(200).json({
        success: true,
        violations: formattedViolations,
        source: 'revised_non_compliance'
      });
    }
    
    // If no revised violations, try the regular violations table
    const [regularViolations] = await pool.query(`
      SELECT * FROM violations 
      WHERE operation_number = ?
      ORDER BY standard_risk_level DESC, violation_date DESC
    `, [operationNumber]);
    
    if (regularViolations.length > 0) {
      console.log(`Using ${regularViolations.length} violations from standard violations table`);
      
      // Return regular violations
      return res.status(200).json({
        success: true,
        violations: regularViolations,
        source: 'violations'
      });
    }
    
    // Return empty array if no violations found
    return res.status(200).json({
      success: true,
      violations: [],
      message: 'No violations found for this daycare'
    });
  } catch (error) {
    console.error('Error fetching violations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve violations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get violation risk analysis
router.get('/analysis/:operationNumber', async (req, res) => {
  try {
    const { operationNumber } = req.params;
    
    // Get counts by risk level from the revised_non_compliance table
    const [riskCounts] = await pool.query(`
      SELECT 
        REVISED_RISK_LEVEL as risk_level, 
        COUNT(*) as count
      FROM revised_non_compliance
      WHERE OPERATION_ID = ?
      GROUP BY REVISED_RISK_LEVEL
    `, [operationNumber]);
    
    // Format the results
    const riskAnalysis = {
      high_risk: 0,
      medium_high_risk: 0,
      medium_risk: 0,
      medium_low_risk: 0,
      low_risk: 0
    };
    
    riskCounts.forEach(item => {
      const riskLevel = (item.risk_level || '').toLowerCase();
      
      if (riskLevel.includes('high') && !riskLevel.includes('medium')) {
        riskAnalysis.high_risk = item.count;
      } else if (riskLevel.includes('medium-high') || riskLevel.includes('medium high')) {
        riskAnalysis.medium_high_risk = item.count;
      } else if (riskLevel.includes('medium') && !riskLevel.includes('low')) {
        riskAnalysis.medium_risk = item.count;
      } else if (riskLevel.includes('medium-low') || riskLevel.includes('medium low')) {
        riskAnalysis.medium_low_risk = item.count;
      } else if (riskLevel.includes('low')) {
        riskAnalysis.low_risk = item.count;
      }
    });
    
    // Calculate total violations
    const totalViolations = Object.values(riskAnalysis).reduce((sum, count) => sum + count, 0);
    
    return res.status(200).json({
      success: true,
      riskAnalysis,
      totalViolations,
      source: 'revised_non_compliance'
    });
  } catch (error) {
    console.error('Error generating violation analysis:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate violation analysis',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;