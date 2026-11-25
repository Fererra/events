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
  VALIDATION_ERROR: 'Please check that all fields are filled out correctly.',
  CAPACITY_INVALID: 'Capacity must be a positive integer.',
  UNAUTHORIZED: 'You need to sign in.',
  INVALID_TOKEN: 'Invalid session. Please sign in again.',
  TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  INVALID_REFRESH_TOKEN: 'Your session has expired. Please sign in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  EVENT_NOT_FOUND: 'Event not found.',
  ROUTE_NOT_FOUND: 'Resource not found.',
  EMAIL_TAKEN: 'This email is already registered. Try signing in.',
  ADDRESS_TAKEN: 'A venue with this address already exists.',
  TICKETS_SOLD_OUT: 'Tickets of this type are sold out. Please choose another type.',
  INVALID_STATUS_TRANSITION: 'Cannot change the event status to the selected one.',
  INTERNAL_ERROR: 'Something went wrong on the server. Please try again later.',
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
};

const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  password: 'Password',
  name: 'Name',
  address: 'Address',
  capacity: 'Capacity',
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
  return MESSAGES[e.code] ?? 'Failed to complete the action. Please try again.';
}

export function fieldErrors(error: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of normalizeError(error).details) out[d.field] = d.message;
  return out;
}
