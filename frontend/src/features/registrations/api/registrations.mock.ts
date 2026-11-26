import type { EventRegistration, TicketType } from '../types';

interface MockTicketSeed {
  id: number;
  eventId: number;
  type: string;
  limit: number;
  price: number;
  initialSold: number;
}

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

const mockRegistrations: EventRegistration[] = [];

function toTicketType(seed: MockTicketSeed): TicketType {
  const sessionSold = mockRegistrations.filter((reg) => reg.ticketId === seed.id).length;
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

export function getMockTicketsByEvent(eventId: number): TicketType[] {
  return MOCK_TICKET_SEEDS.filter((seed) => seed.eventId === eventId).map(toTicketType);
}

export function findMockTicket(eventId: number, ticketId: number): TicketType | null {
  const seed = MOCK_TICKET_SEEDS.find(
    (item) => item.eventId === eventId && item.id === ticketId,
  );
  return seed ? toTicketType(seed) : null;
}

export function appendMockRegistration(registration: EventRegistration): void {
  mockRegistrations.push(registration);
}
