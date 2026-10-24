import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@hausanna/shared';
import { Public } from '../../../common/auth.decorators.js';
import { GetHealthUseCase } from '../application/get-health.use-case.js';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly getHealth: GetHealthUseCase) {}

  @Get()
  get(): Promise<HealthResponse> {
    return this.getHealth.execute();
  }
}
