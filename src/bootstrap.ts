import { RequestMethod, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

// Compartilhado entre src/main.ts e scripts/generate-openapi.ts: os dois
// precisam produzir exatamente o mesmo prefixo de rotas e o mesmo
// documento OpenAPI, senão o contrato gerado diverge da API real.

export const GLOBAL_PREFIX = 'api/v1';

/**
 * Arquitetura de subcaminhos (domain.com/api/v1) atrás de um proxy
 * reverso: mesma origem do front-end, sem necessidade de CORS.
 * /health fica fora do prefixo para os healthchecks de infra
 * (Docker/deploy).
 */
export function applyGlobalPrefix(app: INestApplication): void {
  app.setGlobalPrefix(GLOBAL_PREFIX, {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
}

/**
 * Constrói o documento OpenAPI (já limpo via cleanupOpenApiDoc) a partir
 * dos controllers/DTOs Zod da aplicação. `app` deve já ter passado por
 * `applyGlobalPrefix` para os paths documentados baterem com os reais.
 */
export function buildOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Notas API')
    .setDescription(
      'Contrato HTTP da API Notas. Autenticação por sessão em cookie httpOnly (`sid`), não JWT.',
    )
    .setVersion('1.0')
    .addTag('auth')
    .addTag('notes')
    .addTag('health')
    .build();

  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
}
