import { NotFoundError } from '../../../../shared/domain/errors.js';
import type { IUserRepository } from '../../domain/user-repository.js';
import { toUserDto, type UserDto } from '../user-dto.js';

/** Query (CQS): returns the caller's own profile, no state changes. */
export class GetProfileQuery {
  constructor(private readonly users: IUserRepository) {}

  async execute(userId: string): Promise<UserDto> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('User'); // account deleted after the token was issued
    return toUserDto(user);
  }
}
