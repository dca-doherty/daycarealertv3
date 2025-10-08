import React, { useState, useEffect } from 'react';
// No longer importing the API as we're using passed data instead
import '../styles/ViolationAnalysis.css';

// Create the component
const ViolationAnalysisComponent = ({ daycareId, initialViolations = [] }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  
  // Create ref outside the effect to track if we've already created analysis
  const analysisCreatedRef = React.useRef(false);
  
  // Single effect to create analysis once
  useEffect(() => {
    // If we've already created an analysis for this data, skip
    if (analysisCreatedRef.current && analysis) {
      return;
    }
    
    console.log("Creating analysis once for daycare:", daycareId);
    
    // Skip if no data
    if (!daycareId || !initialViolations || initialViolations.length === 0) {
      setLoading(false);
      return;
    }
    
    // Create analysis
    setLoading(true);
    
    try {
      // Calculate recent violations (past 6 months)
      const currentDate = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
      
      const recentViolations = initialViolations.filter(v => {
        const violationDate = new Date(v.violation_date || v.date || Date.now());
        return violationDate >= sixMonthsAgo;
      }).length;
      
      // Create a simple analysis object based on the violation data
      const basicAnalysis = {
        summary: initialViolations.length > 3 
          ? "This daycare has multiple recorded violations. Review the details to make an informed decision."
          : "This daycare has few recorded violations. Always visit in person to verify conditions.",
        violationSummary: `There are ${initialViolations.length} total violations recorded, with ${recentViolations} in the past 6 months.`,
        riskFactors: [],
        recommendations: [
          "Review the detailed violations listed above.",
          "Ask the daycare about their response to these violations.",
          "Schedule a visit during regular hours to observe daily operations."
        ],
        totalViolations: initialViolations.length,
        recentViolations: recentViolations
      };
      
      // Set the analysis
      setAnalysis(basicAnalysis);
      
      // Mark as created so we don't do it again
      analysisCreatedRef.current = true;
    } catch (err) {
      console.error("Error creating analysis from violations:", err);
      setError("Failed to analyze violation data");
    } finally {
      setLoading(false);
    }
    
    // Return cleanup function
    return () => {
      console.log("ViolationAnalysis cleanup for daycare:", daycareId);
    };
    
  // We're using a ref to prevent multiple analyses creation,
  // so we only need to depend on daycareId
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daycareId]);

  // These variables are no longer needed as we're calculating directly in the JSX
  // But we'll keep them for reference as they define the logic
  // This avoids ESLint warnings since these variables are not referenced elsewhere
  /*  
  const actualTotalCount = initialViolations.length || (analysis && analysis.totalViolations) || 0;
  
  const actualRecentCount = initialViolations.filter(v => {
    const violationDate = new Date(v.violation_date || v.date || Date.now());
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(new Date().getMonth() - 6);
    return violationDate >= sixMonthsAgo;
  }).length || (analysis && analysis.recentViolations) || 0;
  */
  
  // Only show loading if we're actually loading
  if (loading) {
    return (
      <div className="violation-analysis-loading">
        <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        Loading safety analysis...
      </div>
    );
  }

  if (error) {
    // Show a more user-friendly error message
    return <div className="violation-analysis-error">Currently unable to retrieve safety analysis for this daycare.</div>;
  }

  // Wait until we have analysis data
  if (!analysis) {
    // Create default analysis if we have violations but no analysis yet
    if (initialViolations && initialViolations.length > 0 && !analysisCreatedRef.current) {
      // Don't use setTimeout - create the analysis right away
      const totalViolations = initialViolations.length;
      
      // Calculate recent violations (past 6 months)
      const currentDate = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
      
      const recentViolations = initialViolations.filter(v => {
        const violationDate = new Date(v.violation_date || v.date || Date.now());
        return violationDate >= sixMonthsAgo;
      }).length;
      
      // Create a basic analysis immediately
      const basicAnalysis = {
        summary: totalViolations > 3 
          ? "This daycare has multiple recorded violations. Review the details to make an informed decision."
          : "This daycare has few recorded violations. Always visit in person to verify conditions.",
        violationSummary: `There are ${totalViolations} total violations recorded, with ${recentViolations} in the past 6 months.`,
        riskFactors: [],
        recommendations: [
          "Review the detailed violations listed above.",
          "Ask the daycare about their response to these violations.",
          "Schedule a visit during regular hours to observe daily operations."
        ],
        totalViolations: totalViolations,
        recentViolations: recentViolations
      };
      
      // Set the analysis
      setAnalysis(basicAnalysis);
      analysisCreatedRef.current = true;
    }
    
    return <div className="violation-analysis-empty">Processing violation data...</div>;
  }
  
  return (
    <div className="violation-analysis-container">
      <h3 className="violation-analysis-title">Safety & Compliance Analysis</h3>
      
      <div className="violation-analysis-summary">
        <p>{analysis?.summary || (initialViolations.length > 0 ? 
          "This daycare has recorded violations. Review the violations above for more details." : 
          "No violation data available for this daycare.")}
        </p>
      </div>
      
      <div className="violation-stats" id="violation-stats-container">
        <div className="violation-stat-item">
          <span className="stat-value" id="total-violations-count">
            {analysis.totalViolations || initialViolations.length}
          </span>
          <span className="stat-label">Total Violations</span>
        </div>
        
        <div className="violation-stat-item">
          <span className="stat-value" id="recent-violations-count">
            {analysis.recentViolations || 0}
          </span>
          <span className="stat-label">Recent Violations<br/>(Past 6 Months)</span>
        </div>
      </div>
      
      {analysis && analysis.riskFactors && analysis.riskFactors.length > 0 && (
        <div className="risk-factors-section">
          <h4>Key Risk Factors</h4>
          <p className="analysis-helper-text">
            Based on violation history, these are the areas requiring parent attention:
          </p>
          
          <div className="risk-factors-list">
            {analysis.riskFactors.map((factor, index) => (
              <div key={index} className="risk-factor-item">
                <h5>{factor.category}</h5>
                <div className="risk-count">{factor.count} {factor.count === 1 ? 'instance' : 'instances'}</div>
                
                {factor.examples && factor.examples.length > 0 && (
                  <div className="risk-examples">
                    {factor.examples.map((example, i) => (
                      <div key={i} className="risk-example">
                        <div className="example-description">"{example.description}"</div>
                        <div className="example-meta">
                          <span className={`risk-level ${example.risk_level.toLowerCase().replace(' ', '-')}`}>
                            {example.risk_level}
                          </span>
                          <span className="example-date">
                            {new Date(example.date).toLocaleDateString()}
                          </span>
                          <span className={`correction-status ${example.corrected ? 'corrected' : 'not-corrected'}`}>
                            {example.corrected ? 'Corrected' : 'Not Corrected'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {analysis && analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4>Parent Recommendations</h4>
          <p className="analysis-helper-text">
            Based on our analysis, here are some recommendations for parents considering this daycare:
          </p>
          
          <ul className="recommendations-list">
            {analysis.recommendations.map((recommendation, index) => (
              <li key={index}>{recommendation}</li>
            ))}
          </ul>
        </div>
      )}
      
      {(!analysis || !analysis.recommendations || analysis.recommendations.length === 0) && (
        <div className="recommendations-section">
          <h4>Parent Recommendations</h4>
          <p className="analysis-helper-text">
            Based on the violation data, here are some recommendations:
          </p>
          
          <ul className="recommendations-list">
            <li>Review the detailed violations listed above.</li>
            <li>Ask the daycare about their response to these violations.</li>
            <li>Look at the "Resolution Status" to see how quickly issues were addressed.</li>
            <li>Consider both the date of violations and how promptly they were resolved.</li>
            <li>Schedule a visit during regular hours to observe daily operations.</li>
          </ul>
        </div>
      )}
      
      <div className="violation-disclaimer">
        <p>
          <strong>Note:</strong> This analysis is based on publicly available violation data and is intended as a tool to help
          parents make informed decisions. Always visit a daycare in person and ask specific questions about areas of concern.
        </p>
      </div>
    </div>
  );
};

// Wrap the component with React.memo to prevent unnecessary re-renders
const ViolationAnalysis = React.memo(ViolationAnalysisComponent);

export default ViolationAnalysis;
