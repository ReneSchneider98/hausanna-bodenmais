import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import {
  addDays,
  type ChannelOverview,
  type UpdateChannelConnection,
  updateChannelConnectionSchema,
} from '@hausanna/shared';
import { Inject } from '@nestjs/common';
import { Public, Roles } from '../../../common/auth.decorators.js';
import { DomainError, notFound } from '../../../common/domain-error.js';
import { ZodPipe } from '../../../common/zod.pipe.js';
import { ENV, type Env } from '../../../config/env.js';
import { BookingsService } from '../../bookings/application/bookings.service.js';
import { BookingsRepository } from '../../bookings/infrastructure/bookings.repository.js';
import { ChannelSyncService } from '../application/channel-sync.service.js';
import { buildIcs } from '../domain/ical.js';
import { ChannelConnectionsRepository } from '../infrastructure/channel-connections.repository.js';

@Controller('admin/channels')
@Roles('admin')
export class AdminChannelsController {
  constructor(private readonly sync: ChannelSyncService) {}

  @Get()
  overview(): Promise<ChannelOverview> {
    return this.sync.overview();
  }

  @Put(':accommodationId')
  async update(
    @Param('accommodationId', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(updateChannelConnectionSchema)) body: UpdateChannelConnection,
  ): Promise<ChannelOverview> {
    await this.sync.updateConnection(id, body);
    return this.sync.overview();
  }

  @Post('sync')
  async syncNow(): Promise<ChannelOverview> {
    await this.sync.runSync();
    return this.sync.overview();
  }
}

@Public()
@Controller('channels')
export class PublicChannelsController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly sync: ChannelSyncService,
    private readonly connections: ChannelConnectionsRepository,
    private readonly bookings: BookingsRepository,
    private readonly bookingsService: BookingsService,
  ) {}

  /**
   * Unser Belegungs-Feed für Booking.com/Airbnb (iCal).
   * ?for=booking_com lässt Booking.com-eigene Buchungen weg (keine Spiegelung).
   */
  @Get('ical/:file')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async ical(@Param('file') file: string, @Query('for') forChannel?: string): Promise<string> {
    const token = file.replace(/\.ics$/, '');
    const conn = await this.connections.findByExportToken(token);
    if (!conn) throw notFound('Kalender');
    await this.connections.update(conn.accommodationId, { lastExportFetchAt: new Date() });
    const today = this.bookingsService.todayIso();
    const rows = await this.bookings.activeFrom(
      conn.accommodationId,
      addDays(today, -1),
      addDays(today, 730),
    );
    const events = rows
      .filter((b) => b.source !== forChannel)
      .map((b) => ({
        uid: `${b.id}@hausanna-bodenmais.de`,
        start: b.arrival,
        end: b.departure,
        summary: 'Belegt',
      }));
    return buildIcs(conn.accommodationName, events);
  }

  /** Beds24 meldet Änderungen → zeitnah abgleichen. Geheimnis per ?secret=… */
  @Post('beds24/webhook')
  @HttpCode(202)
  webhook(@Query('secret') secret?: string): { ok: true } {
    const expected = this.env.BEDS24_WEBHOOK_SECRET;
    const a = Buffer.from(secret ?? '');
    const b = Buffer.from(expected ?? '');
    const ok = Boolean(expected) && a.length === b.length && timingSafeEqual(a, b);
    if (!ok) throw new DomainError('forbidden', 'Ungültiges Geheimnis');
    this.sync.triggerSoon();
    return { ok: true };
  }
}
