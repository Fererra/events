import { createMockCollection } from '../../../shared/api/mock-helpers';
import { isEventStatus, isTerminalEventStatus, type EventItem } from '../types';

const OWNER_ID = '22222222-2222-4222-8222-222222222201';

const MOCK_EVENTS: EventItem[] = [
  {
    id: 1,
    name: 'KPI Software Engineering Summit 2026',
    ownerId: OWNER_ID,
    description:
      'Annual engineering conference bringing together students, researchers, and industry architects to discuss distributed systems, TypeScript at scale, and pragmatic testing strategies.',
    startTimestamp: '2026-12-03T10:00:00+02:00',
    endTimestamp: '2026-12-03T18:00:00+02:00',
    organisator: 'Faculty of Informatics and Computer Engineering',
    venueId: '11111111-1111-4111-8111-111111111101',
    status: 'ACTIVE',
    createdAt: '2026-10-15T10:00:00Z',
  },
  {
    id: 2,
    name: 'Winter Hackathon: Smart Campus',
    ownerId: OWNER_ID,
    description:
      '48-hour team hackathon focused on campus accessibility, energy monitoring, and student life automation. Mentors from partner tech companies will support participants throughout the weekend.',
    startTimestamp: '2026-12-11T17:00:00+02:00',
    endTimestamp: '2026-12-13T19:00:00+02:00',
    organisator: 'KPI Student Council',
    venueId: '11111111-1111-4111-8111-111111111104',
    status: 'ACTIVE',
    createdAt: '2026-10-20T12:30:00Z',
  },
  {
    id: 3,
    name: 'PostgreSQL Performance & Indexing Workshop',
    ownerId: OWNER_ID,
    description:
      'Hands-on technical session covering query plans, B-tree and GIN indexes, transaction isolation levels, and zero-downtime schema migrations.',
    startTimestamp: '2026-12-05T14:00:00+02:00',
    endTimestamp: '2026-12-05T17:30:00+02:00',
    organisator: 'Kyiv Database Guild',
    venueId: '11111111-1111-4111-8111-111111111103',
    status: 'ACTIVE',
    createdAt: '2026-10-25T09:15:00Z',
  },
  {
    id: 4,
    name: 'Sikorsky Aerospace & Robotics Expo',
    ownerId: OWNER_ID,
    description:
      'Showcase of autonomous drones, robotics prototypes, and embedded telemetry projects developed by university labs and partner engineering teams.',
    startTimestamp: '2026-12-18T11:00:00+02:00',
    endTimestamp: '2026-12-18T17:00:00+02:00',
    organisator: 'Sikorsky Challenge Ukraine',
    venueId: '11111111-1111-4111-8111-111111111105',
    status: 'IN_PLANNING',
    createdAt: '2026-11-01T11:00:00Z',
  },
  {
    id: 5,
    name: 'Academic Research & Open Science Forum',
    ownerId: OWNER_ID,
    description:
      'Interdisciplinary forum on open datasets, reproducible computational experiments, and collaborative research grants for young scientists.',
    startTimestamp: '2026-12-09T10:30:00+02:00',
    endTimestamp: '2026-12-09T16:00:00+02:00',
    organisator: 'KPI Scientific Library',
    venueId: '11111111-1111-4111-8111-111111111102',
    status: 'ACTIVE',
    createdAt: '2026-11-02T14:00:00Z',
  },
  {
    id: 6,
    name: 'Charity Futsal & Volleyball Cup',
    ownerId: OWNER_ID,
    description:
      'Inter-faculty indoor tournament featuring mixed teams, live commentary, and fundraising in support of student volunteer initiatives.',
    startTimestamp: '2026-12-14T09:00:00+02:00',
    endTimestamp: '2026-12-14T18:30:00+02:00',
    organisator: 'KPI Sports Club',
    venueId: '11111111-1111-4111-8111-111111111106',
    status: 'ACTIVE',
    createdAt: '2026-11-04T08:30:00Z',
  },
  {
    id: 7,
    name: 'Frontend Accessibility & Web Standards Meetup',
    ownerId: OWNER_ID,
    description:
      'Practical talk on semantic HTML, keyboard navigation, color contrast, and building fast responsive web apps without heavy runtime dependencies.',
    startTimestamp: '2026-12-16T18:30:00+02:00',
    endTimestamp: '2026-12-16T21:00:00+02:00',
    organisator: 'Kyiv Web Community',
    venueId: '11111111-1111-4111-8111-111111111103',
    status: 'IN_PLANNING',
    createdAt: '2026-11-06T15:45:00Z',
  },
  {
    id: 8,
    name: 'Cloud-Native & Kubernetes Day',
    ownerId: OWNER_ID,
    description:
      'Full-day track covering container security, GitOps deployment pipelines, observability with OpenTelemetry, and resilient multi-zone architectures.',
    startTimestamp: '2027-01-15T10:00:00+02:00',
    endTimestamp: '2027-01-15T18:00:00+02:00',
    organisator: 'CNCF Kyiv Chapter',
    venueId: '11111111-1111-4111-8111-111111111105',
    status: 'IN_PLANNING',
    createdAt: '2026-11-08T10:20:00Z',
  },
  {
    id: 9,
    name: 'Autumn Symphony & Choir Evening',
    ownerId: OWNER_ID,
    description:
      'Evening concert by the KPI student chamber orchestra and choir performing classical film scores and contemporary Ukrainian compositions.',
    startTimestamp: '2026-11-10T18:00:00+02:00',
    endTimestamp: '2026-11-10T20:30:00+02:00',
    organisator: 'KPI Cultural Center',
    venueId: '11111111-1111-4111-8111-111111111101',
    status: 'FINISHED',
    createdAt: '2026-09-25T13:00:00Z',
  },
  {
    id: 10,
    name: 'Tech Career Fair & Resume Clinic',
    ownerId: OWNER_ID,
    description:
      'Meet engineering leads and recruiters from 30+ Ukrainian and international product companies, attend mock interviews, and get portfolio feedback.',
    startTimestamp: '2026-10-22T11:00:00+03:00',
    endTimestamp: '2026-10-22T17:00:00+03:00',
    organisator: 'KPI Career Center',
    venueId: '11111111-1111-4111-8111-111111111101',
    status: 'FINISHED',
    createdAt: '2026-09-10T09:00:00Z',
  },
  {
    id: 11,
    name: 'Outdoor Cinema & Acoustic Night',
    ownerId: OWNER_ID,
    description:
      'Open-air film screening and acoustic music set in the campus park. Cancelled due to forecasted autumn rain and cold temperatures.',
    startTimestamp: '2026-10-18T19:00:00+03:00',
    endTimestamp: '2026-10-18T22:00:00+03:00',
    organisator: 'Polyana Arts Collective',
    venueId: '11111111-1111-4111-8111-111111111107',
    status: 'CANCELLED',
    createdAt: '2026-09-28T16:10:00Z',
  },
  {
    id: 12,
    name: 'Cybersecurity CTF Qualifier',
    ownerId: OWNER_ID,
    description:
      'Jeopardy-style Capture The Flag competition covering web exploitation, reverse engineering, cryptography, and digital forensics.',
    startTimestamp: '2026-12-20T10:00:00+02:00',
    endTimestamp: '2026-12-20T20:00:00+02:00',
    organisator: 'KPI Cyber Defense Lab',
    venueId: '11111111-1111-4111-8111-111111111104',
    status: 'ACTIVE',
    createdAt: '2026-11-12T11:40:00Z',
  },
  {
    id: 13,
    name: 'Product Design & UX Critiques Night',
    ownerId: OWNER_ID,
    description:
      'Interactive portfolio and case study review session where designers dissect real user flows, mobile responsiveness, and design systems.',
    startTimestamp: '2027-01-22T18:00:00+02:00',
    endTimestamp: '2027-01-22T20:30:00+02:00',
    organisator: 'Designers of KPI',
    venueId: '11111111-1111-4111-8111-111111111102',
    status: 'IN_PLANNING',
    createdAt: '2026-11-18T17:00:00Z',
  },
  {
    id: 14,
    name: 'Spring Open-Air Campus Festival Preview',
    ownerId: OWNER_ID,
    description:
      'Early planning preview for the annual outdoor campus festival featuring student bands, science demos, and food courts.',
    startTimestamp: '2027-04-24T12:00:00+03:00',
    endTimestamp: '2027-04-24T21:00:00+03:00',
    organisator: 'KPI Student Council',
    venueId: '11111111-1111-4111-8111-111111111107',
    status: 'IN_PLANNING',
    createdAt: '2026-11-22T10:05:00Z',
  },
];

const STORAGE_KEY = 'es-mock-events-v1';

function isValidEvent(item: unknown): item is EventItem {
  if (!item || typeof item !== 'object') return false;
  const e = item as Record<string, unknown>;
  return (
    typeof e.id === 'number' &&
    typeof e.name === 'string' &&
    typeof e.ownerId === 'string' &&
    typeof e.description === 'string' &&
    typeof e.startTimestamp === 'string' &&
    typeof e.endTimestamp === 'string' &&
    typeof e.organisator === 'string' &&
    typeof e.venueId === 'string' &&
    isEventStatus(e.status) &&
    typeof e.createdAt === 'string'
  );
}

const eventsCollection = createMockCollection(STORAGE_KEY, MOCK_EVENTS, isValidEvent);

export const loadMockEvents = eventsCollection.load;
export const saveMockEvents = eventsCollection.save;

export function findMockEventById(id: number): EventItem | null {
  return loadMockEvents().find((item) => item.id === id) ?? null;
}

export function hasScheduledEventsAtVenue(venueId: string): boolean {
  return loadMockEvents().some(
    (event) => event.venueId === venueId && !isTerminalEventStatus(event.status),
  );
}

export function getScheduledEventCountsByVenue(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of loadMockEvents()) {
    if (!isTerminalEventStatus(event.status)) {
      counts[event.venueId] = (counts[event.venueId] ?? 0) + 1;
    }
  }
  return counts;
}
