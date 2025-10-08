import React, { useState, useRef, useEffect } from 'react';
import '../styles/ExpandableContent.css';

/**
 * ExpandableContent component for progressive disclosure
 * Shows a preview of content with ability to expand for full details
 */
const ExpandableContent = ({
  title,
  preview,
  children,
  expanded = false,
  className = '',
  previewLines = 2,
  expandLabel = 'Show more',
  collapseLabel = 'Show less',
  card = false,
  onToggle = null,
  previewContent = null,
  icon = null
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [showToggle, setShowToggle] = useState(true);
  const contentRef = useRef(null);
  const previewRef = useRef(null);

  // Check if content overflows and toggle button is needed
  useEffect(() => {
    if (!previewContent && previewRef.current) {
      const lineHeight = parseInt(window.getComputedStyle(previewRef.current).lineHeight);
      const maxHeight = lineHeight * previewLines;
      
      if (previewRef.current.scrollHeight <= maxHeight) {
        setShowToggle(false);
      } else {
        setShowToggle(true);
      }
    }
  }, [children, previewLines, previewContent]);

  const handleToggle = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    
    if (onToggle) {
      onToggle(newExpandedState);
    }
  };

  // For rendering preview either as a limited line count or custom preview content
  const renderPreview = () => {
    if (previewContent) {
      return (
        <div className="expandable-preview-custom">
          {previewContent}
        </div>
      );
    }
    
    return (
      <div 
        className="expandable-preview" 
        ref={previewRef}
        style={{ 
          WebkitLineClamp: previewLines,
          maxHeight: !isExpanded ? `calc(${previewLines}em * 1.5)` : 'none'
        }}
      >
        {preview || children}
      </div>
    );
  };

  return (
    <div className={`expandable-container ${isExpanded ? 'expanded' : ''} ${card ? 'card' : ''} ${className}`}>
      {title && (
        <div className="expandable-header">
          {icon && <span className="expandable-icon">{icon}</span>}
          <h3 className="expandable-title">{title}</h3>
        </div>
      )}
      
      <div className="expandable-content" ref={contentRef}>
        {isExpanded ? (
          // Show full content when expanded
          <div className="expandable-full-content">
            {children}
          </div>
        ) : (
          // Show preview content when collapsed
          renderPreview()
        )}
      </div>
      
      {showToggle && (
        <button 
          className="expandable-toggle" 
          onClick={handleToggle}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? collapseLabel : expandLabel}
        >
          <span>{isExpanded ? collapseLabel : expandLabel}</span>
          <span className={`toggle-arrow ${isExpanded ? 'up' : 'down'}`}>
            {isExpanded ? '▲' : '▼'}
          </span>
        </button>
      )}
    </div>
  );
};

export default ExpandableContent;