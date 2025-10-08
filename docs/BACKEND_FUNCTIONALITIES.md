## Backend - Inventario de funcionalidades (monorepo)

Este documento lista, de forma ejecutiva y accionable, las funcionalidades expuestas por los servicios backend del monorepo. Se organiza por app/microservicio y por dominios (rutas principales). No incluye implementación interna, solo capacidades y endpoints.

### apps/documentos (Microservicio Documentos)

- Autenticación/tenant: `authenticate`, `tenantResolver` en todas las rutas /api/docs/*
- Rate limiting: `generalRateLimit` global; específicos: `approvalRateLimit`, `configRateLimit`.
- Salud y métricas:
  - GET `/health` (health, ready, live)
  - GET `/metrics` (Prometheus, incluye `documentos_pending_approval_total`)
- Configuración y catálogos:
  - GET/POST `/api/docs/flowise` (config AI)
  - GET/POST `/api/docs/evolution` (config Evolution)
  - GET/POST `/api/docs/config` (config por tenant)
  - GET/POST `/api/docs/templates` (plantillas por tipo de entidad)
  - GET `/api/docs/defaults` (valores por defecto)
- Gestión documental:
  - POST `/api/docs/documents/upload` (subida + antivirus + MinIO)
  - GET `/api/docs/documents/{id}/preview` (URL firmada)
  - GET `/api/docs/documents/status` (listado con stats por `DocumentStatus`)
- Dashboard y KPIs:
  - GET `/api/docs/dashboard/semaforos`, `/stats`, `/alerts`, `/approval-kpis`
- Clientes y requerimientos:
  - GET `/api/docs/clients` (clientes), requerimientos por cliente (según plan)
- Dadores y maestros:
  - GET `/api/docs/dadores`
  - GET `/api/docs/maestros/choferes|camiones|acoplados` (catálogos)
- Equipos (driver/truck/trailer):
  - GET `/api/docs/equipos` (listado)
  - POST `/api/docs/equipos/{id}/attach` (asociar por id o DNI/patente normalizada)
  - POST `/api/docs/equipos/{id}/detach` (desasociar; chofer/camión bloqueado en activo; solo trailer)
- Búsquedas y storage:
  - GET `/api/docs/search` (DNI/patente)
  - GET `/api/docs/storage/stats` y `/api/docs/storage/init`
- Notificaciones:
  - POST `/api/docs/notifications/test`
- Empresas transportistas:
  - CRUD `/api/docs/empresas-transportistas` + colecciones `/:id/choferes`, `/:id/equipos`
- Aprobación manual (post-clasificación AI):
  - GET `/api/docs/approval/pending` (pendientes)
  - GET `/api/docs/approval/pending/{id}` (detalle + signed URL)
  - POST `/api/docs/approval/pending/{id}/approve` (confirma entidad/id/expiración, cambia a APROBADO)
  - POST `/api/docs/approval/pending/{id}/reject` (cambia a RECHAZADO)
  - POST `/api/docs/approval/pending/batch-approve` (aprobación masiva)
  - GET `/api/docs/approval/stats` (KPIs de aprobación)

Notas técnicas: Prisma PostgreSQL, MinIO tenantizado, BullMQ/Redis para clasificación y validaciones, Flowise para clasificación (`CLASIFICANDO` → `PENDIENTE_APROBACION` → revisión humana), Zod para validación de entradas, JWT RS256, CORS y rate-limits configurables por .env.

### apps/backend (Plataforma / Orquestador)

- Health y métricas:
  - GET `/health`, `/metrics` y raíz `/` (ping)
- Configuración de servicios:
  - GET `/api/config/services` (qué microservicios están habilitados por flags)
  - GET `/api/config/health`
- Gestión de servicios (catálogo interno):
  - GET/POST/PUT/DELETE `/api/services` (validaciones, estados, stats, cambio de estado)
- Gestión de instancias (por servicio/empresa):
  - GET/POST/PUT/DELETE `/api/instances` + `/stats`
  - Permisos por instancia: GET/POST `/api/instances/:id/permisos`
  - Auxiliar: GET `/api/instances/:id/users/available`
- Proxy condicionales según flags:
  - `/api/gateway/*` (cuando gateway deshabilitado devuelve 404 informativo)
  - Proxy chat-processor/gateway cuando se habilitan

Autenticación: JWT, roles `SUPERADMIN`, `ADMIN`, `OPERATOR`; middleware `tenantResolver`.

### apps/chat-processor (Interno - procesamiento conversacional)

- API interna (HTTP) para orquestación:
  - `/health`, `/api/health`
  - POST `/api/process`, `/api/process/batch`
  - GET/POST/PUT `/api/config/*`
  - POST `/api/instance/:instanceId/status`
  - POST `/api/media/process`
  - POST `/api/distribution`
  - POST/GET `/api/metrics`, `/api/metrics/:instanceId`
  - GET `/api/instances/:instanceId/resources|conversations|triggers` y PUT `/api/instances/:instanceId/triggers`
  - Ejecuciones y logs: POST `/api/instances/:instanceId/execute`, GET `/api/instances/:instanceId/executions|logs`, DELETE ejecución
  - Wizard/Routes adicionales (según `routes/wizard.routes.ts`)

### apps/gateway (Proxy/autorización)

- Rutas de proxy principal (según `routes/proxy.routes.ts`) y health/metrics. Funciona como hub de autorización y enrutamiento.

### apps/calidad (QMS)

- Módulos: tenants, export, kpi, audit, ledger, standards, documents, notifications, ncr, risk, reports, reads, monitor, health, index. Endpoints REST bajo `/api/qms/*` (según archivos en `src/routes/`).

—
Este inventario refleja el estado actual del repo tras las últimas integraciones de EmpresaTransportista y Aprobación Manual en Documentos.


