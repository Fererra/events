/**
 * Tickets module — public API.
 * Ticket types with limit and price.
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { DbExecutorProvider } from '../../shared/infrastructure/db/database.js';
import type { AppModule } from '../../shared/module.js';
import { DrizzleTicketTypeRepository } from './infrastructure/drizzle-ticket-type-repository.js';
import { registerTicketsRoutes } from './presentation/tickets.routes.js';
import { createTicketsContainer, type TicketsModuleOverrides } from './tickets.container.js';

export type { TicketTypeDto } from './application/ticket-dto.js';
export type { TicketTypeWithRemainingDto } from './application/queries/list-event-tickets.js';
export type { ISoldTicketsCounter } from './application/ports/sold-tickets-counter.js';

/** Minimal ticket type projection exposed to sibling modules (LR2: TicketInfo). */
export interface TicketInfo {
  id: string;
  eventId: string;
  type: string;
  limit: number;
  price: number;
}

export interface TicketReader {
  hasAnyForEvent(eventId: string): Promise<boolean>;
  /** Row lock (`FOR UPDATE`) inside a UnitOfWork — prevents ticket overselling (ES-23). */
  findByIdForUpdate(ticketTypeId: string): Promise<TicketInfo | null>;
}

/** Public cross-module reader over ticket_types (joins the active UoW transaction). */
export function createTicketReader(db: DbExecutorProvider): TicketReader {
  const repo = new DrizzleTicketTypeRepository(db);
  return {
    hasAnyForEvent: (eventId: string) => repo.hasAnyForEvent(eventId),
    async findByIdForUpdate(ticketTypeId: string): Promise<TicketInfo | null> {
      const ticket = await repo.findByIdForUpdate(ticketTypeId);
      if (!ticket) return null;
      return {
        id: ticket.id,
        eventId: ticket.eventId,
        type: ticket.type,
        limit: ticket.limit,
        price: ticket.price,
      };
    },
  };
}

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
