# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start:dev        # dev server with watch mode
npm run build             # clean + nest build
npm run lint               # eslint --fix over src/apps/libs/test

npm run test                # unit tests (jest project "unit", src/**/*.spec.ts)
npm run test:watch          # unit tests, watch mode
npm run test:e2e             # e2e tests (jest project "e2e", test/**/*.e2e-spec.ts)
npm run test:all             # unit + e2e together
npm run test:cov             # unit tests with coverage

npx prisma generate          # regenerate Prisma Client after schema changes
npx prisma migrate dev --name <name>   # create + apply a migration (dev)
npx prisma migrate deploy               # apply pending migrations (CI/prod)
```

Run a single test file by passing a path through the npm script:

```bash
npm run test -- src/modules/notes/notes.service.spec.ts
npm run test:e2e -- test/notes.e2e-spec.ts
```

`test:e2e`/`test:all` load `.env.test` via `dotenv-cli` and run against a **real** PostgreSQL database (no mocking) — the target DB must exist and have migrations applied (`npx prisma migrate deploy`) before running them. `docker-compose.dev.yml` provisions a local Postgres for this.

## Architecture

NestJS 11 API (ESM, `"type": "module"`), Prisma 7 with the `@prisma/adapter-pg` driver adapter, PostgreSQL. Domain is `User` 1:N `Note` with soft delete (`deletedAt`).

**ESM/NodeNext gotcha**: `tsconfig.json` uses `module`/`moduleResolution: nodenext`. Every relative import must include an explicit `.js` extension even though the source files are `.ts` (e.g. `import { AppModule } from './app.module.js'`). This applies to every new file added to `src/`.

**Prisma Client is generated to a custom path**: `prisma/schema.prisma` outputs to `src/generated/prisma` (not `node_modules/@prisma/client`), so code imports it as `../generated/prisma/client.js`, not `@prisma/client`. Regenerate with `npx prisma generate` after any schema change — this also runs automatically as part of `npm run build` and the Docker build.

### Module wiring (`src/app.module.ts`)

- `ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })` — env vars are validated eagerly at boot via a Zod schema (`src/config/env.ts`); the process exits with a logged error if validation fails. Required vars: `DATABASE_URL`, `SESSION_SECRET` (min 32 chars), plus `NODE_ENV`, `PORT`, `SESSION_TTL` (defaults provided).
- `ZodValidationPipe` is registered globally via `APP_PIPE` — controllers don't need per-route `@UsePipes()`; DTOs are defined with `createZodDto()` from `nestjs-zod` (see `src/modules/*/dto/*.schema.ts`).
- `PrismaModule` is `@Global()` — `PrismaService` (extends `PrismaClient`, wired to the pg adapter) can be injected anywhere without re-importing the module.
- Feature modules: `HealthModule`, `AuthModule`, `NotesModule`.

### HTTP surface (`src/main.ts`)

- `app.setGlobalPrefix('api/v1', { exclude: [{ path: 'health', method: RequestMethod.GET }] })` — all routes live under `/api/v1/*` except `GET /health`, which is deliberately excluded because infra healthchecks (`docker-compose.yml`, `.github/workflows/deploy.yml`) hit `/health` directly.
- No CORS is configured. The deployment model is same-origin behind a reverse proxy (frontend and `/api/*` served from one domain) — don't add `app.enableCors()` without revisiting that decision.
- `ProblemDetailsFilter` (`src/common/filters/problem-details.filter.ts`) is the single global exception filter (`@Catch()`), turning every thrown exception — including Zod validation failures — into an RFC 7807 `application/problem+json` body (`type`, `title`, `status`, `detail`, `instance`).

### Authentication — opaque session cookie (not JWT)

Auth uses server-side sessions, not JWTs:

- `SessionService` (`src/modules/auth/session.service.ts`) generates a 256-bit opaque token (`crypto.randomBytes`), stores only its HMAC-SHA256 (keyed with `SESSION_SECRET`) as `Session.tokenHash` in Postgres — the raw token is never persisted, only handed to the client as a cookie.
- `SessionAuthGuard` (`src/modules/auth/session-auth.guard.ts`) reads the `sid` cookie, looks up the hashed token, and attaches `{ sub, email }` to `request.user`; lazily deletes the session row if expired.
- `POST /auth/login` sets the cookie (`httpOnly`, `secure` in production, `SameSite=Strict`); `POST /auth/logout` revokes the session server-side and clears the cookie.
- `SessionAuthGuard`/`SessionService` are real Nest providers with DI dependencies (unlike the old Passport-based guard) — any module that uses `@UseGuards(SessionAuthGuard)` must `imports: [AuthModule]` (see `NotesModule`) for the guard's dependencies to resolve.
- `CurrentUser` decorator (`src/common/decorators/current-user.decorator.ts`) pulls the session user off the request in controllers.

### Notes domain (`src/modules/notes`)

- Ownership is enforced in `NotesService`, not at the query layer for reads by id: `findOne` fetches by id (+ `deletedAt: null`) and then checks `note.ownerId !== ownerId`, throwing `403 Forbidden` (not `404`) when a note exists but belongs to someone else. This is intentional and covered by both `notes.service.spec.ts` and `test/notes.e2e-spec.ts` ("Bob NÃO acessa a nota da Alice") — don't silently change it to a 404 to fix "leaks existence of other users' notes" without checking those tests first.
- Delete is soft (`deletedAt` timestamp, no row removal); `findAll`/`findOne` filter `deletedAt: null`.

### CI/CD

- `.github/workflows/ci.yml` runs on PRs to `main`: lint, unit tests, e2e tests against a real `postgres:17-alpine` service container, and a Docker build validation.
- `.github/workflows/deploy.yml` runs on push to `main`, on a **self-hosted runner**, and SSHes into a fixed production host to `git pull`, run `prisma migrate deploy`, and `docker compose up -d --build`, then polls `/health`.
- `Dockerfile` is a multi-stage build; the builder stage sets a fake `DATABASE_URL` only so `prisma generate`/`prisma.config.ts` can resolve during build (it never connects to a real database at build time).
