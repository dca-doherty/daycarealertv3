import React, { useState, useEffect } from 'react';
import './TourSelectionCart.css';

const TourSelectionCart = ({ 
  selectedDaycares = [], 
  onRemove, 
  onScheduleTour 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    // Auto-open when first daycare is added
    if (selectedDaycares.length === 1) {
      setIsOpen(true);
    }
  }, [selectedDaycares.length]);
  
  if (selectedDaycares.length === 0 && !isOpen) {
    return null;
  }
  
  return (
    <div className={`tour-cart ${isOpen ? 'open' : 'closed'}`}>
      <div className="tour-cart-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="tour-cart-title">
          <span className="icon">🏫</span>
          <span>Tour Requests ({selectedDaycares.length}/5)</span>
        </div>
        <button className="toggle-btn">
          {isOpen ? '−' : '+'}
        </button>
      </div>
      
      {isOpen && (
        <div className="tour-cart-content">
          {selectedDaycares.length === 0 ? (
            <p className="empty-message">
              Select up to 5 daycares to schedule tours
            </p>
          ) : (
            <>
              <div className="selected-daycares">
                {selectedDaycares.map((daycare) => (
                  <div key={daycare.operation_id} className="cart-daycare-item">
                    <div className="daycare-info">
                      <div className="daycare-name">{daycare.operation_name}</div>
                      <div className="daycare-city">{daycare.city}</div>
                    </div>
                    <button 
                      className="remove-btn"
                      onClick={() => onRemove(daycare.operation_id)}
                      title="Remove from tour list"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              
              <button 
                className="schedule-tour-btn"
                onClick={onScheduleTour}
                disabled={selectedDaycares.length === 0}
              >
                Schedule {selectedDaycares.length} Tour{selectedDaycares.length !== 1 ? 's' : ''}
              </button>
              
              {selectedDaycares.length >= 5 && (
                <p className="limit-message">
                  Maximum 5 daycares selected
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TourSelectionCart;
