import { create } from 'zustand';

/** Auth state shape. idToken is null in dev mode (no JWT required). */
export interface AuthState {
  isAuthenticated: boolean;
  idToken: string | null;
  setAuth: (idToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  idToken: null,
  setAuth: (idToken: string) => set({ isAuthenticated: true, idToken }),
  clearAuth: () => set({ isAuthenticated: false, idToken: null }),
}));
