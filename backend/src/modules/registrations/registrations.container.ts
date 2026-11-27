import type { AppContext } from '../../shared/module.js';
import { authGuards } from '../auth/index.js';
import { systemClock, uuidGenerator } from './application/ports/clock.js';
import type { IMyRegistrationsReadModel } from './application/ports/my-registrations-read-model.js';
import type { IRegistrationContextLookup } from './application/ports/registration-context-lookup.js';
import { ListMyRegistrationsQuery } from './application/queries/list-my-registrations.js';
import { CreateRegistrationUseCase } from './application/use-cases/create-registration.js';
import { DrizzleMyRegistrationsReadModel } from './infrastructure/drizzle-my-registrations-read-model.js';
import { DrizzleRegistrationRepository } from './infrastructure/drizzle-registration-repository.js';
import { ModulesRegistrationContextLookup } from './infrastructure/modules-registration-context-lookup.js';

export interface RegistrationsModuleOverrides {
  myRegistrations?: IMyRegistrationsReadModel;
  contextLookup?: IRegistrationContextLookup;
}

/** Module-level composition: wires ports to their infrastructure adapters. */
export function createRegistrationsContainer(
  ctx: AppContext,
  overrides: RegistrationsModuleOverrides = {},
) {
  const clock = systemClock;
  const ids = uuidGenerator;
  const registrations = new DrizzleRegistrationRepository(ctx.db);
  const contextLookup = overrides.contextLookup ?? new ModulesRegistrationContextLookup(ctx.db);
  const myRegistrations =
    overrides.myRegistrations ?? new DrizzleMyRegistrationsReadModel(registrations, ctx.db);

  return {
    registrations,
    guards: authGuards(ctx.config),
    listMyRegistrations: new ListMyRegistrationsQuery(myRegistrations),
    createRegistration: new CreateRegistrationUseCase(
      registrations,
      contextLookup,
      ctx.uow,
      ctx.eventBus,
      clock,
      ids,
    ),
  };
}

export type RegistrationsContainer = ReturnType<typeof createRegistrationsContainer>;
