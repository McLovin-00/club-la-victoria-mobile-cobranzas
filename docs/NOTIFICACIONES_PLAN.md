## Plan Integral de Corrección y Compleción – Sistema de Notificaciones

### Objetivo
- Corregir inconsistencias, completar faltantes y estandarizar el sistema de notificaciones del microservicio Documentos.
- Garantizar seguridad (tenant‑scoped, RBAC), confiabilidad (reintentos, deduplicación), y observabilidad (logs/métricas).

---

## Estado Actual (Resumen)
- Backend (Documentos):
  - Configuración por tenant: `GET/PUT /api/docs/notifications` (enabled, windows, templates) y `POST /test` (envío de prueba).
  - Motor de envío por WhatsApp vía Evolution (`EvolutionClient`), deduplicación diaria, logging en `notification_log`.
  - Jobs programados: vencimientos (cada hora) y faltantes (diario 07:00).
  - Plantillas simples por audiencia (CHOFER, DADOR) y ventanas (aviso/alerta/alarma).
- Frontend:
  - Página de Configuración de Notificaciones (básica) para enabled/windows/templates + test.
  - Hooks y componentes “WhatsApp avanzado” que apuntan a endpoints no expuestos en Documentos (`/notifications/whatsapp/*`).

---

## Problemas Detectados y Brechas
- Desalineación Front/Back:
  - El front tiene `/notifications/whatsapp/config|test` pero el backend documentos solo expone `/notifications` y `/test` (básico).
- Un solo canal operativo (WhatsApp). Email/SMS/Webhook/Push no están implementados.
- Rate‑limit por destinatario ausente (solo dedupe por día basado en doc/equipo+tipo+audiencia).
- Plantillas básicas, sin vista previa en UI ni i18n.
- Opt‑in granular por individuo/empresa incompleto (solo flags en Dador; Chofer con phones pero sin preferencia granular).
- Resiliencia limitada: sin reintentos/backoff ni healthcheck del proveedor.
- Observabilidad incompleta: sin métricas detalladas por tipo/tenant/resultado.
- AlertService con “TODO” para envío real (solo logging informativo).

---

## Alcance del Plan
1) Alinear Front/Back para WhatsApp (Opc. A dedicada en Documentos) y compatibilizar la página actual.
2) Endurecer seguridad y límites (RBAC, tenant, CORS, rate‑limit por MSISDN).
3) Mejorar resiliencia (reintentos con backoff, healthcheck Evolution, clasificación de errores).
4) Extender funcionalidades (vista previa de plantillas, variables enriquecidas, opt‑in granular).
5) Observabilidad y auditoría (métricas Prometheus, dashboards, logs saneados).
6) Pruebas (unitarias, integración, E2E, negativas) y despliegue gradual.

---

## Diseño Técnico y Cambios Propuestos

### 1. Endpoints Backend (Documentos) – Alineación WhatsApp
- Añadir endpoints dedicados bajo `/api/docs/notifications/whatsapp`:
  - `GET /config`: retorna configuración (enabled, instance/server/token enmascarado, templates por evento/ámbito).
  - `PUT /config`: actualiza configuración en `system_config` (clave con prefijo `tenant:{id}:notifications.whatsapp.*`).
  - `POST /test`: envía mensaje de prueba con variables; responde resultado y log id.
  - `GET /status`: health del proveedor (ping a Evolution, versión/instancia).
- Mantener compatibilidad con `GET/PUT /api/docs/notifications` (enabled/windows/templates) usada por la UI actual.
- Validación con Zod de payloads (msisdn E.164, campos requeridos, límites de longitudes).

### 2. Seguridad y Límites
- RBAC: ADMIN/SUPERADMIN para configuración; OPERATOR para test controlado; auditoría obligatoria.
- Tenant‑scoped: `x-tenant-id` obligatorio, y lectura/escritura en keys bajo `tenant:{id}:...`.
- CORS: allowlist por entorno para `/api/docs/notifications/*`.
- Rate‑limit:
  - Global por IP/usuario para rutas de configuración/test.
  - Por destinatario (MSISDN) y tipo de evento: máx N/hora y M/día (configurable por env). Persistir contadores simples en Redis o en `notification_log` con ventana.
- Deduplicación: ampliar clave a `(documentId|equipoId, type, audience, templateKey, day)`.

### 3. Resiliencia y Entrega
- Reintentos con backoff exponencial (pequeña cola en memoria o Redis):
  - Estados: PENDING → SENT/FAILED; si FAILED reintentable (5xx, timeouts), reintentar 3 veces con backoff 1m/5m/15m.
  - Registrar `attempt`, `lastError`, `nextAttemptAt` en `notification_log` o tabla auxiliar.
- Healthcheck Evolution (startup + cada 5 min):
  - Si no hay configuración completa o ping falla, marcar “degradado” y evitar cola (o enrutar a fallback si existe).
- Clasificación de errores: transport (net, DNS, 5xx), autenticación (401/403), aplicación (4xx); exponer en logs/metricas.

### 4. Extensiones Funcionales
- Vista previa de plantillas (backend):
  - `POST /api/docs/notifications/preview` → recibe template + variables y devuelve `rendered` sin enviar.
- Variables enriquecidas por evento:
  - `link_portal`, `empresa_nombre`, `dador_nombre`, `equipo_id`, `dni_chofer`, `patentes` formateadas, `vence_el` con locale.
- Opt‑in granular:
  - Dador (ya tiene `notifyDriverEnabled`, `notifyDadorEnabled` y `phones`).
  - Chofer: agregar `notifyEnabled` opcional y validación de `phones` E.164.
  - Empresa transportista/Cliente: preparar flags para futuros canales.
- Canales futuros (feature flags): Email (SMTP), SMS (Twilio), Webhook; definir interfaces para `ChannelAdapter`.

### 5. Observabilidad y Auditoría
- Prometheus/Métricas:
  - Contadores: `notifications_sent_total{type,audience,tenant}`, `notifications_failed_total{reason}`, `notifications_deduped_total{type}`.
  - Histograma de latencias por envío y por healthcheck.
  - Gauge de jobs activos y fecha de última ejecución.
- Logs (Winston):
  - Nivel INFO para eventos SEND/FAILED con ids; WARN para reintentos; ERROR con stack controlado.
  - No loggear tokens/credenciales; msisdn parcialmente enmascarado.
- Monitor UI (frontend):
  - Página “Monitor de Notificaciones” con métricas básicas y últimos 50 logs (tenant‑scoped).

### 6. Jobs Programados (Scheduler)
- Confirmar arranque del Scheduler en Documentos y exponer `GET /api/docs/notifications/jobs/status` (listado y estado running).
- Exponer `POST /api/docs/notifications/jobs/run` para ejecutar `checkExpirations` o `checkMissingDocs` manualmente (ADMIN).
- Idempotencia y locks: simple “mutex por tarea” en memoria; si hay múltiples réplicas, considerar lock en DB/Redis.
- Ventanas configurables: permitir override por env (cron) o por `SystemConfig` avanzado.

---

## Frontend – Cambios Necesarios
- Unificar la página de Configuración:
  - Sección “General”: enabled/windows/templates (ya existente).
  - Sección “WhatsApp”: config/test/status alineado a los nuevos endpoints.
  - Validación msisdn (E.164) y vista previa de plantilla (render preview backend).
- Eliminar o alinear hooks que llaman `/notifications/whatsapp/*` no soportado; apuntar a Documentos.
- Agregar “Monitor de Notificaciones” con métricas y últimos envíos (tenant‑scoped).

---

## Datos y Configuración
- `system_config` por tenant:
  - `tenant:{id}:notifications.enabled` (true/false)
  - `tenant:{id}:notifications.windows` (JSON)
  - `tenant:{id}:notifications.templates` (JSON)
  - `tenant:{id}:notifications.whatsapp.enabled|server|token|instance` (sensibles encriptados cuando aplique)
- Validar y normalizar `DadorCarga.phones` y `Chofer.phones` a E.164.

---

## Pruebas
- Unitarias:
  - Render de plantillas, deduplicación y rate‑limit MSISDN.
  - Validaciones Zod de endpoints nuevos; healthcheck Evolution.
- Integración:
  - `checkExpirations`/`checkMissingDocs` con datos de prueba; verificación de logs SENT/FAILED y dedupe.
  - Config GET/PUT, test send y status bajo RBAC y tenant.
- E2E:
  - Habilitar notificaciones → crear doc con vencimiento próximo → confirmar envío y registro.
- Negativas:
  - Configuración incompleta Evolution, msisdn inválido, over‑limit, token inválido; esperar FAILED con razón adecuada.

---

## Métricas de Éxito (KPIs)
- < 1% de fallos transitorios sin reintentos exitosos.
- Tiempo medio de entrega < 2s (WhatsApp, dado proveedor operativo).
- 0 incidentes de desbordes por falta de rate‑limit.
- 100% de configuraciones sensibles sin exposición en logs.

---

## Roadmap y Estimación
- Fase 1 (1–2 días): Endpoints WhatsApp alineados, Zod, healthcheck, rate‑limit MSISDN, vista previa backend.
- Fase 2 (1–2 días): Reintentos con backoff, métricas Prometheus, monitor UI básico.
- Fase 3 (2–4 días): Opt‑in granular, i18n de plantillas, canales adicionales (Email/SMS) detrás de feature flags.

---

## Riesgos y Mitigaciones
- Proveedor externo caído (Evolution): healthcheck + backoff + alerta; opcional fallback a Email/SMS.
- Configuración errónea (tokens/instancia): validaciones en PUT/config y estado en /status; bloqueo preventivo de envío.
- Carga masiva: rate‑limit por MSISDN + colas y batch window.
- Privacidad: masking msisdn en logs, secretos encriptados, CORS restrictivo.

---

## Criterios de Aceptación
- UI y API alineadas; envío de prueba funcional; jobs operativos con métricas visibles.
- Dedupe y rate‑limit efectivos; reintentos operativos y auditados.
- Sin exposición de secretos; logs y métricas útiles para operación.


