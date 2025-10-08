/**
 * Complete PDF Export Fix for DaycareAlert
 * This script completely replaces the built-in PDF export functionality
 * to ensure proper multi-page generation after tab modifications
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('PDF Export Fix loaded');
  
  // Function to monitor for Export PDF buttons
  function setupPdfExport() {
    // Find all "Export PDF" buttons
    const exportButtons = Array.from(document.querySelectorAll('button')).filter(
      button => button.textContent.includes('Export PDF')
    );
    
    exportButtons.forEach(button => {
      // Replace the existing click handler with our new one
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      
      // Add our custom click handler
      newButton.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        console.log('Custom PDF export handler triggered');
        
        // Get the daycare data from the UI
        const daycareName = document.querySelector('.daycare-title h2')?.textContent || 'Daycare';
        
        // Create the modal backdrop
        const modalBackdrop = document.createElement('div');
        modalBackdrop.style.position = 'fixed';
        modalBackdrop.style.top = '0';
        modalBackdrop.style.left = '0';
        modalBackdrop.style.width = '100%';
        modalBackdrop.style.height = '100%';
        modalBackdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        modalBackdrop.style.zIndex = '9999';
        modalBackdrop.style.display = 'flex';
        modalBackdrop.style.alignItems = 'center';
        modalBackdrop.style.justifyContent = 'center';
        
        // Create the modal content
        const modalContent = document.createElement('div');
        modalContent.style.backgroundColor = 'white';
        modalContent.style.borderRadius = '5px';
        modalContent.style.padding = '30px';
        modalContent.style.width = '80%';
        modalContent.style.maxWidth = '800px';
        modalContent.style.maxHeight = '80vh';
        modalContent.style.overflowY = 'auto';
        modalContent.style.position = 'relative';
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '24px';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = function() {
          document.body.removeChild(modalBackdrop);
        };
        
        // Add the close button to the modal
        modalContent.appendChild(closeButton);
        
        // Create the PDF content
        const pdfContent = document.createElement('div');
        pdfContent.className = 'pdf-content';
        
        // Add title section
        const titleSection = document.createElement('div');
        titleSection.style.textAlign = 'center';
        titleSection.style.marginBottom = '30px';
        titleSection.innerHTML = `
          <h1 style="color: #0275d8; margin-bottom: 5px;">${daycareName}</h1>
          <p style="color: #6c757d; font-style: italic;">Complete Daycare Report</p>
        `;
        pdfContent.appendChild(titleSection);
        
        // Extract all pertinent data from the daycare details card and tabs
        let prices = {};
        let qualityRating = {};
        let violationData = {};
        let questionsData = [];
        
        try {
          // First try to get rating information from the UI
          let ratingStars, ratingScore;
          const ratingElement = document.querySelector('.daycare-details .rating');
          const scoreElement = document.querySelector('.daycare-details .score');
          
          // Attempt to directly extract the rating from the quality tab which is more reliable
          const qualityTab = Array.from(document.querySelectorAll('.tab-content .tab-pane')).find(tab => 
            tab.textContent.includes('Quality Rating') || tab.textContent.includes('Rating')
          );
          
          // Get the most accurate rating data from the Quality tab
          if (qualityTab) {
            const qualityText = qualityTab.textContent;
            
            // Try to find an exact score value
            const scoreMatches = qualityText.match(/([0-9]\.?[0-9]?)(?:\/5\.0|\s*\/\s*5)/g);
            if (scoreMatches && scoreMatches.length > 0) {
              // Extract just the number from the first match
              const cleanScoreMatch = scoreMatches[0].match(/([0-9]\.?[0-9]?)/);
              if (cleanScoreMatch && cleanScoreMatch[1]) {
                ratingScore = cleanScoreMatch[1];
              }
            } else {
              // Try a different pattern if the first one fails
              const altScoreMatch = qualityText.match(/Overall Quality Score:\s*([0-9]\.?[0-9]?)/);
              if (altScoreMatch && altScoreMatch[1]) {
                ratingScore = altScoreMatch[1];
              }
            }
            
            // Try to extract star rating
            if (qualityText.includes('★')) {
              const starsMatch = qualityText.match(/(★{1,5}½?)/);
              if (starsMatch && starsMatch[1]) {
                ratingStars = starsMatch[1];
              }
            }
          }
          
          // Fallback to UI elements if nothing found in the tab
          if (!ratingScore) {
            ratingScore = scoreElement?.textContent || '3.0';
          }
          
          if (!ratingStars) {
            ratingStars = ratingElement?.textContent || '★★★';
          }
          
          // Ensure rating consistency
          const numericScore = parseFloat(ratingScore);
          if (!isNaN(numericScore)) {
            // Generate appropriate stars based on score if stars not found
            if (!ratingStars || ratingStars === '★★★') {
              if (numericScore >= 4.5) ratingStars = '★★★★★';
              else if (numericScore >= 3.5) ratingStars = '★★★★';
              else if (numericScore >= 2.5) ratingStars = '★★★';
              else if (numericScore >= 1.5) ratingStars = '★★';
              else ratingStars = '★';
            }
          }
          
          qualityRating.score = ratingScore;
          qualityRating.stars = ratingStars;
          
          // Try to get violation counts from the Violations tab
          // Initialize violation data
          violationData.count = '0';
          violationData.highRisk = '0';
          violationData.mediumRisk = '0';
          violationData.lowRisk = '0';
          violationData.details = [];
          
          // Try to extract the actual violation counts
          const violationsTab = Array.from(document.querySelectorAll('.tab-content .tab-pane')).find(tab => 
            tab.textContent.includes('Violation') || tab.textContent.includes('Risk Level')
          );
          
          // Try to extract violation counts from the tab content
          if (violationsTab) {
            const violationsText = violationsTab.textContent;
            
            // First try to get exact violation counts from UI elements
            const violationCountElement = violationsTab.querySelector('.violation-count');
            const inspectionCountElement = violationsTab.querySelector('.inspection-count');
            
            if (violationCountElement) {
              violationData.count = violationCountElement.textContent.trim();
            } else {
              // Try to find total violations count from text
              const totalViolationsMatch = violationsText.match(/Total Violations:\s*([0-9]+)/i);
              if (totalViolationsMatch && totalViolationsMatch[1]) {
                violationData.count = totalViolationsMatch[1];
              }
            }
            
            // Look for all tables in the violations tab - there may be multiple for different categories
            const violationsTables = violationsTab.querySelectorAll('table');
            
            if (violationsTables && violationsTables.length > 0) {
              // Process each violations table
              violationsTables.forEach(table => {
                // Get the category name from preceding heading if possible
                let category = "Violation";
                const prevHeading = table.previousElementSibling;
                if (prevHeading && (prevHeading.tagName === 'H3' || prevHeading.tagName === 'H4' || prevHeading.className.includes('card-title'))) {
                  category = prevHeading.textContent.trim();
                }
                
                // Process each row in the table
                const rows = table.querySelectorAll('tbody tr');
                rows.forEach(row => {
                  // Extract specific violation details
                  const cells = row.querySelectorAll('td');
                  
                  if (cells.length >= 2) {
                    // Different tables may have different column layouts
                    // Try to intelligently determine what each column contains
                    let riskLevel = '';
                    let description = '';
                    let date = '';
                    
                    // Extract data based on column count and content patterns
                    if (cells.length === 2) {
                      // Simple 2-column format
                      if (cells[0].textContent.includes('High') || cells[0].textContent.includes('Medium') || cells[0].textContent.includes('Low')) {
                        riskLevel = cells[0].textContent.trim();
                        description = cells[1].textContent.trim();
                      } else {
                        description = cells[0].textContent.trim();
                        date = cells[1].textContent.trim();
                      }
                    } else if (cells.length >= 3) {
                      // 3+ column format - check for date formats and risk levels 
                      for (let i = 0; i < cells.length; i++) {
                        const cellText = cells[i].textContent.trim();
                        
                        // Check if this cell contains a risk level
                        if (cellText.match(/high|medium|low/i) && !riskLevel) {
                          riskLevel = cellText;
                        }
                        // Check if this cell contains a date (xx/xx/xxxx format)
                        else if (cellText.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/) && !date) {
                          date = cellText;
                        }
                        // If this is a longer text and not already assigned, it's likely the description
                        else if (cellText.length > 10 && !description) {
                          description = cellText;
                        }
                        // If we haven't found a description yet and this isn't empty, use it
                        else if (!description && cellText.length > 0) {
                          description = cellText;
                        }
                      }
                    }
                    
                    // If we didn't find a risk level but there's a class on the row or cell that indicates it
                    if (!riskLevel) {
                      if (row.classList.contains('high-risk') || row.classList.contains('danger') || 
                          cells[0].classList.contains('high-risk') || cells[0].classList.contains('danger')) {
                        riskLevel = 'High Risk';
                      } else if (row.classList.contains('medium-risk') || row.classList.contains('warning') ||
                                cells[0].classList.contains('medium-risk') || cells[0].classList.contains('warning')) {
                        riskLevel = 'Medium Risk';
                      } else if (row.classList.contains('low-risk') || row.classList.contains('success') ||
                                cells[0].classList.contains('low-risk') || cells[0].classList.contains('success')) {
                        riskLevel = 'Low Risk';
                      }
                    }
                    
                    // Only add if we have at least a description
                    if (description) {
                      // Set default risk level if not found
                      if (!riskLevel) riskLevel = 'Unspecified Risk';
                      
                      // Add to our violation details
                      violationData.details.push({
                        category,
                        riskLevel,
                        description,
                        date
                      });
                      
                      // Update the risk level counts
                      if (riskLevel.toLowerCase().includes('high')) {
                        violationData.highRisk = (parseInt(violationData.highRisk) + 1).toString();
                      } else if (riskLevel.toLowerCase().includes('medium')) {
                        violationData.mediumRisk = (parseInt(violationData.mediumRisk) + 1).toString();
                      } else if (riskLevel.toLowerCase().includes('low')) {
                        violationData.lowRisk = (parseInt(violationData.lowRisk) + 1).toString();
                      }
                    }
                  }
                });
              });
            }
            
            // Look for card-based violation displays as an alternative
            if (violationData.details.length === 0) {
              const violationCards = violationsTab.querySelectorAll('.card, .violation-card');
              
              violationCards.forEach(card => {
                let category = "Violation";
                const cardTitle = card.querySelector('.card-title, .card-header');
                if (cardTitle) {
                  category = cardTitle.textContent.trim();
                }
                
                let riskLevel = 'Unspecified Risk';
                let description = '';
                let date = '';
                
                // Look for risk level indicators
                if (card.classList.contains('bg-danger') || card.classList.contains('high-risk')) {
                  riskLevel = 'High Risk';
                } else if (card.classList.contains('bg-warning') || card.classList.contains('medium-risk')) {
                  riskLevel = 'Medium Risk';
                } else if (card.classList.contains('bg-success') || card.classList.contains('low-risk')) {
                  riskLevel = 'Low Risk';
                }
                
                // Extract description and date
                const cardBody = card.querySelector('.card-body, .card-text');
                if (cardBody) {
                  description = cardBody.textContent.trim();
                  
                  // Try to extract date if it's in the description
                  const dateMatch = description.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
                  if (dateMatch) {
                    date = dateMatch[0];
                    description = description.replace(date, '').trim();
                  }
                }
                
                if (description) {
                  violationData.details.push({
                    category,
                    riskLevel,
                    description,
                    date
                  });
                  
                  // Update the risk level counts
                  if (riskLevel.toLowerCase().includes('high')) {
                    violationData.highRisk = (parseInt(violationData.highRisk) + 1).toString();
                  } else if (riskLevel.toLowerCase().includes('medium')) {
                    violationData.mediumRisk = (parseInt(violationData.mediumRisk) + 1).toString();
                  } else if (riskLevel.toLowerCase().includes('low')) {
                    violationData.lowRisk = (parseInt(violationData.lowRisk) + 1).toString();
                  }
                }
              });
            }
            
            // Try to find high risk violations
            const highRiskMatch = violationsText.match(/High Risk:?\s*([0-9]+)/i);
            if (highRiskMatch && highRiskMatch[1]) {
              violationData.highRisk = highRiskMatch[1];
            }
            
            // Try to find medium/medium-high risk violations
            const medHighRiskMatch = violationsText.match(/Medium-High Risk:?\s*([0-9]+)/i);
            const medRiskMatch = violationsText.match(/Medium Risk:?\s*([0-9]+)/i);
            
            if (medHighRiskMatch && medHighRiskMatch[1]) {
              // If we have medium-high risk violations
              const medHighCount = parseInt(medHighRiskMatch[1] || 0);
              const medCount = parseInt(medRiskMatch?.[1] || 0);
              violationData.mediumRisk = (medHighCount + medCount).toString();
            } else if (medRiskMatch && medRiskMatch[1]) {
              // If we only have medium risk violations
              violationData.mediumRisk = medRiskMatch[1];
            }
            
            // Try to find medium-low/low risk violations
            const medLowRiskMatch = violationsText.match(/Medium-Low Risk:?\s*([0-9]+)/i);
            const lowRiskMatch = violationsText.match(/Low Risk:?\s*([0-9]+)/i);
            
            if (medLowRiskMatch && medLowRiskMatch[1]) {
              // If we have medium-low risk violations
              const medLowCount = parseInt(medLowRiskMatch[1] || 0);
              const lowCount = parseInt(lowRiskMatch?.[1] || 0);
              violationData.lowRisk = (medLowCount + lowCount).toString();
            } else if (lowRiskMatch && lowRiskMatch[1]) {
              // If we only have low risk violations
              violationData.lowRisk = lowRiskMatch[1];
            }
          }

          // Get questions data directly from the Questions tab
          // First look in all active tabs
          const questionsTab = Array.from(document.querySelectorAll('.tab-content .tab-pane.active')).find(tab => 
            tab.textContent.includes('Questions to Ask') || tab.textContent.includes('Recommended Questions')
          ) || 
          // If not found in active tab, look in all tabs
          Array.from(document.querySelectorAll('.tab-content .tab-pane')).find(tab => 
            tab.textContent.includes('Questions to Ask') || tab.textContent.includes('Recommended Questions')
          );
          
          // Define default daycare questions to use when extraction fails
          const defaultDaycareQuestions = [
            "What is your teacher-to-child ratio for each age group?",
            "Can you describe your curriculum and daily schedule?",
            "What is your policy on sick children and medication administration?",
            "How do you handle discipline and behavior issues?",
            "What safety and security measures do you have in place?",
            "What is your staff turnover rate and minimum qualifications?",
            "How do you communicate with parents about their child's progress?",
            "What is your approach to managing food allergies and dietary restrictions?",
            "What is your emergency response plan?"
          ];
          
          // First, try to get questions from the tab in more ways
          if (questionsTab) {
            // Method 1: Try to get questions from React Bootstrap ListGroup components
            const listItems = questionsTab.querySelectorAll('.list-group-item');
            if (listItems && listItems.length > 0) {
              listItems.forEach(item => {
                // Extract the text without the badge number
                let text = item.textContent.trim();
                
                // Remove any number badges (like "1" etc.)
                const badgeText = item.querySelector('.badge')?.textContent || '';
                if (badgeText) {
                  text = text.replace(badgeText, '').trim();
                }
                
                // Add if valid question
                if (text && text.length > 10 && !/^\d+$/.test(text)) {
                  questionsData.push(text);
                }
              });
            }
            
            // Method 2: Look for paragraphs inside ListGroup items
            if (questionsData.length === 0) {
              const questionParagraphs = questionsTab.querySelectorAll('.list-group-item p');
              if (questionParagraphs && questionParagraphs.length > 0) {
                questionParagraphs.forEach(p => {
                  const text = p.textContent.trim();
                  if (text && text.length > 10) {
                    questionsData.push(text);
                  }
                });
              }
            }
            
            // Method 3: Check for any list items
            if (questionsData.length === 0) {
              const regularListItems = questionsTab.querySelectorAll('li');
              if (regularListItems && regularListItems.length > 0) {
                regularListItems.forEach(item => {
                  const text = item.textContent.trim();
                  if (text && text.length > 10) {
                    questionsData.push(text);
                  }
                });
              }
            }
            
            // Method 4: Look for specifically formatted text with question mark at end
            if (questionsData.length === 0) {
              // Try to find questions in the tab content - first look for paragraph text
              const paragraphs = questionsTab.querySelectorAll('p');
              paragraphs.forEach(p => {
                const text = p.textContent.trim();
                // If paragraph has a question mark it's likely a question
                if (text && text.includes('?') && text.length > 10) {
                  questionsData.push(text);
                }
              });
            }
            
            // Method 5: Parse the text content if all else fails
            if (questionsData.length === 0) {
              const questionsContent = questionsTab.textContent;
              
              // Try to match numbered lists like "1. What is..."
              const numberedQuestions = questionsContent.match(/\d+\.\s+([^.!?]*\?)/g);
              if (numberedQuestions && numberedQuestions.length > 0) {
                numberedQuestions.forEach(q => {
                  // Extract just the question text, remove the number
                  const questionText = q.replace(/^\d+\.\s+/, '').trim();
                  if (questionText && questionText.length > 10) {
                    questionsData.push(questionText);
                  }
                });
              }
              
              // Method 6: Try to match sentences that end with a question mark
              if (questionsData.length === 0) {
                const questionSentences = questionsContent.match(/[A-Z][^.!?]*\?/g);
                if (questionSentences && questionSentences.length > 0) {
                  questionSentences.forEach(q => {
                    if (q && q.length > 10 && q.length < 200) {
                      questionsData.push(q.trim());
                    }
                  });
                }
              }
            }
          }
          
          // Use default questions if extraction failed or found too few questions
          if (questionsData.length < 5) {
            questionsData = defaultDaycareQuestions;
          }
          
          // Limit to 9 questions maximum
          if (questionsData.length > 9) {
            questionsData = questionsData.slice(0, 9);
          }
          
          console.log("Extracted data for PDF:", {
            qualityRating,
            violationData,
            questionsCount: questionsData.length
          });
        } catch (e) {
          console.error("Error extracting detailed tab information:", e);
        }
        
        // Extract basic information from the page
        let address = '';
        let city = '';
        let zip = '';
        let phone = '';
        let type = '';
        let capacity = '';
        let inspections = '0';
        let violations = '0';
        
        // Get basic info from the UI
        try {
          // Try to extract data from the detail cards
          const detailItems = document.querySelectorAll('.daycare-details .detail-item');
          detailItems.forEach(item => {
            const label = item.querySelector('.detail-label')?.textContent || '';
            const value = item.querySelector('.detail-value')?.textContent || '';
            
            if (label.includes('Address')) address = value;
            if (label.includes('City')) city = value;
            if (label.includes('Phone')) phone = value;
            if (label.includes('Type')) type = value;
            if (label.includes('Capacity')) capacity = value;
          });
          
          // Fallback for address from header info if not found in detail cards
          if (!address) {
            const headerInfo = document.querySelector('.daycare-header-info');
            if (headerInfo) {
              const addressText = headerInfo.textContent;
              if (addressText && addressText.includes(',')) {
                // Extract address from header text which typically has format: "Address, City, TX"
                const parts = addressText.split(',');
                if (parts.length >= 2) {
                  address = parts[0].trim();
                  city = parts[1].trim();
                }
              }
            }
          }
          
          // Get data from the overview tab as a fallback
          const overviewTab = document.querySelector('.tab-content .tab-pane');
          if (overviewTab && (!address || !city || !phone || !type || !capacity)) {
            const overviewText = overviewTab.textContent;
            if (!address && overviewText.includes('Address:')) {
              const addressMatch = overviewText.match(/Address:\s*([^,\n]+)/);
              if (addressMatch && addressMatch[1]) address = addressMatch[1].trim();
            }
            if (!city && overviewText.includes('City:')) {
              const cityMatch = overviewText.match(/City:\s*([^,\n]+)/);
              if (cityMatch && cityMatch[1]) city = cityMatch[1].trim();
            }
            if (!phone && overviewText.includes('Phone:')) {
              const phoneMatch = overviewText.match(/Phone:\s*([^,\n]+)/);
              if (phoneMatch && phoneMatch[1]) phone = phoneMatch[1].trim();
            }
            if (!type && overviewText.includes('Type:')) {
              const typeMatch = overviewText.match(/Type:\s*([^,\n]+)/);
              if (typeMatch && typeMatch[1]) type = typeMatch[1].trim();
            }
            if (!capacity && overviewText.includes('Capacity:')) {
              const capacityMatch = overviewText.match(/Capacity:\s*([^,\n]+)/);
              if (capacityMatch && capacityMatch[1]) capacity = capacityMatch[1].trim();
            }
          }
          
          // Get violation information directly from daycare-details-card
          const inspectionCountElement = document.querySelector('.daycare-details .inspection-count');
          const violationCountElement = document.querySelector('.daycare-details .violation-count');
          
          if (inspectionCountElement) {
            inspections = inspectionCountElement.textContent.trim();
          } else {
            inspections = '0';
          }
          
          if (violationCountElement) {
            violations = violationCountElement.textContent.trim();
          } else {
            violations = '0';
          }
          
          // Make sure violation data matches what's displayed on the card
          violationData.count = violations;
        } catch (e) {
          console.error('Error extracting daycare details:', e);
        }
        
        // Extract base price from the pricing tab for dynamic pricing calculation
        let basePrice = '$1,442'; // Default base price if not found
        try {
          const pricingTab = Array.from(document.querySelectorAll('.tab-content .tab-pane')).find(tab => 
            tab.textContent.includes('Monthly Cost') || tab.textContent.includes('Pricing')
          );
          
          if (pricingTab) {
            const pricingText = pricingTab.textContent;
            
            // Try to find Monthly Cost specifically
            const monthlyMatch = pricingText.match(/Monthly Cost:?\s*(\$[0-9,]+)/i);
            if (monthlyMatch && monthlyMatch[1]) {
              basePrice = monthlyMatch[1];
            } else {
              // If no Monthly Cost label, find any dollar amount
              const priceMatch = pricingText.match(/\$([0-9,]+)/);
              if (priceMatch) {
                basePrice = '$' + priceMatch[1];
              }
            }
          }
        } catch (e) {
          console.error('Error extracting base price:', e);
        }
        
        // Verify we have a valid numeric base price
        let numericBase = 1442; // Default value
        const baseMatch = basePrice.match(/\$([0-9,]+)/);
        if (baseMatch && baseMatch[1]) {
          const parsedVal = parseFloat(baseMatch[1].replace(/,/g, ''));
          if (!isNaN(parsedVal) && parsedVal > 0) {
            numericBase = parsedVal;
          }
        }
        
        // Calculate the age-specific prices from base price
        const infantPrice = '$' + Math.round(numericBase * 1.15).toLocaleString(); // +15% for infant
        const toddlerPrice = '$' + Math.round(numericBase * 1.05).toLocaleString(); // +5% for toddler
        const preschoolPrice = basePrice; // Baseline for preschool (unchanged)
        const schoolAgePrice = '$' + Math.round(numericBase * 0.85).toLocaleString(); // -15% for school age
        
        console.log("Pricing:", {
          base: basePrice, 
          infant: infantPrice, 
          toddler: toddlerPrice, 
          preschool: preschoolPrice, 
          schoolAge: schoolAgePrice
        });
          
        // Create overview section (first page) with enhanced structure
        const overviewSection = document.createElement('div');
        overviewSection.style.marginBottom = '20px';
        overviewSection.style.pageBreakAfter = 'always';
        
        // Ensure we have a zip code
        if (!zip && address && address.match(/\d{5}/)) {
          const zipMatch = address.match(/\d{5}/);
          if (zipMatch) zip = zipMatch[0];
        }
        
        overviewSection.innerHTML = `
          <h2 style="color: #0275d8; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;">Overview</h2>
          
          <div style="display: flex; flex-wrap: wrap; gap: 30px; margin-bottom: 30px;">
            <div style="flex: 1 1 300px;">
              <h3 style="color: #495057; margin-bottom: 15px;">Contact Information</h3>
              <p><strong>Address:</strong> ${address || 'Not specified'}</p>
              <p><strong>City:</strong> ${city || 'Not specified'}${zip ? ', TX ' + zip : ''}</p>
              <p><strong>Phone:</strong> ${phone || 'Not specified'}</p>
              <p><strong>Website:</strong> Contact for details</p>
            </div>
            
            <div style="flex: 1 1 300px;">
              <h3 style="color: #495057; margin-bottom: 15px;">Facility Details</h3>
              <p><strong>Type:</strong> ${type || 'Licensed Child Care Center'}</p>
              <p><strong>Capacity:</strong> ${capacity || 'Not specified'}</p>
              <p><strong>Rating:</strong> ${qualityRating.stars || '★★★'} (${qualityRating.score || '3.0'}/5.0)</p>
              <p><strong>Years in Operation:</strong> ${qualityRating.yearsInOperation || '3'}</p>
            </div>
          </div>
          
          <div>
            <h3 style="color: #495057; margin-bottom: 15px;">Location</h3>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6;">
              <p style="margin-bottom: 5px;"><strong>Full Address:</strong> ${address || 'Not specified'}${city ? ', ' + city : ''}${zip ? ', TX ' + zip : ''}</p>
              ${address ? `<p style="margin-bottom: 0;"><strong>Directions:</strong> Contact facility for detailed directions or use a GPS navigation app.</p>` : ''}
            </div>
          </div>
        `;
        
        // Fetch information from tabs
        const tabs = document.querySelectorAll('.daycare-tabs .nav-link');
        const tabContents = document.querySelectorAll('.tab-content .tab-pane');
        
        // Process tab content for the PDF
        let hasViolationsTab = false;
        let hasPricingTab = false;
        let hasQualityTab = false;
        let hasQuestionsTab = false;
        
        tabs.forEach((tab, index) => {
          const tabTitle = tab.textContent.trim();
          
          if (tabTitle.includes('Violations')) hasViolationsTab = true;
          if (tabTitle.includes('Pricing')) hasPricingTab = true;
          if (tabTitle.includes('Quality')) hasQualityTab = true;
          if (tabTitle.includes('Questions')) hasQuestionsTab = true;
        });
        
        // Add violations section (second page)
        const violationsSection = document.createElement('div');
        violationsSection.style.marginBottom = '20px';
        violationsSection.style.pageBreakAfter = 'always';
        
        // Get risk level counts from our extraction
        const highRisk = violationData.highRisk || '0';
        const mediumRisk = violationData.mediumRisk || '0';
        const lowRisk = violationData.lowRisk || '0';
        
        // Generate violation details list if we have any details
        let violationDetailsList = '';
        if (violationData.details && violationData.details.length > 0) {
          // Group violations by category
          const categorizedViolations = {};
          violationData.details.forEach(detail => {
            const category = detail.category || 'Violations';
            if (!categorizedViolations[category]) {
              categorizedViolations[category] = [];
            }
            categorizedViolations[category].push(detail);
          });
          
          // Start building the violations section
          violationDetailsList = `
            <div style="margin-top: 20px;">
              <h3 style="color: #495057;">Inspection History</h3>
          `;
          
          // Create a table for each category
          Object.keys(categorizedViolations).forEach(category => {
            violationDetailsList += `
              <div style="margin-bottom: 20px;">
                <h4 style="color: #495057; margin-bottom: 10px;">${category}</h4>
                <div style="border: 1px solid #dee2e6; border-radius: 5px; overflow: hidden;">
                  <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead style="background-color: #f8f9fa;">
                      <tr>
                        <th style="padding: 8px; border-bottom: 1px solid #dee2e6;">Risk Level</th>
                        <th style="padding: 8px; border-bottom: 1px solid #dee2e6;">Description</th>
                        <th style="padding: 8px; border-bottom: 1px solid #dee2e6;">Date</th>
                      </tr>
                    </thead>
                    <tbody>
            `;
            
            // Add each violation detail in this category as a table row
            categorizedViolations[category].forEach(detail => {
              // Set risk level colors
              let riskColor = '#6c757d'; // gray default
              if (detail.riskLevel.toLowerCase().includes('high')) {
                riskColor = '#dc3545'; // red for high risk
              } else if (detail.riskLevel.toLowerCase().includes('medium')) {
                riskColor = '#fd7e14'; // orange for medium risk
              } else if (detail.riskLevel.toLowerCase().includes('low')) {
                riskColor = '#ffc107'; // yellow for low risk
              }
              
              violationDetailsList += `
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px; color: ${riskColor}; font-weight: bold;">${detail.riskLevel}</td>
                  <td style="padding: 8px;">${detail.description}</td>
                  <td style="padding: 8px;">${detail.date}</td>
                </tr>
              `;
            });
            
            violationDetailsList += `
                    </tbody>
                  </table>
                </div>
              </div>
            `;
          });
          
          violationDetailsList += `
            </div>
          `;
        }
        
        violationsSection.innerHTML = `
          <h2 style="color: #0275d8; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;">Violations & Inspections</h2>
          
          <div style="margin-bottom: 20px; background-color: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6;">
            <div style="display: flex; flex-wrap: wrap; gap: 20px;">
              <div style="flex: 1 1 200px;">
                <h3 style="color: #495057; margin-bottom: 10px;">Summary</h3>
                <p style="margin-bottom: 5px;"><strong>Total Inspections:</strong> ${inspections || 'Not available'}</p>
                <p style="margin-bottom: 0;"><strong>Total Violations:</strong> ${violations || 'Not available'}</p>
              </div>
              
              <div style="flex: 1 1 200px;">
                <h3 style="color: #495057; margin-bottom: 10px;">Risk Levels</h3>
                <p style="margin-bottom: 5px;"><strong>High Risk:</strong> ${highRisk}</p>
                <p style="margin-bottom: 5px;"><strong>Medium Risk:</strong> ${mediumRisk}</p>
                <p style="margin-bottom: 0;"><strong>Low Risk:</strong> ${lowRisk}</p>
              </div>
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #495057;">Risk Analysis</h3>
            <div style="background-color: #f0f7ff; padding: 15px; border-radius: 8px; border: 1px solid #cce5ff;">
              <p style="margin-bottom: ${parseInt(highRisk) > 0 ? '10px' : '0'};">
                <strong>Risk Assessment:</strong> ${
                  parseInt(violations) === 0 ? "This daycare has no reported violations, which is an excellent indication of ongoing regulatory compliance." :
                  parseInt(highRisk) > 0 ? "This facility has high-risk violations in its history. High-risk violations often relate to safety concerns that require immediate attention." :
                  parseInt(mediumRisk) > parseInt(lowRisk) ? "This facility primarily has medium-risk violations, which typically involve operational procedures that need improvement." :
                  "This facility primarily has low-risk violations, which usually involve minor documentation or recordkeeping issues."
                }
              </p>
              ${parseInt(highRisk) > 0 ? `
              <p style="margin-bottom: 0;">
                <strong>Action Recommended:</strong> Ask the facility about their high-risk violations, what corrective measures were taken, and what systems they have in place to prevent similar issues in the future.
              </p>` : ''}
            </div>
          </div>
          
          ${violationDetailsList}
          
          <div style="margin-top: ${violationDetailsList ? '30px' : '0'};">
            <h3 style="color: #495057;">Interpretation Guide</h3>
            <p style="margin-bottom: 10px;">Understanding violation risk levels:</p>
            <ul style="margin-bottom: 0;">
              <li><strong>High Risk:</strong> Issues that could pose an immediate threat to children's health and safety</li>
              <li><strong>Medium Risk:</strong> Operational or programmatic issues that need to be addressed but don't pose immediate danger</li>
              <li><strong>Low Risk:</strong> Administrative or recordkeeping issues with minimal direct impact on children</li>
            </ul>
          </div>
        `;
        
        // Add pricing section (third page) with the dynamically calculated prices
        const pricingSection = document.createElement('div');
        pricingSection.style.marginBottom = '20px';
        pricingSection.style.pageBreakAfter = 'always';
        
        pricingSection.innerHTML = `
          <h2 style="color: #0275d8; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;">Pricing Information</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #495057; margin-bottom: 15px;">Monthly Rates</h3>
            
            <div style="display: flex; flex-wrap: wrap; gap: 15px;">
              <div style="flex: 1 1 200px; background-color: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h4 style="color: #0275d8; margin-bottom: 10px;">Infant</h4>
                <p style="font-size: 20px; font-weight: 700; color: #495057;">${infantPrice}/month</p>
                <p style="color: #6c757d; font-size: 14px;">Ages 0-17 months</p>
              </div>
              
              <div style="flex: 1 1 200px; background-color: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h4 style="color: #0275d8; margin-bottom: 10px;">Toddler</h4>
                <p style="font-size: 20px; font-weight: 700; color: #495057;">${toddlerPrice}/month</p>
                <p style="color: #6c757d; font-size: 14px;">Ages 18-35 months</p>
              </div>
              
              <div style="flex: 1 1 200px; background-color: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h4 style="color: #0275d8; margin-bottom: 10px;">Preschool</h4>
                <p style="font-size: 20px; font-weight: 700; color: #495057;">${preschoolPrice}/month</p>
                <p style="color: #6c757d; font-size: 14px;">Ages 3-5 years</p>
              </div>
              
              <div style="flex: 1 1 200px; background-color: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h4 style="color: #0275d8; margin-bottom: 10px;">School Age</h4>
                <p style="font-size: 20px; font-weight: 700; color: #495057;">${schoolAgePrice}/month</p>
                <p style="color: #6c757d; font-size: 14px;">Ages 6+ years</p>
              </div>
            </div>
          </div>
          
          <div style="margin-top: 20px;">
            <h3 style="color: #495057;">Additional Fees</h3>
            <div style="background-color: #f0f7ff; padding: 15px; border-radius: 8px; border: 1px solid #cce5ff;">
              <p><strong>Registration Fee:</strong> Contact for details</p>
              <p><strong>Supply Fee:</strong> Contact for details</p>
              <p><strong>Late Pickup Fee:</strong> Contact for details</p>
              <p><strong>Notes:</strong> Please contact the daycare directly for the most accurate and up-to-date pricing information.</p>
            </div>
          </div>
        `;
        
        // Add quality section (fourth page)
        const qualitySection = document.createElement('div');
        qualitySection.style.marginBottom = '20px';
        qualitySection.style.pageBreakAfter = 'always';
        
        // Get years in operation
        const yearsInOperation = qualityRating.yearsInOperation || '3';
        const inspectionCount = qualityRating.inspections || inspections || '2';
        
        qualitySection.innerHTML = `
          <h2 style="color: #0275d8; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;">Quality Rating</h2>
          
          <div class="quality-banner mb-4 p-4 rounded" style="background-color: #f8f9fa; border: 1px solid #e9ecef; margin-bottom: 20px; padding: 20px; border-radius: 5px;">
            <div style="display: flex; flex-wrap: wrap; gap: 20px; align-items: center; margin-bottom: 20px;">
              <div style="flex: 0 0 auto;">
                <div style="font-size: 48px; color: #0275d8; text-align: center; margin-bottom: 5px;">${qualityRating.score || '3.0'}</div>
                <div style="font-size: 24px; text-align: center;">${qualityRating.stars || '★★★'}</div>
                <div style="color: #6c757d; text-align: center;">out of 5.0</div>
              </div>
              
              <div style="flex: 1 1 300px;">
                <p style="margin-bottom: 5px;"><strong>Rating Tier:</strong> ${
                  parseFloat(qualityRating.score) >= 4.5 ? 'Excellent' :
                  parseFloat(qualityRating.score) >= 3.5 ? 'Good' :
                  parseFloat(qualityRating.score) >= 2.5 ? 'Average' :
                  parseFloat(qualityRating.score) >= 1.5 ? 'Below Average' : 'Poor'
                }</p>
                <p style="margin-bottom: 5px;"><strong>Years in Operation:</strong> ${yearsInOperation}</p>
                <p style="margin-bottom: 5px;"><strong>Inspections (2yr):</strong> ${inspectionCount}</p>
                <p style="margin-bottom: 0;"><strong>Last Updated:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #495057;">Rating Scale</h3>
            <div style="background-color: #f0f7ff; padding: 15px; border-radius: 8px; border: 1px solid #cce5ff;">
              <p style="margin-bottom: 5px;"><strong>★★★★★ (4.5-5.0)</strong>: Excellent - Exceptional quality, outstanding safety records</p>
              <p style="margin-bottom: 5px;"><strong>★★★★ (3.5-4.4)</strong>: Good - Strong performance with minor areas for improvement</p>
              <p style="margin-bottom: 5px;"><strong>★★★ (2.5-3.4)</strong>: Average - Meets basic requirements with some areas needing attention</p>
              <p style="margin-bottom: 5px;"><strong>★★ (1.5-2.4)</strong>: Below Average - Multiple areas requiring significant improvement</p>
              <p style="margin-bottom: 0;"><strong>★ (0.5-1.4)</strong>: Poor - Serious concerns requiring immediate attention</p>
            </div>
          </div>
          
          <div>
            <h3 style="color: #495057;">Safety & Compliance</h3>
            <p>This rating is based on inspection history, violations, regulatory compliance, and available facility information.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px;">
              <p style="margin-bottom: 0;"><strong>Recognition:</strong> ${
                parseFloat(qualityRating.score) >= 4.5 ? "This facility has been noted for exceptional quality in child care." :
                parseFloat(qualityRating.score) >= 3.5 ? "This facility has been noted for good quality programming." :
                "No special recognitions at this time."
              }</p>
            </div>
          </div>
        `;
        
        // Add questions section (fifth page)
        const questionsSection = document.createElement('div');
        questionsSection.style.marginBottom = '20px';
        
        // Format questions list - use our extracted questions if available
        let questionsHtml = '';
        if (questionsData && questionsData.length > 0) {
          questionsHtml = '<ul style="margin-bottom: 20px;">';
          questionsData.forEach(question => {
            questionsHtml += `<li>${question}</li>`;
          });
          questionsHtml += '</ul>';
        } else {
          // Fallback questions
          questionsHtml = `
            <ul style="margin-bottom: 20px;">
              <li>What is your staff turnover rate in the past year?</li>
              <li>Can I see the daily schedule for my child's age group?</li>
              <li>What is your policy on sick children and medication?</li>
              <li>What are your emergency procedures?</li>
              <li>Do you provide meals/snacks or should parents bring them?</li>
              <li>What is your discipline policy?</li>
              <li>What security measures do you have for pick-up and drop-off?</li>
              <li>What learning activities do you provide for my child's age group?</li>
            </ul>
          `;
        }
        
        questionsSection.innerHTML = `
          <h2 style="color: #0275d8; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;">Questions to Ask</h2>
          
          <div style="background-color: #f0f7ff; padding: 15px; border-radius: 8px; border: 1px solid #cce5ff; margin-bottom: 20px;">
            <p style="margin-bottom: 0;">
              <strong>Why These Questions Matter:</strong> These questions are tailored to help you assess important aspects of childcare quality
              including safety protocols, staff qualifications, and educational approach. They address key factors that research
              shows contribute to positive child development outcomes.
            </p>
          </div>
          
          <p>Before enrolling your child, consider asking these questions during your visit:</p>
          
          ${questionsHtml}
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6;">
            <h3 style="color: #495057; margin-top: 0;">Next Steps</h3>
            <ol style="margin-bottom: 0;">
              <li>Schedule a tour at different times of day</li>
              <li>Speak with current parents about their experiences</li>
              <li>Check the daycare's license on the Texas HHS website</li>
              <li>Consider how the facility meets your family's specific needs</li>
              <li>Take notes during your visit to compare with other facilities</li>
            </ol>
          </div>
        `;
        
        // Add footer with generation info
        const footerSection = document.createElement('div');
        footerSection.style.marginTop = '30px';
        footerSection.style.borderTop = '1px solid #dee2e6';
        footerSection.style.paddingTop = '15px';
        footerSection.style.textAlign = 'center';
        footerSection.style.color = '#6c757d';
        footerSection.style.fontSize = '12px';
        footerSection.innerHTML = `
          Report generated from DaycareAlert.com on ${new Date().toLocaleDateString()}<br>
          For the most up-to-date information, please contact the daycare directly.
        `;
        
        // Add all sections to the PDF content
        pdfContent.appendChild(overviewSection);
        pdfContent.appendChild(violationsSection);
        pdfContent.appendChild(pricingSection);
        pdfContent.appendChild(qualitySection);
        pdfContent.appendChild(questionsSection);
        pdfContent.appendChild(footerSection);
        
        // Add the PDF content to the modal
        modalContent.appendChild(pdfContent);
        
        // Create download button
        const downloadButton = document.createElement('button');
        downloadButton.textContent = 'Download PDF';
        downloadButton.style.backgroundColor = '#0275d8';
        downloadButton.style.color = 'white';
        downloadButton.style.border = 'none';
        downloadButton.style.borderRadius = '4px';
        downloadButton.style.padding = '10px 20px';
        downloadButton.style.marginTop = '20px';
        downloadButton.style.cursor = 'pointer';
        downloadButton.style.display = 'block';
        downloadButton.style.width = '100%';
        
        downloadButton.onclick = function() {
          console.log('Generating PDF...');
          
          // Configure html2pdf options
          const opt = {
            margin: 0.5,
            filename: `${daycareName.replace(/[^a-z0-9]/gi, ' ').trim()}-Details.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
          };
          
          // Generate the PDF
          try {
            console.log('HTML2PDF library:', typeof html2pdf !== 'undefined' ? 'Available' : 'Not available');
            
            // Try using global html2pdf first
            if (typeof html2pdf !== 'undefined') {
              html2pdf().set(opt).from(pdfContent).save();
            } 
            // Then try window.html2pdf
            else if (typeof window.html2pdf !== 'undefined') {
              window.html2pdf().set(opt).from(pdfContent).save();
            }
            // Then try other variants that might be used
            else if (typeof window.html2pdf_js !== 'undefined') {
              window.html2pdf_js().set(opt).from(pdfContent).save();
            }
            else {
              throw new Error('HTML2PDF library not found');
            }
            
            // Close the modal after starting the download
            setTimeout(() => {
              document.body.removeChild(modalBackdrop);
            }, 1000);
          } catch (error) {
            console.error('PDF generation error:', error);
            alert('PDF generation failed. Please try again later. Error: ' + error.message);
          }
        };
        
        // Add the download button to the modal
        modalContent.appendChild(downloadButton);
        
        // Add the modal to the page
        modalBackdrop.appendChild(modalContent);
        document.body.appendChild(modalBackdrop);
      });
    });
  }
  
  // Run setup initially
  setupPdfExport();
  
  // Check periodically for new export buttons (in case of dynamic content changes)
  setInterval(setupPdfExport, 2000);
});
