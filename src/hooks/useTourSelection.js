import { useState, useCallback } from 'react';

const MAX_SELECTIONS = 5;

export const useTourSelection = () => {
  const [selectedDaycares, setSelectedDaycares] = useState([]);
  
  const addDaycare = useCallback((daycare) => {
    console.log("addDaycare called with:", daycare);
    setSelectedDaycares(prev => {
      // Check if already selected
      if (prev.some(d => d.operation_id === daycare.operation_id)) {
        return prev;
      }
      
      // Check max limit
      if (prev.length >= MAX_SELECTIONS) {
        alert(`Maximum ${MAX_SELECTIONS} daycares can be selected for tours`);
        return prev;
      }
      
      return [...prev, daycare];
    });
  }, []);
  
  const removeDaycare = useCallback((operationId) => {
    setSelectedDaycares(prev => 
      prev.filter(d => d.operation_id !== operationId)
    );
  }, []);
  
  const clearSelection = useCallback(() => {
    setSelectedDaycares([]);
  }, []);
  
  const isSelected = useCallback((operationId) => {
    return selectedDaycares.some(d => d.operation_id === operationId);
  }, [selectedDaycares]);
  
  const canAddMore = selectedDaycares.length < MAX_SELECTIONS;
  
  return {
    selectedDaycares,
    addDaycare,
    removeDaycare,
    clearSelection,
    isSelected,
    canAddMore,
    selectionCount: selectedDaycares.length,
    maxSelections: MAX_SELECTIONS
  };
};
