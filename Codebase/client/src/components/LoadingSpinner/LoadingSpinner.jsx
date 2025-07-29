import React from "react";
import "./LoadingSpinner.css";

const LoadingSpinner = ({ size = "medium", message }) => {
  return (
    <div className={`loading-spinner ${size}`}>
      <div className="spinner"></div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
