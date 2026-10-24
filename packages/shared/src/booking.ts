import { z } from 'zod';
import { idSchema, isoDateSchema } from './common.js';
import { selectedExtraSchema } from './pricing.js';

export const bookingStatusSchema = z.enum(['pending', 'confirmed', 'cancelled']);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

/** Woher kommt die Buchung? "blocked" = Sperre ohne Gast (z. B. Renovierung). */
export const bookingSourceSchema = z.enum([
  'website',
  'admin',
  'blocked',
  'booking_com',
  'airbnb',
  'channel_other',
  'wordpress',
]);
export type BookingSource = z.infer<typeof bookingSourceSchema>;

export const channelSyncStateSchema = z.enum(['not_required', 'pending', 'synced', 'failed']);
export type ChannelSyncState = z.infer<typeof channelSyncStateSchema>;

export const guestSchema = z.object({
  firstName: z.string().trim().min(1, 'Vorname fehlt').max(100),
  lastName: z.string().trim().min(1, 'Nachname fehlt').max(100),
  email: z.string().trim().email('E-Mail ungültig'),
  phone: z.string().trim().max(50).default(''),
  street: z.string().trim().max(200).default(''),
  zip: z.string().trim().max(20).default(''),
  city: z.string().trim().max(100).default(''),
  country: z.string().trim().max(2).default('DE'),
});
export type Guest = z.infer<typeof guestSchema>;

export const bookingSchema = z.object({
  id: idSchema,
  reference: z.string(),
  accommodationId: idSchema,
  arrival: isoDateSchema,
  departure: isoDateSchema,
  adults: z.number().int(),
  children: z.number().int(),
  status: bookingStatusSchema,
  source: bookingSourceSchema,
  externalRef: z.string().nullable(),
  guest: guestSchema.partial().nullable(),
  note: z.string(),
  internalNote: z.string(),
  extras: z.array(selectedExtraSchema),
  totalPrice: z.number().nullable(),
  channelSyncState: channelSyncStateSchema,
  channelSyncError: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Booking = z.infer<typeof bookingSchema>;

/** Buchung über die öffentliche Webseite */
export const createPublicBookingSchema = z.object({
  accommodationId: idSchema,
  arrival: isoDateSchema,
  departure: isoDateSchema,
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0),
  extras: z.array(selectedExtraSchema).default([]),
  guest: guestSchema,
  note: z.string().max(2000).default(''),
  acceptTerms: z.literal(true, { message: 'Bitte AGB und Datenschutz akzeptieren' }),
  /** Honeypot gegen Spam-Bots – muss leer bleiben */
  website: z.string().max(0).optional(),
});
export type CreatePublicBooking = z.infer<typeof createPublicBookingSchema>;

export const publicBookingResultSchema = z.object({
  reference: z.string(),
  status: bookingStatusSchema,
  arrival: isoDateSchema,
  departure: isoDateSchema,
  total: z.number(),
  accommodationName: z.string(),
});
export type PublicBookingResult = z.infer<typeof publicBookingResultSchema>;

/** Manuelle Buchung oder Sperre im Admin */
export const createAdminBookingSchema = z.object({
  accommodationId: idSchema,
  arrival: isoDateSchema,
  departure: isoDateSchema,
  adults: z.number().int().min(0).default(0),
  children: z.number().int().min(0).default(0),
  source: z.enum(['admin', 'blocked']).default('admin'),
  status: z.enum(['pending', 'confirmed']).default('confirmed'),
  guest: guestSchema.partial().nullable().default(null),
  note: z.string().default(''),
  internalNote: z.string().default(''),
  totalPrice: z.number().nullable().default(null),
  extras: z.array(selectedExtraSchema).default([]),
});
export type CreateAdminBooking = z.infer<typeof createAdminBookingSchema>;

export const updateBookingSchema = z.object({
  arrival: isoDateSchema.optional(),
  departure: isoDateSchema.optional(),
  adults: z.number().int().min(0).optional(),
  children: z.number().int().min(0).optional(),
  status: bookingStatusSchema.optional(),
  guest: guestSchema.partial().nullable().optional(),
  note: z.string().optional(),
  internalNote: z.string().optional(),
  totalPrice: z.number().nullable().optional(),
});
export type UpdateBooking = z.infer<typeof updateBookingSchema>;

export const blockedRangeSchema = z.object({
  /** erste belegte Nacht */
  from: isoDateSchema,
  /** Abreisetag (frei für neue Anreise) */
  to: isoDateSchema,
});
export const availabilitySchema = z.object({
  accommodationId: idSchema,
  blocked: z.array(blockedRangeSchema),
});
export type Availability = z.infer<typeof availabilitySchema>;

export const calendarResponseSchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
  accommodations: z.array(z.object({ id: idSchema, name: z.string() })),
  bookings: z.array(bookingSchema),
});
export type CalendarResponse = z.infer<typeof calendarResponseSchema>;
