## Plan de Implementación – Portal de Cliente (Opción A)

### Objetivo
- Permitir a un cliente externo consultar el estado documental de todos sus equipos, ver documentos individuales y descargar ZIP de vigentes.
- Endurecer seguridad: aislamiento por tenant y cliente, mínimo privilegio, auditoría y controles anti‑abuso.

---

## Alcance (MVP basado en lo existente)
- Listado de equipos del cliente.
- Estado de cumplimiento por equipo (VIGENTE/PRÓXIMO/VENCIDO/FALTANTE) según requisitos del cliente.
- Listado de documentos por equipo.
- Descarga individual y ZIP de vigentes por equipo.
- Vista de preview con URL presignada.

---

## Arquitectura de Acceso y Seguridad

### Autenticación
- JWT firmado con RS256.
- Claims mínimos: `userId`, `role`, `empresaId` (tenant), `clienteId`.
- Expiración corta y refresh token seguro (httpOnly).

### Autorización (RBAC + checks de pertenencia)
- Roles permitidos: `CLIENTE_TRANSPORTE`, `ADMIN`, `SUPERADMIN`.
- Regla general:
  - `tenant` del usuario debe coincidir con `tenantEmpresaId` del recurso.
  - Para `CLIENTE_TRANSPORTE`, el `clienteId` del token debe coincidir con el recurso solicitado.
- Principio de mínimo privilegio: acceso solo a equipos/documentos vinculados a su cliente.

### Controles adicionales
- Rate‑limit por IP y usuario para rutas `/clients/*`.
- CORS: allowlist por ambiente (sin comodines).
- Presigned URLs con TTL corto (60–300s) y opcional nonce.
- PII minimizada en respuestas, logging sin datos sensibles.

---

## Backend (Documentos) – Endpoints y Lógica (Opción A)

Todas las rutas bajo `/api/docs/clients/*` con `authenticate` + `authorize([CLIENTE_TRANSPORTE, ADMIN, SUPERADMIN])` y validación estricta de pertenencia (tenant y cliente).

1) Listar equipos del cliente
- GET `/api/docs/clients/:clienteId/equipos`
- Checks:
  - `req.user.empresaId === equipo.tenantEmpresaId`.
  - Si rol `CLIENTE_TRANSPORTE`: `req.user.clienteId === params.clienteId`.
- Respuesta: lista de equipos con campos mínimos (ids, DNI normalizado, patentes normalizadas, flags).

2) Documentos por equipo (cliente)
- GET `/api/docs/clients/equipos/:equipoId/documentos`
- Checks:
  - El `equipoId` pertenece al `clienteId` del usuario y al `tenant`.
- Respuesta: `{ id, templateId, status, expiresAt, fileName }` (sin paths internos ni PII).

3) ZIP de documentos vigentes por equipo
- GET `/api/docs/clients/equipos/:equipoId/zip`
- Checks: iguales a (2).
- Comportamiento:
  - Incluir solo documentos `APROBADO` y no vencidos.
  - Stream desde almacenamiento (MinIO/S3) mediante presigned o SDK.
  - Nombre de archivos sin PII; usar identificadores normalizados.

4) Preview documento (cliente)
- GET `/api/docs/clients/documents/:id/preview`
- Checks:
  - El `doc.id` debe estar asociado a un equipo del cliente (por `entityType/entityId` dentro de un `equipoId` del cliente).
  - `tenant` coincide con el del usuario.
- Respuesta: `{ url, ttlSeconds }` presignada y opcionalmente de un solo uso.

5) Descarga documento (cliente)
- GET `/api/docs/clients/documents/:id/download`
- Checks: iguales a (4).
- Comportamiento: redirección a presigned o stream del binario.

### Validaciones (Zod)
- `:clienteId`, `:equipoId`, `:id` → `z.string().transform(Number).refine(v=>v>0)`.
- Respuestas consistentes (`success`, `data`, `message` en error).

### Auditoría y Observabilidad
- Logging (Winston) por acceso a preview/descarga/zip con `userId`, `clienteId`, `equipoId`, `docId`, `resultado`.
- Métricas Prometheus: QPS por endpoint, tasa de error, latencias P95/P99.

### Rate‑limit y CORS
- Rate‑limit específico `/clients/*`: p.ej. 60 req/min por IP y 180 req/min por usuario.
- CORS por dominio (prod/staging), sin `*`; headers y métodos mínimos.

---

## Frontend – Portal Cliente

### Autoselección de cliente
- Si `role === CLIENTE_TRANSPORTE`, ocultar selector y usar `clienteId` del token/estado.

### Flujo UI
- Listar equipos con `useGetClienteEquiposQuery({ clienteId })`.
- Cargar documentos al expandir una tarjeta con `useGetDocumentosPorEquipoQuery({ equipoId })`.
- Acciones:
  - “Ver” (preview): `/api/docs/clients/documents/:id/preview`.
  - “Descargar”: `/api/docs/clients/documents/:id/download`.
  - “ZIP vigentes”: `/api/docs/clients/equipos/:equipoId/zip`.
- Filtro por estado (VIGENTE/PRÓXIMO/VENCIDO/FALTANTE) y export CSV local.

### UX/Accesibilidad
- Estados claros, contadores por equipo, responsive, WCAG AA.

---

## Contratos de Ejemplo

GET `/clients/:clienteId/equipos` → 200
```json
{
  "success": true,
  "data": [
    { "id": 101, "driverDniNorm": "30111222", "truckPlateNorm": "ABC123", "trailerPlateNorm": "ZXY789" }
  ]
}
```

GET `/clients/equipos/:equipoId/documentos` → 200
```json
{
  "success": true,
  "data": [
    { "id": 555, "templateId": 9, "status": "APROBADO", "expiresAt": "2026-01-01T00:00:00.000Z", "fileName": "VTV_ABC123.pdf" }
  ]
}
```

GET `/clients/documents/:id/preview` → 200
```json
{ "success": true, "data": { "url": "https://...signed...", "ttlSeconds": 120 } }
```

---

## Pruebas

### Unitarias
- Guards: pertenencia equipo‑cliente y validación de tenant.
- Zod schemas (params y respuestas).

### Integración
- `/clients/:clienteId/equipos`: acceso correcto vs cliente equivocado.
- `/clients/equipos/:equipoId/documentos`: autorizado vs no autorizado.
- `/clients/documents/:id/{preview,download}`: documento propio vs ajeno.

### E2E
- Login cliente → equipos → estados → preview → descarga → ZIP.

### Seguridad (negativas)
- IDOR cambiando `equipoId`/`docId`.
- Brute force (rate‑limit).
- CORS maliciosos (bloqueo) y TTL vencido en URLs presignadas.

---

## DevOps y Configuración

### Variables
- `CORS_ALLOWED_ORIGINS`, `CLIENT_PORTAL_RATE_LIMIT`, `PRESIGNED_TTL_SECONDS`.

### Secretos
- Clave privada RS256, credenciales de storage (MinIO/S3), via `.env`/secret manager.

### Infra
- Nginx: HSTS, X‑Content‑Type‑Options, X‑Frame‑Options, CSP básica para portal.

### CI/CD
- Lint/test/build; gating por tests de seguridad y e2e críticos.

---

## Modelo de Datos y Migración
- Usuarios externos: asociar `clienteId` (tabla puente o columna directa).
- Integridad: verificar relaciones `cliente ↔ equipos`.
- Scripts de revisión: equipos sin cliente, documentos huérfanos.

---

## Despliegue y Rollout
- Feature flag: `PORTAL_CLIENTE_ENABLED`.
- Piloto con 1–2 clientes.
- Observación (logs/métricas) y feedback; hardening si aparece patrón de abuso.
- Apertura gradual y documentación a clientes.

---

## Riesgos y Mitigaciones
- IDOR/tenant escape: checks estrictos por `clienteId` y `empresaId` en cada consulta.
- Fuga de PII: respuestas mínimas; logging sin PII; masking en errores.
- Abuso de descarga: rate‑limit y TTL corto.
- CORS: allowlist estricta y verificación en CI.

---

## Criterios de Aceptación
- Cliente autenticado ve solo sus equipos y documentos.
- Preview y descargas funcionan con TTL y sin filtrar datos de otros clientes.
- ZIP contiene solo documentos vigentes y aprobados del equipo.
- Tests unitarios/integración/E2E pasan; métricas y logs visibles.
- CORS y rate‑limit activos en prod.

---

## Estimación y Secuencia (MVP 2–4 días)

1) Backend
- Añadir/ajustar rutas `/clients/*`, zod schemas, guards de pertenencia.
- Implementar preview/download cliente con presigned.
- Rate‑limit/CORS por entorno.
- Logging y métricas.

2) Frontend
- Autoselección de cliente (ocultar selector a `CLIENTE_TRANSPORTE`).
- Botones Preview/Descargar/ZIP usando rutas cliente.
- Contadores por equipo.

3) Pruebas y despliegue
- Unit/Integración/E2E.
- Piloto y monitoreo.
- Ajustes finales y habilitación general.


