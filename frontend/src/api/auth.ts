import { api } from './client';
import { useAuthStore, type TokenPair, type User } from '../store/auth';

export const fetchMe = () => api<User>('/me');

export async function login(email: string, password: string): Promise<User> {
  const pair = await api<TokenPair>('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  useAuthStore.getState().setTokens(pair);
  try {
    const user = await fetchMe();
    useAuthStore.getState().setUser(user);
    return user;
  } catch (e) {
    useAuthStore.getState().clear();
    throw e;
  }
}

export async function register(email: string, password: string): Promise<User> {
  await api('/auth/register', { method: 'POST', body: { email, password }, auth: false });
  return login(email, password);
}

export async function logout(): Promise<void> {
  const { refreshToken, clear } = useAuthStore.getState();
  try {
    if (refreshToken)
      await api('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false });
  } catch {
  } finally {
    clear();
  }
}
