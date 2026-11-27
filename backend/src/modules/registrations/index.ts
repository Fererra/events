/**
 * Registrations module — public API.
 * Registration to events with atomic limit check.
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { DbExecutorProvider } from '../../shared/infrastructure/db/database.js';
import type { AppModule } from '../../shared/module.js';
import { DrizzleRegistrationRepository } from './infrastructure/drizzle-registration-repository.js';
import { registerMyRegistrationsRoutes } from './presentation/my-registrations.routes.js';
import { registerRegistrationsRoutes } from './presentation/registrations.routes.js';
import {
  createRegistrationsContainer,
  type RegistrationsModuleOverrides,
} from './registrations.container.js';

export type { MyRegistrationDto } from './application/queries/list-my-registrations.js';
export type { RegistrationDto } from './application/registration-dto.js';
export type { RegistrationCancelled, RegistrationCreated } from './domain/registration-events.js';
export type {
  IMyRegistrationsReadModel,
  MyRegistrationView,
  RegistrationStatus,
} from './application/ports/my-registrations-read-model.js';

export interface SoldTicketsCounter {
  countActiveByEvent(eventId: string): Promise<Map<string, number>>;
}

/** Public cross-module counter of active registrations per ticket type (for Tickets). */
export function createSoldTicketsCounter(db: DbExecutorProvider): SoldTicketsCounter {
  const repo = new DrizzleRegistrationRepository(db);
  return {
    countActiveByEvent: (eventId: string) => repo.countActiveByEventGroupedByTicketType(eventId),
  };
}

/** Factory so tests can supply custom adapters when needed. */
export function createRegistrationsModule(overrides: RegistrationsModuleOverrides = {}): AppModule {
  return {
    name: 'registrations',
    register(app, ctx) {
      const container = createRegistrationsContainer(ctx, overrides);
      registerMyRegistrationsRoutes(app, {
        requireAuth: container.guards.requireAuth,
        query: container.listMyRegistrations,
      });
      registerRegistrationsRoutes(app, container);
    },
  };
}

export const registrationsModule: AppModule = createRegistrationsModule();
