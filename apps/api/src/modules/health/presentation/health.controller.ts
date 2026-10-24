import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@hausanna/shared';
import { GetHealthUseCase } from '../application/get-health.use-case.js';

@Controller('health')
export class HealthController {
  constructor(private readonly getHealth: GetHealthUseCase) {}

  @Get()
  get(): Promise<HealthResponse> {
    return this.getHealth.execute();
  }
}
