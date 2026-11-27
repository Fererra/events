import type { AppContext } from '../../shared/module.js';
import { authGuards } from '../auth/index.js';
import { systemClock, uuidGenerator } from './application/ports/clock.js';
import type { IEventCapacityLookup } from './application/ports/event-capacity-lookup.js';
import { CreateTicketTypeUseCase } from './application/use-cases/create-ticket-type.js';
import { DrizzleTicketTypeRepository } from './infrastructure/drizzle-ticket-type-repository.js';
import { ModulesEventCapacityLookup } from './infrastructure/modules-event-capacity-lookup.js';

export interface TicketsModuleOverrides {
  eventCapacity?: IEventCapacityLookup;
}

/** Module-level composition: wires ports to their infrastructure adapters. */
export function createTicketsContainer(ctx: AppContext, overrides: TicketsModuleOverrides = {}) {
  const clock = systemClock;
  const ids = uuidGenerator;
  const tickets = new DrizzleTicketTypeRepository(ctx.db);
  const eventCapacity = overrides.eventCapacity ?? new ModulesEventCapacityLookup(ctx.db);

  return {
    tickets,
    guards: authGuards(ctx.config),
    createTicketType: new CreateTicketTypeUseCase(tickets, eventCapacity, ctx.uow, clock, ids),
  };
}

export type TicketsContainer = ReturnType<typeof createTicketsContainer>;
