## Security Audit

Fecha: 2025-11-01

### Overview
Auditoría estática del monorepo para identificar riesgos y brechas de seguridad en dependencias, autenticación/autorización, validación de entrada, manejo de secretos, CORS, rate‑limiting, uploads, WebSocket y sistema de notificaciones. Sin cambios de código, solo relevamiento y plan de remediación.

### Alcance
- apps/documentos (microservicio Documentos)
- apps/backend (backend plataforma)
- apps/frontend (SPA React)
- packages (utils/types)

### Metodología
- Revisión de `package.json` por servicio (versiones, librerías críticas).
- Lectura de middlewares de auth/RBAC/validación (backend documentos).
- Análisis de CORS, rate‑limit, manejo de configuración y secretos.
- Revisión de flujo de notificaciones y jobs programados.

---

## Hallazgos

### 1) Dependencias (estado y riesgos)
- Mismatches de versión:
  - Express: documentos ^5.1.x vs backend ^4.18.x (divergencia de API/semántica).
  - Multer: documentos ^1.4.5‑lts.1 vs backend ^2.x (cambios de API y seguridad).
  - Zod: versiones diferentes entre servicios (riesgo de discrepancias de validación).
- Recomendaciones:
  - Ejecutar `npm audit --omit=dev` por servicio y consolidar CVEs reales.
  - Unificar Express (preferible 5.x si el backend lo soporta) y Multer (2.x) con pruebas.
  - Alinear Zod a la misma minor estable en todos los paquetes.

### 2) Autenticación (tokens y sesión)
- Documentos: `authenticate` exige Bearer y delega a `DocumentosAuthService.verifyToken(...)`.
- Riesgos/pendientes:
  - Confirmar firma RS256/JWKS, validación de `iss/aud/exp` y clock skew razonable.
  - Frontend persiste token en `localStorage` (riesgo XSS ⇒ robo de token).
- Recomendaciones:
  - Preferir cookies httpOnly + SameSite=strict en producción o CSP estricta si se mantiene localStorage.
  - Documentar expiraciones y refresco de tokens.

### 3) Autorización (RBAC/tenant)
- `authorize` por roles y `tenantResolver` obligan `tenantId`; uso correcto en la mayoría de rutas.
- Pendiente: verificar que TODOS los endpoints sensibles (p.ej. notificaciones config/test) apliquen RBAC estricto y validación.

### 4) Validación de entrada (Zod)
- Amplio uso de `validate(schema)` en documentos (choferes, camiones, acoplados, etc.).
- Falta Zod en notificaciones: `PUT /api/docs/notifications` y `POST /api/docs/notifications/test` (msisdn E.164, shape de windows/templates).

### 5) Manejo de secretos y configuración
- Sin secretos hardcode en repo.
- Config Evolution (WhatsApp) via `system_config`. Bien.
- Recomendación: enmascarar valores sensibles al exponer config por API; cifrar campos marcados como sensibles.

### 6) CORS
- Documentos: allowlist desde variable (`FRONTEND_URLS`), `credentials: true`.
- Recomendación: asegurar que en prod no se use comodín; mantener lista estricta por entorno.

### 7) Rate‑Limiting
- `generalRateLimit` (1000/15m) y límites por subida (`uploadRateLimit`).
- Faltante: rate‑limit por MSISDN y por endpoint de configuración/test de notificaciones.

### 8) Uploads/archivos
- Uso de Multer; antivirus (clamscan) está como dependencia pero no verificado en el flujo.
- Recomendación: unificar límites de tamaño y MIME; integrar AV (si requerido por cumplimiento) en punto de entrada de uploads.

### 9) Logging y PII
- Winston + rotate. Correcto.
- Recomendación: enmascarar msisdn/DNI/patentes en logs; no registrar cuerpos completos de requests.

### 10) WebSocket
- Servicio presente; no se evidenció en esta revisión la validación del token en handshake.
- Recomendación: exigir JWT en conexión y validar origin; cerrar si inválido.

### 11) Sistema de notificaciones
- Canal operativo: WhatsApp via Evolution; deduplicación diaria; jobs programados (vencimientos hora, faltantes diario); auditoría en `notification_log`.
- Brechas:
  - Endpoints del frontend para WhatsApp avanzado no existen 1:1 en documentos (desalineación parcial).
  - Sin healthcheck periódico de Evolution; sin reintentos/backoff; sin rate‑limit por MSISDN.
  - Plantillas básicas, sin vista previa en UI.

---

## Riesgos (priorización)
- Alto
  - Token en localStorage (XSS ⇒ robo de sesión) si no hay CSP estricta.
  - Endpoints de notificaciones sin Zod ni rate‑limit específico.
  - Falta de healthcheck/reintentos en notificaciones (riesgo de caída silenciosa).
- Medio
  - Divergencia de Express/Multer/Zod (riesgo de inconsistencias/bugs).
  - Falta de validación E.164 en msisdn.
  - WebSocket sin autenticación explícita (por confirmar en implementación real).
- Bajo
  - Logs con PII no enmascarada en algunos flujos.
  - Antivirus no integrado consistentemente.

---

## Recomendaciones y Plan de Remediación

### Quick Wins (1–2 días)
- Añadir Zod schemas a `/api/docs/notifications` (PUT) y `/test` (POST), validando estructuras y msisdn E.164.
- Aplicar rate‑limit estricto a rutas de configuración/test de notificaciones.
- Implementar en frontend vista previa de plantilla (render server) antes de enviar.
- Enmascarar PII en logs (msisdn/DNI/patentes).

### Corto Plazo (1–2 semanas)
- Unificar versiones: Express (ideal 5.x), Multer 2.x, Zod consistente.
- Evaluar migración a cookies httpOnly para tokens en producción o endurecer CSP + sanitización.
- WebSocket: validar JWT en handshake y origin; cerrar conexiones inválidas.
- Healthcheck Evolution (startup + cada 5 min) y reintentos con backoff exponencial (3 intentos).
- Rate‑limit por MSISDN (N/hora, M/día) además de deduplicación diaria.

### Medio Plazo (2–4 semanas)
- Integrar antivirus en pipelines de upload cuando proceda (cumplimiento/cliente).
- Métricas Prometheus para notificaciones: `sent/failed/deduped` por `type/audience/tenant`, latencias y estado Evolution.
- Alinear endpoints “WhatsApp avanzado” del frontend con backend documentos o eliminar rutas no soportadas.

---

## Security Checklist
- [ ] Dependencies updated and secure (audit + unificación de versiones clave)
- [x] No hardcoded secrets (validado; usar `system_config`/env)
- [~] Input validation implemented (falta en endpoints de notificaciones)
- [~] Authentication secure (confirmar RS256/JWKS; revisar storage del token)
- [~] Authorization properly configured (revisar rutas sensibles notificaciones y WebSocket)

> Leyenda: [x] OK · [~] Parcial · [ ] Pendiente

---

## Evidencias (referencias de código)
- Autenticación/RBAC/tenant: `apps/documentos/src/middlewares/auth.middleware.ts`
- Rate‑limit: `apps/documentos/src/middlewares/rateLimiter.middleware.ts`
- Notificaciones (servicio): `apps/documentos/src/services/notification.service.ts`
- Cliente Evolution: `apps/documentos/src/services/evolution-client.service.ts`
- Configuración notificaciones (rutas/controlador): `apps/documentos/src/routes/notifications.routes.ts`, `apps/documentos/src/controllers/notifications.controller.ts`
- Auditoría: `apps/documentos/src/prisma/schema.prisma` (modelo `NotificationLog`)


