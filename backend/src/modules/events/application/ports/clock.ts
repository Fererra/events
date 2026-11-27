/** Port: current time and id generation (injectable for deterministic tests). */
export interface IClock {
  now(): Date;
}

export interface IIdGenerator {
  next(): string;
}

export const systemClock: IClock = { now: () => new Date() };
export const uuidGenerator: IIdGenerator = { next: () => crypto.randomUUID() };
