# Plan de Implementación – “Armado de Equipos” con carga atómica de documentos

Este documento define el plan para implementar el formulario y el flujo de armado de “Equipos” tal como la UI de referencia (estilo Google Forms), reutilizando al máximo la infraestructura existente (React 18 + Vite + RTK Query, Node 20 + Express, MinIO, roles y middlewares).

## 1) Objetivo
Permitir que un Dador de Carga arme un “Equipo” compuesto por documentos de 4 entidades (Empresa transportista, Chofer, Tractor, Acoplado). La carga de documentos es atómica: solo si están TODOS los documentos presentes, válidos y vigentes, el equipo queda HABILITADO para viajar con un Cliente determinado.

## 2) Roles y permisos (reuso de auth actual)
- ADMIN: puede todo sin restricciones.
- DADOR: puede todo sobre sus equipos (equipo.dadorId = user.dadorId), excepto asignar clientes adicionales o cambiar el cliente principal.
- TRANSPORTISTA: puede todo sobre sus equipos (equipo.empresaId = user.empresaId), excepto definir o modificar cliente(s).

Guardas a implementar (extensión de los existentes):
- `isAdmin()`
- `ownsByDador(equipoId)` → compara `equipo.dadorId` con `req.user.dadorId`.
- `ownsByEmpresa(equipoId)` → compara `equipo.empresaId` con `req.user.empresaId`.
- `forbidAssignClientsIfNotAdmin` para rutas de asignación de cliente(s).

## 3) Modelo de datos (mínimos cambios, compatible)
Se prioriza reutilizar las tablas de Documentos/Archivos existentes. Si no existen, se crean equivalentes en el mismo esquema.

Nuevas entidades:
- `Equipo`
  - id (PK), dadorId (FK), clienteId (FK), empresaId (FK), choferId (FK), tractorId (FK), acopladoId (FK)
  - estado: `DRAFT|PENDIENTE|HABILITADO|RECHAZADO|EXPIRADO`
  - habilitadoDesde, habilitadoHasta?, createdBy, createdAt, updatedAt
  - índices: (dadorId, clienteId, empresaId, choferId, tractorId, acopladoId, estado), (estado), (habilitadoHasta)

- `EquipoVersion`
  - id, equipoId (FK), version (int), estado, motivo?, createdAt
  - histórico para revalidaciones sin perder trazabilidad.

- `SesionDeCarga`
  - id, dadorId, clienteId?, empresaId, choferId, tractorId, acopladoId
  - estado: `CREADA|SUBIENDO|LISTA|FALLIDA`, expiresAt, idempotencyKey, createdBy

- `SesionDeCargaItem`
  - id, sesionId (FK), ownerType (`EMPRESA|CHOFER|TRACTOR|ACOPLADO`), ownerId
  - requisitoId (FK), documentoId?, expectedFiles (int), uploadedFiles (int)

- `DocumentoRequisito`
  - id, scope (`EMPRESA|CHOFER|TRACTOR|ACOPLADO`), tipo (enum), cantidadMinima (int)
  - requiereVencimiento (bool), mimePermitidos (csv), sizeMaxMb (int), label (string)

Reutilizados (o crear si faltan):
- `Documento` (ownerType, ownerId, tipo, fechaVencimiento?, estado: `PENDIENTE|VALIDO|VENCIDO|RECHAZADO`, createdAt)
- `DocumentoArchivo` (documentoId, fileKey, filename, mime, size, checksum?, uploadedAt)

Constraints/invariantes:
- Atomicidad: un Equipo solo pasa a HABILITADO si para cada `DocumentoRequisito` requerido existen documentos completos (≥ `cantidadMinima`) y vigentes.
- Unicidad: un equipo activo por combinación (dador, cliente, empresa, chofer, tractor, acoplado, estado∈[PENDIENTE,HABILITADO]).
- Índices de vencimiento para alertas/expiración.

## 4) Requisitos por entidad (desde la UI de referencia)
- Empresa transportista (5 documentos)
  - ARBA; Ingresos Brutos; Form. 931 + acuse + constancia de pago; Recibos de Sueldo; Boleta sindical.
- Chofer (6 documentos, 3 vencimientos)
  - Alta temprana AFIP + ARBA; DNI frente/dorso (minFiles=2) + vencimiento; Licencia frente/dorso (minFiles=2) + vencimiento; Póliza ART; Seguro de Vida + vencimiento.
- Tractor (6 documentos, 1 vencimiento + datos)
  - Patente (dato); Título/Contrato; Cédula; RTO + vencimiento; Póliza seguro + cláusula de no repetición; Libre de deuda + comprobante de pago vigente.
- Acoplado (6 documentos, 1 vencimiento + datos)
  - Patente (dato); Título/Contrato; Cédula; RTO + vencimiento; Póliza seguro + cláusula; Libre de deuda + comprobante.

Todos los grupos marcados en la imagen son obligatorios.

## 5) API (reutilización y diseño)
1) Crear sesión de carga – `POST /api/equipos/sessions`
```json
{
  "dadorId": 10,
  "clienteId": 7,     // requerido para DADOR; ignorado por TRANSPORTISTA
  "empresaId": 3,
  "choferId": 21,
  "tractorId": 5,
  "acopladoId": 8
}
```
Respuesta: sesión con checklist de requisitos y presigned URLs por `UploadGroup` (o un endpoint secundario `POST /api/documentos/presign` si ya existe en el microservicio).

2) Completar sesión – `PUT /api/equipos/sessions/:id/complete`
- Valida cantidad, MIME/size, existencia en MinIO y vencimientos.
- Transacción: crea/actualiza `Documento`+`DocumentoArchivo`, crea `Equipo`+`EquipoVersion` y cambia estado a `HABILITADO`. Si algo falla → `FALLIDA` y rollback.

3) Consultas y revalidación
- `GET /api/equipos/:id` (detalle del equipo + documentos/vigencias).
- `POST /api/equipos/:id/revalidate` (cuando se renueva algún documento vencido).

4) Clientes extra (solo ADMIN)
- `POST /api/equipos/:id/clientes-extra` / `DELETE /api/equipos/:id/clientes-extra/:extraId`
- `PATCH /api/equipos/:id/cliente` (cambiar cliente principal; prohibido salvo ADMIN).

Autorización por rol (guards):
- ADMIN: full access.
- DADOR: owner por dadorId; no puede asignar/editar cliente(s) luego de creado.
- TRANSPORTISTA: owner por empresaId; no puede asignar/editar cliente(s).

## 6) UI – réplica visual (Google Forms-like)
Páginas: una vista larga única para replicar la imagen (ancho ≈ 640–704 px, centrado).

Componentes reusables (Tailwind + nuestros `Input`/`Button`):
- `NumberedField` → muestra número “1., 2., …” + label + children.
- `SectionTitle` → headings “CHOFERES”, “UNIDADES – TRACTOR Y SEMI”.
- `UnderlineTextArea` → simula líneas para “Empresa de Transporte”.
- `DateFieldWithHint` → date + hint “Ejemplo: January 7, 2019”.
- `UploadGroup` → minFiles, accept, “Files submitted” con chips y estado (Completado/Faltan n).
- `Separator` → hr gris 1px entre ítems.

Estados del formulario:
- Validación por grupo; “Enviar” habilitado cuando 100% completo y válido.
- Autoguardado por `sessionId` (localStorage) para no perder progreso.
- Campo Cliente:
  - ADMIN: editable.
  - DADOR: editable solo al crear (readonly luego).
  - TRANSPORTISTA: siempre readonly.

## 7) Validaciones (Zod)
- CUIT, patente, formatos básicos.
- Fechas de vencimiento obligatorias en los tipos que aplican; deben ser > hoy.
- MIME/size contra `.env` (ej. `UPLOAD_MAX_SIZE`, `UPLOAD_ALLOWED_TYPES`).
- Cantidad mínima por requisito (p.ej. frente/dorso = 2).

## 8) Procesos y jobs
- Expiración: job diario marca `EXPIRADO` si un documento requerido vence; notifica al Dador.
- Limpieza: elimina sesiones expiradas y objetos “huérfanos” (prefijo `temp/`), o mueve a `quarantine/` si se requiere auditoría.

## 9) Seguridad y auditoría
- JWT RS256; CORS y rate-limit ya configurables.
- Ownership a nivel equipo/documento por rol.
- Audit log: crear sesión, completar, revalidar, cambios de cliente (actor, ip, UA).
- Nunca loggear PII ni contenido de documentos.

## 10) Migraciones (Prisma) – Plan mínimo
1. Crear `Equipo`, `EquipoVersion`, `SesionDeCarga`, `SesionDeCargaItem`, `DocumentoRequisito` en el esquema apropiado (platform/documentos).
2. Índices y FKs; unique parcial por combinación/estado.
3. Scripts de semilla para `DocumentoRequisito` con todos los requisitos de la imagen (por scope) y `cantidadMinima`.
4. No romper tablas existentes; backward compatible.

## 11) Pruebas (reuso de Jest/Playwright)
- Unit: validadores (presencia, MIME/size, vencimientos), guards de permisos.
- Integración: sesión→subidas→complete (OK / faltante / vencido / MIME inválido / ownership).
- E2E: UI completa con archivos dummy; assert `HABILITADO` y checklist en pantalla.

## 12) Operación y observabilidad
- `/health`, métricas (equipos por estado, tiempo de ciclo, fallos por grupo).
- Winston con masking; trazabilidad por `equipoId`, `sesionId`, `documentoId`.
- Feature flags: `PRESIGNED_TTL`, `ALERT_DAYS` (30,15,7,1).

## 13) Roadmap por iteraciones (PRs atómicos)
1) Datos + requisitos
   - Migraciones (tablas nuevas + índices) y seed de `DocumentoRequisito`.
   - Commit: `feat(db): equipos + requisitos documentales`

2) Servicio de sesiones y presigned
   - `POST /equipos/sessions`, generación de presigned (reuso Documentos si existe).
   - Commit: `feat(api): sesiones de carga y presigned urls`

3) Complete transaccional
   - `PUT /equipos/sessions/:id/complete`, creación de documentos, activación de equipo.
   - Commit: `feat(api): completar sesion y habilitar equipo`

4) Permisos/guards + clientes
   - Guards de ADMIN/DADOR/TRANSPORTISTA; rutas de cliente extra (solo ADMIN).
   - Commit: `feat(authz): ownership y restriccion de asignacion de clientes`

5) UI Google-like
   - `EquipoFormGoogleLike` con `NumberedField`, `UploadGroup`, `DateFieldWithHint`.
   - Commit: `feat(ui): formulario estilo google forms para equipos`

6) Revalidación y jobs
   - Expiración por cron, `POST /equipos/:id/revalidate`.
   - Commit: `feat(equipo): revalidacion y expiraciones`

7) E2E y hardening
   - Playwright, casos de error, limpieza/quarantine, métricas.
   - Commit: `test(e2e): flujo completo de armado de equipos`

## 14) Riesgos y mitigación
- Subidas parciales → manejo por `SesionDeCarga` y expiración con cleanup.
- Tamaños/formatos variables → validación dual (front y back) + configuración `.env`.
- Documentos vencidos post-habilitación → job de expiración + revalidación guiada.
- Permisos finos → guards centralizados y tests de autorización.

## 15) Criterios de aceptación
- UI replica aspectos visuales: ancho, tipografía, numeración, “Files submitted”, hints de fecha.
- “Enviar” solo si 100% de requisitos presentes y válidos.
- Equipo queda `HABILITADO` y visible para el Dador/Transportista/Admin según ownership.
- Alertas de vencimientos y estado `EXPIRADO` cuando aplique.

---

Si aprobás este plan, se inicia con Iteración 1 y 2 en paralelo (migraciones + sesiones/presigned) y un mock de UI para validar la apariencia final antes de integrar completamente.


