import { Inject, Injectable } from '@nestjs/common';
import type { MongoClient } from 'mongodb';
import { MONGO_CLIENT } from '../../../infrastructure/database/tokens.js';
import type { DependencyHealthPort } from '../domain/dependency-health.port.js';

@Injectable()
export class MongoHealthAdapter implements DependencyHealthPort {
  readonly name = 'mongodb';

  constructor(@Inject(MONGO_CLIENT) private readonly client: MongoClient) {}

  async isHealthy(): Promise<boolean> {
    const result = await this.client.db().command({ ping: 1 });
    return result.ok === 1;
  }
}
