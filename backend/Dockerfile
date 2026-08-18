FROM node:22-bookworm-slim AS base

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*


# -------------------------
# Build
# -------------------------
FROM base AS build

COPY package*.json ./

RUN npm ci

COPY prisma ./prisma

RUN npx prisma generate

COPY . .

RUN npm run build


# -------------------------
# Migraciones
# Conserva Prisma CLI
# -------------------------
FROM build AS migrate

CMD ["npx", "prisma", "migrate", "deploy"]


# -------------------------
# Dependencias de producción
# -------------------------
FROM build AS production-deps

RUN npm prune --omit=dev


# -------------------------
# Runtime
# -------------------------
FROM base AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/src/main.js"]