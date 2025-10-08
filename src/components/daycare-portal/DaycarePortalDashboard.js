import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Nav, Tab, Card, Alert, Button, Badge } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ReferralList from './ReferralList';
import TourList from './TourList';
import DaycareInfoForm from './DaycareInfoForm';
import CompetitorAnalysis from './CompetitorAnalysis';
import AnalyticsDashboard from './AnalyticsDashboard';
import '../../styles/DaycarePortal.css';

const DaycarePortalDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [providerInfo, setProviderInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tourCount, setTourCount] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if user is logged in and has the daycare_provider role
    if (!user) {
      navigate('/daycare-portal/login');
      return;
    }
    
    if (user.role !== 'daycare_provider') {
      setError('You do not have permission to access the daycare portal.');
      return;
    }
    
    // Fetch provider profile
    const fetchProviderProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(`https://api.daycarealert.com/api/daycare-portal/profile`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch provider profile');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setProviderInfo(data.provider);
          
          // Fetch counts
          fetchTourCount();
          fetchReferralCount();
        } else {
          setError(data.message || 'Failed to load provider information');
        }
      } catch (err) {
        console.error('Error fetching provider profile:', err);
        setError('Failed to load provider information');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProviderProfile();
  }, [user, navigate]);
  
  const fetchTourCount = async () => {
    try {
      const response = await fetch(`https://api.daycarealert.com/api/daycare-portal/tours`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTourCount(data.data.filter(tour => tour.status === 'pending').length);
      }
    } catch (err) {
      console.error('Error fetching tour count:', err);
    }
  };
  
  const fetchReferralCount = async () => {
    try {
      const response = await fetch(`https://api.daycarealert.com/api/daycare-portal/referrals`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReferralCount(data.data.filter(ref => !ref.converted).length);
      }
    } catch (err) {
      console.error('Error fetching referral count:', err);
    }
  };
  
  const handleGenerateInviteCode = async () => {
    try {
      setLoading(true);
      const response = await fetch(`https://api.daycarealert.com/api/daycare-auth/generate-invite-code`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Invite code generated: ${data.invite_code}`);
      } else {
        setError(data.message || 'Failed to generate invite code');
      }
    } catch (err) {
      console.error('Error generating invite code:', err);
      setError('Failed to generate invite code');
    } finally {
      setLoading(false);
    }
  };
  
  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          {error}
        </Alert>
        <Button variant="link" onClick={() => navigate('/')}>
          Return to home page
        </Button>
      </Container>
    );
  }
  
  if (loading || !providerInfo) {
    return (
      <Container className="mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading daycare portal...</p>
      </Container>
    );
  }
  
  return (
    <Container fluid className="daycare-portal-dashboard p-0">
      <div className="portal-header bg-primary text-white py-3 px-4">
        <Container>
          <Row className="align-items-center">
            <Col>
              <h1>Daycare Provider Portal</h1>
              <p className="mb-0">{providerInfo.daycare_name || 'Your Daycare'}</p>
            </Col>
            <Col xs="auto">
              <div className="d-flex align-items-center">
                <div className="me-3 text-end">
                  <p className="mb-0">{user.email}</p>
                  <small>{providerInfo.position || 'Staff'}</small>
                </div>
                <Button variant="outline-light" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
      
      <Container className="py-4">
        <Row>
          <Col lg={3} className="mb-4">
            <Card className="portal-sidebar">
              <Card.Header className="bg-light">
                <strong>Navigation</strong>
              </Card.Header>
              <Card.Body className="p-0">
                <Nav className="flex-column">
                  <Nav.Link 
                    className={activeTab === 'overview' ? 'active' : ''}
                    onClick={() => setActiveTab('overview')}
                  >
                    Dashboard Overview
                  </Nav.Link>
                  <Nav.Link 
                    className={activeTab === 'tours' ? 'active' : ''}
                    onClick={() => setActiveTab('tours')}
                  >
                    Tour Requests
                    {tourCount > 0 && (
                      <Badge bg="primary" className="ms-2">{tourCount}</Badge>
                    )}
                  </Nav.Link>
                  <Nav.Link 
                    className={activeTab === 'referrals' ? 'active' : ''}
                    onClick={() => setActiveTab('referrals')}
                  >
                    Referrals
                    {referralCount > 0 && (
                      <Badge bg="primary" className="ms-2">{referralCount}</Badge>
                    )}
                  </Nav.Link>
                  <Nav.Link 
                    className={activeTab === 'analytics' ? 'active' : ''}
                    onClick={() => setActiveTab('analytics')}
                  >
                    Analytics
                  </Nav.Link>
                  <Nav.Link 
                    className={activeTab === 'competitors' ? 'active' : ''}
                    onClick={() => setActiveTab('competitors')}
                  >
                    Competitor Analysis
                  </Nav.Link>
                  <Nav.Link 
                    className={activeTab === 'daycare-info' ? 'active' : ''}
                    onClick={() => setActiveTab('daycare-info')}
                  >
                    Daycare Information
                  </Nav.Link>
                  {providerInfo.is_admin && (
                    <Nav.Link 
                      className={activeTab === 'admin' ? 'active' : ''}
                      onClick={() => setActiveTab('admin')}
                    >
                      Admin Settings
                    </Nav.Link>
                  )}
                </Nav>
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={9}>
            <Tab.Content>
              <Tab.Pane active={activeTab === 'overview'}>
                <Card className="mb-4">
                  <Card.Header>
                    <h3 className="mb-0">Dashboard Overview</h3>
                  </Card.Header>
                  <Card.Body>
                    <AnalyticsDashboard daycareId={providerInfo.daycare_id} />
                  </Card.Body>
                </Card>
              </Tab.Pane>
              
              <Tab.Pane active={activeTab === 'tours'}>
                <Card className="mb-4">
                  <Card.Header>
                    <h3 className="mb-0">Tour Requests</h3>
                  </Card.Header>
                  <Card.Body>
                    <TourList daycareId={providerInfo.daycare_id} onTourUpdated={fetchTourCount} />
                  </Card.Body>
                </Card>
              </Tab.Pane>
              
              <Tab.Pane active={activeTab === 'referrals'}>
                <Card className="mb-4">
                  <Card.Header>
                    <h3 className="mb-0">Referrals</h3>
                  </Card.Header>
                  <Card.Body>
                    <ReferralList daycareId={providerInfo.daycare_id} onReferralUpdated={fetchReferralCount} />
                  </Card.Body>
                </Card>
              </Tab.Pane>
              
              <Tab.Pane active={activeTab === 'analytics'}>
                <Card className="mb-4">
                  <Card.Header>
                    <h3 className="mb-0">Analytics</h3>
                  </Card.Header>
                  <Card.Body>
                    <AnalyticsDashboard daycareId={providerInfo.daycare_id} detailed />
                  </Card.Body>
                </Card>
              </Tab.Pane>
              
              <Tab.Pane active={activeTab === 'competitors'}>
                <Card className="mb-4">
                  <Card.Header>
                    <h3 className="mb-0">Competitor Analysis</h3>
                  </Card.Header>
                  <Card.Body>
                    <CompetitorAnalysis daycareId={providerInfo.daycare_id} />
                  </Card.Body>
                </Card>
              </Tab.Pane>
              
              <Tab.Pane active={activeTab === 'daycare-info'}>
                <Card className="mb-4">
                  <Card.Header>
                    <h3 className="mb-0">Daycare Information</h3>
                  </Card.Header>
                  <Card.Body>
                    <DaycareInfoForm daycareId={providerInfo.daycare_id} />
                  </Card.Body>
                </Card>
              </Tab.Pane>
              
              {providerInfo.is_admin && (
                <Tab.Pane active={activeTab === 'admin'}>
                  <Card className="mb-4">
                    <Card.Header>
                      <h3 className="mb-0">Admin Settings</h3>
                    </Card.Header>
                    <Card.Body>
                      <h4>Invite Staff</h4>
                      <p>
                        Generate an invite code to allow other staff members to join the daycare portal.
                        Share this code with your staff, and they can use it to register an account.
                      </p>
                      <Button 
                        variant="primary" 
                        onClick={handleGenerateInviteCode}
                        disabled={loading}
                      >
                        Generate Invite Code
                      </Button>
                    </Card.Body>
                  </Card>
                </Tab.Pane>
              )}
            </Tab.Content>
          </Col>
        </Row>
      </Container>
    </Container>
  );
};

export default DaycarePortalDashboard;
