## Plan de Implementación – Portal de Dador de Carga (Requisitos Revisados)

### Objetivo
- Permitir a un dador de carga gestionar sus equipos y su documentación asociada, cumpliendo con requisitos por cliente y entidad.
- Aplicar seguridad de nivel empresarial: aislamiento por tenant, RBAC, auditoría y controles anti‑abuso.

---

## Alcance (MVP)
- Gestión de maestros propios del dador:
  - Choferes: alta/edición (DNI, nombre, apellido), teléfonos.
  - Camiones: alta/edición (patente, marca, modelo), activar/desactivar.
  - Acoplados: alta/edición (patente, tipo), activar/desactivar.
  - Empresas transportistas: selección/gestión (según modelo de datos vigente).
- Gestión de equipos (obligatorio los 4 componentes):
  - Alta/edición de equipo con: Empresa transportista + Chofer + Camión + Acoplado (todos requeridos).
  - Adjuntar/quitar componentes con validaciones que impiden estados incompletos.
  - Activar/desactivar equipo.
- Requisitos documentales:
  - Ver requisitos vigentes por cliente y por entidad: Chofer / Camión / Acoplado / Empresa transportista.
  - Semáforos: VIGENTE / PRÓXIMO / VENCIDO / FALTANTE.
- Documentación:
  - Subir documentos por entidad: Chofer / Camión / Acoplado / Empresa transportista (validación básica y metadatos).
  - Estado: Aprobado, Rechazado, Pendiente, Próximo a vencer, Vencido.
  - Preview/descarga por documento y descarga ZIP de vigentes por equipo.
- Operaciones masivas: subida batch de documentos; import CSV de maestros/equipos (validación).
- Reportes: export CSV de cumplimiento por equipo/cliente/periodo.
- Notificaciones: alertas por vencimientos, rechazos y faltantes.

---

## Seguridad y Acceso

### Autenticación
- JWT RS256 (claims mínimos): `userId`, `role`, `empresaId` (tenant), `dadorId`.
- Expiración corta, refresh token httpOnly.

### Autorización (RBAC + checks de pertenencia)
- Roles: `DADOR_ADMIN` (configura) y `DADOR_OPERADOR` (operativa). `ADMIN/SUPERADMIN` internos con alcance global.
- Reglas:
  - `req.user.empresaId === tenantEmpresaId` del recurso.
  - `req.user.dadorId` debe coincidir con el `dadorCargaId` de los recursos accedidos.
- Principio de mínimo privilegio; solo recursos del dador.

### Controles complementarios
- Rate‑limit por IP y usuario para rutas del portal.
- CORS con allowlist (sin comodines) por ambiente.
- Presigned URLs con TTL corto (60–300s) para preview/descarga.
- Respuestas minimizadas y logs sin PII.

---

## Backend (Documentos) – Endpoints propuestos (Opción A dedicada)

Todas las rutas bajo `/api/docs/dadores/*` con `authenticate` + `authorize([DADOR_ADMIN, DADOR_OPERADOR, ADMIN, SUPERADMIN])` y validación estricta de tenant y dador.

1) Equipos del dador
- GET `/api/docs/dadores/:dadorId/equipos`
- Checks: `empresaId` y `dadorId` del usuario deben coincidir con los del recurso.
- Respuesta mínima: `{ id, driverId, driverDniNorm, truckId, truckPlateNorm, trailerId, trailerPlateNorm, empresaTransportistaId }`.

2) Documentos por equipo
- GET `/api/docs/dadores/equipos/:equipoId/documentos`
- Checks: el `equipoId` pertenece al `dadorId` del usuario y al tenant.
- Respuesta: `{ id, templateId, status, expiresAt, fileName }` (sin paths internos).

3) ZIP de documentos vigentes por equipo
- GET `/api/docs/dadores/equipos/:equipoId/zip`
- Incluye solo `APROBADO` y no vencidos; nombres sin PII.

4) Preview documento
- GET `/api/docs/dadores/documents/:id/preview`
- Checks: el documento está asociado a un equipo del dador (por `entityType/entityId`) y tenant coincide.
- Respuesta: `{ url, ttlSeconds }` (presigned).

5) Descarga documento
- GET `/api/docs/dadores/documents/:id/download`
- Checks: iguales a (4); redirect a presigned o stream binario.

6) Carga de documentos por entidad
- POST `/api/docs/dadores/documents/upload`
- Body: `{ entityType: 'CHOFER'|'CAMION'|'ACOPLADO'|'EMPRESA_TRANSPORTISTA', entityId, files[] }`.
- Validación Zod + límites (tipo/tamaño). Clasificación y workflow existentes.

7) Gestión de equipos (completitud obligatoria)
- POST `/api/docs/dadores/equipos` (crear completo: empresaTransportistaId, driverId, truckId, trailerId requeridos).
- PUT `/api/docs/dadores/equipos/:id` (modificación con reglas de completitud).
- PUT `/api/docs/dadores/equipos/:id/estado` (activar/desactivar).

---

## Frontend – Portal Dador

### Flujo principal
- Listado de equipos del dador (grid/tabla con filtros).
- Tarjeta de equipo con semáforo por entidad (Chofer, Camión, Acoplado, Empresa transportista).
- Acciones por equipo: Ver documentos, subir documentos, descargar ZIP vigentes.

### Maestros
- CRUD de Choferes, Camiones, Acoplados (con validaciones, normalizaciones, estados activo/inactivo).
- Gestión/selección de Empresa Transportista.

### Equipos (obligatorio 4 componentes)
- Alta/edición: selección forzada de Empresa transportista, Chofer, Camión y Acoplado.
- Validaciones que evitan guardar equipos incompletos.

### Documentación
- Subida por entidad incluyendo Empresa transportista.
- Preview/descarga por documento; ZIP por equipo.

### Búsqueda y reportes
- Búsqueda por DNI/patente/equipo.
- Export CSV de cumplimiento.

---

## Pruebas

### Unitarias
- Guards de autorización por `dadorId` y `empresaId`.
- Zod schemas (params/body) para rutas críticas.

### Integración
- Acceso a equipos/documents del propio dador vs. de otro dador (403).
- Uploads válidos por entidad, límites y tipos.

### E2E
- Login dador → ver equipos → estados → subir/ver/descargar → ZIP.

### Seguridad negativa
- IDOR en `equipoId`/`docId`.
- Brute force (rate‑limit), CORS, TTL expirado.

---

## DevOps y Configuración
- Env: `CORS_ALLOWED_ORIGINS`, `DADORES_PORTAL_RATE_LIMIT`, `PRESIGNED_TTL_SECONDS`.
- Secretos: claves RS256 y storage (MinIO/S3) via env/secret manager.
- Nginx: HSTS, X‑Content‑Type‑Options, X‑Frame‑Options, CSP básica.
- CI/CD: lint/test/build; gates de seguridad y e2e críticos.

---

## Criterios de Aceptación
- Equipos siempre completos (empresa transportista, chofer, camión, acoplado) en altas/ediciones.
- Requisitos y estado por entidad incluyen Empresa transportista.
- Subida/preview/descarga/ZIP funcionando y aislados por tenant+dador.
- Logs y métricas disponibles; CORS + rate‑limit activos.

---

## Estimación y Secuencia (MVP 3–5 días)

1) Backend
- Rutas `/dadores/*`, Zod, guards de pertenencia, presigned para preview/descarga.
- Creación/edición de equipos con regla de completitud.
- Rate‑limit y CORS dedicados; logging y métricas.

2) Frontend
- Listado y tarjetas de equipos; semáforos por entidad.
- CRUD de maestros; selección de empresa transportista.
- Subida y descarga (preview/ZIP) por equipo/entidad.

3) Pruebas y despliegue
- Unit/Integración/E2E + piloto controlado.
- Observabilidad, feedback y hardening.


