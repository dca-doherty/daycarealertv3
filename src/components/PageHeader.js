import React from 'react';
import '../styles/PageHeader.css';

const PageHeader = ({ title, backgroundImage }) => {
  return (
    <div className="page-header" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="page-header-overlay">
        <h1>{title}</h1>
      </div>
    </div>
  );
};

export default PageHeader;