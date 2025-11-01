## Plan de mejoras – Code Review Checklist

Fecha: 2025-11-01

### Objetivo
Elevar calidad, seguridad y mantenibilidad siguiendo el checklist de revisión de código. Este plan prioriza acciones concretas, responsables sugeridos y criterios de aceptación.

---

## 1) Functionality

### 1.1. Cobertura de casos y errores
- Acción: Definir matriz de casos borde por módulo (documentos, maestros, equipos, notificaciones) y convertirlos en tests unitarios/integración.
- Acción: Estandarizar manejo de errores en backend (middleware único; `code`, `message`, `details`), sin filtrar stack traces en prod.
- Criterios: 100% de endpoints críticos con tests de errores (400/401/403/404/409/429/5xx) y paths felices.

### 1.2. Contratos estables
- Acción: Documentar OpenAPI actualizada (GET/PUT/POST de notificaciones, documentos, equipos). Linter de OpenAPI en CI.
- Criterios: 0 endpoints sin especificación; swagger accesible y consistente.

### 1.3. Reintentos/resiliencia en procesos asíncronos
- Acción: Incorporar reintentos con backoff en notificaciones y workers donde aplique (clasificar errores reintables vs definitivos).
- Criterios: Tasa de fallos transitorios resuelta en ≤3 intentos; métricas de reintentos en Prometheus.

---

## 2) Code Quality

### 2.1. Estilo, lint y estructura
- Acción: ESLint + Prettier sin warnings en todos los workspaces; reglas de complejidad/longitud de funciones.
- Acción: Reducir tamaño de funciones (single responsibility) y evitar nesting profundo (>3 niveles).
- Criterios: `npm run lint` y `npm run format:check` pasan en CI; funciones >60–80 líneas refactorizadas.

### 2.2. Nombres y duplicación
- Acción: Revisar nombres de variables/funciones (semánticos, sin abreviaturas crípticas); extraer utilidades comunes (normalizadores DNI/patentes, render de plantillas, fecha/TTL) a `packages/utils`.
- Criterios: 0 duplicaciones evidentes; utilidades compartidas con tests.

### 2.3. Convenciones del proyecto
- Acción: PR template con checklist (tests, lint, seguridad, breaking changes, ADR cuando aplique).
- Criterios: 100% de PRs con template y checklist completo.

---

## 3) Security

### 3.1. Entrada y validación
- Acción: Zod obligatorio en todos los endpoints sin esquema (ej.: `/api/docs/notifications` PUT y `/test`). Validar msisdn en formato E.164, longitudes y tipos.
- Criterios: 100% endpoints cubiertos por Zod; tests de validación por cada ruta.

### 3.2. Autenticación
- Acción: Confirmar verificación JWT con RS256/JWKS y claims (`iss`, `aud`, `exp`, skew). Documentar expiración/refresh.
- Acción: En producción, priorizar cookies httpOnly + SameSite=strict para sesión o CSP estricta si se mantiene localStorage.
- Criterios: Auditoría de token aprobada; decisión documentada (ADR) y aplicada.

### 3.3. Autorización
- Acción: Revisar y reforzar RBAC + `tenantResolver` en rutas sensibles (notificaciones config/test, descargas, preview).
- Criterios: Tests de autorización por rol/tenant en todos los endpoints críticos.

### 3.4. CORS y Headers
- Acción: Allowlist por entorno (sin comodines) y Helmet con políticas seguras (HSTS, X-Frame-Options, X-Content-Type-Options); CSP planificada para frontend.
- Criterios: CORS/headers verificados en prod; reporte de seguridad sin observaciones.

### 3.5. Rate‑limit y anti‑abuso
- Acción: Rate‑limit específico para `/notifications/*` y por MSISDN (N/hora, M/día) además de dedupe diario.
- Criterios: Pruebas negativas superadas (no permite spam); métricas de bloqueos disponibles.

### 3.6. Logs y PII
- Acción: Enmascarar msisdn/DNI/patentes en logs; evitar dumps de payloads.
- Criterios: Muestreo de logs sin PII explícita.

### 3.7. Uploads y archivos
- Acción: Unificar Multer 2.x y límites de tamaño/MIME; integrar antivirus (clamscan) donde aplique.
- Criterios: Tests de upload (tipo/tamaño) y rechazo de archivos maliciosos.

### 3.8. WebSocket
- Acción: Validar JWT y origin en handshake; cerrar conexiones inválidas.
- Criterios: Tests de conexión con token inválido/ausente, y policy de origin.

---

## 4) Infra/Dependencias

### 4.1. Versiones y CVEs
- Acción: Unificar Express (ideal 5.x), Multer (2.x) y Zod entre servicios; ejecutar `npm audit --omit=dev` + CodeQL/Semgrep en CI.
- Criterios: 0 vulnerabilidades altas/criticas pendientes; matriz de versiones mínima definida.

### 4.2. Observabilidad
- Acción: Métricas Prometheus para notificaciones (sent/failed/deduped por tipo/audiencia/tenant, latencias), health de Evolution, y estado de jobs.
- Criterios: Dashboard operativo con alertas básicas (error rate, fallos de healthcheck).

### 4.3. Documentación y ADRs
- Acción: ADRs para decisiones clave (tokens en cookie vs localStorage, unificación de versiones, modelo de rate‑limit, CSP).
- Criterios: ADRs revisados/aceptados; README con enlaces a planes y ADRs.

---

## Roadmap propuesto

### Fase 0 – Quick Wins (0–2 días)
- Zod en notificaciones (PUT/test) y validación E.164.
- Rate‑limit específico de notificaciones; enmascarado de PII en logs.
- Lint/format sin warnings; PR template.

### Fase 1 – Corto Plazo (1–2 semanas)
- Unificación de versiones (Express/Multer/Zod) con testeo; healthcheck de Evolution + reintentos con backoff.
- Revisión de RBAC/tenant en endpoints sensibles y WebSocket authentication.
- Métricas básicas y monitor de notificaciones.

### Fase 2 – Medio Plazo (2–4 semanas)
- Antivirus en uploads (si requerido) y CSP en frontend (o cookies httpOnly para sesión en prod).
- Métricas completas y alertas; consolidación de utilidades compartidas en `packages/utils`.

---

## Responsables sugeridos
- Seguridad/Backend: Líder BE
- Frontend/UX seguridad (CSP/almacenamiento sesión): Líder FE
- DevOps/CI: SRE/DevOps
- QA: Automation/Tester

---

## Criterios de aceptación generales
- CI con gates: lint, type‑check, tests, audit de dependencias, SAST.
- 0 vulnerabilidades críticas/altas abiertas; 0 endpoints sin validación.
- Logs sin PII; rate‑limit activo; RBAC y tenant verificados por tests.

---

## 5) Hallazgos adicionales de excelencia (revisión transversal del código)

### 5.1. Consistencia de versiones y dependencias
- Unificar Express (apps/documentos usa 5.x; apps/backend 4.x) para evitar divergencias semánticas.
- Unificar Multer (documentos 1.x LTS vs backend 2.x) y ajustar middleware de uploads de forma consistente.
- Alinear Zod a una versión común en frontend/backend para evitar diferencias de validación.

### 5.2. Tipado estricto y eliminación de `any` en frontend
- Varias páginas de Documentos emplean `as any` para sortear tipos (e.g., edición inline en Choferes/Camiones/Acoplados/Equipos). Acción:
  - Definir tipos compartidos en `@workspace/types` y refactorizar componentes para tipado estricto (props, hooks RTK Query, payloads de mutación).
  - Crear selectores/transformers tipados en RTK Query para normalizar respuestas.

### 5.3. Normalizadores y utilidades comunes
- Centralizar `normalizeDni`, `normalizePlate`, formateo de fechas (UTC) y render de plantillas de notificaciones en `packages/utils`.
- Reemplazar duplicaciones locales por utilidades probadas (con tests unitarios).

### 5.4. Manejo de errores unificado
- Backend documentos ya expone `errorHandler`; estandarizar shape `{ success:false, code, message }` en todos los controladores.
- Mapear errores Prisma (P2002, etc.) a 409/422 con mensajes consistentes; evitar filtrar stack en prod.

### 5.5. Seguridad inbound
- Añadir Zod a endpoints faltantes (notificaciones config/test) y a cualquier ruta que actualmente reciba body sin validación explícita.
- Validar IDs en params con transform a número y `refine(v>0)` (consistente en todo el árbol).

### 5.6. Seguridad sesión/token
- Confirmar RS256/JWKS en verificación de JWT y claims estrictas; documentar skew.
- Evaluar migración a cookies httpOnly + SameSite=strict en prod (o CSP estricta si se mantiene localStorage).

### 5.7. CORS/Helmet/Headers
- Asegurar allowlist por entorno; agregar Helmet con HSTS, X-Frame-Options, X-Content-Type-Options. Planificar CSP para frontend.

### 5.8. Rate‑limit granular
- Añadir rate‑limit específico en `/api/docs/notifications/*` (config/test) y por MSISDN, además de la deduplicación diaria.

### 5.9. WebSocket
- Validar JWT en handshake y origin permitido. Cerrar conexiones inválidas; emitir métricas por canal/evento.

### 5.10. Scheduler y concurrencia
- Evitar ejecuciones duplicadas entre réplicas: lock distribuido (Redis/DB advisory locks) para tareas `checkExpirations`/`checkMissingDocs`.
- Exponer `GET /notifications/jobs/status` y `POST /notifications/jobs/run` (ADMIN) con validación y rate‑limit.

### 5.11. Notificaciones (robustez y DX)
- Healthcheck Evolution (startup + cada 5 min) y reintentos con backoff (3 intentos) clasificando errores reintables.
- Vista previa de plantillas (backend) y UI de preview antes de enviar.
- Métricas: `notifications_sent/failed/deduped_total{type,audience,tenant}`, latencias y estado del proveedor.

### 5.12. Uploads
- Homologar límites de tamaño/MIME; integrar antivirus (clamscan) en puntos de entrada que lo requieran por cumplimiento.

### 5.13. Observabilidad
- Añadir correlación de requests (requestId) en logs y propagar a llamadas internas; registrar contexto mínimo no sensible.
- Completar métricas de negocio (vencimientos próximos, faltantes por dador/cliente) y técnicas (latencias p95/p99 por endpoint).

### 5.14. Internacionalización y UX
- Externalizar textos hardcodeados (ES) a utilidades de i18n para futura localización.
- Consistencia en mensajes de error/éxito en frontend; capa de toasts centralizada con códigos de error legibles.

### 5.15. CI/CD y calidad continua
- Añadir jobs: `npm audit`, SAST (CodeQL/Semgrep), type‑check, build, tests, lint/format como gates obligatorios.
- Reportes de cobertura mínimos por paquete (documentos: servicios y validadores críticos).

### 5.16. ADRs y documentación
- Crear ADRs para: (1) estrategia de sesión (cookies vs localStorage), (2) unificación de versiones, (3) política de rate‑limit/dedupe, (4) CSP/Helmet.
- README con enlaces a planes (`PORTAL_*_PLAN.md`, `NOTIFICACIONES_PLAN.md`, `SECURITY_AUDIT.md`) y a ADRs.


