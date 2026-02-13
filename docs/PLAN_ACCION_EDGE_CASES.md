# Plan de Acción — Escenarios Especiales y Casos Borde

> Auditoría completa de la plataforma BCA  
> Fecha: 2026-02-11  
> Alcance: backend, documentos, remitos, frontend  
> Total de hallazgos: 47

---

## Resumen Ejecutivo

| Severidad    | Cantidad | Criterio                                  |
|-------------|----------|-------------------------------------------|
| **CRÍTICO** | 5        | Resolver antes de producción              |
| **ALTO**    | 12       | Resolver en próximo sprint                |
| **MEDIO**   | 19       | Planificar en backlog (Sprint 2-3)        |
| **BAJO**    | 11       | Mejora continua                           |

---

## Índice

1. [Autenticación y Seguridad](#1-autenticación-y-seguridad) (8 hallazgos)
2. [Documentos — Ciclo de Vida](#2-documentos--ciclo-de-vida) (5 hallazgos)
3. [Equipos — Composición y Transferencias](#3-equipos--composición-y-transferencias) (6 hallazgos)
4. [Remitos](#4-remitos) (7 hallazgos)
5. [Notificaciones y Eventos](#5-notificaciones-y-eventos) (6 hallazgos)
6. [Frontend](#6-frontend) (5 hallazgos)
7. [Storage y Datos](#7-storage-y-datos) (3 hallazgos)
8. [CCS — Prerequisitos Pendientes](#8-ccs--prerequisitos-pendientes) (3 hallazgos)
9. [Resumen por Archivo Afectado](#9-resumen-por-archivo-afectado)
10. [Roadmap de Resolución](#10-roadmap-de-resolución)

---

## 1. Autenticación y Seguridad

### SEC-01 · CRÍTICO · No hay invalidación de tokens server-side

**Problema**: Logout solo limpia la cookie del navegador. El token JWT sigue siendo válido hasta que expire (7 días). No existe blacklist. Si un token es robado, no se puede revocar. Tampoco se invalidan tokens al cambiar password, roles o desactivar la cuenta.

**Archivos afectados**:
- `apps/backend/src/controllers/platformAuth.controller.ts` (logout)
- `apps/backend/src/middlewares/platformAuth.middleware.ts` (verifyToken)
- `apps/backend/src/services/platformAuth.service.ts` (verifyToken)

**Curso de acción**:
1. Implementar blacklist en Redis con TTL igual al `expiresIn` del JWT
2. Agregar campo `jti` (JWT ID) único a cada token generado
3. En `verifyToken()`, consultar blacklist antes de aceptar
4. Invalidar todos los tokens del usuario en: logout, cambio de password, cambio de rol, desactivación
5. Crear endpoint `POST /api/platform/auth/revoke-all` para revocar todas las sesiones

**Esfuerzo estimado**: ~1 día

---

### SEC-02 · ALTO · Fallback HS256 sin verificación de expiración

**Problema**: Si la verificación RS256 falla, se intenta HS256 con `JWT_LEGACY_SECRET`. El fallback no verifica expiración, aceptando tokens legacy indefinidamente.

**Archivos afectados**:
- `apps/backend/src/services/platformAuth.service.ts` (líneas ~268-284)
- `apps/backend/src/services/auth.service.ts` (líneas ~378-393)

**Curso de acción**:
1. Agregar `{ algorithms: ['HS256'], maxAge: '7d' }` en las opciones del fallback
2. Loggear cada uso del fallback como `warn` para monitoreo
3. Establecer fecha límite para deprecar HS256 (sugerido: 90 días desde deploy)
4. Remover fallback completamente tras migración

**Esfuerzo estimado**: ~2 horas

---

### SEC-03 · CRÍTICO · Fallback de empresa a ID 1

**Problema**: `determineFinalEmpresaId()` asigna empresa ID `1` cuando no puede determinar la empresa del usuario. Causa potencial leak de datos entre tenants y asignación a tenant incorrecto.

**Archivos afectados**:
- `apps/backend/src/services/platformAuth.service.ts` (líneas ~556-576)
- `apps/backend/src/services/auth.service.ts` (líneas ~506-528)

**Curso de acción**:
1. Reemplazar fallback por `throw new BadRequestError('empresaId es requerido para este rol')`
2. Agregar validación de existencia de empresa antes de asignar
3. Loggear ocurrencias actuales para medir impacto antes de aplicar
4. Agregar test que verifique que sin `empresaId` se lanza error

**Esfuerzo estimado**: ~2 horas

---

### SEC-04 · ALTO · Tenant resolver no valida existencia de empresa

**Problema**: Un SUPERADMIN puede enviar header `x-empresa-id: 99999` y el sistema lo acepta como `req.tenantId` sin verificar que la empresa exista en base de datos.

**Archivos afectados**:
- `apps/backend/src/middlewares/platformAuth.middleware.ts` (tenantResolver, líneas ~203-237)
- `apps/documentos/src/middlewares/auth.middleware.ts` (tenantResolver, líneas ~150-184)

**Curso de acción**:
1. Agregar caché en memoria de empresa IDs válidos (Set, refresh cada 5 min)
2. Validar contra caché en el tenant resolver
3. Retornar `404 Empresa no encontrada` si no existe
4. Aplicar en ambos microservicios (backend y documentos)

**Esfuerzo estimado**: ~2 horas

---

### SEC-05 · ALTO · Race condition en creación de usuarios

**Problema**: Patrón TOCTOU (Time-of-Check-Time-of-Use): `findUnique` verifica que el email no exista, luego `create` lo crea. Dos requests concurrentes pueden pasar el check y crear duplicados.

**Archivos afectados**:
- `apps/backend/src/services/platformAuth.service.ts` (líneas ~229-266)
- `apps/backend/src/services/auth.service.ts` (líneas ~168-242)

**Curso de acción**:
1. Verificar que existe `@@unique([email])` en el schema de Prisma
2. Eliminar el `findUnique` previo y usar `create` directamente
3. Capturar error `P2002` (unique constraint violation) y retornar `409 Conflict`
4. Aplicar mismo patrón en todos los endpoints de registro (wizard included)

**Esfuerzo estimado**: ~2 horas

---

### SEC-06 · MEDIO · Passwords temporales nunca expiran

**Problema**: Usuarios creados via wizard reciben passwords temporales con flag `mustChangePassword: true`, pero no hay middleware que enforce el cambio. El password temporal es válido indefinidamente.

**Archivos afectados**:
- `apps/backend/src/services/platformAuth.service.ts` (wizard registration, líneas ~353-419)
- `apps/backend/src/middlewares/platformAuth.middleware.ts` (falta middleware)

**Curso de acción**:
1. Crear middleware `enforcePasswordChange` que intercepte requests de usuarios con `mustChangePassword: true`
2. Permitir solo endpoints: `POST /change-password`, `GET /profile`, `POST /logout`
3. Retornar `403 { code: 'MUST_CHANGE_PASSWORD' }` para cualquier otro endpoint
4. Agregar campo `tempPasswordExpiresAt` con TTL de 72 horas
5. El cron de limpieza debería desactivar usuarios con password temporal expirado

**Esfuerzo estimado**: ~4 horas

---

### SEC-07 · MEDIO · Rate limiting incompleto

**Problema**: Login (5/15min) y cambio de password (3/30min) están protegidos. Pero registro, reset de password, upload de documentos y otros endpoints sensibles no tienen rate limiting específico.

**Archivos afectados**:
- `apps/backend/src/middlewares/rateLimit.middleware.ts`
- `apps/backend/src/app.ts` (aplicación de middlewares)
- `apps/documentos/src/middlewares/rateLimiter.middleware.ts`

**Curso de acción**:
1. Agregar rate limit a endpoints de registro wizard: 5 requests/15min por IP
2. Agregar rate limit a upload de documentos: 30 requests/5min por usuario
3. Agregar rate limit a creación de remitos: 20 requests/5min por usuario
4. Revisar y documentar todos los límites aplicados

**Esfuerzo estimado**: ~3 horas

---

### SEC-08 · MEDIO · Token almacenado en localStorage (riesgo XSS)

**Problema**: El backend setea cookie httpOnly correctamente, pero el frontend lee el token de `localStorage`. Si existe una vulnerabilidad XSS, el token es accesible via JavaScript.

**Archivos afectados**:
- `apps/frontend/src/features/auth/authSlice.ts` (localStorage usage)
- `apps/frontend/src/store/apiSlice.ts` (Authorization header)
- `apps/frontend/src/lib/api.ts` (axios interceptor)

**Curso de acción**:
1. Migrar a usar exclusivamente la cookie httpOnly para autenticación
2. Eliminar `localStorage.setItem('token', ...)` del auth flow
3. Configurar axios con `withCredentials: true` (la cookie se envía automáticamente)
4. Remover header `Authorization` de los interceptores
5. Adaptar RTK Query para no necesitar token explícito

**Esfuerzo estimado**: ~1 día

---

## 2. Documentos — Ciclo de Vida

### DOC-01 · ALTO · Upload concurrente duplica documentos activos

**Problema**: Dos uploads simultáneos para la misma entidad/template pasan ambos el check de "documento anterior" y crean dos documentos activos. La deprecación del documento anterior ocurre fuera de la transacción.

**Archivos afectados**:
- `apps/documentos/src/controllers/documents.controller.ts` (líneas ~324-471, upload)
- `apps/documentos/src/controllers/documents.controller.ts` (líneas ~133-154, `deprecatePreviousDocument`)

**Curso de acción**:
1. Envolver upload + deprecación en una sola transacción Prisma `$transaction()`
2. Mover `deprecatePreviousDocument()` dentro de la transacción del upload
3. Evaluar agregar constraint compound de unicidad parcial (donde `status NOT IN ('DEPRECADO', 'VENCIDO')`)
4. En el catch, limpiar el archivo subido a MinIO si la transacción falla

**Esfuerzo estimado**: ~4 horas

---

### DOC-02 · MEDIO · No se valida que expiresAt no sea fecha pasada

**Problema**: Un usuario puede subir un documento con fecha de vencimiento ya pasada. Se acepta y queda como PENDIENTE, para vencer inmediatamente en el siguiente cron.

**Archivos afectados**:
- `apps/documentos/src/controllers/documents.controller.ts` (`extractExpirationDate`)
- `apps/documentos/src/utils/expiration.utils.ts`

**Curso de acción**:
1. Agregar warning (no bloqueo) si `expiresAt` < today: el documento puede ser legítimo (póliza retroactiva)
2. Loggear como caso especial en audit log
3. En frontend, mostrar banner amarillo: "La fecha de vencimiento es anterior a hoy"
4. Permitir al admin forzar la aceptación

**Esfuerzo estimado**: ~1 hora

---

### DOC-03 · BAJO · Archivos vacíos o corruptos pueden subirse

**Problema**: Se valida tipo MIME y tamaño máximo (50MB) pero no tamaño mínimo ni integridad del PDF.

**Archivos afectados**:
- `apps/documentos/src/controllers/documents.controller.ts` (upload validation)
- `apps/documentos/src/middlewares/upload.middleware.ts`

**Curso de acción**:
1. Agregar validación de tamaño mínimo: rechazar archivos < 1KB
2. Para PDFs, verificar que tenga al menos 1 página antes de encolar validación IA
3. Retornar error descriptivo: "El archivo está vacío o es inválido"

**Esfuerzo estimado**: ~2 horas

---

### DOC-04 · BAJO · Template puede cambiar entre clasificación y aprobación

**Problema**: El template se busca por nombre durante la aprobación. Si fue eliminado o renombrado, la aprobación puede fallar silenciosamente o asociar al template incorrecto.

**Archivos afectados**:
- `apps/documentos/src/services/approval.service.ts` (líneas ~433-440)

**Curso de acción**:
1. Validar existencia del template por ID (no nombre) dentro de la transacción
2. Retornar error claro si el template no existe: `404 Template no encontrado`
3. Agregar check: si el template fue desactivado, advertir al aprobador

**Esfuerzo estimado**: ~1 hora

---

### DOC-05 · BAJO · Equipo sin clientes devuelve compliance vacía

**Problema**: Un equipo sin clientes asignados devuelve compliance vacía (sin requisitos). Es correcto por diseño, pero puede confundir al usuario.

**Archivos afectados**:
- `apps/documentos/src/services/compliance.service.ts` (líneas ~402-442)
- Frontend: vista de compliance del equipo

**Curso de acción**:
1. Agregar indicador visual en frontend: "Sin clientes asignados — no hay requisitos de compliance"
2. En la API, retornar campo explícito `hasClientes: false` cuando aplique
3. Documentar comportamiento en la wiki interna

**Esfuerzo estimado**: ~1 hora

---

## 3. Equipos — Composición y Transferencias

### EQP-01 · ALTO · `forceMove()` tiene race condition TOCTOU

**Problema**: `resolveComponentConflicts()` hace `findFirst` fuera de la transacción y luego cierra el equipo de origen dentro de una transacción separada. Dos `forceMove` simultáneos pueden cerrar el mismo equipo dos veces o dejar componentes inconsistentes.

**Archivos afectados**:
- `apps/documentos/src/services/equipo.service.ts` (líneas ~98-138, `resolveComponentConflicts`)

**Curso de acción**:
1. Mover el `findFirst` dentro de la transacción
2. Usar `SELECT FOR UPDATE SKIP LOCKED` via raw query o usar un advisory lock de PostgreSQL por equipo ID
3. Envolver check + cierre en una sola transacción atómica
4. Retornar error claro si el lock no se obtiene

**Esfuerzo estimado**: ~4 horas

---

### EQP-02 · ALTO · `updateEquipo()` sin transacción

**Problema**: Los cambios de componentes de un equipo (chofer, camión, acoplado, empresa transportista) se ejecutan como operaciones separadas sin transacción. Si falla a mitad del proceso, el equipo queda en estado inconsistente.

**Archivos afectados**:
- `apps/documentos/src/services/equipo.service.ts` (línea ~1744, `updateEquipo`)

**Curso de acción**:
1. Envolver todo `updateEquipo()` en `prisma.$transaction(async (tx) => { ... })`
2. Incluir creación de `EquipoHistory` y `EquipoAuditLog` dentro de la transacción
3. Incluir la re-evaluación de compliance (o al menos el trigger) dentro de la transacción

**Esfuerzo estimado**: ~3 horas

---

### EQP-03 · MEDIO · `attachComponents()` sin transacción

**Problema**: Múltiples updates independientes que pueden fallar parcialmente, dejando componentes a medio asignar.

**Archivos afectados**:
- `apps/documentos/src/services/equipo.service.ts` (línea ~1073, `attachComponents`)

**Curso de acción**:
1. Envolver en `prisma.$transaction()`
2. Incluir cierre de equipo de origen si aplica

**Esfuerzo estimado**: ~2 horas

---

### EQP-04 · MEDIO · `removeClienteFromEquipo()` sin transacción

**Problema**: La archivación de documentos exclusivos y el cierre de la asociación `EquipoCliente` no son atómicas. Si falla el cierre de asociación, los documentos ya están archivados.

**Archivos afectados**:
- `apps/documentos/src/services/equipo.service.ts` (líneas ~1830-1891)

**Curso de acción**:
1. Envolver en transacción: archivación + cierre de asociación + cierre de plantilla-requisito
2. Rollback automático si cualquier paso falla

**Esfuerzo estimado**: ~2 horas

---

### EQP-05 · MEDIO · `transferirEquipo()` sin locking

**Problema**: Dos transferencias concurrentes del mismo equipo pueden ejecutarse ambas, dejando el equipo en estado ambiguo.

**Archivos afectados**:
- `apps/documentos/src/services/equipo.service.ts` (líneas ~1946-2005)

**Curso de acción**:
1. Envolver en transacción con read-lock
2. Verificar que `dadorCargaId` no cambió entre read y write

**Esfuerzo estimado**: ~2 horas

---

### EQP-06 · MEDIO · No existe optimistic locking en ninguna entidad

**Problema**: Ninguna entidad tiene campo `version`. Todas las operaciones son last-write-wins. En operaciones concurrentes, la última escritura sobreescribe sin detectar conflicto.

**Archivos afectados**:
- `apps/documentos/src/prisma/schema.prisma` (modelos Equipo, Document)
- Todos los servicios que hacen `update`

**Curso de acción**:
1. Agregar campo `version Int @default(0)` a `Equipo` y `Document`
2. En cada `update`, incluir `version` en el `where` clause
3. Incrementar `version` en cada escritura: `version: { increment: 1 }`
4. Si el update retorna 0 rows affected, lanzar error `409 Conflict: el registro fue modificado por otro usuario`
5. Requiere migración de Prisma

**Esfuerzo estimado**: ~1 día (incluye migración y ajuste de servicios)

---

## 4. Remitos

### REM-01 · CRÍTICO · Creación de remito no es atómica

**Problema**: La creación de un remito involucra: upload a MinIO → create en DB → enqueue job. Si MinIO upload tiene éxito pero el create de Prisma falla, queda un objeto huérfano en storage. Si el enqueue falla, el remito queda en `PENDIENTE_ANALISIS` sin job de procesamiento.

**Archivos afectados**:
- `apps/remitos/src/services/remito.service.ts` (líneas ~168-229, `create`)

**Curso de acción**:
1. Envolver en transacción con cleanup:
   ```
   upload MinIO → track uploaded objects
   create DB (en transacción)
   enqueue job
   si falla: cleanup MinIO objects
   ```
2. Agregar cron de recovery: buscar remitos en `PENDIENTE_ANALISIS` sin job activo (> 30 min) y re-encolar
3. Agregar cron de limpieza: buscar objetos MinIO sin registro en DB (huérfanos > 24h) y eliminar

**Esfuerzo estimado**: ~4 horas

---

### REM-02 · ALTO · Análisis de IA sobreescribe ediciones del admin

**Problema**: Si un admin edita manualmente un remito (estado `PENDIENTE_APROBACION`) mientras el worker de IA está procesando un reprocess, los resultados del worker sobreescriben las ediciones sin verificar.

**Archivos afectados**:
- `apps/remitos/src/services/remito.service.ts` (líneas ~293-327, `updateFromAnalysis`)
- `apps/remitos/src/workers/analysis.worker.ts`

**Curso de acción**:
1. En `updateFromAnalysis()`, verificar si hay historial `DATOS_EDITADOS` reciente (< 5 min)
2. Si hay ediciones recientes, no sobreescribir: marcar como `PENDIENTE_APROBACION` con flag `aiResultsPending: true`
3. Mostrar al admin ambos conjuntos de datos para que elija
4. Alternativa más simple: solo sobreescribir campos que el admin no editó (merge inteligente)

**Esfuerzo estimado**: ~3 horas

---

### REM-03 · ALTO · Worker crash deja remitos en EN_ANALISIS permanentemente

**Problema**: Si el worker muere durante el análisis, el remito queda en estado `EN_ANALISIS` indefinidamente sin recovery automático.

**Archivos afectados**:
- `apps/remitos/src/workers/analysis.worker.ts` (líneas ~134-170)
- `apps/remitos/src/services/queue.service.ts`

**Curso de acción**:
1. Agregar timeout explícito en el worker: 5 minutos máximo por job
2. Crear cron job de recovery: cada 30 minutos, buscar remitos en `EN_ANALISIS` con `updatedAt` > 1 hora
3. Resetear a `ERROR_ANALISIS` con mensaje descriptivo: "Análisis no completado (timeout)"
4. Opcionalmente, re-encolar automáticamente (máximo 1 retry)

**Esfuerzo estimado**: ~3 horas

---

### REM-04 · MEDIO · No hay retry para operaciones MinIO en remitos

**Problema**: El servicio de documentos tiene wrapper `withRetry()` para operaciones MinIO; remitos no tiene ningún retry.

**Archivos afectados**:
- `apps/remitos/src/services/minio.service.ts`

**Curso de acción**:
1. Implementar función `withRetry()` idéntica a la de documentos (3 intentos, errores retryable)
2. Aplicar a `uploadRemitoImage()`, `getObject()`, `getSignedUrl()`

**Esfuerzo estimado**: ~1 hora

---

### REM-05 · MEDIO · No hay cleanup de objetos huérfanos en MinIO

**Problema**: Cuando falla la creación de un remito post-upload, el archivo queda huérfano en MinIO sin limpieza.

**Archivos afectados**:
- `apps/remitos/src/services/minio.service.ts`
- No existe job de cleanup

**Curso de acción**:
1. Agregar job semanal que compare objetos MinIO con registros `RemitoImagen` en DB
2. Eliminar objetos sin registro correspondiente que tengan > 24 horas
3. Loggear cada limpieza para auditoría

**Esfuerzo estimado**: ~4 horas

---

### REM-06 · MEDIO · Job retries no verifican estado actual del remito

**Problema**: Un retry del worker puede procesar un remito que ya fue aprobado, rechazado o eliminado, sobreescribiendo datos finales.

**Archivos afectados**:
- `apps/remitos/src/workers/analysis.worker.ts` (inicio de `processJob`)

**Curso de acción**:
1. Al inicio del worker, verificar estado del remito
2. Si `estado IN ('APROBADO', 'RECHAZADO')`, skip silenciosamente (return sin throw)
3. Si remito no existe, skip silenciosamente
4. Loggear como warning para monitoreo

**Esfuerzo estimado**: ~1 hora

---

### REM-07 · BAJO · No se validan entidades referenciadas

**Problema**: `equipoId`, `choferId`, `camionId`, `acopladoId` del remito se almacenan como IDs opcionales sin validar que existan en la base de datos de documentos.

**Archivos afectados**:
- `apps/remitos/src/services/remito.service.ts` (create)

**Curso de acción**:
1. Agregar validación de existencia para IDs no-null via API al servicio de documentos
2. Retornar warning (no error) si la entidad no existe: el remito puede haberse creado antes de la entidad
3. Considerar validación lazy (al aprobar, no al crear)

**Esfuerzo estimado**: ~2 horas

---

## 5. Notificaciones y Eventos

### NOT-01 · ALTO · Event handlers no son idempotentes

**Problema**: `onDocumentApproved()`, `onDocumentExpired()`, etc. crean notificaciones cada vez que se invocan sin verificar si el evento ya fue procesado. Un retry o doble invocación genera notificaciones duplicadas.

**Archivos afectados**:
- `apps/documentos/src/services/document-event-handlers.service.ts`

**Curso de acción**:
1. Agregar tabla `ProcessedEvent` con: `eventType`, `entityId`, `processedAt`, unique constraint en `(eventType, entityId, DATE(processedAt))`
2. Antes de procesar, verificar si el evento ya existe
3. Si existe, skip silenciosamente
4. Alternativa sin tabla: usar Redis SET con TTL de 24h como caché de eventos procesados

**Esfuerzo estimado**: ~3 horas

---

### NOT-02 · ALTO · Cron jobs sin locking distribuido

**Problema**: Si la aplicación escala a múltiples instancias (containers, PM2 cluster), los cron jobs se ejecutan en cada instancia simultáneamente, causando procesamiento duplicado.

**Archivos afectados**:
- `apps/documentos/src/services/scheduler.service.ts` (todos los cron jobs)

**Curso de acción**:
1. Implementar distributed lock con Redis: `SET lock:cron:{taskName} {instanceId} NX EX {ttl}`
2. Al inicio de cada cron job, intentar obtener lock. Si falla, skip
3. Liberar lock al finalizar (o dejar que expire por TTL como safety)
4. Alternativa: designar una instancia como scheduler via env `IS_SCHEDULER=true`

**Esfuerzo estimado**: ~4 horas

---

### NOT-03 · MEDIO · Deduplicación de notificaciones es solo diaria

**Problema**: `shouldDeduplicate()` verifica notificaciones del mismo día calendario. Si el cron corre dos veces cerca de medianoche, puede duplicar.

**Archivos afectados**:
- `apps/documentos/src/services/notification.service.ts` (líneas ~112-124)

**Curso de acción**:
1. Cambiar ventana de deduplicación de "hoy" a "últimas 24 horas" (rolling window)
2. `const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000)`
3. Agregar índice compuesto si no existe: `(documentId, equipoId, type, audience, sentAt)`

**Esfuerzo estimado**: ~1 hora

---

### NOT-04 · MEDIO · Cron jobs sin protección contra overlap

**Problema**: Si un cron job (ej: `checkExpiredDocuments`) tarda más que su intervalo, la siguiente ejecución puede iniciar en paralelo causando procesamiento duplicado.

**Archivos afectados**:
- `apps/documentos/src/services/scheduler.service.ts`

**Curso de acción**:
1. Agregar Map in-memory `isRunning: Map<string, boolean>` en `SchedulerService`
2. Al inicio de cada job: `if (isRunning.get(taskName)) return`; `isRunning.set(taskName, true)`
3. En finally: `isRunning.set(taskName, false)`
4. Agregar timeout máximo por job como safety net

**Esfuerzo estimado**: ~2 horas

---

### NOT-05 · MEDIO · WebSocket: pérdida de mensajes durante desconexión

**Problema**: No hay cola de mensajes durante desconexión del cliente. Las notificaciones en tiempo real se pierden silenciosamente.

**Archivos afectados**:
- `apps/frontend/src/services/websocket.service.ts`
- Backend: WebSocket server

**Curso de acción**:
1. En frontend: implementar cola local de mensajes pendientes
2. Al reconectar: solicitar eventos desde el último timestamp conocido via `GET /api/notifications?since={lastTimestamp}`
3. En backend: persistir eventos críticos en DB (ya existe `InternalNotification`)
4. Al reconectar: sincronizar notificaciones no leídas

**Esfuerzo estimado**: ~4 horas

---

### NOT-06 · MEDIO · Event handler falla parcial deja estado inconsistente

**Problema**: Si la creación de notificaciones tiene éxito pero la re-evaluación de equipo falla (o viceversa), el estado queda parcialmente actualizado.

**Archivos afectados**:
- `apps/documentos/src/services/document-event-handlers.service.ts` (líneas ~165-184)

**Curso de acción**:
1. Separar en dos fases independientes con retry individual
2. Fase 1 (notificaciones): best-effort, no bloquea
3. Fase 2 (evaluación equipo): idempotente, puede reintentarse sin riesgo
4. Si la fase 2 falla, loggear error y encolar retry automático

**Esfuerzo estimado**: ~2 horas

---

## 6. Frontend

### FE-01 · ALTO · Token expira durante upload de archivo

**Problema**: No hay refresh de token antes de uploads largos. Si el token expira durante la transferencia de un archivo grande, la subida se pierde completamente con error 401.

**Archivos afectados**:
- `apps/frontend/src/features/equipos/components/DocumentoField.tsx`
- `apps/frontend/src/store/apiSlice.ts` (baseQuery)
- `apps/frontend/src/lib/api.ts` (axios interceptor)

**Curso de acción**:
1. Antes de iniciar upload, verificar si faltan < 5 minutos para expiración del token
2. Si faltan < 5 minutos, hacer refresh proactivo
3. Implementar retry automático ante 401: refresh token + reintentar request
4. Decodificar `exp` del JWT en frontend para calcular tiempo restante

**Esfuerzo estimado**: ~4 horas

---

### FE-02 · MEDIO · No hay sincronización entre tabs del navegador

**Problema**: Logout en una tab no afecta otras tabs abiertas. Un usuario puede estar "logueado" y operando en una tab después de hacer logout en otra.

**Archivos afectados**:
- `apps/frontend/src/features/auth/authSlice.ts`
- `apps/frontend/src/features/auth/AuthInitializer.tsx`

**Curso de acción**:
1. Agregar listener de evento `storage` en `AuthInitializer`:
   ```
   window.addEventListener('storage', (e) => {
     if (e.key === 'token' && !e.newValue) dispatch(logout())
   })
   ```
2. Sincronizar cambio de usuario (otro login) entre tabs
3. Cleanup del listener en el unmount del componente

**Esfuerzo estimado**: ~2 horas

---

### FE-03 · BAJO · No hay warning de expiración de sesión

**Problema**: El usuario descubre que su sesión expiró solo al hacer una acción (recibe 401). No hay warning proactivo.

**Archivos afectados**:
- `apps/frontend/src/features/auth/AuthInitializer.tsx`
- Nuevo componente: `SessionExpiryWarning`

**Curso de acción**:
1. Decodificar JWT para obtener `exp` (sin verificar firma, solo leer)
2. Calcular `timeToExpiry = exp * 1000 - Date.now()`
3. Si `timeToExpiry < 5 * 60 * 1000`, mostrar banner: "Su sesión expirará en X minutos"
4. Ofrecer botón "Extender sesión" que llame al refresh token

**Esfuerzo estimado**: ~3 horas

---

### FE-04 · BAJO · Sin detección offline / manejo de conectividad

**Problema**: No hay detección de estado offline ni feedback al usuario cuando pierde conexión.

**Archivos afectados**:
- `apps/frontend/src/App.tsx` o nuevo componente global

**Curso de acción**:
1. Agregar listener `navigator.onLine` + evento `offline`/`online`
2. Mostrar banner global: "Sin conexión a internet. Los cambios no se guardarán."
3. Deshabilitar botones de submit/upload mientras está offline
4. No es crítico pero mejora significativamente la UX

**Esfuerzo estimado**: ~2 horas

---

### FE-05 · BAJO · WebSocket reconnect limitado a 5 intentos

**Problema**: Después de 5 intentos fallidos de reconexión, el WebSocket deja de intentar. El usuario pierde notificaciones en tiempo real sin indicación clara.

**Archivos afectados**:
- `apps/frontend/src/services/websocket.service.ts` (reconnect logic)

**Curso de acción**:
1. Implementar exponential backoff sin límite: 2s, 4s, 8s, 16s, 32s, 60s (cap en 60s)
2. Agregar indicador visual persistente cuando desconectado > 30s
3. Agregar botón manual "Reconectar" visible cuando hay fallo persistente

**Esfuerzo estimado**: ~2 horas

---

## 7. Storage y Datos

### DAT-01 · MEDIO · Cascade delete causa pérdida de referencias en audit logs

**Problema**: Eliminar un usuario cascadea a permisos (correcto), pero los audit logs pierden la referencia al usuario eliminado. No hay soft delete para entidades críticas.

**Archivos afectados**:
- `apps/backend/prisma/schema.prisma` (relaciones con `onDelete: Cascade`)
- `apps/documentos/src/prisma/schema.prisma`

**Curso de acción**:
1. Implementar soft delete (campo `deletedAt DateTime?`) para `PlatformUser`, `Empresa`
2. Cambiar `onDelete: Cascade` a `onDelete: SetNull` para audit logs
3. Agregar middleware Prisma que filtre registros con `deletedAt != null` por defecto
4. Los endpoints de delete marcan `deletedAt = now()` en lugar de eliminar

**Esfuerzo estimado**: ~1 día

---

### DAT-02 · BAJO · Documentos aprobados se acumulan sin límite

**Problema**: Solo los documentos DEPRECADOS tienen retention policy (max 2 versiones). Los documentos APROBADOS (versiones actuales) se acumulan indefinidamente.

**Archivos afectados**:
- `apps/documentos/src/services/approval.service.ts` (líneas ~205-269)

**Curso de acción**:
1. No eliminar documentos aprobados (son la fuente de verdad legal)
2. Implementar archivado a storage frío para documentos con más de 2 años sin acceso
3. Agregar compresión de archivos antiguos en MinIO
4. Planificar para cuando el volumen sea significativo (~6 meses)

**Esfuerzo estimado**: ~1 día (futuro)

---

### DAT-03 · BAJO · Bucket names predecibles en MinIO

**Problema**: Los buckets siguen el patrón `documentos-t{tenantId}`, `remitos-empresa-{tenantId}`. Predecible, aunque MinIO requiere autenticación.

**Archivos afectados**:
- `apps/documentos/src/services/minio.service.ts`
- `apps/remitos/src/services/minio.service.ts`

**Curso de acción**:
1. Aceptable mientras MinIO tenga access policies configuradas correctamente
2. Verificar que cada bucket tenga policy que solo permita acceso con las credenciales del servicio
3. Documentar que la seguridad depende de las policies de MinIO, no de la obscuridad de nombres
4. No requiere cambio de código

**Esfuerzo estimado**: 0 (solo verificación y documentación)

---

## 8. CCS — Prerequisitos Pendientes

> Los items 17.1-17.4 y 17.12 del documento CCS fueron resueltos en commit `f6cccb1`. Los siguientes quedan pendientes.

### CCS-01 · ALTO · Triggers de cambio de composición de equipo (17.10)

**Problema**: Cuando se edita un equipo (cambio de chofer/camión/acoplado/empresa), la re-evaluación de compliance usa `queueService.addMissingCheckForEquipo()` dentro de `try/catch` vacíos. Si falla, el cambio no genera snapshot EVENT para CCS.

**Archivos afectados**:
- `apps/documentos/src/services/equipo.service.ts`
  - `collectEntityChanges()` (~línea 686)
  - `detachEntities()` (~línea 1187)
  - `forceMove()` (~línea 1084)
  - `transferEquipo()` (~línea 1979)

**Curso de acción**:
1. Extraer re-evaluación del try/catch vacío a flujo confiable
2. Llamar a `EquipoEvaluationService.evaluarEquipos([equipoId])` directamente
3. Preparar trigger events para CCS: `EQUIPO_DRIVER_CHANGED`, `EQUIPO_TRUCK_CHANGED`, etc.
4. Resolver **antes** de Fase 1 de CCS

**Esfuerzo estimado**: ~3 horas

---

### CCS-02 · MEDIO · Reintentos del job nocturno de CCS (17.5)

**Problema**: Aún no implementado. Cuando se implemente el job de snapshot diario, necesita mecanismo de retry y recovery.

**Curso de acción**:
1. Implementar como parte de CCS Fase 1:
   - 3 reintentos con 30 min entre cada uno
   - Job de verificación a las 08:00 AR: si no hay baseline, generar de emergencia
   - Alerta al administrador si el baseline no existe a las 08:00

**Esfuerzo estimado**: ~4 horas (incluido en Fase 1 de CCS)

---

### CCS-03 · BAJO · Endpoint de compliance continua multi-día (17.9)

**Problema**: Aún no implementado. Necesario para certificar viajes de varios días.

**Curso de acción**:
1. Implementar como parte de CCS Fase 4:
   - `GET /api/docs/compliance/continuous/:equipoId?desde=&hasta=`
   - Consulta secuencial de snapshots en rango de fechas
   - Detecta momento exacto donde se pierde compliance

**Esfuerzo estimado**: ~1 día (incluido en Fase 4 de CCS)

---

## 9. Resumen por Archivo Afectado

| Archivo | Hallazgos | IDs |
|---------|-----------|-----|
| `apps/backend/src/services/platformAuth.service.ts` | 4 | SEC-01, SEC-02, SEC-03, SEC-05 |
| `apps/backend/src/middlewares/platformAuth.middleware.ts` | 3 | SEC-01, SEC-04, SEC-06 |
| `apps/documentos/src/services/equipo.service.ts` | 6 | EQP-01 a EQP-05, CCS-01 |
| `apps/documentos/src/controllers/documents.controller.ts` | 3 | DOC-01, DOC-02, DOC-03 |
| `apps/documentos/src/services/document-event-handlers.service.ts` | 2 | NOT-01, NOT-06 |
| `apps/documentos/src/services/scheduler.service.ts` | 2 | NOT-02, NOT-04 |
| `apps/remitos/src/services/remito.service.ts` | 4 | REM-01 a REM-03, REM-06 |
| `apps/remitos/src/workers/analysis.worker.ts` | 2 | REM-03, REM-06 |
| `apps/remitos/src/services/minio.service.ts` | 2 | REM-04, REM-05 |
| `apps/frontend/src/features/auth/authSlice.ts` | 2 | SEC-08, FE-02 |
| `apps/frontend/src/store/apiSlice.ts` | 2 | SEC-08, FE-01 |

---

## 10. Roadmap de Resolución

### Fase 0 — Críticos (antes de producción) · ~3 días

```
SEC-01  Token blacklist en Redis                       ~1 día
SEC-03  Eliminar fallback empresa ID 1                 ~2 horas
REM-01  Creación atómica de remitos                    ~4 horas
DOC-01  Upload concurrente de documentos               ~4 horas
CCS-01  Triggers cambio composición equipo             ~3 horas
                                              Total: ~3 días
```

### Fase 1 — Altos (Sprint 1) · ~5 días

```
SEC-02  Deprecar fallback HS256                        ~2 horas
SEC-04  Validar empresa en tenant resolver             ~2 horas
SEC-05  Fix race condition creación usuarios           ~2 horas
EQP-01  Fix forceMove TOCTOU                           ~4 horas
EQP-02  Transacción en updateEquipo                    ~3 horas
REM-02  IA no sobreescribe ediciones admin             ~3 horas
REM-03  Recovery remitos stuck EN_ANALISIS             ~3 horas
NOT-01  Event handlers idempotentes                    ~3 horas
NOT-02  Distributed lock para cron jobs                ~4 horas
FE-01   Token refresh antes de upload                  ~4 horas
                                              Total: ~5 días
```

### Fase 2 — Medios prioritarios (Sprint 2) · ~6 días

```
SEC-06  Enforce mustChangePassword                     ~4 horas
SEC-07  Rate limiting completo                         ~3 horas
SEC-08  Migrar localStorage a cookie httpOnly          ~1 día
EQP-03  Transacción attachComponents                   ~2 horas
EQP-04  Transacción removeCliente                      ~2 horas
EQP-05  Lock transferirEquipo                          ~2 horas
EQP-06  Optimistic locking                             ~1 día
REM-04  Retry MinIO en remitos                         ~1 hora
REM-05  Cleanup objetos huérfanos                      ~4 horas
REM-06  Verificar estado en job retries                ~1 hora
NOT-03  Deduplicación 24h rolling                      ~1 hora
NOT-04  Lock overlap cron                              ~2 horas
NOT-05  WebSocket message queue                        ~4 horas
NOT-06  Event handler retry separado                   ~2 horas
                                              Total: ~6 días
```

### Fase 3 — Mejora continua (Sprint 3+) · ~5 días

```
DOC-02  Warn expiresAt pasado                          ~1 hora
DOC-03  Validar archivos vacíos/corruptos              ~2 horas
DOC-04  Validar template en aprobación                 ~1 hora
DOC-05  Indicador "sin clientes" en frontend           ~1 hora
REM-07  Validar entidades referenciadas                ~2 horas
FE-02   Sync entre tabs                                ~2 horas
FE-03   Warning expiración sesión                      ~3 horas
FE-04   Detección offline                              ~2 horas
FE-05   Reconnect WebSocket exponential backoff        ~2 horas
DAT-01  Soft delete entidades críticas                 ~1 día
DAT-02  Archivado frío documentos antiguos             ~1 día
DAT-03  Verificar MinIO policies (solo documentar)     ~1 hora
CCS-02  Reintentos job nocturno (en CCS Fase 1)       ~incluido
CCS-03  Compliance continua (en CCS Fase 4)           ~incluido
                                              Total: ~5 días
```

---

### Esfuerzo total estimado

| Fase | Días | Descripción |
|------|------|-------------|
| Fase 0 | 3 | Críticos — antes de producción |
| Fase 1 | 5 | Altos — Sprint 1 |
| Fase 2 | 6 | Medios — Sprint 2 |
| Fase 3 | 5 | Bajos — Sprint 3+ |
| **Total** | **~19 días** | **~4 sprints de 5 días** |

---

> **Nota**: Los esfuerzos son estimaciones para un desarrollador. Varios items pueden paralelizarse. Los items de CCS (CCS-02, CCS-03) se resuelven dentro de las fases correspondientes del CCS y no requieren esfuerzo adicional.

> **Última actualización**: 2026-02-11
