# Microservicio Documentos

## Variables de entorno
- ENABLE_DOCUMENTOS=true
- DOCUMENTOS_PORT=4802
- DOCUMENTOS_DATABASE_URL=postgres://user:pass@host:5432/db?schema=public
- JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."
- REDIS_URL=redis://host:6379
- MINIO_ENDPOINT=http://minio:9000
- MINIO_ACCESS_KEY=...
- MINIO_SECRET_KEY=...
- MINIO_USE_SSL=false
- MINIO_BUCKET_PREFIX=documentos-empresa
- FRONTEND_URLS=http://localhost:8550

## Arranque local (compose)
- `docker-compose -f docker-compose.dev.yml up -d --build documentos`

## Healthchecks
- `GET /health`, `/health/ready`, `/health/detailed`, `/health/live`

## Métricas
- `GET /metrics` (incluye series por tenant)

## OpenAPI
- Ver `apps/documentos/openapi.yaml`

## Despliegue (PM2)
- `pm2 start pm2.ecosystem.config.js`

## Migraciones/Seed en contenedor
- El entrypoint ejecuta `prisma migrate deploy` y `SEED=true` permite correr seed.
