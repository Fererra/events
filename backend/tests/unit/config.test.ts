import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/shared/config/env.js';

const strong = 'x'.repeat(32);

describe('loadConfig', () => {
  it('uses spec defaults: access 15 min, refresh 7 days', () => {
    const { auth } = loadConfig({ NODE_ENV: 'development' });
    expect(auth.accessTtlSeconds).toBe(900);
    expect(auth.refreshTtlSeconds).toBe(604_800);
  });

  it('requires JWT secrets in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/JWT_ACCESS_SECRET is required/);
  });

  it('rejects JWT secrets shorter than 32 characters in production', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'short',
        JWT_REFRESH_SECRET: strong,
      }),
    ).toThrow(/at least 32/);
  });

  it('accepts strong secrets in production', () => {
    const cfg = loadConfig({
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: strong,
      JWT_REFRESH_SECRET: strong,
    });
    expect(cfg.auth.accessSecret).toBe(strong);
    expect(cfg.scheduler.enabled).toBe(true);
  });

  it('rejects non-numeric integers', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT must be an integer/);
  });

  it('scheduler is off in tests and can be disabled explicitly', () => {
    expect(loadConfig({ NODE_ENV: 'test' }).scheduler.enabled).toBe(false);
    expect(loadConfig({ SCHEDULER_ENABLED: 'false' }).scheduler.enabled).toBe(false);
  });
});
