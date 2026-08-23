# Arquitetura — API Notas

## Visão geral

`api-notes` é a API NestJS da aplicação Notas. Ela fornece autenticação por sessão, CRUD de notas, healthcheck e o contrato OpenAPI consumido pelo frontend.

```text
Browser
  │ HTTPS, mesmo origin
  ▼
https://notas.ajca.com.br/api/*
  │ Cloudflare Tunnel
  ▼
LXC 104 — Nginx
  │ remove /api
  ▼
LXC 102 — NestJS / Docker :3000
  │ PostgreSQL
  ▼
LXC 101 — database notes
```

O Nginx é dono da fronteira pública `/api`. A API conhece somente suas rotas internas:

```text
GET  /health
POST /v1/auth/login
POST /v1/auth/logout
GET  /v1/notes
POST /v1/notes
GET  /v1/notes/{id}
PATCH /v1/notes/{id}
DELETE /v1/notes/{id}
```

Exemplo de tradução:

```text
Público:  /api/v1/notes
NestJS:   /v1/notes
```

Não adicionar `/api` ao prefixo global do NestJS. Não habilitar CORS sem rever a decisão same-origin.

## Componentes internos

- `HealthModule`: verifica processo e conectividade com PostgreSQL.
- `AuthModule`: login, logout, sessão e guarda de autenticação.
- `NotesModule`: CRUD, autorização por proprietário e soft delete.
- `PrismaModule`: acesso global ao banco usando Prisma 7 e `@prisma/adapter-pg`.
- `ProblemDetailsFilter`: converte erros para RFC 7807.
- `ZodValidationPipe`: valida DTOs globalmente.

## Modelo de dados

```text
User 1 ── N Note
User 1 ── N Session
```

- `User`: UUID, e-mail único e hash Argon2 da senha.
- `Session`: hash HMAC-SHA256 do token opaco, usuário e expiração.
- `Note`: título, conteúdo, proprietário e `deletedAt` para exclusão lógica.

Uma nota existente de outro usuário resulta em `403`. Exclusão é lógica e consultas normais filtram `deletedAt: null`.

## Autenticação

1. `POST /v1/auth/login` valida e-mail e senha com Argon2.
2. A API cria um token opaco de 256 bits.
3. Apenas o HMAC do token é persistido em `sessions`.
4. O token original é enviado no cookie `sid`, `HttpOnly`, `SameSite=Strict` e `Secure` em produção.
5. `SessionAuthGuard` valida o cookie e injeta `{ sub, email }` na requisição.
6. Logout revoga a sessão e limpa o cookie.

Não substituir esse modelo por JWT, Bearer Token ou armazenamento no browser sem uma decisão arquitetural explícita.

## Contrato OpenAPI

A API é a fonte de verdade. Em cada push para `main`, o workflow gera `openapi/openapi.json` e o publica como asset da GitHub Release móvel `openapi-latest`.

```text
NestJS DTOs/routes
       │
       ▼
OpenAPI Release asset
       │
       ▼
web-notes api:sync
       │
       ▼
Orval → cliente TypeScript
```

Alterações de contrato devem atualizar DTOs/controladores, regenerar OpenAPI, validar e2e e coordenar o frontend.

## Decisões protegidas

- NestJS possui `/v1`; Nginx possui `/api`.
- Frontend e API compartilham o mesmo origin público.
- Sessões são server-side e baseadas em cookie.
- OpenAPI é o contrato entre repositórios.
- PostgreSQL é acessado somente pela rede interna.
- Produção executa imagens ARM64 prontas e identificadas pelo commit SHA.
