import { Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import type { DashboardEvent } from '@hausanna/shared';
import { EVENT_LOG, type EventLogPort } from '../domain/event-log.port.js';

@Controller('admin/events')
export class EventsController {
  constructor(@Inject(EVENT_LOG) private readonly events: EventLogPort) {}

  @Get()
  list(@Query('unread') unread?: string): Promise<DashboardEvent[]> {
    return this.events.list({ limit: 200, unreadOnly: unread === 'true' });
  }

  @Post('read-all')
  @HttpCode(204)
  async readAll(): Promise<void> {
    await this.events.markAllRead();
  }

  @Post(':id/read')
  @HttpCode(204)
  async read(@Param('id') id: string): Promise<void> {
    await this.events.markRead(id);
  }
}
