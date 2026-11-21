import { and, eq, isNull } from 'drizzle-orm';
import type { DbExecutorProvider } from '../../../shared/infrastructure/db/database.js';
import { RefreshToken } from '../domain/refresh-token.js';
import type { IRefreshTokenRepository } from '../domain/refresh-token-repository.js';
import { refreshTokens, type RefreshTokenRow } from './auth.schema.js';

function toDomain(row: RefreshTokenRow): RefreshToken {
  return RefreshToken.restore({
    id: row.id,
    userId: row.userId,
    issuedAt: row.issuedAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
  });
}

export class DrizzleRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly db: DbExecutorProvider) {}

  async add(token: RefreshToken): Promise<void> {
    await this.db.executor().insert(refreshTokens).values({
      id: token.id,
      userId: token.userId,
      issuedAt: token.issuedAt,
      expiresAt: token.expiresAt,
      revokedAt: token.revokedAt,
    });
  }

  async findByIdForUpdate(id: string): Promise<RefreshToken | null> {
    const [row] = await this.db
      .executor()
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, id))
      .for('update');
    return row ? toDomain(row) : null;
  }

  async save(token: RefreshToken): Promise<void> {
    await this.db
      .executor()
      .update(refreshTokens)
      .set({ revokedAt: token.revokedAt })
      .where(eq(refreshTokens.id, token.id));
  }

  async revokeAllForUser(userId: string, at: Date): Promise<void> {
    await this.db
      .executor()
      .update(refreshTokens)
      .set({ revokedAt: at })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }
}
