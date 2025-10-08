import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import axios from 'axios';
import envConfig from '../utils/envConfig';

const ResourceModal = ({ show, handleClose, onResourceAdded, editResource = null }) => {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    category: ''
  });
  
  const [categories, setCategories] = useState([]);
  const [validated, setValidated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE_URL = envConfig.API_BASE_URL;

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/resource-categories`);
      setCategories(response.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories. Please try again later.');
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    if (show) {
      fetchCategories();
      
      // Reset form when opening modal
      if (editResource) {
        setFormData({
          title: editResource.title || '',
          url: editResource.url || '',
          description: editResource.description || '',
          category: editResource.category?._id || editResource.category || ''
        });
      } else {
        setFormData({
          title: '',
          url: '',
          description: '',
          category: ''
        });
      }
      
      setValidated(false);
      setError(null);
    }
  }, [show, editResource, fetchCategories]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      let response;
      
      if (editResource) {
        response = await axios.put(`${API_BASE_URL}/api/resources/${editResource._id}`, formData);
      } else {
        response = await axios.post(`${API_BASE_URL}/api/resources`, formData);
      }
      
      onResourceAdded(response.data);
      handleClose();
    } catch (err) {
      console.error('Error saving resource:', err);
      setError(err.response?.data?.message || 'Failed to save resource. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered aria-labelledby="resource-modal-title">
      <Modal.Header closeButton>
        <Modal.Title id="resource-modal-title">
          {editResource ? 'Edit Resource' : 'Add New Resource'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <div className="alert alert-danger">{error}</div>}
        
        <Form noValidate validated={validated} onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="resourceTitle">
            <Form.Label>Title</Form.Label>
            <Form.Control
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter resource title"
            />
            <Form.Control.Feedback type="invalid">
              Please provide a title.
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="resourceUrl">
            <Form.Label>URL</Form.Label>
            <Form.Control
              type="url"
              name="url"
              value={formData.url}
              onChange={handleChange}
              required
              placeholder="https://example.com"
            />
            <Form.Control.Feedback type="invalid">
              Please provide a valid URL.
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="resourceDescription">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Describe this resource"
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="resourceCategory">
            <Form.Label>Category</Form.Label>
            <Form.Select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">
              Please select a category.
            </Form.Control.Feedback>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit} 
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Resource'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ResourceModal;