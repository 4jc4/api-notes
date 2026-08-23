/**
 * Gera openapi/openapi.json a partir dos controllers/DTOs Zod da API,
 * sem depender de um banco de dados real nem de uma instância em
 * execução — para poder rodar em CI e em desenvolvimento de forma
 * reproduzível (ver docs/deployment.md do frontend: "o pipeline não
 * deve depender silenciosamente de uma API de produção estar
 * disponível").
 *
 * `PrismaService.onModuleInit` chama `$connect()`, então o módulo é
 * substituído por um stub somente para esta geração — nenhum outro
 * comportamento da aplicação é alterado.
 *
 * Uso: npm run openapi:generate
 *
 * Nota: este script precisa rodar sobre o build compilado por `tsc`
 * (`npm run build` → `node dist/scripts/generate-openapi.js`), não via
 * `tsx`/esbuild — o transpiler do esbuild não emite `design:paramtypes`
 * corretamente para os providers do Nest aqui (ex.: `SessionService`
 * fica com `ConfigService` undefined no construtor).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { applyGlobalPrefix, buildOpenApiDocument } from '../src/bootstrap.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Só precisa passar na validação de formato do Zod (src/config/env.ts);
// nenhuma conexão real é aberta com esses valores.
process.env.DATABASE_URL ??=
  'postgresql://openapi:openapi@localhost:5432/openapi';
process.env.SESSION_SECRET ??= 'openapi-generation-placeholder-secret-value';
process.env.NODE_ENV ??= 'test';

const OUTPUT_DIR = 'openapi';
const OUTPUT_FILE = `${OUTPUT_DIR}/openapi.json`;

async function main(): Promise<void> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue({
      onModuleInit: async () => {},
      onModuleDestroy: async () => {},
    })
    .compile();

  const app = moduleRef.createNestApplication();
  applyGlobalPrefix(app);
  await app.init();

  const document = buildOpenApiDocument(app);

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(document, null, 2)}\n`);

  await app.close();

  console.log(`✅ ${OUTPUT_FILE} gerado com sucesso.`);
}

main().catch((error: unknown) => {
  console.error('❌ Falha ao gerar openapi.json:');
  console.error(error);
  process.exitCode = 1;
});
