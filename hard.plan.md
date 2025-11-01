<!-- 5ec5f9ba-ecf0-41d1-8dc2-caf0f03c12ab b549fc05-4809-4289-8ea5-c4061dddc053 -->
# Plan de hardening, consistencia y CI para monorepo-bca

## Alcance

- Cambios atómicos y mínimos orientados a: seguridad (RS256), CORS, healthchecks, rate limiting, bcrypt, CI y logging. Sin features nuevas.

## Entregables

- Configuración y código ajustados en `apps/backend`, `apps/documentos`, `.env`, Compose/Docker y CI.
- Documentación actualizada (`README.md`, `docs/ENVIRONMENTS.md`, `ADR_RS256_TENANT.md`).

## Tareas por prioridad

### P0 — Correcciones inmediatas

1) Alinear healthchecks a `/health`

- Editar `docker-compose.hybrid.yml` (backend.service.healthcheck.test → `http://localhost:${PORT:-${BACKEND_PORT:-4800}}/health`).
- Revisar healthchecks similares en `docker-compose.*.yml` y `deploy/stack-*/Dockerfile.backend` para coherencia con `/health`.
- Validar respuesta 200 en `apps/backend/src/routes/health.routes.ts`.

2) Corregir rutas de claves RSA en `.env`

- Usar rutas internas del contenedor: `JWT_PUBLIC_KEY_PATH=/app/keys/jwt_public.pem` y `JWT_PRIVATE_KEY_PATH=/app/keys/jwt_private.pem`.
- Mantener montado `./keys:/app/keys:ro` en Compose para contenedores.

### P1 — Seguridad

3) Enforce RS256 estricto en producción (sin HS256)

- `apps/backend/src/services/platformAuth.service.ts`: rechazar fallback si `NODE_ENV=production` o `ALLOW_JWT_LEGACY!=='true'`.
- `apps/backend/src/middlewares/auth.middleware.ts`: misma lógica para verificación.
- `apps/documentos/src/config/auth.ts`: idem.
- `.env`: eliminar `JWT_LEGACY_SECRET` en prod; mantener sólo para dev si se requiere migración.

4) CORS acotado por entorno

- `.env`: en prod, dejar sólo dominios públicos en `FRONTEND_URLS`; mover IPs a `.env` de dev.
- Verificar `apps/backend/src/app.ts` usa `FRONTEND_URLS`/`CORS_ORIGIN` correctamente.

5) Eliminar IPs en variables Vite de prod

- `.env`: usar `VITE_API_BASE_URL` con dominio; dejar IPs sólo en dev. Frontend ya usa proxy en dev.

6) Bcrypt rounds parametrizables

- `apps/backend/src/services/platformAuth.service.ts`: leer `process.env.BCRYPT_ROUNDS`, parsear, mínimo 12, límite razonable; tests.

### P2 — Confiabilidad

7) Alinear rate limit con `.env`

- `apps/backend/src/app.ts`: aceptar `RATE_LIMIT_WINDOW_MS` o derivar desde `RATE_LIMIT_WINDOW` (minutos → ms), priorizando `*_MS`.
- `.env`: definir `RATE_LIMIT_WINDOW_MS` y ajustar `RATE_LIMIT_MAX`.
- Añadir test unitario simple para la resolución de ventana.

8) Unificación de endpoints de salud

- Verificar que todos los servicios expongan los endpoints coherentes y actualizar healthchecks de Compose/PM2:
  - Backend Compose: `http://localhost:${PORT:-${BACKEND_PORT:-4800}}/health`
  - Documentos Compose/Dockerfile: `http://localhost:${DOCUMENTOS_PORT:-4802}/health/ready`

### P3 — Observabilidad y logging

9) Redacción de PII en logs

- `apps/backend/src/config/logger.ts` y `apps/documentos/src/config/logger.ts`: agregar transform para ocultar tokens (`Authorization: Bearer ...`), cookies sensibles, emails y teléfonos.
- Validar que niveles se ajustan por `LOG_LEVEL`.

### P4 — CI/CD y calidad

10) Pipeline CI monorepo

- Crear `.github/workflows/monorepo-ci.yml`:
- jobs: lint, type-check, test (con coverage), build, prisma validate/generate por workspace (`apps/*`, `packages/*`).
- cache de `~/.npm` y Turborepo; matrix por servicio.

11) Cobertura mínima Jest

- `apps/backend/jest.config.js`, `apps/documentos/jest.config.js`: `coverageThreshold` razonable por paquete.

### P5 — Configuración y documentación

12) Estandarización de puertos y ENV

- Documentar preferencia por `BACKEND_PORT`; mantener `PORT` sólo como compatibilidad. No romper runtime actual.
- En healthchecks, usar `${PORT:-${BACKEND_PORT:-4800}}` para backend.

13) Documentación de entornos y claves

- `README.md`, `docs/ENVIRONMENTS.md`: separar variables dev/prod, claves RSA por rutas internas `/app/keys/...`, montaje `keys/` en contenedores.
- `ADR_RS256_TENANT.md`: actualizar decisión de RS256 estricto y transición fuera de HS256.

### To-dos

- [ ] Cambiar healthcheck a `/health` en `docker-compose.hybrid.yml` usando `${PORT:-${BACKEND_PORT:-4800}}` y revisar otros compose
- [ ] Usar `/app/keys/...` en `.env` para JWT y mantener volumen `./keys:/app/keys:ro`
- [ ] Deshabilitar HS256 en prod en backend y documentos (con flag `ALLOW_JWT_LEGACY`)
- [ ] Restringir `FRONTEND_URLS` a dominios en prod; IPs sólo en dev
- [ ] Usar `VITE_API_BASE_URL` con dominio en prod; IPs sólo dev
- [ ] Leer `BCRYPT_ROUNDS` con mínimo 12 en `PlatformAuthService`
- [ ] Aceptar `RATE_LIMIT_WINDOW_MS` o convertir `RATE_LIMIT_WINDOW` (min→ms)
- [ ] Alinear `health` en servicios y healthchecks de Compose/PM2 (documentos a `/health/ready`)
- [ ] Agregar redacción de PII en Winston (tokens/cookies)
- [ ] Crear workflow `monorepo-ci`: lint, type, test+coverage, build, prisma
- [ ] Definir `coverageThreshold` en jest configs de backend y documentos
- [ ] Documentar preferencia de `BACKEND_PORT` y compatibilidad con `PORT`
- [ ] Actualizar README/docs sobre env por entorno y claves RSA

