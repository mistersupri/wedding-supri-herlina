# syntax=docker/dockerfile:1.7

# ---------------------------------------------------------------------------
# Base: Debian slim, because Prisma's migration engine is a native binary
# built against glibc and OpenSSL 3.
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---------------------------------------------------------------------------
# deps: every dependency, for the build. The schema is copied first because
# `postinstall` runs `prisma generate`.
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json yarn.lock prisma.config.ts ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn,sharing=locked \
  yarn install --frozen-lockfile --network-timeout 600000

# ---------------------------------------------------------------------------
# build: client bundle (dist/assets) and server bundle (dist/server.mjs).
# ---------------------------------------------------------------------------
FROM deps AS build
COPY . .
RUN yarn build

# ---------------------------------------------------------------------------
# prod-deps: runtime dependencies only. Scripts are skipped: the Prisma client
# is already bundled into dist/server.mjs.
# ---------------------------------------------------------------------------
FROM base AS prod-deps
COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn,sharing=locked \
  yarn install --frozen-lockfile --production --ignore-scripts --network-timeout 600000

# ---------------------------------------------------------------------------
# runtime
# ---------------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    UPLOAD_DIR=/app/uploads

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
VOLUME ["/app/uploads"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/server.mjs"]
