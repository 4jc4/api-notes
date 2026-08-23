import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { applyGlobalPrefix, buildOpenApiDocument } from './bootstrap.js';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter.js';
import { Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);

  applyGlobalPrefix(app);

  app.use(cookieParser());
  app.useGlobalFilters(new ProblemDetailsFilter());

  // Documentação interativa só fora de produção. O contrato OpenAPI
  // consumido pelo frontend (Orval) é exportado como artefato pelo
  // script `npm run openapi:generate` (scripts/generate-openapi.ts),
  // não lido de uma instância rodando — ver docs/deployment.md do
  // frontend.
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    SwaggerModule.setup('docs', app, buildOpenApiDocument(app));
  }

  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
