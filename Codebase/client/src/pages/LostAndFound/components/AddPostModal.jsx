import React, { useState } from "react";
import "./AddPostModal.css";

export default function AddPostModal({ onClose, onSubmit, isSubmitting = false }) {
  const [formData, setFormData] = useState({
    type: "lost",
    title: "",
    description: "",
    location: "",
    contact: "",
    image: ""
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    
    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    }
    
    if (!formData.contact.trim()) {
      newErrors.contact = "Contact information is required";
    } else if (!formData.contact.includes('@') && !formData.contact.includes('+')) {
      newErrors.contact = "Please provide a valid email or phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Add default image if none provided
      const postData = {
        ...formData,
        image: formData.image || `https://placehold.co/400x300/${formData.type === 'lost' ? 'ef4444' : '10b981'}/ffffff?text=${encodeURIComponent(formData.title)}`,
        user: "Current User" // In a real app, this would come from auth context
      };
      
      onSubmit(postData);
    }
  };

  const handleClose = () => {
    setFormData({
      type: "lost",
      title: "",
      description: "",
      location: "",
      contact: "",
      image: ""
    });
    setErrors({});
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add New Post</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Post Type Selection */}
          <div className="form-group">
            <label className="form-label">Post Type *</label>
            <div className="type-selector">
              <label className={`type-option ${formData.type === 'lost' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="type"
                  value="lost"
                  checked={formData.type === 'lost'}
                  onChange={handleInputChange}
                />
                <span className="type-icon">❌</span>
                <span className="type-text">Lost Item</span>
              </label>
              
              <label className={`type-option ${formData.type === 'found' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="type"
                  value="found"
                  checked={formData.type === 'found'}
                  onChange={handleInputChange}
                />
                <span className="type-icon">✅</span>
                <span className="type-text">Found Item</span>
              </label>
            </div>
          </div>

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`form-input ${errors.title ? 'error' : ''}`}
              placeholder={`${formData.type === 'lost' ? 'Lost' : 'Found'} item title...`}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={`form-textarea ${errors.description ? 'error' : ''}`}
              placeholder="Provide detailed description of the item..."
              rows="4"
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
          </div>

          {/* Location */}
          <div className="form-group">
            <label className="form-label">Location *</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className={`form-input ${errors.location ? 'error' : ''}`}
              placeholder="Where did you lose/find it?"
            />
            {errors.location && <span className="error-message">{errors.location}</span>}
          </div>

          {/* Contact Information */}
          <div className="form-group">
            <label className="form-label">Contact Information *</label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleInputChange}
              className={`form-input ${errors.contact ? 'error' : ''}`}
              placeholder="Email or phone number"
            />
            {errors.contact && <span className="error-message">{errors.contact}</span>}
          </div>

          {/* Image URL (Optional) */}
          <div className="form-group">
            <label className="form-label">Image URL (Optional)</label>
            <input
              type="url"
              name="image"
              value={formData.image}
              onChange={handleInputChange}
              className="form-input"
              placeholder="https://example.com/image.jpg"
            />
            <span className="form-hint">Leave empty to use a placeholder image</span>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={`submit-btn ${isSubmitting ? 'submitting' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="submit-spinner">⏳</span>
                  Creating...
                </>
              ) : (
                <>
                  <span className="submit-icon">📝</span>
                  Create Post
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}