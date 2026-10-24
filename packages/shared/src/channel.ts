import { z } from 'zod';
import { idSchema } from './common.js';

/** Welche Anbindung ist aktiv? Wechsel ohne Code-Änderung (hexagonaler Channel-Port). */
export const channelProviderSchema = z.enum(['none', 'beds24', 'ical']);
export type ChannelProvider = z.infer<typeof channelProviderSchema>;

export const channelConnectionSchema = z.object({
  accommodationId: idSchema,
  accommodationName: z.string(),
  enabled: z.boolean(),
  /** Beds24: roomId */
  beds24RoomId: z.string().nullable(),
  /** iCal: Export-URL von Booking.com/Airbnb (wird von uns abgeholt) */
  icalImportUrls: z.array(z.string().url()),
  /**
   * iCal: unsere Export-URLs (werden von Booking.com bzw. Airbnb abgeholt).
   * Je Portal eine eigene URL, damit dessen eigene Buchungen nicht zurückgespiegelt werden.
   */
  icalExportUrls: z.object({ booking_com: z.string(), airbnb: z.string() }),
  lastSyncAt: z.string().nullable(),
  lastError: z.string().nullable(),
  lastExportFetchAt: z.string().nullable(),
});
export type ChannelConnection = z.infer<typeof channelConnectionSchema>;

export const updateChannelConnectionSchema = z.object({
  enabled: z.boolean().optional(),
  beds24RoomId: z.string().trim().nullable().optional(),
  icalImportUrls: z.array(z.string().url()).optional(),
});
export type UpdateChannelConnection = z.infer<typeof updateChannelConnectionSchema>;

export const channelOverviewSchema = z.object({
  provider: channelProviderSchema,
  configured: z.boolean(),
  syncIntervalMinutes: z.number(),
  lastRunAt: z.string().nullable(),
  connections: z.array(channelConnectionSchema),
  pendingPushes: z.number(),
  failedPushes: z.number(),
});
export type ChannelOverview = z.infer<typeof channelOverviewSchema>;
