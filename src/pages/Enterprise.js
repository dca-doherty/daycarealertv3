import React from 'react';
import '../styles/Enterprise.css';

const Enterprise = () => {
  return (
    <div className="enterprise">
      <div className="hero-section">
        <h1>Database Design & Development for Institutional Clients</h1>
        <p className="subtitle">Comprehensive daycare compliance data solutions for government agencies, insurance companies, and research institutions</p>
      </div>

      <section className="services-overview">
        <h2>Enterprise Database Services</h2>
        <p>DaycareAlert provides specialized database design, development, and licensing services to organizations requiring comprehensive daycare facility compliance and violation data.</p>
        
        <div className="service-grid">
          <div className="service-card">
            <h3>🏛️ Government Agencies</h3>
            <ul>
              <li>Custom data warehouses for regulatory oversight</li>
              <li>Real-time violation tracking and reporting systems</li>
              <li>Compliance monitoring dashboards</li>
              <li>Predictive analytics for inspection targeting</li>
              <li>Multi-jurisdiction data aggregation</li>
            </ul>
          </div>

          <div className="service-card">
            <h3>🏢 Insurance Companies</h3>
            <ul>
              <li>Risk assessment database development</li>
              <li>Historical violation analytics platforms</li>
              <li>Actuarial data modeling services</li>
              <li>Premium pricing analytics tools</li>
              <li>Claims correlation databases</li>
            </ul>
          </div>

          <div className="service-card">
            <h3>🔬 Research Institutions</h3>
            <ul>
              <li>Academic research database design</li>
              <li>Longitudinal study data infrastructure</li>
              <li>Statistical analysis platform development</li>
              <li>Custom query and reporting systems</li>
              <li>Data export and API integration</li>
            </ul>
          </div>

          <div className="service-card">
            <h3>💼 Business Clients</h3>
            <ul>
              <li>Franchise site selection analytics</li>
              <li>Competitive intelligence databases</li>
              <li>Market analysis platforms</li>
              <li>Investment due diligence data services</li>
              <li>Custom reporting and dashboards</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="database-features">
        <h2>Our Database Capabilities</h2>
        <div className="features-grid">
          <div className="feature-item">
            <h4>Comprehensive Coverage</h4>
            <p>10,000+ licensed Texas daycare facilities with complete violation history, licensing data, and compliance records</p>
          </div>
          <div className="feature-item">
            <h4>Real-Time Updates</h4>
            <p>Weekly database refreshes from state regulatory sources ensuring current information</p>
          </div>
          <div className="feature-item">
            <h4>Custom Development</h4>
            <p>Tailored database solutions designed for your specific analytical and reporting requirements</p>
          </div>
          <div className="feature-item">
            <h4>API Integration</h4>
            <p>RESTful API access enabling seamless integration with your existing systems</p>
          </div>
          <div className="feature-item">
            <h4>Analytics Tools</h4>
            <p>Advanced analytics including risk scoring, trend analysis, and predictive modeling</p>
          </div>
          <div className="feature-item">
            <h4>Data Security</h4>
            <p>Enterprise-grade security with role-based access controls and audit logging</p>
          </div>
        </div>
      </section>

      <section className="data-offerings">
        <h2>Database Licensing Options</h2>
        <div className="licensing-tiers">
          <div className="tier">
            <h3>Full Database Access</h3>
            <p>Complete read access to all facility records, violation history, licensing data, and compliance metrics</p>
            <ul>
              <li>Unlimited queries</li>
              <li>All historical data</li>
              <li>Export capabilities</li>
              <li>API access included</li>
            </ul>
          </div>

          <div className="tier">
            <h3>Custom Query Services</h3>
            <p>Tailored database queries and reports designed for specific research or analytical needs</p>
            <ul>
              <li>Custom schema design</li>
              <li>Automated reporting</li>
              <li>Scheduled data exports</li>
              <li>Technical support</li>
            </ul>
          </div>

          <div className="tier">
            <h3>API Integration</h3>
            <p>Programmatic access to our database through RESTful API endpoints</p>
            <ul>
              <li>Real-time data access</li>
              <li>Webhook notifications</li>
              <li>Rate limit customization</li>
              <li>Developer documentation</li>
            </ul>
          </div>

          <div className="tier">
            <h3>Bulk Data Export</h3>
            <p>One-time or periodic database exports in your preferred format</p>
            <ul>
              <li>CSV, JSON, or XML formats</li>
              <li>Custom field selection</li>
              <li>Automated delivery</li>
              <li>Data transformation services</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="use-cases">
        <h2>Enterprise Use Cases</h2>
        <div className="use-case-list">
          <div className="use-case">
            <h4>Regulatory Compliance Monitoring</h4>
            <p>State agencies use our database platform to track facility compliance trends, identify high-risk centers, and prioritize inspection resources efficiently.</p>
          </div>
          <div className="use-case">
            <h4>Insurance Risk Assessment</h4>
            <p>Insurance carriers leverage our violation history database to accurately price liability policies and assess underwriting risk for daycare operations.</p>
          </div>
          <div className="use-case">
            <h4>Academic Research</h4>
            <p>Universities access our comprehensive database for longitudinal studies on childcare quality, regulatory effectiveness, and policy impact analysis.</p>
          </div>
          <div className="use-case">
            <h4>Investment Due Diligence</h4>
            <p>Private equity firms and investors use our data services to evaluate daycare franchise opportunities and assess market conditions.</p>
          </div>
          <div className="use-case">
            <h4>Policy Development</h4>
            <p>Think tanks and policy organizations analyze our compliance database to inform childcare regulation reform and safety standards.</p>
          </div>
          <div className="use-case">
            <h4>Legal Discovery</h4>
            <p>Law firms access historical violation records and compliance data for litigation support and expert witness preparation.</p>
          </div>
        </div>
      </section>

      <section className="technical-specs">
        <h2>Technical Specifications</h2>
        <div className="specs-grid">
          <div className="spec">
            <strong>Database Size:</strong> 10,000+ facility records
          </div>
          <div className="spec">
            <strong>Data Points:</strong> 50+ fields per facility
          </div>
          <div className="spec">
            <strong>Historical Coverage:</strong> 10+ years of violation records
          </div>
          <div className="spec">
            <strong>Update Frequency:</strong> Weekly state data refresh
          </div>
          <div className="spec">
            <strong>API Format:</strong> RESTful JSON responses
          </div>
          <div className="spec">
            <strong>Authentication:</strong> OAuth 2.0 and API keys
          </div>
          <div className="spec">
            <strong>Data Formats:</strong> JSON, CSV, XML
          </div>
          <div className="spec">
            <strong>SLA Uptime:</strong> 99.9% availability
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Request Enterprise Database Access</h2>
        <p>Contact our enterprise team to discuss custom database design, development services, or API licensing for your organization.</p>
        
        <div className="contact-info">
          <div className="contact-method">
            <h4>Email</h4>
            <p><a href="mailto:enterprise@daycarealert.com">enterprise@daycarealert.com</a></p>
          </div>
          <div className="contact-method">
            <h4>Subject Line</h4>
            <p>"Database Services Inquiry - [Your Organization]"</p>
          </div>
          <div className="contact-method">
            <h4>What to Include</h4>
            <p>Your organization name, specific data needs, use case description, and preferred contact method</p>
          </div>
        </div>

        <div className="pilot-program">
          <h3>🎯 Free Pilot Program Available</h3>
          <p>We offer complimentary 90-day pilot access to qualifying government agencies, research institutions, and non-profit organizations. Contact us to learn if your organization is eligible.</p>
        </div>
      </section>

      <section className="resources-section">
        <h2>Additional Resources</h2>
        <div className="resource-links">
          <a href="/api-docs" className="resource-link">
            <span className="icon">📘</span>
            <strong>API Documentation</strong>
            <p>Technical specifications and integration guides</p>
          </a>
          <a href="/enterprise/case-studies" className="resource-link">
            <span className="icon">📊</span>
            <strong>Case Studies</strong>
            <p>Real-world applications of our database services</p>
          </a>
          <a href="/enterprise/pricing" className="resource-link">
            <span className="icon">💰</span>
            <strong>Pricing Information</strong>
            <p>Enterprise licensing and custom development costs</p>
          </a>
        </div>
      </section>
    </div>
  );
};

export default Enterprise;
