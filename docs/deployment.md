# Deployment — API Notas

## Fluxo

`main` é protegida. Pull Requests passam por `.github/workflows/ci.yml`; pushes resultantes de merge disparam `.github/workflows/release.yml`.

```text
Pull Request
  ├── título convencional
  ├── lint
  ├── testes unitários
  ├── e2e + PostgreSQL real
  └── Docker build

Merge em main
  ├── gerar/publicar OpenAPI
  └── Buildx + QEMU → linux/arm64 → GHCR
                                  │
                                  ▼
                         runner no LXC 103
                                  │ SSH
                                  ▼
                         Docker Compose no LXC 102
                                  │
                                  ▼
                              /health
```

## Imagens

O release publica:

```text
ghcr.io/4jc4/api-notes:<commit-sha>
ghcr.io/4jc4/api-notes:latest
```

O deploy usa a tag imutável do commit, não `latest`. O build ARM64 executa em runner x64 por QEMU e possui timeout de 60 minutos.

## OpenAPI

O job `publish-openapi`:

1. instala dependências;
2. gera o Prisma Client;
3. executa `npm run openapi:generate`;
4. recria a release `openapi-latest`;
5. anexa `openapi.json`.

Esse artefato é consumido por `web-notes` e não depende da disponibilidade da API de produção.

## Deploy de produção

O serviço `actions.runner.4jc4-api-notes.lxc-runner.service` no LXC 103 executa o job `Deploy production`:

1. copia `docker-compose.yml` para `deploy@192.168.1.31:/opt/app/`;
2. autentica o host no GHCR usando o token efêmero do workflow;
3. faz pull da imagem do SHA;
4. executa `docker compose up -d api`;
5. aguarda `GET http://127.0.0.1:3000/health` retornar `200`.

O LXC 102 não mantém clone Git e não compila código durante o fluxo normal.

## Migrações

Mudanças de schema devem incluir uma migration versionada em `prisma/migrations/`. Antes de publicar código que dependa dela, confirme como `prisma migrate deploy` será executado. Não aplique `migrate dev` em produção.

## Rollback

1. identifique um SHA conhecido como saudável;
2. confirme que a imagem ainda existe no GHCR;
3. no LXC 102, execute Compose com `IMAGE_TAG=<sha>`;
4. aguarde o container ficar `healthy`;
5. valide `/api/health` e uma rota autenticada.

Rollback de código não reverte automaticamente migrations. Avalie compatibilidade de schema antes da troca.

## Restrições

Em produção, não executar como procedimento normal:

- `git pull`;
- `npm ci`;
- `npm run build`;
- `docker build`;
- `prisma migrate dev`;
- alterações manuais dentro do container da aplicação.
