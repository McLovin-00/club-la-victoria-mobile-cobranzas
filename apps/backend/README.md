# Backend

## Variables de entorno clave

- FRONTEND_URLS: lista separada por comas para CORS
- BACKEND_PORT: puerto del backend
- JWT_PRIVATE_KEY | JWT_PRIVATE_KEY_PATH
- JWT_PUBLIC_KEY | JWT_PUBLIC_KEY_PATH
- JWT_LEGACY_SECRET (temporal)
- RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX
- ENABLE_GATEWAY, ENABLE_CHAT, ENABLE_CALIDAD

## Endpoints

- /health, /health/ready, /health/live
- /metrics (Prometheus)
- /api/platform/auth/* (login, profile, change-password, register)
- /api/empresas, /api/services, /api/usuarios

## Seguridad

- RS256 para JWT; fallback HS256 temporal controlado por JWT_LEGACY_SECRET.
- CORS multi-origen vía FRONTEND_URLS.
- helmet, compression, express-rate-limit configurables.

## Multitenancy

- tenantResolver expone req.tenantId.
- Proxies reenvían Authorization y x-empresa-id.

## Observabilidad

- Winston con rotate y PII masking.
- Métricas y healthchecks habilitados.

## Desarrollo

- Dev: npm run dev en la raíz del monorepo.
- Tests: cd apps/backend && npm test.
- CI: lint, build, tests y prisma validate.
