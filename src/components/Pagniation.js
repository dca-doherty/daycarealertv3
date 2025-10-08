import React from 'react';
import '../styles/Pagination.css';

const Pagination = ({ itemsPerPage, totalItems, paginate, currentPage }) => {
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

  return (
    <nav className="pagination">
      <ul>
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button onClick={() => paginate(1)} disabled={currentPage === 1}>
            First
          </button>
        </li>
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
            Previous
          </button>
        </li>
        {startPage > 1 && <li className="page-item"><span className="ellipsis">...</span></li>}
        {pageNumbers.map(number => (
          <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
            <button onClick={() => paginate(number)}>
              {number}
            </button>
          </li>
        ))}
        {endPage < totalPages && <li className="page-item"><span className="ellipsis">...</span></li>}
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}>
            Next
          </button>
        </li>
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button onClick={() => paginate(totalPages)} disabled={currentPage === totalPages}>
            Last
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;