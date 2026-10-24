import { z } from 'zod';
import { idSchema } from './common.js';

/** Welche Anbindung ist aktiv? Wechsel ohne Code-Änderung (hexagonaler Channel-Port). */
export const channelProviderSchema = z.enum(['none', 'beds24']);
export type ChannelProvider = z.infer<typeof channelProviderSchema>;

export const channelConnectionSchema = z.object({
  accommodationId: idSchema,
  accommodationName: z.string(),
  enabled: z.boolean(),
  /** Beds24: roomId */
  beds24RoomId: z.string().nullable(),
  lastSyncAt: z.string().nullable(),
  lastError: z.string().nullable(),
});
export type ChannelConnection = z.infer<typeof channelConnectionSchema>;

export const updateChannelConnectionSchema = z.object({
  enabled: z.boolean().optional(),
  beds24RoomId: z.string().trim().nullable().optional(),
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
