import React from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import PageHeader from '../../components/PageHeader';
import sponsorImage from '../../images/pexels-cottonbro-3661356.jpg';
import logoImage from '../../images/logo-transparent.png';
import '../../styles/marketplace/Sponsors.css';

// Mock sponsor data - in a real app this would come from an API
const sponsors = [
  {
    id: 's1',
    name: 'Little Learners Educational Toys',
    logo: logoImage,
    description: 'Premium educational toys designed for early childhood development. Our products support cognitive, social, and motor skill development.',
    tier: 'platinum',
    website: 'https://example.com/littlelearners',
    category: 'Educational Supplies',
    discount: 'DAYCARE15'
  },
  {
    id: 's2',
    name: 'SafeSpace Furniture',
    logo: logoImage,
    description: 'Child-safe, durable furniture designed specifically for daycare centers. All products meet or exceed safety standards.',
    tier: 'gold',
    website: 'https://example.com/safespace',
    category: 'Furniture',
    discount: 'SAFE10'
  },
  {
    id: 's3',
    name: 'KidCare Insurance',
    logo: logoImage,
    description: 'Specialized insurance coverage for daycare providers, offering liability, property, and accident coverage tailored to childcare facilities.',
    tier: 'gold',
    website: 'https://example.com/kidcare',
    category: 'Services',
    discount: null
  },
  {
    id: 's4',
    name: 'EduTrack Software',
    logo: logoImage,
    description: 'Comprehensive childcare management software for attendance tracking, billing, parent communication, and developmental milestone tracking.',
    tier: 'silver',
    website: 'https://example.com/edutrack',
    category: 'Software',
    discount: 'EDU20'
  },
  {
    id: 's5',
    name: 'Tiny Tots Nutrition',
    logo: logoImage,
    description: 'Healthy meal and snack options designed for daycares. Nutritionally balanced and kid-approved meals with allergen-free options.',
    tier: 'silver',
    website: 'https://example.com/tinytots',
    category: 'Food Services',
    discount: 'NUTRITION10'
  },
  {
    id: 's6',
    name: 'Play Safe Surfaces',
    logo: logoImage,
    description: 'Impact-absorbing playground surfaces and indoor play area materials, designed to reduce injuries and meet safety regulations.',
    tier: 'bronze',
    website: 'https://example.com/playsafe',
    category: 'Safety Equipment',
    discount: null
  }
];

// Sponsorship packages info
const sponsorshipTiers = [
  {
    name: 'Platinum',
    price: '$1,200/month',
    features: [
      'Featured placement on homepage',
      'Top position in sponsors listing',
      'Weekly feature in newsletter',
      'Sponsored content opportunity (2/month)',
      'Social media promotion',
      'Exclusive webinar opportunity',
      'Access to parent email list'
    ],
    color: '#e5e4e2'
  },
  {
    name: 'Gold',
    price: '$800/month',
    features: [
      'High visibility placement',
      'Bi-weekly feature in newsletter',
      'Sponsored content opportunity (1/month)',
      'Social media promotion',
      'Discounted access to parent email list'
    ],
    color: '#ffd700'
  },
  {
    name: 'Silver',
    price: '$500/month',
    features: [
      'Standard listing in sponsors page',
      'Monthly feature in newsletter',
      'Quarterly sponsored content opportunity',
      'Social media mention'
    ],
    color: '#c0c0c0'
  },
  {
    name: 'Bronze',
    price: '$250/month',
    features: [
      'Basic listing in sponsors page',
      'Bi-monthly newsletter mention',
      'Ability to offer discount codes'
    ],
    color: '#cd7f32'
  }
];

const Sponsors = () => {
  // Filter sponsors by tier for featured display
  const platinumSponsors = sponsors.filter(s => s.tier === 'platinum');
  const goldSponsors = sponsors.filter(s => s.tier === 'gold');
  const otherSponsors = sponsors.filter(s => s.tier === 'silver' || s.tier === 'bronze');
  
  // Group sponsors by category
  const categories = [...new Set(sponsors.map(s => s.category))];
  
  return (
    <div className="sponsors-page">
      <PageHeader 
        title="Partners & Sponsors" 
        backgroundImage={sponsorImage}
      />
      
      <Container className="mt-4">
        <Row className="justify-content-center mb-5">
          <Col md={10}>
            <div className="sponsors-intro">
              <h2>Our Trusted Partners</h2>
              <p className="lead">
                We partner with top-quality providers in the childcare industry to bring valuable resources, 
                products, and services to daycare providers and parents. Our sponsors are carefully selected
                for their commitment to child safety, development, and well-being.
              </p>
              <p>
                Many of our sponsors offer exclusive discounts to our users. Look for discount codes
                on sponsor profiles!
              </p>
            </div>
          </Col>
        </Row>
        
        {platinumSponsors.length > 0 && (
          <Row className="justify-content-center mb-5">
            <Col md={10}>
              <h3 className="section-title">
                <Badge bg="light" text="dark" className="platinum-badge">Platinum</Badge> Featured Partners
              </h3>
              <div className="featured-sponsors">
                {platinumSponsors.map(sponsor => (
                  <Card key={sponsor.id} className="featured-sponsor-card">
                    <Card.Body>
                      <div className="sponsor-header">
                        <img src={sponsor.logo} alt={`${sponsor.name} logo`} className="sponsor-logo" />
                        <div>
                          <Card.Title>{sponsor.name}</Card.Title>
                          <Badge bg="secondary" className="category-badge">{sponsor.category}</Badge>
                        </div>
                      </div>
                      <Card.Text>{sponsor.description}</Card.Text>
                      {sponsor.discount && (
                        <div className="discount-code">
                          <span>Exclusive Discount Code: </span>
                          <Badge bg="success">{sponsor.discount}</Badge>
                        </div>
                      )}
                      <Button 
                        variant="primary" 
                        href={sponsor.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-3"
                      >
                        Visit Website
                      </Button>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </Col>
          </Row>
        )}
        
        {goldSponsors.length > 0 && (
          <Row className="justify-content-center mb-5">
            <Col md={10}>
              <h3 className="section-title">
                <Badge bg="warning" text="dark" className="gold-badge">Gold</Badge> Partners
              </h3>
              <Row className="gold-sponsors">
                {goldSponsors.map(sponsor => (
                  <Col md={6} key={sponsor.id}>
                    <Card className="sponsor-card">
                      <Card.Body>
                        <div className="sponsor-header">
                          <img src={sponsor.logo} alt={`${sponsor.name} logo`} className="sponsor-logo" />
                          <div>
                            <Card.Title>{sponsor.name}</Card.Title>
                            <Badge bg="secondary" className="category-badge">{sponsor.category}</Badge>
                          </div>
                        </div>
                        <Card.Text>{sponsor.description}</Card.Text>
                        {sponsor.discount && (
                          <div className="discount-code">
                            <span>Discount Code: </span>
                            <Badge bg="success">{sponsor.discount}</Badge>
                          </div>
                        )}
                        <div className="text-end">
                          <Button 
                            variant="outline-primary" 
                            href={sponsor.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            size="sm"
                          >
                            Visit Website
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Col>
          </Row>
        )}
        
        {otherSponsors.length > 0 && (
          <Row className="justify-content-center mb-5">
            <Col md={10}>
              <h3 className="section-title">Additional Partners</h3>
              <Row className="other-sponsors">
                {otherSponsors.map(sponsor => (
                  <Col lg={4} md={6} key={sponsor.id}>
                    <Card className="sponsor-card small-card">
                      <Card.Body>
                        <div className="sponsor-header-small">
                          <img src={sponsor.logo} alt={`${sponsor.name} logo`} className="sponsor-logo-small" />
                          <div>
                            <Card.Title className="small-title">{sponsor.name}</Card.Title>
                            <Badge bg="secondary" className="category-badge">{sponsor.category}</Badge>
                            <Badge 
                              bg={sponsor.tier === 'silver' ? 'light' : 'secondary'} 
                              text="dark" 
                              className="tier-badge"
                            >
                              {sponsor.tier}
                            </Badge>
                          </div>
                        </div>
                        <Card.Text className="small-description">{sponsor.description}</Card.Text>
                        <div className="text-end">
                          <Button 
                            variant="outline-primary" 
                            href={sponsor.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            size="sm"
                          >
                            Visit
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Col>
          </Row>
        )}
        
        <Row className="justify-content-center mb-5">
          <Col md={10}>
            <h3 className="section-title">Sponsor by Category</h3>
            <div className="category-sections">
              {categories.map(category => (
                <div key={category} className="category-section">
                  <h4 className="category-title">{category}</h4>
                  <ul className="category-list">
                    {sponsors
                      .filter(s => s.category === category)
                      .map(sponsor => (
                        <li key={sponsor.id} className="category-item">
                          <span className="sponsor-name">{sponsor.name}</span>
                          <Badge 
                            bg={
                              sponsor.tier === 'platinum' ? 'light' : 
                              sponsor.tier === 'gold' ? 'warning' :
                              sponsor.tier === 'silver' ? 'secondary' : 'dark'
                            } 
                            text="dark" 
                            className="tier-badge-small"
                          >
                            {sponsor.tier}
                          </Badge>
                          <Button 
                            variant="link" 
                            size="sm" 
                            href={sponsor.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            Visit
                          </Button>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </Col>
        </Row>
        
        <Row className="justify-content-center mb-5">
          <Col md={10}>
            <div className="become-sponsor-section">
              <h2>Become a Sponsor</h2>
              <p className="lead">
                Partner with us to connect with thousands of parents and daycare providers. 
                We offer various sponsorship packages to fit your marketing goals and budget.
              </p>
              
              <Row className="sponsorship-tiers">
                {sponsorshipTiers.map(tier => (
                  <Col md={3} sm={6} key={tier.name} className="mb-4">
                    <Card className="tier-card" style={{borderTopColor: tier.color}}>
                      <Card.Header style={{backgroundColor: tier.color + '30'}}>
                        <h4 className="tier-name">{tier.name}</h4>
                        <div className="tier-price">{tier.price}</div>
                      </Card.Header>
                      <Card.Body>
                        <ul className="tier-features">
                          {tier.features.map((feature, index) => (
                            <li key={index}>{feature}</li>
                          ))}
                        </ul>
                      </Card.Body>
                      <Card.Footer>
                        <Button variant="primary" className="w-100">
                          Contact Us
                        </Button>
                      </Card.Footer>
                    </Card>
                  </Col>
                ))}
              </Row>
              
              <div className="contact-info text-center mt-4">
                <p>For more information about our sponsorship packages, please contact:</p>
                <p className="contact-email">sponsors@daycarealert.com</p>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Sponsors;