import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  type Availability,
  type CreatePublicBooking,
  createPublicBookingSchema,
  isoDateSchema,
  type PriceQuote,
  type PublicBookingResult,
  type QuoteRequest,
  quoteRequestSchema,
} from '@hausanna/shared';
import { Public } from '../../../common/auth.decorators.js';
import { RateLimit } from '../../../common/rate-limit.js';
import { ZodPipe } from '../../../common/zod.pipe.js';
import { BookingsService } from '../application/bookings.service.js';

@Public()
@Controller('public')
export class PublicBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get('accommodations/:id/availability')
  availability(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('from', new ZodPipe(isoDateSchema.optional())) from?: string,
    @Query('to', new ZodPipe(isoDateSchema.optional())) to?: string,
  ): Promise<Availability> {
    return this.bookings.availability(id, from, to);
  }

  @Post('quote')
  @RateLimit(120, 60_000)
  @HttpCode(200)
  quote(@Body(new ZodPipe(quoteRequestSchema)) body: QuoteRequest): Promise<PriceQuote> {
    return this.bookings.quote(body);
  }

  @Post('bookings')
  @RateLimit(5, 10 * 60_000)
  create(
    @Body(new ZodPipe(createPublicBookingSchema)) body: CreatePublicBooking,
  ): Promise<PublicBookingResult> {
    return this.bookings.createPublic(body);
  }
}
