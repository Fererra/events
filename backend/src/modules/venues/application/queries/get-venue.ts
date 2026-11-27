import { NotFoundError } from '../../../../shared/domain/errors.js';
import type { IVenueRepository } from '../../domain/venue-repository.js';
import { toVenueDto, type VenueDto } from '../venue-dto.js';

/** Query (CQS): returns a single venue by id, no state changes. */
export class GetVenueQuery {
  constructor(private readonly venues: IVenueRepository) {}

  async execute(id: string): Promise<VenueDto> {
    const venue = await this.venues.findById(id);
    if (!venue) throw new NotFoundError('Venue', id);
    return toVenueDto(venue);
  }
}
