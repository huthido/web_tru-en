# syntax=docker/dockerfile:1.7
# Frontend Next.js 14 — multi-stage build for Coolify / docker-compose deploy.
# Build context MUST be the monorepo root.
#   docker build -f apps/frontend/Dockerfile -t web-truyen-frontend .
#
# NEXT_PUBLIC_* variables must be supplied as build args because Next.js
# inlines them into the client bundle at build time.

ARG NODE_VERSION=20-alpine

############################
# Stage 1 — install deps   #
############################
FROM node:${NODE_VERSION} AS deps
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /repo
RUN apk add --no-cache libc6-compat

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    if [ -f pnpm-lock.yaml ]; then \
        pnpm install --frozen-lockfile; \
    else \
        pnpm install --no-frozen-lockfile; \
    fi

############################
# Stage 2 — build          #
############################
FROM node:${NODE_VERSION} AS builder
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH" \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /repo

# Re-declare build args inside this stage so they're available during `next build`
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_CDN_HOST
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_CDN_HOST=${NEXT_PUBLIC_CDN_HOST}

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/frontend/node_modules ./apps/frontend/node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc tsconfig.json ./
COPY packages/shared ./packages/shared
COPY apps/frontend ./apps/frontend

WORKDIR /repo/apps/frontend
RUN pnpm run build

############################
# Stage 3 — runtime        #
############################
FROM node:${NODE_VERSION} AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN apk add --no-cache tini \
    && addgroup -S nodejs -g 1001 \
    && adduser -S nextjs -u 1001 -G nodejs

# Next.js standalone output bundles only the files needed to run the server.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/frontend/public ./apps/frontend/public

USER nextjs
EXPOSE 3000

# Container-level health for Coolify per-app deploy / rolling updates.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/" || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/frontend/server.js"]
