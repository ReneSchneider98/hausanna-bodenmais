import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ENV, type Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const env = app.get<Env>(ENV);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()) });
  app.enableShutdownHooks();
  await app.listen(env.PORT);
}
await bootstrap();
