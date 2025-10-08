import React, { useState } from 'react';
import { Modal, Tab, Tabs } from 'react-bootstrap';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import '../../styles/Auth.css';

const AuthModal = ({ show, onHide }) => {
  const [activeTab, setActiveTab] = useState('login');

  const handleLoginSuccess = () => {
    onHide();
  };

  const handleRegisterSuccess = () => {
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{activeTab === 'login' ? 'Login' : 'Register'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tabs
          activeKey={activeTab}
          onSelect={(key) => setActiveTab(key)}
          className="auth-tabs mb-3"
        >
          <Tab eventKey="login" title="Login">
            <LoginForm onSuccess={handleLoginSuccess} />
          </Tab>
          <Tab eventKey="register" title="Register">
            <RegisterForm onSuccess={handleRegisterSuccess} />
          </Tab>
        </Tabs>
        
        <div className="auth-footer">
          {activeTab === 'login' ? (
            <p>Don't have an account? Switch to the Register tab to create one.</p>
          ) : (
            <p>Already have an account? Switch to the Login tab to sign in.</p>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default AuthModal;