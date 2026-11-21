import type { IUnitOfWork } from '../../../../shared/application/unit-of-work.js';
import { Email } from '../../domain/email.js';
import { User } from '../../domain/user.js';
import type { IUserRepository } from '../../domain/user-repository.js';
import type { IClock, IIdGenerator } from '../ports/clock.js';
import type { IPasswordHasher } from '../ports/password-hasher.js';
import { assertPasswordPolicy } from '../password-policy.js';

export type EnsureAdminResult = 'created' | 'exists';

/**
 * Bootstrap: creates the first administrator from configuration if the
 * account does not exist yet. Public registration always yields role `user`.
 */
export class EnsureAdminUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly uow: IUnitOfWork,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
  ) {}

  async execute(input: { email: string; password: string }): Promise<EnsureAdminResult> {
    const email = Email.create(input.email);
    if (await this.users.findByEmail(email)) return 'exists';

    assertPasswordPolicy(input.password);
    const admin = User.createAdmin({
      id: this.ids.next(),
      email,
      passwordHash: await this.hasher.hash(input.password),
      now: this.clock.now(),
    });
    await this.uow.run(() => this.users.add(admin));
    return 'created';
  }
}
