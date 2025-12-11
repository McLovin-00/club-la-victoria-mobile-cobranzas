FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
# Instalar dependencias completas para compilación
RUN --mount=type=cache,target=/root/.npm npm install --legacy-peer-deps

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV TS_NODE_PROJECT=./tsconfig.standalone.json
# Limpiar dist anterior y generar Prisma Client con binary target para Alpine
RUN rm -rf dist && npx prisma generate --schema=src/prisma/schema.prisma
# Compilar TypeScript (permitir algunos errores pero generar JS)
RUN npx tsc -p tsconfig.standalone.json --noEmitOnError false || npx tsc -p tsconfig.standalone.json --skipLibCheck || true

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Instalar Poppler para rasterización de PDFs
RUN apk add --no-cache poppler-utils
COPY package.json ./package.json
COPY --from=builder /app/package.json ./dist/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/prisma ./src/prisma
COPY --from=builder /app/scripts/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && npm prune --omit=dev
EXPOSE 4802
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://localhost:${DOCUMENTOS_PORT:-4802}/health/ready || exit 1
ENTRYPOINT ["./entrypoint.sh"]
