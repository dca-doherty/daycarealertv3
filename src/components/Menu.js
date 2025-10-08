import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Menu.css';

function Menu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const { isAdmin } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <nav className="menu-container" ref={menuRef}>
      <div className="hamburger-icon" onClick={toggleMenu} aria-label="Toggle menu" role="button" tabIndex={0}>
        <div className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></div>
        <div className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></div>
        <div className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></div>
      </div>

      <div className={`menu-items ${isMenuOpen ? 'open' : ''}`}>
        <NavLink to="/home" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>
          Home
        </NavLink>
        <NavLink to="/daycare-finder" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>
          Daycare Finder
        </NavLink>
        <NavLink to="/about" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>
          About
        </NavLink>
        <NavLink to="/cost-estimator" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>
          Cost Estimator
        </NavLink>
        <NavLink to="/statistics" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>
          Texas Daycare Statistics
        </NavLink>
        <NavLink to="/benefits" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>
          Benefits of Quality Daycare
        </NavLink>
        <NavLink to="/alerts" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>
          Alerts & Notifications
        </NavLink>
        
        {/* Marketplace and Sponsors links hidden per request */}
        {/* <NavLink to="/marketplace" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>
          Marketplace
        </NavLink>
        <NavLink to="/sponsors" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>
          Sponsors
        </NavLink> */}
        
        {/* Consolidated views now available within Home page */}
        {/* 
        <NavLink to="/home?tab=pricing" onClick={closeMenu}>
          Daycare Pricing
        </NavLink>
        <NavLink to="/home?tab=violations" onClick={closeMenu}>
          Violations
        </NavLink>
        <NavLink to="/home?tab=overview" onClick={closeMenu}>
          Daycare Profiles
        </NavLink>
        */}
        
        <NavLink to="/resources" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>
          Resources
        </NavLink>
        <NavLink to="/legal-resources" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>
          Legal Resources
        </NavLink>
        <NavLink to="/privacy" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>
          Privacy Policy
        </NavLink>
        <NavLink to="/terms" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>
          Terms of Service
        </NavLink>
        
        {isAdmin() && (
          <NavLink to="/admin" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>
            Admin Dashboard
          </NavLink>
        )}
      </div>
    </nav>
  );
}

export default Menu;
