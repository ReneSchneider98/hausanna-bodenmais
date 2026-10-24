import { redirect } from 'react-router';

/** Alte WordPress-/MotoPress-Seiten ohne Gegenstück → Startseite */
export const LEGACY_TO_HOME = new Set([
  'startseite',
  'verfuegbarkeitsuche',
  'buchungsbestaetigung',
  'buchung-bestaetigt',
  'buchung-storniert',
  'reservierung-erhalten',
  'stornierung-der-buchung',
  'mein-konto',
  'transaktion-fehlgeschlagen',
]);

/** WordPress-URLs enden auf "/": ohne Slash → 301 auf die Variante mit Slash. */
export function enforceTrailingSlash(request: Request): void {
  const url = new URL(request.url);
  // Client-Navigation lädt Daten über "/pfad/_.data" (Slash vorhanden) bzw. "/pfad.data" (ohne)
  const pathname = url.pathname.endsWith('/_.data')
    ? url.pathname.slice(0, -'_.data'.length)
    : url.pathname.replace(/\.data$/, '');
  if (pathname !== '/' && !pathname.endsWith('/')) {
    url.searchParams.delete('_routes');
    throw redirect(`${pathname}/${url.search}`, 301);
  }
}
