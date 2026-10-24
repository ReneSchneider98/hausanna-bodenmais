import type {
  Accommodation,
  AccommodationInput,
  Booking,
  CalendarResponse,
  ChannelOverview,
  CreateAdminBooking,
  CreateUser,
  Dashboard,
  DashboardEvent,
  Extra,
  ExtraInput,
  MediaItem,
  Page,
  Season,
  SeasonInput,
  SeasonPrice,
  SiteSettings,
  UpdateBooking,
  UpdateChannelConnection,
  UpdateUser,
  User,
} from '@hausanna/shared';
import { api, del, get, patch, post, put } from './client.ts';

export interface BookingFilter {
  from?: string;
  to?: string;
  accommodationId?: string;
  status?: string;
  source?: string;
}

const qs = (o: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const Api = {
  login: (email: string, password: string) =>
    api<User>('/auth/login', { method: 'POST', body: { email, password }, silent401: true }),
  logout: () => post<void>('/auth/logout'),
  logoutEverywhere: () => post<void>('/auth/logout-everywhere'),
  me: () => api<User>('/auth/me', { silent401: true }),

  dashboard: () => get<Dashboard>('/admin/dashboard'),
  events: (unread = false) => get<DashboardEvent[]>(`/admin/events${unread ? '?unread=true' : ''}`),
  readEvent: (id: string) => post<void>(`/admin/events/${id}/read`),
  readAllEvents: () => post<void>('/admin/events/read-all'),

  calendar: (from: string, to: string) =>
    get<CalendarResponse>(`/admin/calendar${qs({ from, to })}`),
  bookings: (f: BookingFilter) => get<Booking[]>(`/admin/bookings${qs({ ...f })}`),
  booking: (id: string) => get<Booking>(`/admin/bookings/${id}`),
  createBooking: (b: CreateAdminBooking) => post<Booking>('/admin/bookings', b),
  updateBooking: (id: string, b: UpdateBooking) => patch<Booking>(`/admin/bookings/${id}`, b),

  accommodations: (archived = false) =>
    get<Accommodation[]>(`/admin/accommodations${archived ? '?archived=true' : ''}`),
  accommodation: (id: string) => get<Accommodation>(`/admin/accommodations/${id}`),
  createAccommodation: (a: AccommodationInput) => post<Accommodation>('/admin/accommodations', a),
  updateAccommodation: (id: string, a: Partial<AccommodationInput>) =>
    patch<Accommodation>(`/admin/accommodations/${id}`, a),
  seasonPrices: (id: string) => get<SeasonPrice[]>(`/admin/accommodations/${id}/season-prices`),
  saveSeasonPrices: (id: string, p: SeasonPrice[]) =>
    put<SeasonPrice[]>(`/admin/accommodations/${id}/season-prices`, p),

  seasons: () => get<Season[]>('/admin/seasons'),
  createSeason: (s: SeasonInput) => post<Season>('/admin/seasons', s),
  updateSeason: (id: string, s: SeasonInput) => put<Season>(`/admin/seasons/${id}`, s),
  deleteSeason: (id: string) => del(`/admin/seasons/${id}`),

  extras: () => get<Extra[]>('/admin/extras'),
  createExtra: (e: ExtraInput) => post<Extra>('/admin/extras', e),
  updateExtra: (id: string, e: ExtraInput) => put<Extra>(`/admin/extras/${id}`, e),

  channels: () => get<ChannelOverview>('/admin/channels'),
  updateChannel: (accId: string, c: UpdateChannelConnection) =>
    put<ChannelOverview>(`/admin/channels/${accId}`, c),
  syncChannels: () => post<ChannelOverview>('/admin/channels/sync'),

  users: () => get<User[]>('/admin/users'),
  createUser: (u: CreateUser) => post<User>('/admin/users', u),
  updateUser: (id: string, u: UpdateUser) => patch<User>(`/admin/users/${id}`, u),

  settings: () => get<SiteSettings>('/admin/settings'),
  saveSettings: (s: SiteSettings) => put<SiteSettings>('/admin/settings', s),

  pages: () => get<Page[]>('/admin/pages'),
  page: (slug: string) => get<Page>(`/admin/pages/${encodeURIComponent(slug)}`),
  savePage: (p: Page) => put<Page>(`/admin/pages/${encodeURIComponent(p.slug)}`, p),
  deletePage: (slug: string) => del(`/admin/pages/${encodeURIComponent(slug)}`),

  media: () => get<MediaItem[]>('/admin/media'),
  uploadMedia: (file: File, alt = '') => {
    const form = new FormData();
    form.append('file', file);
    form.append('alt', alt);
    return api<MediaItem>('/admin/media', { method: 'POST', form });
  },
  updateMedia: (id: string, alt: string) => patch<MediaItem>(`/admin/media/${id}`, { alt }),
  deleteMedia: (id: string) => del(`/admin/media/${id}`),
};
