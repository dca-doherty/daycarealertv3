import React, { useState, useEffect } from 'react';
import { Table, Badge, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import '../../styles/DaycarePortal.css';

const TourList = ({ daycareId, onTourUpdated }) => {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedTour, setSelectedTour] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  
  const fetchTours = async () => {
    try {
      setLoading(true);
	const response = await fetch(`https://api.daycarealert.com/api/daycare-portal/tours`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tour requests');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setTours(data.data || []);
      } else {
        setError(data.message || 'Failed to load tour requests');
      }
    } catch (err) {
      console.error('Error fetching tour requests:', err);
      setError('Failed to load tour requests');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTours();
  }, [daycareId]);
  
  const handleStatusUpdate = async () => {
    if (!selectedTour || !newStatus) return;
    
    try {
      setLoading(true);
      const response = await fetch(`https://api.daycarealert.com/api/daycare-portal/tours/${selectedTour.id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update tour status');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Update the local state
        setTours(tours.map(tour => 
          tour.id === selectedTour.id ? { ...tour, status: newStatus } : tour
        ));
        
        setShowStatusModal(false);
        setSelectedTour(null);
        setNewStatus('');
        
        // Call the callback if provided
        if (onTourUpdated) {
          onTourUpdated();
        }
      } else {
        setError(data.message || 'Failed to update tour status');
      }
    } catch (err) {
      console.error('Error updating tour status:', err);
      setError('Failed to update tour status');
    } finally {
      setLoading(false);
    }
  };
  
  const openStatusModal = (tour) => {
    setSelectedTour(tour);
    setNewStatus(tour.status);
    setShowStatusModal(true);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
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

  if (loading && tours.length === 0) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading tour requests...</p>
      </div>
    );
  }
  
  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }
  
  if (tours.length === 0) {
    return <Alert variant="info">No tour requests found for your daycare.</Alert>;
  }

  return (
    <div className="tour-list">
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <h5 className="mb-0">You have {tours.filter(t => t.status === 'pending').length} pending tour requests</h5>
        <Button variant="outline-primary" size="sm" onClick={fetchTours} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      
      <Table responsive hover className="tours-table">
        <thead>
          <tr>
            <th>Date Requested</th>
            <th>Parent Name</th>
            <th>Contact</th>
            <th>Tour Date</th>
            <th>Children</th>
            <th>Age Groups</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tours.map(tour => (
            <tr key={tour.id} className={tour.status === 'pending' ? 'pending-tour' : ''}>
              <td>{formatDate(tour.created_at)}</td>
              <td>{tour.name}</td>
              <td>
                <div>{tour.email}</div>
                <div>{tour.phone}</div>
              </td>
              <td>{formatDate(tour.tour_date)} at {tour.tour_time}</td>
              <td>{tour.child_count}</td>
              <td>
                {Array.isArray(tour.age_groups) ? (
                  tour.age_groups.map(age => (
                    <span key={age} className="age-group-badge">
                      {age}
                    </span>
                  ))
                ) : (
                  <span>Not specified</span>
                )}
              </td>
              <td>
                <Badge bg={getStatusBadge(tour.status)}>
                  {tour.status.charAt(0).toUpperCase() + tour.status.slice(1)}
                </Badge>
              </td>
              <td>
                <Button 
                  size="sm" 
                  variant="outline-primary"
                  onClick={() => openStatusModal(tour)}
                >
                  Update
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      
      {/* Status Update Modal */}
      <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Update Tour Status</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTour && (
            <>
              <p>
                <strong>Parent:</strong> {selectedTour.name}<br />
                <strong>Contact:</strong> {selectedTour.email} / {selectedTour.phone}<br />
                <strong>Tour Date:</strong> {formatDate(selectedTour.tour_date)} at {selectedTour.tour_time}
              </p>
              
              {selectedTour.comments && (
                <div className="mb-3">
                  <strong>Comments:</strong>
                  <p className="comment-box">{selectedTour.comments}</p>
                </div>
              )}
              
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
                <Form.Text className="text-muted">
                  Marking as "Completed" will also track this as a successful conversion in your analytics.
                </Form.Text>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleStatusUpdate}
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Status'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TourList;
