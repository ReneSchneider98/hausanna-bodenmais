import { Module } from '@nestjs/common';
import { AccommodationsService } from './application/accommodations.service.js';
import {
  ACCOMMODATION_CATALOG,
  AccommodationsRepository,
} from './infrastructure/accommodations.repository.js';
import { AdminAccommodationsController } from './presentation/admin-accommodations.controller.js';
import { PublicAccommodationsController } from './presentation/public-accommodations.controller.js';

@Module({
  controllers: [AdminAccommodationsController, PublicAccommodationsController],
  providers: [
    AccommodationsRepository,
    AccommodationsService,
    { provide: ACCOMMODATION_CATALOG, useExisting: AccommodationsRepository },
  ],
  exports: [AccommodationsService, AccommodationsRepository, ACCOMMODATION_CATALOG],
})
export class AccommodationsModule {}
