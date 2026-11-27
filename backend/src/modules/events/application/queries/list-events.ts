import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  type PaginatedDto,
  type PaginationQuery,
} from '../../../../shared/application/pagination.js';
import type { EventStatus } from '../../domain/event.js';
import type { IEventRepository } from '../../domain/event-repository.js';
import { toEventDto, type EventDto } from '../event-dto.js';

export interface ListEventsInput extends PaginationQuery {
  venueId?: string;
  status?: EventStatus;
}

export type PaginatedEventsDto = PaginatedDto<EventDto>;

/** Query (CQS): paginated public event listing with optional venue/status filters. */
export class ListEventsQuery {
  constructor(private readonly events: IEventRepository) {}

  async execute(query: ListEventsInput = {}): Promise<PaginatedEventsDto> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const offset = (page - 1) * limit;

    const { items, total } = await this.events.list({
      limit,
      offset,
      ...(query.venueId !== undefined && { venueId: query.venueId }),
      ...(query.status !== undefined && { status: query.status }),
    });

    return {
      items: items.map(toEventDto),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
