import type { Route } from './+types/home';

export function meta(): Route.MetaDescriptors {
  return [
    { title: 'Ferienhaus Ferienwohnungen Anna - Bodenmais' },
    {
      name: 'description',
      content: 'Ferienwohnungen und Apartments in Bodenmais im Bayerischen Wald.',
    },
  ];
}

/** Platzhalter – wird in Phase 2 durch den 1:1-Nachbau ersetzt. */
export default function Home() {
  return (
    <main style={{ padding: '4rem 1rem', textAlign: 'center' }}>
      <h1>Ferienhaus Anna in Bodenmais</h1>
      <p>Neue Webseite im Aufbau.</p>
    </main>
  );
}
