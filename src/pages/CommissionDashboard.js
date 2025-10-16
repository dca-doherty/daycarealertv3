import React, { useState, useEffect } from 'react';
import './CommissionDashboard.css';

const CommissionDashboard = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [stats, setStats] = useState({
    total_enrollments: 0,
    successful_enrollments: 0,
    total_commission_paid: 0,
    pending_commission: 0,
    avg_commission: 0
  });
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch enrollments
      const enrollmentsRes = await fetch('/api/enrollments/all');
      const enrollmentsData = await enrollmentsRes.json();
      
      // Fetch stats
      const statsRes = await fetch('/api/enrollments/stats');
      const statsData = await statsRes.json();
      
      if (enrollmentsData.success) {
        let filtered = enrollmentsData.enrollments;
        
        if (filter === 'pending') {
          filtered = filtered.filter(e => e.commission_status === 'pending');
        } else if (filter === 'approved') {
          filtered = filtered.filter(e => e.commission_status === 'approved');
        } else if (filter === 'paid') {
          filtered = filtered.filter(e => e.commission_status === 'paid');
        } else if (filter === 'enrolled') {
          filtered = filtered.filter(e => e.enrollment_status === 'enrolled');
        }
        
        setEnrollments(filtered);
      }
      
      if (statsData.success) {
        setStats(statsData.stats);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCommission = async (enrollmentId) => {
    if (!window.confirm('Approve this commission for payment?')) return;
    
    try {
      const response = await fetch(`/api/enrollments/${enrollmentId}/approve-commission`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Commission approved!');
        fetchData();
      }
    } catch (error) {
      console.error('Error approving commission:', error);
      alert('Failed to approve commission');
    }
  };

  const handleMarkPaid = async (enrollmentId) => {
    const paymentMethod = prompt('Payment method (check/wire/ach):');
    const paymentReference = prompt('Payment reference/check number:');
    
    if (!paymentMethod) return;
    
    try {
      const response = await fetch(`/api/enrollments/${enrollmentId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod, paymentReference })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Payment recorded!');
        fetchData();
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  if (loading) {
    return <div className="loading">Loading commission data...</div>;
  }

  return (
    <div className="commission-dashboard">
      <div className="dashboard-header">
        <h1>💰 Commission & Enrollment Tracker</h1>
        <p>Manage enrollments and track referral commissions</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total_enrollments}</div>
            <div className="stat-label">Total Enrollments</div>
          </div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.successful_enrollments}</div>
            <div className="stat-label">Confirmed Enrollments</div>
          </div>
        </div>
        
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{formatCurrency(stats.pending_commission)}</div>
            <div className="stat-label">Pending Commission</div>
          </div>
        </div>
        
        <div className="stat-card paid">
          <div className="stat-icon">💵</div>
          <div className="stat-content">
            <div className="stat-value">{formatCurrency(stats.total_commission_paid)}</div>
            <div className="stat-label">Total Paid</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All ({enrollments.length})
        </button>
        <button 
          className={filter === 'enrolled' ? 'active' : ''}
          onClick={() => setFilter('enrolled')}
        >
          Enrolled
        </button>
        <button 
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          Pending Payment
        </button>
        <button 
          className={filter === 'approved' ? 'active' : ''}
          onClick={() => setFilter('approved')}
        >
          Approved
        </button>
        <button 
          className={filter === 'paid' ? 'active' : ''}
          onClick={() => setFilter('paid')}
        >
          Paid
        </button>
      </div>

      {/* Enrollments Table */}
      <div className="enrollments-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Daycare</th>
              <th>Parent</th>
              <th>Children</th>
              <th>Enrolled</th>
              <th>Commission</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map(enrollment => (
              <tr key={enrollment.id}>
                <td>#{enrollment.id}</td>
                <td>
                  <div className="daycare-cell">
                    <strong>{enrollment.operation_name}</strong>
                    <small>{enrollment.operation_id}</small>
                  </div>
                </td>
                <td>
                  <div className="parent-cell">
                    <strong>{enrollment.parent_name}</strong>
                    <small>{enrollment.parent_email}</small>
                  </div>
                </td>
                <td className="center">{enrollment.number_enrolled}</td>
                <td>{formatDate(enrollment.enrollment_date)}</td>
                <td className="currency">
                  <strong>{formatCurrency(enrollment.commission_amount)}</strong>
                  <small>${enrollment.monthly_tuition_amount?.toFixed(2)}/mo</small>
                </td>
                <td>
                  <span className={`status-badge ${enrollment.commission_status}`}>
                    {enrollment.commission_status}
                  </span>
                  <small className="enrollment-status">
                    {enrollment.enrollment_status}
                  </small>
                </td>
                <td>
                  <div className="action-buttons">
                    {enrollment.commission_status === 'pending' && (
                      <button 
                        className="approve-btn"
                        onClick={() => handleApproveCommission(enrollment.id)}
                        title="Approve for payment"
                      >
                        ✓ Approve
                      </button>
                    )}
                    
                    {enrollment.commission_status === 'approved' && (
                      <button 
                        className="pay-btn"
                        onClick={() => handleMarkPaid(enrollment.id)}
                        title="Mark as paid"
                      >
                        💵 Mark Paid
                      </button>
                    )}
                    
                    {enrollment.commission_status === 'paid' && (
                      <span className="paid-indicator">✓ Paid {formatDate(enrollment.commission_paid_date)}</span>
                    )}
                    
                    <button 
                      className="view-btn"
                      onClick={() => window.location.href = `/admin/enrollment/${enrollment.id}`}
                      title="View details"
                    >
                      👁 View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {enrollments.length === 0 && (
          <div className="no-results">
            <p>No enrollments found</p>
          </div>
        )}
      </div>

      {/* Quick Stats Summary */}
      <div className="summary-box">
        <h3>💡 Quick Summary</h3>
        <div className="summary-grid">
          <div>
            <strong>Average Commission:</strong>
            <span>{formatCurrency(stats.avg_commission)}</span>
          </div>
          <div>
            <strong>Conversion Rate:</strong>
            <span>
              {stats.total_enrollments > 0 
                ? ((stats.successful_enrollments / stats.total_enrollments) * 100).toFixed(1)
                : 0}%
            </span>
          </div>
          <div>
            <strong>Outstanding:</strong>
            <span className="highlight">{formatCurrency(stats.pending_commission)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionDashboard;
