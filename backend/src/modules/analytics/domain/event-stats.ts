export interface EventStatsProps {
  eventId: string;
  registrationsCount: number;
  isCancelled: boolean;
  lastActivityAt: Date | null;
}

/**
 * Attendance statistics of one event (aggregate of the Analytics module).
 * Built purely from domain events of other modules — never written by them directly.
 */
export class EventStats {
  private constructor(private props: EventStatsProps) {}

  static empty(eventId: string): EventStats {
    return new EventStats({
      eventId,
      registrationsCount: 0,
      isCancelled: false,
      lastActivityAt: null,
    });
  }

  static restore(props: EventStatsProps): EventStats {
    return new EventStats({ ...props });
  }

  get eventId(): string {
    return this.props.eventId;
  }
  get registrationsCount(): number {
    return this.props.registrationsCount;
  }
  get isCancelled(): boolean {
    return this.props.isCancelled;
  }
  get lastActivityAt(): Date | null {
    return this.props.lastActivityAt;
  }

  recordRegistration(at: Date): void {
    this.props.registrationsCount += 1;
    this.touch(at);
  }

  /** Never goes below zero, even if events arrive out of order. */
  recordCancellation(at: Date): void {
    this.props.registrationsCount = Math.max(0, this.props.registrationsCount - 1);
    this.touch(at);
  }

  markEventCancelled(at: Date): void {
    this.props.isCancelled = true;
    this.touch(at);
  }

  /** Keeps the latest timestamp, so late deliveries cannot move it backwards. */
  private touch(at: Date): void {
    const last = this.props.lastActivityAt;
    if (!last || at > last) this.props.lastActivityAt = at;
  }
}
