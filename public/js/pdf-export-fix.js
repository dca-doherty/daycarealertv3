  // Fix for PDF export after removing Location tab
  document.addEventListener('DOMContentLoaded', function() {
    // This fixes an issue with PDF export page breaks that occurred
    // after removing the Location tab from the daycare details view

    // Watch for the "Export PDF" button clicks
    document.addEventListener('click', function(e) {
      if (e.target.innerText === 'Export PDF' && e.target.className.includes('export-button')) {
        console.log('PDF export initiated - fixing page breaks');

        // Set a timeout for html2pdf to configure properly
        setTimeout(function() {
          // Find all PDF container elements
          const pdfContainers = document.querySelectorAll('.pdf-container');

          if (pdfContainers.length > 0) {
            // Select the last container (active one)
            const container = pdfContainers[pdfContainers.length - 1];

            // Find all section headings in the PDF
            const sections = container.querySelectorAll('h2');

            // Add page breaks before each section (except the first)
            for (let i = 1; i < sections.length; i++) {
              sections[i].style.pageBreakBefore = 'always';
              sections[i].style.marginTop = '20px';
            }

            console.log('PDF page breaks fixed');
          }
        }, 100);
      }
    });
  });

