/**
 * DaycareAlert - Fix for duplicate reviews
 * 
 * This script provides a simple front-end patch that allows users to resubmit reviews
 * for a daycare they've already reviewed by automatically deleting the previous review.
 * 
 * To use: Add this script to your public folder and include it in index.html
 */

(function() {
  // Wait for page to fully load
  window.addEventListener('load', function() {
    console.log('Applying fix for duplicate reviews...');

    // Intercept fetch or XHR requests to detect 409 Conflict errors
    const originalFetch = window.fetch;
    window.fetch = async function(url, options) {
      try {
        // Call the original fetch
        const response = await originalFetch(url, options);
        
        // Check if this is a POST request to the reviews endpoint
        if (options && options.method === 'POST' && url.includes('/api/reviews')) {
          // If we got a 409 Conflict (duplicate review)
          if (response.status === 409) {
            console.log('Duplicate review detected. Attempting to fix...');
            
            // Parse the request body to get the operation number
            const requestData = JSON.parse(options.body);
            const operationNumber = requestData.operationNumber;
            
            if (!operationNumber) {
              console.error('Could not extract operation number from request');
              return response;
            }
            
            // Get the user's JWT token from localStorage
            const token = localStorage.getItem('token');
            if (!token) {
              console.error('No authentication token found');
              return response;
            }
            
            // 1. First, get the user's existing review for this daycare
            console.log('Finding existing review for operation:', operationNumber);
            const myReviewsResponse = await originalFetch('/api/reviews/my-reviews', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (!myReviewsResponse.ok) {
              console.error('Failed to fetch user reviews');
              return response;
            }
            
            const myReviewsData = await myReviewsResponse.json();
            
            // Find the review for this specific daycare
            const existingReview = myReviewsData.reviews.find(
              review => review.operation_number === operationNumber
            );
            
            if (!existingReview) {
              console.error('Could not find existing review for this daycare');
              return response;
            }
            
            // 2. Delete the existing review
            console.log('Deleting existing review ID:', existingReview.id);
            const deleteResponse = await originalFetch(`/api/reviews/${existingReview.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (!deleteResponse.ok) {
              console.error('Failed to delete existing review');
              return response;
            }
            
            console.log('Existing review deleted successfully');
            
            // 3. Resubmit the new review
            console.log('Resubmitting new review...');
            return originalFetch(url, options);
          }
        }
        
        return response;
      } catch (error) {
        console.error('Error in fetch interceptor:', error);
        throw error;
      }
    };
    
    // Also intercept XMLHttpRequest for compatibility (if your app uses axios or similar)
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
      this._method = method;
      this._url = url;
      return originalXHROpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function(body) {
      if (this._method === 'POST' && this._url.includes('/api/reviews')) {
        // Store the original request data
        this._requestBody = body;
        
        // Add a handler for 409 Conflict responses
        const originalOnReadyStateChange = this.onreadystatechange;
        this.onreadystatechange = async function() {
          if (this.readyState === 4 && this.status === 409) {
            console.log('Duplicate review detected in XHR. Attempting to fix...');
            
            try {
              // Parse the request body
              const requestData = JSON.parse(this._requestBody);
              const operationNumber = requestData.operationNumber;
              
              if (!operationNumber) {
                console.error('Could not extract operation number from XHR request');
                if (originalOnReadyStateChange) originalOnReadyStateChange.apply(this, arguments);
                return;
              }
              
              // Get the user's JWT token
              const token = localStorage.getItem('token');
              if (!token) {
                console.error('No authentication token found');
                if (originalOnReadyStateChange) originalOnReadyStateChange.apply(this, arguments);
                return;
              }
              
              // Create a new XHR to get the user's reviews
              const getReviewsXHR = new XMLHttpRequest();
              getReviewsXHR.open('GET', '/api/reviews/my-reviews', false); // Synchronous for simplicity
              getReviewsXHR.setRequestHeader('Authorization', `Bearer ${token}`);
              getReviewsXHR.send();
              
              if (getReviewsXHR.status !== 200) {
                console.error('Failed to fetch user reviews');
                if (originalOnReadyStateChange) originalOnReadyStateChange.apply(this, arguments);
                return;
              }
              
              const myReviewsData = JSON.parse(getReviewsXHR.responseText);
              
              // Find the review for this specific daycare
              const existingReview = myReviewsData.reviews.find(
                review => review.operation_number === operationNumber
              );
              
              if (!existingReview) {
                console.error('Could not find existing review for this daycare');
                if (originalOnReadyStateChange) originalOnReadyStateChange.apply(this, arguments);
                return;
              }
              
              // Delete the existing review
              const deleteXHR = new XMLHttpRequest();
              deleteXHR.open('DELETE', `/api/reviews/${existingReview.id}`, false); // Synchronous
              deleteXHR.setRequestHeader('Authorization', `Bearer ${token}`);
              deleteXHR.send();
              
              if (deleteXHR.status !== 200) {
                console.error('Failed to delete existing review');
                if (originalOnReadyStateChange) originalOnReadyStateChange.apply(this, arguments);
                return;
              }
              
              console.log('Existing review deleted successfully via XHR');
              
              // Resubmit the new review
              const resubmitXHR = new XMLHttpRequest();
              resubmitXHR.open(this._method, this._url, false); // Synchronous
              resubmitXHR.setRequestHeader('Content-Type', 'application/json');
              resubmitXHR.setRequestHeader('Authorization', `Bearer ${token}`);
              resubmitXHR.send(this._requestBody);
              
              // Copy the response from the resubmission to the original XHR
              this.status = resubmitXHR.status;
              this.statusText = resubmitXHR.statusText;
              this.response = resubmitXHR.response;
              this.responseText = resubmitXHR.responseText;
              this.responseURL = resubmitXHR.responseURL;
              
              console.log('Review resubmitted successfully via XHR');
            } catch (error) {
              console.error('Error in XHR fix:', error);
            }
          }
          
          if (originalOnReadyStateChange) originalOnReadyStateChange.apply(this, arguments);
        };
      }
      
      return originalXHRSend.apply(this, arguments);
    };
    
    console.log('Duplicate review fix applied successfully');
  });
})();