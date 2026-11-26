import { ApiError } from '../../../shared/api/errors';
import { api } from '../../../shared/api/client';
import { useAuthStore, type TokenPair, type User } from '../store/auth.store';
import { isMockToken, mockFetchMe, mockLogin, mockRegister } from './auth.mock';

// Enabled by default so manual frontend verification works without DB writes
// and supports { surname, name, phone } prior to the backend schema update.
export const USE_AUTH_MOCK = import.meta.env.VITE_USE_AUTH_MOCK !== 'false';

export interface RegisterInput {
  surname: string;
  name: string;
  phone: string;
  email: string;
  password: string;
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
}

export async function fetchMe(signal?: AbortSignal): Promise<User> {
  const { accessToken } = useAuthStore.getState();
  if (USE_AUTH_MOCK || isMockToken(accessToken)) {
    assertNotAborted(signal);
    try {
      return mockFetchMe(accessToken);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore.getState().clear();
      }
      throw e;
    }
  }
  return api<User>('/me', { signal });
}

export async function login(email: string, password: string): Promise<User> {
  const pair = USE_AUTH_MOCK
    ? mockLogin(email, password)
    : await api<TokenPair>('/auth/login', {
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
  if (USE_AUTH_MOCK) {
    mockRegister(input);
    return login(input.email, input.password);
  }
  await api('/auth/register', { method: 'POST', body: input, auth: false });
  return login(input.email, input.password);
}

export async function logout(): Promise<void> {
  const { refreshToken, clear } = useAuthStore.getState();
  try {
    if (!USE_AUTH_MOCK && !isMockToken(refreshToken) && refreshToken) {
      await api('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false });
    }
  } catch {
  } finally {
    clear();
  }
}
