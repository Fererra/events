import type { RefreshToken } from './refresh-token.js';

/** Persistence port for refresh-token records. */
export interface IRefreshTokenRepository {
  add(token: RefreshToken): Promise<void>;
  /** Row lock (`FOR UPDATE`) when called inside a transaction — prevents double rotation. */
  findByIdForUpdate(id: string): Promise<RefreshToken | null>;
  /** Persists `revokedAt`. */
  save(token: RefreshToken): Promise<void>;
  revokeAllForUser(userId: string, at: Date): Promise<void>;
}
