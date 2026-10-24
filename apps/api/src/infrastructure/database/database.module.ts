import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { Pool } from 'pg';
import { ENV, type Env } from '../../config/env.js';
import { MONGO_CLIENT, PG_POOL } from './tokens.js';

/**
 * Stellt die Verbindungen zu PostgreSQL (Buchungen, Unterkünfte, Nutzer)
 * und MongoDB (Logs, Design, Inhalte) bereit.
 * Verbindungen werden lazy aufgebaut, damit die API auch startet, wenn eine DB fehlt.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ENV],
      useFactory: (env: Env) => new Pool({ connectionString: env.DATABASE_URL, max: 10 }),
    },
    {
      provide: MONGO_CLIENT,
      inject: [ENV],
      useFactory: (env: Env) =>
        new MongoClient(env.MONGODB_URL, { serverSelectionTimeoutMS: 2000 }),
    },
  ],
  exports: [PG_POOL, MONGO_CLIENT],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(MONGO_CLIENT) private readonly mongo: MongoClient,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled([this.pool.end(), this.mongo.close()]);
  }
}
