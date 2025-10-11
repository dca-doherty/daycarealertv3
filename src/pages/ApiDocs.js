import React, { useState } from 'react';
import '../styles/ApiDocs.css';

const ApiDocs = () => {
  const [activeEndpoint, setActiveEndpoint] = useState(null);

  const endpoints = [
    {
      method: 'GET',
      path: '/api/v1/facilities',
      title: 'Retrieve Facility Database Records',
      description: 'Access comprehensive daycare facility records including violation history, licensing information, and compliance data.',
      authentication: 'API Key Required',
      parameters: [
        { name: 'zip', type: 'string', description: 'Filter by ZIP code' },
        { name: 'city', type: 'string', description: 'Filter by city name' },
        { name: 'license_type', type: 'string', description: 'Filter by license type (Licensed Center, Licensed Home, Registered Home)' },
        { name: 'min_capacity', type: 'integer', description: 'Minimum facility capacity filter' },
        { name: 'max_capacity', type: 'integer', description: 'Maximum facility capacity filter' },
        { name: 'page', type: 'integer', description: 'Page number for pagination (default: 1)' },
        { name: 'limit', type: 'integer', description: 'Results per page (default: 50, max: 500)' }
      ],
      response: {
        "total": 10234,
        "page": 1,
        "limit": 50,
        "facilities": [
          {
            "facility_id": "TX-DAY-12345",
            "operation_name": "Example Daycare Center",
            "license_type": "Licensed Center",
            "location_address": "123 Main St",
            "city": "Dallas",
            "zip": "75201",
            "total_capacity": 75,
            "programs_provided": "Infant, Toddler, Preschool",
            "deficiency_high": 0,
            "deficiency_medium": 2,
            "deficiency_low": 5,
            "total_inspections": 12,
            "last_inspection_date": "2024-09-15",
            "license_status": "Active"
          }
        ]
      }
    },
    {
      method: 'GET',
      path: '/api/v1/violations',
      title: 'Access Violation Database',
      description: 'Retrieve detailed violation records with historical compliance data and severity classifications.',
      authentication: 'API Key Required',
      parameters: [
        { name: 'facility_id', type: 'string', description: 'Specific facility identifier' },
        { name: 'date_from', type: 'date', description: 'Start date for violation search (YYYY-MM-DD)' },
        { name: 'date_to', type: 'date', description: 'End date for violation search (YYYY-MM-DD)' },
        { name: 'severity', type: 'string', description: 'Filter by severity (high, medium-high, medium, medium-low, low)' },
        { name: 'violation_type', type: 'string', description: 'Filter by violation category' },
        { name: 'corrected', type: 'boolean', description: 'Filter by correction status' }
      ],
      response: {
        "total": 2341,
        "violations": [
          {
            "violation_id": "V-2024-00123",
            "facility_id": "TX-DAY-12345",
            "inspection_date": "2024-08-20",
            "violation_type": "Health and Safety",
            "severity": "medium",
            "description": "Playground equipment requires maintenance",
            "corrected": true,
            "correction_date": "2024-08-25",
            "standard_violated": "746.3401(d)"
          }
        ]
      }
    },
    {
      method: 'GET',
      path: '/api/v1/analytics/risk-score',
      title: 'Calculate Facility Risk Scores',
      description: 'Generate risk assessment scores using proprietary algorithms analyzing violation history, inspection patterns, and compliance trends.',
      authentication: 'API Key Required',
      parameters: [
        { name: 'facility_id', type: 'string', required: true, description: 'Facility to analyze' },
        { name: 'period', type: 'integer', description: 'Analysis period in months (default: 24)' },
        { name: 'include_factors', type: 'boolean', description: 'Include risk factor breakdown (default: false)' }
      ],
      response: {
        "facility_id": "TX-DAY-12345",
        "risk_score": 2.3,
        "risk_level": "Low",
        "score_range": "1-5",
        "analysis_period_months": 24,
        "factors": {
          "high_violations": 0.0,
          "medium_violations": 0.4,
          "low_violations": 0.2,
          "inspection_frequency": 0.3,
          "correction_speed": 0.1,
          "compliance_trend": -0.3
        },
        "calculated_at": "2024-10-10T14:23:00Z"
      }
    },
    {
      method: 'GET',
      path: '/api/v1/analytics/trends',
      title: 'Violation Trend Analysis',
      description: 'Access aggregated violation trends across geographic regions, time periods, and facility types for policy analysis and research.',
      authentication: 'API Key Required',
      parameters: [
        { name: 'region', type: 'string', description: 'Geographic region (city, county, or statewide)' },
        { name: 'date_from', type: 'date', description: 'Trend analysis start date' },
        { name: 'date_to', type: 'date', description: 'Trend analysis end date' },
        { name: 'license_type', type: 'string', description: 'Filter by license type' },
        { name: 'grouping', type: 'string', description: 'Group results by (month, quarter, year)' }
      ],
      response: {
        "region": "Dallas County",
        "period": "2024",
        "total_facilities": 1234,
        "trends": [
          {
            "period": "2024-Q1",
            "total_violations": 456,
            "avg_violations_per_facility": 0.37,
            "high_severity_pct": 5.2,
            "most_common_violation": "Ratio violations"
          }
        ]
      }
    },
    {
      method: 'POST',
      path: '/api/v1/exports/custom',
      title: 'Custom Data Exports',
      description: 'Request custom database exports with specific field selections and filtering criteria. Exports are generated asynchronously.',
      authentication: 'API Key Required',
      parameters: [
        { name: 'fields', type: 'array', description: 'Array of field names to include in export' },
        { name: 'filters', type: 'object', description: 'Filter criteria object' },
        { name: 'format', type: 'string', description: 'Export format (csv, json, xml)' },
        { name: 'delivery_method', type: 'string', description: 'How to deliver export (webhook, email, s3)' }
      ],
      response: {
        "export_id": "EXP-2024-00789",
        "status": "processing",
        "estimated_completion": "2024-10-10T15:30:00Z",
        "download_url": null,
        "message": "Export job queued successfully"
      }
    }
  ];

  return (
    <div className="api-docs">
      <div className="api-header">
        <h1>DAYCAREALERT API Documentation</h1>
        <p className="tagline">Database Access for Enterprise Clients</p>
      </div>

      <section className="api-overview">
        <div className="important-notice">
          <span className="icon">🔒</span>
          <div className="notice-content">
            <strong>Enterprise Access Required</strong>
            <p>Our database API is available to government agencies, insurance companies, research institutions, and licensed business partners. Contact <a href="mailto:enterprise@daycarealert.com">enterprise@daycarealert.com</a> for API credentials and commercial licensing terms.</p>
          </div>
        </div>

        <div className="quick-start">
          <h2>Quick Start Guide</h2>
          <div className="steps">
            <div className="step">
              <span className="step-number">1</span>
              <h3>Request Access</h3>
              <p>Contact our enterprise team to discuss your data needs and obtain API credentials</p>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <h3>Authentication</h3>
              <p>Include your API key in the request header: <code>X-API-Key: your_api_key_here</code></p>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <h3>Make Requests</h3>
              <p>Use standard HTTPS requests to access database endpoints</p>
            </div>
            <div className="step">
              <span className="step-number">4</span>
              <h3>Process Data</h3>
              <p>Receive JSON responses with comprehensive facility and violation data</p>
            </div>
          </div>
        </div>
      </section>

      <section className="api-endpoints">
        <h2>Available Endpoints</h2>
        <p className="section-description">Access comprehensive daycare facility databases through RESTful API endpoints</p>
        
        <div className="endpoints-list">
          {endpoints.map((endpoint, index) => (
            <div key={index} className="endpoint-card">
              <div className="endpoint-header" onClick={() => setActiveEndpoint(activeEndpoint === index ? null : index)}>
                <div className="endpoint-title">
                  <span className={`method method-${endpoint.method.toLowerCase()}`}>{endpoint.method}</span>
                  <code className="path">{endpoint.path}</code>
                </div>
                <h3>{endpoint.title}</h3>
                <p className="endpoint-desc">{endpoint.description}</p>
                <button className="expand-btn">
                  {activeEndpoint === index ? '−' : '+'}
                </button>
              </div>

              {activeEndpoint === index && (
                <div className="endpoint-details">
                  <div className="auth-badge">
                    <span className="icon">🔑</span> {endpoint.authentication}
                  </div>

                  <div className="parameters">
                    <h4>Query Parameters</h4>
                    <table className="params-table">
                      <thead>
                        <tr>
                          <th>Parameter</th>
                          <th>Type</th>
                          <th>Required</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {endpoint.parameters.map((param, pIndex) => (
                          <tr key={pIndex}>
                            <td><code>{param.name}</code></td>
                            <td>{param.type}</td>
                            <td>{param.required ? '✓' : '−'}</td>
                            <td>{param.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="response-example">
                    <h4>Example Response</h4>
                    <pre><code>{JSON.stringify(endpoint.response, null, 2)}</code></pre>
                  </div>

                  <div className="code-examples">
                    <h4>Request Example</h4>
                    <pre><code>{`curl -X ${endpoint.method} \\
  'https://api.daycarealert.com${endpoint.path}${endpoint.method === 'GET' ? '?city=Dallas&limit=10' : ''}' \\
  -H 'X-API-Key: your_api_key_here' \\
  -H 'Content-Type: application/json'`}</code></pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="database-details">
        <h2>Database Specifications</h2>
        <div className="specs-grid">
          <div className="spec-card">
            <h3>Coverage</h3>
            <ul>
              <li><strong>10,000+</strong> licensed Texas facilities</li>
              <li><strong>50+</strong> data fields per facility</li>
              <li><strong>10 years</strong> historical violation records</li>
              <li><strong>Weekly</strong> database updates from state sources</li>
            </ul>
          </div>

          <div className="spec-card">
            <h3>Technical Details</h3>
            <ul>
              <li><strong>Format:</strong> JSON responses</li>
              <li><strong>Authentication:</strong> API key (header-based)</li>
              <li><strong>Rate Limits:</strong> Configurable per license tier</li>
              <li><strong>Uptime SLA:</strong> 99.9% availability guarantee</li>
            </ul>
          </div>

          <div className="spec-card">
            <h3>Data Quality</h3>
            <ul>
              <li><strong>Source:</strong> Texas Health & Human Services Commission</li>
              <li><strong>Validation:</strong> Automated quality checks</li>
              <li><strong>Accuracy:</strong> Verified against state records</li>
              <li><strong>Completeness:</strong> Comprehensive coverage</li>
            </ul>
          </div>

          <div className="spec-card">
            <h3>Support & SLA</h3>
            <ul>
              <li><strong>Response Time:</strong> &lt; 200ms average</li>
              <li><strong>Support Hours:</strong> Business hours (CST)</li>
              <li><strong>Emergency Support:</strong> 24/7 for critical issues</li>
              <li><strong>Documentation:</strong> Complete API reference</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="licensing-options">
        <h2>Database Licensing Tiers</h2>
        <div className="tiers-grid">
          <div className="tier-card">
            <h3>Research Tier</h3>
            <p className="tier-price">Custom Pricing</p>
            <ul>
              <li>Limited API calls (10,000/month)</li>
              <li>Read-only database access</li>
              <li>Email support</li>
              <li>Perfect for academic research</li>
            </ul>
          </div>

          <div className="tier-card featured">
            <h3>Professional Tier</h3>
            <p className="tier-price">Custom Pricing</p>
            <ul>
              <li>100,000 API calls/month</li>
              <li>Full database access</li>
              <li>Priority email & phone support</li>
              <li>Webhook notifications</li>
              <li>Custom reporting</li>
            </ul>
          </div>

          <div className="tier-card">
            <h3>Enterprise Tier</h3>
            <p className="tier-price">Custom Pricing</p>
            <ul>
              <li>Unlimited API calls</li>
              <li>Dedicated database instance</li>
              <li>24/7 phone support</li>
              <li>Custom development services</li>
              <li>SLA guarantees</li>
              <li>White-label options</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="use-cases-section">
        <h2>API Use Cases</h2>
        <div className="use-cases-grid">
          <div className="use-case-card">
            <h4>Government Integration</h4>
            <p>State agencies integrate our database API into regulatory dashboards for real-time compliance monitoring and inspection planning.</p>
          </div>

          <div className="use-case-card">
            <h4>Insurance Underwriting</h4>
            <p>Insurance carriers query violation history via API to automate risk assessment and policy pricing for daycare facilities.</p>
          </div>

          <div className="use-case-card">
            <h4>Research Analysis</h4>
            <p>Academic researchers access historical data through batch exports for longitudinal studies on childcare quality and regulation.</p>
          </div>

          <div className="use-case-card">
            <h4>Third-Party Applications</h4>
            <p>Developers build parent-facing apps that leverage our database API to display facility safety information.</p>
          </div>

          <div className="use-case-card">
            <h4>Investment Analytics</h4>
            <p>Private equity firms use our analytics API to evaluate market conditions and assess acquisition targets in the daycare sector.</p>
          </div>

          <div className="use-case-card">
            <h4>Legal Discovery</h4>
            <p>Law firms access comprehensive violation records through custom queries for litigation support and expert analysis.</p>
          </div>
        </div>
      </section>

      <section className="security-section">
        <h2>Security & Compliance</h2>
        <div className="security-features">
          <div className="security-item">
            <span className="icon">🔐</span>
            <h4>Enterprise Security</h4>
            <p>All API requests use HTTPS encryption with TLS 1.3. API keys are hashed and never stored in plain text.</p>
          </div>
          <div className="security-item">
            <span className="icon">👤</span>
            <h4>Access Controls</h4>
            <p>Role-based access controls (RBAC) ensure users only access authorized database resources.</p>
          </div>
          <div className="security-item">
            <span className="icon">📋</span>
            <h4>Audit Logging</h4>
            <p>Complete audit trails of all database queries and exports for compliance and security review.</p>
          </div>
          <div className="security-item">
            <span className="icon">⚖️</span>
            <h4>Data Privacy</h4>
            <p>All database operations comply with state and federal data privacy regulations.</p>
          </div>
        </div>
      </section>

      <section className="get-started-section">
        <h2>Ready to Get Started?</h2>
        <p>Request enterprise database access and API credentials today</p>
        
        <div className="contact-box">
          <div className="contact-detail">
            <h4>📧 Email</h4>
            <p><a href="mailto:enterprise@daycarealert.com">enterprise@daycarealert.com</a></p>
          </div>
          <div className="contact-detail">
            <h4>📝 Subject Line</h4>
            <p>"API Access Request - [Your Organization]"</p>
          </div>
          <div className="contact-detail">
            <h4>📄 Include</h4>
            <p>Organization name, use case description, estimated API call volume, and technical contact</p>
          </div>
        </div>

        <div className="pilot-callout">
          <h3>Free 90-Day Pilot Program</h3>
          <p>Qualifying government agencies, research institutions, and non-profit organizations may be eligible for complimentary pilot access to our database API. Contact us to inquire about eligibility.</p>
        </div>
      </section>

      <footer className="api-footer">
        <div className="footer-links">
          <a href="/enterprise">Enterprise Services</a>
          <a href="/terms">Terms of Service</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/">DaycareAlert Home</a>
        </div>
      </footer>
    </div>
  );
};

export default ApiDocs;
