# Changelog

## 1.0.0
- Seguridad: JWT RS256, Redis por `REDIS_URL`, CORS/WS parametrizable, sin logs sensibles
- Datos/Perf: vistas materializadas alineadas, `PerformanceService` sin schema fijo
- Multitenancy: `tenantId` explícito en jobs/workers/scheduler
- Observabilidad: métricas por tenant en `/metrics`
- DevOps: Dockerfile, compose y CI (lint/build/test)
- OpenAPI inicial: health, status, upload, preview
- Tests: unit y E2E liviano
- MinIO: sin política pública por defecto; URLs firmadas
