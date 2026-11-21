import { describe, expect, it } from 'vitest';
import { EventStats } from '../../../src/modules/analytics/domain/event-stats.js';

const at = (iso: string) => new Date(iso);

describe('EventStats', () => {
  it('counts registrations and cancellations', () => {
    const s = EventStats.empty('e1');
    s.recordRegistration(at('2026-11-01T10:00:00Z'));
    s.recordRegistration(at('2026-11-01T10:05:00Z'));
    s.recordCancellation(at('2026-11-01T10:10:00Z'));
    expect(s.registrationsCount).toBe(1);
    expect(s.lastActivityAt).toEqual(at('2026-11-01T10:10:00Z'));
  });

  it('never goes below zero', () => {
    const s = EventStats.empty('e1');
    s.recordCancellation(at('2026-11-01T10:00:00Z'));
    expect(s.registrationsCount).toBe(0);
  });

  it('marks cancellation of the event', () => {
    const s = EventStats.empty('e1');
    s.markEventCancelled(at('2026-11-02T00:00:00Z'));
    expect(s.isCancelled).toBe(true);
  });

  it('last activity never moves backwards on late delivery', () => {
    const s = EventStats.empty('e1');
    s.recordRegistration(at('2026-11-01T12:00:00Z'));
    s.recordRegistration(at('2026-11-01T11:00:00Z'));
    expect(s.lastActivityAt).toEqual(at('2026-11-01T12:00:00Z'));
  });
});
