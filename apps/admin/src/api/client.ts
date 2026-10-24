/** Fetch-Wrapper für die Admin-API: Cookies, CSRF-Header, verständliche Fehlermeldungen. */

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Fehlertexte für Menschen (deutsch). */
export function formatApiError(status: number, body: unknown): string {
  const raw =
    body && typeof body === 'object' && 'message' in body
      ? (body as { message: unknown }).message
      : undefined;
  const message = Array.isArray(raw) ? raw.join(' · ') : typeof raw === 'string' ? raw : '';
  if (status === 401) return message || 'Bitte anmelden';
  if (status === 403) return 'Keine Berechtigung';
  if (status === 404) return message || 'Nicht gefunden';
  if (status === 409)
    return !message
      ? 'Zeitraum belegt'
      : /belegt/i.test(message)
        ? message
        : `Konflikt: ${message}`;
  if (status === 0) return 'Server nicht erreichbar. Bitte Internetverbindung prüfen.';
  if (status >= 500) return 'Serverfehler. Bitte später erneut versuchen.';
  return message || `Fehler ${status}`;
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler = () => undefined;
export function setUnauthorizedHandler(fn: UnauthorizedHandler): void {
  onUnauthorized = fn;
}

export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown; form?: FormData; silent401?: boolean } = {},
): Promise<T> {
  const method = init.method ?? 'GET';
  const headers: Record<string, string> = { accept: 'application/json' };
  if (method !== 'GET') headers['X-Requested-With'] = 'hausanna-admin';
  let body: BodyInit | undefined;
  if (init.form) body = init.form;
  else if (init.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(init.body);
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method, headers, body, credentials: 'include' });
  } catch {
    throw new ApiError(0, formatApiError(0, null));
  }
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !init.silent401) onUnauthorized();
    throw new ApiError(res.status, formatApiError(res.status, data));
  }
  return data as T;
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body });
export const put = <T>(path: string, body: unknown) => api<T>(path, { method: 'PUT', body });
export const patch = <T>(path: string, body: unknown) => api<T>(path, { method: 'PATCH', body });
export const del = <T = void>(path: string) => api<T>(path, { method: 'DELETE' });
