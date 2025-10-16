import React, { useState, useEffect } from 'react';
import './TourRequestsDashboard.css';

const TourRequestsDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    cancelled: 0
  });

  useEffect(() => {
    fetchTourRequests();
  }, [filter]);

  const fetchTourRequests = async () => {
    try {
      const response = await fetch(`/api/tour-requests?status=${filter !== 'all' ? filter : ''}`);
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.requests);
        calculateStats(data.requests);
      }
    } catch (error) {
      console.error('Error fetching tour requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (requests) => {
    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      completed: requests.filter(r => r.status === 'completed').length,
      cancelled: requests.filter(r => r.status === 'cancelled').length
    };
    setStats(stats);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="loading">Loading tour requests...</div>;
  }

  return (
    <div className="tour-dashboard">
      <div className="dashboard-header">
        <h1>Tour Requests Dashboard</h1>
        <p>Manage and track all daycare tour requests</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Requests</div>
        </div>
        <div className="stat-card pending">
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card completed">
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card cancelled">
          <div className="stat-value">{stats.cancelled}</div>
          <div className="stat-label">Cancelled</div>
        </div>
      </div>

      <div className="filters">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          Pending
        </button>
        <button 
          className={filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
        <button 
          className={filter === 'cancelled' ? 'active' : ''}
          onClick={() => setFilter('cancelled')}
        >
          Cancelled
        </button>
      </div>

      <div className="requests-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Parent Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th># Children</th>
              <th># Daycares</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(request => (
              <tr key={request.id}>
                <td>#{request.id}</td>
                <td>{request.parent_name}</td>
                <td>{request.parent_email}</td>
                <td>{request.parent_phone}</td>
                <td>{request.number_of_children}</td>
                <td>{request.daycare_count}</td>
                <td>
                  <span className={`status-badge ${request.status}`}>
                    {request.status}
                  </span>
                </td>
                <td>{formatDate(request.created_at)}</td>
                <td>
                  <button 
                    className="view-btn"
                    onClick={() => window.location.href = `/admin/tour-requests/${request.id}`}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {requests.length === 0 && (
          <div className="no-results">
            No tour requests found
          </div>
        )}
      </div>
    </div>
  );
};

export default TourRequestsDashboard;
