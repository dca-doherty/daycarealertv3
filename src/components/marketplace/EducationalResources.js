import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Nav, Badge, Tab } from 'react-bootstrap';
import { FaDownload, FaExternalLinkAlt, FaBook, FaChalkboardTeacher, FaUsers } from 'react-icons/fa';
import resourceImage from '../../images/pexels-naomi-shi-374023-1001914.jpg';
import '../../styles/marketplace/EducationalResources.css';

// Mock educational resources data - in a real app, this would come from an API
const resources = {
  teaching: [
    {
      id: 't1',
      title: 'Early Childhood Development Curriculum (Ages 0-3)',
      description: 'Comprehensive curriculum covering cognitive, physical, social, and emotional development for infants and toddlers.',
      type: 'Curriculum',
      image: 'https://via.placeholder.com/300x200',
      free: false,
      price: 79.99,
      tags: ['Infant', 'Toddler', 'Development'],
      link: 'https://example.com/curriculum-infant',
      preview_available: true
    },
    {
      id: 't2',
      title: 'Preschool Learning Activities Bundle',
      description: 'Collection of 50+ printable activities for preschoolers, focusing on literacy, numeracy, and fine motor skills.',
      type: 'Activities',
      image: 'https://via.placeholder.com/300x200',
      free: false,
      price: 29.99,
      tags: ['Preschool', 'Activities', 'Printable'],
      link: 'https://example.com/preschool-activities',
      preview_available: true
    },
    {
      id: 't3',
      title: 'Circle Time Songs and Rhymes',
      description: 'Collection of age-appropriate songs, fingerplays, and rhymes ideal for group activities and circle time.',
      type: 'Music & Movement',
      image: 'https://via.placeholder.com/300x200',
      free: true,
      price: 0,
      tags: ['Music', 'Group Activities', 'All Ages'],
      link: 'https://example.com/circle-time-songs',
      preview_available: true
    },
    {
      id: 't4',
      title: 'Seasonal Daycare Activity Planner',
      description: 'Year-round activity planner with themed activities for each season and major holiday. Includes preparation checklists.',
      type: 'Planning Tool',
      image: 'https://via.placeholder.com/300x200',
      free: false,
      price: 24.99,
      tags: ['Planning', 'Seasonal', 'All Ages'],
      link: 'https://example.com/seasonal-planner',
      preview_available: false
    },
    {
      id: 't5',
      title: 'STEM Activities for Preschoolers',
      description: 'Age-appropriate science, technology, engineering, and math activities designed specifically for early learners.',
      type: 'Activities',
      image: 'https://via.placeholder.com/300x200',
      free: false,
      price: 19.99,
      tags: ['STEM', 'Preschool', 'Educational'],
      link: 'https://example.com/stem-preschool',
      preview_available: true
    }
  ],
  
  training: [
    {
      id: 'tr1',
      title: 'Child Development Associate (CDA) Preparation Course',
      description: 'Comprehensive online course to prepare for the CDA credential examination. Includes practice tests and portfolio guidance.',
      type: 'Certification Prep',
      image: 'https://via.placeholder.com/300x200',
      free: false,
      price: 149.99,
      tags: ['Certification', 'Professional Development', 'Credential'],
      link: 'https://example.com/cda-prep',
      hours: 120,
      certification: true
    },
    {
      id: 'tr2',
      title: 'First Aid and CPR for Childcare Providers',
      description: 'Online training for childcare-specific emergency response, including infant and child CPR, choking response, and basic first aid.',
      type: 'Safety Training',
      image: 'https://via.placeholder.com/300x200',
      free: false,
      price: 89.99,
      tags: ['Safety', 'Required Training', 'Certification'],
      link: 'https://example.com/childcare-cpr',
      hours: 8,
      certification: true
    },
    {
      id: 'tr3',
      title: 'Positive Discipline Techniques Workshop',
      description: 'Learn effective, age-appropriate discipline strategies that foster emotional development and self-regulation.',
      type: 'Workshop',
      image: 'https://via.placeholder.com/300x200',
      free: false,
      price: 49.99,
      tags: ['Discipline', 'Behavior Management', 'Social-Emotional'],
      link: 'https://example.com/positive-discipline',
      hours: 4,
      certification: false
    },
    {
      id: 'tr4',
      title: 'Recognizing and Reporting Child Abuse',
      description: 'Required training on identifying signs of abuse and neglect, documentation procedures, and mandated reporting requirements.',
      type: 'Compliance Training',
      image: 'https://via.placeholder.com/300x200',
      free: true,
      price: 0,
      tags: ['Required Training', 'Legal Compliance', 'Safety'],
      link: 'https://example.com/abuse-reporting',
      hours: 2,
      certification: true
    },
    {
      id: 'tr5',
      title: 'Creating Inclusive Childcare Environments',
      description: 'Learn strategies for creating inclusive environments that support children of all abilities, backgrounds, and needs.',
      type: 'Professional Development',
      image: 'https://via.placeholder.com/300x200',
      free: false,
      price: 39.99,
      tags: ['Inclusion', 'Diversity', 'Special Needs'],
      link: 'https://example.com/inclusive-care',
      hours: 6,
      certification: false
    }
  ],
  
  parent: [
    {
      id: 'p1',
      title: 'Choosing the Right Daycare Guide',
      description: 'Comprehensive guide to evaluating daycare facilities, including questions to ask, red flags to watch for, and quality indicators.',
      type: 'Guide',
      image: 'https://via.placeholder.com/300x200',
      free: true,
      price: 0,
      tags: ['Decision Making', 'Quality Care', 'Research'],
      link: 'https://example.com/daycare-guide',
      format: 'PDF'
    },
    {
      id: 'p2',
      title: 'Preparing Your Child for Daycare',
      description: 'Tips and strategies to help children transition smoothly into daycare, managing separation anxiety and building routine.',
      type: 'Guide',
      image: 'https://via.placeholder.com/300x200',
      free: true,
      price: 0,
      tags: ['Transition', 'Anxiety', 'Routine'],
      link: 'https://example.com/daycare-prep',
      format: 'PDF'
    },
    {
      id: 'p3',
      title: 'Understanding Child Development Milestones',
      description: 'Age-by-age guide to developmental milestones from birth to age 5, helping parents understand typical child development.',
      type: 'Reference',
      image: 'https://via.placeholder.com/300x200',
      free: false,
      price: 12.99,
      tags: ['Development', 'Milestones', 'Ages & Stages'],
      link: 'https://example.com/development-guide',
      format: 'eBook'
    },
    {
      id: 'p4',
      title: 'Daycare Illness Policy Explainer',
      description: 'Clear explanation of common daycare illness policies, when to keep children home, and managing communication with providers.',
      type: 'Guide',
      image: 'https://via.placeholder.com/300x200',
      free: true,
      price: 0,
      tags: ['Health', 'Policy', 'Illness'],
      link: 'https://example.com/illness-guide',
      format: 'PDF'
    },
    {
      id: 'p5',
      title: 'Home-to-Daycare Activities Bridge',
      description: 'Toolkit of activities that parents can do at home to reinforce learning happening at daycare, creating consistency.',
      type: 'Activity Kit',
      image: 'https://via.placeholder.com/300x200',
      free: false,
      price: 19.99,
      tags: ['Activities', 'Learning', 'Consistency'],
      link: 'https://example.com/home-daycare-bridge',
      format: 'PDF + Printables'
    }
  ]
};

const EducationalResources = () => {
  const [activeTab, setActiveTab] = useState('teaching');
  const [selectedResource, setSelectedResource] = useState(null);
  
  const handleResourceSelect = (resource) => {
    setSelectedResource(resource);
  };
  
  const closeDetails = () => {
    setSelectedResource(null);
  };
  
  const renderResourceCard = (resource) => (
    <Col lg={4} md={6} key={resource.id} className="mb-4">
      <Card className="resource-card h-100">
        <div className="resource-image-container">
          <Card.Img variant="top" src={resourceImage} className="resource-image" />
          <div className="resource-type-badge">
            {resource.type}
          </div>
          {resource.free && (
            <div className="free-badge">
              Free
            </div>
          )}
        </div>
        <Card.Body>
          <div className="resource-tags mb-2">
            {resource.tags.map(tag => (
              <Badge bg="light" text="dark" key={tag} className="me-1">
                {tag}
              </Badge>
            ))}
          </div>
          <Card.Title className="resource-title">{resource.title}</Card.Title>
          <Card.Text className="resource-description">
            {resource.description}
          </Card.Text>
          
          {activeTab === 'training' && (
            <div className="training-details">
              <div className="hours-badge">
                <span>{resource.hours} hours</span>
              </div>
              {resource.certification && (
                <div className="certification-badge">
                  <span>Certification</span>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'parent' && resource.format && (
            <div className="format-badge">
              <span>{resource.format}</span>
            </div>
          )}
        </Card.Body>
        <Card.Footer className="resource-footer">
          <div className="resource-price">
            {resource.free ? (
              <span className="free-text">Free Resource</span>
            ) : (
              <span>${resource.price}</span>
            )}
          </div>
          
          <div className="resource-actions">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => handleResourceSelect(resource)}
              className="me-2"
            >
              Details
            </Button>
            <Button
              variant="primary"
              size="sm"
              href={resource.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {resource.free ? 'Download' : 'Get Access'}
            </Button>
          </div>
        </Card.Footer>
      </Card>
    </Col>
  );
  
  const renderDetailView = () => {
    if (!selectedResource) return null;
    
    return (
      <div className="resource-detail-overlay">
        <div className="resource-detail-container">
          <div className="resource-detail-header">
            <h3>{selectedResource.title}</h3>
            <button className="close-button" onClick={closeDetails}>×</button>
          </div>
          
          <div className="resource-detail-content">
            <div className="resource-detail-image">
              <img src={resourceImage} alt={selectedResource.title} />
              {selectedResource.free && (
                <div className="detail-free-badge">
                  Free Resource
                </div>
              )}
            </div>
            
            <div className="resource-detail-info">
              <div className="detail-tags">
                {selectedResource.tags.map(tag => (
                  <Badge bg="light" text="dark" key={tag} className="me-1 mb-1">
                    {tag}
                  </Badge>
                ))}
              </div>
              
              <div className="detail-type">
                <strong>Type:</strong> {selectedResource.type}
              </div>
              
              {activeTab === 'training' && (
                <>
                  <div className="detail-hours">
                    <strong>Duration:</strong> {selectedResource.hours} hours
                  </div>
                  <div className="detail-certification">
                    <strong>Certification:</strong> {selectedResource.certification ? 'Yes' : 'No'}
                  </div>
                </>
              )}
              
              {activeTab === 'parent' && selectedResource.format && (
                <div className="detail-format">
                  <strong>Format:</strong> {selectedResource.format}
                </div>
              )}
              
              <div className="detail-description">
                <h5>Description</h5>
                <p>{selectedResource.description}</p>
                <p className="detail-extended-description">
                  This is a high-quality resource designed to meet the needs of {selectedResource.tags.join(', ')} focused learning environments. 
                  The materials have been reviewed by early childhood education experts and meet all applicable standards.
                </p>
              </div>
              
              <div className="detail-price">
                {selectedResource.free ? (
                  <span className="free-text">Free Resource</span>
                ) : (
                  <span className="price-text">${selectedResource.price}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="resource-detail-actions">
            {selectedResource.preview_available && (
              <Button 
                variant="outline-primary" 
                className="me-3"
              >
                <FaDownload className="me-2" /> Preview
              </Button>
            )}
            <Button 
              variant="primary"
              href={selectedResource.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaExternalLinkAlt className="me-2" /> {selectedResource.free ? 'Download Now' : 'Purchase Access'}
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="educational-resources">
      <Container>
        <div className="resources-header text-center">
          <h2>Educational Resources</h2>
          <p className="lead">
            Quality materials for daycare providers and parents to support child development and learning
          </p>
        </div>
        
        <Tab.Container id="resources-tabs" activeKey={activeTab} onSelect={setActiveTab}>
          <Nav variant="tabs" className="resource-tabs">
            <Nav.Item>
              <Nav.Link eventKey="teaching" className="resource-tab">
                <FaBook className="tab-icon" /> Teaching Materials
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="training" className="resource-tab">
                <FaChalkboardTeacher className="tab-icon" /> Staff Training
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="parent" className="resource-tab">
                <FaUsers className="tab-icon" /> Parent Resources
              </Nav.Link>
            </Nav.Item>
          </Nav>
          
          <Tab.Content className="mt-4">
            <Tab.Pane eventKey="teaching">
              <div className="tab-intro">
                <h3>Curriculum & Teaching Materials</h3>
                <p>
                  High-quality educational resources to support learning and development in daycare settings.
                  These materials are designed by early childhood education experts and align with developmental milestones.
                </p>
              </div>
              <Row>
                {resources.teaching.map(resource => renderResourceCard(resource))}
              </Row>
            </Tab.Pane>
            
            <Tab.Pane eventKey="training">
              <div className="tab-intro">
                <h3>Professional Development & Training</h3>
                <p>
                  Training courses and certification programs for daycare staff. Keep your team up-to-date with best practices
                  and maintain compliance with required certifications.
                </p>
              </div>
              <Row>
                {resources.training.map(resource => renderResourceCard(resource))}
              </Row>
            </Tab.Pane>
            
            <Tab.Pane eventKey="parent">
              <div className="tab-intro">
                <h3>Parent Education Resources</h3>
                <p>
                  Guides and resources to help parents navigate childcare choices, support their child's development,
                  and build strong partnerships with providers.
                </p>
              </div>
              <Row>
                {resources.parent.map(resource => renderResourceCard(resource))}
              </Row>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Container>
      
      {selectedResource && renderDetailView()}
    </div>
  );
};

export default EducationalResources;