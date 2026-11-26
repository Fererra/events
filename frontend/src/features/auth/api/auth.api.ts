import { api } from '../../../shared/api/client';
import { useAuthStore, type TokenPair, type User } from '../store/auth.store';

export interface RegisterInput {
  surname: string;
  name: string;
  phone: string;
  email: string;
  password: string;
}

export const fetchMe = (signal?: AbortSignal) => api<User>('/me', { signal });

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

export async function register(input: RegisterInput): Promise<User> {
  await api('/auth/register', { method: 'POST', body: input, auth: false });
  return login(input.email, input.password);
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
