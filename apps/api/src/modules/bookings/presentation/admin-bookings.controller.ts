import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import {
  addDays,
  type Booking,
  bookingSourceSchema,
  bookingStatusSchema,
  type CalendarResponse,
  type CreateAdminBooking,
  createAdminBookingSchema,
  isoDateSchema,
  type UpdateBooking,
  updateBookingSchema,
} from '@hausanna/shared';
import { CurrentUser, type SessionUser } from '../../../common/auth.decorators.js';
import { ZodPipe } from '../../../common/zod.pipe.js';
import { AccommodationsService } from '../../accommodations/application/accommodations.service.js';
import { BookingsService } from '../application/bookings.service.js';

const listQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  accommodationId: z.string().uuid().optional(),
  status: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',') : undefined))
    .pipe(z.array(bookingStatusSchema).optional()),
  source: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',') : undefined))
    .pipe(z.array(bookingSourceSchema).optional()),
});

@Controller('admin')
export class AdminBookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly accommodations: AccommodationsService,
  ) {}

  @Get('bookings')
  list(
    @Query(new ZodPipe(listQuerySchema)) q: z.infer<typeof listQuerySchema>,
  ): Promise<Booking[]> {
    return this.bookings.list(q);
  }

  @Get('bookings/:id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<Booking> {
    return this.bookings.get(id);
  }

  @Post('bookings')
  create(
    @Body(new ZodPipe(createAdminBookingSchema)) body: CreateAdminBooking,
    @CurrentUser() user: SessionUser,
  ): Promise<Booking> {
    return this.bookings.createAdmin(body, user);
  }

  @Patch('bookings/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(updateBookingSchema)) body: UpdateBooking,
    @CurrentUser() user: SessionUser,
  ): Promise<Booking> {
    return this.bookings.update(id, body, user);
  }

  @Get('calendar')
  async calendar(
    @Query('from', new ZodPipe(isoDateSchema.optional())) from?: string,
    @Query('to', new ZodPipe(isoDateSchema.optional())) to?: string,
  ): Promise<CalendarResponse> {
    const start = from ?? this.bookings.todayIso();
    const end = to ?? addDays(start, 31);
    const accs = (await this.accommodations.listAll(false)).map((a) => ({
      id: a.id,
      name: a.name,
    }));
    return this.bookings.calendar(start, end, accs);
  }
}
