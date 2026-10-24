import {
  Global,
  Inject,
  Logger,
  Module,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { type Db, MongoClient } from 'mongodb';
import { Pool } from 'pg';
import { ENV, type Env } from '../../config/env.js';
import { createDatabase, type Database } from './drizzle.js';
import { runMigrations } from './migrate.js';
import { DB, MONGO_CLIENT, MONGO_DB, PG_POOL } from './tokens.js';

/**
 * PostgreSQL (Buchungen, Unterkünfte, Nutzer) und MongoDB (Logs, Design, Inhalte).
 * Beim Start werden die Postgres-Migrationen automatisch ausgeführt.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ENV],
      useFactory: (env: Env) => new Pool({ connectionString: env.DATABASE_URL, max: 10 }),
    },
    { provide: DB, inject: [PG_POOL], useFactory: (pool: Pool) => createDatabase(pool) },
    {
      provide: MONGO_CLIENT,
      inject: [ENV],
      useFactory: (env: Env) =>
        new MongoClient(env.MONGODB_URL, { serverSelectionTimeoutMS: 3000 }),
    },
    { provide: MONGO_DB, inject: [MONGO_CLIENT], useFactory: (c: MongoClient): Db => c.db() },
  ],
  exports: [PG_POOL, DB, MONGO_CLIENT, MONGO_DB],
})
export class DatabaseModule implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger('Database');

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(DB) private readonly db: Database,
    @Inject(MONGO_CLIENT) private readonly mongo: MongoClient,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.env.RUN_MIGRATIONS) return;
    await runMigrations(this.db);
    this.logger.log('Postgres-Migrationen aktuell');
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled([this.pool.end(), this.mongo.close()]);
  }
}
