import { z } from 'zod';
import { idSchema, isoDateSchema, moneySchema } from './common.js';

export const seasonInputSchema = z
  .object({
    name: z.string().min(1),
    startDate: isoDateSchema,
    /** inklusive (letzte Nacht der Saison) */
    endDate: isoDateSchema,
  })
  .refine((s) => s.startDate <= s.endDate, { message: 'Ende muss nach dem Start liegen' });
export type SeasonInput = z.infer<typeof seasonInputSchema>;

export const seasonSchema = z.object({
  id: idSchema,
  name: z.string(),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
});
export type Season = z.infer<typeof seasonSchema>;

export const seasonPriceSchema = z.object({
  seasonId: idSchema,
  pricePerNight: moneySchema,
  baseGuests: z.number().int().min(1),
  extraGuestPricePerNight: moneySchema.default(0),
  minNights: z.number().int().min(1).nullable().default(null),
});
export type SeasonPrice = z.infer<typeof seasonPriceSchema>;

export const extraChargeTypeSchema = z.enum(['per_stay', 'per_night']);

export const extraInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  price: moneySchema,
  chargeType: extraChargeTypeSchema.default('per_stay'),
  active: z.boolean().default(true),
});
export type ExtraInput = z.infer<typeof extraInputSchema>;
export const extraSchema = extraInputSchema.extend({ id: idSchema });
export type Extra = z.infer<typeof extraSchema>;

export const selectedExtraSchema = z.object({
  extraId: idSchema,
  quantity: z.number().int().min(1).max(10),
});
export type SelectedExtra = z.infer<typeof selectedExtraSchema>;

export const quoteRequestSchema = z.object({
  accommodationId: idSchema,
  arrival: isoDateSchema,
  departure: isoDateSchema,
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0),
  extras: z.array(selectedExtraSchema).default([]),
});
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export const priceLineSchema = z.object({ label: z.string(), amount: z.number() });
export const priceQuoteSchema = z.object({
  available: z.boolean(),
  /** Grund, falls nicht buchbar (deutsch, für Gäste lesbar) */
  reason: z.string().nullable(),
  nights: z.number().int(),
  minNights: z.number().int(),
  lines: z.array(priceLineSchema),
  total: z.number(),
});
export type PriceQuote = z.infer<typeof priceQuoteSchema>;
