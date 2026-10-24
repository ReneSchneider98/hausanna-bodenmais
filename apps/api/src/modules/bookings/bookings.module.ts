import { Module } from '@nestjs/common';
import { AccommodationsModule } from '../accommodations/accommodations.module.js';
import { ContentModule } from '../content/content.module.js';
import { BookingsService, CLOCK } from './application/bookings.service.js';
import { BookingsRepository } from './infrastructure/bookings.repository.js';
import { AdminBookingsController } from './presentation/admin-bookings.controller.js';
import { PublicBookingsController } from './presentation/public-bookings.controller.js';

@Module({
  imports: [AccommodationsModule, ContentModule],
  controllers: [PublicBookingsController, AdminBookingsController],
  providers: [BookingsRepository, BookingsService, { provide: CLOCK, useValue: () => new Date() }],
  exports: [BookingsService, BookingsRepository],
})
export class BookingsModule {}
