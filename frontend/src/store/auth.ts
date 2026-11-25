import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface TokenPair {
  tokenType: 'Bearer';
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setTokens: (pair: Pick<TokenPair, 'accessToken' | 'refreshToken'>) => void;
  setUser: (user: User) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'es-auth' },
  ),
);

export const useIsAuthed = () => useAuthStore((s) => s.refreshToken !== null);
export const useRole = () => useAuthStore((s) => s.user?.role ?? null);
