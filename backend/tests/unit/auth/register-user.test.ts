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

  it('creates a user with role "user" and a hashed password', async () => {
    const { deps, useCase } = build();
    const dto = await useCase.execute({ email: '  Alice@Example.com ', password: 'secret-pass' });

    expect(dto).toEqual({
      id: 'id-1',
      email: 'alice@example.com',
      role: 'user',
      createdAt: deps.clock.now().toISOString(),
    });
    const stored = deps.users.all()[0];
    expect(stored?.passwordHash).toBe('hashed:secret-pass');
    expect(stored?.passwordHash).not.toContain('secret-pass'.repeat(2));
  });

  it('rejects an e-mail that is already taken (case-insensitive)', async () => {
    const { useCase } = build();
    await useCase.execute({ email: 'bob@example.com', password: 'secret-pass' });
    await expect(
      useCase.execute({ email: 'BOB@example.com', password: 'other-pass' }),
    ).rejects.toBeInstanceOf(EmailAlreadyTakenError);
  });

  it.each([
    ['short password', 'a@b.co', 'short'],
    ['invalid e-mail', 'not-an-email', 'secret-pass'],
  ])('rejects %s', async (_case, email, password) => {
    const { useCase } = build();
    await expect(useCase.execute({ email, password })).rejects.toBeInstanceOf(ValidationError);
  });
});
