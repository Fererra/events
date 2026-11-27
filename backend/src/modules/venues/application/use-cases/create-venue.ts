import type { IUnitOfWork } from '../../../../shared/application/unit-of-work.js';
import { VenueAddressAlreadyTakenError } from '../../domain/errors.js';
import { Venue } from '../../domain/venue.js';
import type { IVenueRepository } from '../../domain/venue-repository.js';
import type { IClock, IIdGenerator } from '../ports/clock.js';
import { toVenueDto, type VenueDto } from '../venue-dto.js';

export interface CreateVenueCommand {
  name: string;
  address: string;
  capacity: number;
}

/** Command: creates a new venue with a unique address and positive integer capacity. */
export class CreateVenueUseCase {
  constructor(
    private readonly venues: IVenueRepository,
    private readonly uow: IUnitOfWork,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
  ) {}

  async execute(cmd: CreateVenueCommand): Promise<VenueDto> {
    const venue = Venue.create({
      id: this.ids.next(),
      name: cmd.name,
      address: cmd.address,
      capacity: cmd.capacity,
      now: this.clock.now(),
    });

    if (await this.venues.findByNormalizedAddress(venue.normalizedAddress)) {
      throw new VenueAddressAlreadyTakenError();
    }

    // The unique index still protects against a concurrent creation race.
    await this.uow.run(() => this.venues.add(venue));
    return toVenueDto(venue);
  }
}
