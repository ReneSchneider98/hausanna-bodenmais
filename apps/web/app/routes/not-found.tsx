import { data } from 'react-router';
import { enforceTrailingSlash } from '../lib/redirects.server';
import type { Route } from './+types/not-found';

/** Alle übrigen Pfade: erst Slash-Regel, dann 404 (ErrorBoundary in root.tsx). */
export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  // Unbekannte tiefe Pfade ohne Dateiendung: wie WordPress mit Slash vereinheitlichen
  if (!/\.[a-z0-9]+$/i.test(url.pathname)) enforceTrailingSlash(request);
  throw data('Seite nicht gefunden', { status: 404 });
}

export default function NotFound() {
  return null;
}
