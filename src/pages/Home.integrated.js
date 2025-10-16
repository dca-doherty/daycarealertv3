import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import DaycareDataView from '../components/DaycareDataView';
import TourSelectionCart from '../components/TourScheduling/TourSelectionCart';
import TourRequestModal from '../components/TourScheduling/TourRequestModal';
import TourSuccessModal from '../components/TourScheduling/TourSuccessModal';
import { useTourSelection } from '../hooks/useTourSelection';
import DaycareDetails from '../components/DaycareDetails';
import SortFilterWrapper from '../components/SortFilterWrapper';
import { fetchTotalDaycareCount, fetchFilteredDaycareData, fetchDaycareById } from '../utils/api';
import { debounce } from 'lodash';
import heroImage from '../images/pexels-mikhail-nilov-8923956.jpg';
import '../styles/Home.css';

const Home = ({ tabView, profileId }) => {
  // Get URL parameters
  const params = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const daycareId = profileId ||
                   (params && params.id) ||
                   queryParams.get('id') ||
                   (location.state && location.state.daycareId);

  const initialTabView = tabView || queryParams.get('tab') || 'overview';
  const [daycares, setDaycares] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDaycare, setSelectedDaycare] = useState(null);
  const [showDaycareDetails, setShowDaycareDetails] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTabView);
  const [dataSourcePref, setDataSourcePref] = useState('Optimized MySQL');

  // Tour scheduling state
  const tourSelection = useTourSelection();
  const [showTourModal, setShowTourModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedTourId, setSubmittedTourId] = useState(null);
  const [submittedDaycares, setSubmittedDaycares] = useState([]);

  // Existing useEffects and functions...
  // (Keep all your existing code)

  // Tour scheduling handlers
  const handleTourSelection = useCallback((daycare) => {
    if (tourSelection.isSelected(daycare.operation_id)) {
      tourSelection.removeDaycare(daycare.operation_id);
    } else {
      tourSelection.addDaycare({
        operation_id: daycare.operation_id,
        operation_name: daycare.operation_name,
        city: daycare.city,
        email: daycare.email_address
      });
    }
  }, [tourSelection]);

  const handleScheduleTour = useCallback(() => {
    setShowTourModal(true);
  }, []);

  const handleTourSubmit = async (formData) => {
    try {
      const response = await fetch('/api/tour-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentInfo: formData,
          selectedDaycares: tourSelection.selectedDaycares
        })
      });

      const result = await response.json();

      if (result.success) {
        setSubmittedTourId(result.tourRequestId);
        setSubmittedDaycares([...tourSelection.selectedDaycares]);
        setShowTourModal(false);
        setShowSuccessModal(true);
        tourSelection.clearSelections();
      } else {
        throw new Error(result.message || 'Failed to submit tour request');
      }
    } catch (error) {
      console.error('Error submitting tour request:', error);
      throw error;
    }
  };

  return (
    <div className="home-container">
      {/* Hero Section */}
      <div className="hero-section" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="hero-overlay">
          <div className="hero-content">
            <h1 className="hero-title">Find Safe, Quality Childcare in Texas</h1>
            <p className="hero-subtitle">
              Search thousands of licensed daycares. Compare ratings, prices, and violations.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {!showDaycareDetails ? (
        <div className="data-view-container">
          <SortFilterWrapper
            totalItems={totalItems}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onFilterChange={handleFilterChange}
            onSearchChange={handleSearchChange}
            searchTerm={searchTerm}
          />

          <DaycareDataView
            data={daycares}
            loading={loading}
            onRowClick={handleRowClick}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            // Tour scheduling props
            onTourSelection={handleTourSelection}
            selectedForTour={tourSelection.selectedDaycares.map(d => d.operation_id)}
            canSelectMore={tourSelection.canAddMore}
          />
        </div>
      ) : (
        <DaycareDetails
          daycare={selectedDaycare}
          onBack={handleBackToList}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* Tour Scheduling Components */}
      <TourSelectionCart
        selectedDaycares={tourSelection.selectedDaycares}
        onRemove={tourSelection.removeDaycare}
        onScheduleTour={handleScheduleTour}
      />

      <TourRequestModal
        isOpen={showTourModal}
        onClose={() => setShowTourModal(false)}
        selectedDaycares={tourSelection.selectedDaycares}
        onSubmit={handleTourSubmit}
      />

      <TourSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        tourRequestId={submittedTourId}
        selectedDaycares={submittedDaycares}
      />
    </div>
  );
};

export default Home;
