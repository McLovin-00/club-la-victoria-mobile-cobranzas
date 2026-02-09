# =============================================================================
# Dockerfile - Remitos OPTIMIZADO v2
# =============================================================================
# Multi-stage con cache, producción slim
# Objetivo: <400MB (era 472MB)
# =============================================================================
# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# Stage 1: Deps
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./

RUN --mount=type=cache,target=/root/.npm \
    npm install

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate --schema=src/prisma/schema.prisma && \
    npx tsc -p tsconfig.standalone.json --skipLibCheck && \
    npm prune --omit=dev

# -----------------------------------------------------------------------------
# Stage 3: Runner
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Poppler y vips para procesamiento de imágenes/PDF
RUN apk add --no-cache poppler-utils vips && \
    rm -rf /var/cache/apk/*

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN rm -rf /root/.npm /tmp/*

ENV REMITOS_PORT=4803
EXPOSE 4803

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4803/health || exit 1

CMD ["node", "dist/index.js"]
