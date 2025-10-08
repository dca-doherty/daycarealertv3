// Direct fix for favorite notifications and synchronization in DaycareAlert
// React-safe implementation to avoid DOM conflicts
(function() {
  console.log('Installing enhanced favorite fix (notification + sync)...');
  
  // Wait for document to be fully loaded
  function onDocumentReady(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(fn, 1000);
    } else {
      document.addEventListener('DOMContentLoaded', () => setTimeout(fn, 1000));
    }
  }
  
  // Create container for notifications instead of adding them directly to body
  function createNotificationContainer() {
    // Check if container already exists
    let container = document.getElementById('custom-notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'custom-notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
      document.body.appendChild(container);
      
      // Add styles for animations
      if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
          @keyframes notificationSlideIn {
            from { transform: translateX(120%); }
            to { transform: translateX(0); }
          }
          @keyframes notificationSlideOut {
            from { transform: translateX(0); }
            to { transform: translateX(120%); }
          }
        `;
        document.head.appendChild(style);
      }
    }
    return container;
  }
  
  // Better method to get daycare name
  function getDaycareName(element) {
    // If element is directly passed
    if (typeof element === 'string') {
      return element;
    }
    
    // Try to find closest row
    const row = element?.closest?.('tr');
    if (!row) return 'Daycare';
    
    // Try different selectors to find the name
    const nameSelectors = [
      '.operation-name', 
      '.operation_name',
      'td:nth-child(2)',
      'td:not(.favorite-cell):first-child'
    ];
    
    for (const selector of nameSelectors) {
      const nameElem = row.querySelector(selector);
      if (nameElem && nameElem.textContent.trim()) {
        return nameElem.textContent.trim();
      }
    }
    
    // If we still don't have a name, try to find it in any cell
    const cells = row.querySelectorAll('td');
    for (const cell of cells) {
      if (cell.textContent.trim() && !cell.classList.contains('favorite-cell')) {
        return cell.textContent.trim();
      }
    }
    
    return 'Daycare';
  }
  
  // Function to show custom notifications - React safe
  function showNotification(type, message) {
    console.log(`Showing ${type} notification: ${message}`);
    
    // Get or create container
    const container = createNotificationContainer();
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `custom-notification notification-${type}`;
    notification.style.cssText = `
      background-color: ${type === 'success' ? '#28a745' : '#17a2b8'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      width: 320px;
      margin-bottom: 10px;
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      animation: notificationSlideIn 0.3s forwards;
    `;
    
    // Create notification content - make simpler structure with white text
    notification.innerHTML = `
      <div style="display: flex; align-items: center;">
        <span style="margin-right: 10px; font-size: 18px; color: white;">
          ${type === 'success' ? '✓' : 'ℹ️'}
        </span>
        <div style="font-size: 14px; color: white;">
          ${message}
        </div>
      </div>
      <button style="background: none; border: none; color: white; font-size: 20px; opacity: 0.7; cursor: pointer; margin-left: 10px;">&times;</button>
    `;
    
    // Add to container
    container.appendChild(notification);
    
    // Add close button functionality
    const closeButton = notification.querySelector('button');
    closeButton.addEventListener('click', function() {
      notification.style.animation = 'notificationSlideOut 0.3s forwards';
      setTimeout(function() {
        // Check if notification still exists and is in DOM
        if (notification.parentNode) {
          try {
            notification.parentNode.removeChild(notification);
          } catch(e) {
            console.log('Could not remove notification, may have been removed already');
          }
        }
      }, 300);
    });
    
    // Auto-dismiss after 5 seconds
    setTimeout(function() {
      // Check if notification still exists and is in DOM
      if (notification.parentNode) {
        notification.style.animation = 'notificationSlideOut 0.3s forwards';
        setTimeout(function() {
          // Check again before removing
          if (notification.parentNode) {
            try {
              notification.parentNode.removeChild(notification);
            } catch(e) {
              console.log('Could not remove notification, may have been removed already');
            }
          }
        }, 300);
      }
    }, 5000);
  }
  
  // Enhanced favorites synchronization fix
  function applyFavoritesSync() {
    console.log('[favorite-fix] Setting up favorites synchronization...');
    
    // Function to safely get an API client
    function getApiClient() {
      // Check various possible API clients
      return window.api || window.axios ||
             (window.$ && window.$.ajax ? {
               get: (url) => $.ajax({url, method: 'GET'}),
               post: (url, data) => $.ajax({url, method: 'POST', data}),
               delete: (url) => $.ajax({url, method: 'DELETE'})
             } : null);
    }

    // Function to update both server and localStorage with consistent data
    async function syncFavorites() {
      console.log('[favorite-fix] Synchronizing favorites...');
      
      try {
        // Only proceed if user is logged in
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('[favorite-fix] User not logged in, skipping sync');
          // Clear any existing favorites from localStorage to prevent confusion
	  if (localStorage.getItem('followedDaycares')) {
	    console.log('[favorite-fix] Clearing localStorage favorites for logged out user');
	    localStorage.removeItem('followedDaycares');
	  }

	  // Clear any global caches
	  window.favoritesCache = {};
	  window.favoriteIds = [];

          return;
        }
        // Create a proper URL for API calls
	const baseUrl = window.location.hostname === 'localhost' ? '' : 'https://api.daycarealert.com';

        // Safely get API client
        const apiClient = getApiClient();
        if (!apiClient) {
          console.log('[favorite-fix] No API client available, skipping sync');
          return;
        }
        
        // Use a try/catch for the API call
        try {
          // Get favorites from API using absolute URL to prevent issues
          const response = await apiClient.get(`${baseUrl}/api/mysql-optimized/favorites`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.data && response.data.success) {
            const serverFavorites = response.data.favorites || [];
            let localFavorites = [];
            
            try {
              localFavorites = JSON.parse(localStorage.getItem('followedDaycares') || '[]');
            } catch (error) {
              console.error('[favorite-fix] Error parsing local favorites:', error);
              localFavorites = [];
            }
            
            console.log('[favorite-fix] Server favorites:', serverFavorites.length);
            console.log('[favorite-fix] Local favorites:', localFavorites.length);
            
            // Track IDs for easy lookup
            const serverIds = new Set(serverFavorites.map(f => f.operation_number));
            const localIds = new Set(localFavorites.map(f => f.operation_number || f.id));
            
            // Find IDs that exist in localStorage but not on server
            const missingOnServer = localFavorites.filter(f => {
              const id = f.operation_number || f.id;
              return id && !serverIds.has(id);
            });
            
            // Find IDs that exist on server but not in localStorage
            const missingInLocal = serverFavorites.filter(f => 
              !localIds.has(f.operation_number)
            );
            
            console.log('[favorite-fix] Missing on server:', missingOnServer.length);
            console.log('[favorite-fix] Missing in localStorage:', missingInLocal.length);
            
            // Sync missing favorites to server
            for (const favorite of missingOnServer) {
              const opNumber = favorite.operation_number || favorite.id;
              if (!opNumber) continue;
              
              try {
                console.log('[favorite-fix] Adding missing favorite to server:', opNumber);
                await apiClient.post(`${baseUrl}/api/mysql-optimized/favorites`, {
                  operation_number: opNumber,
                  operationNumber: opNumber,
                  operation_id: opNumber,
                  daycare_name: favorite.name || favorite.daycare_name || favorite.operation_name || 'Daycare'
		}, {
		  headers: {
		     'Authorization': `Bearer ${token}`
		}
                });
              } catch (error) {
                // Ignore 409 errors (already exists)
                if (!error.response || error.response.status !== 409) {
                  console.error('[favorite-fix] Error adding favorite to server:', error);
                }
              }
            }
            
            // Sync missing favorites to localStorage
            if (missingInLocal.length > 0) {
              const updatedLocalFavorites = [
                ...localFavorites,
                ...missingInLocal.map(f => ({
                  id: f.operation_number,
                  operation_number: f.operation_number,
                  name: f.daycare_name || f.name || `Daycare #${f.operation_number}`,
                  daycare_name: f.daycare_name || f.name || `Daycare #${f.operation_number}`,
                  operation_name: f.daycare_name || f.name || `Daycare #${f.operation_number}`,
                  OPERATION_NAME: f.daycare_name || f.name || `Daycare #${f.operation_number}`,
                  followedAt: f.created_at || new Date().toISOString(),
                  created_at: f.created_at || new Date().toISOString(),
                  alertTypes: ['violations', 'ratings', 'pricing']
                }))
              ];
              
              localStorage.setItem('followedDaycares', JSON.stringify(updatedLocalFavorites));
              console.log('[favorite-fix] Updated localStorage with missing favorites');
              
              // If on profile or alerts page, reload the page to show updated favorites
              const currentPath = window.location.pathname;
              if (currentPath === '/profile' || currentPath === '/alerts') {
                console.log('[favorite-fix] On profile/alerts page, refreshing page to show updated favorites');
                window.location.reload();
              }
            }
            // Update global caches
	    if (serverFavorites.length > 0) {
	      window.favoritesCache = {};
	      window.favoriteIds = [];

	      serverFavorites.forEach(favorite => {
		const opNum = favorite.operation_number;
		if (opNum) {
		  window.favoritesCache[opNum] = true;
		  window.favoriteIds.push(opNum);
		}
	     });
	   }
            console.log('[favorite-fix] Favorites synchronization complete');
          }
        } catch (apiError) {
          // If 401 (Unauthorized) or 403 (Forbidden), user token might be invalid
	  if (apiError.response && (apiError.response.status === 401 || apiError.response.status === 403)) {
	    console.log('[favorite-fix] Authentication failed, token may be invalid');
	    // Don't remove token automatically, as that would log the user out
	  }
	  console.error('[favorite-fix] API error:', apiError);
          // Continue with other sync logic using localStorage only
        }
      } catch (error) {
        console.error('[favorite-fix] Error in syncFavorites:', error);
      }
    }
    
    // Perform initial sync after a delay to ensure app is loaded
    setTimeout(syncFavorites, 3000);
    
    // Set up periodic sync every 30 seconds
    setInterval(syncFavorites, 30000);
    
    // Make the sync function available globally so components can trigger it directly
    window.syncFavorites = syncFavorites;
    
    console.log('[favorite-fix] Favorites synchronization set up');
  }
  
  // Intercept clicks on favorites to ensure they have correct data
  function interceptFavoriteClicks() {
    document.addEventListener('click', function(event) {
      // Find favorite toggle element (or any parent)
      const toggle = event.target.closest('.favorite-toggle, .favorite-icon, .follow-btn');
      if (!toggle) return;
      
      console.log('[favorite-fix] Intercepted click on favorite element:', toggle);
      
      // Don't prevent default or stop propagation - let the React handlers work
      
      // Extract operation ID from any data attributes available
      const operationId = toggle.dataset.operationId || 
                        toggle.dataset.daycareid || 
                        toggle.getAttribute('data-operation-id') ||
                        toggle.getAttribute('data-daycare-id');
      
      if (!operationId) {
        console.log('[favorite-fix] Could not find operation ID in clicked element');
        return;
      }
      
      // Get daycare name from element or nearby elements
      const daycareName = getDaycareName(toggle);
      
      // Show notification
      const isFavorite = toggle.classList.contains('favorited') || 
                         toggle.classList.contains('following') ||
                         toggle.querySelector('.favorited');
      
      // If isFavorite is now true, it means we just added it
      // If isFavorite is now false, it means we just removed it
      const action = isFavorite ? 'removed from' : 'added to';
      
      showNotification(
        !isFavorite ? 'success' : 'info',
        `<strong>${daycareName}</strong> ${action} favorites`
      );
      
      // Schedule a favorites sync to ensure everything is updated
      setTimeout(() => {
        if (window.syncFavorites) {
          window.syncFavorites();
        }
      }, 1000);
    }, true);
  }
  
  // Initialize all fixes when document is ready
  onDocumentReady(function() {
    console.log('Document ready, initializing favorite fixes');
    
    // Apply the favorites synchronization fix
    applyFavoritesSync();
    
    // Apply click interception for notifications
    interceptFavoriteClicks();
    
    // Make available globally for testing
    window.showCustomNotification = showNotification;
    
    //test notification removed
  });
  
  console.log('Enhanced favorites fix (notification + sync) installed');
})();
