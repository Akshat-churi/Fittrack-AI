import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../utils/auth';

/**
 * Role-aware protected route wrapper.
 *
 * Props:
 *   requireRole  – 'USER' | 'ADMIN' | undefined
 *
 * Behaviour:
 *   • No requireRole  → auth check only (original behaviour)
 *   • requireRole='ADMIN' → must be logged in AND role === 'ADMIN'
 *                           (non-admins → '/')
 *   • requireRole='USER'  → must be logged in AND role !== 'ADMIN'
 *                           (admins → '/admin')
 */
const ProtectedRoute = ({ children, requireRole }) => {
  const user     = getCurrentUser();
  const location = useLocation();

  // Not logged in → auth page
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Admin trying to access USER-only routes → admin dashboard
  if (requireRole === 'USER' && user.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  // Non-admin trying to access ADMIN-only routes → home
  if (requireRole === 'ADMIN' && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
