import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [validated, setValidated] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const { requestPasswordReset, loading, error, clearError } = useAuth();
  
  // Clear any auth context errors when mounting
  useEffect(() => {
    clearError();
  }, [clearError]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    // Clear previous errors
    clearError();
    
    // Form validation
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    // Attempt to request password reset
    const success = await requestPasswordReset(email);
    
    if (success) {
      setSuccessMessage(`If your email is registered, you will receive a password reset link at ${email}. Please check your inbox and spam folders.`);
      setEmail(''); // Clear the email field
    }
  };
  
  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <Card className="shadow-sm">
            <Card.Body className="p-4">
              <h2 className="text-center mb-4">Reset Your Password</h2>
              
              {successMessage ? (
                <>
                  <Alert variant="success">{successMessage}</Alert>
                  <div className="text-center mt-3">
                    <a href="/login" className="text-decoration-none">Return to Login</a>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-center text-muted mb-4">
                    Enter your email address below and we'll send you a link to reset your password.
                  </p>
                  
                  {error && (
                    <Alert variant="danger">{error}</Alert>
                  )}
                  
                  <Form noValidate validated={validated} onSubmit={handleSubmit}>
                    <Form.Group className="mb-4" controlId="formEmail">
                      <Form.Label>Email address</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        Please provide a valid email.
                      </Form.Control.Feedback>
                    </Form.Group>
                    
                    <div className="d-grid gap-2">
                      <Button 
                        variant="primary" 
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                            <span className="ms-2">Sending...</span>
                          </>
                        ) : (
                          'Send Reset Link'
                        )}
                      </Button>
                    </div>
                  </Form>
                  
                  <div className="text-center mt-3">
                    <a href="/login" className="text-decoration-none">Back to Login</a>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ForgotPassword;
