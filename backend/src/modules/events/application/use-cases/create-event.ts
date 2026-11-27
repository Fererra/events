import type { IUnitOfWork } from '../../../../shared/application/unit-of-work.js';
import { NotFoundError } from '../../../../shared/domain/errors.js';
import { Event } from '../../domain/event.js';
import type { IEventRepository } from '../../domain/event-repository.js';
import { toEventDto, type EventDto } from '../event-dto.js';
import type { IClock, IIdGenerator } from '../ports/clock.js';
import type { IVenueLookup } from '../ports/venue-lookup.js';

export interface CreateEventCommand {
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  organizer: string;
  venueId: string;
}

/** Command: creates an event in IN_PLANNING after verifying its venue via the Venues port. */
export class CreateEventUseCase {
  constructor(
    private readonly events: IEventRepository,
    private readonly venues: IVenueLookup,
    private readonly uow: IUnitOfWork,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
  ) {}

  async execute(cmd: CreateEventCommand): Promise<EventDto> {
    const event = Event.create({
      id: this.ids.next(),
      title: cmd.title,
      description: cmd.description,
      startsAt: cmd.startsAt,
      endsAt: cmd.endsAt,
      organizer: cmd.organizer,
      venueId: cmd.venueId,
      now: this.clock.now(),
    });

    const venue = await this.venues.findById(cmd.venueId);
    if (!venue) throw new NotFoundError('Venue', cmd.venueId);

    await this.uow.run(() => this.events.add(event));
    return toEventDto(event);
  }
}
