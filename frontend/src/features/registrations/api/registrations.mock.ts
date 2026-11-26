import { MOCK_DEMO_USER_ID } from '../../auth/api/auth.mock';
import { MOCK_EVENTS } from '../../events/api/events.mock';
import type { EventRegistration, MyRegistration, TicketType } from '../types';

interface MockTicketSeed {
  id: number;
  eventId: number;
  type: string;
  limit: number;
  price: number;
  initialSold: number;
}

const STORAGE_KEY = 'es-mock-registrations-v2';

const MOCK_TICKET_SEEDS: MockTicketSeed[] = [
  // Event 1: KPI Software Engineering Summit 2026 (ACTIVE)
  { id: 1, eventId: 1, type: 'Early Bird', limit: 80, price: 150, initialSold: 80 },
  { id: 2, eventId: 1, type: 'Student', limit: 200, price: 0, initialSold: 142 },
  { id: 3, eventId: 1, type: 'Standard', limit: 350, price: 250, initialSold: 215 },
  { id: 4, eventId: 1, type: 'VIP', limit: 30, price: 650, initialSold: 29 },

  // Event 2: Winter Hackathon: Smart Campus (ACTIVE)
  { id: 5, eventId: 2, type: 'Participant', limit: 120, price: 0, initialSold: 96 },
  { id: 6, eventId: 2, type: 'Mentor / Guest', limit: 25, price: 100, initialSold: 25 },

  // Event 3: PostgreSQL Performance & Indexing Workshop (ACTIVE)
  { id: 7, eventId: 3, type: 'Early Bird', limit: 20, price: 180, initialSold: 20 },
  { id: 8, eventId: 3, type: 'Standard', limit: 50, price: 300, initialSold: 34 },
  { id: 9, eventId: 3, type: 'Hands-on Lab', limit: 20, price: 450, initialSold: 19 },

  // Event 4: Sikorsky Aerospace & Robotics Expo (IN_PLANNING)
  { id: 10, eventId: 4, type: 'General Admission', limit: 300, price: 0, initialSold: 0 },
  { id: 11, eventId: 4, type: 'Demo Zone Pass', limit: 100, price: 200, initialSold: 0 },

  // Event 5: Academic Research & Open Science Forum (ACTIVE)
  { id: 12, eventId: 5, type: 'Researcher / Student', limit: 150, price: 0, initialSold: 88 },
  { id: 13, eventId: 5, type: 'Standard', limit: 80, price: 120, initialSold: 45 },

  // Event 6: Charity Futsal & Volleyball Cup (ACTIVE)
  { id: 14, eventId: 6, type: 'Spectator', limit: 500, price: 100, initialSold: 310 },
  { id: 15, eventId: 6, type: 'Team Player', limit: 160, price: 200, initialSold: 128 },
  { id: 16, eventId: 6, type: 'VIP Tribunal', limit: 40, price: 500, initialSold: 40 },

  // Event 7: Frontend Accessibility & Web Standards Meetup (IN_PLANNING)
  { id: 17, eventId: 7, type: 'Standard', limit: 90, price: 0, initialSold: 0 },

  // Event 8: Cloud-Native & Kubernetes Day (IN_PLANNING)
  { id: 18, eventId: 8, type: 'Student', limit: 120, price: 150, initialSold: 0 },
  { id: 19, eventId: 8, type: 'Standard', limit: 250, price: 400, initialSold: 0 },
  { id: 20, eventId: 8, type: 'VIP', limit: 40, price: 650, initialSold: 0 },

  // Event 9: Autumn Symphony & Choir Evening (FINISHED)
  { id: 21, eventId: 9, type: 'Balcony', limit: 400, price: 150, initialSold: 380 },
  { id: 22, eventId: 9, type: 'Parterre', limit: 800, price: 300, initialSold: 800 },

  // Event 10: Tech Career Fair & Resume Clinic (FINISHED)
  { id: 23, eventId: 10, type: 'Visitor', limit: 1000, price: 0, initialSold: 912 },
  { id: 24, eventId: 10, type: 'CV Review Slot', limit: 150, price: 100, initialSold: 150 },

  // Event 11: Outdoor Cinema & Acoustic Night (CANCELLED)
  { id: 25, eventId: 11, type: 'Lawn Entry', limit: 250, price: 0, initialSold: 74 },

  // Event 12: Cybersecurity CTF Qualifier (ACTIVE)
  { id: 26, eventId: 12, type: 'Competitor', limit: 140, price: 0, initialSold: 108 },
  { id: 27, eventId: 12, type: 'Pro Track', limit: 40, price: 350, initialSold: 40 },

  // Event 13: Product Design & UX Critiques Night (IN_PLANNING)
  { id: 28, eventId: 13, type: 'Listener', limit: 180, price: 0, initialSold: 0 },
  { id: 29, eventId: 13, type: 'Portfolio Review', limit: 30, price: 220, initialSold: 0 },

  // Event 14: Spring Open-Air Campus Festival Preview (IN_PLANNING)
  { id: 30, eventId: 14, type: 'General Entry', limit: 500, price: 0, initialSold: 0 },
  { id: 31, eventId: 14, type: 'Supporter Pass', limit: 150, price: 250, initialSold: 0 },
];

const SEED_REGISTRATIONS: EventRegistration[] = [
  {
    id: 'reg-seed-0001',
    userId: MOCK_DEMO_USER_ID,
    ticketId: 3,
    status: 'ACTIVE',
    registrationTimestamp: '2026-11-18T11:20:00.000Z',
  },
  {
    id: 'reg-seed-0002',
    userId: MOCK_DEMO_USER_ID,
    ticketId: 8,
    status: 'ACTIVE',
    registrationTimestamp: '2026-11-21T15:45:00.000Z',
  },
  {
    id: 'reg-seed-0003',
    userId: MOCK_DEMO_USER_ID,
    ticketId: 14,
    status: 'CANCELLED',
    registrationTimestamp: '2026-11-14T09:10:00.000Z',
  },
  {
    id: 'reg-seed-0004',
    userId: MOCK_DEMO_USER_ID,
    ticketId: 21,
    status: 'ACTIVE',
    registrationTimestamp: '2026-11-02T10:15:00.000Z',
  },
];

let memoryRegistrations: EventRegistration[] = [...SEED_REGISTRATIONS];

function isValidRegistration(item: unknown): item is EventRegistration {
  if (!item || typeof item !== 'object') return false;
  const r = item as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.userId === 'string' &&
    typeof r.ticketId === 'number' &&
    (r.status === 'ACTIVE' || r.status === 'CANCELLED') &&
    typeof r.registrationTimestamp === 'string'
  );
}

function loadRegistrations(): EventRegistration[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_REGISTRATIONS));
      memoryRegistrations = [...SEED_REGISTRATIONS];
      return memoryRegistrations;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return memoryRegistrations;
    memoryRegistrations = parsed.filter(isValidRegistration);
    return memoryRegistrations;
  } catch {
    return memoryRegistrations;
  }
}

function saveRegistrations(registrations: EventRegistration[]): void {
  memoryRegistrations = registrations;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations));
  } catch {
    // Fallback to in-memory storage when localStorage is unavailable
  }
}

function toTicketType(seed: MockTicketSeed, registrations: EventRegistration[]): TicketType {
  const sessionSold = registrations.filter(
    (reg) => reg.ticketId === seed.id && reg.status === 'ACTIVE',
  ).length;
  const remaining = Math.max(0, seed.limit - seed.initialSold - sessionSold);
  return {
    id: seed.id,
    eventId: seed.eventId,
    type: seed.type,
    limit: seed.limit,
    price: seed.price,
    remaining,
  };
}

function toMyRegistration(reg: EventRegistration): MyRegistration | null {
  const ticket = MOCK_TICKET_SEEDS.find((item) => item.id === reg.ticketId);
  if (!ticket) return null;
  const event = MOCK_EVENTS.find((item) => item.id === ticket.eventId);
  if (!event) return null;

  return {
    id: reg.id,
    event: {
      id: String(event.id),
      title: event.name,
      startsAt: event.startTimestamp,
      endsAt: event.endTimestamp,
      status: event.status,
    },
    ticket: {
      type: ticket.type,
      price: ticket.price,
    },
    status: reg.status,
    registeredAt: reg.registrationTimestamp,
  };
}

export function getMockTicketsByEvent(eventId: number): TicketType[] {
  const registrations = loadRegistrations();
  return MOCK_TICKET_SEEDS.filter((seed) => seed.eventId === eventId).map((seed) =>
    toTicketType(seed, registrations),
  );
}

export function findMockTicket(eventId: number, ticketId: number): TicketType | null {
  const seed = MOCK_TICKET_SEEDS.find(
    (item) => item.eventId === eventId && item.id === ticketId,
  );
  if (!seed) return null;
  return toTicketType(seed, loadRegistrations());
}

export function appendMockRegistration(registration: EventRegistration): void {
  const registrations = loadRegistrations();
  saveRegistrations([...registrations, registration]);
}

export function getMockRegistrationsByUser(userId: string): MyRegistration[] {
  return loadRegistrations()
    .filter((reg) => reg.userId === userId)
    .map(toMyRegistration)
    .filter((item): item is MyRegistration => item !== null)
    .sort(
      (a, b) =>
        Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt) ||
        Date.parse(a.registeredAt) - Date.parse(b.registeredAt),
    );
}

export function findMockRegistrationById(id: string): EventRegistration | null {
  return loadRegistrations().find((reg) => reg.id === id) ?? null;
}

export function isMockTicketEventFinished(ticketId: number): boolean {
  const ticket = MOCK_TICKET_SEEDS.find((item) => item.id === ticketId);
  if (!ticket) return false;
  const event = MOCK_EVENTS.find((item) => item.id === ticket.eventId);
  return event?.status === 'FINISHED';
}

export function cancelMockRegistration(id: string): MyRegistration | null {
  const registrations = loadRegistrations();
  const index = registrations.findIndex((reg) => reg.id === id);
  if (index === -1) return null;

  const updated: EventRegistration = {
    ...registrations[index],
    status: 'CANCELLED',
  };
  const next = registrations.slice();
  next[index] = updated;
  saveRegistrations(next);

  return toMyRegistration(updated);
}
