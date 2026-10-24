import { Controller, Get, Inject, Module } from '@nestjs/common';
import { addDays, type Dashboard, eachNight } from '@hausanna/shared';
import { AccommodationsModule } from '../accommodations/accommodations.module.js';
import { AccommodationsService } from '../accommodations/application/accommodations.service.js';
import { BookingsModule } from '../bookings/bookings.module.js';
import { BookingsService } from '../bookings/application/bookings.service.js';
import { BookingsRepository } from '../bookings/infrastructure/bookings.repository.js';
import { EVENT_LOG, type EventLogPort } from '../events/domain/event-log.port.js';
import { GetHealthUseCase } from '../health/application/get-health.use-case.js';
import { HealthModule } from '../health/health.module.js';

@Controller('admin/dashboard')
class DashboardController {
  constructor(
    private readonly bookings: BookingsRepository,
    private readonly bookingsService: BookingsService,
    private readonly accommodations: AccommodationsService,
    private readonly health: GetHealthUseCase,
    @Inject(EVENT_LOG) private readonly events: EventLogPort,
  ) {}

  @Get()
  async get(): Promise<Dashboard> {
    const today = this.bookingsService.todayIso();
    const in30 = addDays(today, 30);
    const [accs, upcoming, recent, unread, events, health] = await Promise.all([
      this.accommodations.listAll(false),
      this.bookings.list({ from: today, to: in30, status: ['confirmed', 'pending'] }),
      this.bookings.createdSince(new Date(Date.now() - 7 * 86_400_000)),
      this.events.countUnread().catch(() => ({ total: 0, errors: 0 })),
      this.events.list({ limit: 30 }).catch(() => []),
      this.health.execute(),
    ]);
    const names = new Map(accs.map((a) => [a.id, a.name]));
    const active = accs.filter((a) => a.status === 'published');
    const nights30 = eachNight(today, in30);
    const occupied = upcoming
      .filter((b) => b.source !== 'blocked')
      .reduce((n, b) => n + nights30.filter((d) => d >= b.arrival && d < b.departure).length, 0);
    const guestName = (b: (typeof upcoming)[number]) =>
      b.source === 'blocked'
        ? 'Sperre'
        : [b.guest?.firstName, b.guest?.lastName].filter(Boolean).join(' ') || '(über Portal)';
    const toItem = (b: (typeof upcoming)[number], date: string) => ({
      bookingId: b.id,
      date,
      accommodationName: names.get(b.accommodationId) ?? '?',
      guestName: guestName(b),
      source: b.source,
    });
    const in7 = addDays(today, 7);
    return {
      stats: {
        bookingsNext30Days: upcoming.filter((b) => b.source !== 'blocked' && b.arrival >= today)
          .length,
        occupancyNext30DaysPercent: active.length
          ? Math.round((occupied / (active.length * 30)) * 100)
          : 0,
        newBookingsLast7Days: recent.filter((b) => b.source !== 'blocked').length,
        unreadEvents: unread.total,
        unreadErrors: unread.errors,
      },
      arrivals: upcoming
        .filter((b) => b.arrival >= today && b.arrival < in7 && b.source !== 'blocked')
        .map((b) => toItem(b, b.arrival)),
      departures: upcoming
        .filter((b) => b.departure >= today && b.departure < in7 && b.source !== 'blocked')
        .map((b) => toItem(b, b.departure)),
      events,
      health: health.dependencies,
    };
  }
}

@Module({
  imports: [AccommodationsModule, BookingsModule, HealthModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
