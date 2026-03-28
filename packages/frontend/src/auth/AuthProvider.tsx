import React, { useEffect } from 'react';
import { useAuthStore } from '../store/auth-store.js';

interface AuthProviderProps {
  children: React.ReactNode;
}

const DEV_MODE = !import.meta.env.VITE_COGNITO_DOMAIN;

/**
 * AuthProvider handles authentication state.
 *
 * Dev mode (no VITE_COGNITO_DOMAIN): skips auth entirely, marks the user
 * as authenticated immediately. The API client sends no Authorization header
 * and the backend dev middleware accepts all requests.
 *
 * Prod mode: PKCE OAuth 2.0 flow (implemented in T14 alongside T27 deployment).
 */
export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const { setAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (DEV_MODE && !isAuthenticated) {
      // In dev mode, bypass auth entirely — treat as authenticated with no token.
      // The store's setAuth requires a token string, so we use a sentinel value.
      setAuth('dev-token');
    }
  }, [isAuthenticated, setAuth]);

  return <>{children}</>;
}
