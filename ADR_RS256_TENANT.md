## ADR: Autenticación RS256 y Contrato de Tenant

### Contexto
- Se detectó uso de HS256 con fallback de secreto en el microservicio `documentos` y diferencias en manejo de tenant.
- Requerimientos: llaves asimétricas (RS256) y definición canónica de tenant.

### Decisión
- Adoptar RS256 para todos los microservicios. El token JWT se firma con clave privada en el backend principal y se verifica con `JWT_PUBLIC_KEY` en cada servicio.
- Contrato de claims: `{ userId, email, role, tenantEmpresaId? }`.
  - Superadmin: `tenantEmpresaId` opcional, puede elegir por `x-tenant-id` o `tenantId` (query).
  - Otros roles: `tenantEmpresaId` obligatorio.
- Resolver tenant en middleware, propagar `req.tenantId` y exigir filtros por `tenantEmpresaId` en consultas.
- Jobs/Workers: llevar `tenantId` en payload; no usar variables globales.

### Consecuencias
- Mayor seguridad (no se comparte secreto) y menor acoplamiento.
- Operación consistente multitenant.
- Requiere configurar `JWT_PUBLIC_KEY` en despliegue.

### Implementación
- `apps/documentos/src/config/auth.ts`: verificación RS256 con `JWT_PUBLIC_KEY`.
- `apps/documentos/src/services/websocket.service.ts`: claims alineadas y CORS por `FRONTEND_URLS`.
- `apps/documentos/src/services/*queue*/workers*`: uso de `REDIS_URL` y `tenantId` en payloads.
- `apps/documentos/src/services/scheduler.service.ts`: iterar tenants y llamar servicios con `tenantId`.

### Status
- Implementado en `documentos`. Extender al resto de microservicios.
