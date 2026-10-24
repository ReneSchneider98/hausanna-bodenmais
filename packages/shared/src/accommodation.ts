import { z } from 'zod';
import { idSchema, imageSchema, moneySchema } from './common.js';

export const accommodationStatusSchema = z.enum(['draft', 'published', 'archived']);
export type AccommodationStatus = z.infer<typeof accommodationStatusSchema>;

export const amenityGroupSchema = z.object({
  title: z.string().min(1),
  items: z.array(z.string().min(1)),
});
export type AmenityGroup = z.infer<typeof amenityGroupSchema>;

export const accommodationInputSchema = z.object({
  /** URL-Pfad der Detailseite, z. B. "ferienwohnung-2-haus-anna" */
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'nur Kleinbuchstaben, Zahlen und Bindestriche'),
  name: z.string().min(1),
  /** Untertitel im Menü, z. B. "bis 4 Personen" */
  menuLabel: z.string().default(''),
  sizeSqm: z.number().int().positive(),
  maxGuests: z.number().int().min(1).max(20),
  beds: z.string().default(''),
  teaser: z.string().default(''),
  descriptionHtml: z.string().default(''),
  amenityGroups: z.array(amenityGroupSchema).default([]),
  coverImage: imageSchema.nullable().default(null),
  images: z.array(imageSchema).default([]),
  status: accommodationStatusSchema.default('draft'),
  sortOrder: z.number().int().default(0),
  basePricePerNight: moneySchema,
  baseGuests: z.number().int().min(1),
  extraGuestPricePerNight: moneySchema.default(0),
  minNights: z.number().int().min(1).default(1),
  petsAllowed: z.boolean().default(false),
  priceNote: z.string().default(''),
});
export type AccommodationInput = z.infer<typeof accommodationInputSchema>;

export const accommodationSchema = accommodationInputSchema.extend({
  id: idSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Accommodation = z.infer<typeof accommodationSchema>;

/** Kurzform für Menü und Teaser auf der Startseite. */
export const accommodationSummarySchema = accommodationSchema.pick({
  id: true,
  slug: true,
  name: true,
  menuLabel: true,
  sizeSqm: true,
  maxGuests: true,
  teaser: true,
  coverImage: true,
  sortOrder: true,
  basePricePerNight: true,
  baseGuests: true,
});
export type AccommodationSummary = z.infer<typeof accommodationSummarySchema>;
