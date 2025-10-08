import React, { useState, useEffect } from 'react';
import { Table, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import '../../styles/DaycarePortal.css';

const ReferralList = ({ daycareId, onReferralUpdated }) => {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const response = await fetch(`https://api.daycarealert.com/api/daycare-portal/referrals`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch referrals');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setReferrals(data.data || []);
      } else {
        setError(data.message || 'Failed to load referrals');
      }
    } catch (err) {
      console.error('Error fetching referrals:', err);
      setError('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchReferrals();
  }, [daycareId]);
  
  const handleMarkConverted = async (referralId) => {
    try {
      setLoading(true);
      const response = await fetch(`https://api.daycarealert.com/api/daycare-portal/referrals/${referralId}/convert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark referral as converted');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Update the local state
        setReferrals(referrals.map(ref => 
          ref.id === referralId ? { ...ref, converted: true, conversion_date: new Date().toISOString() } : ref
        ));
        
        // Call the callback if provided
        if (onReferralUpdated) {
          onReferralUpdated();
        }
      } else {
        setError(data.message || 'Failed to mark referral as converted');
      }
    } catch (err) {
      console.error('Error marking referral as converted:', err);
      setError('Failed to mark referral as converted');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const getReferralTypeBadge = (type) => {
    switch (type) {
      case 'tour':
        return 'primary';
      case 'profile_click':
        return 'info';
      case 'search_result':
        return 'secondary';
      case 'recommendation':
        return 'success';
      case 'website_view':
        return 'warning';
      default:
        return 'light';
    }
  };
  
  const getReferralTypeLabel = (type) => {
    switch (type) {
      case 'tour':
        return 'Tour Request';
      case 'profile_click':
        return 'Profile View';
      case 'search_result':
        return 'Search Result';
      case 'recommendation':
        return 'Recommendation';
      case 'website_view':
        return 'Website View';
      default:
        return type;
    }
  };

  if (loading && referrals.length === 0) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading referrals...</p>
      </div>
    );
  }
  
  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }
  
  if (referrals.length === 0) {
    return <Alert variant="info">No referrals found for your daycare.</Alert>;
  }

  return (
    <div className="referral-list">
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <h5 className="mb-0">You have {referrals.filter(r => !r.converted).length} unconverted leads</h5>
        <Button variant="outline-primary" size="sm" onClick={fetchReferrals} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      
      <Table responsive hover className="referrals-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Contact Info</th>
            <th>Notes</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {referrals.map(referral => (
            <tr key={referral.id} className={!referral.converted ? 'unconverted-referral' : ''}>
              <td>{formatDate(referral.referral_date)}</td>
              <td>
                <Badge bg={getReferralTypeBadge(referral.referral_type)}>
                  {getReferralTypeLabel(referral.referral_type)}
                </Badge>
              </td>
              <td>
                {referral.contact_name && <div><strong>{referral.contact_name}</strong></div>}
                {referral.contact_email && <div>{referral.contact_email}</div>}
                {referral.contact_phone && <div>{referral.contact_phone}</div>}
                {!referral.contact_name && !referral.contact_email && !referral.contact_phone && 
                  <span className="text-muted">No contact info</span>
                }
              </td>
              <td>
                {referral.notes || <span className="text-muted">No notes</span>}
              </td>
              <td>
                {referral.converted ? (
                  <Badge bg="success">Converted</Badge>
                ) : (
                  <Badge bg="warning">Pending</Badge>
                )}
              </td>
              <td>
                {!referral.converted && (
                  <Button 
                    size="sm" 
                    variant="outline-success"
                    onClick={() => handleMarkConverted(referral.id)}
                    disabled={loading}
                  >
                    Mark Converted
                  </Button>
                )}
                {referral.converted && (
                  <span className="text-muted">
                    Converted {referral.conversion_date ? formatDate(referral.conversion_date) : ''}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default ReferralList;
