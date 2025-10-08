import React from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';
import '../../styles/StarRating.css';

const StarRating = ({ value, onChange, readOnly = false, size = 24 }) => {
  const stars = [1, 2, 3, 4, 5];
  
  const handleClick = (starValue) => {
    if (!readOnly && onChange) {
      onChange(starValue);
    }
  };

  return (
    <div className="star-rating">
      {stars.map((star) => (
        <span 
          key={star} 
          className={`star ${!readOnly ? 'interactive' : ''}`}
          onClick={() => handleClick(star)}
          role={!readOnly ? "button" : undefined}
          tabIndex={!readOnly ? 0 : undefined}
          style={{ fontSize: `${size}px` }}
        >
          {star <= value ? <FaStar className="filled" /> : <FaRegStar />}
        </span>
      ))}
      {value > 0 && <span className="rating-value">({value})</span>}
    </div>
  );
};

export default StarRating;