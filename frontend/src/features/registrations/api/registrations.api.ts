import { ApiError } from '../../../shared/api/errors';
import { useAuthStore } from '../../auth/store/auth.store';
import { findMockEventById } from '../../events/api/events.mock';
import type {
  AdminRegistration,
  CreateTicketTypeInput,
  EventRegistration,
  EventTicketSummary,
  MyRegistration,
  TicketType,
} from '../types';
import {
  addMockTicket,
  appendMockRegistration,
  cancelMockRegistration,
  deleteMockTicket,
  findMockRegistrationById,
  findMockTicket,
  getAllMockRegistrations,
  getMockRegistrationsByUser,
  getMockTicketSoldCount,
  getMockTicketSummariesByEvent,
  getMockTicketsByEvent,
  hasMockTicketTypeName,
  isMockTicketEventFinished,
} from './registrations.mock';

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function requireAdmin(): void {
  const { user, refreshToken } = useAuthStore.getState();
  if (!user || !refreshToken) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Please sign in to continue');
  }
  if (user.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Admin role is required');
  }
}

// Mock implementation until backend ticket and registration endpoints
// (GET /events/:id/tickets, POST /events/:id/registrations,
//  GET /me/registrations, POST /registrations/:id/cancel) are available.
export async function fetchEventTickets(
  eventId: number,
  signal?: AbortSignal,
): Promise<TicketType[]> {
  assertNotAborted(signal);

  if (!Number.isInteger(eventId) || eventId <= 0) {
    throw new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found');
  }

  const event = findMockEventById(eventId);
  if (!event) {
    throw new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found');
  }

  return getMockTicketsByEvent(eventId);
}

export async function registerForEvent(
  eventId: number,
  ticketId: number,
  signal?: AbortSignal,
): Promise<EventRegistration> {
  assertNotAborted(signal);

  const { user, refreshToken } = useAuthStore.getState();
  if (!user || !refreshToken) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Please sign in to register');
  }

  if (!Number.isInteger(eventId) || eventId <= 0) {
    throw new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found');
  }

  const event = findMockEventById(eventId);
  if (!event) {
    throw new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found');
  }

  if (event.status !== 'ACTIVE') {
    throw new ApiError(
      409,
      'EVENT_REGISTRATION_CLOSED',
      'Registration for this event is currently closed',
    );
  }

  const ticket = findMockTicket(eventId, ticketId);
  if (!ticket) {
    throw new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket type not found');
  }

  if (ticket.remaining <= 0) {
    throw new ApiError(409, 'TICKETS_SOLD_OUT', 'Tickets of this type are sold out');
  }

  const registration: EventRegistration = {
    id: generateUuid(),
    userId: user.id,
    ticketId: ticket.id,
    status: 'ACTIVE',
    registrationTimestamp: new Date().toISOString(),
  };

  appendMockRegistration(registration);
  return registration;
}

export async function fetchMyRegistrations(signal?: AbortSignal): Promise<MyRegistration[]> {
  assertNotAborted(signal);

  const { user, refreshToken } = useAuthStore.getState();
  if (!user || !refreshToken) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Please sign in to view your registrations');
  }

  return getMockRegistrationsByUser(user.id);
}

export async function cancelRegistration(
  registrationId: string,
  signal?: AbortSignal,
): Promise<MyRegistration> {
  assertNotAborted(signal);

  const { user, refreshToken } = useAuthStore.getState();
  if (!user || !refreshToken) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Please sign in to cancel a registration');
  }

  const existing = findMockRegistrationById(registrationId);
  if (!existing) {
    throw new ApiError(404, 'REGISTRATION_NOT_FOUND', 'Registration not found');
  }

  if (existing.userId !== user.id && user.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to cancel this registration');
  }

  if (existing.status === 'CANCELLED') {
    throw new ApiError(
      409,
      'REGISTRATION_ALREADY_CANCELLED',
      'This registration has already been cancelled',
    );
  }

  if (isMockTicketEventFinished(existing.ticketId)) {
    throw new ApiError(409, 'EVENT_REGISTRATION_CLOSED', 'This event has already finished');
  }

  const updated = cancelMockRegistration(registrationId);
  if (!updated) {
    throw new ApiError(404, 'REGISTRATION_NOT_FOUND', 'Registration not found');
  }

  return updated;
}

export async function createEventTicket(
  eventId: number,
  input: CreateTicketTypeInput,
  signal?: AbortSignal,
): Promise<TicketType> {
  assertNotAborted(signal);
  requireAdmin();

  const event = findMockEventById(eventId);
  if (!event) {
    throw new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found');
  }

  if (event.status === 'FINISHED' || event.status === 'CANCELLED') {
    throw new ApiError(
      409,
      'EVENT_NOT_EDITABLE',
      'Finished or cancelled events cannot be modified',
    );
  }

  const typeName = input.type.trim();
  const details: { field: string; message: string }[] = [];
  if (!typeName) {
    details.push({ field: 'type', message: 'Enter a ticket type name.' });
  } else if (typeName.length > 80) {
    details.push({ field: 'type', message: 'Ticket type must be at most 80 characters.' });
  }
  if (details.length > 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', details);
  }

  if (!Number.isInteger(input.limit) || input.limit < 1) {
    throw new ApiError(400, 'TICKET_LIMIT_INVALID', 'Ticket limit must be a positive integer');
  }

  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new ApiError(400, 'TICKET_PRICE_INVALID', 'Ticket price must be zero or positive');
  }

  if (hasMockTicketTypeName(eventId, typeName)) {
    throw new ApiError(
      409,
      'TICKET_TYPE_EXISTS',
      'A ticket type with this name already exists for this event',
    );
  }

  return addMockTicket(eventId, {
    type: typeName,
    limit: input.limit,
    price: Math.round(input.price * 100) / 100,
  });
}

export async function deleteEventTicket(
  eventId: number,
  ticketId: number,
  signal?: AbortSignal,
): Promise<void> {
  assertNotAborted(signal);
  requireAdmin();

  const ticket = findMockTicket(eventId, ticketId);
  if (!ticket) {
    throw new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket type not found');
  }

  if (getMockTicketSoldCount(ticketId) > 0) {
    throw new ApiError(
      409,
      'TICKET_IN_USE',
      'This ticket type cannot be deleted because it already has registrations',
    );
  }

  deleteMockTicket(eventId, ticketId);
}

export async function fetchAllRegistrations(
  signal?: AbortSignal,
): Promise<AdminRegistration[]> {
  assertNotAborted(signal);
  requireAdmin();
  return getAllMockRegistrations();
}

export async function fetchTicketSummariesByEvent(
  signal?: AbortSignal,
): Promise<Record<number, EventTicketSummary>> {
  assertNotAborted(signal);
  return getMockTicketSummariesByEvent();
}
