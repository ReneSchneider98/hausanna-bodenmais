import { z } from 'zod';

/** Kalenderdatum ohne Uhrzeit, z. B. "2026-11-02". */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum im Format JJJJ-MM-TT erwartet');
export type IsoDate = z.infer<typeof isoDateSchema>;

export const idSchema = z.string().uuid();

export const moneySchema = z.number().nonnegative().multipleOf(0.01);

export const imageSchema = z.object({
  url: z.string().min(1),
  alt: z.string().default(''),
});
export type Image = z.infer<typeof imageSchema>;

export const apiErrorSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
  code: z.string().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
