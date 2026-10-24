import type { DashboardEvent, EventCategory, EventLevel } from '@hausanna/shared';

/** Port: Meldungen für das Dashboard (Infos, Warnungen, Fehler). */
export interface EventLogPort {
  record(
    level: EventLevel,
    category: EventCategory,
    message: string,
    details?: Record<string, unknown>,
  ): Promise<void>;
  list(opts: { limit: number; unreadOnly?: boolean }): Promise<DashboardEvent[]>;
  countUnread(): Promise<{ total: number; errors: number }>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}

export const EVENT_LOG = Symbol('EVENT_LOG');
