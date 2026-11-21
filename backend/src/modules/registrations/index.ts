/**
 * Registrations module — public API.
 * Registration to events with atomic limit check.
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { AppModule } from '../../shared/module.js';

export const registrationsModule: AppModule = {
  name: 'registrations',
  register() {
    // Routes and subscribers are wired here as the module is implemented.
  },
};
