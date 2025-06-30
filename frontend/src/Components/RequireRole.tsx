import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface RequireRoleProps {
  allowedRoles: string[];
  children: ReactNode;
}

const RequireRole = ({ allowedRoles, children }: RequireRoleProps) => {
  const token = localStorage.getItem('authToken');
  const userRole = localStorage.getItem('userRole');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default RequireRole;