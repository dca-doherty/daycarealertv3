import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Container, Row, Col, Card, Alert, Button, Spinner } from 'react-bootstrap';

  // Base API URL from the environment or default
  const API_URL = process.env.REACT_APP_API_URL
    ? `${process.env.REACT_APP_API_URL}/api`
    : (process.env.NODE_ENV === 'production'
      ? 'https://api.daycarealert.com/api'
      : 'http://localhost:8084/api');

  const VerifyEmail = () => {
    const { token } = useParams();
    const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
    const [message, setMessage] = useState('');

    useEffect(() => {
      const verifyEmail = async () => {
        if (!token) {
          setStatus('error');
          setMessage('Invalid verification link. No token provided.');
          return;
        }

        try {
          // Make request to verification endpoint
          const response = await axios.get(`${API_URL}/auth/verify/${token}`);

          if (response.data && response.data.success) {
            setStatus('success');
            setMessage('Your email has been successfully verified! You can now access all features of your account.');
          } else {
            setStatus('error');
            setMessage(response.data?.message || 'An error occurred during verification.');
          }
        } catch (error) {
          setStatus('error');
          setMessage(
            error.response?.data?.message ||
            'Email verification failed. The link may be expired or invalid.'
          );
          console.error('Verification error:', error);
        }
      };

      verifyEmail();
    }, [token]);

    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={8}>
            <Card className="shadow-sm">
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <img
                    src="/logo192.png"
                    alt="DaycareAlert Logo"
                    style={{ width: '80px', marginBottom: '20px' }}
                  />
                  <h2>Email Verification</h2>
                </div>

                {status === 'verifying' && (
                  <div className="text-center my-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Verifying your email address...</p>
                  </div>
                )}

                {status === 'success' && (
                  <Alert variant="success">
                    <Alert.Heading className="text-center">Verification Successful!</Alert.Heading>
                    <p>{message}</p>
                    <hr />
                    <div className="d-flex justify-content-center">
                      <Link to="/home">
                        <Button variant="outline-success">Go to Homepage</Button>
                      </Link>
                    </div>
                  </Alert>
                )}

                {status === 'error' && (
                  <Alert variant="danger">
                    <Alert.Heading className="text-center">Verification Failed</Alert.Heading>
                    <p>{message}</p>
                    <hr />
                    <div className="d-flex justify-content-center">
                      <Link to="/home">
                        <Button variant="outline-primary" className="me-2">Go to Homepage</Button>
                      </Link>
                    </div>
                  </Alert>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  };

  export default VerifyEmail;
