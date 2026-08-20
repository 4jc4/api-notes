import { RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter.js';
import { Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);

  // Arquitetura de subcaminhos (domain.com/api/v1) atrás de um proxy reverso:
  // mesma origem do front-end, sem necessidade de CORS.
  // /health fica fora do prefixo para os healthchecks de infra (Docker/deploy).
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  app.use(cookieParser());
  app.useGlobalFilters(new ProblemDetailsFilter());

  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
