import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url().default('postgres://hausanna:hausanna@localhost:5432/hausanna'),
  MONGODB_URL: z.string().url().default('mongodb://localhost:27017/hausanna'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),
});

export type Env = z.infer<typeof envSchema>;

/** Liest und prüft die Umgebungsvariablen. Bricht beim Start ab, wenn etwas fehlt. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Ungültige Umgebungsvariablen:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

export const ENV = Symbol('ENV');
