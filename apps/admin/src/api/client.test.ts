import { describe, expect, it } from 'vitest';
import { formatApiError } from './client.ts';

describe('formatApiError', () => {
  it('verbindet Validierungsmeldungen', () => {
    expect(formatApiError(400, { message: ['name: fehlt', 'slug: ungültig'] })).toBe(
      'name: fehlt · slug: ungültig',
    );
  });
  it('macht Konflikte verständlich', () => {
    expect(formatApiError(409, { message: 'Der Zeitraum ist leider bereits belegt.' })).toBe(
      'Der Zeitraum ist leider bereits belegt.',
    );
    expect(formatApiError(409, { message: 'E-Mail vergeben' })).toBe('Konflikt: E-Mail vergeben');
    expect(formatApiError(409, null)).toBe('Zeitraum belegt');
  });
  it('403, 500 und Netzwerkfehler', () => {
    expect(formatApiError(403, { message: 'x' })).toBe('Keine Berechtigung');
    expect(formatApiError(502, {})).toContain('Serverfehler');
    expect(formatApiError(0, null)).toContain('nicht erreichbar');
  });
});
