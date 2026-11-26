import { ApiError } from '../../../shared/api/errors';
import { useAuthStore } from '../../auth/store/auth.store';
import { MOCK_EVENTS } from '../../events/api/events.mock';
import type { EventRegistration, MyRegistration, TicketType } from '../types';
import {
  appendMockRegistration,
  cancelMockRegistration,
  findMockRegistrationById,
  findMockTicket,
  getMockRegistrationsByUser,
  getMockTicketsByEvent,
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

  const event = MOCK_EVENTS.find((item) => item.id === eventId);
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

  const event = MOCK_EVENTS.find((item) => item.id === eventId);
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
