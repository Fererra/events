/**
 * Domain errors carry a machine-readable `code` but NO HTTP status:
 * mapping to HTTP is the job of the HTTP layer (exception handler).
 */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Requested aggregate does not exist. */
export class NotFoundError extends DomainError {
  constructor(entity: string, id?: string) {
    super(
      `${entity.toUpperCase()}_NOT_FOUND`,
      id ? `${entity} ${id} not found` : `${entity} not found`,
    );
  }
}

/** State conflict: duplicate unique value, forbidden state transition, sold out, etc. */
export class ConflictError extends DomainError {}

/** Caller is not authenticated (missing / invalid / expired credentials). */
export class UnauthorizedError extends DomainError {
  constructor(code = 'UNAUTHORIZED', message = 'Authentication required') {
    super(code, message);
  }
}

/** Caller is authenticated but lacks the required role. */
export class ForbiddenError extends DomainError {
  constructor(code = 'FORBIDDEN', message = 'Insufficient permissions') {
    super(code, message);
  }
}

/** Input violates a domain invariant (e.g. capacity must be positive). */
export class ValidationError extends DomainError {}
