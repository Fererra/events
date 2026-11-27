import type { FastifyInstance } from 'fastify';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfileInput {
  surname: string;
  name: string;
  phone: string;
}

export const DEFAULT_PROFILE: UserProfileInput = {
  surname: 'Kovalenko',
  name: 'Olena',
  phone: '+380501234567',
};

export async function register(
  app: FastifyInstance,
  email: string,
  password = 'secret-pass',
  profile: Partial<UserProfileInput> = {},
) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { ...DEFAULT_PROFILE, ...profile, email, password },
  });
  if (res.statusCode !== 201) throw new Error(`register failed: ${res.statusCode} ${res.body}`);
  return res.json<{
    id: string;
    email: string;
    surname: string | null;
    name: string | null;
    phone: string | null;
  }>();
}

export async function login(
  app: FastifyInstance,
  email: string,
  password = 'secret-pass',
): Promise<TokenPair> {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, password },
  });
  if (res.statusCode !== 200) throw new Error(`login failed: ${res.statusCode} ${res.body}`);
  return res.json<TokenPair>();
}

export async function registerAndLogin(app: FastifyInstance, email: string) {
  const user = await register(app, email);
  return { user, ...(await login(app, email)) };
}

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
