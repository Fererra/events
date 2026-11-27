import type { PaginatedResponse } from './types';

export function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function paginate<T>(items: readonly T[], page = 1, limit = 6): PaginatedResponse<T> {
  const safeLimit = Math.max(1, Math.floor(limit));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (safePage - 1) * safeLimit;

  return {
    items: items.slice(start, start + safeLimit),
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
  };
}

export interface MockCollection<T> {
  load: () => T[];
  save: (items: T[]) => void;
}

/**
 * Persists a mock entity list in localStorage with an in-memory fallback
 * when storage is unavailable or corrupted.
 */
export function createMockCollection<T>(
  storageKey: string,
  seed: readonly T[],
  isValid: (item: unknown) => item is T,
): MockCollection<T> {
  let memory: T[] = [...seed];

  const load = (): T[] => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) {
        localStorage.setItem(storageKey, JSON.stringify(seed));
        memory = [...seed];
        return memory;
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return memory;
      memory = parsed.filter(isValid);
      return memory;
    } catch {
      return memory;
    }
  };

  const save = (items: T[]): void => {
    memory = items;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // Fallback to in-memory storage when localStorage is unavailable
    }
  };

  return { load, save };
}
