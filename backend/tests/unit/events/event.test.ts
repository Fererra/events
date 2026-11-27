import { describe, expect, it } from 'vitest';
import { InvalidEventStatusTransitionError } from '../../../src/modules/events/domain/errors.js';
import { Event } from '../../../src/modules/events/domain/event.js';
import { EventPeriod } from '../../../src/modules/events/domain/event-period.js';
import { ValidationError } from '../../../src/shared/domain/errors.js';

const NOW = new Date('2026-11-27T12:00:00Z');
const START = new Date('2026-12-01T10:00:00Z');
const END = new Date('2026-12-01T18:00:00Z');
const AFTER_END = new Date('2026-12-01T18:30:00Z');

const makeEvent = (overrides: Partial<Parameters<typeof Event.create>[0]> = {}) =>
  Event.create({
    id: 'ev-1',
    title: '  KPI Summit  ',
    description: '  Annual conference  ',
    startsAt: START,
    endsAt: END,
    organizer: '  FICE KPI  ',
    venueId: 'venue-1',
    now: NOW,
    ...overrides,
  });

describe('EventPeriod', () => {
  it('enforces endsAt strictly after startsAt', () => {
    const period = EventPeriod.create(START, END);
    expect(period.startsAt).toEqual(START);
    expect(period.endsAt).toEqual(END);
    expect(period.hasEnded(START)).toBe(false);
    expect(period.hasEnded(END)).toBe(true);
    expect(period.hasEnded(AFTER_END)).toBe(true);
  });

  it.each([
    ['equal timestamps', START, START],
    ['end before start', END, START],
    ['invalid start date', new Date('nope'), END],
    ['invalid end date', START, new Date('nope')],
  ])('rejects %s → ValidationError EVENT_PERIOD_INVALID', (_label, s, e) => {
    expect(() => EventPeriod.create(s, e)).toThrow(ValidationError);
    expect(() => EventPeriod.create(s, e)).toThrow(
      expect.objectContaining({ code: 'EVENT_PERIOD_INVALID' }),
    );
  });
});

describe('Event aggregate and state machine (LR2 §4.2)', () => {
  it('starts in IN_PLANNING with trimmed fields and closed registrations', () => {
    const ev = makeEvent();
    expect(ev.title).toBe('KPI Summit');
    expect(ev.description).toBe('Annual conference');
    expect(ev.organizer).toBe('FICE KPI');
    expect(ev.venueId).toBe('venue-1');
    expect(ev.status).toBe('IN_PLANNING');
    expect(ev.createdAt).toEqual(NOW);
    expect(ev.acceptsRegistrations()).toBe(false);
    expect(ev.isScheduled()).toBe(true);
    expect(ev.period.endsAt).toEqual(END);
  });

  it.each([
    ['blank title', { title: '   ' }, 'EVENT_TITLE_INVALID'],
    ['too long title', { title: 'A'.repeat(201) }, 'EVENT_TITLE_INVALID'],
    ['too long description', { description: 'D'.repeat(5001) }, 'EVENT_DESCRIPTION_INVALID'],
    ['blank organizer', { organizer: '   ' }, 'EVENT_ORGANIZER_INVALID'],
    ['too long organizer', { organizer: 'O'.repeat(201) }, 'EVENT_ORGANIZER_INVALID'],
  ])('rejects %s', (_label, override, code) => {
    expect(() => makeEvent(override)).toThrow(ValidationError);
    expect(() => makeEvent(override)).toThrow(expect.objectContaining({ code }));
  });

  it('IN_PLANNING → ACTIVE requires at least one ticket type', () => {
    const ev = makeEvent();
    expect(() => ev.publish(false)).toThrow(InvalidEventStatusTransitionError);
    expect(ev.status).toBe('IN_PLANNING');

    ev.publish(true);
    expect(ev.status).toBe('ACTIVE');
    expect(ev.acceptsRegistrations()).toBe(true);
    expect(ev.isScheduled()).toBe(true);
  });

  it('ACTIVE → FINISHED only after endsAt; FINISHED is terminal and deletable', () => {
    const ev = makeEvent();
    ev.publish(true);

    expect(() => ev.finish(START)).toThrow(InvalidEventStatusTransitionError);
    expect(ev.status).toBe('ACTIVE');

    ev.finish(AFTER_END);
    expect(ev.status).toBe('FINISHED');
    expect(ev.acceptsRegistrations()).toBe(false);
    expect(ev.isScheduled()).toBe(false);
    expect(() => ev.delete()).not.toThrow();

    expect(() => ev.publish(true)).toThrow(InvalidEventStatusTransitionError);
    expect(() => ev.cancel()).toThrow(InvalidEventStatusTransitionError);
    expect(() => ev.finish(AFTER_END)).toThrow(InvalidEventStatusTransitionError);
  });

  it('allows cancel() from IN_PLANNING and ACTIVE, forbids from CANCELLED', () => {
    const fromPlanning = makeEvent();
    fromPlanning.cancel();
    expect(fromPlanning.status).toBe('CANCELLED');
    expect(fromPlanning.isScheduled()).toBe(false);
    expect(() => fromPlanning.delete()).not.toThrow();
    expect(() => fromPlanning.cancel()).toThrow(InvalidEventStatusTransitionError);
    expect(() => fromPlanning.publish(true)).toThrow(InvalidEventStatusTransitionError);

    const fromActive = makeEvent();
    fromActive.publish(true);
    fromActive.cancel();
    expect(fromActive.status).toBe('CANCELLED');
  });

  it('forbids finish() from IN_PLANNING and forbids delete() from IN_PLANNING or ACTIVE', () => {
    const ev = makeEvent();
    expect(() => ev.finish(AFTER_END)).toThrow(InvalidEventStatusTransitionError);
    expect(() => ev.delete()).toThrow(InvalidEventStatusTransitionError);

    ev.publish(true);
    expect(() => ev.delete()).toThrow(InvalidEventStatusTransitionError);
  });
});
