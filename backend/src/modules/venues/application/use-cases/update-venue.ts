import type { IUnitOfWork } from '../../../../shared/application/unit-of-work.js';
import { NotFoundError } from '../../../../shared/domain/errors.js';
import { VenueAddressAlreadyTakenError } from '../../domain/errors.js';
import type { IVenueRepository } from '../../domain/venue-repository.js';
import { toVenueDto, type VenueDto } from '../venue-dto.js';

export interface UpdateVenueCommand {
  id: string;
  name?: string;
  address?: string;
  capacity?: number;
}

/** Command: updates an existing venue, preserving unique address and positive capacity. */
export class UpdateVenueUseCase {
  constructor(
    private readonly venues: IVenueRepository,
    private readonly uow: IUnitOfWork,
  ) {}

  async execute(cmd: UpdateVenueCommand): Promise<VenueDto> {
    return this.uow.run(async () => {
      const venue = await this.venues.findById(cmd.id);
      if (!venue) throw new NotFoundError('Venue', cmd.id);

      const previousNormalized = venue.normalizedAddress;
      venue.update({
        ...(cmd.name !== undefined && { name: cmd.name }),
        ...(cmd.address !== undefined && { address: cmd.address }),
        ...(cmd.capacity !== undefined && { capacity: cmd.capacity }),
      });

      if (venue.normalizedAddress !== previousNormalized) {
        const existing = await this.venues.findByNormalizedAddress(venue.normalizedAddress);
        if (existing && existing.id !== venue.id) throw new VenueAddressAlreadyTakenError();
      }

      await this.venues.save(venue);
      return toVenueDto(venue);
    });
  }
}
