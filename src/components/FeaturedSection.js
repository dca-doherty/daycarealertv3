import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { fetchFilteredDaycareData } from '../utils/api';
import '../styles/FeaturedSection.css';

const FeaturedSection = () => {
  const [featuredDaycares, setFeaturedDaycares] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        // Fetch top rated daycares
        const data = await fetchFilteredDaycareData(3, 0, { sortColumn: 'rating', sortDirection: 'desc' });
        setFeaturedDaycares(data || []);
      } catch (error) {
        console.error('Error fetching featured daycares:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  if (loading) {
    return (
      <section className="featured-section">
        <Container>
          <h2 className="section-title">Featured Daycares</h2>
          <p className="section-subtitle">Loading featured daycares...</p>
        </Container>
      </section>
    );
  }

  if (featuredDaycares.length === 0) {
    return null; // Don't show section if no featured daycares
  }

  return (
    <section className="featured-section">
      <Container>
        <h2 className="section-title">Featured Daycares</h2>
        <p className="section-subtitle">Top-rated daycare centers in Texas</p>
        
        <Row>
          {featuredDaycares.map(daycare => (
            <Col md={4} key={daycare.operation_number}>
              <Card className="featured-card">
                <Card.Body>
                  <h3 className="daycare-name">{daycare.operation_name}</h3>
                  <p className="daycare-location">{daycare.city}</p>
                  <div className="daycare-rating">
                    <span className={`rating ${daycare.rating?.class || 'good'}`}>
                      {daycare.rating?.stars || '★★★★'}
                    </span>
                    <span className="rating-score">
                      ({daycare.rating?.score?.toFixed(1) || '4.0'})
                    </span>
                  </div>
                  <p className="daycare-description">
                    {daycare.operation_type} · Capacity: {daycare.total_capacity}
                  </p>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
};

export default FeaturedSection;