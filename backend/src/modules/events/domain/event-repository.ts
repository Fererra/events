import type { IEventLifecycleRepository } from '../application/ports/event-lifecycle-repository.js';
import type { Event } from './event.js';

/** Persistence port for events (implemented in infrastructure). */
export interface IEventRepository extends IEventLifecycleRepository {
  findById(id: string): Promise<Event | null>;
  add(event: Event): Promise<void>;
  save(event: Event): Promise<void>;
  findActiveEndedBefore(now: Date): Promise<Event[]>;
}
