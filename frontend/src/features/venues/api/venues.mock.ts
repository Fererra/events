import { createMockCollection } from '../../../shared/api/mock-helpers';
import type { Venue } from '../types';

const MOCK_VENUES: Venue[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    name: 'KPI Center for Culture and Arts',
    address: '37 Beresteiskyi Ave, Kyiv',
    capacity: 1500,
    createdAt: '2026-09-01T09:00:00Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    name: 'Sikorsky Scientific Library Hall',
    address: '37L Beresteiskyi Ave, Building 1A, Kyiv',
    capacity: 240,
    createdAt: '2026-09-05T11:30:00Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    name: 'Belka Student Space',
    address: '37 Beresteiskyi Ave, Building 1, Room 101, Kyiv',
    capacity: 90,
    createdAt: '2026-09-12T14:15:00Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111104',
    name: 'Polytech Innovation Hub',
    address: '12 Politekhnichna St, Building 6, Kyiv',
    capacity: 180,
    createdAt: '2026-09-18T10:00:00Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111105',
    name: 'Unit.City Main Campus B12',
    address: '3 Dorohozhytska St, Kyiv',
    capacity: 420,
    createdAt: '2026-10-02T08:45:00Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111106',
    name: 'KPI Sports Complex Arena',
    address: '20 Verkhnokliuchova St, Kyiv',
    capacity: 850,
    createdAt: '2026-10-10T16:20:00Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111107',
    name: 'Open-Air Polyana Amphitheater',
    address: '37P Beresteiskyi Ave, Campus Park, Kyiv',
    capacity: null,
    createdAt: '2026-10-19T12:00:00Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111108',
    name: 'Building 18 Conference Hall',
    address: '14 Politekhnichna St, Building 18, Kyiv',
    capacity: 140,
    createdAt: '2026-11-01T09:10:00Z',
  },
];

const STORAGE_KEY = 'es-mock-venues-v1';

function isValidVenue(item: unknown): item is Venue {
  if (!item || typeof item !== 'object') return false;
  const v = item as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.address === 'string' &&
    (v.capacity === null || typeof v.capacity === 'number') &&
    typeof v.createdAt === 'string'
  );
}

const venuesCollection = createMockCollection(STORAGE_KEY, MOCK_VENUES, isValidVenue);

export const loadMockVenues = venuesCollection.load;
export const saveMockVenues = venuesCollection.save;

export function findMockVenueById(id: string): Venue | null {
  return loadMockVenues().find((v) => v.id === id) ?? null;
}
