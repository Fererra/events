/**
 * Analytics module — public API.
 * Event attendance statistics (event_stats).
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { AppModule } from '../../shared/module.js';

export const analyticsModule: AppModule = {
  name: 'analytics',
  register() {
    // Routes and subscribers are wired here as the module is implemented.
  },
};
