import React, { useState } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

// Default map container style
const containerStyle = {
  width: '100%',
  height: '450px',
  borderRadius: '8px',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
};

// We're using the daycare's coordinates as the center, so no default center is needed

// API key (using the one you provided earlier)
const GOOGLE_MAPS_API_KEY = "AIzaSyBlvnYQxnhgMcYQOkdkV9KEu1nkRIubPlQ";

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Convert all coordinates to numbers to ensure correct calculations
  lat1 = parseFloat(lat1);
  lon1 = parseFloat(lon1);
  lat2 = parseFloat(lat2);
  lon2 = parseFloat(lon2);
  
  // Check if all coordinates are valid numbers
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    console.error("Invalid coordinates for distance calculation:", { lat1, lon1, lat2, lon2 });
    return 0;
  }
  
  // Earth's radius in miles
  const R = 3958.8;
  
  // Convert latitude and longitude from degrees to radians
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  // Convert coordinates to radians
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  // Apply Haversine formula
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
};

const DaycareMap = ({ daycare, userLocation }) => {
  const [selectedMarker, setSelectedMarker] = useState(null);
  
  // Exit early if no daycare data
  if (!daycare) {
    return <div className="text-center p-3">No daycare data available</div>;
  }
  
  // Debug log to see the full daycare data structure
  console.log("DaycareMap - Full daycare object:", daycare);
  console.log("DaycareMap - Coordinate fields:", {
    latitude: daycare.latitude,
    longitude: daycare.longitude,
    LATITUDE: daycare.LATITUDE,
    LONGITUDE: daycare.LONGITUDE,
    lat: daycare.lat,
    lng: daycare.lng,
    LAT: daycare.LAT,
    LNG: daycare.LNG
  });
  
  // Extract daycare coordinates - check all possible coordinate field names
  // The backend database may have different field names for the coordinates
  const daycareLocation = {
    lat: parseFloat(
      daycare.latitude || 
      daycare.LATITUDE || 
      daycare.lat || 
      daycare.LAT || 
      0
    ),
    lng: parseFloat(
      daycare.longitude || 
      daycare.LONGITUDE || 
      daycare.lng || 
      daycare.LNG || 
      0
    )
  };
  
  console.log("DaycareMap - Parsed location:", daycareLocation);
  
  // Check if valid coordinates exist
  const hasValidCoordinates = daycareLocation.lat && daycareLocation.lng && 
    !isNaN(daycareLocation.lat) && !isNaN(daycareLocation.lng) &&
    daycareLocation.lat !== 0 && daycareLocation.lng !== 0;
  
  // Find the best address field to use
  const getAddress = () => {
    return daycare.ADDRESS || 
           daycare.address || 
           daycare.location_address || 
           daycare.facility_address || 
           (daycare.street_number && daycare.street_name ? `${daycare.street_number} ${daycare.street_name}` : null);
  };
  
  const address = getAddress();
  
  // If coordinates are missing, try to get them from the address
  if (!hasValidCoordinates && address) {
    // Show a message that we're working with an address
    return (
      <div className="map-fallback">
        <div className="alert alert-info mt-3">
          <h5>Using Address for Location</h5>
          <p>Exact coordinates aren't available, but you can view this location at:</p>
          <p className="fw-bold">{address}, {daycare.city || ""}, {daycare.state || "TX"} {daycare.zip_code || ""}</p>
          
          <div className="mt-3">
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${daycare.operation_name}, ${address}, ${daycare.city || ""}, ${daycare.state || "TX"} ${daycare.zip_code || ""}`
              )}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Open in Google Maps
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  // If no valid coordinates, try using the address to create a more accurate Google Maps link
  if (!hasValidCoordinates) {
    // Get detailed address information from various fields
    const addressLine = daycare.address || daycare.ADDRESS || daycare.ADDRESS_LINE || daycare.location_address || '';
    const city = daycare.city || daycare.CITY || '';
    const state = daycare.state || daycare.STATE || 'TX';
    const zipCode = daycare.zip_code || daycare.ZIP || '';
    const county = daycare.county || daycare.COUNTY || '';
    
    // Build a complete formatted address
    const formattedAddress = [
      addressLine.trim(),
      city.trim(),
      state.trim(),
      zipCode.trim()
    ].filter(part => part && part.length > 0).join(', ');
    
    // Build the query for Google Maps
    const locationQuery = daycare.operation_name ? 
      `${daycare.operation_name}, ${formattedAddress}` : 
      formattedAddress;
    
    return (
      <div className="alert alert-info mt-3">
        <h5><i className="fas fa-map-marker-alt me-2"></i> Daycare Location</h5>
        
        {addressLine ? (
          <div className="mb-3">
            <p className="mb-1"><strong>Address:</strong></p>
            <p className="mb-0">{addressLine}</p>
            <p className="mb-2">{city}, {state} {zipCode}</p>
            
            {county && <p className="text-muted small mb-0">County: {county}</p>}
          </div>
        ) : (
          <p className="mb-3">This daycare is located in <strong>{city}, {state}</strong>
            {zipCode ? ` (${zipCode})` : ''}.
          </p>
        )}
        
        <div className="d-grid gap-2 mt-4">
          <a 
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            <i className="fas fa-location-arrow me-2"></i>
            Open in Google Maps
          </a>
          
          {daycare.phone_number && (
            <a 
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locationQuery)}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-outline-primary mt-2"
            >
              <i className="fas fa-directions me-2"></i>
              Get Directions
            </a>
          )}
        </div>
      </div>
    );
  }
  
  // If we have valid coordinates, show the map
  const mapCenter = daycareLocation;
  
  // Handle marker click
  const handleMarkerClick = (marker) => {
    setSelectedMarker(marker);
  };
  
  // Close info window
  const handleInfoWindowClose = () => {
    setSelectedMarker(null);
  };
  
  // Create markers array
  const markers = [
    {
      id: 'daycare',
      position: daycareLocation,
      title: daycare.operation_name,
      icon: {
        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        scaledSize: { width: 32, height: 32 }
      },
      address: daycare.ADDRESS || daycare.address,
      type: daycare.operation_type,
      phone: daycare.PHONE || daycare.phone
    }
  ];
  
  // Add user's location marker if available
  if (userLocation && userLocation.lat && userLocation.lng) {
    markers.push({
      id: 'user',
      position: {
        lat: userLocation.lat,
        lng: userLocation.lng
      },
      title: 'Your Location',
      icon: {
        url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
        scaledSize: { width: 32, height: 32 }
      }
    });
  }
  
  // Create either an embedded iframe Google Map or a React Google Map component
  // Using an iframe as a fallback because it's more reliable in some environments
  const useIframeMap = true; // Set to true to use iframe instead of React Google Maps

  if (useIframeMap) {
    // Create a Google Maps embed URL
    const mapEmbedUrl = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}` +
      `&q=${daycareLocation.lat},${daycareLocation.lng}` +
      `&zoom=14`;
    
    // If we also have user location, create a directions URL
    const directionsUrl = userLocation ? 
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${userLocation.lat},${userLocation.lng}` +
      `&destination=${daycareLocation.lat},${daycareLocation.lng}` : null;
    
    return (
      <div className="daycare-map-container mt-3">
        <div style={{ position: 'relative', width: '100%', height: '450px', borderRadius: '8px', overflow: 'hidden' }}>
          <iframe
            title="Daycare Location Map"
            width="100%"
            height="450"
            style={{ border: 0, borderRadius: '8px' }}
            loading="lazy"
            allowFullScreen
            src={mapEmbedUrl}
          ></iframe>
        </div>
        
        {/* Distance information if user location is available */}
        {userLocation && daycare && daycare.latitude && daycare.longitude && (
          <div className="alert alert-info mt-3">
            <strong>Distance Information:</strong> The straight-line distance between your location and this daycare is approximately 
            {' '}
            {calculateDistance(
              userLocation.lat,
              userLocation.lng,
              parseFloat(daycare.latitude),
              parseFloat(daycare.longitude)
            ).toFixed(1)}{' '}
            miles. 
            
            {directionsUrl && (
              <a 
                href={directionsUrl}
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline-primary ms-2"
              >
                Get Directions
              </a>
            )}
          </div>
        )}
        
        {/* Address information */}
        <div className="card mt-3">
          <div className="card-body">
            <h5 className="card-title"><i className="fas fa-map-marker-alt me-2"></i> Daycare Address</h5>
            <p className="card-text mb-1">
              {daycare.address || daycare.ADDRESS || daycare.ADDRESS_LINE || daycare.location_address}
            </p>
            <p className="card-text">
              {daycare.city || daycare.CITY}, {daycare.state || daycare.STATE || 'TX'} {daycare.zip_code || daycare.ZIP}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Original React Google Maps implementation (not used if useIframeMap is true)
  return (
    <div className="daycare-map-container mt-3">
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={14}
        >
          {markers.map(marker => (
            <Marker
              key={marker.id}
              position={marker.position}
              title={marker.title}
              icon={marker.icon}
              onClick={() => handleMarkerClick(marker)}
            />
          ))}
          
          {selectedMarker && (
            <InfoWindow
              position={selectedMarker.position}
              onCloseClick={handleInfoWindowClose}
            >
              <div className="info-window">
                <h5>{selectedMarker.title}</h5>
                {selectedMarker.id === 'daycare' && (
                  <>
                    <p>{selectedMarker.type}</p>
                    {selectedMarker.address && <p>{selectedMarker.address}</p>}
                    {selectedMarker.phone && <p>Phone: {selectedMarker.phone}</p>}
                  </>
                )}
                {selectedMarker.id === 'user' && (
                  <p>Your current location</p>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>
      
      {/* Instructions and legend */}
      <div className="map-legend mt-3">
        <div className="d-flex align-items-center mb-2">
          <div style={{ 
            width: 20, 
            height: 20, 
            backgroundColor: '#4285F4', 
            borderRadius: '50%', 
            marginRight: 8 
          }}></div>
          <span>Daycare Location</span>
        </div>
        {userLocation && userLocation.lat && userLocation.lng && (
          <div className="d-flex align-items-center">
            <div style={{ 
              width: 20, 
              height: 20, 
              backgroundColor: '#34A853', 
              borderRadius: '50%', 
              marginRight: 8 
            }}></div>
            <span>Your Location</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DaycareMap;