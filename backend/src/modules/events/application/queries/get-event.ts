import { NotFoundError } from '../../../../shared/domain/errors.js';
import type { IEventRepository } from '../../domain/event-repository.js';
import { toEventDto, type EventDto } from '../event-dto.js';

/** Query (CQS): returns details of a single event, no state changes. */
export class GetEventQuery {
  constructor(private readonly events: IEventRepository) {}

  async execute(id: string): Promise<EventDto> {
    const event = await this.events.findById(id);
    if (!event) throw new NotFoundError('Event', id);
    return toEventDto(event);
  }
}
