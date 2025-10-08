import React, { useState } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';

const RegisterForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  
  const [validated, setValidated] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { register, loading, error, clearError } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Check password match if confirm password field is changed
    if (name === 'confirmPassword' || name === 'password') {
      const passwordsMatch = 
        name === 'confirmPassword' 
          ? value === formData.password
          : formData.confirmPassword === value;
      
      setPasswordMatch(passwordsMatch);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    // Clear previous errors
    clearError();
    console.log('Form submission started');
    // Form validation
    if (form.checkValidity() === false || !passwordMatch) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    // Remove confirmPassword before sending to API
    const { confirmPassword, ...registrationData } = formData;
    console.log('Attempting registration with data:', registrationData);
    // Attempt registration
    const success = await register(registrationData);
    console.log('Registration result - success:', success);
    
    if (success) {
      console.log('Registration successful, setting success state');
      setRegistrationSuccess(true);
      if (onSuccess) {
        console.log('Calling onSuccess callback');
        setTimeout(() => {
          onSuccess();
        }, 5500);
      }
    } else {
      console.log('Registration did not succeed');
    }
  };

  return (
    <Form noValidate validated={validated} onSubmit={handleSubmit}>
      {error && <Alert variant="danger">{error}</Alert>}
      {registrationSuccess && (
         <Alert variant="success">
           <Alert.Heading>Registration successful!</Alert.Heading>
           <p>Please check your email to verify your account. You will need to click the verification link we sent to <strong>{formData.email}</strong> to complete the registration process.</p>
         </Alert>
      )}

      <Form.Group className="mb-3" controlId="formUsername">
        <Form.Label>Username</Form.Label>
        <Form.Control
          type="text"
          name="username"
          placeholder="Choose a username"
          value={formData.username}
          onChange={handleChange}
          required
        />
        <Form.Control.Feedback type="invalid">
          Please choose a username.
        </Form.Control.Feedback>
      </Form.Group>

      <Form.Group className="mb-3" controlId="formEmail">
        <Form.Label>Email address</Form.Label>
        <Form.Control
          type="email"
          name="email"
          placeholder="Enter email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <Form.Control.Feedback type="invalid">
          Please provide a valid email.
        </Form.Control.Feedback>
      </Form.Group>

      <Form.Group className="mb-3" controlId="formPassword">
        <Form.Label>Password</Form.Label>
        <Form.Control
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          minLength={8}
        />
        <Form.Control.Feedback type="invalid">
          Password must be at least 8 characters.
        </Form.Control.Feedback>
      </Form.Group>

      <Form.Group className="mb-3" controlId="formConfirmPassword">
        <Form.Label>Confirm Password</Form.Label>
        <Form.Control
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          isInvalid={validated && !passwordMatch}
        />
        <Form.Control.Feedback type="invalid">
          Passwords do not match.
        </Form.Control.Feedback>
      </Form.Group>

      <Form.Group className="mb-3" controlId="formFirstName">
        <Form.Label>First Name</Form.Label>
        <Form.Control
          type="text"
          name="firstName"
          placeholder="First Name"
          value={formData.firstName}
          onChange={handleChange}
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId="formLastName">
        <Form.Label>Last Name</Form.Label>
        <Form.Control
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={handleChange}
        />
      </Form.Group>

      <Button variant="primary" type="submit" disabled={loading || registrationSuccess}>
        {loading ? (
          <>
            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
            <span className="ms-2">Registering...</span>
          </>
        ) : (
          'Register'
        )}
      </Button>
    </Form>
  );
};

export default RegisterForm;
