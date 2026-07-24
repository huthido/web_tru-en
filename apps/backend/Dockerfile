# syntax=docker/dockerfile:1.7
# Backend NestJS — multi-stage build for Coolify / docker-compose deploy.
# Build context MUST be the monorepo root so packages/shared is accessible.
#   docker build -f apps/backend/Dockerfile -t web-truyen-backend .

ARG NODE_VERSION=20-alpine

############################
# Stage 1 — install deps   #
############################
FROM node:${NODE_VERSION} AS deps
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /repo

# Required by Prisma engines on Alpine
RUN apk add --no-cache openssl libc6-compat

# Copy workspace manifests first (better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/

# Use --no-frozen-lockfile if lockfile is absent (first deploy). Frozen otherwise.
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
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /repo
RUN apk add --no-cache openssl libc6-compat

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules

# Copy the source code
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc tsconfig.json ./
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Cap V8 heap during the TypeScript build. Without this, Node auto-sizes its
# heap from the HOST's RAM (not the build container's cgroup limit), so on a
# constrained Coolify VPS `tsc` (nest build) balloons and the OOM killer kills
# it ("Killed"). This backend's tsc genuinely needs >1.5GB (Prisma's generated
# client types are huge, and skipLibCheck can't skip type *instantiation* of
# types the app actually uses), so 2048MB is the floor that lets it finish.
# NOTE: the compose build runs this AND the frontend `next build` in PARALLEL,
# so the box needs headroom for both. The deploy relies on VPS swap to absorb
# physical-RAM overflow from the two parallel builds; this cap only bounds V8's
# self-limit (swap can't help a V8 limit) — set generously so tsc never hits it,
# and let swap catch any overflow. Tune via the build-arg.
ARG NODE_BUILD_MEMORY=3072
ENV NODE_OPTIONS="--max-old-space-size=${NODE_BUILD_MEMORY}"

# Generate Prisma client + compile NestJS
WORKDIR /repo/apps/backend
RUN pnpm prisma generate
RUN pnpm run build

############################
# Stage 3 — runtime        #
############################
FROM node:${NODE_VERSION} AS runner
ENV NODE_ENV=production \
    PORT=3009
WORKDIR /app

# vips + vips-heif: sharp dùng libvips runtime để decode/encode ảnh. vips-heif
# bổ sung HEIC/HEIF decoder cho ảnh chụp từ iPhone — bắt buộc phía server vì
# trình duyệt desktop không tự convert. Build cộng ~30MB image size.
RUN apk add --no-cache openssl libc6-compat tini vips vips-heif \
    && addgroup -S nodejs -g 1001 \
    && adduser -S nestjs -u 1001 -G nodejs

# Copy compiled artifacts and pruned node_modules
COPY --from=builder /repo/node_modules                    ./node_modules
COPY --from=builder /repo/apps/backend/node_modules       ./node_modules_app
COPY --from=builder /repo/packages/shared                 ./packages/shared
COPY --from=builder /repo/apps/backend/dist               ./dist
COPY --from=builder /repo/apps/backend/prisma             ./prisma
COPY --from=builder /repo/apps/backend/package.json       ./package.json

# Persistent volume target for the local-uploads fallback
RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3009

# Container-level health so Coolify (per-app deploy / rolling updates) and
# `docker run` know when the API is ready. start-period is generous because
# `prisma migrate deploy` runs before the server starts listening.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3009}/api/health" || exit 1

# Apply pending Prisma migrations on boot, then start the server.
# Use `npx prisma migrate deploy` (not `dev`) so it only applies, never generates.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
