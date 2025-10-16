import React from 'react';
import './TourSuccessModal.css';

const TourSuccessModal = ({ isOpen, onClose, tourRequestId, selectedDaycares }) => {
  const handleDownloadProfiles = () => {
    window.open(`/api/tour-requests/${tourRequestId}/profiles-pdf`, '_blank');
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="success-modal-overlay" onClick={onClose}>
      <div className="success-modal" onClick={(e) => e.stopPropagation()}>
        <div className="success-icon">
          <div className="checkmark-circle">
            <svg className="checkmark" viewBox="0 0 52 52">
              <circle className="checkmark-circle-bg" cx="26" cy="26" r="25" fill="none"/>
              <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
          </div>
        </div>
        
        <h2>Tour Requests Sent Successfully!</h2>
        
        <p className="success-message">
          Your tour requests have been sent to <strong>{selectedDaycares.length} daycare{selectedDaycares.length > 1 ? 's' : ''}</strong>.
        </p>
        
        <div className="what-next">
          <h3>What happens next?</h3>
          <ol>
            <li>The daycares will review your request within 24-48 hours</li>
            <li>They'll contact you directly via email or phone</li>
            <li>You'll receive confirmation with tour details</li>
          </ol>
        </div>
        
        <div className="daycares-contacted">
          <h4>Daycares Contacted:</h4>
          <ul>
            {selectedDaycares.map(daycare => (
              <li key={daycare.operation_id}>
                <span className="checkmark">✓</span>
                {daycare.operation_name}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="success-actions">
          <button onClick={handleDownloadProfiles} className="download-btn">
            📄 Download Daycare Profiles
          </button>
          <button onClick={onClose} className="close-success-btn">
            Continue Browsing
          </button>
        </div>
        
        <p className="request-id">
          Request ID: #{tourRequestId}
        </p>
      </div>
    </div>
  );
};

export default TourSuccessModal;
