import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './PageTransition.css';

const PageTransition = ({ children }) => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayLocation, setDisplayLocation] = useState(location);

  useEffect(() => {
    if (location !== displayLocation) {
      setIsTransitioning(true);
      
      // Start transition out
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setIsTransitioning(false);
      }, 300); // Match the CSS transition duration

      return () => clearTimeout(timer);
    }
  }, [location, displayLocation]);

  return (
    <div className={`page-transition ${isTransitioning ? 'transitioning' : ''}`}>
      {children}
    </div>
  );
};

export default PageTransition; 