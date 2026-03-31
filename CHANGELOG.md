# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Fixed
- **[Nginx / Docker]** Tras `docker compose up` o recrear contenedores, 502 Bad Gateway: nginx resolvía `frontend`/`backend`/etc. una sola vez al arrancar y seguía usando IPs viejas. Se usa `resolver 127.0.0.11` y `proxy_pass` con variables para re-resolver vía DNS de Docker (`nginx/nginx.conf`). Tras cambiar el archivo, conviene `docker compose restart nginx` (no solo reload) si aún ves 502.
- **[Frontend / Helpdesk]** RTK Query: las respuestas del API (`{ success, data, pagination }`) no se desempaquetaban; listado, detalle, mensajes, mutaciones y estadísticas quedaban vacíos o incorrectos. Parsers en `helpdeskResponseParsers.ts` + tests en `helpdeskResponseParsers.test.ts`.
- **[Frontend / Helpdesk]** Cerrar y reabrir ticket: el cliente usaba `POST` y el backend expone `PATCH`; alineado con `ticket.routes.ts`.
- **[Docker / QA Helpdesk]** El backend del stack QA no arrancaba por variables DB requeridas faltantes (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_ADMIN_DATABASE`, `DB_SCHEMA`); se agregaron al servicio `backend` del compose.
- **[Docker / QA Helpdesk]** El frontend del stack QA reiniciaba por upstreams no resueltos (`backend`/`documentos`) y choque de puerto 80; se agregó servicio `documentos`, dependencias healthcheck y el proxy público quedó en `8080`.
- **[Docker / QA Helpdesk]** Healthchecks de backend/helpdesk en `docker-compose.helpdesk-qa.yml` usan Node en lugar de `wget` (no presente en `node:20-alpine`).
- **[Docker / QA Helpdesk]** `.dockerignore` excluía toda `deploy/stack-ip-192.168.15.136/` y el build del frontend fallaba al copiar `nginx.conf`; se excluye el contenido de la carpeta salvo ese archivo.
- **[Helpdesk / Telegram]** `/cerrar` desde el tópico fallaba si el ticket estaba en OPEN o IN_PROGRESS: se permiten transiciones a CLOSED desde esos estados y se registra `closedAt`.
- **[Helpdesk / Telegram]** Al enviar un adjunto desde el grupo/tópico de resolvers, el DM al usuario creador ahora incluye el archivo (copia del mensaje), no solo el nombre del archivo.
- **[Frontend]** Corregida cobertura de tests que mostraba 0% a pesar de tener tests pasando
  - Agregado `coverageProvider: 'v8'` en `jest.config.cjs` para compatibilidad con SWC
  - La cobertura ahora refleja correctamente el estado real de los tests
  - Incremento de ~51k a ~80k líneas en el reporte LCOV mergeado

### Added
- **[Helpdesk / API]** `POST /api/helpdesk/admin/tickets/:ticketId/messages`: respuestas `RESOLVER` desde la web (paridad con Telegram). Util `message-attachments.ts`; `createResolver` acepta `platformResolverUserId` opcional. ADR: `docs/helpdesk/ADR-HELPDESK-RESOLVER-WEB.md`.
- **[Frontend / Helpdesk]** Flujo web: rutas `/helpdesk` para cualquier usuario autenticado; estadísticas agregadas solo para staff (`skip` en RTK); modal «Nuevo ticket»; en detalle, staff que no es el creador envía vía endpoint admin; cierre/reapertura solo para el creador. Hook `useHelpdeskStaff`.
- **[Docs / Helpdesk]** Plan de implementación web usuario ↔ resolver (`docs/helpdesk/PLAN_FLUJO_USUARIO_RESOLVER_WEB.md`): crear/ver tickets, respuesta resolver por API, listado por tenant, fases y pruebas.
- **[Helpdesk]** Multi-tenant: columna `empresa_id` en tickets, filtrado de listados/stats/detalle por empresa para ADMIN/ADMIN_INTERNO; SUPERADMIN ve todo; JWT `userId` normalizado a `req.user.id`; `ADMIN_INTERNO` en rutas `/api/helpdesk/admin/*`. Telegram asigna tenant leyendo `platform_users`. ADR: `docs/helpdesk/ADR-HELPDESK-TENANT.md`.
- **[Helpdesk / Dev]** Script `npm run seed:dev-tickets -w helpdesk` para insertar tickets `[DEV]` de prueba (tras seed del backend).
- **[Backend / Seed]** Segunda empresa `Empresa Demo B` y usuarios `operador@empresa.com` / `operador2@empresa-b.com` (development).
- **[Docs / Helpdesk]** Matriz manual de QA en `docs/helpdesk/MATRIZ_QA_MESA_DE_AYUDA.md` (casos HD-001 a HD-055); enlace desde `docs/helpdesk/SETUP_QA_PLATAFORMA.md`.
- **[Docs]** Nueva documentación de testing:
  - `docs/testing/COVERAGE_TROUBLESHOOTING.md` - Guía de solución de problemas de cobertura
  - `docs/testing/JEST_BEST_PRACTICES.md` - Mejores prácticas y configuración de Jest
- **[Frontend]** Comentarios mejorados en `jest.config.cjs` explicando la importancia del coverage provider

### Changed
- **[Frontend / Helpdesk]** Alta de ticket en pantalla estilo chat (`/helpdesk/nuevo`): texto, adjuntos múltiples y nota de voz (MediaRecorder); sin modal. Botón «Nuevo ticket» navega a esa ruta.
- **[Helpdesk / API]** `POST /api/helpdesk/tickets` acepta `multipart/form-data` con campo `attachments` (hasta 8 archivos); mensaje puede ser corto si hay archivos. `audio/webm` permitido para grabaciones del navegador. JSON sin archivos sin cambios (mensaje ≥10 caracteres).
- **[Frontend / Helpdesk]** Enlace «Mesa de ayuda» en la navegación principal para todos los usuarios autenticados (antes solo en bloque Gestión para staff).
- **[README]** Agregadas referencias a la nueva documentación de testing

---

## Formato de Entradas

### Added
Para nuevas funcionalidades.

### Changed
Para cambios en funcionalidades existentes.

### Deprecated
Para funcionalidades que serán removidas en próximas versiones.

### Removed
Para funcionalidades removidas.

### Fixed
Para corrección de bugs.

### Security
Para cambios relacionados con seguridad.
