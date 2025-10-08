import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Nav, Tab, Alert, Badge } from 'react-bootstrap';
import TourRequestsTable from './TourRequestsTable';
import ReviewApproval from './ReviewApproval';
import { useAuth } from '../../context/AuthContext';
import '../../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('tour-requests');
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
  const { user } = useAuth();
  
  // Fetch count of pending reviews
  useEffect(() => {
    const fetchPendingReviewsCount = async () => {
      try {
        console.log('Fetching pending reviews count...');
        console.log('Using auth token:', localStorage.getItem('token') ? 'Token exists' : 'No token');
        
        const response = await fetch('/api/reviews/by-status/pending', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json'
          }
        });
        
        console.log('Pending reviews count API response status:', response.status);
        
        if (!response.ok) {
          console.error('Failed to fetch pending reviews count:', response.status, response.statusText);
          // Fallback to mock data
          setPendingReviewsCount(3);
          return;
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Unexpected content type:', contentType);
          // Fallback to mock data
          setPendingReviewsCount(3);
          return;
        }
        
        const data = await response.json();
        
        if (data.success && data.pagination) {
          setPendingReviewsCount(data.pagination.total);
        }
      } catch (error) {
        console.error('Error fetching pending reviews count:', error);
        // Fallback to mock data when the API is unreachable
        setPendingReviewsCount(3);
      }
    };
    
    // Only fetch if user is admin
    if (user && user.role === 'admin') {
      fetchPendingReviewsCount();
      
      // Set up a timer to refresh the count every minute
      const timer = setInterval(fetchPendingReviewsCount, 60000);
      
      // Clean up timer on unmount
      return () => clearInterval(timer);
    }
  }, [user]);
  
  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          You do not have permission to access this page.
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container fluid className="admin-dashboard p-4">
      <Row>
        <Col xs={12}>
          <h1 className="mb-4">Admin Dashboard</h1>
        </Col>
      </Row>
      
      <Row>
        <Col xs={12} lg={2} className="mb-4">
          <Nav className="flex-column admin-sidebar" variant="pills">
            <Nav.Item>
              <Nav.Link 
                className={activeTab === 'tour-requests' ? 'active' : ''} 
                onClick={() => setActiveTab('tour-requests')}
              >
                Tour Requests
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                className={activeTab === 'review-approval' ? 'active' : ''} 
                onClick={() => setActiveTab('review-approval')}
              >
                Review Approval
                {pendingReviewsCount > 0 && (
                  <Badge bg="warning" className="ms-2">{pendingReviewsCount}</Badge>
                )}
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                className={activeTab === 'users' ? 'active' : ''} 
                onClick={() => setActiveTab('users')}
              >
                Users
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                className={activeTab === 'daycares' ? 'active' : ''} 
                onClick={() => setActiveTab('daycares')}
              >
                Daycares
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                className={activeTab === 'reports' ? 'active' : ''} 
                onClick={() => setActiveTab('reports')}
              >
                Reports
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                className={activeTab === 'settings' ? 'active' : ''} 
                onClick={() => setActiveTab('settings')}
              >
                Settings
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Col>
        
        <Col xs={12} lg={10}>
          <Tab.Content>
            <Tab.Pane active={activeTab === 'tour-requests'}>
              <TourRequestsTable />
            </Tab.Pane>
            <Tab.Pane active={activeTab === 'review-approval'}>
              <ReviewApproval />
            </Tab.Pane>
            <Tab.Pane active={activeTab === 'users'}>
              <h3>User Management</h3>
              <p>User management functionality coming soon...</p>
            </Tab.Pane>
            <Tab.Pane active={activeTab === 'daycares'}>
              <h3>Daycare Management</h3>
              <p>Daycare management functionality coming soon...</p>
            </Tab.Pane>
            <Tab.Pane active={activeTab === 'reports'}>
              <h3>Reports</h3>
              <p>Reporting functionality coming soon...</p>
            </Tab.Pane>
            <Tab.Pane active={activeTab === 'settings'}>
              <h3>Admin Settings</h3>
              <p>Settings functionality coming soon...</p>
            </Tab.Pane>
          </Tab.Content>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminDashboard;