import { ValidationError } from '../../../shared/domain/errors.js';
import { InvalidEventStatusTransitionError } from './errors.js';
import { EventPeriod } from './event-period.js';

export const EVENT_STATUSES = ['IN_PLANNING', 'ACTIVE', 'FINISHED', 'CANCELLED'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_TITLE_MAX_LENGTH = 200;
export const EVENT_DESCRIPTION_MAX_LENGTH = 5000;
export const EVENT_ORGANIZER_MAX_LENGTH = 200;

export interface EventProps {
  id: string;
  title: string;
  description: string;
  period: EventPeriod;
  organizer: string;
  venueId: string;
  status: EventStatus;
  createdAt: Date;
}

/**
 * Event aggregate root of the Events module (Rich Domain Model, LR2 §4.2).
 *
 * State machine:
 *   IN_PLANNING --publish() [has >= 1 ticket type]--> ACTIVE
 *   IN_PLANNING --cancel()--------------------------> CANCELLED
 *   ACTIVE      --cancel()--------------------------> CANCELLED
 *   ACTIVE      --finish(now) [endsAt <= now]-------> FINISHED
 *   FINISHED / CANCELLED --delete()-----------------> (deletable)
 */
export class Event {
  private constructor(private props: EventProps) {}

  static create(input: {
    id: string;
    title: string;
    description: string;
    startsAt: Date;
    endsAt: Date;
    organizer: string;
    venueId: string;
    now: Date;
  }): Event {
    const title = input.title.trim();
    if (title.length === 0 || title.length > EVENT_TITLE_MAX_LENGTH) {
      throw new ValidationError(
        'EVENT_TITLE_INVALID',
        `Event title must be 1-${EVENT_TITLE_MAX_LENGTH} characters long`,
      );
    }

    const description = input.description.trim();
    if (description.length > EVENT_DESCRIPTION_MAX_LENGTH) {
      throw new ValidationError(
        'EVENT_DESCRIPTION_INVALID',
        `Event description must be at most ${EVENT_DESCRIPTION_MAX_LENGTH} characters long`,
      );
    }

    const organizer = input.organizer.trim();
    if (organizer.length === 0 || organizer.length > EVENT_ORGANIZER_MAX_LENGTH) {
      throw new ValidationError(
        'EVENT_ORGANIZER_INVALID',
        `Event organizer must be 1-${EVENT_ORGANIZER_MAX_LENGTH} characters long`,
      );
    }

    const period = EventPeriod.create(input.startsAt, input.endsAt);

    return new Event({
      id: input.id,
      title,
      description,
      period,
      organizer,
      venueId: input.venueId,
      status: 'IN_PLANNING',
      createdAt: input.now,
    });
  }

  /** Rehydrates a persisted event (used by repositories). */
  static restore(props: EventProps): Event {
    return new Event({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get title(): string {
    return this.props.title;
  }
  get description(): string {
    return this.props.description;
  }
  get period(): EventPeriod {
    return this.props.period;
  }
  get startsAt(): Date {
    return this.props.period.startsAt;
  }
  get endsAt(): Date {
    return this.props.period.endsAt;
  }
  get organizer(): string {
    return this.props.organizer;
  }
  get venueId(): string {
    return this.props.venueId;
  }
  get status(): EventStatus {
    return this.props.status;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Registrations are accepted only while the event is ACTIVE. */
  acceptsRegistrations(): boolean {
    return this.props.status === 'ACTIVE';
  }

  /** Scheduled events block deletion of their venue (ES-16). */
  isScheduled(): boolean {
    return this.props.status === 'IN_PLANNING' || this.props.status === 'ACTIVE';
  }

  /** Guarded transition: IN_PLANNING → ACTIVE (requires at least one ticket type). */
  publish(hasTicketTypes: boolean): void {
    if (this.props.status !== 'IN_PLANNING') {
      throw new InvalidEventStatusTransitionError(
        `Cannot publish an event in status ${this.props.status}`,
      );
    }
    if (!hasTicketTypes) {
      throw new InvalidEventStatusTransitionError(
        'Cannot publish an event without at least one ticket type',
      );
    }
    this.props = { ...this.props, status: 'ACTIVE' };
  }

  /** Transition: IN_PLANNING | ACTIVE → CANCELLED. */
  cancel(): void {
    if (this.props.status !== 'IN_PLANNING' && this.props.status !== 'ACTIVE') {
      throw new InvalidEventStatusTransitionError(
        `Cannot cancel an event in status ${this.props.status}`,
      );
    }
    this.props = { ...this.props, status: 'CANCELLED' };
  }

  /** Transition: ACTIVE → FINISHED once `endsAt <= now`. */
  finish(now: Date): void {
    if (this.props.status !== 'ACTIVE') {
      throw new InvalidEventStatusTransitionError(
        `Cannot finish an event in status ${this.props.status}`,
      );
    }
    if (!this.props.period.hasEnded(now)) {
      throw new InvalidEventStatusTransitionError('Cannot finish an event before its end time');
    }
    this.props = { ...this.props, status: 'FINISHED' };
  }

  /** Guard: only FINISHED or CANCELLED events may be deleted (LR2 §4.2). */
  delete(): void {
    if (this.props.status !== 'FINISHED' && this.props.status !== 'CANCELLED') {
      throw new InvalidEventStatusTransitionError(
        `Cannot delete an event in status ${this.props.status}`,
      );
    }
  }
}
