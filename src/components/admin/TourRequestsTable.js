import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Badge, 
  Button, 
  Modal, 
  Form,
  Pagination,
  Spinner,
  Alert
} from 'react-bootstrap';
import '../../styles/TableEnhancements.css';

const TourRequestsTable = () => {
  const [tourRequests, setTourRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [requestsPerPage] = useState(10);
  
  // Fetch tour requests from the API
  const fetchTourRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the API_URL from the environment or fallback to localhost
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8082';
      const token = localStorage.getItem('token');
      
      console.log('Fetching tour requests from:', `${apiUrl}/api/tours`);
      console.log('Using token:', token ? 'Token exists' : 'No token found');
      
      const response = await fetch(`${apiUrl}/api/tours`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch tour requests: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Tour requests data:', data);
      setTourRequests(data.data || []);
    } catch (error) {
      console.error('Error fetching tour requests:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Load tour requests on component mount
  useEffect(() => {
    fetchTourRequests();
  }, []);
  
  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedRequest || !newStatus) return;
    
    try {
      // Use the API_URL from the environment or fallback to localhost: 8082
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8082';
      const token = localStorage.getItem('token');
      
      console.log('Updating tour request status:', selectedRequest.id, 'to', newStatus);
      console.log('Using API URL:', apiUrl);
      
      const response = await fetch(`${apiUrl}/api/tours/${selectedRequest.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to update tour request status: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Update status result:', result);
      
      // Update the local state
      setTourRequests(prev => 
        prev.map(req => 
          req.id === selectedRequest.id ? { ...req, status: newStatus } : req
        )
      );
      
      setShowStatusModal(false);
      setSelectedRequest(null);
      setNewStatus('');
      
      // Show success message
      alert(`Tour request status updated to ${newStatus}`);
      
      // Refresh the data
      fetchTourRequests();
    } catch (error) {
      console.error('Error updating tour request status:', error);
      alert(`Error: ${error.message}`);
    }
  };
  
  // Handle opening the status modal
  const openStatusModal = (request) => {
    setSelectedRequest(request);
    setNewStatus(request.status);
    setShowStatusModal(true);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Get badge color based on status
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'confirmed':
        return 'primary';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  };
  
  // Pagination logic
  const indexOfLastRequest = currentPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
  const currentRequests = tourRequests.slice(indexOfFirstRequest, indexOfLastRequest);
  const totalPages = Math.ceil(tourRequests.length / requestsPerPage);
  
  return (
    <div className="tour-requests-container">
      <h2>Tour Requests</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {loading ? (
        <div className="text-center p-4">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <>
          {tourRequests.length === 0 ? (
            <Alert variant="info">No tour requests found.</Alert>
          ) : (
            <>
              <Table responsive striped hover className="custom-table">
                <thead>
                  <tr>
                    <th>Date Requested</th>
                    <th>Daycare</th>
                    <th>Contact Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Tour Date</th>
                    <th>Time</th>
                    <th>Children</th>
                    <th>Age Groups</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRequests.map(request => (
                    <tr key={request.id}>
                      <td>{formatDate(request.created_at)}</td>
                      <td>{request.daycare_name}</td>
                      <td>{request.name}</td>
                      <td>{request.email}</td>
                      <td>{request.phone}</td>
                      <td>{formatDate(request.tour_date)}</td>
                      <td>{request.tour_time}</td>
                      <td>{request.child_count}</td>
                      <td>
                        {request.age_groups.map(age => (
                          <span key={age} className="age-group-badge">
                            {age}
                          </span>
                        ))}
                      </td>
                      <td>
                        <Badge bg={getStatusBadge(request.status)}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </td>
                      <td>
                        <Button 
                          size="sm" 
                          variant="outline-primary"
                          onClick={() => openStatusModal(request)}
                        >
                          Update Status
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              
              {totalPages > 1 && (
                <Pagination className="justify-content-center mt-3">
                  <Pagination.First
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  />
                  <Pagination.Prev
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  />
                  
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Pagination.Item
                      key={i + 1}
                      active={i + 1 === currentPage}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </Pagination.Item>
                  ))}
                  
                  <Pagination.Next
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  />
                  <Pagination.Last
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  />
                </Pagination>
              )}
            </>
          )}
        </>
      )}
      
      {/* Status Update Modal */}
      <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Update Tour Request Status</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <>
              <p>
                <strong>Daycare:</strong> {selectedRequest.daycare_name}<br />
                <strong>Contact:</strong> {selectedRequest.name}<br />
                <strong>Tour Date:</strong> {formatDate(selectedRequest.tour_date)} at {selectedRequest.tour_time}
              </p>
              
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Form.Select>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleStatusUpdate}>
            Update Status
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TourRequestsTable;