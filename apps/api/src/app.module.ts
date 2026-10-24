import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/http-exception.filter.js';
import { DomainEventsModule } from './common/domain-events.js';
import { ENV, loadEnv } from './config/env.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { MailModule } from './infrastructure/mail/mail.module.js';
import { AccommodationsModule } from './modules/accommodations/accommodations.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BookingsModule } from './modules/bookings/bookings.module.js';
import { ChannelsModule } from './modules/channels/channels.module.js';
import { ContentModule } from './modules/content/content.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Global()
@Module({
  providers: [{ provide: ENV, useFactory: () => loadEnv() }],
  exports: [ENV],
})
class ConfigModule {}

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    DomainEventsModule,
    EventsModule,
    MailModule,
    AuthModule,
    HealthModule,
    AccommodationsModule,
    ContentModule,
    BookingsModule,
    ChannelsModule,
    DashboardModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
