import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';
import type { DashboardEvent, EventCategory, EventLevel, SiteSettings } from '@hausanna/shared';
import { AppModule } from '../src/app.module.js';
import { MAIL, type MailMessage, type MailPort } from '../src/infrastructure/mail/mail.port.js';
import { EVENT_LOG, type EventLogPort } from '../src/modules/events/domain/event-log.port.js';
import { MongoHealthAdapter } from '../src/modules/health/infrastructure/mongo-health.adapter.js';
import {
  DEFAULT_SITE_SETTINGS,
  SiteSettingsService,
} from '../src/modules/content/application/site-settings.service.js';
import { CLOCK } from '../src/modules/bookings/application/bookings.service.js';

export const TEST_DB = process.env.TEST_DATABASE_URL;

export class MemoryEvents implements EventLogPort {
  items: DashboardEvent[] = [];
  async record(
    level: EventLevel,
    category: EventCategory,
    message: string,
    details?: Record<string, unknown>,
  ) {
    this.items.unshift({
      id: String(this.items.length + 1),
      level,
      category,
      message,
      details: details ?? null,
      createdAt: new Date().toISOString(),
      readAt: null,
    });
  }
  async list() {
    return this.items;
  }
  async countUnread() {
    return {
      total: this.items.length,
      errors: this.items.filter((e) => e.level === 'error').length,
    };
  }
  async markRead() {}
  async markAllRead() {}
}

export class MemoryMail implements MailPort {
  sent: MailMessage[] = [];
  async send(m: MailMessage) {
    this.sent.push(m);
  }
}

/** Leert die Test-Datenbank komplett (Schema neu), damit jeder Lauf sauber startet. */
export async function resetDatabase(url: string): Promise<void> {
  const pool = new Pool({ connectionString: url });
  await pool.query(
    'DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;',
  );
  await pool.end();
}

export async function createTestApp(opts: { now: Date }) {
  process.env.DATABASE_URL = TEST_DB;
  process.env.MONGODB_URL = 'mongodb://127.0.0.1:1/unused';
  process.env.DISABLE_JOBS = 'true';
  process.env.ADMIN_EMAIL = 'admin@example.org';
  process.env.ADMIN_PASSWORD = 'test-passwort-123';
  process.env.UPLOAD_DIR = '/tmp/hausanna-test-uploads';
  const events = new MemoryEvents();
  const mail = new MemoryMail();
  let settings: SiteSettings = DEFAULT_SITE_SETTINGS;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(EVENT_LOG)
    .useValue(events)
    .overrideProvider(MAIL)
    .useValue(mail)
    .overrideProvider(CLOCK)
    .useValue(() => opts.now)
    .overrideProvider(MongoHealthAdapter)
    .useValue({ name: 'mongodb', isHealthy: async () => false })
    .overrideProvider(SiteSettingsService)
    .useValue({ get: async () => settings, save: async (s: SiteSettings) => (settings = s) })
    .compile();
  const app: INestApplication = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  await app.init();
  return { app, events, mail };
}
