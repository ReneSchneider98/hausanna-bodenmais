import type { Page } from '@hausanna/shared';
import type { AccommodationDetail, PublicSite } from './types';

/** Basis-URL der API für Server-Requests (SSR). Im Browser wird relativ /api genutzt. */
export function apiBase(): string {
  return (process.env.API_INTERNAL_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function publicBaseUrl(): string {
  return (process.env.PUBLIC_BASE_URL ?? 'https://hausanna-bodenmais.de').replace(/\/$/, '');
}

export class ApiNotFound extends Error {}

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Response('Die Seite ist gerade nicht erreichbar. Bitte später erneut versuchen.', {
      status: 503,
    });
  }
  if (res.status === 404) throw new ApiNotFound(path);
  if (!res.ok) {
    throw new Response('Die Seite ist gerade nicht erreichbar. Bitte später erneut versuchen.', {
      status: 503,
    });
  }
  return (await res.json()) as T;
}

export const fetchSite = () => get<PublicSite>('/api/public/site');
export const fetchPage = (slug: string) =>
  get<Page>(`/api/public/pages/${encodeURIComponent(slug)}`);
export const fetchAccommodation = (slug: string) =>
  get<AccommodationDetail>(`/api/public/accommodations/${encodeURIComponent(slug)}`);

/** Gibt null zurück statt bei 404 zu werfen. */
export async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof ApiNotFound) return null;
    throw e;
  }
}
