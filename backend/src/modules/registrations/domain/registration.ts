import { RegistrationAlreadyCancelledError } from './errors.js';

export const REGISTRATION_STATUSES = ['ACTIVE', 'CANCELLED'] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export interface RegistrationProps {
  id: string;
  userId: string;
  eventId: string;
  ticketTypeId: string;
  status: RegistrationStatus;
  registeredAt: Date;
}

/** Registration aggregate root of the Registrations module. */
export class Registration {
  private constructor(private props: RegistrationProps) {}

  static create(input: Omit<RegistrationProps, 'status'>): Registration {
    return new Registration({ ...input, status: 'ACTIVE' });
  }

  /** Rehydrates a persisted registration (used by repositories). */
  static restore(props: RegistrationProps): Registration {
    return new Registration({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get eventId(): string {
    return this.props.eventId;
  }
  get ticketTypeId(): string {
    return this.props.ticketTypeId;
  }
  get status(): RegistrationStatus {
    return this.props.status;
  }
  get registeredAt(): Date {
    return this.props.registeredAt;
  }

  /** Transitions ACTIVE → CANCELLED; rejects repeated cancellation. */
  cancel(): void {
    if (this.props.status === 'CANCELLED') {
      throw new RegistrationAlreadyCancelledError();
    }
    this.props = { ...this.props, status: 'CANCELLED' };
  }
}
