import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store.js';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute renders its children only when the user is authenticated.
 * In dev mode, AuthProvider immediately sets isAuthenticated=true so this
 * never redirects. In prod, unauthenticated users are sent to /login
 * (which initiates the Cognito PKCE redirect — implemented in T14/T27).
 */
export function ProtectedRoute({ children }: ProtectedRouteProps): React.ReactElement {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
