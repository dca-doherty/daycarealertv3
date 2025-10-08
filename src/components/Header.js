import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { FaSignInAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import UserMenu from './auth/UserMenu';
import '../styles/Header.css';
import logo from '../images/logo-transparent.png';
import logoHorizontal from '../images/logo-transparent.png';

const Header = ({ onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [scrolled]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const mobileLogo = windowWidth < 992;
  const siteTitle = "Texas Daycare Information Center";

  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <div className="header-container">
        {/* Logo section - left aligned */}
        <div className="header-logo">
          <Link to="/" className="logo-link" onClick={closeMenu}>
            {mobileLogo ? (
              <img src={logo} alt={siteTitle} className="logo mobile-logo" />
            ) : (
              <img src={logoHorizontal} alt={siteTitle} className="logo horizontal-logo" />
            )}
          </Link>
        </div>

        {/* Primary navigation - center aligned */}
        <nav className={`primary-nav ${isMenuOpen ? 'active' : ''}`}>
          <ul className="main-menu">
            <li className={location.pathname === '/home' ? 'active' : ''}>
              <Link to="/home" onClick={closeMenu}>Home</Link>
            </li>
            <li className={location.pathname === '/about' ? 'active' : ''}>
              <Link to="/about" onClick={closeMenu}>About</Link>
            </li>
            <li className={location.pathname === '/daycare-finder' ? 'active' : ''}>
              <Link to="/daycare-finder" onClick={closeMenu}>Daycare Finder</Link>
            </li>
            <li className={location.pathname === '/cost-estimator' ? 'active' : ''}>
              <Link to="/cost-estimator" onClick={closeMenu}>Cost Estimator</Link>
            </li>
            <li className={location.pathname === '/alerts' ? 'active' : ''}>
              <Link to="/alerts" onClick={closeMenu}>Alerts</Link>
            </li>
            {/* Marketplace and Sponsors links hidden per request */}
            {/* <li className={location.pathname === '/marketplace' ? 'active' : ''}>
              <Link to="/marketplace" onClick={closeMenu}>Marketplace</Link>
            </li>
            <li className={location.pathname === '/sponsors' ? 'active' : ''}>
              <Link to="/sponsors" onClick={closeMenu}>Sponsors</Link>
            </li> */}
            <li className={location.pathname === '/resources' ? 'active' : ''}>
              <Link to="/resources" onClick={closeMenu}>Resources</Link>
            </li>
          </ul>
        </nav>
        
        {/* User account section - right aligned */}
        <div className="header-user">
          {isAuthenticated() ? (
            <UserMenu />
          ) : (
            <Button 
              variant="primary" 
              size="sm" 
              className="login-button" 
              onClick={onLoginClick}
            >
              <FaSignInAlt className="me-1" /> Login
            </Button>
          )}
          
          {/* Mobile menu toggle - only shown on small screens */}
          <div className={`menu-toggle ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu}>
            <div className="hamburger"></div>
          </div>
        </div>
      </div>
      
      {/* Secondary navigation - displayed below main header on desktop */}
      <div className="secondary-nav-container">
        <ul className="secondary-nav">
          <li className={location.pathname === '/privacy' ? 'active' : ''}>
            <Link to="/privacy" onClick={closeMenu}>Privacy</Link>
          </li>
          <li className={location.pathname === '/terms' ? 'active' : ''}>
            <Link to="/terms" onClick={closeMenu}>Terms</Link>
          </li>
        </ul>
      </div>
    </header>
  );
};

export default Header;