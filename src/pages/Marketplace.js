import React, { useState } from 'react';
import { Container, Nav, Tab } from 'react-bootstrap';
import { FaStore, FaBook, FaUsers } from 'react-icons/fa';
import PageHeader from '../components/PageHeader';
import ProductShowcase from '../components/marketplace/ProductShowcase';
import EducationalResources from '../components/marketplace/EducationalResources';
// Use one of the high-quality images available
import marketplaceImage from '../images/pexels-mikhail-nilov-8923956.jpg';
import '../styles/marketplace/Marketplace.css';

const Marketplace = () => {
  const [activeTab, setActiveTab] = useState('products');

  return (
    <div className="marketplace-page">
      <PageHeader
        title="Daycare Marketplace"
        backgroundImage={marketplaceImage}
      />
      
      <Container className="marketplace-container">
        <div className="marketplace-intro text-center">
          <h2>Resources for Daycares & Parents</h2>
          <p className="lead">
            Discover quality products, educational resources, and services specially curated for daycare providers and parents.
            Our marketplace supports our mission to improve daycare safety and quality across the country.
          </p>
          <p className="disclaimer">
            <small>Affiliate links support our mission. We carefully vet all products and services listed here.</small>
          </p>
        </div>
        
        <Tab.Container id="marketplace-tabs" activeKey={activeTab} onSelect={setActiveTab}>
          <Nav variant="pills" className="marketplace-tabs-nav">
            <Nav.Item>
              <Nav.Link eventKey="products" className="marketplace-nav-link">
                <FaStore className="tab-icon" /> Products & Supplies
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="educational" className="marketplace-nav-link">
                <FaBook className="tab-icon" /> Educational Resources
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="sponsors" className="marketplace-nav-link">
                <FaUsers className="tab-icon" /> Our Sponsors
              </Nav.Link>
            </Nav.Item>
          </Nav>
          
          <Tab.Content className="marketplace-content">
            <Tab.Pane eventKey="products">
              <ProductShowcase />
            </Tab.Pane>
            
            <Tab.Pane eventKey="educational">
              <EducationalResources />
            </Tab.Pane>
            
            <Tab.Pane eventKey="sponsors">
              <div className="sponsors-redirect">
                <h3>Connect with our sponsors</h3>
                <p>
                  Visit our Sponsors page to discover partners who support our mission to improve daycare quality and safety.
                </p>
                <a href="/sponsors" className="btn btn-primary">View Our Sponsors</a>
              </div>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
        
        <div className="marketplace-footer">
          <h4>Interested in featuring your products or becoming a sponsor?</h4>
          <p>
            Contact us at <a href="mailto:marketplace@daycarealert.com">marketplace@daycarealert.com</a> to learn about our partner program.
          </p>
        </div>
      </Container>
    </div>
  );
};

export default Marketplace;