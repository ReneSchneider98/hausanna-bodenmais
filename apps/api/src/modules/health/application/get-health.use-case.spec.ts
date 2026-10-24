import { GetHealthUseCase } from './get-health.use-case.js';
import type { DependencyHealthPort } from '../domain/dependency-health.port.js';

const fake = (name: string, result: boolean | Error): DependencyHealthPort => ({
  name,
  isHealthy: () => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result)),
});
const fixedNow = () => new Date('2026-10-24T12:00:00.000Z');

describe('GetHealthUseCase', () => {
  it('meldet ok, wenn alle Abhängigkeiten erreichbar sind', async () => {
    const useCase = new GetHealthUseCase([fake('postgres', true), fake('mongodb', true)], fixedNow);
    await expect(useCase.execute()).resolves.toEqual({
      status: 'ok',
      dependencies: { postgres: 'up', mongodb: 'up' },
      timestamp: '2026-10-24T12:00:00.000Z',
    });
  });

  it('meldet degraded, wenn eine Abhängigkeit ausfällt oder einen Fehler wirft', async () => {
    const useCase = new GetHealthUseCase(
      [fake('postgres', false), fake('mongodb', new Error('timeout'))],
      fixedNow,
    );
    const result = await useCase.execute();
    expect(result.status).toBe('degraded');
    expect(result.dependencies).toEqual({ postgres: 'down', mongodb: 'down' });
  });
});
