# Runbook — API Notas

## Acesso

```bash
ssh cardoso@192.168.1.24
sudo pct status <VMID>
sudo pct exec <VMID> -- <comando>
```

Use primeiro comandos somente leitura. Não exponha `.env`, cookies, hashes ou tokens em logs.

## Verificação rápida

```bash
curl -i https://notas.ajca.com.br/api/health
curl -i https://notas.ajca.com.br/api/v1/notes
```

Resultado esperado sem sessão:

```text
/api/health    → 200
/api/v1/notes  → 401 Missing session cookie
```

`404` em `/api/v1/notes` normalmente indica incompatibilidade de prefixo ou imagem antiga.

## Container da API

```bash
sudo pct exec 102 -- docker ps
sudo pct exec 102 -- docker inspect -f '{{.State.Health.Status}}' app-api-1
sudo pct exec 102 -- docker logs --tail 100 app-api-1
sudo pct exec 102 -- sh -lc 'cd /opt/app && docker compose ps'
```

Estado saudável: `app-api-1` ativo e `healthy`.

## PostgreSQL

```bash
sudo pct exec 101 -- runuser -u postgres -- psql -d notes -c 'SELECT now();'
```

Para conferir migrations:

```bash
sudo pct exec 102 -- docker exec app-api-1 npx prisma migrate status
```

Não execute comandos destrutivos ou migrations de desenvolvimento em produção.

## Prefixo de rota

Teste cada camada:

```bash
# API interna
sudo pct exec 102 -- curl -i http://127.0.0.1:3000/health

# Via proxy interno
sudo pct exec 104 -- curl -i -H 'Host: notas.ajca.com.br' http://127.0.0.1/api/health

# Público
curl -i https://notas.ajca.com.br/api/health
```

Regras:

- NestJS recebe `/v1/*`;
- Nginx publica `/api/v1/*` e remove `/api`;
- `/health` é excluído do prefixo global.

## Runner da API

```bash
sudo pct exec 103 -- systemctl status actions.runner.4jc4-api-notes.lxc-runner.service --no-pager -l
sudo pct exec 103 -- journalctl -u actions.runner.4jc4-api-notes.lxc-runner.service -n 100 --no-pager
```

Além de `active (running)`, confirme `Connected to GitHub` e `Listening for Jobs`.

Teste SSH do runner:

```bash
sudo pct exec 103 -- runuser -u runner -- ssh -o BatchMode=yes -o ConnectTimeout=5 deploy@192.168.1.31 'hostname && whoami && docker version'
```

## Release falhou

```bash
gh run list --repo 4jc4/api-notes
gh run view <RUN_ID> --repo 4jc4/api-notes
gh run view <RUN_ID> --repo 4jc4/api-notes --log-failed
```

Isole a fase: OpenAPI, build ARM64, push GHCR, runner, pull da imagem, Compose ou healthcheck. Builds QEMU possuem timeout de 60 minutos.

## OpenAPI

Localmente:

```bash
npm run openapi:generate
jq -r '.paths | keys[]' openapi/openapi.json
```

Rotas esperadas incluem `/health`, `/v1/auth/login`, `/v1/auth/logout`, `/v1/notes` e `/v1/notes/{id}`.

## Seed

O seed é idempotente e usa `upsert` para os usuários de demonstração definidos em `prisma/seed.ts`. Antes de executá-lo em produção, confirme o banco alvo e obtenha autorização explícita. Depois, valide somente e-mails e login; nunca imprima hashes.

## Rollback

```bash
sudo pct exec 102 -- sh -lc 'cd /opt/app && IMAGE_TAG=<sha-saudavel> docker compose pull api && IMAGE_TAG=<sha-saudavel> docker compose up -d api'
```

Em seguida, aguarde `healthy` e valide `/api/health`.

## Não fazer

- não editar aplicação dentro do container;
- não revelar `/opt/app/.env`;
- não apagar volumes ou banco sem plano de recuperação;
- não adicionar `/api` ao prefixo NestJS;
- não habilitar CORS para contornar erro de proxy;
- não trocar sessão por JWT como workaround;
- não executar build manual em produção como fluxo normal.
