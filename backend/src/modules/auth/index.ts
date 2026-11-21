/**
 * Auth module — public API.
 * Authentication, accounts, roles (JWT + Argon2).
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { AppModule } from '../../shared/module.js';
import { createAuthContainer } from './auth.container.js';
import { registerAuthRoutes } from './presentation/auth.routes.js';

export type { Role } from './domain/role.js';

export const authModule: AppModule = {
  name: 'auth',
  register(app, ctx) {
    const auth = createAuthContainer(ctx);
    registerAuthRoutes(app, auth);
  },
};
