/**
 * Registrations module — public API.
 * Registration to events with atomic limit check.
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { AppModule } from '../../shared/module.js';
import { authGuards } from '../auth/index.js';
import { ListMyRegistrationsQuery } from './application/queries/list-my-registrations.js';
import type { IMyRegistrationsReadModel } from './application/ports/my-registrations-read-model.js';
import { StubMyRegistrationsReadModel } from './infrastructure/stub-my-registrations-read-model.js';
import { registerMyRegistrationsRoutes } from './presentation/my-registrations.routes.js';

export type { MyRegistrationDto } from './application/queries/list-my-registrations.js';
export type {
  IMyRegistrationsReadModel,
  MyRegistrationView,
  RegistrationStatus,
} from './application/ports/my-registrations-read-model.js';

/** Factory so tests (and later the real read model) can supply the adapter. */
export function createRegistrationsModule(
  overrides: { myRegistrations?: IMyRegistrationsReadModel } = {},
): AppModule {
  return {
    name: 'registrations',
    register(app, ctx) {
      const { requireAuth } = authGuards(ctx.config);
      const readModel = overrides.myRegistrations ?? new StubMyRegistrationsReadModel();
      registerMyRegistrationsRoutes(app, {
        requireAuth,
        query: new ListMyRegistrationsQuery(readModel),
      });
    },
  };
}

export const registrationsModule: AppModule = createRegistrationsModule();
