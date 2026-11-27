import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  type PaginatedDto,
  type PaginationQuery,
} from '../../../../shared/application/pagination.js';
import type { IVenueRepository } from '../../domain/venue-repository.js';
import { toVenueDto, type VenueDto } from '../venue-dto.js';

export type PaginatedVenuesDto = PaginatedDto<VenueDto>;

/** Query (CQS): paginated list of venues for guests and authenticated users. */
export class ListVenuesQuery {
  constructor(private readonly venues: IVenueRepository) {}

  async execute(query: PaginationQuery = {}): Promise<PaginatedVenuesDto> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const offset = (page - 1) * limit;

    const { items, total } = await this.venues.list({ limit, offset });
    return {
      items: items.map(toVenueDto),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
