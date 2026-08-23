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
 *
 * Nota: DATABASE_URL e SESSION_SECRET (formato apenas — nenhuma conexão
 * real é aberta) precisam já estar no ambiente *antes* de rodar este
 * script, não dentro dele. `ConfigModule.forRoot({ validate })`
 * (src/app.module.ts) valida de forma síncrona no momento em que
 * `AppModule` é importado — mais cedo do que qualquer
 * `process.env.X = ...` que este próprio arquivo pudesse fazer antes da
 * sua import estática de AppModule ser avaliada. Localmente, o `.env`
 * do projeto já resolve isso; no CI, ver o `env:` do job
 * publish-openapi em .github/workflows/release.yml.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { applyGlobalPrefix, buildOpenApiDocument } from '../src/bootstrap.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

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
