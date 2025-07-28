import React, { useState } from "react";
import "./AddPostModal.css";

export default function AddPostModal({ onClose, onSubmit, isSubmitting = false }) {
  const [formData, setFormData] = useState({
    type: "lost",
    title: "",
    description: "",
    location: "",
    contact: "",
    image: null
  });
  
  const [imagePreview, setImagePreview] = useState(null);

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
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          image: "Please select a valid image file"
        }));
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          image: "Image size must be less than 5MB"
        }));
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        image: file
      }));
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      // Clear any previous errors
      if (errors.image) {
        setErrors(prev => ({
          ...prev,
          image: ""
        }));
      }
    }
  };
  
  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null
    }));
    setImagePreview(null);
    
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
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
    console.log('AddPostModal - Form submission initiated');
    console.log('AddPostModal - Current form data:', formData);
    
    if (validateForm()) {
      console.log('AddPostModal - Form validation passed');
      
      try {
        // Create a FormData object for the API call
        const formDataToSubmit = new FormData();
        
        // Add all text fields to FormData
        formDataToSubmit.append('type', formData.type);
        formDataToSubmit.append('title', formData.title);
        formDataToSubmit.append('description', formData.description);
        formDataToSubmit.append('location', formData.location);
        formDataToSubmit.append('contact', formData.contact);
        
        // Add image file if present
        if (formData.image && formData.image instanceof File) {
          console.log('AddPostModal - Adding image to FormData:', formData.image.name);
          formDataToSubmit.append('image', formData.image);
        }
        
        console.log('AddPostModal - FormData created successfully');
        
        // Log FormData entries for debugging
        console.log('AddPostModal - FormData entries:');
        for (let pair of formDataToSubmit.entries()) {
          console.log(pair[0] + ': ' + (pair[1] instanceof File ? 
            `File: ${pair[1].name} (${pair[1].size} bytes)` : pair[1]));
        }
        
        console.log('AddPostModal - Submitting FormData to parent component');
        onSubmit(formDataToSubmit);
      } catch (error) {
        console.error('AddPostModal - Error preparing form data:', error);
        setErrors(prev => ({
          ...prev,
          form: 'Error preparing form data: ' + error.message
        }));
      }
    } else {
      console.log('AddPostModal - Form validation failed:', errors);
    }
  };

  const handleClose = () => {
    setFormData({
      type: "lost",
      title: "",
      description: "",
      location: "",
      contact: "",
      image: null
    });
    setImagePreview(null);
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

          {/* Image Upload (Optional) */}
          <div className="form-group">
            <label className="form-label">Image (Optional)</label>
            <div className="image-upload-container">
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={handleImageChange}
                className="image-input"
                style={{ display: 'none' }}
              />
              
              {!imagePreview ? (
                <label htmlFor="image-upload" className="image-upload-label">
                  <div className="upload-placeholder">
                    <svg className="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Click to upload image</span>
                    <span className="upload-hint">PNG, JPG up to 5MB</span>
                  </div>
                </label>
              ) : (
                <div className="image-preview-container">
                  <img src={imagePreview} alt="Preview" className="image-preview" />
                  <button type="button" onClick={removeImage} className="remove-image-btn">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            {errors.image && <span className="error-message">{errors.image}</span>}
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