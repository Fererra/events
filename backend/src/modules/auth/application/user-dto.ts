import type { User } from '../domain/user.js';
import type { Role } from '../domain/role.js';

/** Public view of an account — never exposes the password hash. */
export interface UserDto {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email.value,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}
