import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, Form, Card, Tabs, Tab, Spinner, Modal, Alert } from 'react-bootstrap';
import { FaCheck, FaTimes, FaEye, FaReply, FaFilter } from 'react-icons/fa';
import StarRating from '../reviews/StarRating';
import '../../styles/AdminDashboard.css';

// Enable debug mode for development
const DEBUG_MODE = true;
const TEST_TOKEN = 'test_token_123'; // Used for testing purposes - matches the simple-test-server.js token

const ReviewApproval = () => {
  const [pendingReviews, setPendingReviews] = useState([]);
  const [approvedReviews, setApprovedReviews] = useState([]);
  const [rejectedReviews, setRejectedReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentReview, setCurrentReview] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reviewToReject, setReviewToReject] = useState(null);
  const [error, setError] = useState(null);
  
  // If in debug mode and we have a test token, store it in localStorage
  useEffect(() => {
    if (DEBUG_MODE && TEST_TOKEN) {
      console.log('Debug mode: Setting test token in localStorage');
      localStorage.setItem('token', TEST_TOKEN);
    }
  }, []);

  // Generate mock data for fallback when API isn't available
  const generateMockData = () => {
    // Create sample pending reviews
    const pendingReviews = Array.from({ length: 3 }, (_, i) => ({
      id: `p${i+1}`,
      daycareId: `DC${1000+i}`,
      daycareName: `Sample Daycare ${i+1}`,
      userId: `u${i+1}`,
      userName: `User ${i+1}`,
      userEmail: `user${i+1}@example.com`,
      submittedAt: new Date(Date.now() - i*86400000).toISOString(),
      rating: Math.floor(Math.random() * 5) + 1,
      text: `This is a sample pending review ${i+1}. It contains text describing a daycare experience.`,
      category: 'general',
      status: 'pending'
    }));

    // Create sample approved reviews
    const approvedReviews = Array.from({ length: 2 }, (_, i) => ({
      id: `a${i+1}`,
      daycareId: `DC${2000+i}`,
      daycareName: `Approved Daycare ${i+1}`,
      userId: `u${i+3+i}`,
      userName: `User ${i+3}`,
      userEmail: `user${i+3}@example.com`,
      submittedAt: new Date(Date.now() - (i+5)*86400000).toISOString(),
      rating: Math.floor(Math.random() * 5) + 1,
      text: `This is a sample approved review ${i+1}. The admin has already approved this review.`,
      category: 'staff',
      status: 'approved',
      approvedAt: new Date(Date.now() - i*43200000).toISOString(),
      approvedBy: 'Admin User'
    }));

    // Create sample rejected reviews
    const rejectedReviews = Array.from({ length: 1 }, (_, i) => ({
      id: `r${i+1}`,
      daycareId: `DC${3000+i}`,
      daycareName: `Rejected Daycare ${i+1}`,
      userId: `u${i+5}`,
      userName: `User ${i+5}`,
      userEmail: `user${i+5}@example.com`,
      submittedAt: new Date(Date.now() - (i+8)*86400000).toISOString(),
      rating: Math.floor(Math.random() * 5) + 1,
      text: `This is a sample rejected review ${i+1}. This review was rejected by an admin.`,
      category: 'facilities',
      status: 'rejected',
      rejectedAt: new Date(Date.now() - i*21600000).toISOString(),
      rejectedBy: 'Admin User',
      rejectionReason: 'Inappropriate content or spam'
    }));

    return {
      pending: { success: true, reviews: pendingReviews, pagination: { total: pendingReviews.length } },
      approved: { success: true, reviews: approvedReviews, pagination: { total: approvedReviews.length } },
      rejected: { success: true, reviews: rejectedReviews, pagination: { total: rejectedReviews.length } }
    };
  };

  // Real API function to fetch reviews
  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching reviews from the server...');
      console.log('Using auth token:', localStorage.getItem('token') ? 'Token exists' : 'No token');
      
      // Fetch reviews by status from the backend
      const pendingPromise = fetch('/api/reviews/by-status/pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      
      const approvedPromise = fetch('/api/reviews/by-status/approved', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      
      const rejectedPromise = fetch('/api/reviews/by-status/rejected', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      
      // Fetch all in parallel for better performance
      const [pendingResponse, approvedResponse, rejectedResponse] = await Promise.all([
        pendingPromise, approvedPromise, rejectedPromise
      ]);
      
      // Add more detailed logging for debugging
      console.log('Response statuses:', 
        pendingResponse.status, approvedResponse.status, rejectedResponse.status);
      console.log('Response content types:',
        pendingResponse.headers.get('content-type'),
        approvedResponse.headers.get('content-type'),
        rejectedResponse.headers.get('content-type'));
        
      // Try to read and log the raw response content for debugging
      try {
        const pendingTextClone = await pendingResponse.clone().text();
        console.log('Pending response (first 200 chars):', pendingTextClone.substring(0, 200));
        
        // Try to parse it as JSON for validation
        try {
          JSON.parse(pendingTextClone);
          console.log('Pending response is valid JSON');
        } catch (e) {
          console.error('Pending response is not valid JSON:', e.message);
        }
      } catch (e) {
        console.error('Could not clone and read response:', e);
      }
      
      // Check for successful responses with more tolerance
      if (!pendingResponse.ok || !approvedResponse.ok || !rejectedResponse.ok) {
        console.error('One or more API requests failed:',
          pendingResponse.status, approvedResponse.status, rejectedResponse.status);
        throw new Error('Failed to fetch reviews from the server');
      }
      
      // Check content type with more permissive checks
      const checkContentType = (response) => {
        const contentType = response.headers.get('content-type');
        return contentType && (
          contentType.includes('application/json') || 
          contentType.includes('text/json') ||
          contentType.includes('/json') ||
          contentType.includes('+json')
        );
      };
      
      if (!checkContentType(pendingResponse) || 
          !checkContentType(approvedResponse) || 
          !checkContentType(rejectedResponse)) {
        console.error('One or more responses are not in JSON format');
        throw new Error('Invalid response format from server');
      }
      
      // Parse JSON responses
      const pendingData = await pendingResponse.json();
      const approvedData = await approvedResponse.json();
      const rejectedData = await rejectedResponse.json();
      
      // Populate state with the received data
      if (pendingData.success) {
        setPendingReviews(pendingData.reviews || []);
      } else {
        console.error('Failed to fetch pending reviews:', pendingData.message);
        setPendingReviews([]);
      }
      
      if (approvedData.success) {
        setApprovedReviews(approvedData.reviews || []);
      } else {
        console.error('Failed to fetch approved reviews:', approvedData.message);
        setApprovedReviews([]);
      }
      
      if (rejectedData.success) {
        setRejectedReviews(rejectedData.reviews || []);
      } else {
        console.error('Failed to fetch rejected reviews:', rejectedData.message);
        setRejectedReviews([]);
      }
      
    } catch (error) {
      console.error('Error fetching reviews:', error);
      
      // Check current proxy setting
      const proxyUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:8082' // this should match the proxy in package.json
        : '';
      
      console.log('Expected API URL:', `${proxyUrl}/api/reviews/by-status/pending`);
      
      // Get more information about the connection
      try {
        fetch('/api/health', {
          method: 'HEAD'
        }).then(healthResponse => {
          console.log('Health check response:', healthResponse.status);
        }).catch(healthError => {
          console.error('Health check failed:', healthError);
        });
      } catch (e) {
        console.error('Health check error:', e);
      }
      
      // Set error state for UI display
      setError(`${error.message || 'Failed to fetch reviews from the server'}. Using sample data instead. Check console for details.`);
      
      // Use mock data when the API is not available
      const mockData = generateMockData();
      setPendingReviews(mockData.pending.reviews);
      setApprovedReviews(mockData.approved.reviews);
      setRejectedReviews(mockData.rejected.reviews);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredReviews = (reviewList) => {
    if (!searchTerm) return reviewList;
    
    const term = searchTerm.toLowerCase();
    return reviewList.filter(review => 
      review.daycareName.toLowerCase().includes(term) ||
      review.userName.toLowerCase().includes(term) ||
      review.text.toLowerCase().includes(term)
    );
  };

  const handleApprove = async (reviewId) => {
    try {
      setLoading(true);
      
      try {
        // Call the API endpoint to approve the review
        console.log(`Approving review ID: ${reviewId}`);
        console.log('Using auth token:', localStorage.getItem('token') ? 'Token exists' : 'No token');
        
        const response = await fetch(`/api/reviews/moderate/${reviewId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            status: 'approved',
            isVerified: true
          })
        });
        
        console.log('Approve API response status:', response.status);
        console.log('Approve API response headers:', response.headers);
        
        if (!response.ok) {
          console.error('Failed to approve review:', response.status, response.statusText);
          throw new Error(`Failed to approve review: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Unexpected content type:', contentType);
          throw new Error('Invalid response format from server');
        }
        
        const data = await response.json();
        
        if (data.success) {
          // Refresh all reviews to get the updated data from server
          await fetchReviews();
          
          // Show success message
          alert('Review approved successfully');
        } else {
          console.error('Failed to approve review:', data.message);
          alert(`Failed to approve review: ${data.message}`);
        }
      } catch (apiError) {
        // API call failed - use local data instead
        console.error('API call failed:', apiError);
        setError('API unavailable. Using mock data for demonstration purposes.');
        
        // Update the local state with optimistic UI update
        const reviewToApprove = [...pendingReviews].find(r => r.id === reviewId);
        
        if (reviewToApprove) {
          // Remove from pending
          setPendingReviews(prev => prev.filter(r => r.id !== reviewId));
          
          // Add to approved with approval metadata
          const approvedReview = {
            ...reviewToApprove,
            status: 'approved',
            approvedAt: new Date().toISOString(),
            approvedBy: 'Admin (Mock)'
          };
          
          setApprovedReviews(prev => [...prev, approvedReview]);
          
          // Show success message
          alert('Review approved in demo mode (mock data)');
        }
      }
    } catch (error) {
      console.error('Error in approval handler:', error);
      setError(error.message || 'An error occurred while approving the review');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (reviewId) => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    try {
      setLoading(true);
      
      try {
        // Call the API endpoint to reject the review
        console.log(`Rejecting review ID: ${reviewId}`);
        console.log('Rejection reason:', rejectReason);
        console.log('Using auth token:', localStorage.getItem('token') ? 'Token exists' : 'No token');
        
        const response = await fetch(`/api/reviews/moderate/${reviewId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            status: 'rejected',
            rejectionReason: rejectReason
          })
        });
        
        console.log('Reject API response status:', response.status);
        console.log('Reject API response headers:', response.headers);
        
        if (!response.ok) {
          console.error('Failed to reject review:', response.status, response.statusText);
          throw new Error(`Failed to reject review: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Unexpected content type:', contentType);
          throw new Error('Invalid response format from server');
        }
        
        const data = await response.json();
        
        if (data.success) {
          // Refresh all reviews to get the updated data from server
          await fetchReviews();
          
          // Reset reject modal state
          setShowRejectModal(false);
          setRejectReason('');
          setReviewToReject(null);
          
          // Show success message
          alert('Review rejected successfully');
        } else {
          console.error('Failed to reject review:', data.message);
          alert(`Failed to reject review: ${data.message}`);
        }
      } catch (apiError) {
        // API call failed - use local data instead
        console.error('API call failed:', apiError);
        setError('API unavailable. Using mock data for demonstration purposes.');
        
        // Update the local state with optimistic UI update
        const reviewToRejectObj = [...pendingReviews].find(r => r.id === reviewId);
        
        if (reviewToRejectObj) {
          // Remove from pending
          setPendingReviews(prev => prev.filter(r => r.id !== reviewId));
          
          // Add to rejected with rejection metadata
          const rejectedReview = {
            ...reviewToRejectObj,
            status: 'rejected',
            rejectedAt: new Date().toISOString(),
            rejectedBy: 'Admin (Mock)',
            rejectionReason: rejectReason
          };
          
          setRejectedReviews(prev => [...prev, rejectedReview]);
          
          // Reset reject modal state
          setShowRejectModal(false);
          setRejectReason('');
          setReviewToReject(null);
          
          // Show success message
          alert('Review rejected in demo mode (mock data)');
        }
      }
    } catch (error) {
      console.error('Error in rejection handler:', error);
      setError(error.message || 'An error occurred while rejecting the review');
    } finally {
      setLoading(false);
    }
  };

  const openRejectModal = (review) => {
    setReviewToReject(review);
    setShowRejectModal(true);
  };

  const viewReviewDetails = (review) => {
    setCurrentReview(review);
    setShowDetailsModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge bg="warning">Pending</Badge>;
      case 'approved':
        return <Badge bg="success">Approved</Badge>;
      case 'rejected':
        return <Badge bg="danger">Rejected</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  const renderReviewTable = (reviewList) => (
    <div className="table-responsive">
      {reviewList.length === 0 ? (
        <div className="text-center p-4">
          <p>No reviews found.</p>
        </div>
      ) : (
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Daycare</th>
              <th>User</th>
              <th>Rating</th>
              <th>Submitted</th>
              <th>Preview</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReviews(reviewList).map(review => (
              <tr key={review.id}>
                <td>{review.daycareName}</td>
                <td>{review.userName}</td>
                <td>
                  <StarRating value={review.rating} readOnly={true} size={16} />
                </td>
                <td>{formatDate(review.submittedAt)}</td>
                <td>
                  <div className="review-preview">
                    {review.text.substring(0, 50)}
                    {review.text.length > 50 ? '...' : ''}
                  </div>
                </td>
                <td>{renderStatusBadge(review.status)}</td>
                <td>
                  <div className="action-buttons">
                    <Button 
                      variant="outline-info" 
                      size="sm" 
                      onClick={() => viewReviewDetails(review)}
                      title="View Details"
                    >
                      <FaEye />
                    </Button>
                    
                    {review.status === 'pending' && (
                      <>
                        <Button 
                          variant="outline-success" 
                          size="sm" 
                          onClick={() => handleApprove(review.id)}
                          title="Approve Review"
                          className="ms-1"
                          disabled={loading}
                        >
                          {loading ? <Spinner animation="border" size="sm" /> : <FaCheck />}
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={() => openRejectModal(review)}
                          title="Reject Review"
                          className="ms-1"
                          disabled={loading}
                        >
                          <FaTimes />
                        </Button>
                      </>
                    )}
                    
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      title="Respond to Review"
                      className="ms-1"
                    >
                      <FaReply />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );

  return (
    <div className="review-approval-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>Review Management</h3>
        <div className="search-filter-container d-flex">
          <div className="position-relative search-box">
            <input
              type="text"
              className="form-control"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <span className="search-icon"><FaFilter /></span>
          </div>
          <Button 
            variant="outline-secondary" 
            className="ms-2"
            onClick={() => {
              setError(null);
              fetchReviews();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="warning" className="mb-4" onClose={() => setError(null)} dismissible>
          <Alert.Heading>Demo Mode Active</Alert.Heading>
          <p>{error}</p>
          <p className="mb-0">
            Note: The system is currently running with simulated data since the backend server is not available.
            The approve/reject functionality will work but changes won't be saved to a database.
          </p>
        </Alert>
      )}

      <Card>
        <Card.Body>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-3"
          >
            <Tab 
              eventKey="pending" 
              title={
                <span>
                  Pending Reviews 
                  <Badge bg="warning" className="ms-2">
                    {pendingReviews.length}
                  </Badge>
                </span>
              }
            >
              {loading ? (
                <div className="text-center p-4">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : (
                renderReviewTable(pendingReviews)
              )}
            </Tab>
            <Tab 
              eventKey="approved" 
              title={
                <span>
                  Approved Reviews
                  <Badge bg="success" className="ms-2">
                    {approvedReviews.length}
                  </Badge>
                </span>
              }
            >
              {loading ? (
                <div className="text-center p-4">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : (
                renderReviewTable(approvedReviews)
              )}
            </Tab>
            <Tab 
              eventKey="rejected" 
              title={
                <span>
                  Rejected Reviews
                  <Badge bg="danger" className="ms-2">
                    {rejectedReviews.length}
                  </Badge>
                </span>
              }
            >
              {loading ? (
                <div className="text-center p-4">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : (
                renderReviewTable(rejectedReviews)
              )}
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {/* Review Details Modal */}
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Review Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentReview && (
            <div className="review-details">
              <div className="d-flex justify-content-between mb-3">
                <div>
                  <h5>{currentReview.daycareName}</h5>
                  <p className="text-muted">
                    Reviewed by {currentReview.userName} on {formatDate(currentReview.submittedAt)}
                  </p>
                </div>
                <div className="text-end">
                  <div className="d-flex align-items-center">
                    <StarRating value={currentReview.rating} readOnly={true} size={20} />
                    <span className="ms-2 fw-bold">{currentReview.rating}/5</span>
                  </div>
                  <div className="mt-2">
                    {renderStatusBadge(currentReview.status)}
                  </div>
                </div>
              </div>

              <div className="review-metadata mb-3">
                <div className="row">
                  <div className="col-md-6">
                    <p><strong>Category:</strong> {currentReview.category}</p>
                    <p><strong>Child Age:</strong> {currentReview.childAge}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Experience Date:</strong> {formatDate(currentReview.experienceDate)}</p>
                    <p><strong>Attendance:</strong> {currentReview.attendance}</p>
                  </div>
                </div>
              </div>

              <div className="review-content p-3 bg-light rounded mb-3">
                <p>{currentReview.text}</p>
              </div>

              {currentReview.photos && currentReview.photos.length > 0 && (
                <div className="review-photos mb-3">
                  <h6>Attached Photos:</h6>
                  <div className="d-flex flex-wrap">
                    {currentReview.photos.map((photo, index) => (
                      <div key={index} className="review-photo-thumbnail me-2 mb-2">
                        <img
                          src={photo.url || photo}
                          alt={`Attachment ${index + 1}`}
                          className="img-thumbnail"
                          style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentReview.status === 'approved' && (
                <div className="approval-info alert alert-success">
                  <p><strong>Approved At:</strong> {formatDate(currentReview.approvedAt)}</p>
                  <p><strong>Approved By:</strong> {currentReview.approvedBy}</p>
                </div>
              )}

              {currentReview.status === 'rejected' && (
                <div className="rejection-info alert alert-danger">
                  <p><strong>Rejected At:</strong> {formatDate(currentReview.rejectedAt)}</p>
                  <p><strong>Rejected By:</strong> {currentReview.rejectedBy}</p>
                  <p><strong>Reason:</strong> {currentReview.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {currentReview && currentReview.status === 'pending' && (
            <>
              <Button 
                variant="success" 
                onClick={async () => {
                  setShowDetailsModal(false);
                  await handleApprove(currentReview.id);
                }}
                disabled={loading}
              >
                {loading ? 
                  <><Spinner animation="border" size="sm" /> Approving...</> : 
                  <><FaCheck className="me-1" /> Approve</>
                }
              </Button>
              <Button 
                variant="danger" 
                onClick={() => {
                  setShowDetailsModal(false);
                  openRejectModal(currentReview);
                }}
                disabled={loading}
              >
                <FaTimes className="me-1" /> Reject
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reject Review Modal */}
      <Modal
        show={showRejectModal}
        onHide={() => setShowRejectModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Reject Review</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {reviewToReject && (
            <>
              <p>You are about to reject the following review:</p>
              <div className="reject-review-preview p-3 bg-light rounded mb-3">
                <p><strong>Daycare:</strong> {reviewToReject.daycareName}</p>
                <p><strong>User:</strong> {reviewToReject.userName}</p>
                <p><strong>Rating:</strong> {reviewToReject.rating}/5</p>
                <p><strong>Review:</strong> {reviewToReject.text}</p>
              </div>
              <Form.Group controlId="rejectionReason">
                <Form.Label>Reason for Rejection:</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a reason for rejecting this review..."
                  required
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={() => handleReject(reviewToReject.id)}
            disabled={!rejectReason.trim() || loading}
          >
            {loading ? 
              <><Spinner animation="border" size="sm" /> Rejecting...</> : 
              'Reject Review'
            }
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ReviewApproval;