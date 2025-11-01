## Plan de Implementación – Portal de Choferes (Opción A dedicada)

### Objetivo
- Permitir a cada chofer gestionar y consultar su propia documentación y el estado de cumplimiento del equipo al que pertenece, con seguridad estricta y mínima fricción.
- Seguridad reforzada: aislamiento por tenant, ownership por `choferId`, RBAC específico, auditoría y controles anti‑abuso.

---

## Alcance (MVP)
- Identidad y perfil del chofer:
  - Ver datos básicos: DNI normalizado, nombre y apellido, teléfonos (lectura) y edición controlada si el modelo lo permite.
- Documentación (propia del chofer):
  - Subir documentos del tipo CHOFER (validación básica y metadatos mínimos).
  - Ver estado por documento: Aprobado, Rechazado, Pendiente, Próximo a vencer, Vencido.
  - Preview y descarga individual de documentos.
- Equipo y cumplimiento:
  - Ver el equipo actual al que está asignado (empresa transportista, camión, acoplado; solo lectura).
  - Ver cumplimiento documental del equipo en modo lectura (semáforos por entidad: Chofer / Camión / Acoplado / Empresa transportista).
- Notificaciones y ayuda:
  - Recordatorios de vencimientos próximos y rechazos.
  - Guía de carga y validaciones previas a la subida.

---

## Seguridad y Acceso

### Autenticación
- JWT RS256 (claims mínimos): `userId`, `role`, `empresaId` (tenant), `choferId`.
- Expiración corta; refresh token httpOnly; opcional 2FA para acciones sensibles.

### Autorización (RBAC + ownership)
- Roles: `CHOFER` (externo) y roles internos `ADMIN/SUPERADMIN` (soporte).
- Reglas:
  - `req.user.empresaId === tenantEmpresaId` del recurso.
  - `req.user.choferId` debe coincidir con el `entityId` cuando `entityType === 'CHOFER'` y/o con el chofer del `equipoId` consultado.
- Principio de mínimo privilegio: el chofer solo ve y gestiona su propia documentación.

### Controles complementarios
- Rate‑limit por IP y usuario para rutas del portal chofer.
- CORS con allowlist (sin comodines) por ambiente.
- Presigned URLs con TTL corto (60–300s) para preview/descarga.
- Respuestas minimizadas; logs sin PII (masking en errores).

---

## Backend (Documentos) – Endpoints dedicados (Opción A)

Prefijo: `/api/docs/choferes/*` con `authenticate` + `authorize([CHOFER, ADMIN, SUPERADMIN])` y validaciones estrictas de tenant y ownership.

1) Perfil/estado del chofer
- GET `/api/docs/choferes/me`
- Respuesta: datos mínimos del chofer (DNI norm, nombre, teléfonos) y referencias al equipo actual (si aplica).

2) Documentos propios del chofer
- GET `/api/docs/choferes/me/documentos`
- Respuesta: `{ id, templateId, status, expiresAt, fileName }` de documentos con `entityType='CHOFER'` y `entityId = req.user.choferId`.

3) Upload de documentos de chofer
- POST `/api/docs/choferes/me/documents/upload`
- Body: `{ files[] }` o `multipart/form-data` compatible.
- Validación Zod + límites de tipo/tamaño; integración con clasificación/workflow existente.

4) Preview y descarga (documentos propios)
- GET `/api/docs/choferes/documents/:id/preview`
- GET `/api/docs/choferes/documents/:id/download`
- Checks: el doc pertenece al chofer autenticado y al tenant; respuesta presigned.

5) Equipo y cumplimiento (lectura)
- GET `/api/docs/choferes/me/equipo`
- GET `/api/docs/choferes/me/equipo/documentos`
- Respuesta: componentes del equipo y documentos por entidad para visibilidad (sin exponer rutas internas ni PII innecesaria).

---

## Frontend – Portal Chofer

### Flujo principal
- Home con estado del equipo (si existe) y resumen de cumplimiento (semáforos) por entidad.
- Sección "Mis Documentos": listar, estado, preview y descarga; formulario de subida simple con validaciones.
- Ayuda contextual para clasificación de documentos y requisitos básicos.

### UX/Accesibilidad
- Modo móvil prioritario (mobile‑first), carga guiada, estados claros.
- Mensajes de error simples y accionables.

---

## Pruebas

### Unitarias
- Guards de autorización por `choferId` y `empresaId`.
- Zod schemas para params/body (upload y lectura).

### Integración
- Acceso a documentos propios vs. ajenos (403 esperado).
- Uploads válidos por tipo/tamaño; verificación de estado posterior.

### E2E
- Login chofer → ver estado → subir/ver/descargar documentos.

### Seguridad negativa
- IDOR en `docId`/`equipoId`.
- Brute force (rate‑limit), CORS, TTL expirado en URLs firmadas.

---

## DevOps y Configuración
- Entorno: `CORS_ALLOWED_ORIGINS`, `CHOFERES_PORTAL_RATE_LIMIT`, `PRESIGNED_TTL_SECONDS`.
- Secretos: claves RS256 y credenciales de storage (MinIO/S3) via env/secret manager.
- Nginx: HSTS, X‑Content‑Type‑Options, X‑Frame‑Options, CSP básica.
- CI/CD: lint/test/build; gates de seguridad y e2e críticos.

---

## Criterios de Aceptación
- El chofer solo gestiona documentos propios y ve su equipo asociado en lectura.
- Upload/preview/descarga funcionan con TTL y aislamiento por tenant.
- Semáforos de cumplimiento reflejan estados reales; sin filtraciones de PII.
- Logs y métricas disponibles; CORS + rate‑limit activos en prod.

---

## Estimación y Secuencia (MVP 2–4 días)

1) Backend
- Rutas `/choferes/*`, Zod, guards de pertenencia, presigned para preview/descarga.
- Upload propio del chofer; endpoints de equipo y documentos en lectura.

2) Frontend
- Home de estado + "Mis Documentos" (listar, subir, preview/descarga).

3) Pruebas y despliegue
- Unit/Integración/E2E + piloto controlado.
- Observabilidad, feedback y hardening.


