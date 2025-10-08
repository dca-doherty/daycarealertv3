import React from 'react';
import { useNavigate } from 'react-router-dom';
import logoImage from '../images/logo-transparent.png';
import '../styles/IntroPage.css';

const IntroPage = () => {
  const navigate = useNavigate();

  return (
    <div className="intro-page">
      <div className="logo-container">
        <img src={logoImage} alt="DaycareAlert Logo" className="intro-logo" />
      </div>
      <h1>Welcome to DaycareAlert</h1>
      <p>Your trusted source for daycare information in Texas</p>
      <div className="intro-features">
        <div className="feature" onClick={() => navigate('/home')} role="button" tabIndex={0}>
          <h2>Find Daycares</h2>
          <p>Search and compare daycares in your area</p>
        </div>
        <div className="feature" onClick={() => navigate('/home')} role="button" tabIndex={0}>
          <h2>Check Violations</h2>
          <p>Stay informed about daycare safety and compliance</p>
        </div>
        <div className="feature" onClick={() => navigate('/home')} role="button" tabIndex={0}>
          <h2>Estimate Costs</h2>
          <p>Get pricing estimates for daycares near you</p>
        </div>
      </div>
      <button className="cta-button" onClick={() => navigate('/home')}>
        Explore Daycares
      </button>
<p className="disclaimer">
DaycareAlert provides information to help parents make informed decisions.
All data is sourced from public records and estimated pricing models.
</p>
</div>
  );
};

export default IntroPage;
