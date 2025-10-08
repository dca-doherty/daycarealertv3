import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DaycareDataView from './DaycareDataView';
import CallToAction from './CallToAction';
import FeaturedSection from './FeaturedSection';
import StatsHighlight from './StatsHighlight';
import heroImage from '../assets/images/daycare-hero.jpg';
import { fetchFilteredDaycareData } from '../utils/api';
import '../styles/Home.css';

/**
 * Enhanced Home component that serves as the main hub of the application
 * with direct access to all daycare data
 */
const HomePage = () => {
  const [searchParams] = useSearchParams();
  const [showExplainer, setShowExplainer] = useState(true);
  const [daycaresData, setDaycaresData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Check for user preference to hide explainer
  useEffect(() => {
    const hideExplainer = localStorage.getItem('hideExplainer');
    if (hideExplainer === 'true') {
      setShowExplainer(false);
    }
  }, []);
  
  // Fetch daycares data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchFilteredDaycareData(10, 0);
        if (data && Array.isArray(data)) {
          setDaycaresData(data);
        } else {
          console.error('Invalid data format received from API:', data);
          setError('Failed to load daycare data. Please try again later.');
        }
      } catch (err) {
        console.error('Error fetching daycare data:', err);
        setError('Failed to load daycare data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const dismissExplainer = () => {
    setShowExplainer(false);
    localStorage.setItem('hideExplainer', 'true');
  };
  
  return (
    <div className="home-page">
      {/* Hero section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1>Find Safe, Quality Daycare in Texas</h1>
          <p>Compare ratings, violations, and pricing information for licensed daycares</p>
          <CallToAction text="Start Searching" scrollToId="search-section" />
        </div>
      </div>
      
      {/* Info banner */}
      {showExplainer && (
        <div className="info-banner">
          <div className="info-content">
            <h3>How It Works</h3>
            <p>
              Search for daycares, view detailed information, and make informed decisions.
              Click on "View Details" for any daycare to see complete information including violations
              and pricing estimates in one place, no page switching needed!
            </p>
          </div>
          <button className="dismiss-button" onClick={dismissExplainer}>×</button>
        </div>
      )}
      
      {/* Stats highlights */}
      <StatsHighlight />
      
      {/* Main search section */}
      <div id="search-section">
        <DaycareDataView 
          title="Texas Daycare Explorer"
          subtitle="Search, compare and find the perfect daycare for your children"
          headerImage={heroImage}
          searchPlaceholder="Search by daycare name, city, or zipcode..."
          itemsPerPage={10}
          data={daycaresData}
          initialData={daycaresData}
          loading={loading}
          error={error}
          onSearch={async (term, category, filters) => {
            try {
              setLoading(true);
              const data = await fetchFilteredDaycareData(10, 0, {
                searchTerm: term,
                ...filters
              });
              setDaycaresData(data || []);
            } catch (err) {
              console.error('Error searching daycares:', err);
              setError('Failed to search. Please try again later.');
            } finally {
              setLoading(false);
            }
          }}
        />
      </div>
      
      {/* Featured daycares section */}
      <FeaturedSection />
    </div>
  );
};

export default HomePage;
