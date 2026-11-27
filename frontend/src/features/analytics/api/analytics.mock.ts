import { ApiError } from '../../../shared/api/errors';
import { loadMockEvents } from '../../events/api/events.mock';
import { getMockRegistrationStatsByEvent } from '../../registrations/api/registrations.mock';
import type { EventAnalyticsItem, FetchEventAnalyticsParams } from '../types';

const ACTIVITY_STORAGE_KEY = 'es-mock-analytics-activity-v1';

const SEED_LAST_ACTIVITY: Record<number, string> = {
  1: '2026-11-26T16:40:00.000Z',
  2: '2026-11-25T19:15:00.000Z',
  3: '2026-11-24T13:20:00.000Z',
  5: '2026-11-23T10:05:00.000Z',
  6: '2026-11-26T12:10:00.000Z',
  9: '2026-11-09T17:45:00.000Z',
  10: '2026-10-21T16:30:00.000Z',
  11: '2026-10-16T09:00:00.000Z',
  12: '2026-11-27T11:30:00.000Z',
};

let memoryActivityLog: Record<string, string> = {};

function loadActivityLog(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (raw === null) return memoryActivityLog;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return memoryActivityLog;
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
        cleaned[key] = value;
      }
    }
    memoryActivityLog = cleaned;
    return memoryActivityLog;
  } catch {
    return memoryActivityLog;
  }
}

function saveActivityLog(log: Record<string, string>): void {
  memoryActivityLog = log;
  try {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(log));
  } catch {
    // Fallback to in-memory storage when localStorage is unavailable
  }
}

function latestIso(...values: (string | null | undefined)[]): string | null {
  let latest: string | null = null;
  let latestMs = -Infinity;

  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (!Number.isNaN(ms) && ms > latestMs) {
      latestMs = ms;
      latest = new Date(ms).toISOString();
    }
  }

  return latest;
}

export function recordMockEventActivity(eventId: number, at = new Date().toISOString()): void {
  if (!Number.isInteger(eventId) || eventId <= 0) return;
  const log = loadActivityLog();
  const key = String(eventId);
  const next = latestIso(log[key], at);
  if (!next) return;
  saveActivityLog({ ...log, [key]: next });
}

export function getMockEventAnalytics(
  params: FetchEventAnalyticsParams = {},
): EventAnalyticsItem[] {
  const fromMs = params.from !== undefined ? Date.parse(params.from) : undefined;
  const toMs = params.to !== undefined ? Date.parse(params.to) : undefined;

  if (fromMs !== undefined && Number.isNaN(fromMs)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid "from" date-time filter');
  }
  if (toMs !== undefined && Number.isNaN(toMs)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid "to" date-time filter');
  }
  if (fromMs !== undefined && toMs !== undefined && fromMs > toMs) {
    throw new ApiError(400, 'PERIOD_INVALID', '"from" must not be later than "to"');
  }

  const events = loadMockEvents();
  const regStats = getMockRegistrationStatsByEvent();
  const activityLog = loadActivityLog();

  return events
    .filter((ev) => {
      if (params.status && ev.status !== params.status) return false;
      const startsMs = Date.parse(ev.startTimestamp);
      if (fromMs !== undefined && startsMs < fromMs) return false;
      if (toMs !== undefined && startsMs > toMs) return false;
      return true;
    })
    .slice()
    .sort((a, b) => Date.parse(b.startTimestamp) - Date.parse(a.startTimestamp))
    .map((ev) => {
      const reg = regStats[ev.id];
      return {
        event: {
          id: String(ev.id),
          title: ev.name,
          startsAt: ev.startTimestamp,
          endsAt: ev.endTimestamp,
          status: ev.status,
        },
        registrationsCount: reg?.registrationsCount ?? 0,
        isCancelled: ev.status === 'CANCELLED',
        lastActivityAt: latestIso(
          SEED_LAST_ACTIVITY[ev.id],
          reg?.lastRegistrationAt,
          activityLog[String(ev.id)],
        ),
      };
    });
}
