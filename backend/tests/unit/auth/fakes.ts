import type { IUnitOfWork } from '../../../src/shared/application/unit-of-work.js';
import type { IClock, IIdGenerator } from '../../../src/modules/auth/application/ports/clock.js';
import type { IPasswordHasher } from '../../../src/modules/auth/application/ports/password-hasher.js';
import type { Email } from '../../../src/modules/auth/domain/email.js';
import { EmailAlreadyTakenError } from '../../../src/modules/auth/domain/errors.js';
import type { User } from '../../../src/modules/auth/domain/user.js';
import type { IUserRepository } from '../../../src/modules/auth/domain/user-repository.js';

/** In-memory test doubles for the Auth ports (unit tests, no DB). */

export class InMemoryUserRepository implements IUserRepository {
  private readonly byId = new Map<string, User>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async findByEmail(email: Email) {
    return [...this.byId.values()].find((u) => u.email.equals(email)) ?? null;
  }
  async add(user: User) {
    if (await this.findByEmail(user.email)) throw new EmailAlreadyTakenError();
    this.byId.set(user.id, user);
  }
  all() {
    return [...this.byId.values()];
  }
}

export const fakeHasher: IPasswordHasher = {
  hash: async (plain) => `hashed:${plain}`,
  verify: async (hash, plain) => hash === `hashed:${plain}`,
};

export const immediateUow: IUnitOfWork = {
  run: (work) => work(),
  afterCommit: (cb) => void cb(),
};

export class FixedClock implements IClock {
  constructor(public current = new Date('2026-11-01T10:00:00.000Z')) {}
  now() {
    return new Date(this.current);
  }
  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class SequentialIds implements IIdGenerator {
  private n = 0;
  next() {
    return `id-${++this.n}`;
  }
}

export function fakeAuthDeps() {
  return {
    users: new InMemoryUserRepository(),
    hasher: fakeHasher,
    uow: immediateUow,
    clock: new FixedClock(),
    ids: new SequentialIds(),
  };
}
