import type {
  IMyRegistrationsReadModel,
  MyRegistrationView,
  RegistrationStatus,
} from '../ports/my-registrations-read-model.js';

export interface MyRegistrationDto {
  id: string;
  event: { id: string; title: string; startsAt: string; endsAt: string };
  ticket: { type: string; price: number };
  status: RegistrationStatus;
  registeredAt: string;
}

function toDto(view: MyRegistrationView): MyRegistrationDto {
  return {
    id: view.id,
    event: {
      id: view.eventId,
      title: view.eventTitle,
      startsAt: view.eventStartsAt.toISOString(),
      endsAt: view.eventEndsAt.toISOString(),
    },
    ticket: { type: view.ticketType, price: view.ticketPrice },
    status: view.status,
    registeredAt: view.registeredAt.toISOString(),
  };
}

/**
 * Query (CQS): the caller's own registrations, newest event first.
 * Read-only — never changes state.
 */
export class ListMyRegistrationsQuery {
  constructor(private readonly readModel: IMyRegistrationsReadModel) {}

  async execute(userId: string): Promise<MyRegistrationDto[]> {
    const views = await this.readModel.listByUser(userId);
    return views
      .slice()
      .sort(
        (a, b) =>
          b.eventStartsAt.getTime() - a.eventStartsAt.getTime() ||
          b.registeredAt.getTime() - a.registeredAt.getTime(),
      )
      .map(toDto);
  }
}
