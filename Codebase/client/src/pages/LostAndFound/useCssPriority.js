/**
 * Custom hook to dynamically inject CSS with highest priority
 * This ensures the Lost and Found CSS overrides all other styles
 */

import { useEffect } from 'react';

const useCssPriority = (cssPath) => {
  useEffect(() => {
    // Create a new link element
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = cssPath;
    linkElement.id = 'high-priority-css';
    
    // Remove any existing high priority CSS
    const existingLink = document.getElementById('high-priority-css');
    if (existingLink) {
      existingLink.remove();
    }
    
    // Append to the end of head to ensure it's loaded last
    document.head.appendChild(linkElement);
    
    // Cleanup function
    return () => {
      const link = document.getElementById('high-priority-css');
      if (link) {
        link.remove();
      }
    };
  }, [cssPath]);
};

export default useCssPriority;