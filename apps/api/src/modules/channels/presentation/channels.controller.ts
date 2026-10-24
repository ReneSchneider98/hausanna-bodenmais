import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import {
  type ChannelOverview,
  type UpdateChannelConnection,
  updateChannelConnectionSchema,
} from '@hausanna/shared';
import { Inject } from '@nestjs/common';
import { Public, Roles } from '../../../common/auth.decorators.js';
import { DomainError } from '../../../common/domain-error.js';
import { ZodPipe } from '../../../common/zod.pipe.js';
import { ENV, type Env } from '../../../config/env.js';
import { ChannelSyncService } from '../application/channel-sync.service.js';

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
  ) {}

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
