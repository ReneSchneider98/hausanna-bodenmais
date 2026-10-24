import { Module } from '@nestjs/common';
import { ENV, loadEnv } from './config/env.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  providers: [{ provide: ENV, useFactory: () => loadEnv() }],
  exports: [ENV],
  imports: [],
})
class ConfigModule {}

@Module({
  imports: [{ module: ConfigModule, global: true }, DatabaseModule, HealthModule],
})
export class AppModule {}
