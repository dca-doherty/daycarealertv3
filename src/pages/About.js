import React from 'react';
import PageHeader from '../components/PageHeader';
import headerImage from '../images/pexels-mikhail-nilov-8923956.jpg';
import familyImage from '../images/dohertyfamily.jpg';
import '../styles/About.css';

const About = () => {
  return (
    <div className="about-page">
      <PageHeader title="About DaycareAlert" backgroundImage={headerImage} />
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-10">
            <div className="about-content">
              <div className="about-body">
                <p className="mission-statement">Our mission is to empower parents with comprehensive, up-to-date information about daycare facilities in Texas.</p>
                
                <section className="about-section">
                  <h2>Our Story</h2>
                  <p>DaycareAlert was founded by Brian Doherty, a parent who experienced firsthand the challenges of finding reliable information about daycare facilities. After an incident at his son's daycare in North Dallas, Brian realized the need for a centralized, transparent resource for parents.</p>
                </section>
                
                <section className="about-section">
                  <h2>Our Commitment</h2>
                  <p>We are dedicated to:</p>
                  <ul>
                    <li>Providing clear, honest information about daycare facilities</li>
                    <li>Empowering parents to make informed decisions</li>
                    <li>Promoting transparency in the childcare industry</li>
                    <li>Supporting and connecting Texas families</li>
                  </ul>
                </section>
                
                <section className="about-section">
                  <h2>How We Help</h2>
                  <p>DaycareAlert offers a range of tools and resources, including:</p>
                  <ul>
                    <li>Comprehensive daycare database</li>
                    <li>Up-to-date violation reports</li>
                    <li>Estimated pricing information</li>
                    <li>Educational resources for parents</li>
                  </ul>
                </section>
                <section className="about-section family-section">
                  <h2>Our Family</h2>
                  <p>DaycareAlert is a family-focused business, created by parents for parents.</p>
                  <div className="family-photo-container">
                    <img
                      src={familyImage}
                      alt="The Doherty Family"
                      className="family-photo"
                    />
                    <p className="photo-caption">The Doherty Family</p>
                  </div>
                 </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
