import { ValidationError } from '../../../../shared/domain/errors.js';
import type { IEventStatsRepository } from '../../domain/event-stats-repository.js';
import type { EventCatalogFilter, EventStatus, IEventCatalog } from '../ports/event-catalog.js';

export interface EventAnalyticsDto {
  event: { id: string; title: string; startsAt: string; endsAt: string; status: EventStatus };
  registrationsCount: number;
  isCancelled: boolean;
  lastActivityAt: string | null;
}

/**
 * Query (CQS): attendance analytics per event for administrators.
 * Events come from the Events module (so events without registrations are
 * listed too), numbers come from event_stats.
 */
export class ListEventAnalyticsQuery {
  constructor(
    private readonly catalog: IEventCatalog,
    private readonly stats: IEventStatsRepository,
  ) {}

  async execute(filter: EventCatalogFilter): Promise<EventAnalyticsDto[]> {
    if (filter.from && filter.to && filter.from > filter.to) {
      throw new ValidationError('PERIOD_INVALID', '"from" must not be later than "to"');
    }

    const [events, allStats] = await Promise.all([this.catalog.list(filter), this.stats.list()]);
    const byEvent = new Map(allStats.map((s) => [s.eventId, s]));

    return events
      .slice()
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
      .map((e) => {
        const s = byEvent.get(e.id);
        return {
          event: {
            id: e.id,
            title: e.title,
            startsAt: e.startsAt.toISOString(),
            endsAt: e.endsAt.toISOString(),
            status: e.status,
          },
          registrationsCount: s?.registrationsCount ?? 0,
          isCancelled: s?.isCancelled ?? e.status === 'CANCELLED',
          lastActivityAt: s?.lastActivityAt?.toISOString() ?? null,
        };
      });
  }
}
