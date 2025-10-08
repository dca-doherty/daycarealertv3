import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import devAuthService from '../services/devAuthService';

// Create the auth context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children, value: contextValue }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract showAuthModal from the context value if provided
  const showAuthModal = contextValue?.showAuthModal;

  // Check if user is already logged in
  useEffect(() => {
    const loadUserFromToken = async () => {
      if (!token) {
        // Disable auto-login for better user testing
        console.log('No token found, user needs to log in manually');
        setLoading(false);
        return;
      }

      try {
        // Set token in axios default headers
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        try {
          // Fetch user data
          const response = await api.get('/auth/me');
          
          if (response.data.success) {
            setUser(response.data.user);
          } else {
            // Clear invalid token
            localStorage.removeItem('token');
            setToken(null);
            api.defaults.headers.common['Authorization'] = null;
            
            // Try dev auth in development mode
            if (process.env.NODE_ENV === 'development') {
              console.log('Invalid token, trying auto-login in development mode...');
              
              try {
                const devResponse = await devAuthService.devLogin();
                setToken(devResponse.token);
                setUser(devResponse.user);
                console.log('Auto-login successful:', devResponse.user);
              } catch (devError) {
                console.log('Auto-login failed, user will need to manually log in');
              }
            }
          }
        } catch (apiErr) {
          console.error('API fetch error:', apiErr);
          console.log('API error details:', {
            message: apiErr.message,
            response: apiErr.response,
            status: apiErr.response?.status,
            data: apiErr.response?.data
          });
          // Clear invalid token
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          api.defaults.headers.common['Authorization'] = null;
        }
      } catch (err) {
        console.error('Error loading user from token:', err);
        // Clear invalid token
        localStorage.removeItem('token');
        setToken(null);
        api.defaults.headers.common['Authorization'] = null;
        
        // Disable auto-login for better testing
        console.log('Token error, user needs to log in manually');
      } finally {
        setLoading(false);
      }
    };

    loadUserFromToken();
  }, [token]);

  // Login user
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      // Try the production login flow first
      try {
        const response = await api.post('/auth/login', { email, password });

        if (response.data.success) {
          const { token: newToken, user: userData } = response.data;
          
          // Save token to localStorage
          localStorage.setItem('token', newToken);
          
          // Update state
          setToken(newToken);
          setUser(userData);
          
          // Set token in axios default headers
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          alert('Registration successful! Please check your email to verify your account.');
          return true;
        }
      } catch (loginError) {
        console.log('Standard login failed, trying development login:', loginError.message);
        
        // If production login fails and we're in development, try the dev login
        if (process.env.NODE_ENV === 'development') {
          try {
            const devResponse = await devAuthService.devLogin(email, password);
            
            // Update state with dev login results
            setToken(devResponse.token);
            setUser(devResponse.user);
            
            console.log('Development login successful:', devResponse.user);
            return true;
          } catch (devError) {
            console.error('Development login also failed:', devError);
            throw devError;
          }
        } else {
          // In production, just throw the original error
          throw loginError;
        }
      }
      
      // If we get here, login failed
      setError('Login failed');
      return false;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Register user
  const register = async (userData) => {
    try {
      console.log('AuthContext: Starting registration');
      setLoading(true);
      setError(null);

      try {
        // Try standard registration
        console.log('AuthContext: Sending API request');
        const response = await api.post('/auth/register', userData);
        console.log('AuthContext: API response:', response.data);

        if (response.data.success) {
          const { token: newToken, user: newUser } = response.data;
          
          // Save token to localStorage
          localStorage.setItem('token', newToken);
          
          // Update state
          setToken(newToken);
          setUser(newUser);
          
          // Set token in axios default headers
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          console.log('AuthContext: Registration successful');
          return true;
        }
      } catch (registerError) {
        console.log('AuthContext: Standard registration failed:', registerError.message);
        
        // If production registration fails and we're in development, use dev login
        if (process.env.NODE_ENV === 'development') {
          try {
            const devResponse = await devAuthService.devLogin(
              userData.email,
              userData.password,
              userData.username
            );
            
            // Update state with dev login results
            setToken(devResponse.token);
            setUser(devResponse.user);
            
            console.log('Development registration successful:', devResponse.user);
            alert('Registration successful! Please check your email to verify your account.');
            return true;
          } catch (devError) {
            console.error('Development registration also failed:', devError);
            throw devError;
          }
        } else {
          // In production, just throw the original error
          throw registerError;
        }
      }
      
      // If we get here, registration failed
      console.log('AuthContext: Registration failed - default path');
      setError('Registration failed');
      return false;
    } catch (err) {
      console.log('AuthContext: Registration error:', err);
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
      console.log('AuthContext: Registration process complete');
    }
  };

  // Logout user
  const logout = async () => {
    try {
      setLoading(true);
      
      // Call logout API if user is logged in
      if (token) {
        try {
          await api.post('/auth/logout');
        } catch (err) {
          console.error('Error during logout:', err);
          // Continue with client-side logout even if server logout fails
        }
      }

      // Clear token from localStorage
      localStorage.removeItem('token');
      
      // Update state
      setToken(null);
      setUser(null);
      
      // Remove token from axios default headers
      api.defaults.headers.common['Authorization'] = null;
      
      return true;
    } catch (err) {
      console.error('Logout error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => !!token && !!user;
  
  // Check if user is an admin
  const isAdmin = () => !!user && user.role === 'admin';

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.put('/users/profile', profileData);

      if (response.data.success) {
        // Update user state with new profile data
        setUser({ ...user, ...response.data.user });
        return true;
      } else {
        setError(response.data.message || 'Failed to update profile');
        return false;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update profile. Please try again.';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.put('/users/password', {
        currentPassword,
        newPassword
      });

      if (response.data.success) {
        return true;
      } else {
        setError(response.data.message || 'Failed to change password');
        return false;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to change password. Please try again.';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Request password reset
  const requestPasswordReset = async (email) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/auth/forgot-password', { email });

      if (response.data.success) {
        return true;
      } else {
        setError(response.data.message || 'Failed to request password reset');
        return false;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to request password reset. Please try again.';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Reset password with token
  const resetPassword = async (token, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/auth/reset-password', {
        token,
        password
      });

      if (response.data.success) {
        return true;
      } else {
        setError(response.data.message || 'Failed to reset password');
        return false;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to reset password. Please try again.';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Clear error
  const clearError = () => setError(null);

  // Provide context values
  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    requestPasswordReset,
    resetPassword,
    clearError,
    // Use the showAuthModal function from context value
    showAuthModal
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
