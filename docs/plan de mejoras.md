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


