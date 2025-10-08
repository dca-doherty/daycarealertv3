import ReactGA from 'react-ga4';

// Initialize GA with your measurement ID
export const initGA = () => {
  ReactGA.initialize('G-8RXHR2CPLD');
  console.log('Google Analytics initialized with ID: G-8RXHR2CPLD');
};

// Track page views
export const trackPageView = (path) => {
  ReactGA.send({ hitType: "pageview", page: path });
  console.log(`📊 Tracked page view: ${path}`);
};

// Track searches with enhanced SEO data
export const trackSearch = (searchTerm) => {
  // Skip tracking empty searches
  if (!searchTerm || !searchTerm.trim()) return;
  
  // Normalize the search term for consistent analytics
  const normalizedTerm = searchTerm.toLowerCase().trim();
  
  // Regular search tracking
  ReactGA.event({
    category: 'Search',
    action: 'Performed Search',
    label: normalizedTerm
  });
  
  // Special event for SEO team to analyze search terms
  ReactGA.event({
    category: 'SEO',
    action: 'Search Term',
    label: normalizedTerm
  });
  
  // Word count tracking for keyword analysis
  const wordCount = normalizedTerm.split(/\s+/).length;
  ReactGA.event({
    category: 'SEO',
    action: 'Search Word Count',
    label: `${wordCount} word${wordCount !== 1 ? 's' : ''}`,
    value: wordCount
  });
  
  console.log(`📊 Tracked search for SEO: ${normalizedTerm} (${wordCount} words)`);
};

// Track autocomplete selection
export const trackAutocompleteSelection = (searchTerm, selectedItem) => {
  ReactGA.event({
    category: 'Search',
    action: 'Selected Autocomplete',
    label: `${searchTerm} → ${selectedItem}`
  });
  console.log(`📊 Tracked autocomplete selection: ${selectedItem}`);
};

// Track daycare selection
export const trackDaycareSelection = (daycareId, daycareName) => {
  ReactGA.event({
    category: 'Daycare',
    action: 'Selected Daycare',
    label: daycareName,
    value: parseInt(daycareId, 10) || 0
  });
  console.log(`📊 Tracked daycare selection: ${daycareName} (ID: ${daycareId})`);
};

// Track filter usage
export const trackFilterUse = (filterName, filterValue) => {
  ReactGA.event({
    category: 'Filters',
    action: 'Applied Filter',
    label: `${filterName}: ${filterValue}`
  });
  console.log(`📊 Tracked filter use: ${filterName} = ${filterValue}`);
};

// Track cost estimation
export const trackCostEstimation = (city, ageGroup, estimatedCost) => {
  ReactGA.event({
    category: 'Cost Estimator',
    action: 'Calculated Estimate',
    label: `${city} - ${ageGroup}`,
    value: Math.round(estimatedCost) || 0
  });
  console.log(`📊 Tracked cost estimation: ${city}, ${ageGroup} = $${estimatedCost}`);
};

// Track tab changes
export const trackTabChange = (tabName) => {
  ReactGA.event({
    category: 'Navigation',
    action: 'Changed Tab',
    label: tabName
  });
  console.log(`📊 Tracked tab change: ${tabName}`);
};

// Track error events
export const trackError = (errorType, errorMessage) => {
  ReactGA.event({
    category: 'Error',
    action: errorType,
    label: errorMessage
  });
  console.log(`📊 Tracked error: ${errorType} - ${errorMessage}`);
};

// SEO-specific tracking functions
export const trackSeoKeyword = (keyword, source) => {
  ReactGA.event({
    category: 'SEO',
    action: 'Keyword Tracking',
    label: `${source}: ${keyword.toLowerCase().trim()}`
  });
  console.log(`📊 Tracked SEO keyword: ${keyword} (from ${source})`);
};

export const trackCityInterest = (city) => {
  ReactGA.event({
    category: 'SEO',
    action: 'City Interest',
    label: city.toUpperCase()
  });
  console.log(`📊 Tracked city interest: ${city}`);
};

export const trackSearchResultsImpression = (searchTerm, resultsCount) => {
  ReactGA.event({
    category: 'SEO',
    action: 'Search Results Impression',
    label: searchTerm.toLowerCase().trim(),
    value: resultsCount
  });
  console.log(`📊 Tracked search results: ${searchTerm} (${resultsCount} results)`);
};

// Generic event tracker for custom events
export const trackEvent = (category, action, label, value) => {
  ReactGA.event({
    category,
    action,
    label,
    value: value ? parseInt(value, 10) : undefined
  });
  console.log(`📊 Tracked event: ${category} > ${action} > ${label}${value ? ` (${value})` : ''}`);
};

export default {
  initGA,
  trackPageView,
  trackSearch,
  trackAutocompleteSelection,
  trackDaycareSelection,
  trackFilterUse,
  trackCostEstimation,
  trackTabChange,
  trackError,
  trackSeoKeyword,
  trackCityInterest,
  trackSearchResultsImpression,
  trackEvent
};