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

  // Check if token exists and is valid
  const isTokenValid = (token: string | null): boolean => {
    if (!token) return false;
    try {
      const decoded: any = jwtDecode(token);
      return decoded.exp * 1000 > Date.now();
    } catch (error) {
      return false;
    }
  };

  // If no valid token, redirect to login
  if (!isTokenValid(token)) {
    return <Navigate to="/login" replace />;
  }

  // Check role permissions
  const hasPermission = () => {
    // Admin role check
    if (allowedRoles.includes('Admin') && userRole === 'Admin') {
      return true;
    }
    
    // Clerk role check
    if (allowedRoles.includes('Clerk') && userRole === 'Clerk') {
      return true;
    }
    
    // Customer role check (userTypeId = 3)
    if (allowedRoles.includes('Customer') && userTypeId === '3') {
      return true;
    }
    
    return false;
  };

  // If user doesn't have permission, redirect to unauthorized
  if (!hasPermission()) {
    return <Navigate to="/unauthorized" replace />;
  }

  // User is authenticated and has permission
  return <>{children}</>;
};

export default RequireRole;