# Implementation Plan

**Project**: equipos-coverage-90
**Generated**: 2025-01-21T12:00:00Z

## Technical Context & Standards

*Detected Stack & Patterns*
- **Architecture**: React 18 + TypeScript, Monorepo con apps/frontend
- **Framework**: Jest + @testing-library/react (RTL) para testing
- **State**: Redux Toolkit (RTK Query) para API calls
- **Styling**: Tailwind CSS
- **Conventions**:
  - Tests en carpetas `__tests__` al lado del archivo
  - Nomenclatura: `*.test.tsx`, `*.coverage.test.tsx`, `*.smoke.test.tsx`
  - Mocks centralizados en `__mocks__/mockTestData.ts` y `__mocks__/mockApiHooks.ts`
  - Uso de `jest.unstable_mockModule` para mocks de ES modules
  - Componentes funcionales con hooks (useState, useEffect, useMemo)

---

## Phase 1: Análisis de Cobertura y Preparación

- [ ] **Ejecutar tests actuales y medir línea base**
  Task ID: phase-1-analysis-01
  > **Implementation**: Ejecutar `npm run test:coverage` en `apps/frontend/` y analizar el reporte de coverage para `src/features/equipos/`.
  > **Details**:
    - Guardar el porcentaje actual de coverage para cada archivo
    - Identificar líneas/ramas no cubiertas usando `coverage/lcov-report/index.html`
    - Crear lista de gaps específicos por archivo

- [ ] **Verificar configuración de Jest**
  Task ID: phase-1-analysis-02
  > **Implementation**: Revisar `apps/frontend/jest.config.cjs` y `package.json` scripts.
  > **Details**:
    - Confirmar que `collectCoverageFrom` incluye `src/features/equipos/**/*.{ts,tsx}`
    - Verificar que `coverageThreshold` está configurado correctamente
    - Asegurar que los reportes incluyen branches (no solo líneas)

---

## Phase 2: AltaEquipoCompletaPage.tsx - Coverage Extension

*Archivo: 897 líneas. Tests actuales parciales en `AltaEquipoCompletaPage.test.tsx`, `AltaEquipoCompletaPage.creation.test.tsx`.*

- [ ] **Tests de códigos de error específicos (CHOFER_DUPLICADO, CAMION_DUPLICADO, ACOPLADO_DUPLICADO)**
  Task ID: phase-2-alta-errors-01
  > **Implementation**: Extender `AltaEquipoCompletaPage.creation.test.tsx`.
  > **Details**:
    - Agregar test `muestra error CHOFER_DUPLICADO cuando el chofer ya existe`
    - Agregar test `muestra error CAMION_DUPLICADO cuando el camión ya existe`
    - Agregar test `muestra error ACOPLADO_DUPLICADO cuando el acoplado ya existe`
    - Mockear `useCreateEquipoCompletoMutation` para rechazar con `{ data: { code: 'CHOFER_DUPLICADO', message: '...' } }`
    - Verificar que el mensaje específico se muestra en pantalla
  > **Cobertura objetivo**: Líneas 425-442

- [ ] **Tests de selección múltiple de clientes**
  Task ID: phase-2-alta-clients-01
  > **Implementation**: Crear o extender tests en `AltaEquipoCompletaPage.clients.test.tsx`.
  > **Details**:
    - Test: `selecciona múltiples clientes usando checkboxes`
    - Test: `muestra cantidad correcta de clientes seleccionados`
    - Test: `llama a getConsolidatedTemplates con clienteIds correctos`
    - Test: `muestra indicador de carga al cargar templates consolidados`
    - Verificar mensajes de "X cliente(s) seleccionado(s)" y loading state
  > **Cobertura objetivo**: Líneas 553-598

- [ ] **Tests de templates consolidados vs globales**
  Task ID: phase-2-alta-templates-01
  > **Implementation**: Extender tests existentes.
  > **Details**:
    - Test: `usa templates globales cuando no hay clientes seleccionados`
    - Test: `usa templates consolidados cuando hay clientes seleccionados`
    - Test: `mapea correctamente templates con propiedad clienteNames`
    - Verificar el structure de `templatesPorTipo` en ambos casos
  > **Cobertura objetivo**: Líneas 96-144

- [ ] **Tests de warnings y validaciones**
  Task ID: phase-2-alta-validation-01
  > **Implementation**: Crear `AltaEquipoCompletaPage.validation.test.tsx`.
  > **Details**:
    - Test: `muestra warning cuando faltan datos básicos`
    - Test: `calcula correctamente documentos sin vencimiento`
    - Test: `muestra mensaje específico cuando hay docs sin vencimiento`
    - Test: `muestra cantidad de docs faltantes en el botón`
    - Verificar el renderizado condicional del bloque amarillo (líneas 796-808)
  > **Cobertura objetivo**: Líneas 203-216, 796-808, 879-891

- [ ] **Tests de permisos y roles**
  Task ID: phase-2-alta-permissions-01
  > **Implementation**: Extender tests con diferentes roles.
  > **Details**:
    - Test: `muestra selector de dador para ADMIN_INTERNO`
    - Test: `NO muestra selector de dador para DADOR_DE_CARGA`
    - Test: `muestra warning de permiso insuficiente para rol no autorizado`
    - Test: `usa empresaId del store cuando no es ADMIN_INTERNO`
    - Verificar el bloque `canUpload` (líneas 66-67, 457-465)
  > **Cobertura objetivo**: Líneas 66-67, 81-85, 457-465, 509-598

- [ ] **Tests de rollback cuando falla subida de documentos**
  Task ID: phase-2-alta-rollback-01
  > **Implementation**: Extender `AltaEquipoCompletaPage.creation.test.tsx`.
  > **Details**:
    - Test: `ejecuta rollback cuando falla subida de documentos`
    - Test: `muestra mensaje de error con lista de docs fallados (hasta 5)`
    - Test: `muestra error genérico si falla el rollback`
    - Verificar llamadas a `rollbackEquipoCompleto` y mensajes
  > **Cobertura objetivo**: Líneas 381-407

---

## Phase 3: EditarEquipoPage.tsx - Coverage Extension

*Archivo: 1396 líneas. Tests actuales básicos con placeholders en `EditarEquipoPage.test.tsx`.*

- [ ] **Tests de creación de Camión y Acoplado**
  Task ID: phase-3-edit-create-01
  > **Implementation**: Completar placeholders en `EditarEquipoPage.test.tsx` o crear nuevo archivo.
  > **Details**:
    - Test: `crea nuevo camión con validación de patente (< 5 chars)`
    - Test: `crea nuevo camión exitosamente y auto-selecciona`
    - Test: `crea nuevo acoplado con validación de patente`
    - Test: `crea nuevo acoplado exitosamente y auto-selecciona`
    - Test: `muestra error de validación cuando patente < 5 caracteres`
    - Verificar `handleCreateCamion` (líneas 214-236) y `handleCreateAcoplado` (líneas 239-260)
  > **Cobertura objetivo**: Líneas 214-260, 1090-1178 (modals)

- [ ] **Tests de creación de Chofer con usuario**
  Task ID: phase-3-edit-chofer-01
  > **Implementation**: Crear/Extender `EditarEquipoPage.chofer.test.tsx`.
  > **Details**:
    - Test: `crea chofer sin cuenta de usuario`
    - Test: `crea chofer con cuenta de usuario exitosamente`
    - Test: `muestra contraseña temporal tras crear usuario`
    - Test: `muestra error cuando falta email al crear usuario`
    - Test: `cierra modal tras crear chofer sin usuario`
    - Test: `mantiene modal abierto para mostrar password`
    - Verificar `handleCreateChofer` (líneas 263-311) y modal (líneas 1181-1275)
  > **Cobertura objetivo**: Líneas 263-311, 1181-1275

- [ ] **Tests de creación de Transportista con usuario**
  Task ID: phase-3-edit-transportista-01
  > **Implementation**: Crear/Extender `EditarEquipoPage.transportista.test.tsx`.
  > **Details**:
    - Test: `crea empresa transportista sin cuenta de usuario`
    - Test: `crea empresa transportista con cuenta de usuario`
    - Test: `valida CUIT de 11 dígitos obligatoriamente`
    - Test: `muestra error si falta razón social o CUIT`
    - Test: `muestra campos de nombre/apellido cuando createUser=true`
    - Test: `muestra contraseña temporal tras crear usuario`
    - Verificar `handleCreateTransportista` (líneas 314-365) y modal (líneas 1277-1389)
  > **Cobertura objetivo**: Líneas 314-365, 1277-1389

- [ ] **Tests de gestión de Clientes**
  Task ID: phase-3-edit-clients-01
  > **Implementation**: Completar placeholders en `EditarEquipoPage.test.tsx`.
  > **Details**:
    - Test: `agrega cliente exitosamente al equipo`
    - Test: `muestra alerta de documentos faltantes al agregar cliente`
    - Test: `quita cliente con confirmación`
    - Test: `NO permite quitar si es el único cliente`
    - Test: `muestra cantidad de documentos archivados tras quitar cliente`
    - Test: `filtra clientes disponibles (no muestra ya asociados)`
    - Verificar `handleAddCliente` (líneas 384-429), `handleRemoveCliente` (líneas 432-458), alerta (líneas 888-923)
  > **Cobertura objetivo**: Líneas 384-458, 888-923, 132-143 (useMemo clientesDisponibles)

- [ ] **Tests de subida de documentos**
  Task ID: phase-3-edit-documents-01
  > **Implementation**: Crear `EditarEquipoPage.upload.test.tsx`.
  > **Details**:
    - Test: `selecciona archivo y guarda en selectedFiles`
    - Test: `establece fecha de vencimiento para archivo seleccionado`
    - Test: `sube documento con confirmación previa`
    - Test: `muestra error si falta fecha de vencimiento al subir`
    - Test: `quita archivo seleccionado`
    - Test: `muestra loading state durante subida`
    - Test: `limpia archivo seleccionado tras subida exitosa`
    - Verificar `handleFileSelect`, `handleExpiresAtChange`, `handleUploadDocument`, `handleRemoveFile` (líneas 520-600, 541-590)
  > **Cobertura objetivo**: Líneas 520-600, 541-590

- [ ] **Tests de renderizado condicional por rol**
  Task ID: phase-3-edit-roles-01
  > **Implementation**: Crear `EditarEquipoPage.roles.test.tsx`.
  > **Details**:
    - Test: `muestra sección "Modificar Entidades" solo para canEdit`
    - Test: `oculta botones de cambio para roles sin permiso`
    - Test: `muestra sección "Clientes" solo para canManageClients`
    - Test: `oculta botón "Quitar" para roles sin permiso`
    - Test: `muestra sección de subida para canUpload`
    - Test: `calcula correctamente canEdit, canManageClients, canUpload por rol`
    - Verificar lógica de permisos (líneas 41-53, 676-830, 832-924)
  > **Cobertura objetivo**: Líneas 41-53, 676-830, 832-924

- [ ] **Tests de resumen de estados y requisitos**
  Task ID: phase-3-edit-summary-01
  > **Implementation**: Crear `EditarEquipoPage.summary.test.tsx`.
  > **Details**:
    - Test: `calcula correctamente resumen de estados (vigentes, próximos, vencidos, etc.)`
    - Test: `agrupa requisitos por entityType`
    - Test: `muestra iconos correctos por estado (CheckCircle, Clock, Exclamation, XCircle)`
    - Test: `muestra resumen vacío cuando no hay requisitos`
    - Test: `renderiza correctamente labels de entityType`
    - Verificar `resumenEstados`, `requisitosPorEntidad`, `getEstadoStyle` (líneas 461-489, 492-509, 511-517)
  > **Cobertura objetivo**: Líneas 461-517

- [ ] **Tests de cambio de Empresa Transportista**
  Task ID: phase-3-edit-empresa-01
  > **Implementation**: Extender tests existentes.
  > **Details**:
    - Test: `cambia empresa transportista correctamente`
    - Test: `puede quitar empresa transportista (seleccionando vacío)`
    - Test: `muestra error si falla el cambio de empresa`
    - Verificar `handleChangeEmpresa` (líneas 368-381)
  > **Cobertura objetivo**: Líneas 368-381

---

## Phase 4: DocumentoField.tsx - Coverage Verification

*Archivo: 212 líneas. Tests extensivos existentes en `DocumentoField.coverage.test.tsx` (792 líneas de tests).*

- [ ] **Verificar coverage actual de DocumentoField**
  Task ID: phase-4-docfield-verify-01
  > **Implementation**: Ejecutar `npm run test:coverage -- DocumentoField` y analizar.
  > **Details**:
    - Si coverage < 90%, identificar líneas faltantes
    - Completar gaps menores si existen
    - Los tests actuales cubren: renderizado, selección de archivos, validaciones, upload, errores, disabled, selectOnlyMode, entityTypes
  > **Cobertura objetivo**: ≥95% (ya tiene tests muy completos)

---

## Phase 5: SeccionDocumentos.tsx - Coverage Verification

*Archivo: 93 líneas. Tests extensivos existentes en `SeccionDocumentos.coverage.test.tsx` (404 líneas de tests).*

- [ ] **Verificar coverage actual de SeccionDocumentos**
  Task ID: phase-5-seccion-verify-01
  > **Implementation**: Ejecutar `npm run test:coverage -- SeccionDocumentos` y analizar.
  > **Details**:
    - Si coverage < 90%, identificar líneas faltantes
    - Los tests actuales cubren: título, contador, warning, templates, requiresExpiry, props, entityTypes
    - NOTA: Línea 67 (template.name.includes(keyword)) no es cubrible sin modificar código porque `TEMPLATES_WITHOUT_EXPIRY` está vacío
  > **Cobertura objetivo**: ≥90% (ya tiene tests muy completos)

---

## Phase 6: Integración y Validación Final

- [ ] **Ejecutar suite completa de tests**
  Task ID: phase-6-final-01
  > **Implementation**: Ejecutar `npm run test:coverage` en `apps/frontend/`.
  > **Details**:
    - Verificar que todos los tests pasan
    - Revisar reporte de coverage en `coverage/lcov-report/src/features/equipos/`
    - Confirmar que cada archivo tiene ≥90% de coverage
  > **Resultado esperado**: 100% de tests passing, coverage ≥90%

- [ ] **Validar que no se rompieron tests existentes**
  Task ID: phase-6-final-02
  > **Implementation**: Comparar resultados antes y después.
  > **Details**:
    - Ejecutar `npm run test` (sin coverage)
    - Verificar que no hay regresiones en tests existentes
    - Revisar console warnings
  > **Resultado esperado**: 0 tests rotos

- [ ] **Corregir typos y problemas menores identificados**
  Task ID: phase-6-final-03
  > **Implementation**: Revisar `EditarEquipoPage.tsx:48`.
  > **Details**:
    - La variable `_isCliente` está declarada pero nunca usada
    - Considerar renombrar a `isCliente` (sin underscore) o agregar comment de uso futuro
    - NO romper tests existentes
  > **Resultado**: Código limpio sin warnings de linter

---

## Phases Summary

| Phase | Archivos | Tests Nuevos/Extendidos | Cobertura Objetivo |
|-------|----------|-------------------------|-------------------|
| 1 | - | Análisis y preparación | Línea base |
| 2 | AltaEquipoCompletaPage.tsx | ~6 tests nuevos/extendidos | ≥90% |
| 3 | EditarEquipoPage.tsx | ~20 tests nuevos/extendidos | ≥90% |
| 4 | DocumentoField.tsx | Verificación | ≥95% |
| 5 | SeccionDocumentos.tsx | Verificación | ≥90% |
| 6 | Todos | Integración y validación | ≥90% global |

---

*Generated by Clavix /clavix:plan*
