import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/** apps/api (gleich, ob aus src/ oder dist/ gestartet) */
const API_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
/** Wurzel des Repos – relative Pfade (z. B. UPLOAD_DIR) beziehen sich darauf */
export const REPO_ROOT = resolve(API_ROOT, '../..');

/** Lädt apps/api/.env (nur lokal; in Produktion setzt systemd die Variablen). */
export function loadDotEnv(): void {
  const file = resolve(API_ROOT, '.env');
  if (existsSync(file) && process.env.NODE_ENV !== 'test') process.loadEnvFile(file);
}

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .default('false')
  .transform((v) => v === 'true' || v === '1');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    PUBLIC_BASE_URL: z.string().url().default('http://localhost:5173'),
    DATABASE_URL: z.string().url().default('postgres://hausanna:hausanna@localhost:5432/hausanna'),
    MONGODB_URL: z.string().url().default('mongodb://localhost:27017/hausanna'),
    CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),
    /** Geheimnis für Login-Sitzungen. In Produktion Pflicht (min. 32 Zeichen). */
    JWT_SECRET: z.string().min(32).default('dev-secret-dev-secret-dev-secret-change-me'),
    UPLOAD_DIR: z
      .string()
      .default('data/uploads')
      .transform((p) => (isAbsolute(p) ? p : resolve(REPO_ROOT, p))),
    /** Erster Admin, wird beim Start angelegt, falls es noch keinen Benutzer gibt */
    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_PASSWORD: z.string().min(10).optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    MAIL_FROM: z.string().default('Haus Anna Bodenmais <info@hausanna-bodenmais.de>'),
    /** Wer bekommt Benachrichtigungen über neue Buchungen? */
    MAIL_OWNER_TO: z.string().default('info@hausanna-bodenmais.de'),
    /** none | beds24 */
    CHANNEL_PROVIDER: z.enum(['none', 'beds24']).default('none'),
    BEDS24_REFRESH_TOKEN: z.string().optional(),
    BEDS24_API_URL: z.string().url().default('https://api.beds24.com/v2'),
    BEDS24_WEBHOOK_SECRET: z.string().optional(),
    CHANNEL_SYNC_INTERVAL_MINUTES: z.coerce.number().int().min(1).default(5),
    /** Hintergrund-Jobs (Sync) aus, z. B. in Tests */
    DISABLE_JOBS: bool,
    RUN_MIGRATIONS: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
  })
  .superRefine((env, ctx) => {
    if (
      (env.NODE_ENV === 'production' || env.PUBLIC_BASE_URL.startsWith('https://')) &&
      env.JWT_SECRET.startsWith('dev-secret')
    ) {
      ctx.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'In Produktion setzen!' });
    }
    if (env.CHANNEL_PROVIDER === 'beds24' && !env.BEDS24_REFRESH_TOKEN) {
      ctx.addIssue({
        code: 'custom',
        path: ['BEDS24_REFRESH_TOKEN'],
        message: 'Für CHANNEL_PROVIDER=beds24 erforderlich',
      });
    }
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
