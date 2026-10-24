import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { healthResponseSchema } from '@hausanna/shared';
import { AppModule } from '../src/app.module.js';
import { MongoHealthAdapter } from '../src/modules/health/infrastructure/mongo-health.adapter.js';
import { PostgresHealthAdapter } from '../src/modules/health/infrastructure/postgres-health.adapter.js';

describe('GET /api/health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PostgresHealthAdapter)
      .useValue({ name: 'postgres', isHealthy: () => Promise.resolve(true) })
      .overrideProvider(MongoHealthAdapter)
      .useValue({ name: 'mongodb', isHealthy: () => Promise.resolve(false) })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('liefert den Status aller Abhängigkeiten', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    const body = healthResponseSchema.parse(res.body);
    expect(body.status).toBe('degraded');
    expect(body.dependencies).toEqual({ postgres: 'up', mongodb: 'down' });
  });
});
