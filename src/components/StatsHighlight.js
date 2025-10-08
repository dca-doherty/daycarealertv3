import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import '../styles/StatsHighlight.css';

const StatsHighlight = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState({
    daycaresCount: 15000,
    citiesCount: 750,
    violationsCount: 25000,
    ratingsCount: 14500
  });

  useEffect(() => {
    // Show stats after a slight delay for a nice entrance effect
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <section className={`stats-highlight ${isVisible ? 'visible' : ''}`}>
      <Container>
        <Row>
          <Col md={3} sm={6}>
            <div className="stat-item">
              <div className="stat-number">{stats.daycaresCount.toLocaleString()}+</div>
              <div className="stat-label">Licensed Daycares</div>
            </div>
          </Col>
          <Col md={3} sm={6}>
            <div className="stat-item">
              <div className="stat-number">{stats.citiesCount.toLocaleString()}+</div>
              <div className="stat-label">Texas Cities</div>
            </div>
          </Col>
          <Col md={3} sm={6}>
            <div className="stat-item">
              <div className="stat-number">{stats.violationsCount.toLocaleString()}+</div>
              <div className="stat-label">Violation Records</div>
            </div>
          </Col>
          <Col md={3} sm={6}>
            <div className="stat-item">
              <div className="stat-number">{stats.ratingsCount.toLocaleString()}+</div>
              <div className="stat-label">Rated Daycares</div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default StatsHighlight;