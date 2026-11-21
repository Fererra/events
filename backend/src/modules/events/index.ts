/**
 * Events module — public API.
 * Events and their status lifecycle.
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { AppModule } from '../../shared/module.js';

export const eventsModule: AppModule = {
  name: 'events',
  register() {
    // Routes and subscribers are wired here as the module is implemented.
  },
};
