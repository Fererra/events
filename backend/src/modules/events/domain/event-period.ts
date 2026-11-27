import { ValidationError } from '../../../shared/domain/errors.js';

/** Value object: event time interval where end time is strictly after start time. */
export class EventPeriod {
  private constructor(
    public readonly startsAt: Date,
    public readonly endsAt: Date,
  ) {}

  static create(startsAt: Date, endsAt: Date): EventPeriod {
    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime()) ||
      endsAt.getTime() <= startsAt.getTime()
    ) {
      throw new ValidationError('EVENT_PERIOD_INVALID', 'Event end time must be after start time');
    }
    return new EventPeriod(new Date(startsAt.getTime()), new Date(endsAt.getTime()));
  }

  hasEnded(now: Date): boolean {
    return this.endsAt.getTime() <= now.getTime();
  }
}
