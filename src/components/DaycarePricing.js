import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import '../styles/DaycarePricing.css';
// eslint-disable-next-line no-unused-vars
import { estimateDaycarePrice } from '../utils/helpers';

const DaycarePricing = () => {
  const [pricingData, setPricingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cachedData, setCachedData] = useState(null);

  const fetchPricingData = useCallback(async () => {
    // Check if we have cached data that's still fresh
    if (cachedData && cachedData.timestamp && (Date.now() - cachedData.timestamp < 5 * 60 * 1000)) {
      setPricingData(cachedData.data);
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get('/api/pricing', {
        timeout: 10000, // 10 second timeout
      });
      
      // Cache the data with timestamp
      const newData = response.data;
      setCachedData({
        data: newData,
        timestamp: Date.now()
      });
      
      setPricingData(newData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load pricing data. Please try again later.');
      setLoading(false);
      console.error('Error fetching pricing data:', err);
    }
  }, [cachedData]);

  useEffect(() => {
    fetchPricingData();
  }, [fetchPricingData]);

  if (loading) return <LoadingSpinner message="Loading pricing information..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchPricingData} />;

  return (
    <div className="pricing-container">
      <h2>Daycare Pricing Options</h2>
      <div className="pricing-grid">
        {pricingData.map((plan) => (
          <div key={plan.id} className="pricing-card">
            <h3>{plan.title}</h3>
            <div className="price">${plan.price}/month</div>
            <ul className="features-list">
              {plan.features.map((feature, i) => (
                <li key={i}>{feature}</li>
              ))}
            </ul>
            <Link to="/enroll" className="enroll-button">Enroll Now</Link>
          </div>
        ))}
      </div>
      <div className="pricing-notes">
        <p>* Additional fees may apply for extended hours or special services</p>
        <p>* Sibling discounts available upon request</p>
        <p>* These prices are estimates. Actual prices may vary by location and provider</p>
      </div>
      
      <div className="pricing-calculator">
        <h3>Estimate Your Daycare Costs</h3>
        <p>Use our daycare calculator to get a personalized estimate for your family's needs.</p>
        <Link to="/cost-estimator" className="calculator-button">Try Our Calculator</Link>
      </div>
    </div>
  );
};

export default DaycarePricing;