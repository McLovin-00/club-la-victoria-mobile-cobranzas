# =====================================================
# Microservicio Remitos - Dockerfile
# =====================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm ci --only=production=false

# Copiar código fuente
COPY . .

# Generar Prisma client y compilar
RUN npx prisma generate --schema=src/prisma/schema.prisma && \
    npm run build

# =====================================================
# Imagen de producción
# =====================================================

FROM node:20-alpine AS production

WORKDIR /app

# Instalar poppler-utils para rasterización de PDF
RUN apk add --no-cache poppler-utils

# Instalar solo dependencias de producción
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Copiar artefactos del builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Variables de entorno
ENV NODE_ENV=production
ENV REMITOS_PORT=4803

# Exponer puerto
EXPOSE 4803

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4803/health || exit 1

# Comando de inicio
CMD ["node", "dist/index.js"]

