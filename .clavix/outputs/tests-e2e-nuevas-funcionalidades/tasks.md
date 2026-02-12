# Implementation Plan - Tests E2E Nuevas Funcionalidades

**Project**: Tests E2E para nuevas funcionalidades del sistema BCA
**Generated**: 2026-02-12T00:00:00Z

## Technical Context & Standards
*Detected Stack & Patterns*
- **Architecture**: Monorepo con Turborepo, tests E2E organizados por roles
- **Framework**: Playwright E2E Testing con TypeScript
- **Testing Pattern**: Tests numerados por sección (s01-, s02-, etc.), organizados por roles de usuario
- **Auth**: StorageState con setup projects separados (cliente, chofer, transportista, dadorDeCarga, adminInterno)
- **Convenciones**: 
  - Tests en `apps/e2e/tests/{rol}/s##-{nombre}.spec.ts`
  - `test.describe` para agrupación lógica
  - Locators: `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`
  - `beforeEach` para navegación a la página base
  - Manejo de elementos opcionales: `.catch(() => false)`
  - Fixtures personalizadas en `apps/e2e/tests/fixtures/`
  - Helpers en `apps/e2e/tests/helpers/`

---

## Phase 1: Tests para Carga y Gestión de Remitos

- [x] **Test: Carga de remitos con análisis IA - Happy Path** (ref: Funcionalidad Remitos)
  Task ID: phase-1-remitos-01
  > **Implementation**: Crear `apps/e2e/tests/dador/s22-remitos-carga.spec.ts`
  > **Details**: 
  > - Navegar a página de carga de remitos
  > - Verificar formulario de carga (campo archivo, botón cargar)
  > - Simular carga de archivo PDF de remito
  > - Verificar que muestra indicador de procesamiento IA
  > - Verificar que datos extraídos aparecen en estado editable
  > - Verificar campos esperados (fecha, número, productos, cantidades, etc.)
  > - Verificar que botón "Confirmar" está habilitado después de carga exitosa

- [x] **Test: Edición de datos extraídos del remito** (ref: Funcionalidad Remitos)
  Task ID: phase-1-remitos-02
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s22-remitos-carga.spec.ts`
  > **Details**:
  > - Después de carga exitosa, verificar que campos son editables
  > - Modificar al menos 2 campos de datos extraídos
  > - Verificar que cambios se reflejan en UI
  > - Confirmar remito y verificar que datos editados se guardaron

- [x] **Test: Rechazo de remito durante revisión** (ref: Funcionalidad Remitos)
  Task ID: phase-1-remitos-03
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s22-remitos-carga.spec.ts`
  > **Details**:
  > - Cargar remito
  > - Buscar y usar botón "Rechazar"
  > - Verificar que aparece campo de motivo de rechazo
  > - Ingresar motivo de rechazo
  > - Confirmar rechazo
  > - Verificar mensaje de éxito

- [x] **Test: Listado de remitos con filtros y paginación** (ref: Funcionalidad Remitos)
  Task ID: phase-1-remitos-04
  > **Implementation**: Crear `apps/e2e/tests/dador/s23-remitos-listado.spec.ts`
  > **Details**:
  > - Navegar a listado de remitos
  > - Verificar tabla con columnas: ID, Fecha, Número, Estado, Acciones
  > - Verificar filtros disponibles (por fecha, estado, etc.)
  > - Aplicar filtro y verificar resultados
  > - Verificar paginación funciona correctamente
  > - Verificar que se puede ver detalle de remito

- [x] **Test: Exportación de remitos a Excel** (ref: Exportación Excel)
  Task ID: phase-1-remitos-05
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s23-remitos-listado.spec.ts`
  > **Details**:
  > - Navegar a listado de remitos
  > - Verificar botón "Descargar Excel" visible
  > - Click en botón
  > - Verificar que se inicia descarga (usando `page.waitForEvent('download')`)
  > - Verificar nombre de archivo contiene "remitos" y fecha
  > - NO validar contenido del Excel (solo que se descarga)

---

## Phase 2: Tests para Documentos Rechazados

- [x] **Test: Acceso al menú de documentos rechazados** (ref: Menú Documentos Rechazados)
  Task ID: phase-2-rechazados-01
  > **Implementation**: Crear `apps/e2e/tests/dador/s24-documentos-rechazados.spec.ts`
  > **Details**:
  > - Verificar que existe opción de menú "Documentos Rechazados"
  > - Navegar a `/documentos/rechazados` (ajustar URL según implementación real)
  > - Verificar que página carga correctamente
  > - Verificar título de página

- [x] **Test: Listado de documentos rechazados por entidad** (ref: Menú Documentos Rechazados)
  Task ID: phase-2-rechazados-02
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s24-documentos-rechazados.spec.ts`
  > **Details**:
  > - Verificar selector de tipo de entidad (Chofer, Transportista, Dador)
  > - Seleccionar un tipo de entidad
  > - Verificar que aparece listado de documentos rechazados
  > - Verificar columnas: Vista Previa, Tipo Doc, Entidad, Fecha Rechazo, Motivo
  > - Verificar que hay al menos vista previa miniatura del documento

- [x] **Test: Vista previa de documento rechazado** (ref: Menú Documentos Rechazados)
  Task ID: phase-2-rechazados-03
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s24-documentos-rechazados.spec.ts`
  > **Details**:
  > - Hacer click en miniatura de vista previa
  > - Verificar que se abre modal/overlay con documento completo
  > - Verificar que se puede cerrar la vista previa
  > - Verificar que documento se renderiza (esperar elemento de PDF/imagen)

- [x] **Test: Visualización de motivo de rechazo** (ref: Menú Documentos Rechazados)
  Task ID: phase-2-rechazados-04
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s24-documentos-rechazados.spec.ts`
  > **Details**:
  > - Verificar que columna "Motivo" muestra texto del motivo
  > - Verificar que motivo es legible (no truncado o con tooltip si es largo)
  > - Verificar que motivos diferentes se muestran correctamente

- [x] **Test: Documentos rechazados para rol CHOFER** (ref: Menú Documentos Rechazados)
  Task ID: phase-2-rechazados-05
  > **Implementation**: Crear `apps/e2e/tests/chofer/s14-documentos-rechazados.spec.ts`
  > **Details**:
  > - Autenticar como CHOFER (usar storageState chofer.json)
  > - Navegar a documentos rechazados
  > - Verificar que solo ve sus propios documentos rechazados
  > - Verificar que puede ver vista previa y motivo

- [x] **Test: Documentos rechazados para rol TRANSPORTISTA** (ref: Menú Documentos Rechazados)
  Task ID: phase-2-rechazados-06
  > **Implementation**: Crear `apps/e2e/tests/transportista/s21-documentos-rechazados.spec.ts`
  > **Details**:
  > - Autenticar como TRANSPORTISTA (usar storageState transportista.json)
  > - Navegar a documentos rechazados
  > - Verificar que ve documentos rechazados de sus choferes y equipos
  > - Verificar filtros por entidad (Chofer, Camión, Acoplado, Empresa)

---

## Phase 3: Tests para Múltiples Plantillas de Requisitos

- [x] **Test: Selección de múltiples plantillas en alta de equipo** (ref: Múltiples Plantillas)
  Task ID: phase-3-plantillas-01
  > **Implementation**: Modificar `apps/e2e/tests/dador/s05-alta-completa.spec.ts`
  > **Details**:
  > - En formulario de alta completa de equipo
  > - Verificar que existe selector/dropdown de plantillas (puede ser multiselect)
  > - Verificar que se pueden seleccionar múltiples plantillas
  > - Seleccionar 2 plantillas diferentes
  > - Verificar que se muestran documentos de ambas plantillas
  > - Verificar que documentos duplicados aparecen solo una vez

- [x] **Test: Plantillas específicas para propietario-chofer vs empresa** (ref: Múltiples Plantillas)
  Task ID: phase-3-plantillas-02
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s05-alta-completa.spec.ts`
  > **Details**:
  > - Verificar que existe indicador/checkbox de "Propietario es Chofer"
  > - Marcar/desmarcar opción y verificar que plantillas disponibles cambian
  > - Verificar que se muestra mensaje indicando qué tipo de plantilla se está usando

- [x] **Test: Configuración de plantillas por cliente (ADMIN)** (ref: Múltiples Plantillas)
  Task ID: phase-3-plantillas-03
  > **Implementation**: Crear `apps/e2e/tests/admin-interno/s26-plantillas-configuracion.spec.ts`
  > **Details**:
  > - Autenticar como ADMIN_INTERNO
  > - Navegar a configuración de plantillas (buscar en menú)
  > - Verificar que se pueden crear múltiples plantillas para un cliente
  > - Verificar que cada plantilla tiene nombre descriptivo
  > - Verificar que se pueden asignar documentos a cada plantilla
  > - Verificar que se puede marcar plantilla como "Para propietario-chofer" o "Para empresa"

- [x] **Test: Suma de documentos al seleccionar múltiples plantillas** (ref: Múltiples Plantillas)
  Task ID: phase-3-plantillas-04
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s05-alta-completa.spec.ts`
  > **Details**:
  > - Seleccionar plantilla A (suponer que requiere 3 documentos)
  > - Verificar que se muestran 3 campos de carga de documentos
  > - Seleccionar plantilla B adicional (suponer que requiere 2 documentos, 1 compartido con A)
  > - Verificar que ahora se muestran 4 campos únicos (3+2-1)
  > - Verificar que documento compartido aparece solo una vez

---

## Phase 4: Tests para Reutilización de Empresas y Validación de Duplicados

- [x] **Test: Reutilización de empresa transportista por CUIT** (ref: Reutilización Empresa)
  Task ID: phase-4-reutilizacion-01
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s05-alta-completa.spec.ts`
  > **Details**:
  > - Ingresar CUIT de empresa transportista ya existente
  > - Verificar que aparece mensaje: "La empresa ya existe"
  > - Verificar que se muestran datos existentes (Razón Social, documentos)
  > - Verificar que se puede continuar con esos datos o modificarlos
  > - Verificar que al modificar documento, el cambio afecta todos los equipos de esa empresa

- [x] **Test: Error al intentar duplicar chofer en equipo activo** (ref: Validación Duplicados)
  Task ID: phase-4-reutilizacion-02
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s05-alta-completa.spec.ts`
  > **Details**:
  > - Crear equipo con chofer DNI específico (usando seed/fixture)
  > - Intentar crear segundo equipo con mismo DNI de chofer
  > - Verificar que aparece error 409 o mensaje: "El chofer con DNI {dni} ya está asignado al equipo #{id}"
  > - Verificar que no se puede continuar con la creación
  > - Verificar mensaje sugiere que chofer está en uso

- [x] **Test: Error al intentar duplicar camión en equipo activo** (ref: Validación Duplicados)
  Task ID: phase-4-reutilizacion-03
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s05-alta-completa.spec.ts`
  > **Details**:
  > - Crear equipo con camión patente específica (usando seed/fixture)
  > - Intentar crear segundo equipo con misma patente de camión
  > - Verificar error: "El camión con patente {patente} ya está asignado al equipo #{id}"
  > - Verificar código de error: CAMION_EN_USO

- [x] **Test: Error al intentar duplicar acoplado en equipo activo** (ref: Validación Duplicados)
  Task ID: phase-4-reutilizacion-04
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s05-alta-completa.spec.ts`
  > **Details**:
  > - Crear equipo con acoplado patente específica (usando seed/fixture)
  > - Intentar crear segundo equipo con misma patente de acoplado
  > - Verificar error: "El acoplado con patente {patente} ya está asignado al equipo #{id}"
  > - Verificar código de error: ACOPLADO_EN_USO

- [x] **Test: Reutilización de entidad huérfana (equipo anterior cerrado)** (ref: Reutilización Empresa)
  Task ID: phase-4-reutilizacion-05
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s05-alta-completa.spec.ts`
  > **Details**:
  > - Crear equipo, luego cerrarlo (poner validTo)
  > - Intentar crear nuevo equipo con mismo chofer/camión/acoplado
  > - Verificar que NO da error
  > - Verificar que reutiliza entidad existente
  > - Verificar que datos se actualizan si se modifican

---

## Phase 5: Tests para Exportación Excel

- [x] **Test: Exportación Excel de equipos sin ZIP de documentos** (ref: Exportación Excel)
  Task ID: phase-5-excel-01
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s13-descargas.spec.ts`
  > **Details**:
  > - Navegar a listado de equipos
  > - Verificar botón "Descargar Excel" (diferente de "Descargar ZIP con Documentos")
  > - Click en "Descargar Excel"
  > - Verificar que inicia descarga (usar `page.waitForEvent('download')`)
  > - Verificar que archivo descargado tiene extensión .xlsx
  > - Verificar que archivo NO es un ZIP (por tamaño o extensión)

- [x] **Test: Exportación Excel de equipos para TRANSPORTISTA** (ref: Exportación Excel)
  Task ID: phase-5-excel-02
  > **Implementation**: Agregar test en `apps/e2e/tests/transportista/s12-descargas.spec.ts`
  > **Details**:
  > - Autenticar como TRANSPORTISTA
  > - Navegar a listado de equipos
  > - Verificar botón "Descargar Excel" visible
  > - Realizar descarga y verificar archivo .xlsx

---

## Phase 6: Tests para Permisos por Rol

- [x] **Test: DADOR_DE_CARGA puede asignar plantillas pero no aprobar remitos** (ref: Permisos por Rol)
  Task ID: phase-6-permisos-01
  > **Implementation**: Modificar `apps/e2e/tests/dador/s05-alta-completa.spec.ts`
  > **Details**:
  > - Autenticar como DADOR_DE_CARGA
  > - Verificar que puede ver selector de plantillas en alta de equipo
  > - Navegar a sección de aprobación de remitos (si existe en UI)
  > - Verificar que NO tiene acceso o que botón "Aprobar" está deshabilitado

- [x] **Test: TRANSPORTISTA puede crear equipos con auto-complete de empresa** (ref: Permisos por Rol)
  Task ID: phase-6-permisos-02
  > **Implementation**: Modificar `apps/e2e/tests/transportista/s03-alta-completa.spec.ts`
  > **Details**:
  > - Autenticar como TRANSPORTISTA
  > - Navegar a alta completa de equipo
  > - Verificar que campo "Empresa Transportista" está pre-completado con empresa del usuario
  > - Verificar que campo está deshabilitado o no editable
  > - Verificar que puede completar resto del formulario

- [x] **Test: CHOFER no puede crear equipos** (ref: Permisos por Rol)
  Task ID: phase-6-permisos-03
  > **Implementation**: Crear `apps/e2e/tests/chofer/s15-permisos.spec.ts`
  > **Details**:
  > - Autenticar como CHOFER
  > - Verificar que menú NO muestra opción "Crear Equipo" o "Alta Completa"
  > - Intentar navegar directamente a URL de alta completa
  > - Verificar que redirige a página de error 403 o a home

- [x] **Test: DADOR_DE_CARGA puede hacer upload inicial de documentos** (ref: Permisos por Rol)
  Task ID: phase-6-permisos-04
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s05-alta-completa.spec.ts`
  > **Details**:
  > - Verificar que puede seleccionar archivos en campos de documentos
  > - Verificar que puede subir archivos
  > - Verificar que archivos quedan en estado inicial esperado

---

## Phase 7: Tests para Sistema de Transferencias

- [x] **Test: Solicitud de transferencia cuando entidad pertenece a otro dador** (ref: Sistema Transferencias)
  Task ID: phase-7-transferencias-01
  > **Implementation**: Crear `apps/e2e/tests/dador/s25-transferencias.spec.ts`
  > **Details**:
  > - Crear chofer asociado a Dador A (usando seed/fixture)
  > - Autenticar como Dador B
  > - Intentar crear equipo con mismo DNI de chofer
  > - Verificar que aparece indicador: "Entidad existe bajo otro dador"
  > - Verificar botón o opción "Solicitar Transferencia"
  > - Click en solicitar transferencia
  > - Verificar mensaje de confirmación: "Solicitud enviada"

- [x] **Test: Admin recibe notificación de transferencia solicitada** (ref: Sistema Transferencias)
  Task ID: phase-7-transferencias-02
  > **Implementation**: Crear `apps/e2e/tests/admin-interno/s27-transferencias.spec.ts`
  > **Details**:
  > - Autenticar como ADMIN_INTERNO
  > - Navegar a sección de notificaciones o transferencias pendientes
  > - Verificar que aparece solicitud de transferencia reciente
  > - Verificar que muestra: Entidad, Dador Origen, Dador Destino, Fecha Solicitud
  > - Verificar botones "Aprobar" y "Rechazar"

- [x] **Test: Admin aprueba transferencia** (ref: Sistema Transferencias)
  Task ID: phase-7-transferencias-03
  > **Implementation**: Agregar test en `apps/e2e/tests/admin-interno/s27-transferencias.spec.ts`
  > **Details**:
  > - En solicitud de transferencia, click en "Aprobar"
  > - Verificar modal de confirmación
  > - Confirmar aprobación
  > - Verificar mensaje de éxito
  > - Verificar que solicitud desaparece de pendientes

- [x] **Test: Admin rechaza transferencia con motivo** (ref: Sistema Transferencias)
  Task ID: phase-7-transferencias-04
  > **Implementation**: Agregar test en `apps/e2e/tests/admin-interno/s27-transferencias.spec.ts`
  > **Details**:
  > - En solicitud de transferencia, click en "Rechazar"
  > - Verificar que aparece campo de texto para motivo
  > - Ingresar motivo de rechazo
  > - Confirmar rechazo
  > - Verificar mensaje de éxito

- [x] **Test: Dador recibe notificación de transferencia aprobada** (ref: Sistema Transferencias)
  Task ID: phase-7-transferencias-05
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s25-transferencias.spec.ts`
  > **Details**:
  > - Después de aprobación por Admin (usar seed/fixture para simular)
  > - Autenticar como Dador que solicitó transferencia
  > - Navegar a sección de notificaciones (campanita)
  > - Verificar que aparece notificación de transferencia aprobada
  > - Verificar que puede ahora crear equipo con esa entidad

- [x] **Test: Dador recibe notificación de transferencia rechazada** (ref: Sistema Transferencias)
  Task ID: phase-7-transferencias-06
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s25-transferencias.spec.ts`
  > **Details**:
  > - Después de rechazo por Admin (usar seed/fixture para simular)
  > - Verificar notificación de rechazo
  > - Verificar que muestra motivo del rechazo

---

## Phase 8: Tests para Sistema de Alertas

- [x] **Test: Visualización de campanita de notificaciones** (ref: Sistema Alertas)
  Task ID: phase-8-alertas-01
  > **Implementation**: Crear `apps/e2e/tests/dador/s26-alertas.spec.ts`
  > **Details**:
  > - Autenticar como cualquier rol
  > - Verificar que campanita de notificaciones está visible en header/navbar
  > - Verificar que muestra badge con número de notificaciones sin leer (si hay)
  > - Click en campanita
  > - Verificar que se abre panel/dropdown de notificaciones

- [x] **Test: Notificación de documento rechazado** (ref: Sistema Alertas)
  Task ID: phase-8-alertas-02
  > **Implementation**: Agregar test en `apps/e2e/tests/chofer/s16-alertas.spec.ts`
  > **Details**:
  > - Simular rechazo de documento de chofer (usar seed/fixture)
  > - Autenticar como CHOFER
  > - Click en campanita de notificaciones
  > - Verificar que aparece alerta de documento rechazado
  > - Verificar que muestra: tipo de documento, fecha, y link a documentos rechazados

- [x] **Test: Notificación de documento por vencer** (ref: Sistema Alertas)
  Task ID: phase-8-alertas-03
  > **Implementation**: Agregar test en `apps/e2e/tests/transportista/s22-alertas.spec.ts`
  > **Details**:
  > - Simular documento con vencimiento próximo (usar seed/fixture)
  > - Autenticar como TRANSPORTISTA
  > - Abrir notificaciones
  > - Verificar alerta de documento próximo a vencer
  > - Verificar que muestra: entidad, tipo doc, fecha de vencimiento, días restantes

- [x] **Test: Notificación de transferencia aprobada** (ref: Sistema Alertas)
  Task ID: phase-8-alertas-04
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s26-alertas.spec.ts`
  > **Details**:
  > - Simular transferencia aprobada (usar seed/fixture)
  > - Abrir notificaciones
  > - Verificar alerta de transferencia aprobada
  > - Verificar que muestra: entidad transferida, fecha de aprobación

- [x] **Test: Marcado de notificaciones como leídas** (ref: Sistema Alertas)
  Task ID: phase-8-alertas-05
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s26-alertas.spec.ts`
  > **Details**:
  > - Verificar notificación sin leer (tiene indicador visual)
  > - Click en notificación o botón "Marcar como leída"
  > - Verificar que indicador de no leída desaparece
  > - Verificar que contador de badge disminuye

---

## Phase 9: Tests para Auditoría Previa con IA

- [x] **Test: Acceso a auditoría previa de documentación de equipo** (ref: Auditoría IA)
  Task ID: phase-9-auditoria-01
  > **Implementation**: Crear `apps/e2e/tests/admin-interno/s28-auditoria-ia.spec.ts`
  > **Details**:
  > - Autenticar como ADMIN_INTERNO o rol que puede auditar
  > - Navegar a listado de equipos
  > - Seleccionar un equipo
  > - Verificar que existe botón/opción "Auditoría IA" o similar
  > - Click en opción de auditoría

- [x] **Test: Ejecución de auditoría IA sobre documentación de equipo** (ref: Auditoría IA)
  Task ID: phase-9-auditoria-02
  > **Implementation**: Agregar test en `apps/e2e/tests/admin-interno/s28-auditoria-ia.spec.ts`
  > **Details**:
  > - Iniciar auditoría IA
  > - Verificar que muestra indicador de "Analizando documentos..."
  > - Esperar resultado de análisis (usar timeout adecuado)
  > - Verificar que muestra resultado/reporte de auditoría

- [x] **Test: Visualización de reporte de auditoría IA** (ref: Auditoría IA)
  Task ID: phase-9-auditoria-03
  > **Implementation**: Agregar test en `apps/e2e/tests/admin-interno/s28-auditoria-ia.spec.ts`
  > **Details**:
  > - Después de auditoría exitosa
  > - Verificar que muestra secciones: Documentos Correctos, Documentos con Observaciones, Documentos Faltantes
  > - Verificar que cada documento tiene indicador visual (check verde, warning amarillo, error rojo)
  > - Verificar que observaciones son legibles y específicas

---

## Phase 10: Tests para Extracción de Información con IA

- [x] **Test: Extracción automática de datos de documentos** (ref: Extracción IA)
  Task ID: phase-10-extraccion-01
  > **Implementation**: Crear `apps/e2e/tests/dador/s27-extraccion-ia.spec.ts`
  > **Details**:
  > - En formulario de alta de equipo, al subir documento
  > - Verificar que después de upload aparece indicador "Extrayendo datos..."
  > - Esperar extracción (timeout adecuado)
  > - Verificar que campos del formulario se auto-completan con datos extraídos
  > - Ejemplos: Nombre/Apellido de DNI, Patente de cédula verde, CUIT de constancia

- [x] **Test: Revisión de datos extraídos antes de guardar** (ref: Extracción IA)
  Task ID: phase-10-extraccion-02
  > **Implementation**: Agregar test en `apps/e2e/tests/dador/s27-extraccion-ia.spec.ts`
  > **Details**:
  > - Después de extracción automática
  > - Verificar que todos los campos extraídos están resaltados o marcados visualmente
  > - Verificar que se puede editar datos extraídos
  > - Modificar al menos un campo extraído
  > - Guardar y verificar que datos modificados prevalecen

- [x] **Test: Almacenamiento flexible de datos extraídos** (ref: Extracción IA)
  Task ID: phase-10-extraccion-03
  > **Implementation**: Agregar test en `apps/e2e/tests/admin-interno/s29-datos-extraidos.spec.ts`
  > **Details**:
  > - Navegar a sección de administración de datos extraídos (si existe en UI)
  > - Verificar que se pueden ver datos extraídos de documentos
  > - Verificar que se pueden exportar o consultar para análisis
  > - Verificar formato de datos es estructurado (tabla o JSON visible)

---

## Phase 11: Helper Functions y Fixtures

- [x] **Helper: Crear función para setup de seed data de remitos** (ref: Testing Infrastructure)
  Task ID: phase-11-helpers-01
  > **Implementation**: Crear `apps/e2e/tests/helpers/remitos.helper.ts`
  > **Details**:
  > - Exportar función `createTestRemito(data: Partial<Remito>): Promise<Remito>`
  > - Usar API request de Playwright para crear remito de prueba
  > - Permitir especificar estado (pendiente, aprobado, rechazado)
  > - Retornar ID y datos del remito creado

- [x] **Helper: Crear función para simular transferencia de entidad** (ref: Testing Infrastructure)
  Task ID: phase-11-helpers-02
  > **Implementation**: Crear `apps/e2e/tests/helpers/transferencias.helper.ts`
  > **Details**:
  > - Exportar función `createTransferRequest(entityType, entityId, fromDador, toDador): Promise<TransferId>`
  > - Usar API para crear solicitud de transferencia
  > - Exportar función `approveTransfer(transferId): Promise<void>`
  > - Exportar función `rejectTransfer(transferId, reason): Promise<void>`

- [x] **Helper: Crear función para generar notificaciones de prueba** (ref: Testing Infrastructure)
  Task ID: phase-11-helpers-03
  > **Implementation**: Crear `apps/e2e/tests/helpers/notifications.helper.ts`
  > **Details**:
  > - Exportar función `createDocRejectedNotification(userId, docId): Promise<NotifId>`
  > - Exportar función `createDocExpiringNotification(userId, docId, daysLeft): Promise<NotifId>`
  > - Exportar función `createTransferApprovedNotification(userId, transferId): Promise<NotifId>`
  > - Usar API directamente para insertar notificaciones de prueba

- [x] **Fixture: Extender fixture e2eTest con remitos y transferencias** (ref: Testing Infrastructure)
  Task ID: phase-11-helpers-04
  > **Implementation**: Modificar `apps/e2e/tests/fixtures/e2eTest.ts`
  > **Details**:
  > - Agregar fixture `remitos: Remito[]` que carga remitos de prueba
  > - Agregar fixture `transferencias: Transfer[]` que carga transferencias de prueba
  > - Usar helpers creados en tasks anteriores
  > - Mantener compatibilidad con fixture `seed` existente

---

## Phase 12: Documentación y Configuración

- [x] **Actualizar README de e2e con nuevos tests** (ref: Documentation)
  Task ID: phase-12-docs-01
  > **Implementation**: Modificar `apps/e2e/README.md`
  > **Details**:
  > - Agregar sección describiendo nuevos tests de remitos
  > - Agregar sección describiendo tests de transferencias
  > - Agregar sección describiendo tests de alertas
  > - Incluir comandos para ejecutar tests específicos de nuevas funcionalidades
  > - Ejemplo: `npm run e2e -- --grep "remitos"`

- [x] **Actualizar package.json con scripts para tests nuevos** (ref: Configuration)
  Task ID: phase-12-docs-02
  > **Implementation**: Modificar `apps/e2e/package.json`
  > **Details**:
  > - Agregar script: `"test:remitos": "playwright test tests/**/s*-remitos*.spec.ts"`
  > - Agregar script: `"test:transferencias": "playwright test tests/**/s*-transferencias*.spec.ts"`
  > - Agregar script: `"test:alertas": "playwright test tests/**/s*-alertas*.spec.ts"`
  > - Agregar script: `"test:auditoria-ia": "playwright test tests/**/s*-auditoria-ia*.spec.ts"`
  > - Agregar script: `"test:nuevas-funcionalidades": "npm run test:remitos && npm run test:transferencias && npm run test:alertas"`

- [x] **Crear checklist de testing para nuevas funcionalidades** (ref: Documentation)
  Task ID: phase-12-docs-03
  > **Implementation**: Crear `apps/e2e/docs/checklists/nuevas-funcionalidades.md`
  > **Details**:
  > - Crear checklist markdown con todas las funcionalidades nuevas
  > - Organizar por feature: Remitos, Transferencias, Alertas, etc.
  > - Referenciar archivo de spec correspondiente para cada item
  > - Seguir formato de checklists existentes en `apps/e2e/docs/checklists/`

- [x] **Configurar timeouts específicos para tests con IA** (ref: Configuration)
  Task ID: phase-12-docs-04
  > **Implementation**: Modificar `apps/e2e/playwright.config.ts`
  > **Details**:
  > - Aumentar timeout para tests que usan análisis IA
  > - Agregar configuración: `testMatch: tests que incluyan "auditoria-ia" o "extraccion-ia" tengan timeout de 180_000ms (3 min)`
  > - Agregar comentario explicando que procesamiento IA puede ser lento
  > - Mantener timeouts normales para resto de tests

---

*Generated by Clavix /clavix-plan*

