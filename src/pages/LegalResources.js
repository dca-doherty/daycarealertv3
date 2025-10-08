import React from 'react';
import '../styles/LegalResources.css';

function LegalResources() {
  return (
    <div className="legal-resources-page">
      <div className="legal-resources-container">
        {/* Header Section */}
        <div className="legal-header">
          <h1>Legal Resources for Parents</h1>
          <p className="lead-text">
            If your child has been injured or harmed at a daycare facility, you may need legal guidance. 
            DaycareAlert.com has partnered with <strong>Button Law Firm</strong>, a trusted Texas-based 
            law firm specializing in daycare injury cases, to provide resources and support for families.
          </p>
        </div>

        {/* Resources Cards */}
        <div className="resources-grid">
          {/* Daycare Injuries */}
          <a 
            href="https://www.buttonlawfirm.com/practice_areas/texas-daycare-injury-law-firm-daycare-negligence-attorney.cfm"
            target="_blank"
            rel="noopener noreferrer"
            className="resource-card"
          >
            <div className="resource-icon blue">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3>Daycare Injury Law</h3>
            <p>
              Learn about daycare negligence, your legal rights, and how Button Law Firm can help.
            </p>
            <span className="learn-more">Learn More →</span>
          </a>

          {/* FAQ */}
          <a 
            href="https://www.buttonlawfirm.com/faq.cfm"
            target="_blank"
            rel="noopener noreferrer"
            className="resource-card"
          >
            <div className="resource-icon green">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3>Frequently Asked Questions</h3>
            <p>
              Get answers to common questions about daycare injury cases and legal processes.
            </p>
            <span className="learn-more">View FAQs →</span>
          </a>

          {/* Success Stories */}
          <a 
            href="https://www.buttonlawfirm.com/case-results.cfm"
            target="_blank"
            rel="noopener noreferrer"
            className="resource-card"
          >
            <div className="resource-icon purple">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3>Success Stories</h3>
            <p>
              Read about successful case outcomes and how Button Law Firm has helped families.
            </p>
            <span className="learn-more">Read Cases →</span>
          </a>
        </div>

        {/* Contact Section */}
        <div className="contact-section">
          <h2>Need Legal Assistance?</h2>
          <p className="contact-intro">
            If you believe your child has been injured due to daycare negligence, contact Button Law Firm 
            to discuss your case. They offer consultations to help you understand your legal options.
          </p>
          
          <div className="contact-info-grid">
            <div className="contact-info-card">
              <h3>Button Law Firm</h3>
              <p>
                4315 W. Lovers Lane, Suite A<br />
                Dallas, TX 75209
              </p>
            </div>
            <div className="contact-info-card">
              <h3>Contact Information</h3>
              <p>
                Phone: <a href="tel:214-888-2216" className="contact-link">214-888-2216</a><br />
                Website: <a href="https://www.buttonlawfirm.com" target="_blank" rel="noopener noreferrer" className="contact-link">www.buttonlawfirm.com</a>
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="disclaimer">
          <p>
            DaycareAlert.com provides this resource as a courtesy. We are not a law firm and do not provide legal advice. 
            Please contact Button Law Firm directly for legal guidance specific to your situation.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LegalResources;
