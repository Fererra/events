import { describe, expect, it } from 'vitest';
import { RegisterUserUseCase } from '../../../src/modules/auth/application/use-cases/register-user.js';
import { EmailAlreadyTakenError } from '../../../src/modules/auth/domain/errors.js';
import { ValidationError } from '../../../src/shared/domain/errors.js';
import { fakeAuthDeps } from './fakes.js';

describe('RegisterUserUseCase', () => {
  const build = () => {
    const deps = fakeAuthDeps();
    const useCase = new RegisterUserUseCase(
      deps.users,
      deps.hasher,
      deps.uow,
      deps.clock,
      deps.ids,
    );
    return { deps, useCase };
  };

  const valid = {
    surname: 'Kovalenko',
    name: 'Olena',
    phone: '+380501234567',
    email: 'alice@example.com',
    password: 'secret-pass',
  };

  it('creates a user with normalized profile fields, role "user" and a hashed password', async () => {
    const { deps, useCase } = build();
    const dto = await useCase.execute({
      surname: '  Kovalenko ',
      name: " Olena-Maria' ",
      phone: '+38 (050) 123-45-67',
      email: '  Alice@Example.com ',
      password: 'secret-pass',
    });

    expect(dto).toEqual({
      id: 'id-1',
      email: 'alice@example.com',
      surname: 'Kovalenko',
      name: "Olena-Maria'",
      phone: '+380501234567',
      role: 'user',
      createdAt: deps.clock.now().toISOString(),
    });
    const stored = deps.users.all()[0];
    expect(stored?.passwordHash).toBe('hashed:secret-pass');
    expect(stored?.passwordHash).not.toContain('secret-pass'.repeat(2));
  });

  it('rejects an e-mail that is already taken (case-insensitive)', async () => {
    const { useCase } = build();
    await useCase.execute({ ...valid, email: 'bob@example.com' });
    await expect(
      useCase.execute({ ...valid, email: 'BOB@example.com', password: 'other-pass' }),
    ).rejects.toBeInstanceOf(EmailAlreadyTakenError);
  });

  it.each([
    ['short password', { password: 'short' }, 'PASSWORD_INVALID'],
    ['invalid e-mail', { email: 'not-an-email' }, 'EMAIL_INVALID'],
    ['blank surname', { surname: '   ' }, 'SURNAME_INVALID'],
    ['numeric surname', { surname: 'User123' }, 'SURNAME_INVALID'],
    ['invalid name', { name: '123!' }, 'NAME_INVALID'],
    ['too long name', { name: 'A'.repeat(51) }, 'NAME_INVALID'],
    ['short phone', { phone: '12345' }, 'PHONE_INVALID'],
    ['letters in phone', { phone: '+38050abc4567' }, 'PHONE_INVALID'],
  ])('rejects %s', async (_case, override, expectedCode) => {
    const { useCase } = build();
    await expect(useCase.execute({ ...valid, ...override })).rejects.toThrow(
      expect.objectContaining({ code: expectedCode }),
    );
    await expect(useCase.execute({ ...valid, ...override })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
