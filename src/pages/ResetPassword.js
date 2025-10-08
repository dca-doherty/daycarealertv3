import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validated, setValidated] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tokenExpired, setTokenExpired] = useState(false);
  
  const { token } = useParams();
  const navigate = useNavigate();
  const { resetPassword, loading, error, clearError } = useAuth();
  
  // Clear any auth context errors when mounting
  useEffect(() => {
    clearError();
  }, [clearError]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    // Clear previous errors
    clearError();
    setLocalError('');
    
    // Client-side validation
    if (!password || password.length < 8) {
      setLocalError('Password must be at least 8 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    
    // Form validation
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    // Attempt to reset password
    const success = await resetPassword(token, password);
    
    if (success) {
      setSuccessMessage('Password reset successful! You will be redirected to login page.');
      // Redirect to login page after a delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } else if (error?.includes('expired')) {
      setTokenExpired(true);
    }
  };
  
  // If token is expired, show message and request new link option
  if (tokenExpired) {
    return (
      <Container className="mt-5">
        <Row className="justify-content-center">
          <Col md={6}>
            <Card className="shadow-sm">
              <Card.Body className="p-4">
                <h2 className="text-center mb-4">Password Reset Link Expired</h2>
                <Alert variant="warning">
                  This password reset link has expired. Password reset links are valid for 1 hour.
                </Alert>
                <div className="text-center mt-4">
                  <Button 
                    variant="primary"
                    onClick={() => navigate('/login')}
                  >
                    Return to Login
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }
  
  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <Card className="shadow-sm">
            <Card.Body className="p-4">
              <h2 className="text-center mb-4">Reset Your Password</h2>
              
              {successMessage && (
                <Alert variant="success">{successMessage}</Alert>
              )}
              
              {(error || localError) && (
                <Alert variant="danger">{localError || error}</Alert>
              )}
              
              <Form noValidate validated={validated} onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="formNewPassword">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={loading || !!successMessage}
                  />
                  <Form.Control.Feedback type="invalid">
                    Password must be at least 8 characters.
                  </Form.Control.Feedback>
                </Form.Group>
                
                <Form.Group className="mb-3" controlId="formConfirmPassword">
                  <Form.Label>Confirm Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={loading || !!successMessage}
                  />
                  <Form.Control.Feedback type="invalid">
                    Passwords must match.
                  </Form.Control.Feedback>
                </Form.Group>
                
                <div className="d-grid gap-2">
                  <Button 
                    variant="primary" 
                    type="submit"
                    disabled={loading || !!successMessage}
                  >
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                        <span className="ms-2">Resetting Password...</span>
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </div>
              </Form>
              
              <div className="text-center mt-3">
                <a href="/login" className="text-decoration-none">Back to Login</a>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ResetPassword;
