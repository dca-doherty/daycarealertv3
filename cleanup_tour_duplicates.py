#!/usr/bin/env python3
import re

# Read the file
with open('src/pages/OptimizedMySqlHome.js', 'r') as f:
    content = f.read()

print("Original file size:", len(content))

# First, let's remove ALL tour-related code and start fresh
# Remove duplicate tour state declarations (keep only the first one)
# Find all tour state declarations
tour_state_pattern = r'  // State for tour selection\s+const \[tourMode, setTourMode\] = useState\(false\);\s+const \[tourSelection, setTourSelection\] = useState\(\[\]\);\s+const \[showTourModal, setShowTourModal\] = useState\(false\);'

matches = list(re.finditer(tour_state_pattern, content))
print(f"Found {len(matches)} tour state declarations")

if len(matches) > 1:
    # Keep the first one, remove the rest
    print("Removing duplicate tour state declarations...")
    for match in reversed(matches[1:]):
        content = content[:match.start()] + content[match.end():]

# Now fix the handleDaycareSelect function
# Find the function and rebuild it properly
handle_select_start = content.find('const handleDaycareSelect = useCallback((daycare, fromComparison = false) => {')
if handle_select_start == -1:
    print("ERROR: Could not find handleDaycareSelect function!")
    exit(1)

# Find the end of the function (look for the closing }, [dependencies])
# We need to find the matching closing brace
brace_count = 0
i = handle_select_start
function_start = i
in_function = False

while i < len(content):
    if content[i] == '{':
        brace_count += 1
        in_function = True
    elif content[i] == '}':
        brace_count -= 1
        if in_function and brace_count == 0:
            # Found the closing brace of useCallback
            # Now find the dependency array
            dep_end = content.find(']);', i)
            if dep_end != -1:
                function_end = dep_end + 3
                break
    i += 1

print(f"Found handleDaycareSelect from {function_start} to {function_end}")

# Extract the current function
old_function = content[function_start:function_end]

# Build the corrected function
new_function = '''const handleDaycareSelect = useCallback((daycare, fromComparison = false) => {
    // If in compare mode and not coming from comparison modal, toggle selection
    if (compareMode && !fromComparison) {
      // Toggle daycare in comparison - if already added, remove it
      if (isInComparison(daycare)) {
        removeFromComparison(daycare);
      } else {
        addToComparison(daycare);
      }
      return;
    }
    
    // If in tour mode, toggle tour selection
    if (tourMode) {
      if (isInTourSelection(daycare)) {
        removeFromTourSelection(daycare);
      } else if (tourSelection.length < 5) {
        addToTourSelection(daycare);
      } else {
        alert('Maximum 5 daycares for tours');
      }
      return;
    }
    
    // Normal daycare detail view
    // Store current scroll position before showing details
    const scrollPosition = window.scrollY;
    
    console.log("Daycare selected from optimized MySQL data view:", {
      name: daycare.operation_name,
      id: daycare.operation_id,
      price: daycare.monthly_cost,
      estimated_price: daycare.estimated_price,
      fromComparison: fromComparison
    });
    
    // Initialize the global store if needed
    initializeGlobalStore();
    
    // Get the normalized violation data using our helper function
    const daycareId = daycare.operation_id || daycare.operation_number;
    const violationData = getDaycareViolationData(daycare);
    // Create a copy of the daycare to avoid modifying the original in the comparison list
    const daycareCopy = { ...daycare };
    // Normalize the rating data to ensure consistent format
    // This addresses the inconsistency between clicking row vs. View Details button
    if (daycareCopy.rating !== undefined) {
      console.log(`Normalizing rating data for daycare ${daycareId}:`, daycareCopy.rating);

      // If rating is a string that can be parsed as a number, convert it
      if (typeof daycareCopy.rating === 'string' && !isNaN(parseFloat(daycareCopy.rating))) {
         daycareCopy.rating = parseFloat(daycareCopy.rating);
         }

      // If rating is a number, convert it to the object format that DaycareDetails expects
      if (typeof daycareCopy.rating === 'number') {
        const scoreValue = daycareCopy.rating;
        console.log(`Converting numeric rating ${scoreValue} to object format`);

        // Create a standardized rating object with correct properties
        daycareCopy.rating = {
          score: scoreValue,
          // Generate class based on score
          class: scoreValue >= 4.5 ? 'excellent' :
                 scoreValue >= 3.5 ? 'good' :
                 scoreValue >= 2.5 ? 'average' :
                 scoreValue >= 1.5 ? 'poor' : 'poor',
          // Generate stars based on score
          stars: scoreValue >= 4.5 ? '★★★★★' :
                 scoreValue >= 3.5 ? '★★★★' :
                 scoreValue >= 2.5 ? '★★★' :
                 scoreValue >= 1.5 ? '★★' : '★'
         };
        }
        console.log(`Normalized rating data:`, daycareCopy.rating);
       }

       // Apply normalized violation data if available

    if (violationData) {
      console.log(`Using normalized violation data for daycare ${daycareId}`);
            
      // Copy the normalized data to the daycare object
      daycareCopy.high_risk_violations = violationData.high_risk_violations;
      daycareCopy.medium_high_risk_violations = violationData.medium_high_risk_violations;
      daycareCopy.medium_risk_violations = violationData.medium_risk_violations;
      daycareCopy.medium_low_risk_violations = violationData.medium_low_risk_violations;
      daycareCopy.low_risk_violations = violationData.low_risk_violations;
      daycareCopy.total_violations_2yr = violationData.total_violations_2yr;
    }
    // Set the selected daycare with all normalized data
    setSelectedDaycare(daycareCopy);

    setShowDaycareDetails(true);
    setActiveTab(initialTabView);
    
    // Scroll to top of page for better visibility
    window.scrollTo(0, 0);
    
    // Store the scroll position in a data attribute for restoration later
    document.body.setAttribute('data-previous-scroll', scrollPosition);
  }, [compareMode, initialTabView, isInComparison, addToComparison, removeFromComparison, tourMode, isInTourSelection, addToTourSelection, removeFromTourSelection, tourSelection.length]);'''

# Replace the old function with the new one
content = content[:function_start] + new_function + content[function_end:]

print("Cleaned up handleDaycareSelect function")

# Write the file back
with open('src/pages/OptimizedMySqlHome.js', 'w') as f:
    f.write(content)

print("✅ Duplicates removed and function fixed!")
print("Final file size:", len(content))
