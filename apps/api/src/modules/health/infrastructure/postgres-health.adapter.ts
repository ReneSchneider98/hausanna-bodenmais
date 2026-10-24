import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../infrastructure/database/tokens.js';
import type { DependencyHealthPort } from '../domain/dependency-health.port.js';

@Injectable()
export class PostgresHealthAdapter implements DependencyHealthPort {
  readonly name = 'postgres';

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async isHealthy(): Promise<boolean> {
    const result = await this.pool.query('SELECT 1 AS ok');
    return result.rows[0]?.ok === 1;
  }
}
