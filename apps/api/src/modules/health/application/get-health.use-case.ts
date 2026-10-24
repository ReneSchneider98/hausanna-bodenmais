import { Inject, Injectable } from '@nestjs/common';
import type { HealthResponse } from '@hausanna/shared';
import {
  DEPENDENCY_HEALTH_CHECKS,
  type DependencyHealthPort,
} from '../domain/dependency-health.port.js';

@Injectable()
export class GetHealthUseCase {
  constructor(
    @Inject(DEPENDENCY_HEALTH_CHECKS) private readonly checks: DependencyHealthPort[],
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(): Promise<HealthResponse> {
    const results = await Promise.all(
      this.checks.map(async (check) => {
        const healthy = await check.isHealthy().catch(() => false);
        return [check.name, healthy ? 'up' : 'down'] as const;
      }),
    );
    const dependencies = Object.fromEntries(results);
    const allUp = results.every(([, status]) => status === 'up');
    return {
      status: allUp ? 'ok' : 'degraded',
      dependencies,
      timestamp: this.now().toISOString(),
    };
  }
}
