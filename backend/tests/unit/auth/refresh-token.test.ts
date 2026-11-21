import { describe, expect, it } from 'vitest';
import { RefreshToken } from '../../../src/modules/auth/domain/refresh-token.js';

const now = new Date('2026-11-01T10:00:00Z');
const issue = () => RefreshToken.issue({ id: 't1', userId: 'u1', now, ttlSeconds: 60 });

describe('RefreshToken', () => {
  it('is active until it expires', () => {
    const token = issue();
    expect(token.expiresAt).toEqual(new Date('2026-11-01T10:01:00Z'));
    expect(token.isActive(new Date('2026-11-01T10:00:59Z'))).toBe(true);
    expect(token.isActive(new Date('2026-11-01T10:01:00Z'))).toBe(false);
  });

  it('is inactive once revoked; revoke is idempotent', () => {
    const token = issue();
    token.revoke(new Date('2026-11-01T10:00:10Z'));
    token.revoke(new Date('2026-11-01T10:00:20Z'));
    expect(token.isActive(now)).toBe(false);
    expect(token.revokedAt).toEqual(new Date('2026-11-01T10:00:10Z'));
  });
});
