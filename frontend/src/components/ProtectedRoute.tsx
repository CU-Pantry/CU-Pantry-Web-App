import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import type { StaffPermissionKey } from '../data/fakeData';
import type { ReactElement } from 'react';

type ProtectedRouteProps = {
  requiredPermission?: StaffPermissionKey;
  managerOnly?: boolean;
  children?: ReactElement;
};

export function ProtectedRoute({ requiredPermission, managerOnly = false, children }: ProtectedRouteProps = {}) {
  const { isAuthenticated, user, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (managerOnly && user?.role !== 'manager') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ?? <Outlet />;
}
