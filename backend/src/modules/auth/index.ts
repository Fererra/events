/**
 * Auth module — public API.
 * Authentication, accounts, roles (JWT + Argon2).
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { AppModule } from '../../shared/module.js';

export const authModule: AppModule = {
  name: 'auth',
  register() {
    // Routes and subscribers are wired here as the module is implemented.
  },
};
