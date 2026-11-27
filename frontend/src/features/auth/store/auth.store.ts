import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApiError } from '../../../shared/api/errors';

export type Role = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  surname?: string;
  name?: string;
  phone?: string;
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

export const useIsAuthed = () => useAuthStore((s) => s.user !== null && s.refreshToken !== null);
export const useRole = () => useAuthStore((s) => s.user?.role ?? null);

export function getUserDisplayName(user: Pick<User, 'name' | 'surname' | 'email'>): string {
  return [user.name?.trim(), user.surname?.trim()].filter(Boolean).join(' ') || user.email;
}

export function requireAuthUser(message = 'Please sign in to continue'): User {
  const { user, refreshToken } = useAuthStore.getState();
  if (!user || !refreshToken) {
    throw new ApiError(401, 'UNAUTHORIZED', message);
  }
  return user;
}

export function requireAdminUser(): User {
  const user = requireAuthUser();
  if (user.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Admin role is required');
  }
  return user;
}
