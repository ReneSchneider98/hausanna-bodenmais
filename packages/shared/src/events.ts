import { z } from 'zod';

export const eventLevelSchema = z.enum(['info', 'warning', 'error']);
export type EventLevel = z.infer<typeof eventLevelSchema>;
export const eventCategorySchema = z.enum(['booking', 'channel', 'system', 'auth', 'content']);
export type EventCategory = z.infer<typeof eventCategorySchema>;

export const dashboardEventSchema = z.object({
  id: z.string(),
  level: eventLevelSchema,
  category: eventCategorySchema,
  message: z.string(),
  details: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
});
export type DashboardEvent = z.infer<typeof dashboardEventSchema>;

export const dashboardSchema = z.object({
  stats: z.object({
    bookingsNext30Days: z.number(),
    occupancyNext30DaysPercent: z.number(),
    newBookingsLast7Days: z.number(),
    unreadEvents: z.number(),
    unreadErrors: z.number(),
  }),
  arrivals: z.array(
    z.object({
      bookingId: z.string(),
      date: z.string(),
      accommodationName: z.string(),
      guestName: z.string(),
      source: z.string(),
    }),
  ),
  departures: z.array(
    z.object({
      bookingId: z.string(),
      date: z.string(),
      accommodationName: z.string(),
      guestName: z.string(),
      source: z.string(),
    }),
  ),
  events: z.array(dashboardEventSchema),
  health: z.record(z.string(), z.enum(['up', 'down'])),
});
export type Dashboard = z.infer<typeof dashboardSchema>;
