export interface ApiErrorBody {
  code: string;
  message: string;
  details?: { field: string; message: string }[];
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: { field: string; message: string }[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function toApiError(status: number, body: unknown): ApiError {
  const b = body as Partial<ApiErrorBody> | null;
  if (b && typeof b === 'object' && typeof b.code === 'string') {
    return new ApiError(
      status,
      b.code,
      b.message ?? b.code,
      Array.isArray(b.details) ? b.details : [],
    );
  }
  return new ApiError(status, status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN_ERROR', `HTTP ${status}`);
}

const MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Please check the highlighted fields and try again.',
  PASSWORD_INVALID: 'Password must be between 8 and 128 characters.',
  CAPACITY_INVALID: 'Capacity must be a positive whole number.',
  PERIOD_INVALID: 'End date and time must be later than start date and time.',
  UNAUTHORIZED: 'Please sign in to continue.',
  INVALID_TOKEN: 'Your session is no longer valid. Please sign in again.',
  TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  INVALID_REFRESH_TOKEN: 'Your session has expired. Please sign in again.',
  FORBIDDEN: 'You do not have permission to do this.',
  EVENT_NOT_FOUND: 'Event not found.',
  VENUE_NOT_FOUND: 'Venue not found.',
  ROUTE_NOT_FOUND: 'Resource not found.',
  EMAIL_TAKEN: 'This email is already registered. Try signing in instead.',
  ADDRESS_TAKEN: 'A venue with this address already exists.',
  VENUE_HAS_SCHEDULED_EVENTS: 'This venue cannot be deleted because it has scheduled events.',
  TICKET_NOT_FOUND: 'Selected ticket type was not found.',
  TICKET_TYPE_EXISTS: 'A ticket type with this name already exists for this event.',
  TICKET_LIMIT_INVALID: 'Ticket limit must be a positive whole number.',
  TICKET_PRICE_INVALID: 'Ticket price must be zero or a positive number.',
  TICKET_IN_USE: 'This ticket type cannot be deleted because it already has registrations.',
  TICKETS_SOLD_OUT: 'Tickets of this type are sold out. Please choose another type.',
  EVENT_REGISTRATION_CLOSED: 'Registration for this event is currently closed.',
  EVENT_NOT_EDITABLE: 'Finished or cancelled events cannot be modified in this way.',
  REGISTRATION_NOT_FOUND: 'Registration not found.',
  REGISTRATION_ALREADY_CANCELLED: 'This registration has already been cancelled.',
  INVALID_STATUS_TRANSITION: 'This status change is not allowed.',
  INTERNAL_ERROR: 'Something went wrong on our side. Please try again later.',
  NETWORK_ERROR: 'Cannot reach the server. Check your internet connection and try again.',
};

const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  password: 'Password',
  name: 'Name',
  surname: 'Surname',
  phone: 'Phone',
  address: 'Address',
  capacity: 'Capacity',
  description: 'Description',
  startTimestamp: 'Start date & time',
  endTimestamp: 'End date & time',
  organisator: 'Organizer',
  venueId: 'Venue',
  type: 'Ticket type',
  limit: 'Ticket limit',
  price: 'Price',
  status: 'Status',
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError(0, 'UNKNOWN_ERROR', error instanceof Error ? error.message : 'Unknown error');
}

export function errorText(error: unknown): string {
  const e = normalizeError(error);
  return MESSAGES[e.code] ?? 'Something went wrong. Please try again.';
}

export function fieldErrors(error: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of normalizeError(error).details) out[d.field] = d.message;
  return out;
}
