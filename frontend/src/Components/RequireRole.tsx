import React from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

interface RequireRoleProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

const RequireRole: React.FC<RequireRoleProps> = ({ allowedRoles, children }) => {
  const token = localStorage.getItem('authToken');
  const userRole = localStorage.getItem('userRole');
  const userTypeId = localStorage.getItem('userTypeId');

  // Debug logging - remove in production
  console.log('RequireRole Debug:', {
    token: token ? 'exists' : 'missing',
    userRole,
    userTypeId,
    allowedRoles,
    pathname: window.location.pathname
  });

  // Check if token exists and is valid
  const isTokenValid = (token: string | null): boolean => {
    if (!token) return false;
    try {
      const decoded: any = jwtDecode(token);
      return decoded.exp * 1000 > Date.now();
    } catch (error) {
      console.error('Token decode error:', error);
      return false;
    }
  };

  // If no valid token, redirect to login
  if (!isTokenValid(token)) {
    console.log('Invalid token, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check role permissions
  const hasPermission = (): boolean => {
    // Simple role-based check - if userRole matches any allowed role
    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    // Legacy Customer check using userTypeId (if you need this specific logic)
    if (allowedRoles.includes('Customer') && userTypeId === '3' && userRole === 'Customer') {
      return true;
    }
    
    return false;
  };

  const permitted = hasPermission();
  
  // Debug logging
  console.log('Permission check:', {
    userRole,
    allowedRoles,
    permitted,
    redirectingToUnauthorized: !permitted
  });

  // If user doesn't have permission, redirect to unauthorized
  if (!permitted) {
    return <Navigate to="/unauthorized" replace />;
  }

  // User is authenticated and has permission
  return <>{children}</>;
};

export default RequireRole;