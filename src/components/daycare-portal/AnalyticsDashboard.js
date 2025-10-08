import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Alert, Spinner, Form } from 'react-bootstrap';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import '../../styles/DaycarePortal.css';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const AnalyticsDashboard = ({ daycareId, detailed = false }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState(30); // Default to 30 days
  
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`https://api.daycarealert.com/api/daycare-portal/analytics?days=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.data || null);
      } else {
        setError(data.message || 'Failed to load analytics data');
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [timeRange, setAnalytics, setLoading, setError]);
  
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);
  
  const handleTimeRangeChange = (e) => {
    setTimeRange(parseInt(e.target.value));
  };

  if (loading && !analytics) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading analytics data...</p>
      </div>
    );
  }
  
  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }
  
  if (!analytics) {
    return <Alert variant="info">No analytics data available for your daycare.</Alert>;
  }
  
  // Prepare chart data
  const getDailyData = () => {
    if (!analytics.daily_data || analytics.daily_data.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }
    
    const sortedData = [...analytics.daily_data].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return {
      labels: sortedData.map(day => new Date(day.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Profile Views',
          data: sortedData.map(day => day.profile_views),
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.4
        },
        {
          label: 'Tour Requests',
          data: sortedData.map(day => day.tour_requests),
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.4
        },
        {
          label: 'Conversions',
          data: sortedData.map(day => day.conversions),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4
        }
      ]
    };
  };
  
  const getReferralTypesData = () => {
    if (!analytics.daily_data || analytics.daily_data.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }
    
    // Aggregate referral types
    const totalProfileViews = analytics.total_profile_views || 0;
    const totalSearchAppearances = analytics.total_search_appearances || 0;
    const totalRecommendations = analytics.total_recommendation_appearances || 0;
    const totalTourRequests = analytics.total_tour_requests || 0;
    
    return {
      labels: ['Profile Views', 'Search Results', 'Recommendations', 'Tour Requests'],
      datasets: [
        {
          label: 'Referral Types',
          data: [totalProfileViews, totalSearchAppearances, totalRecommendations, totalTourRequests],
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 99, 132, 0.6)'
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
  };
  
  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: detailed,
        text: 'Daily Analytics',
      },
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };
  
  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: detailed,
        text: 'Referral Types',
      },
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <div className="analytics-dashboard">
      {detailed && (
        <div className="mb-4">
          <Form.Group>
            <Form.Label>Time Range</Form.Label>
            <Form.Select value={timeRange} onChange={handleTimeRangeChange}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 6 months</option>
              <option value="365">Last year</option>
            </Form.Select>
          </Form.Group>
        </div>
      )}
      
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <h6 className="text-muted">Total Views</h6>
              <h2 className="mb-0">{analytics.total_profile_views}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <h6 className="text-muted">Tour Requests</h6>
              <h2 className="mb-0">{analytics.total_tour_requests}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <h6 className="text-muted">Total Referrals</h6>
              <h2 className="mb-0">{analytics.total_referrals}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <h6 className="text-muted">Conversion Rate</h6>
              <h2 className="mb-0">{analytics.conversion_rate.toFixed(1)}%</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {detailed ? (
        <Row>
          <Col md={8} className="mb-4">
            <Card>
              <Card.Body>
                <h5 className="mb-3">Activity Over Time</h5>
                <Line data={getDailyData()} options={lineChartOptions} />
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} className="mb-4">
            <Card>
              <Card.Body>
                <h5 className="mb-3">Referral Types</h5>
                <Bar data={getReferralTypesData()} options={barChartOptions} />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : (
        <Row>
          <Col>
            <Card>
              <Card.Body>
                <h5 className="mb-3">Activity Overview (Last {timeRange} Days)</h5>
                <Line data={getDailyData()} options={lineChartOptions} />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
