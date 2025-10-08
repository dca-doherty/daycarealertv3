import React from 'react';

const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div className="error-container">
      <div className="error-icon"><span role="img" aria-label="Warning">⚠️</span></div>
      <p className="error-message">{message}</p>
      {onRetry && (
        <button className="retry-button" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;