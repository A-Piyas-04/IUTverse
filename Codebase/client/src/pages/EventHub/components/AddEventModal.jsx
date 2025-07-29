import React from "react";
import "./AddEventModal.css";

export default function AddEventModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const handleEmailClick = () => {
    window.location.href = "mailto:ahnafpias@iut-dhaka.edu?subject=Event Submission Request&body=Hello,%0D%0A%0D%0AI would like to submit an event for the IUT Event Hub.%0D%0A%0D%0APlease include the following details:%0D%0A- Event Title:%0D%0A- Event Type (General/Club/Sports):%0D%0A- Club Name (if applicable):%0D%0A- Date and Time:%0D%0A- Location:%0D%0A- Description:%0D%0A- Category:%0D%0A- Contact Information:%0D%0A%0D%0AThank you!";
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("ahnafpias@iut-dhaka.edu");
    alert("Email address copied to clipboard!");
  };

  return (
    <div className="add-event-modal-overlay" onClick={onClose}>
      <div className="add-event-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <span className="modal-icon">📝</span>
            Add Your Event
          </h2>
          <button className="modal-close-btn" onClick={onClose}>
            <span className="close-icon">✕</span>
          </button>
        </div>

        <div className="modal-content">
          <div className="info-section">
            <div className="info-icon">📧</div>
            <h3 className="info-title">Submit Your Event</h3>
            <p className="info-description">
              Want to add your event to the IUT Event Hub? Email us ASAP and our team will add your event after verification.
            </p>
          </div>

          <div className="email-section">
            <div className="email-display">
              <span className="email-label">Email Address:</span>
              <span className="email-address">ahnafpias@iut-dhaka.edu</span>
            </div>
            
            <div className="email-actions">
              <button className="email-btn primary" onClick={handleEmailClick}>
                <span className="btn-icon">📧</span>
                Send Email
              </button>
              <button className="email-btn secondary" onClick={handleCopyEmail}>
                <span className="btn-icon">📋</span>
                Copy Email
              </button>
            </div>
          </div>

          <div className="guidelines-section">
            <h4 className="guidelines-title">📋 Submission Guidelines</h4>
            <ul className="guidelines-list">
              <li>Include complete event details (title, date, time, location)</li>
              <li>Provide a clear description of the event</li>
              <li>Specify the event type and category</li>
              <li>Include contact information for verification</li>
              <li>Allow 24-48 hours for review and approval</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-close-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}