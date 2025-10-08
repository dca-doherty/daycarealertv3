/**
 * Development authentication service
 * Provides simplified authentication for development environment
 */
import axios from 'axios';

// Hard-code the API URL to port 8081 since we know that's the backend port
const API_URL = 'http://localhost:8081/api';

console.log('devAuthService using API URL:', API_URL);

/**
 * Simplified login for development that automatically creates test users
 * @param {string} email - The email address for the user
 * @param {string} password - The password for the user
 * @param {string} username - Optional username (defaults to email prefix)
 * @returns {Promise<Object>} The login response with user and token
 */
export const devLogin = async (email = 'test@example.com', password = 'Password123!', username = '') => {
  try {
    const response = await axios.post(`${API_URL}/testing/direct-login`, {
      email,
      password,
      username: username || email.split('@')[0]
    });

    if (response.data.success) {
      // Store the token in localStorage
      localStorage.setItem('token', response.data.token);
      
      // Set the token in default headers for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      return response.data;
    } else {
      throw new Error(response.data.message || 'Login failed');
    }
  } catch (error) {
    console.error('Dev login error:', error);
    throw error;
  }
};

/**
 * Test if authentication is working
 * @param {string} token - JWT token
 * @returns {Promise<boolean>} True if authentication works
 */
export const testAuth = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/testing/auth-test`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data.success;
  } catch (error) {
    console.error('Auth test error:', error);
    return false;
  }
};

/**
 * Get the current authentication status
 * @returns {boolean} True if the user is logged in
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

/**
 * Log out the current user
 */
export const devLogout = () => {
  localStorage.removeItem('token');
  delete axios.defaults.headers.common['Authorization'];
};

// Export a simple auto-login function for development
export const autoLogin = async () => {
  try {
    if (!isAuthenticated()) {
      console.log('Auto-login for development...');
      const result = await devLogin();
      console.log('Auto-login successful:', result.user);
      return result.user;
    } else {
      console.log('Already authenticated, skipping auto-login');
      return null;
    }
  } catch (error) {
    console.error('Auto-login failed:', error);
    return null;
  }
};

export default {
  devLogin,
  testAuth,
  isAuthenticated,
  devLogout,
  autoLogin
};