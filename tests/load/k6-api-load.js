import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://localhost:8443/api';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'change-me-admin';
const DURATION = __ENV.DURATION || '30s';
const READ_RPS = Number(__ENV.READ_RPS || 20);
const WRITE_RPS = Number(__ENV.WRITE_RPS || 15);
const USER_POOL_SIZE = Number(__ENV.USER_POOL_SIZE || 20);

export const options = {
  insecureSkipTLSVerify: true,
  setupTimeout: '120s',
  scenarios: {
    catalog_read: {
      executor: 'constant-arrival-rate',
      exec: 'browseCatalog',
      rate: READ_RPS,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: 20,
      maxVUs: 60,
    },
    event_registration: {
      executor: 'constant-arrival-rate',
      exec: 'registerTicket',
      rate: WRITE_RPS,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: 15,
      maxVUs: 40,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<=300'],
    'http_req_duration{endpoint:events_list}': ['p(95)<=300'],
    'http_req_duration{endpoint:event_tickets}': ['p(95)<=300'],
    'http_req_duration{endpoint:create_registration}': ['p(95)<=300'],
    checks: ['rate>=0.99'],
  },
};

function jsonHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function setup() {
  const runId = Date.now();

  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    { headers: jsonHeaders(), tags: { endpoint: 'setup' } },
  );
  if (loginRes.status !== 200) {
    throw new Error(`Admin login failed (${loginRes.status}): ${loginRes.body}`);
  }
  const adminToken = loginRes.json('accessToken');

  const venueRes = http.post(
    `${BASE_URL}/venues`,
    JSON.stringify({
      name: `Load Test Arena ${runId}`,
      address: `Kyiv, Performance Blvd ${runId}`,
      capacity: 15000,
    }),
    { headers: jsonHeaders(adminToken), tags: { endpoint: 'setup' } },
  );
  if (venueRes.status !== 201) {
    throw new Error(`Venue setup failed (${venueRes.status}): ${venueRes.body}`);
  }
  const venueId = venueRes.json('id');

  const events = [];
  for (let i = 0; i < 3; i++) {
    const evRes = http.post(
      `${BASE_URL}/events`,
      JSON.stringify({
        title: `Load Test Event ${runId}-${i + 1}`,
        description: 'Synthetic event created for 50 RPS load verification (ES-41)',
        startsAt: '2027-08-01T17:00:00Z',
        endsAt: '2027-08-01T21:00:00Z',
        organizer: 'KPI QA',
        venueId,
      }),
      { headers: jsonHeaders(adminToken), tags: { endpoint: 'setup' } },
    );
    if (evRes.status !== 201) {
      throw new Error(`Event setup failed (${evRes.status}): ${evRes.body}`);
    }
    const eventId = evRes.json('id');

    const tkRes = http.post(
      `${BASE_URL}/events/${eventId}/tickets`,
      JSON.stringify({ type: 'Standard', limit: 4000, price: 250 }),
      { headers: jsonHeaders(adminToken), tags: { endpoint: 'setup' } },
    );
    if (tkRes.status !== 201) {
      throw new Error(`Ticket setup failed (${tkRes.status}): ${tkRes.body}`);
    }
    const ticketTypeId = tkRes.json('id');

    const pubRes = http.patch(
      `${BASE_URL}/events/${eventId}/status`,
      JSON.stringify({ status: 'ACTIVE' }),
      { headers: jsonHeaders(adminToken), tags: { endpoint: 'setup' } },
    );
    if (pubRes.status !== 200) {
      throw new Error(`Publish setup failed (${pubRes.status}): ${pubRes.body}`);
    }

    events.push({ eventId, ticketTypeId });
  }

  const userTokens = [];
  for (let i = 0; i < USER_POOL_SIZE; i++) {
    const email = `k6-user-${runId}-${i}@example.com`;
    const password = 'k6-load-password';
    const regRes = http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({
        surname: 'Load',
        name: 'Tester',
        phone: '+380501234567',
        email,
        password,
      }),
      { headers: jsonHeaders(), tags: { endpoint: 'setup' } },
    );
    if (regRes.status !== 201) {
      throw new Error(`User register failed (${regRes.status}): ${regRes.body}`);
    }

    const authRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email, password }), {
      headers: jsonHeaders(),
      tags: { endpoint: 'setup' },
    });
    if (authRes.status !== 200) {
      throw new Error(`User login failed (${authRes.status}): ${authRes.body}`);
    }
    userTokens.push(authRes.json('accessToken'));
  }

  return { events, userTokens };
}

export function browseCatalog(data) {
  const listRes = http.get(`${BASE_URL}/events?page=1&limit=10&status=ACTIVE`, {
    tags: { endpoint: 'events_list' },
  });
  check(listRes, {
    'GET /events returns 200': (r) => r.status === 200,
  });

  const target = data.events[Math.floor(Math.random() * data.events.length)];
  const ticketsRes = http.get(`${BASE_URL}/events/${target.eventId}/tickets`, {
    tags: { endpoint: 'event_tickets' },
  });
  check(ticketsRes, {
    'GET /events/:id/tickets returns 200': (r) => r.status === 200,
  });
}

export function registerTicket(data) {
  const target = data.events[Math.floor(Math.random() * data.events.length)];
  const token = data.userTokens[Math.floor(Math.random() * data.userTokens.length)];

  const res = http.post(
    `${BASE_URL}/events/${target.eventId}/registrations`,
    JSON.stringify({ ticketTypeId: target.ticketTypeId }),
    {
      headers: jsonHeaders(token),
      tags: { endpoint: 'create_registration' },
    },
  );
  check(res, {
    'POST /registrations returns 201 or 409 TICKETS_SOLD_OUT': (r) =>
      r.status === 201 || (r.status === 409 && r.json('code') === 'TICKETS_SOLD_OUT'),
  });
}
