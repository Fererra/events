export interface RefreshTokenProps {
  /** Token id — the `jti` claim of the refresh JWT. */
  id: string;
  userId: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

/**
 * Server-side record of an issued refresh token.
 * Lets the system revoke a session (logout, rotation) even though JWTs are stateless.
 */
export class RefreshToken {
  private constructor(private props: RefreshTokenProps) {}

  static issue(input: { id: string; userId: string; now: Date; ttlSeconds: number }): RefreshToken {
    return new RefreshToken({
      id: input.id,
      userId: input.userId,
      issuedAt: input.now,
      expiresAt: new Date(input.now.getTime() + input.ttlSeconds * 1000),
      revokedAt: null,
    });
  }

  static restore(props: RefreshTokenProps): RefreshToken {
    return new RefreshToken({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get issuedAt(): Date {
    return this.props.issuedAt;
  }
  get expiresAt(): Date {
    return this.props.expiresAt;
  }
  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  isActive(now: Date): boolean {
    return !this.isRevoked() && now < this.props.expiresAt;
  }

  /** Idempotent: revoking an already revoked token keeps the first timestamp. */
  revoke(now: Date): void {
    if (!this.props.revokedAt) this.props.revokedAt = now;
  }
}
