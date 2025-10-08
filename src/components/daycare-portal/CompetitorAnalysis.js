import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Alert, Spinner, Button, Table, Badge } from 'react-bootstrap';
import '../../styles/DaycarePortal.css';

const CompetitorAnalysis = ({ daycareId }) => {
  const [competitorData, setCompetitorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const fetchCompetitorData = async (refresh = false) => {
    try {
      setLoading(true);
      const url = `https://api.daycarealert.com/api/daycare-portal/competitors${refresh ? '?refresh=true' : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch competitor data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCompetitorData(data.data || null);
      } else {
        setError(data.message || 'Failed to load competitor data');
      }
    } catch (err) {
      console.error('Error fetching competitor data:', err);
      setError('Failed to load competitor data');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCompetitorData();
  }, [daycareId]);
  
  const refreshData = () => {
    fetchCompetitorData(true);
  };
  
  const formatCurrency = (value) => {
    if (!value && value !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  const formatPercentage = (value) => {
    if (!value && value !== 0) return 'N/A';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };
  
  const formatRatingDifference = (value) => {
    if (!value && value !== 0) return 'N/A';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
  };
  
  const getComparisonBadge = (value, inverse = false) => {
    if (value === null || value === undefined) return 'secondary';
    
    if (!inverse) {
      if (value > 5) return 'success';
      if (value < -5) return 'danger';
      return 'warning';
    } else {
      if (value < -5) return 'success';
      if (value > 5) return 'danger';
      return 'warning';
    }
  };
  
  const getMarketPositionBadge = (position) => {
    switch (position) {
      case 'higher':
        return 'warning';
      case 'lower':
        return 'success';
      case 'similar':
      default:
        return 'info';
    }
  };
  
  const getMarketPositionLabel = (position) => {
    switch (position) {
      case 'higher':
        return 'Higher Priced';
      case 'lower':
        return 'Lower Priced';
      case 'similar':
      default:
        return 'Similarly Priced';
    }
  };

  if (loading && !competitorData) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading competitor analysis...</p>
      </div>
    );
  }
  
  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }
  
  if (!competitorData) {
    return <Alert variant="info">No competitor data available for your daycare.</Alert>;
  }
  
  const { daycare, competitors, market_summary } = competitorData;

  return (
    <div className="competitor-analysis">
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Competitive Market Analysis</h5>
        <Button 
          variant="outline-primary" 
          size="sm" 
          onClick={refreshData}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Analysis'}
        </Button>
      </div>
      
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <h5 className="mb-3">Your Daycare Overview</h5>
              <Row>
                <Col md={6}>
                  <p><strong>Name:</strong> {daycare.name}</p>
                  <p><strong>Weekly Rate:</strong> {formatCurrency(daycare.weekly_rate)}</p>
                </Col>
                <Col md={6}>
                  <p><strong>Rating:</strong> {daycare.rating ? daycare.rating.toFixed(1) : 'N/A'}/5.0</p>
                  <p><strong>Violations:</strong> {daycare.violations}</p>
                </Col>
              </Row>
              
              <h5 className="mt-4 mb-3">Market Summary</h5>
              <Row>
                <Col md={4}>
                  <div className="summary-item">
                    <span className="summary-label">Price Comparison:</span>
                    <span className="summary-value">{market_summary.price_comparison}</span>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="summary-item">
                    <span className="summary-label">Quality Comparison:</span>
                    <span className="summary-value">{market_summary.quality_comparison}</span>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="summary-item">
                    <span className="summary-label">Safety Comparison:</span>
                    <span className="summary-value">{market_summary.safety_comparison}</span>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Card>
        <Card.Body>
          <h5 className="mb-3">Nearby Competitors ({competitors.length})</h5>
          
          {competitors.length === 0 ? (
            <Alert variant="info">No nearby competitors found in our database.</Alert>
          ) : (
            <div className="table-responsive">
              <Table className="competitor-table">
                <thead>
                  <tr>
                    <th>Daycare</th>
                    <th>Distance</th>
                    <th>Price Difference</th>
                    <th>Rating Difference</th>
                    <th>Violations Difference</th>
                    <th>Market Position</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map(competitor => (
                    <tr key={competitor.id}>
                      <td>
                        <div className="competitor-name">{competitor.name}</div>
                      </td>
                      <td>{competitor.distance_miles.toFixed(1)} miles</td>
                      <td>
                        <Badge 
                          bg={getComparisonBadge(competitor.price_difference_percent)}
                          className="me-2"
                        >
                          {formatPercentage(competitor.price_difference_percent)}
                        </Badge>
                      </td>
                      <td>
                        <Badge 
                          bg={getComparisonBadge(competitor.rating_difference)}
                          className="me-2"
                        >
                          {formatRatingDifference(competitor.rating_difference)}
                        </Badge>
                      </td>
                      <td>
                        <Badge 
                          bg={getComparisonBadge(competitor.violation_count_difference, true)}
                          className="me-2"
                        >
                          {competitor.violation_count_difference > 0 ? '+' : ''}
                          {competitor.violation_count_difference}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={getMarketPositionBadge(competitor.market_position)}>
                          {getMarketPositionLabel(competitor.market_position)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
          
          <div className="mt-3 small text-muted">
            <p className="mb-1">
              <strong>Price Difference:</strong> Positive values mean your price is higher, negative values mean your price is lower.
            </p>
            <p className="mb-1">
              <strong>Rating Difference:</strong> Positive values mean your rating is higher, negative values mean your rating is lower.
            </p>
            <p className="mb-0">
              <strong>Violations Difference:</strong> Positive values mean you have more violations, negative values mean you have fewer violations.
            </p>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default CompetitorAnalysis;
