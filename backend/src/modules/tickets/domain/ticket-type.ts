import { ValidationError } from '../../../shared/domain/errors.js';

export const TICKET_TYPE_MAX_LENGTH = 100;

export function normalizeTicketTypeName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

export interface TicketTypeProps {
  id: string;
  eventId: string;
  type: string;
  normalizedType: string;
  limit: number;
  price: number;
  createdAt: Date;
}

/**
 * TicketType aggregate of the Tickets module.
 * Enforces positive integer limit, non-negative price (at most 2 decimal places) and non-empty name.
 */
export class TicketType {
  private constructor(private readonly props: TicketTypeProps) {}

  static create(input: {
    id: string;
    eventId: string;
    type: string;
    limit: number;
    price: number;
    now: Date;
  }): TicketType {
    const type = input.type.trim().replace(/\s+/g, ' ');
    if (type.length === 0 || type.length > TICKET_TYPE_MAX_LENGTH) {
      throw new ValidationError(
        'TICKET_TYPE_INVALID',
        `Ticket type name must be 1-${TICKET_TYPE_MAX_LENGTH} characters long`,
      );
    }

    if (!Number.isInteger(input.limit) || input.limit <= 0) {
      throw new ValidationError('TICKET_LIMIT_INVALID', 'Ticket limit must be a positive integer');
    }

    if (
      !Number.isFinite(input.price) ||
      input.price < 0 ||
      Math.round(input.price * 100) !== input.price * 100
    ) {
      throw new ValidationError(
        'TICKET_PRICE_INVALID',
        'Ticket price must be a non-negative number with at most 2 decimal places',
      );
    }

    return new TicketType({
      id: input.id,
      eventId: input.eventId,
      type,
      normalizedType: normalizeTicketTypeName(type),
      limit: input.limit,
      price: input.price,
      createdAt: input.now,
    });
  }

  static restore(props: TicketTypeProps): TicketType {
    return new TicketType(props);
  }

  get id(): string {
    return this.props.id;
  }
  get eventId(): string {
    return this.props.eventId;
  }
  get type(): string {
    return this.props.type;
  }
  get normalizedType(): string {
    return this.props.normalizedType;
  }
  get limit(): number {
    return this.props.limit;
  }
  get price(): number {
    return this.props.price;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
