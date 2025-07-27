import { Navigate } from 'react-router-dom';
import { authUtils } from '../utils/auth.js';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = authUtils.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export default ProtectedRoute;
