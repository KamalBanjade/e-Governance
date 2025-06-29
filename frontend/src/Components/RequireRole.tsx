import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';


interface RequireRoleProps {
  children: ReactNode;
  allowedRoles: number[];
  userTypeId: number;
}

const RequireRole = ({ children, allowedRoles, userTypeId }: RequireRoleProps) => {
  if (!allowedRoles.includes(userTypeId)) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
};

export default RequireRole;
