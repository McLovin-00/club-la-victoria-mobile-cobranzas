# =============================================================================
# Dockerfile - Documentos OPTIMIZADO v2
# =============================================================================
# Multi-stage con cache de npm, producción slim
# Objetivo: <400MB (era 498MB)
# =============================================================================
# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# Stage 1: Deps - Cache de dependencias
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./

# Instalar con cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm install --legacy-peer-deps

# -----------------------------------------------------------------------------
# Stage 2: Builder - Compilar y generar Prisma
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generar Prisma y compilar
RUN npx prisma generate --schema=src/prisma/schema.prisma && \
    npx tsc -p tsconfig.standalone.json --skipLibCheck

# Prune dev deps
RUN npm prune --omit=dev

# -----------------------------------------------------------------------------
# Stage 3: Runner - Producción slim
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Poppler para rasterización PDF
RUN apk add --no-cache poppler-utils && \
    rm -rf /var/cache/apk/*

# Copiar solo lo necesario
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/prisma ./src/prisma
COPY scripts/entrypoint.sh ./

RUN chmod +x ./entrypoint.sh && \
    rm -rf /root/.npm /tmp/*

EXPOSE 4802

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:4802/health/ready || exit 1

ENTRYPOINT ["./entrypoint.sh"]
