import React from 'react';
import PageHeader from '../components/PageHeader';
import headerImage from '../images/pexels-mikhail-nilov-8923956.jpg';
import '../styles/Statistics.css';

const Statistics = () => {
  return (
    <div className="statistics-page">
      <PageHeader title="Texas Daycare Abuse Statistics" backgroundImage={headerImage} />
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-10">
            <div className="statistics-content">
              <h2>Understanding the Scope of the Problem</h2>
              <p>At DaycareAlert.com, we believe that informed parents are empowered parents. The following statistics about daycare abuse in Texas are provided to help families understand the reality of childcare safety issues, not to cause undue alarm. By understanding these statistics, parents can make better decisions and advocate for improved safety measures in daycare facilities.</p>
              
              <h2>Key Figures at a Glance</h2>
              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-number">1 million</div>
                  <div className="stat-description">Children attending Texas licensed daycares</div>
                </div>
                <div className="stat-box">
                  <div className="stat-number">8,058</div>
                  <div className="stat-description">Licensed daycare centers in Texas</div>
                </div>
                <div className="stat-box highlight">
                  <div className="stat-number">3,200+</div>
                  <div className="stat-description">Facilities cited for abuse/neglect (10-year period)</div>
                </div>
                <div className="stat-box highlight">
                  <div className="stat-number">88</div>
                  <div className="stat-description">Children died from abuse/neglect in daycares (10-year period)</div>
                </div>
              </div>

              <h2>Daycare Abuse by the Numbers</h2>
              <h3>Prevalence and Reporting</h3>
              <ul>
                <li>Nearly 1 million children attend licensed daycare centers in Texas [Texas Department of Health and Human Services]</li>
                <li>8,058 licensed daycare centers operate across the state [Texas Department of Health and Human Services]</li>
                <li>Over 3,200 child care facilities were cited for abuse and neglect over a 10-year period according to a 2018 investigation [Austin American-Statesman]</li>
                <li>Texas ranks among the highest in the nation for reported daycare abuse cases [U.S. Department of Health and Human Services]</li>
              </ul>

              <h3>Types of Abuse</h3>
              <ul>
                <li>21.9% of reported abuse cases in daycares involve sexual abuse [U.S. Department of Health and Human Services]</li>
                <li>More than 450 children were sexually abused in Texas daycare facilities over a 10-year period [Texas Tribune]</li>
                <li>In 91% of cases, the child sexual abuser is someone known to the victim's family [U.S. Department of Health and Human Services]</li>
              </ul>

              <h3>Fatalities and Serious Incidents</h3>
              <ul>
                <li>88 children died as a result of abuse or neglect in Texas daycare centers over a 10-year period [Austin American-Statesman]</li>
                <li>Nearly half (42) of these deaths occurred in illegal, unlicensed daycare operations [Austin American-Statesman]</li>
                <li>Illegal daycare operations are significantly more dangerous than licensed facilities [Texas Department of Family and Protective Services]</li>
              </ul>

              <h2>Understanding Risk Factors</h2>
              <div className="risk-factors">
                <div className="risk-factor">
                  <h4>Facility Type</h4>
                  <p>Illegal/unlicensed facilities present significantly higher risks than licensed centers</p>
                </div>
                <div className="risk-factor">
                  <h4>Staff Screening</h4>
                  <p>Facilities with inadequate background check procedures pose greater threats</p>
                </div>
                <div className="risk-factor">
                  <h4>Staff-to-Child Ratio</h4>
                  <p>Overcrowded facilities with too few staff members create environments where abuse can go undetected</p>
                </div>
                <div className="risk-factor">
                  <h4>Transparency</h4>
                  <p>Facilities that restrict parent access or lack monitoring systems have higher incident rates</p>
                </div>
              </div>
              
              <h2>Daycare Abuse Risk Analysis</h2>
              <p>We've developed a comprehensive risk model that analyzes daycare abuse probabilities based on facility quality, child age, and other factors. This statistical analysis helps contextualize the raw numbers and provides parents with a clearer understanding of relative risks. Our analysis reveals dramatic differences in risk levels based on several key variables:</p>
              
              <h3>Facility Quality Risk Comparison</h3>
              <div className="risk-comparison-chart">
                <div className="risk-bar-container">
                  <div className="risk-label">High-Quality Centers</div>
                  <div className="risk-bar" style={{width: '5%'}}>
                    <span className="risk-value">1 in 1,949</span>
                  </div>
                </div>
                <div className="risk-bar-container">
                  <div className="risk-label">Good-Quality Centers</div>
                  <div className="risk-bar" style={{width: '15%'}}>
                    <span className="risk-value">1 in 305</span>
                  </div>
                </div>
                <div className="risk-bar-container">
                  <div className="risk-label">Basic-Quality Centers</div>
                  <div className="risk-bar" style={{width: '40%'}}>
                    <span className="risk-value">1 in 113</span>
                  </div>
                </div>
                <div className="risk-bar-container">
                  <div className="risk-label">Poor-Quality Centers</div>
                  <div className="risk-bar" style={{width: '70%'}}>
                    <span className="risk-value">1 in 52</span>
                  </div>
                </div>
                <div className="risk-bar-container">
                  <div className="risk-label">Illegal/Unrated Facilities</div>
                  <div className="risk-bar risk-bar-danger" style={{width: '95%'}}>
                    <span className="risk-value">1 in 13</span>
                  </div>
                </div>
                <div className="risk-caption">5-year probability of experiencing abuse or neglect</div>
              </div>
              
              <h3>Key Insights from Our Risk Model</h3>
              <ul className="risk-insights">
                <li><strong>Facility quality matters most:</strong> Children in poor-quality or illegal facilities face 15-37 times higher risk than those in high-quality centers</li>
                <li><strong>Age affects vulnerability:</strong> Infants face approximately 2.3× higher risk than preschoolers due to their inability to communicate</li>
                <li><strong>Risk is unevenly distributed:</strong> The average risk (approximately 1 in 102 over five years) masks dramatic variations based on facility quality and type</li>
                <li><strong>Witnessing vs. experiencing:</strong> The probability of witnessing abuse (1 in 40 over five years) is higher than experiencing it directly</li>
                <li><strong>Reporting varies by abuse type:</strong> Physical abuse is reported at higher rates than neglect, which may be less visible</li>
              </ul>
              
              <p className="methodology-note">Our statistical model incorporates data from Texas Department of Family and Protective Services, facility quality ratings, age stratification, and evidence-based adjustments for underreporting. Risk probabilities are expressed as 5-year cumulative risks with appropriate statistical correlations.</p>

              <h2>Reporting Child Abuse in Texas</h2>
              <p>Every Texan is required by law to report suspected child abuse:</p>
              <ul>
                <li>Mandatory reporting: Anyone with reasonable cause to believe a child is being abused must report it [<a href="https://statutes.capitol.texas.gov/Docs/FA/htm/FA.261.htm" target="_blank" rel="noopener noreferrer">Texas Family Code</a>]</li>
                <li>Legal protection: Those who report abuse in good faith are immune from civil or criminal liability</li>
                <li>Confidentiality: The Texas Department of Family and Protective Services keeps reporter names confidential</li>
                <li>Penalties: Failure to report suspected abuse can result in misdemeanor or felony charges</li>
              </ul>

              <h3>How to Report:</h3>
              <ul>
                <li>Emergency situations: Call 911 immediately</li>
                <li>Texas Abuse Hotline: <a href="tel:18002525400">1-800-252-5400</a> (available 24/7)</li>
                <li>Online reporting: <a href="https://www.txabusehotline.org" target="_blank" rel="noopener noreferrer">www.txabusehotline.org</a> (for non-emergency situations)</li>
              </ul>

              <h2>Prevention Resources</h2>
              <div className="prevention-resources">
                <a href="/resources?resource=safety-checklist" className="resource-card">
                  <h4>Safety Checklist</h4>
                  <p>Download our comprehensive daycare safety checklist</p>
                </a>
                <a href="/resources?resource=warning-signs" className="resource-card">
                  <h4>Warning Signs</h4>
                  <p>Learn to recognize the warning signs of potential abuse</p>
                </a>
                <a href="/resources?resource=questions" className="resource-card">
                  <h4>Questions to Ask</h4>
                  <p>Essential questions to ask potential daycare providers</p>
                </a>
                <a href="/resources?resource=verification" className="resource-card">
                  <h4>Verification Guide</h4>
                  <p>How to verify a daycare's licensing and violation history</p>
                </a>
              </div>

              <h2>Data Sources</h2>
              <p>The statistics presented on this page come from the following authoritative sources:</p>
              <ul>
                <li><a href="https://www.hhs.texas.gov/services/safety/child-care" target="_blank" rel="noopener noreferrer">Texas Department of Health and Human Services - Child Care Regulation</a></li>
                <li><a href="https://www.dfps.texas.gov/" target="_blank" rel="noopener noreferrer">Texas Department of Family and Protective Services (DFPS)</a></li>
                <li><a href="https://www.acf.hhs.gov/cb/" target="_blank" rel="noopener noreferrer">U.S. Department of Health and Human Services - Children's Bureau</a></li>
                <li><a href="https://www.texastribune.org/2018/12/06/texas-day-care-child-deaths-sexual-abuse/" target="_blank" rel="noopener noreferrer">Austin American-Statesman Investigation (via Texas Tribune)</a></li>
                <li><a href="https://www.txabusehotline.org/" target="_blank" rel="noopener noreferrer">Texas Abuse Hotline (for reporting)</a></li>
              </ul>

              <p>For more detailed statistics, please consult the following resources:</p>
              <ul>
                <li><a href="https://www.hhs.texas.gov/about/records-statistics/data-statistics/child-care-regulation-statistics" target="_blank" rel="noopener noreferrer">Texas Health and Human Services - Child Care Regulation Statistics</a></li>
                <li><a href="https://www.dfps.texas.gov/About_DFPS/Data_Book/" target="_blank" rel="noopener noreferrer">Texas Department of Family and Protective Services (DFPS) Data Book</a></li>
                <li><a href="https://www.hhs.texas.gov/about/records-statistics/data-statistics/child-care-regulation-statistics" target="_blank" rel="noopener noreferrer">Child Care Investigations Reports</a></li>
              </ul>

              <div className="disclaimer">
                <h3>Important Note</h3>
                <p>These statistics are provided to inform, not to alarm. The vast majority of childcare providers are dedicated professionals who provide safe, nurturing environments. However, being aware of potential risks empowers parents to make informed choices and take proactive steps to ensure their children's safety.</p>
                <p>Last updated: April 2025</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
