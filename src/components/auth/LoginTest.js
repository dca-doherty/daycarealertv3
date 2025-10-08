import React, { useState } from 'react';
import { Button, Form, Alert } from 'react-bootstrap';

const LoginTest = () => {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTestLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log(`Testing login with ${email} / ${password}`);
      
      // First, check if the server is running
      try {
        const healthCheck = await fetch('http://localhost:8082/api/health', {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        console.log('Health check status:', healthCheck.status);
        if (healthCheck.ok) {
          console.log('Health check OK - server is running');
        } else {
          console.warn('Health check failed - server may not be running correctly');
        }
      } catch (healthError) {
        console.error('Health check failed - server is not running:', healthError);
        throw new Error('Server connection failed: Is the backend server running on port 5001?');
      }
      
      // Now try the login
      const response = await fetch('http://localhost:8082/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Unexpected content type:', contentType);
        const text = await response.text();
        console.log('Raw response:', text.substring(0, 500));
        throw new Error(`Expected JSON response but got: ${contentType}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        setResult(data);
        localStorage.setItem('token', data.token);
      } else {
        setError(data.message || 'Login failed without specific error');
      }
    } catch (err) {
      console.error('Login test error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h3>Login Test Tool</h3>
      
      <Form onSubmit={handleTestLogin}>
        <Form.Group className="mb-3">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="admin123"
          />
        </Form.Group>
        
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? 'Testing...' : 'Test Login'}
        </Button>
      </Form>
      
      {error && (
        <Alert variant="danger" className="mt-3">
          <strong>Error:</strong> {error}
        </Alert>
      )}
      
      {result && (
        <div className="mt-3">
          <Alert variant="success">
            <strong>Success!</strong> Login successful.
          </Alert>
          
          <div className="mt-3">
            <h5>Response Details:</h5>
            <pre className="bg-light p-3 rounded">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
          
          <div className="mt-3">
            <h5>Token has been saved to localStorage</h5>
            <p>You should now be able to navigate to the admin dashboard.</p>
            
            <Button 
              variant="success" 
              href="/admin"
              className="mt-2"
            >
              Go to Admin Dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginTest;