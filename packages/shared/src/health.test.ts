import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from './health.js';

describe('healthResponseSchema', () => {
  it('akzeptiert eine gültige Antwort', () => {
    const result = healthResponseSchema.safeParse({
      status: 'ok',
      dependencies: { postgres: 'up', mongodb: 'up' },
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it('lehnt unbekannte Status ab', () => {
    const result = healthResponseSchema.safeParse({
      status: 'kaputt',
      dependencies: {},
      timestamp: '',
    });
    expect(result.success).toBe(false);
  });
});
