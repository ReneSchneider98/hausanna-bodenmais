import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { AmenityGroup, Guest, Image, SelectedExtra } from '@hausanna/shared';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Geldbeträge als numeric, im Code als number */
const money = (name: string) => numeric(name, { precision: 10, scale: 2, mode: 'number' });

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'editor'] })
    .notNull()
    .default('editor'),
  passwordHash: text('password_hash').notNull(),
  active: boolean('active').notNull().default(true),
  /** Erhöhen = alle Sitzungen dieses Nutzers ungültig */
  tokenVersion: integer('token_version').notNull().default(0),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  ...timestamps,
});

export const accommodations = pgTable('accommodations', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  menuLabel: text('menu_label').notNull().default(''),
  sizeSqm: integer('size_sqm').notNull(),
  maxGuests: integer('max_guests').notNull(),
  beds: text('beds').notNull().default(''),
  teaser: text('teaser').notNull().default(''),
  descriptionHtml: text('description_html').notNull().default(''),
  amenityGroups: jsonb('amenity_groups').$type<AmenityGroup[]>().notNull().default([]),
  coverImage: jsonb('cover_image').$type<Image | null>(),
  images: jsonb('images').$type<Image[]>().notNull().default([]),
  status: text('status', { enum: ['draft', 'published', 'archived'] })
    .notNull()
    .default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
  basePricePerNight: money('base_price_per_night').notNull(),
  baseGuests: integer('base_guests').notNull(),
  extraGuestPricePerNight: money('extra_guest_price_per_night').notNull().default(0),
  minNights: integer('min_nights').notNull().default(1),
  petsAllowed: boolean('pets_allowed').notNull().default(false),
  priceNote: text('price_note').notNull().default(''),
  /** Herkunft beim Import (WordPress-ID), damit der Import wiederholbar ist */
  legacyId: text('legacy_id').unique(),
  ...timestamps,
});

export const seasons = pgTable('seasons', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  startDate: date('start_date', { mode: 'string' }).notNull(),
  endDate: date('end_date', { mode: 'string' }).notNull(),
  legacyId: text('legacy_id').unique(),
  ...timestamps,
});

export const seasonPrices = pgTable(
  'season_prices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accommodationId: uuid('accommodation_id')
      .notNull()
      .references(() => accommodations.id, { onDelete: 'cascade' }),
    seasonId: uuid('season_id')
      .notNull()
      .references(() => seasons.id, { onDelete: 'cascade' }),
    pricePerNight: money('price_per_night').notNull(),
    baseGuests: integer('base_guests').notNull(),
    extraGuestPricePerNight: money('extra_guest_price_per_night').notNull().default(0),
    minNights: integer('min_nights'),
  },
  (t) => [uniqueIndex('season_prices_acc_season').on(t.accommodationId, t.seasonId)],
);

export const extras = pgTable('extras', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  price: money('price').notNull(),
  chargeType: text('charge_type', { enum: ['per_stay', 'per_night'] })
    .notNull()
    .default('per_stay'),
  active: boolean('active').notNull().default(true),
  legacyId: text('legacy_id').unique(),
  ...timestamps,
});

/**
 * Buchungen. Doppelbuchungen verhindert die Datenbank selbst über einen
 * EXCLUDE-Constraint (siehe Migration 0001_no_double_booking.sql).
 */
export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reference: text('reference').notNull().unique(),
    accommodationId: uuid('accommodation_id')
      .notNull()
      .references(() => accommodations.id, { onDelete: 'restrict' }),
    arrival: date('arrival', { mode: 'string' }).notNull(),
    departure: date('departure', { mode: 'string' }).notNull(),
    adults: integer('adults').notNull().default(0),
    children: integer('children').notNull().default(0),
    status: text('status', { enum: ['pending', 'confirmed', 'cancelled'] }).notNull(),
    source: text('source', {
      enum: ['website', 'admin', 'blocked', 'booking_com', 'airbnb', 'channel_other', 'wordpress'],
    }).notNull(),
    /** ID beim Kanal (Beds24-Buchungs-ID, iCal-UID, WordPress-ID) */
    externalRef: text('external_ref'),
    guest: jsonb('guest').$type<Partial<Guest> | null>(),
    note: text('note').notNull().default(''),
    internalNote: text('internal_note').notNull().default(''),
    extras: jsonb('extras').$type<SelectedExtra[]>().notNull().default([]),
    totalPrice: money('total_price'),
    channelSyncState: text('channel_sync_state', {
      enum: ['not_required', 'pending', 'synced', 'failed'],
    })
      .notNull()
      .default('not_required'),
    channelSyncError: text('channel_sync_error'),
    /** Beds24-Buchungs-ID, wenn wir die Buchung dorthin gemeldet haben */
    channelBookingId: text('channel_booking_id'),
    ...timestamps,
  },
  (t) => [
    index('bookings_acc_dates').on(t.accommodationId, t.arrival, t.departure),
    uniqueIndex('bookings_source_external_ref')
      .on(t.source, t.externalRef)
      .where(sql`${t.externalRef} is not null`),
  ],
);

export const channelConnections = pgTable('channel_connections', {
  accommodationId: uuid('accommodation_id')
    .primaryKey()
    .references(() => accommodations.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(false),
  beds24RoomId: text('beds24_room_id'),
  icalImportUrls: jsonb('ical_import_urls').$type<string[]>().notNull().default([]),
  /** Geheimer Teil unserer iCal-Export-URL */
  icalExportToken: text('ical_export_token')
    .notNull()
    .default(sql`replace(gen_random_uuid()::text, '-', '')`),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  lastError: text('last_error'),
  lastExportFetchAt: timestamp('last_export_fetch_at', { withTimezone: true }),
  ...timestamps,
});
