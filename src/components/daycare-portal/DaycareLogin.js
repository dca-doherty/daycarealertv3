import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Alert, Card, Tabs, Tab } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../../styles/DaycarePortal.css';

const DaycareLogin = () => {
  const [activeKey, setActiveKey] = useState('login');
  const [formData, setFormData] = useState({
    login: {
      email: '',
      password: ''
    },
    register: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      phone: '',
      daycare_id: '',
      position: '',
      provider_code: ''
    }
  });
  const [useProviderCode, setUseProviderCode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [daycareInfo, setDaycareInfo] = useState(null);
  const [showDaycareInfo, setShowDaycareInfo] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const handleChange = (tab, e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [tab]: {
        ...formData[tab],
        [name]: value
      }
    });
    
    // Clear error when user types
    if (error) setError('');
    
    // Reset daycare info when provider code changes
    if (tab === 'register' && name === 'provider_code') {
      setDaycareInfo(null);
      setShowDaycareInfo(false);
    }
  };
  
  const validateProviderCode = async () => {
    if (!formData.register.provider_code) {
      setError('Please enter a provider code');
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`https://api.daycarealert.com/api/daycare-auth/validate-code/${formData.register.provider_code}`);
      const data = await response.json();
      
      if (data.success) {
        setDaycareInfo(data.daycare);
        setShowDaycareInfo(true);
        setError('');
      } else {
        setError(data.message || 'Invalid provider code');
        setDaycareInfo(null);
        setShowDaycareInfo(false);
      }
    } catch (err) {
      setError('Error validating provider code');
      console.error('Error validating provider code:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitLogin = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      
      const success = await login(formData.login.email, formData.login.password);
      
      if (success) {
        navigate('/daycare-portal/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitRegister = async (e) => {
    e.preventDefault();
    
    // Form validation
    if (formData.register.password !== formData.register.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.register.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    if (!formData.register.username || !formData.register.email) {
      setError('Username and email are required');
      return;
    }
    
    if (useProviderCode && !formData.register.provider_code) {
      setError('Provider code is required');
      return;
    }
    
    if (!useProviderCode && !formData.register.daycare_id) {
      setError('Daycare ID is required');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const apiUrl = `https://api.daycarealert.com/api/daycare-auth/register`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formData.register.username,
          email: formData.register.email,
          password: formData.register.password,
          fullName: formData.register.fullName,
          phone: formData.register.phone,
          daycare_id: useProviderCode ? undefined : formData.register.daycare_id,
          position: formData.register.position,
          provider_code: useProviderCode ? formData.register.provider_code : undefined
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store the token in localStorage
        localStorage.setItem('token', data.token);
        
        // Redirect to the daycare portal dashboard
        navigate('/daycare-portal/dashboard');
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="daycare-login-container py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white text-center py-3">
              <h2>Daycare Provider Portal</h2>
            </Card.Header>
            <Card.Body className="p-4">
              <Tabs
                activeKey={activeKey}
                onSelect={(k) => setActiveKey(k)}
                className="mb-4"
              >
                <Tab eventKey="login" title="Login">
                  {error && <Alert variant="danger">{error}</Alert>}
                  
                  <Form onSubmit={handleSubmitLogin}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email Address</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.login.email}
                        onChange={(e) => handleChange('login', e)}
                        required
                        placeholder="your@email.com"
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-4">
                      <Form.Label>Password</Form.Label>
                      <Form.Control
                        type="password"
                        name="password"
                        value={formData.login.password}
                        onChange={(e) => handleChange('login', e)}
                        required
                        placeholder="••••••••"
                      />
                    </Form.Group>
                    
                    <div className="d-grid">
                      <Button 
                        variant="primary" 
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? 'Logging in...' : 'Login'}
                      </Button>
                    </div>
                    
                    <p className="text-center mt-3">
                      <Button
			variant="link"
			className="p-0"
			onClick={() => setActiveKey('register')}
		      >
                        Don't have an account? Register
                      </Button>
                    </p>
                  </Form>
                </Tab>
                
                <Tab eventKey="register" title="Register">
                  {error && <Alert variant="danger">{error}</Alert>}
                  
                  <Form onSubmit={handleSubmitRegister}>
                    <div className="mb-3">
                      <Form.Check
                        type="radio"
                        id="useProviderCode"
                        label="I have a provider code"
                        checked={useProviderCode}
                        onChange={() => setUseProviderCode(true)}
                        className="mb-2"
                      />
                      <Form.Check
                        type="radio"
                        id="useDaycareId"
                        label="I want to register my daycare"
                        checked={!useProviderCode}
                        onChange={() => setUseProviderCode(false)}
                      />
                    </div>
                    
                    {useProviderCode ? (
                      <>
                        <Form.Group className="mb-3">
                          <Form.Label>Provider Code</Form.Label>
                          <div className="d-flex">
                            <Form.Control
                              type="text"
                              name="provider_code"
                              value={formData.register.provider_code}
                              onChange={(e) => handleChange('register', e)}
                              placeholder="Enter your provider code"
                              className="me-2"
                            />
                            <Button 
                              variant="outline-primary" 
                              onClick={validateProviderCode}
                              disabled={loading || !formData.register.provider_code}
                            >
                              Verify
                            </Button>
                          </div>
                          <Form.Text className="text-muted">
                            Enter the provider code given to you by your daycare administrator
                          </Form.Text>
                        </Form.Group>
                        
                        {showDaycareInfo && daycareInfo && (
                          <Alert variant="success" className="mb-3">
                            <strong>Daycare verified:</strong> {daycareInfo.name}
                          </Alert>
                        )}
                      </>
                    ) : (
                      <Form.Group className="mb-3">
                        <Form.Label>Daycare ID</Form.Label>
                        <Form.Control
                          type="text"
                          name="daycare_id"
                          value={formData.register.daycare_id}
                          onChange={(e) => handleChange('register', e)}
                          placeholder="Enter your daycare ID"
                        />
                        <Form.Text className="text-muted">
                          This is the operation number from your state license
                        </Form.Text>
                      </Form.Group>
                    )}
                    
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Username</Form.Label>
                          <Form.Control
                            type="text"
                            name="username"
                            value={formData.register.username}
                            onChange={(e) => handleChange('register', e)}
                            required
                            placeholder="Choose a username"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Full Name</Form.Label>
                          <Form.Control
                            type="text"
                            name="fullName"
                            value={formData.register.fullName}
                            onChange={(e) => handleChange('register', e)}
                            placeholder="Your full name"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Email Address</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.register.email}
                        onChange={(e) => handleChange('register', e)}
                        required
                        placeholder="your@email.com"
                      />
                    </Form.Group>
                    
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Phone Number</Form.Label>
                          <Form.Control
                            type="tel"
                            name="phone"
                            value={formData.register.phone}
                            onChange={(e) => handleChange('register', e)}
                            placeholder="(123) 456-7890"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Position</Form.Label>
                          <Form.Control
                            type="text"
                            name="position"
                            value={formData.register.position}
                            onChange={(e) => handleChange('register', e)}
                            placeholder="Director, Admin, etc."
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Password</Form.Label>
                          <Form.Control
                            type="password"
                            name="password"
                            value={formData.register.password}
                            onChange={(e) => handleChange('register', e)}
                            required
                            placeholder="••••••••"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-4">
                          <Form.Label>Confirm Password</Form.Label>
                          <Form.Control
                            type="password"
                            name="confirmPassword"
                            value={formData.register.confirmPassword}
                            onChange={(e) => handleChange('register', e)}
                            required
                            placeholder="••••••••"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <div className="d-grid">
                      <Button 
                        variant="primary" 
                        type="submit"
                        disabled={loading || (useProviderCode && !showDaycareInfo)}
                      >
                        {loading ? 'Registering...' : 'Register'}
                      </Button>
                    </div>
                    
                    <p className="text-center mt-3">
                      <Button
			variant="link"
			className="p-0"
			onClick={() => setActiveKey('login')}
		      >
                        Already have an account? Login
                      </Button>
                    </p>
                  </Form>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DaycareLogin;
