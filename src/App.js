import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { initGA, trackPageView } from './utils/analytics';
import Header from './components/Header';
import Footer from './components/Footer';
import Menu from './components/Menu';
import ScrollToTop from './components/ScrollToTop';
import IntroPage from './pages/IntroPage';
import Home from './pages/Home';
import MySqlHome from './pages/MySqlHome';
import OptimizedMySqlHome from './pages/OptimizedMySqlHome';
import Resources from './pages/Resources';
import About from './pages/About';
import LegalResources from './pages/LegalResources';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Enterprise from './pages/Enterprise';
import ApiDocs from './pages/ApiDocs';
import Alerts from './pages/Alerts';
import Profile from './pages/Profile';
import Marketplace from './pages/Marketplace';
import Sponsors from './pages/sponsors';
import CostEstimator from './pages/CostEstimator';
import Statistics from './pages/Statistics';
import Benefits from './pages/Benefits';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import DaycareQuestionnaire from './components/DaycareQuestionnaire';
import DaycareRecommendations from './components/DaycareRecommendations';
import ButtonPresentation from './pages/ButtonPresentation';
import EnhancedButtonPresentation from './pages/EnhancedButtonPresentation';
import Admin from './pages/Admin';
import DaycarePortal from './pages/DaycarePortal';
// Data source selector is disabled as we're only using MySQL data
// import DataSourceSelector from './components/DataSourceSelector';
import NotificationProvider from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';
import AuthModal from './components/auth/AuthModal';
import './styles/index.css';
import './styles/TableEnhancements.css';
import './styles/AdminDashboard.css';
import './styles/OptimizedHome.css';
import './styles/MobileResponsive.css'; // Add mobile responsive styles
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const location = useLocation();
  
  // Initialize Google Analytics
  useEffect(() => {
    initGA();
  }, []);
  
  // Track page views when location changes
  useEffect(() => {
    if (location) {
      trackPageView(location.pathname + location.search);
    }
  }, [location]);
  
  const handleOpenAuthModal = () => setShowAuthModal(true);
  const handleCloseAuthModal = () => setShowAuthModal(false);

  // Create an AuthContext value with the showAuthModal function
  const authContextValue = {
    showAuthModal: handleOpenAuthModal
  };

  return (
    <NotificationProvider>
      <AuthProvider value={authContextValue}>
        <div className="App">
          <ScrollToTop />
          <AuthModal show={showAuthModal} onHide={handleCloseAuthModal} />
          <Routes>
            <Route path="/" element={<IntroPage onLoginClick={handleOpenAuthModal} />} />
            <Route
              path="/*"
              element={
                <>
                  <Header onLoginClick={handleOpenAuthModal} />
                  <div className="main-container">
                    <Menu />
                    <main className="content">
                      <Routes>
                        <Route path="/home" element={
                          <>
                            <OptimizedMySqlHome />
                          </>
                        } />
                        <Route path="/mysql" element={
                          <>
                            <Navigate to="/home" replace />
                          </>
                        } />
                        <Route path="/optimized" element={
                          <>
                            <Navigate to="/home" replace />
                          </>
                        } />
                        {/* Consolidated pages - now accessed via DaycareDetails component */}
                        <Route path="/pricing" element={<Home tabView="pricing" />} />
                        <Route path="/mysql/pricing" element={<MySqlHome tabView="pricing" />} />
                        <Route path="/optimized/pricing" element={<OptimizedMySqlHome tabView="pricing" />} />
                        <Route path="/cost-estimator" element={<CostEstimator />} />
                        <Route path="/violations" element={<Home tabView="violations" />} />
                        <Route path="/mysql/violations" element={<MySqlHome tabView="violations" />} />
                        <Route path="/optimized/violations" element={<OptimizedMySqlHome tabView="violations" />} />
                        <Route path="/daycare-finder" element={<DaycareQuestionnaire onSubmit={() => {}} />} />
                        <Route path="/recommendations" element={<DaycareRecommendations />} />
                        
                        {/* Protected routes */}
                        <Route path="/profile" element={
                          <PrivateRoute>
                            <Profile />
                          </PrivateRoute>
                        } />
                        <Route path="/profile/:id" element={
                          <PrivateRoute>
                            <Profile />
                          </PrivateRoute>
                        } />
                        <Route path="/account" element={
                          <PrivateRoute>
                            <Profile />
                          </PrivateRoute>
                        } />
                        <Route path="/alerts" element={
                          <PrivateRoute>
                            <Alerts />
                          </PrivateRoute>
                        } />
                        
                        {/* Admin routes */}
                        <Route path="/admin" element={
                          <PrivateRoute adminRequired={true}>
                            <Admin />
                          </PrivateRoute>
                        } />
                        <Route path="/admin/*" element={
                          <PrivateRoute adminRequired={true}>
                            <Admin />
                          </PrivateRoute>
                        } />
                        
                        {/* Public routes */}
                        <Route path="/marketplace" element={<Marketplace />} />
                        <Route path="/sponsors" element={<Sponsors />} />
                        <Route path="/resources" element={<Resources />} />
                        <Route path="/legal-resources" element={<LegalResources />} />
                        <Route path="/statistics" element={<Statistics />} />
                        <Route path="/benefits" element={<Benefits />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/terms" element={<Terms />} />
                        
                        {/* Enterprise & API Documentation - B2B Services */}
                        <Route path="/enterprise" element={<Enterprise />} />
                        <Route path="/api-docs" element={<ApiDocs />} />
                        
                        <Route path="/buttonpres" element={<ButtonPresentation />} />
                        <Route path="/enhancedpres" element={<EnhancedButtonPresentation />} />
                        
                        {/* Daycare Portal */}
                        <Route path="/daycare-portal/*" element={<DaycarePortal />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password/:token" element={<ResetPassword />} />
                        
                        {/* Email verification */}
                        <Route path="/verify/:token" element={<VerifyEmail />} />
                        
                        {/* Catch-all route - excludes sitemap.xml and robots.txt */}
                        <Route path="*" element={<Navigate to="/mysql" replace />} />
                      </Routes>
                    </main>
                  </div>
                  <Footer />
                </>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
