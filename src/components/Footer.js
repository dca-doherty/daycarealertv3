import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4>DaycareAlert</h4>
          <p>Finding the best care for your children in Texas</p>
          <p>&copy; {currentYear} DaycareAlert.com. All rights reserved.</p>
        </div>
        
        <div className="footer-section">
          <h4>Quick Links</h4>
          <nav className="footer-links">
            <Link to="/home">Home</Link>
            <Link to="/daycare-finder">Daycare Finder</Link>
            <Link to="/cost-estimator">Cost Estimator</Link>
            <Link to="/alerts">Alerts</Link>
            {/* Marketplace and Sponsors links hidden per request */}
            {/* <Link to="/marketplace">Marketplace</Link>
            <Link to="/sponsors">Sponsors</Link> */}
          </nav>
        </div>
        
        <div className="footer-section">
          <h4>More</h4>
          <nav className="footer-links">
            <Link to="/about">About Us</Link>
            <Link to="/resources">Resources</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/enterprise" className="enterprise-footer-link">Enterprise Services</Link>
            <Link to="/api-docs">API Documentation</Link>
          </nav>
        </div>
        
        <div className="footer-section">
          <h4>Contact Us</h4>
          <p>Email: info@daycarealert.com</p>
          <p className="enterprise-contact">Enterprise: enterprise@daycarealert.com</p>
          <div className="social-links">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <i className="fab fa-facebook-square" aria-hidden="true"></i>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <i className="fab fa-twitter-square" aria-hidden="true"></i>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <i className="fab fa-instagram" aria-hidden="true"></i>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
