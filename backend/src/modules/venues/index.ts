/**
 * Venues module — public API.
 * Venues (locations) management.
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { AppModule } from '../../shared/module.js';

export const venuesModule: AppModule = {
  name: 'venues',
  register() {
    // Routes and subscribers are wired here as the module is implemented.
  },
};
