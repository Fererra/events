/**
 * Tickets module — public API.
 * Ticket types with limit and price.
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { AppModule } from '../../shared/module.js';

export const ticketsModule: AppModule = {
  name: 'tickets',
  register() {
    // Routes and subscribers are wired here as the module is implemented.
  },
};
