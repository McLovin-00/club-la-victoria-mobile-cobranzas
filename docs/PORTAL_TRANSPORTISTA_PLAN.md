## Plan de Implementación – Portal de Empresa Transportista (Opción A dedicada)

### Objetivo
- Permitir a una empresa transportista gestionar sus maestros (choferes, camiones, acoplados), conformar equipos completos, y administrar su documentación asociada para cumplir con requisitos de los dadores/clientes.
- Seguridad reforzada: aislamiento por tenant, RBAC específico, auditoría y controles anti‑abuso.

---

## Alcance (MVP)
- Maestros propios de la transportista:
  - Choferes: alta/edición (DNI, nombre, apellido), teléfonos.
  - Camiones: alta/edición (patente, marca, modelo), activar/desactivar.
  - Acoplados: alta/edición (patente, tipo), activar/desactivar.
- Equipos (composición operativa OBLIGATORIA):
  - Crear/editar equipos con los 4 componentes obligatorios: Empresa transportista (implícita = la actual) + Chofer + Camión + Acoplado.
  - Validaciones que impiden estados incompletos.
  - Activar/desactivar equipo; ver historial y estado actual.
- Requisitos documentales:
  - Ver requisitos vigentes por dador/cliente y por entidad: Chofer / Camión / Acoplado / Empresa transportista.
  - Semáforos: VIGENTE / PRÓXIMO / VENCIDO / FALTANTE.
- Documentación:
  - Subir documentos por entidad: Chofer / Camión / Acoplado / Empresa transportista (validación básica y metadatos).
  - Preview/descarga individual y ZIP de vigentes por equipo.
- Operaciones masivas: subida batch de documentos; import CSV de maestros/equipos (con validaciones).
- Reportes: export CSV de cumplimiento por dador/cliente/equipo/periodo.
- Notificaciones: alertas por vencimientos, rechazos y faltantes.

---

## Seguridad y Acceso

### Autenticación
- JWT RS256 (claims mínimos): `userId`, `role`, `empresaId` (tenant), `empresaTransportistaId`.
- Expiración corta; refresh token httpOnly; rotación opcional.

### Autorización (RBAC + checks de pertenencia)
- Roles: `TRANSPORTISTA_ADMIN` (configura) y `TRANSPORTISTA_OPERADOR` (operativa). `ADMIN/SUPERADMIN` internos con alcance global.
- Reglas:
  - `req.user.empresaId === tenantEmpresaId` del recurso.
  - `req.user.empresaTransportistaId` debe coincidir con `empresaTransportistaId` de equipos/maestros/documentos.
- Principio de mínimo privilegio; solo recursos de la transportista.

### Controles complementarios
- Rate‑limit por IP y usuario para rutas del portal.
- CORS con allowlist (sin comodines) por ambiente.
- Presigned URLs con TTL corto (60–300s) para preview/descarga.
- Respuestas minimizadas y logs sin PII; masking en errores.

---

## Backend (Documentos) – Endpoints dedicados (Opción A)

Prefijo: `/api/docs/transportistas/*` con `authenticate` + `authorize([TRANSPORTISTA_ADMIN, TRANSPORTISTA_OPERADOR, ADMIN, SUPERADMIN])` y validaciones estrictas de tenant y empresa transportista.

1) Equipos de la transportista
- GET `/api/docs/transportistas/:empresaTransportistaId/equipos`
- Checks: `empresaId` y `empresaTransportistaId` del usuario deben coincidir.
- Respuesta mínima: `{ id, driverId, driverDniNorm, truckId, truckPlateNorm, trailerId, trailerPlateNorm, empresaTransportistaId }`.

2) Documentos por equipo
- GET `/api/docs/transportistas/equipos/:equipoId/documentos`
- Checks: el `equipoId` pertenece a la empresa transportista del usuario y al tenant.
- Respuesta: `{ id, templateId, status, expiresAt, fileName }` (sin paths internos).

3) ZIP de documentos vigentes por equipo
- GET `/api/docs/transportistas/equipos/:equipoId/zip`
- Incluye solo `APROBADO` y no vencidos; nombres sin PII; streaming desde storage.

4) Preview documento
- GET `/api/docs/transportistas/documents/:id/preview`
- Checks: el documento está asociado a entidades/equipos de la transportista; tenant coincide.
- Respuesta: `{ url, ttlSeconds }` (presigned).

5) Descarga documento
- GET `/api/docs/transportistas/documents/:id/download`
- Checks: iguales a (4); redirect a presigned o stream binario.

6) Carga de documentos por entidad
- POST `/api/docs/transportistas/documents/upload`
- Body: `{ entityType: 'CHOFER'|'CAMION'|'ACOPLADO'|'EMPRESA_TRANSPORTISTA', entityId, files[] }`.
- Validación Zod + límites (tipo/tamaño). Integración con clasificación/workflow existente.

7) Gestión de equipos (completitud obligatoria)
- POST `/api/docs/transportistas/equipos` (crear completo: driverId, truckId, trailerId requeridos; `empresaTransportistaId` implícito por usuario).
- PUT `/api/docs/transportistas/equipos/:id` (modificación con reglas de completitud).
- PUT `/api/docs/transportistas/equipos/:id/estado` (activar/desactivar).

8) Maestros (scoped a la transportista)
- CRUD Choferes, Camiones, Acoplados bajo checks de `empresaTransportistaId` y tenant.

---

## Frontend – Portal Transportista

### Flujo principal
- Dashboard de cumplimiento: semáforo por entidad (Chofer, Camión, Acoplado, Empresa transportista) y próximos vencimientos.
- Listado de equipos (grid/tabla) con filtros por estado y búsqueda por DNI/patentes/equipo.
- Tarjeta de equipo: estado por requisito, ver documentos, subir documentos, descargar ZIP vigentes.

### Maestros
- CRUD de Choferes, Camiones, Acoplados (normalización de DNI/patentes, estados activo/inactivo).

### Equipos (obligatorio 4 componentes)
- Alta/edición con selección de Chofer, Camión y Acoplado; `empresaTransportistaId` implícito (del usuario).
- Validaciones que evitan guardar equipos incompletos.

### Documentación
- Subida por entidad incluyendo Empresa transportista.
- Preview/descarga por documento; ZIP por equipo.

### Búsqueda y reportes
- Búsqueda por DNI/patente/equipo.
- Export CSV de cumplimiento por dador/cliente/equipo/periodo.

---

## Pruebas

### Unitarias
- Guards de autorización por `empresaTransportistaId` y `empresaId`.
- Zod schemas (params/body) para rutas críticas.

### Integración
- Acceso a equipos/documentos propios vs. de otra transportista (403 esperado).
- Uploads válidos por entidad, límites y tipos; verificación de presigned/TTL.

### E2E
- Login transportista → ver equipos → estados → subir/ver/descargar → ZIP.

### Seguridad negativa
- IDOR en `equipoId`/`docId`.
- Brute force (rate‑limit), CORS, TTL expirado en URLs firmadas.

---

## DevOps y Configuración
- Entorno: `CORS_ALLOWED_ORIGINS`, `TRANSPORTISTAS_PORTAL_RATE_LIMIT`, `PRESIGNED_TTL_SECONDS`.
- Secretos: claves RS256 y credenciales de storage (MinIO/S3) via env/secret manager.
- Nginx: HSTS, X‑Content‑Type‑Options, X‑Frame‑Options, CSP básica.
- CI/CD: lint/test/build; gates de seguridad y e2e críticos.

---

## Criterios de Aceptación
- Equipos siempre completos (empresa transportista implícita, chofer, camión, acoplado) en altas/ediciones.
- Requisitos y estado por entidad incluyen Empresa transportista.
- Subida/preview/descarga/ZIP funcionando y aislados por tenant+transportista.
- Logs y métricas disponibles; CORS + rate‑limit activos en prod.

---

## Estimación y Secuencia (MVP 3–5 días)

1) Backend
- Rutas `/transportistas/*`, Zod, guards de pertenencia, presigned para preview/descarga.
- Creación/edición de equipos con regla de completitud y activación.
- Rate‑limit y CORS dedicados; logging y métricas.

2) Frontend
- Dashboard + listado y tarjetas de equipos; semáforos por entidad.
- CRUD de maestros; alta/edición de equipos; subida/descarga (preview/ZIP).

3) Pruebas y despliegue
- Unit/Integración/E2E + piloto controlado.
- Observabilidad, feedback y hardening.


