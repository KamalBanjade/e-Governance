import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

interface RequireRoleProps {
  allowedRoles: string[];
  children: ReactNode;
}

const RequireRole = ({ allowedRoles, children }: RequireRoleProps) => {
  const token = localStorage.getItem('authToken');
  const userRole = localStorage.getItem('userRole');

  // Add debug logging
  console.log('RequireRole Debug:');
  console.log('  Token:', token ? 'exists' : 'missing');
  console.log('  UserRole:', userRole);
  console.log('  AllowedRoles:', allowedRoles);
  console.log('  RoleCheck:', userRole ? allowedRoles.includes(userRole) : false);

  const isTokenExpired = (token: string): boolean => {
    try {
      const decoded: any = jwtDecode(token);
      const isExpired = decoded.exp * 1000 < Date.now();
      console.log('Token check - expired:', isExpired);
      console.log('Token check - exp:', decoded.exp);
      console.log('Token check - now:', Date.now());
      return isExpired;
    } catch (error) {
      console.log('Token decode error:', error);
      return true;
    }
  };

  if (!token || isTokenExpired(token)) {
    console.log('Redirecting to login - token invalid or expired');
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    console.log('Redirecting to unauthorized - role check failed:');
    console.log('  UserRole:', userRole);
    console.log('  AllowedRoles:', allowedRoles);
    console.log('  HasRole:', !!userRole);
    console.log('  RoleAllowed:', userRole ? allowedRoles.includes(userRole) : false);
    return <Navigate to="/unauthorized" replace />;
  }

  console.log('Access granted for role:', userRole);
  return <>{children}</>;
};

export default RequireRole;