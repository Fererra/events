import type { IUnitOfWork } from '../../../../shared/application/unit-of-work.js';
import { ValidationError } from '../../../../shared/domain/errors.js';
import { Email } from '../../domain/email.js';
import { InvalidCredentialsError } from '../../domain/errors.js';
import type { IUserRepository } from '../../domain/user-repository.js';
import type { IPasswordHasher } from '../ports/password-hasher.js';
import type { TokenPairDto, TokenPairIssuer } from '../token-pair-issuer.js';

export interface LoginCommand {
  email: string;
  password: string;
}

/**
 * Command: checks credentials and issues a JWT pair.
 * Wrong e-mail and wrong password produce the same error (no user enumeration).
 */
export class LoginUserUseCase {
  /** Lazily computed hash verified when the user does not exist, to equalize timing. */
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly issuer: TokenPairIssuer,
    private readonly uow: IUnitOfWork,
  ) {}

  async execute(cmd: LoginCommand): Promise<TokenPairDto> {
    let email: Email;
    try {
      email = Email.create(cmd.email);
    } catch (err) {
      if (err instanceof ValidationError) throw new InvalidCredentialsError();
      throw err;
    }

    const user = await this.users.findByEmail(email);
    if (!user) {
      this.dummyHash ??= this.hasher.hash('timing-equalizer-password');
      await this.hasher.verify(await this.dummyHash, cmd.password);
      throw new InvalidCredentialsError();
    }

    if (!(await this.hasher.verify(user.passwordHash, cmd.password))) {
      throw new InvalidCredentialsError();
    }

    return this.uow.run(() => this.issuer.issueFor(user));
  }
}
