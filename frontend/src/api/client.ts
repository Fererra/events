import { useAuthStore, type TokenPair } from '../store/auth';
import { ApiError, toApiError } from './errors';

const BASE = import.meta.env.VITE_API_BASE ?? '/api';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

async function send<T>(path: string, opts: RequestOptions, token: string | null): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError(0, 'NETWORK_ERROR', 'Network error');
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) throw toApiError(res.status, data);
  return data as T;
}

let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const { refreshToken, setTokens, clear } = useAuthStore.getState();
  if (!refreshToken) return false;
  try {
    const pair = await send<TokenPair>(
      '/auth/refresh',
      { method: 'POST', body: { refreshToken } },
      null,
    );
    setTokens(pair);
    return true;
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 0)) clear();
    return false;
  }
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const auth = opts.auth ?? true;
  const usedToken = auth ? useAuthStore.getState().accessToken : null;

  try {
    return await send<T>(path, opts, usedToken);
  } catch (e) {
    if (!auth || !(e instanceof ApiError) || e.status !== 401) throw e;

    const state = useAuthStore.getState();
    if (state.accessToken && state.accessToken !== usedToken) {
      return send<T>(path, opts, state.accessToken);
    }
    if (!state.refreshToken) throw e;

    refreshing ??= refreshTokens().finally(() => {
      refreshing = null;
    });
    if (!(await refreshing)) throw e;
    return send<T>(path, opts, useAuthStore.getState().accessToken);
  }
}
