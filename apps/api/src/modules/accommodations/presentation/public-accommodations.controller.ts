import { Controller, Get, Param } from '@nestjs/common';
import type { Accommodation, AccommodationSummary, Extra } from '@hausanna/shared';
import { Public } from '../../../common/auth.decorators.js';
import { AccommodationsService, toSummary } from '../application/accommodations.service.js';

export interface PublicAccommodationDetail {
  accommodation: Accommodation;
  extras: Extra[];
}

@Public()
@Controller('public/accommodations')
export class PublicAccommodationsController {
  constructor(private readonly service: AccommodationsService) {}

  @Get()
  async list(): Promise<AccommodationSummary[]> {
    return (await this.service.listPublished()).map(toSummary);
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string): Promise<PublicAccommodationDetail> {
    const accommodation = await this.service.getPublishedBySlug(slug);
    return { accommodation, extras: await this.service.listExtras(true) };
  }
}
