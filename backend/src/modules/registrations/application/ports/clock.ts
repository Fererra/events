import { randomUUID } from 'node:crypto';

export interface IClock {
  now(): Date;
}

export interface IIdGenerator {
  next(): string;
}

export const systemClock: IClock = { now: () => new Date() };
export const uuidGenerator: IIdGenerator = { next: () => randomUUID() };
