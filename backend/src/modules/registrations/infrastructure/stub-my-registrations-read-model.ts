import type {
  IMyRegistrationsReadModel,
  MyRegistrationView,
} from '../application/ports/my-registrations-read-model.js';

/**
 * TEMPORARY stand-in until the registrations / tickets / events tables exist
 * (ES-17, ES-21, ES-23). Replace with a Drizzle read model that joins
 * registrations ⨝ ticket_types ⨝ events WHERE registrations.user_id = $1.
 */
export class StubMyRegistrationsReadModel implements IMyRegistrationsReadModel {
  async listByUser(_userId: string): Promise<MyRegistrationView[]> {
    return [];
  }
}
