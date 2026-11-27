/**
 * Tickets module — public API.
 * Ticket types with limit and price.
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { AppModule } from '../../shared/module.js';
import { registerTicketsRoutes } from './presentation/tickets.routes.js';
import { createTicketsContainer, type TicketsModuleOverrides } from './tickets.container.js';

export type { TicketTypeDto } from './application/ticket-dto.js';

export function createTicketsModule(overrides: TicketsModuleOverrides = {}): AppModule {
  return {
    name: 'tickets',
    register(app, ctx) {
      const container = createTicketsContainer(ctx, overrides);
      registerTicketsRoutes(app, container);
    },
  };
}

export const ticketsModule: AppModule = createTicketsModule();
