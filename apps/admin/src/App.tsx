import { useEffect, useState } from 'react';
import { healthResponseSchema, type HealthResponse } from '@hausanna/shared';

/** Platzhalter – das Admin-Panel entsteht in Phase 3. Zeigt vorerst den API-Status. */
export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((json) => setHealth(healthResponseSchema.parse(json)))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  return (
    <main style={{ maxWidth: 640, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>Haus Anna – Admin</h1>
      <h2>Systemstatus</h2>
      {error && <p role="alert">API nicht erreichbar: {error}</p>}
      {!error && !health && <p>Lade…</p>}
      {health && (
        <ul>
          <li>Gesamt: {health.status === 'ok' ? '✅ ok' : '⚠️ eingeschränkt'}</li>
          {Object.entries(health.dependencies).map(([name, status]) => (
            <li key={name}>
              {name}: {status === 'up' ? '✅' : '❌'}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
