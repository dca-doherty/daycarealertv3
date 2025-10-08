const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Public admin tool for managing parent recommendations
router.get('/parent-recommendations-tool', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Parent Recommendations Manager</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #0066cc; }
          .container { margin-top: 20px; }
          label { display: block; margin-bottom: 5px; font-weight: bold; }
          input, textarea { width: 100%; padding: 8px; margin-bottom: 10px; }
          button { background: #0066cc; color: white; border: none; padding: 10px 15px; cursor: pointer; }
          button:hover { background: #0055aa; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow: auto; }
        </style>
      </head>
      <body>
        <h1>Parent Recommendations Manager</h1>
        
        <div class="container">
          <div>
            <label for="operationId">Daycare Operation ID:</label>
            <input type="text" id="operationId" placeholder="Enter operation ID">
            <button onclick="fetchRiskAnalysis()">Fetch Risk Analysis</button>
          </div>
          
          <div id="result" style="margin-top: 20px; display: none;">
            <h3>Risk Analysis Data</h3>
            <pre id="analysisData"></pre>
            
            <h3>Edit Parent Recommendations</h3>
            <p>Enter one recommendation per line:</p>
            <textarea id="recommendations" rows="10"></textarea>
            
            <button onclick="updateRecommendations()">Save Recommendations</button>
          </div>
        </div>
        
        <script>
          async function fetchRiskAnalysis() {
            const operationId = document.getElementById('operationId').value.trim();
            if (!operationId) {
              alert('Please enter an operation ID');
              return;
            }
            
            try {
              const response = await fetch(\`/api/admin/risk-analysis/\${operationId}\`);
              const result = await response.json();
              
              if (result.success) {
                document.getElementById('result').style.display = 'block';
                document.getElementById('analysisData').textContent = JSON.stringify(result.data, null, 2);
                
                // Parse parent recommendations for editing
                let recommendations = [];
                try {
                  if (result.data.parent_recommendations) {
                    // Case 1: Already an array
                    if (Array.isArray(result.data.parent_recommendations)) {
                      recommendations = result.data.parent_recommendations;
                    } 
                    // Case 2: String that needs to be parsed
                    else if (typeof result.data.parent_recommendations === 'string' && 
                             result.data.parent_recommendations.trim() !== '' &&
                             result.data.parent_recommendations !== 'null' &&
                             result.data.parent_recommendations !== '[]') {
                      try {
                        // Try to parse JSON
                        recommendations = JSON.parse(result.data.parent_recommendations);
                        
                        // Handle case where it might not be an array after parsing
                        if (!Array.isArray(recommendations)) {
                          if (typeof recommendations === 'object') {
                            recommendations = Object.values(recommendations);
                          } else if (typeof recommendations === 'string') {
                            recommendations = [recommendations];
                          }
                        }
                      } catch (parseError) {
                        // If parsing fails, maybe it's a comma-separated string
                        if (result.data.parent_recommendations.includes(',')) {
                          recommendations = result.data.parent_recommendations.split(',')
                            .map(item => item.trim())
                            .filter(item => item.length > 0);
                        } else {
                          // Single string value
                          recommendations = [result.data.parent_recommendations];
                        }
                      }
                    }
                    // Case 3: Object that might need conversion to array
                    else if (typeof result.data.parent_recommendations === 'object' && 
                             result.data.parent_recommendations !== null) {
                      const values = Object.values(result.data.parent_recommendations);
                      if (values.length > 0) {
                        recommendations = values;
                      }
                    }
                  }
                } catch (e) {
                  console.error('Error parsing recommendations:', e);
                }
                
                // If we still have no recommendations, use defaults
                if (recommendations.length === 0) {
                  recommendations = [
                    "Ask about their illness policy and the specific symptoms that require a child to stay home",
                    "Inquire about their medication administration procedures and documentation requirements",
                    "Ask about their food allergy management protocols and how they prevent cross-contamination",
                    "Ask about required staff certifications and ongoing training requirements"
                  ];
                }
                
                // Display each recommendation on a new line
                document.getElementById('recommendations').value = recommendations.join('\\n');
              } else {
                alert(result.message || 'Error fetching risk analysis');
              }
            } catch (error) {
              console.error('Error:', error);
              alert('Error fetching risk analysis');
            }
          }
          
          async function updateRecommendations() {
            const operationId = document.getElementById('operationId').value.trim();
            if (!operationId) {
              alert('Please enter an operation ID');
              return;
            }
            
            // Get recommendations as an array (one per line)
            const recommendationsText = document.getElementById('recommendations').value;
            const recommendations = recommendationsText
              .split('\\n')
              .map(line => line.trim())
              .filter(line => line.length > 0);
            
            try {
              const response = await fetch(\`/api/admin/risk-analysis/\${operationId}/update-recommendations\`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recommendations
                })
              });
              
              const result = await response.json();
              
              if (result.success) {
                alert('Recommendations updated successfully!');
                // Refresh the risk analysis data
                fetchRiskAnalysis();
              } else {
                alert(result.message || 'Error updating recommendations');
              }
            } catch (error) {
              console.error('Error:', error);
              alert('Error updating recommendations');
            }
          }
        </script>
      </body>
    </html>
  `);
});

// Admin endpoint to get a daycare's risk analysis
router.get('/risk-analysis/:id', async (req, res) => {
  try {
    const operationId = req.params.id;
    
    console.log(`[ADMIN] Fetching risk analysis for daycare #${operationId}`);
    
    const [rows] = await pool.query(
      'SELECT * FROM risk_analysis WHERE operation_id = ?',
      [operationId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Risk analysis not found for this daycare'
      });
    }
    
    return res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error in admin/risk-analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Admin endpoint to update a daycare's parent recommendations
router.post('/risk-analysis/:id/update-recommendations', async (req, res) => {
  try {
    const operationId = req.params.id;
    const { recommendations } = req.body;
    
    if (!Array.isArray(recommendations)) {
      return res.status(400).json({
        success: false,
        message: 'Recommendations must be an array'
      });
    }
    
    console.log(`[ADMIN] Updating parent recommendations for daycare #${operationId}`);
    console.log('New recommendations:', recommendations);
    
    // Convert array to JSON string
    const recommendationsJson = JSON.stringify(recommendations);
    
    // Check if record exists
    const [checkRows] = await pool.query(
      'SELECT COUNT(*) as count FROM risk_analysis WHERE operation_id = ?',
      [operationId]
    );
    
    if (checkRows[0].count === 0) {
      // Insert new record
      await pool.query(
        'INSERT INTO risk_analysis (operation_id, parent_recommendations, last_updated) VALUES (?, ?, NOW())',
        [operationId, recommendationsJson]
      );
    } else {
      // Update existing record
      await pool.query(
        'UPDATE risk_analysis SET parent_recommendations = ?, last_updated = NOW() WHERE operation_id = ?',
        [recommendationsJson, operationId]
      );
    }
    
    return res.json({
      success: true,
      message: 'Parent recommendations updated successfully'
    });
  } catch (error) {
    console.error('Error in admin/update-recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Endpoint to get analysis summary - NO AUTH REQUIRED
router.get('/analysis-summary/:operationId', async (req, res) => {
  try {
    console.log(`[API] Fetching analysis summary for daycare #${req.params.operationId}`);
    const { operationId } = req.params;
    
    // Query for the analysis summary
    const [summaryData] = await pool.query(
      'SELECT analysis_summary FROM risk_analysis WHERE operation_id = ?',
      [operationId]
    );
    
    if (summaryData.length === 0 || !summaryData[0].analysis_summary) {
      return res.json({
        success: false,
        message: 'No analysis summary found for this daycare',
        operationId
      });
    }
    
    return res.json({
      success: true,
      analysis_summary: summaryData[0].analysis_summary,
      operationId
    });
  } catch (error) {
    console.error('Error fetching analysis summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Debug endpoint to get parent recommendations - NO AUTH REQUIRED FOR TESTING
router.get('/debug-recommendations/:operationId', async (req, res) => {
  try {
    console.log(`[DEBUG] Accessing debug recommendations endpoint for daycare #${req.params.operationId}`);
    const { operationId } = req.params;
    
    // First, find the correct operation ID
    const [operationData] = await pool.query(
      'SELECT OPERATION_ID FROM daycare_operations WHERE OPERATION_ID = ? OR OPERATION_NUMBER = ?',
      [operationId, operationId]
    );
    
    if (operationData.length === 0) {
      console.log(`[DEBUG] Daycare not found with ID: ${operationId}`);
      return res.json({
        success: false,
        message: 'Daycare not found',
        requestedId: operationId
      });
    }
    
    const correctId = operationData[0].OPERATION_ID;
    console.log(`[DEBUG] Found correct ID: ${correctId}`);
    
    // Get recommendations from the database
    const [recData] = await pool.query(
      'SELECT parent_recommendations FROM risk_analysis WHERE operation_id = ?',
      [correctId]
    );
    
    console.log(`[DEBUG] Query results:`, recData.length > 0 ? 'Found data' : 'No data found');
    
    let realRecommendations = null;
    
    if (recData.length > 0 && recData[0].parent_recommendations) {
      try {
        // If it's already an array, use it directly
        if (Array.isArray(recData[0].parent_recommendations)) {
          realRecommendations = recData[0].parent_recommendations;
          console.log(`[DEBUG] Using array directly with ${realRecommendations.length} items`);
        } 
        // If it's a string, try to parse it
        else if (typeof recData[0].parent_recommendations === 'string') {
          realRecommendations = JSON.parse(recData[0].parent_recommendations);
          console.log(`[DEBUG] Parsed string to get ${realRecommendations.length} items`);
        }
        // If it's an object, try to convert it to an array
        else if (typeof recData[0].parent_recommendations === 'object') {
          realRecommendations = Object.values(recData[0].parent_recommendations);
          console.log(`[DEBUG] Converted object to array with ${realRecommendations.length} items`);
        }
      } catch (e) {
        console.log(`[DEBUG] Error processing recommendations:`, e);
      }
    }
    
    // Return the results
    return res.json({
      success: true,
      requestedId: operationId,
      correctId: correctId,
      hasData: recData.length > 0,
      rawData: recData.length > 0 ? recData[0].parent_recommendations : null,
      dataType: recData.length > 0 ? typeof recData[0].parent_recommendations : 'none',
      recommendations: realRecommendations || [
        `Debug recommendation 1 for ID: ${operationId}`,
        `Debug recommendation 2 for ID: ${operationId}`,
        `Debug recommendation 3 for ID: ${operationId}`
      ]
    });
  } catch (error) {
    console.error('Error in debug recommendations:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;