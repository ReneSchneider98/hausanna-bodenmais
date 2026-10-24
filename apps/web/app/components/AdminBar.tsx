import { useEffect, useState } from 'react';

/** Admin-Panel: auf dem Server dieselbe Domain, lokal läuft es auf eigenem Port */
export const ADMIN_URL = import.meta.env.DEV ? 'http://localhost:5174/admin/' : '/admin/';
const HINT_COOKIE = 'hausanna_admin';

/**
 * "Zur Verwaltung" für angemeldete Admin-Nutzer (wie die WordPress-Admin-Leiste).
 * Nur im Browser: Ohne Hinweis-Cookie keine Anfrage, normale Besucher sehen nichts.
 */
export function AdminBar() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!document.cookie.split('; ').some((c) => c.startsWith(`${HINT_COOKIE}=`))) return;
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(async (res) => {
        if (res.ok) {
          const user = (await res.json()) as { name: string };
          if (!cancelled) setName(user.name);
        } else if (res.status === 401) {
          // Sitzung abgelaufen → Hinweis entfernen, damit nicht erneut gefragt wird
          document.cookie = `${HINT_COOKIE}=; Max-Age=0; Path=/`;
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!name) return null;
  return (
    <a className="admin-bar" href={ADMIN_URL} title={`Angemeldet als ${name}`}>
      <span aria-hidden>←</span> Zur Verwaltung
    </a>
  );
}
