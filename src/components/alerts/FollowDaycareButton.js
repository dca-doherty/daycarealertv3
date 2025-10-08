import React, { useState, useEffect } from 'react';
import { FaBell, FaBellSlash } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../utils/api';
import '../../styles/FollowDaycareButton.css';

const FollowDaycareButton = ({ daycareId, daycareName, onToggle, size = 'medium' }) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { showNotification } = useNotification();

  // Check initial following status
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        // Check if user is authenticated
        if (!isAuthenticated()) {
          // Fallback to localStorage if not authenticated
          const followedDaycares = JSON.parse(localStorage.getItem('followedDaycares') || '[]');
          setIsFollowing(followedDaycares.some(item =>
		item.id === daycareId ||
		item.operation_number === daycareId ||
		item.operation_id === daycareId ||
		item.operationNumber === daycareId
	  ));
          return;
        }

        try {
          // Try to get status from API
          const response = await api.get(`/favorites/check/${daycareId}`);
          
          if (response.data.success) {
            setIsFollowing(response.data.isFavorite);
          } else {
            // Fallback to localStorage
            const followedDaycares = JSON.parse(localStorage.getItem('followedDaycares') || '[]');
            setIsFollowing(followedDaycares.some(item =>
		item.id === daycareId ||
		item.operation_number === daycareId ||
		item.operation_id === daycareId ||
		item.operationNumber === daycareId
	    ));
          }
        } catch (apiError) {
          console.log('Could not check favorite status from API:', apiError);
          // Fallback to localStorage
          const followedDaycares = JSON.parse(localStorage.getItem('followedDaycares') || '[]');
          setIsFollowing(followedDaycares.some(item =>
		item.id === daycareId ||
		item.operation_number === daycareId ||
		item.operation_id === daycareId ||
		item.operationNumber === daycareId
	  ));
        }
      } catch (error) {
        console.error('Error checking favorite status:', error);
        // Fallback to localStorage
        const followedDaycares = JSON.parse(localStorage.getItem('followedDaycares') || '[]');
        setIsFollowing(followedDaycares.some(item =>
		item.id === daycareId ||
		item.operation_number === daycareId ||
		item.operation_id === daycareId ||
		item.operationNumber === daycareId
	));
      }
    };

    checkFavoriteStatus();
  }, [daycareId, isAuthenticated]);

  const toggleFollow = async () => {
    try {
      setIsLoading(true);
      const newIsFollowing = !isFollowing;
      
      // Check if user is authenticated
      if (isAuthenticated()) {
        try {
          // Use the API
          if (newIsFollowing) {
            // Add to favorites via API with all possible property names
            const response = await api.post('/favorites', {
              operationNumber: daycareId,
	      operation_number: daycareId,
	      operation_id: daycareId,
              daycareName: daycareName,
	      daycare_name: daycareName,
              name: daycareName
            });
            
            if (!response.data.success) {
              console.log('API returned error when adding favorite:', response.data.message);
              // Continue anyway - we'll still update localStorage
            }
          } else {
            // Remove from favorites via API
            const response = await api.delete(`/favorites/${daycareId}`);
            
            if (!response.data.success) {
              console.log('API returned error when removing favorite:', response.data.message);
              // Continue anyway - we'll still update localStorage
            }
          }
        } catch (apiError) {
          console.log('API error when updating favorites:', apiError);
          // Continue anyway - we'll still update localStorage
        }
      }
      
      // Also update localStorage as a backup/offline mechanism
      const followedDaycares = JSON.parse(localStorage.getItem('followedDaycares') || '[]');
      
      if (newIsFollowing) {
        // Add to followed daycares with ALL possible field names
        const updatedList = [
          ...followedDaycares,
          {
            id: daycareId,
            operation_number: daycareId,
	    operation_id: daycareId,
	    operationNumber: daycareId,
            name: daycareName,
            daycare_name: daycareName,
            operation_name: daycareName,
            OPERATION_NAME: daycareName,
            followedAt: new Date().toISOString(),
            created_at: new Date().toISOString(),
            alertTypes: ['violations', 'ratings', 'pricing']
          }
        ];
        localStorage.setItem('followedDaycares', JSON.stringify(updatedList));
      } else {
        // Remove from followed daycares - check all possible field names
        const updatedList = followedDaycares.filter(daycare =>
          daycare.id !== daycareId &&
	  daycare.operation_number !== daycareId &&
          daycare.operation_id !== daycareId &&
	  daycare.operationNumber !== daycareId
        );
        localStorage.setItem('followedDaycares', JSON.stringify(updatedList));
      }
      
      // Update state
      setIsFollowing(newIsFollowing);
      
      // Show notification
      showNotification({
        type: 'success',
        message: newIsFollowing 
          ? 'Daycare added to favorites' 
          : 'Daycare removed from favorites'
      });
      
      // Call the onToggle callback
      if (onToggle) {
        onToggle(daycareId, newIsFollowing);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showNotification({
        type: 'danger',
        message: 'Failed to update favorites. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      className={`follow-btn ${isFollowing ? 'following' : ''} ${size}`}
      onClick={toggleFollow}
      disabled={isLoading}
      title={isFollowing ? "Stop receiving alerts" : "Get alerts about changes"}
    >
      {isFollowing ? (
        <>
          <FaBell className="icon" /> {isLoading ? 'Updating...' : 'Following'}
        </>
      ) : (
        <>
          <FaBellSlash className="icon" /> {isLoading ? 'Updating...' : 'Follow'}
        </>
      )}
    </button>
  );
};

export default FollowDaycareButton;
