import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import {
  type Accommodation,
  type AccommodationInput,
  accommodationInputSchema,
  type Extra,
  type ExtraInput,
  extraInputSchema,
  type Season,
  type SeasonInput,
  seasonInputSchema,
  type SeasonPrice,
  seasonPriceSchema,
} from '@hausanna/shared';
import { ZodPipe } from '../../../common/zod.pipe.js';
import { AccommodationsService } from '../application/accommodations.service.js';

@Controller('admin')
export class AdminAccommodationsController {
  constructor(private readonly service: AccommodationsService) {}

  @Get('accommodations')
  list(@Query('archived') archived?: string): Promise<Accommodation[]> {
    return this.service.listAll(archived === 'true');
  }

  @Get('accommodations/:id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<Accommodation> {
    return this.service.get(id);
  }

  @Post('accommodations')
  create(
    @Body(new ZodPipe(accommodationInputSchema)) body: AccommodationInput,
  ): Promise<Accommodation> {
    return this.service.create(body);
  }

  @Patch('accommodations/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(accommodationInputSchema.partial())) body: Partial<AccommodationInput>,
  ): Promise<Accommodation> {
    return this.service.update(id, body);
  }

  @Get('accommodations/:id/season-prices')
  seasonPrices(@Param('id', ParseUUIDPipe) id: string): Promise<SeasonPrice[]> {
    return this.service.getSeasonPrices(id);
  }

  @Put('accommodations/:id/season-prices')
  setSeasonPrices(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(z.array(seasonPriceSchema))) body: SeasonPrice[],
  ): Promise<SeasonPrice[]> {
    return this.service.setSeasonPrices(id, body);
  }

  @Get('seasons')
  seasons(): Promise<Season[]> {
    return this.service.listSeasons();
  }

  @Post('seasons')
  createSeason(@Body(new ZodPipe(seasonInputSchema)) body: SeasonInput): Promise<Season> {
    return this.service.createSeason(body);
  }

  @Put('seasons/:id')
  updateSeason(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(seasonInputSchema)) body: SeasonInput,
  ): Promise<Season> {
    return this.service.updateSeason(id, body);
  }

  @Delete('seasons/:id')
  @HttpCode(204)
  deleteSeason(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.deleteSeason(id);
  }

  @Get('extras')
  extras(): Promise<Extra[]> {
    return this.service.listExtras(false);
  }

  @Post('extras')
  createExtra(@Body(new ZodPipe(extraInputSchema)) body: ExtraInput): Promise<Extra> {
    return this.service.createExtra(body);
  }

  @Put('extras/:id')
  updateExtra(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(extraInputSchema)) body: ExtraInput,
  ): Promise<Extra> {
    return this.service.updateExtra(id, body);
  }
}
