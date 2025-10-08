import React from 'react';
import '../styles/Pagination.css';

const Pagination = ({ itemsPerPage, totalItems, paginate, onPageChange, currentPage }) => {
  const pageNumbers = [];
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Logic to show a window of page numbers
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);

  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }
  
  // CRITICAL FIX: Add logging to debug pagination issues
  console.log(`[Pagination] Rendering with totalItems=${totalItems}, itemsPerPage=${itemsPerPage}, currentPage=${currentPage}, totalPages=${totalPages}`);
  
  // Determine which callback to use
  const handlePageClick = (page) => {
    // CRITICAL FIX: Log page clicks to debug pagination issues
    console.log(`[Pagination] Page ${page} clicked, currentPage=${currentPage}`);
    
    // Scroll to top of the data table for better user experience
    const scrollToTable = () => {
      // Find the data table element
      const tableElement = document.querySelector('.data-table-section');
      
      if (tableElement) {
        // Scroll to just above the table with a small offset
        const yOffset = -100; // 100px offset to show some context
        const y = tableElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
        
        window.scrollTo({
          top: y,
          behavior: 'smooth'
        });
      } else {
        // If table element not found, just scroll to top
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    };
    
    // CRITICAL FIX: Always trigger both callbacks for maximum compatibility
    try {
      // Call the appropriate pagination callback
      if (paginate) {
        console.log(`[Pagination] Calling paginate(${page})`);
        paginate(page);
      }
      
      if (onPageChange) {
        console.log(`[Pagination] Calling onPageChange(${page})`);
        onPageChange(page);
      }
      
      if (!paginate && !onPageChange) {
        console.error(`[Pagination] ERROR: No pagination callback available!`);
      }
      
      // Scroll after a small delay to ensure the page has updated
      setTimeout(scrollToTable, 50);
    } catch (error) {
      console.error(`[Pagination] Error calling pagination callbacks:`, error);
    }
  };
  
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination">
      <ul>
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button onClick={() => handlePageClick(1)} disabled={currentPage === 1}>
            First
          </button>
        </li>
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button onClick={() => handlePageClick(currentPage - 1)} disabled={currentPage === 1}>
            Previous
          </button>
        </li>
        {startPage > 1 && <li className="page-item"><span className="ellipsis">...</span></li>}
        {pageNumbers.map(number => (
          <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
            <button onClick={() => handlePageClick(number)}>
              {number}
            </button>
          </li>
        ))}
        {endPage < totalPages && <li className="page-item"><span className="ellipsis">...</span></li>}
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button onClick={() => handlePageClick(currentPage + 1)} disabled={currentPage === totalPages}>
            Next
          </button>
        </li>
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button onClick={() => handlePageClick(totalPages)} disabled={currentPage === totalPages}>
            Last
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;