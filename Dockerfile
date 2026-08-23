# ---- Build ----
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .

ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

RUN npx prisma generate
RUN npm run build


# ---- Runtime ----
FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev --ignore-scripts \
    && npm install --no-save --ignore-scripts prisma@7.8.0

COPY --from=builder /app/dist ./dist
# tsc emite em dist/src/ (a raiz comum inclui scripts/, fora de src/ —
# ver scripts/generate-openapi.ts), então o Prisma Client gerado
# precisa ficar ao lado do dist/src compilado, não em ./src, pra
# dist/src/prisma/prisma.service.js resolver '../generated/...'.
COPY --from=builder /app/src/generated ./dist/src/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

CMD ["node", "dist/src/main.js"]