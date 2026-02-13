# Informe de Optimización de Base de Datos

> Auditoría de los schemas PostgreSQL de los tres microservicios  
> Fecha: 2026-02-12  
> Alcance: backend (público), documentos, remitos

---

## Resumen Ejecutivo

La base de datos está **razonablemente bien diseñada** para la escala actual (500-1000 equipos). La estructura de modelos es clara, las relaciones están bien definidas, y la mayoría de las consultas frecuentes tienen índices que las soportan. Sin embargo, hay **6 hallazgos que requieren atención** y **8 mejoras recomendadas** que se vuelven necesarias a medida que crezca el volumen de datos.

| Categoría | Bien | A mejorar |
|-----------|------|-----------|
| Índices | 38 definidos | 7 faltantes para consultas reales |
| Normalización | Estructura limpia | 1 modelo duplicado conceptualmente |
| Tipos de datos | Correctos | 1 vista materializada sin filtro de archivados |
| Integridad referencial | Buena dentro de cada schema | Esperada ausencia entre schemas (microservicios) |
| Búsquedas textuales | Funcionales | Sin soporte de índice (usan ILIKE sin pg_trgm) |

---

## 1. Índices Faltantes — Impacto Directo en Performance

### 1.1 Remito: falta índice en `createdAt` — ALTO

**Situación**: El listado paginado de remitos (`findMany + orderBy: createdAt DESC + skip/take`) es la consulta más frecuente del módulo. No tiene índice en `createdAt`. PostgreSQL hace un full table scan + sort para cada paginación.

**Impacto**: Imperceptible con cientos de remitos. Con miles, cada listado se degrada linealmente.

**Índice recomendado**: Compuesto `(tenantEmpresaId, createdAt DESC)` — cubre el filtro de tenant y el ordenamiento en una sola pasada.

**Costo de adaptación**: Cero. Es agregar una línea al schema de Prisma y correr migración. No requiere cambio de código.

---

### 1.2 Remito: falta índice compuesto para listado filtrado — MEDIO

**Situación**: El listado filtra por `tenantEmpresaId` + `dadorCargaId` + `estado` simultáneamente, pero solo hay índices individuales para cada campo. PostgreSQL debe hacer bitmap index scan combinando tres índices, lo cual es menos eficiente que un compuesto.

**Índice recomendado**: Compuesto `(tenantEmpresaId, dadorCargaId, estado)`.

**Costo de adaptación**: Cero. Solo schema + migración.

---

### 1.3 Document: falta índice en `uploadedAt` — MEDIO

**Situación**: Prácticamente todas las consultas de documentos usan `orderBy: uploadedAt DESC` (listados, búsqueda del último documento por entidad, compliance). El campo no está indexado.

**Impacto**: La tabla `documents` es la más grande del sistema. Sin índice en el campo de ordenamiento, cada listado paginado requiere un sort en disco cuando la tabla supere los ~10.000 registros.

**Índice recomendado**: Agregar `uploadedAt` como último campo del índice compuesto principal, resultando en `(tenantEmpresaId, dadorCargaId, entityType, entityId, uploadedAt DESC)`. Alternativamente, índice separado `(uploadedAt DESC)` si el compuesto queda demasiado ancho.

**Costo de adaptación**: Cero. Solo schema + migración.

---

### 1.4 Document: falta índice en `dadorCargaId` individual — BAJO

**Situación**: El índice compuesto principal es `(tenantEmpresaId, dadorCargaId, entityType, entityId)`. Esto sirve bien para filtrar por tenant+dador+entidad. Pero hay consultas que filtran solo por `dadorCargaId` (sin tenant), como la evaluación de compliance batch. PostgreSQL no puede usar eficientemente un índice compuesto si el primer campo (`tenantEmpresaId`) no está en el WHERE.

**Índice recomendado**: `(dadorCargaId, templateId, entityType, entityId)` — cubre el patrón de la consulta de compliance que recibe `templateId IN (...)` con `OR` de `entityType/entityId`.

**Costo de adaptación**: Cero. Solo schema + migración.

---

### 1.5 Backend AuditLog: falta índice en `timestamp` — BAJO

**Situación**: Solo tiene índice en `instanciaId`. Las consultas de auditoría filtran por rango de fechas (`timestamp`), pero no hay índice.

**Índice recomendado**: `(instanciaId, timestamp DESC)`.

**Costo de adaptación**: Cero. Solo schema + migración.

---

### 1.6 Backend Payment: sin índices — BAJO

**Situación**: La tabla `payments` no tiene ningún índice (más allá del PK). Los campos `clientId`, `status` y `gatewayClientId` no están indexados.

**Impacto**: Bajo si la tabla tiene pocas filas. Puede ser problema si se integra pasarela de pagos activamente.

**Índice recomendado**: `(clientId, status)`.

**Costo de adaptación**: Cero. Solo schema + migración.

---

### 1.7 Backend Schedule: sin índice funcional — BAJO

**Situación**: No tiene índice en `empresaId` ni en el rango de fechas. Las consultas de agenda filtran por empresa y rango temporal.

**Índice recomendado**: `(empresaId, fechaInicio, fechaFin)`.

**Costo de adaptación**: Cero. Solo schema + migración.

---

## 2. Búsquedas Textuales sin Soporte de Índice

### 2.1 Búsquedas con ILIKE en maestros y auditoría — MEDIO

**Situación**: Los listados de choferes, camiones, acoplados, empresas transportistas y auditoría usan `contains` con `mode: 'insensitive'` (equivale a `ILIKE '%term%'` en PostgreSQL). Los índices B-tree estándar **no sirven** para patrones con `%` al inicio. PostgreSQL hace sequential scan completo.

**Tablas afectadas**:
- `choferes` (búsqueda por nombre, apellido, DNI)
- `camiones` (búsqueda por patente, marca)
- `acoplados` (búsqueda por patente, tipo)
- `empresas_transportistas` (búsqueda por razón social, CUIT)
- `clientes` (búsqueda por razón social, CUIT)
- `audit_logs` (búsqueda por email, path)

**Impacto**: Con cientos de registros, imperceptible. Con miles de choferes o camiones, las búsquedas se vuelven lentas. Con decenas de miles de audit logs, las búsquedas de auditoría pueden tardar segundos.

**Solución recomendada**: Habilitar la extensión `pg_trgm` de PostgreSQL y crear índices GIN con operador `gin_trgm_ops` en los campos de búsqueda textual. Esto permite que `ILIKE '%term%'` use índice.

**Costo de adaptación**: Bajo. Requiere una migración SQL manual (no se puede expresar en Prisma puro). No requiere cambio de código en la aplicación. Ejemplo de migración:

> `CREATE EXTENSION IF NOT EXISTS pg_trgm;`  
> `CREATE INDEX idx_choferes_nombre_trgm ON choferes USING gin (nombre gin_trgm_ops);`

**Esfuerzo**: ~2 horas (crear migración SQL, testear, aplicar).

---

## 3. Vista Materializada

### 3.1 Análisis de `mv_document_summary`

**Situación**: Existe una vista materializada que pre-calcula conteos de documentos por estado (rojo/amarillo/verde) agrupados por `(tenant_id, empresa_id, entity_type, entity_id)`. Se refresca cada 5 minutos via cron y tiene un índice único para `REFRESH CONCURRENTLY`.

**Evaluación**: Bien implementada. Reduce la carga de consultas de dashboard que de otra forma necesitarían `GROUP BY` + `COUNT` sobre toda la tabla `documents`.

**Observación**: La vista no filtra por `archived = false`. Esto significa que los documentos archivados se cuentan en el total, lo cual podría dar números incorrectos en los dashboards si hay documentos archivados significativos.

**Costo de corrección**: Bajo. Agregar `WHERE archived = false` a la definición de la vista. Requiere `DROP + CREATE` de la vista (ya hay código que maneja esta recreación).

---

## 4. Índices Redundantes

### 4.1 Equipo: índice `(tenantEmpresaId, dadorCargaId)` es redundante — INFORMATIVO

**Situación**: Existe un índice explícito `(tenantEmpresaId, dadorCargaId)`. Pero también existen tres índices compuestos que empiezan con esos mismos campos:
- `(tenantEmpresaId, dadorCargaId, driverDniNorm)`
- `(tenantEmpresaId, dadorCargaId, truckPlateNorm)`
- `(tenantEmpresaId, dadorCargaId, trailerPlateNorm)`

En PostgreSQL, un índice compuesto sirve para consultas que usen sus columnas como prefijo. Es decir, el índice `(tenant, dador, driverDni)` puede satisfacer consultas que filtren solo por `(tenant, dador)`.

**Sin embargo**: El índice dedicado de 2 columnas es más compacto y eficiente para consultas que solo filtren por tenant+dador (el caso más frecuente en listados). Con una tabla de 500-1000 equipos, la diferencia es negligible.

**Recomendación**: Mantener por ahora. Evaluar remover cuando la tabla supere los 50.000 registros y se necesite optimizar espacio en memoria de índices.

---

## 5. Modelo de Datos — Observaciones Estructurales

### 5.1 Dos sistemas de requisitos coexistentes — RESUELTO

**Situación**: Existían dos modelos que representaban el mismo concepto (requisitos de documentos por cliente):

- **`ClienteDocumentRequirement`**: Modelo plano. Un cliente define directamente qué templates requiere.
- **`PlantillaRequisito` + `PlantillaRequisitoTemplate`**: Modelo agrupado. Un cliente tiene "plantillas" (conjuntos con nombre) que contienen templates.

**Hallazgo original**: La evaluación de compliance (`compliance.service.ts`) usaba **exclusivamente** `ClienteDocumentRequirement`, mientras que el frontend y la gestión de plantillas usaban `PlantillaRequisito`. Esto provocaba un bug funcional activo donde los cambios hechos desde la UI no se reflejaban en la evaluación de compliance.

**Resolución aplicada (2026-02-13)**: Se migraron las 5 funciones críticas de negocio para leer desde `PlantillaRequisitoTemplate`:

| Archivo | Función | Cambio |
|---------|---------|--------|
| `compliance.service.ts` | `loadRequirements()` | Migrada a `plantillaRequisitoTemplate.findMany()` filtrando por plantillas activas |
| `compliance.service.ts` | `evaluateEquipoClienteDetailed()` | Migrada a `plantillaRequisitoTemplate.findMany()` |
| `document-precheck.service.ts` | `obtenerTemplatesRequeridos()` | Migrada a `plantillaRequisitoTemplate.findMany()` con deduplicación |
| `document-archive.service.ts` | `findDocumentsExclusiveToClient()` | Migrada a `plantillaRequisitoTemplate.findMany()` |
| `equipo.service.ts` | `getRequisitosEquipo()` | Migrada a `plantillaRequisitoTemplate.findMany()` con consolidación |

**Estado actual (2026-02-13)**: `PlantillaRequisitoTemplate` es ahora la fuente de verdad única para **toda la plataforma**:
- Evaluación de compliance (`compliance.service.ts`)
- Pre-check documental (`document-precheck.service.ts`)
- Archivado de documentos exclusivos (`document-archive.service.ts`)
- Requisitos de equipo (`equipo.service.ts`)
- CRUD de requisitos por cliente (`clients.service.ts`)
- Templates consolidados para alta de equipo (`clients.service.ts`)
- Check de documentos faltantes al agregar cliente (`clients.service.ts`)

La tabla `ClienteDocumentRequirement` solo se referencia en: cleanup al eliminar cliente (limpieza de datos legados) y seed de datos de prueba. Puede eliminarse del schema cuando se confirme que no queda data legacy en producción.

---

### 5.2 `EntityExtractedData` es una tabla "God Object" — INFORMATIVO

**Situación**: Este modelo tiene campos específicos de chofer (CUIL, licencia, fecha nacimiento), campos de camión/acoplado (motor, chasis, titular), y campos de empresa (IVA, domicilio, ART) — todos en la misma fila.

**Evaluación**: Es un patrón de "sparse table" (tabla dispersa). La mayoría de las filas tienen ~60% de columnas en NULL. En PostgreSQL, los NULLs ocupan espacio mínimo (1 bit en el null bitmap), por lo que el impacto en almacenamiento es bajo.

**Alternativa**: Separar en `ChoferExtractedData`, `CamionExtractedData`, `EmpresaExtractedData`. Más normalizado, pero requiere cambiar toda la lógica de extracción y consolidación.

**Recomendación**: No cambiar. El costo de refactoreo no justifica el beneficio a esta escala. El campo `datosExtraidos` (JSON) ya actúa como almacenamiento flexible; los campos tipados son para consultas rápidas.

---

### 5.3 Campos booleanos redundantes en `InternalNotification` — INFORMATIVO

**Situación**: Tiene `deleted: Boolean` y `deletedAt: DateTime?`. El campo `deleted` es derivable de `deletedAt IS NOT NULL`.

**Impacto**: Mínimo. El campo booleano permite filtrar más rápido en índices (el índice `(userId, read, deleted)` es eficiente). Si se elimina `deleted`, el índice necesitaría una expresión `(userId, read, CASE WHEN deletedAt IS NULL THEN false ELSE true END)` que Prisma no soporta.

**Recomendación**: Mantener como está. La redundancia es intencional para performance de índices.

---

### 5.4 Denormalización deliberada en `SolicitudTransferencia` — CORRECTO

**Situación**: Almacena `solicitanteDadorNombre`, `dadorActualNombre`, `solicitanteUserEmail` como campos de texto, además de los IDs de referencia.

**Evaluación**: Esto es correcto y deliberado. Las solicitudes de transferencia son documentos legales. Si el nombre de la empresa cambia después de la solicitud, el registro debe preservar el nombre al momento de la creación. Es un patrón de "snapshot de datos" apropiado para auditoría.

---

### 5.5 Denormalización en `Equipo` con campos `Norm` — CORRECTO

**Situación**: El equipo almacena `driverDniNorm`, `truckPlateNorm`, `trailerPlateNorm` además de referenciar `driverId`, `truckId`, `trailerId`. Los campos normalizados duplican información que existe en `Chofer.dniNorm`, `Camion.patenteNorm`, `Acoplado.patenteNorm`.

**Evaluación**: Correcto. Los campos normalizados permiten unique constraints y búsquedas rápidas sin JOIN. Son fundamentales para la prevención de componentes duplicados en equipos activos. El costo de mantener la sincronización es mínimo (solo se escriben al crear/editar equipo).

---

## 6. Integridad Referencial Entre Schemas

### 6.1 Referencias cruzadas sin FK — ESPERADO

**Situación**: Los tres microservicios tienen bases de datos lógicamente separadas (o schemas separados):

- `platform_users.dador_carga_id` → referencia `dadores_carga.id` (en documentos)
- `platform_users.empresa_transportista_id` → referencia `empresas_transportistas.id` (en documentos)
- `platform_users.chofer_id` → referencia `choferes.id` (en documentos)
- `platform_users.cliente_id` → referencia `clientes.id` (en documentos)
- `remitos.equipo_id` → referencia `equipo.id` (en documentos)
- `remitos.chofer_id` → referencia `choferes.id` (en documentos)

Ninguna tiene constraint FK real.

**Evaluación**: Esto es inherente a la arquitectura de microservicios con bases de datos separadas. No se puede (ni se debe) crear FKs entre databases diferentes.

**Mitigación existente**: Los IDs son opcionales (nullable). La aplicación valida existencia antes de operar.

**Recomendación**: Si los tres microservicios comparten la misma instancia PostgreSQL, considerar unificar en un solo database con schemas separados (`public`, `documentos`, `remitos`). Esto permitiría FKs cross-schema. Pero es un cambio arquitectónico significativo que no se justifica actualmente.

---

## 7. Unique Constraints — Análisis

### 7.1 Equipo: unique constraint con nullable — INFORMATIVO

**Situación**: `@@unique([tenantEmpresaId, dadorCargaId, driverDniNorm, truckPlateNorm, trailerPlateNorm, validFrom])`. El campo `trailerPlateNorm` es nullable.

En PostgreSQL, `NULL ≠ NULL` para unique constraints. Esto significa que dos equipos sin acoplado (ambos con `trailerPlateNorm = null`) con el mismo chofer, camión y fecha **no violarían** el unique constraint.

**Impacto**: Bajo en la práctica porque la lógica de negocio verifica duplicados antes de crear. Pero el constraint no protege completamente a nivel de base de datos.

**Mitigación**: La aplicación ya maneja esto con verificaciones de componentes en uso. No requiere cambio inmediato.

---

## 8. Estimación de Escala Futura

### Proyecciones a 12 meses (basado en 1000 equipos)

| Tabla | Registros estimados | Tamaño estimado | Índice más crítico |
|-------|--------------------:|----------------:|--------------------|
| `documents` | 50.000 - 100.000 | 200-500 MB | `(tenant, dador, entityType, entityId)` |
| `equipo` | 2.000 - 5.000 | 5-15 MB | `(tenant, dador)` |
| `remitos` | 10.000 - 30.000 | 50-150 MB | `(tenant, createdAt)` — **FALTANTE** |
| `internal_notifications` | 200.000 - 500.000 | 300-800 MB | `(userId, read, deleted)` |
| `audit_logs` (docs) | 500.000+ | 500 MB+ | `(tenant, createdAt)` |
| `notification_log` | 100.000 - 300.000 | 100-300 MB | `(documentId, type, audience)` |
| `equipo_history` | 20.000 - 50.000 | 20-50 MB | `(equipoId, createdAt)` |
| `document_classifications` | 50.000 - 100.000 | 100-200 MB | `(documentId)` — unique |

**Conclusión**: Las tablas que más crecerán son `documents`, `internal_notifications` y `audit_logs`. Las tres tienen buenos índices para sus consultas primarias. El punto débil es `remitos` sin índice de ordenamiento temporal.

---

## Resumen de Acciones — Priorizado

### Impacto alto, costo cero (solo schema + migración)

| # | Acción | Tabla | Índice | Esfuerzo |
|---|--------|-------|--------|----------|
| 1 | Agregar índice temporal en remitos | `remitos` | `(tenantEmpresaId, createdAt DESC)` | 15 min |
| 2 | Agregar índice compuesto en remitos | `remitos` | `(tenantEmpresaId, dadorCargaId, estado)` | 15 min |
| 3 | Agregar índice de ordenamiento en documentos | `documents` | `(uploadedAt DESC)` o integrado al compuesto | 15 min |

### Impacto medio, costo bajo (migración SQL manual)

| # | Acción | Tabla | Detalle | Esfuerzo |
|---|--------|-------|---------|----------|
| 4 | Habilitar pg_trgm + índices GIN | Maestros (6 tablas) | Para búsquedas textuales ILIKE | 2 horas |
| 5 | Filtrar archivados en vista materializada | `mv_document_summary` | Agregar `WHERE archived = false` | 30 min |

### Impacto bajo, costo cero — RESUELTO

| # | Acción | Tabla | Índice | Estado |
|---|--------|-------|--------|--------|
| 6 | Índice dadorCargaId en documentos | `documents` | `(dadorCargaId, templateId, entityType, entityId)` | **RESUELTO** (2026-02-13) |
| 7 | Índice timestamp en audit_logs (backend) | `audit_logs` | `(instanciaId, timestamp DESC)` | **RESUELTO** (2026-02-13) |
| 8 | Índices en payments | `payments` | `(clientId, status)` | **RESUELTO** (2026-02-13) |
| 9 | Índice en schedules | `schedules` | `(empresaId, fechaInicio)` | **RESUELTO** (2026-02-13) |

### Decisión de diseño — RESUELTO

| # | Acción | Detalle | Estado |
|---|--------|---------|--------|
| 10 | Unificar modelos de requisitos | Backend migrado a leer desde `PlantillaRequisitoTemplate`. Tabla legada `ClienteDocumentRequirement` pendiente de deprecación. | **RESUELTO** (2026-02-13) |

---

## Conclusión

## Estado Final — Todos los Items Resueltos

Todos los hallazgos del informe han sido resueltos:

| Categoría | Items | Estado |
|-----------|-------|--------|
| Índices alto impacto (1-3) | Remitos temporal, compuesto; Documents uploadedAt | **RESUELTO** |
| Búsquedas textuales (4) | pg_trgm + GIN en 10 tablas | **RESUELTO** |
| Vista materializada (5) | Filtro `archived = false` + auto-recreación | **RESUELTO** |
| Índices bajo impacto (6-9) | dadorCargaId, audit_logs, payments, schedules | **RESUELTO** |
| Modelo duplicado (10) | Migración completa a PlantillaRequisitoTemplate | **RESUELTO** |

Todo lo demás (denormalizaciones, redundancias) está justificado por el contexto del dominio y la arquitectura de microservicios.

> Última actualización: 2026-02-13 — Todos los items resueltos
