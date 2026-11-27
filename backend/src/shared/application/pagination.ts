export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedDto<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
