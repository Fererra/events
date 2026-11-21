import argon2 from 'argon2';
import type { IPasswordHasher } from '../application/ports/password-hasher.js';

/**
 * Argon2id with OWASP Password Storage Cheat Sheet parameters
 * (m = 19 MiB, t = 2, p = 1). Salt is generated per hash by the library.
 */
export const OWASP_ARGON2_PARAMS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export class Argon2PasswordHasher implements IPasswordHasher {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id, ...OWASP_ARGON2_PARAMS });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false; // malformed hash → treat as mismatch
    }
  }
}
