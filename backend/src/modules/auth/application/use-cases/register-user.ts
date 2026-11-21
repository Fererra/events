import type { IUnitOfWork } from '../../../../shared/application/unit-of-work.js';
import { Email } from '../../domain/email.js';
import { EmailAlreadyTakenError } from '../../domain/errors.js';
import { User } from '../../domain/user.js';
import type { IUserRepository } from '../../domain/user-repository.js';
import type { IClock, IIdGenerator } from '../ports/clock.js';
import type { IPasswordHasher } from '../ports/password-hasher.js';
import { assertPasswordPolicy } from '../password-policy.js';
import { toUserDto, type UserDto } from '../user-dto.js';

export interface RegisterUserCommand {
  email: string;
  password: string;
}

/** Command: creates an account with role `user` and an Argon2 password hash. */
export class RegisterUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly uow: IUnitOfWork,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
  ) {}

  async execute(cmd: RegisterUserCommand): Promise<UserDto> {
    const email = Email.create(cmd.email);
    assertPasswordPolicy(cmd.password);

    if (await this.users.findByEmail(email)) throw new EmailAlreadyTakenError();

    const passwordHash = await this.hasher.hash(cmd.password);
    const user = User.register({ id: this.ids.next(), email, passwordHash, now: this.clock.now() });

    // The unique index still protects against a concurrent registration race.
    await this.uow.run(() => this.users.add(user));
    return toUserDto(user);
  }
}
