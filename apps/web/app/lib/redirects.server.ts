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
  if (url.pathname !== '/' && !url.pathname.endsWith('/')) {
    throw redirect(`${url.pathname}/${url.search}`, 301);
  }
}
