import { Module } from '@nestjs/common';
import { GetHealthUseCase } from './application/get-health.use-case.js';
import {
  DEPENDENCY_HEALTH_CHECKS,
  type DependencyHealthPort,
} from './domain/dependency-health.port.js';
import { MongoHealthAdapter } from './infrastructure/mongo-health.adapter.js';
import { PostgresHealthAdapter } from './infrastructure/postgres-health.adapter.js';
import { HealthController } from './presentation/health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [
    PostgresHealthAdapter,
    MongoHealthAdapter,
    {
      provide: DEPENDENCY_HEALTH_CHECKS,
      inject: [PostgresHealthAdapter, MongoHealthAdapter],
      useFactory: (...checks: DependencyHealthPort[]) => checks,
    },
    {
      provide: GetHealthUseCase,
      inject: [DEPENDENCY_HEALTH_CHECKS],
      useFactory: (checks: DependencyHealthPort[]) => new GetHealthUseCase(checks),
    },
  ],
})
export class HealthModule {}
