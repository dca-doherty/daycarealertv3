  // Fix for PDF export after removal of location tab
  document.addEventListener('DOMContentLoaded', function() {
    // Wait for React to render the page
    setTimeout(function() {
      // Find all Export PDF buttons
      const exportButtons = Array.from(document.querySelectorAll('button')).filter(
        button => button.textContent.includes('Export PDF')
      );

      // Replace the click handlers
      exportButtons.forEach(button => {
        // Remove old click handlers
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        // Add new click handler
        newButton.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();

          // Get the daycare info from the page
          const daycareNameEl = document.querySelector('.daycare-title h2');
          const daycareName = daycareNameEl ? daycareNameEl.textContent : 'Daycare';

          // Create modal
          const modal = document.createElement('div');
          modal.style.position = 'fixed';
          modal.style.top = '0';
          modal.style.left = '0';
          modal.style.width = '100%';
          modal.style.height = '100%';
          modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
          modal.style.zIndex = '9999';
          modal.style.display = 'flex';
          modal.style.justifyContent = 'center';
          modal.style.alignItems = 'center';

          // Create close button
          const closeBtn = document.createElement('button');
          closeBtn.textContent = '×';
          closeBtn.style.position = 'absolute';
          closeBtn.style.top = '10px';
          closeBtn.style.right = '10px';
          closeBtn.style.fontSize = '24px';
          closeBtn.style.background = 'none';
          closeBtn.style.border = 'none';
          closeBtn.style.color = 'white';
          closeBtn.style.cursor = 'pointer';
          modal.appendChild(closeBtn);

          // Close on button click
          closeBtn.addEventListener('click', function() {
            document.body.removeChild(modal);
          });

          // Create download button
          const downloadBtn = document.createElement('button');
          downloadBtn.textContent = 'Download PDF';
          downloadBtn.style.position = 'absolute';
          downloadBtn.style.bottom = '20px';
          downloadBtn.style.padding = '10px 20px';
          downloadBtn.style.backgroundColor = '#0d6efd';
          downloadBtn.style.color = 'white';
          downloadBtn.style.border = 'none';
          downloadBtn.style.borderRadius = '4px';
          downloadBtn.style.cursor = 'pointer';
          modal.appendChild(downloadBtn);

          // Create content container
          const content = document.createElement('div');
          content.style.backgroundColor = 'white';
          content.style.width = '80%';
          content.style.maxWidth = '800px';
          content.style.maxHeight = '80vh';
          content.style.overflowY = 'auto';
          content.style.padding = '20px';
          content.style.borderRadius = '5px';

          // Get all tabs content
          const tabContents = document.querySelectorAll('.tab-pane');

          // Create title
          const title = document.createElement('h1');
          title.textContent = daycareName;
          title.style.textAlign = 'center';
          title.style.color = '#0275d8';
          title.style.borderBottom = '2px solid #dee2e6';
          title.style.paddingBottom = '10px';
          content.appendChild(title);

          // Add each tab's content (cloned to avoid affecting original page)
          tabContents.forEach((tab, index) => {
            if (tab.id && tab.id.includes('tab-')) {
              const sectionDiv = document.createElement('div');
              sectionDiv.style.marginBottom = '30px';

              // Add page break between sections
              if (index > 0) {
                sectionDiv.style.pageBreakBefore = 'always';
              }

              // Get tab title
              const tabId = tab.id.split('-').pop();
              const tabTitle = document.querySelector(`[aria-controls="${tab.id}"]`);

              if (tabTitle) {
                const heading = document.createElement('h2');
                heading.textContent = tabTitle.textContent;
                heading.style.color = '#0275d8';
                heading.style.borderBottom = '1px solid #dee2e6';
                heading.style.paddingBottom = '10px';
                sectionDiv.appendChild(heading);
              }

              // Clone and append tab content
              const clone = tab.cloneNode(true);
              sectionDiv.appendChild(clone);

              content.appendChild(sectionDiv);
            }
          });

          // Add footer
          const footer = document.createElement('footer');
          footer.style.borderTop = '1px solid #dee2e6';
          footer.style.padding = '10px';
          footer.style.marginTop = '20px';
          footer.style.textAlign = 'center';
          footer.style.color = '#6c757d';
          footer.style.fontSize = '12px';
          footer.innerHTML = `Generated from DaycareAlert.com on ${new Date().toLocaleDateString()}`;
          content.appendChild(footer);

          modal.appendChild(content);
          document.body.appendChild(modal);

          // Set up PDF export
          downloadBtn.addEventListener('click', function() {
            // Use html2pdf
            if (window.html2pdf) {
              const opt = {
                margin: 0.5,
                filename: `${daycareName}-Report.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
              };

              window.html2pdf().set(opt).from(content).save();

              // Close modal after starting download
              setTimeout(() => {
                document.body.removeChild(modal);
              }, 1000);
            } else {
              alert('PDF generation library not loaded. Please try again later.');
            }
          });
        });
      });
    }, 1000); // Wait 1 second for React to render
  });
