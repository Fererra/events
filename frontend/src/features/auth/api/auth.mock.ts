import { ApiError } from '../../../shared/api/errors';
import { generateId } from '../../../shared/api/mock-helpers';
import type { TokenPair, User } from '../store/auth.store';
import type { RegisterInput } from './auth.api';

interface MockUserRecord extends User {
  password: string;
}

const STORAGE_KEY = 'es-mock-users';
const ACCESS_PREFIX = 'mock-access:';
const REFRESH_PREFIX = 'mock-refresh:';

export const MOCK_DEMO_USER_ID = '33333333-3333-4333-8333-333333333301';
export const MOCK_DEMO_ADMIN_ID = '33333333-3333-4333-8333-333333333302';
export const MOCK_SECOND_USER_ID = '33333333-3333-4333-8333-333333333303';

export const MOCK_DEMO_CREDENTIALS = {
  email: 'demo.user@example.com',
  password: 'P123',
};

export const MOCK_DEMO_ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'Admin123',
};

const SEED_USER: MockUserRecord = {
  id: MOCK_DEMO_USER_ID,
  surname: 'Kovalenko',
  name: 'Olena',
  phone: '+380501234567',
  email: MOCK_DEMO_CREDENTIALS.email,
  password: MOCK_DEMO_CREDENTIALS.password,
  role: 'user',
  createdAt: '2026-10-12T09:30:00.000Z',
};

const SEED_ADMIN: MockUserRecord = {
  id: MOCK_DEMO_ADMIN_ID,
  surname: 'Petrenko',
  name: 'Andrii',
  phone: '+380671112233',
  email: MOCK_DEMO_ADMIN_CREDENTIALS.email,
  password: MOCK_DEMO_ADMIN_CREDENTIALS.password,
  role: 'admin',
  createdAt: '2026-09-01T08:00:00.000Z',
};

const SEED_SECOND_USER: MockUserRecord = {
  id: MOCK_SECOND_USER_ID,
  surname: 'Bondar',
  name: 'Maksym',
  phone: '+380931234567',
  email: 'maksym.bondar@example.com',
  password: 'User1234',
  role: 'user',
  createdAt: '2026-10-18T14:20:00.000Z',
};

const SEED_USERS: MockUserRecord[] = [SEED_USER, SEED_ADMIN, SEED_SECOND_USER];

let memoryUsers: MockUserRecord[] = [...SEED_USERS];

function isValidRecord(item: unknown): item is MockUserRecord {
  if (!item || typeof item !== 'object') return false;
  const r = item as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.email === 'string' &&
    typeof r.password === 'string' &&
    (r.role === 'user' || r.role === 'admin') &&
    typeof r.createdAt === 'string'
  );
}

function mergeWithSeed(records: MockUserRecord[]): MockUserRecord[] {
  const seedIds = new Set(SEED_USERS.map((u) => u.id));
  const seedEmails = new Set(SEED_USERS.map((u) => u.email.toLowerCase()));
  const withoutSeed = records.filter(
    (u) => !seedIds.has(u.id) && !seedEmails.has(u.email.toLowerCase()),
  );
  return [...SEED_USERS, ...withoutSeed];
}

function loadUsers(): MockUserRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return mergeWithSeed(memoryUsers);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return mergeWithSeed(memoryUsers);
    const valid = parsed.filter(isValidRecord);
    memoryUsers = mergeWithSeed(valid);
    return memoryUsers;
  } catch {
    return mergeWithSeed(memoryUsers);
  }
}

function saveUsers(users: MockUserRecord[]): void {
  const merged = mergeWithSeed(users);
  memoryUsers = merged;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {}
}

function toPublicUser(record: MockUserRecord): User {
  const { password: _password, ...user } = record;
  return user;
}

export function isMockToken(token: string | null): boolean {
  return (
    typeof token === 'string' &&
    (token.startsWith(ACCESS_PREFIX) || token.startsWith(REFRESH_PREFIX))
  );
}

export function mockLogin(email: string, password: string): TokenPair {
  const normalizedEmail = email.trim().toLowerCase();
  const user = loadUsers().find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user || user.password !== password) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  return {
    tokenType: 'Bearer',
    accessToken: `${ACCESS_PREFIX}${user.id}`,
    expiresIn: 900,
    refreshToken: `${REFRESH_PREFIX}${user.id}`,
    refreshExpiresIn: 604800,
  };
}

export function mockRegister(input: RegisterInput): User {
  const normalizedEmail = input.email.trim().toLowerCase();
  const users = loadUsers();

  if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw new ApiError(409, 'EMAIL_TAKEN', 'Email is already taken');
  }

  const created: MockUserRecord = {
    id: generateId(),
    surname: input.surname.trim(),
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    password: input.password,
    role: 'user',
    createdAt: new Date().toISOString(),
  };

  saveUsers([...users, created]);
  return toPublicUser(created);
}

export function mockFetchMe(accessToken: string | null): User {
  if (!accessToken || !accessToken.startsWith(ACCESS_PREFIX)) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Unauthorized');
  }

  const userId = accessToken.slice(ACCESS_PREFIX.length);
  const user = loadUsers().find((u) => u.id === userId);
  if (!user) {
    throw new ApiError(401, 'INVALID_TOKEN', 'Invalid token');
  }

  return toPublicUser(user);
}

export function findMockUserById(userId: string): User | null {
  const user = loadUsers().find((u) => u.id === userId);
  return user ? toPublicUser(user) : null;
}
