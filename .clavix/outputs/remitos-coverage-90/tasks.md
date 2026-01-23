# Implementation Plan

**Project**: remitos-coverage-90
**Generated**: 2025-01-21T12:00:00Z

---

## Technical Context & Standards

**Detected Stack & Patterns:**
- **Architecture**: React Feature-Sliced Design (features/remitos/)
- **Framework**: React 18 + TypeScript (ESM)
- **Testing**: Jest + @testing-library/react + @swc/jest
- **State**: Redux Toolkit Query (@reduxjs/toolkit/query/react)
- **API**: RTK Query createApi with fetchBaseQuery
- **Styling**: Tailwind CSS
- **Conventions**:
  - Tests colocados en `__tests__/` junto al archivo fuente
  - Smoke tests para validación de imports
  - Mocks con `jest.unstable_mockModule` (ESM)
  - Helpers en `src/test-utils/mocks/`
  - Nombres de tests en español (debe ser)

**Archivos en `frontend/src/features/remitos/`:**
- `api/remitosApiSlice.ts` (191 líneas) - 9 endpoints
- `types/index.ts` (132 líneas) - Interfaces y constantes
- `components/RemitoCard.tsx` (121 líneas) - Ya tiene buena cobertura
- `components/RemitoDetail.tsx` (840 líneas) - Componente más complejo, necesita extensión
- `components/RemitoUploader.tsx` (480 líneas) - Múltiples roles y validaciones
- `pages/RemitosPage.tsx` (474 líneas) - Exportación, modales, paginación

**Cobertura actual estimada (basada en análisis de código):**
- `RemitoCard`: ~85-90% (ya bastante completo)
- `RemitoDetail`: ~40-50% (solo test básico de integración)
- `RemitoUploader`: ~30-40% (solo flujo CHOFER básico)
- `RemitosPage`: ~35-45% (tests de renderizado básicos)
- `remitosApiSlice`: ~20-30% (solo smoke tests)

**Meta**: Alcanzar ≥90% de cobertura en todos los archivos

---

## Phase 1: Extender Tests de RemitoDetail (Componente más crítico)

**Objetivo**: Llevar RemitoDetail de ~40-50% a ≥90%

- [ ] **Extender RemitoDetail.test.tsx - Loading States**
  Task ID: phase-1-remitodetail-loading-01
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoDetail.test.tsx`.
  > **Details**:
  > - Agregar test para `loadingRemito=true` (muestra spinner)
  > - Verificar que se renderiza ArrowPathIcon con animate-spin
  > - Mock `useGetRemitoQuery` retornando `isLoading: true`

- [ ] **Extender RemitoDetail.test.tsx - Renderizado de Imagen PDF**
  Task ID: phase-1-remitodetail-pdf-02
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoDetail.test.tsx`.
  > **Details**:
  > - Agregar test para remito con imagen PDF (mimeType='application/pdf')
  > - Verificar que se renderiza iframe con URL
  > - Verificar link para abrir en nueva pestaña
  > - Mock remito con `imagenes: [{ url: 'mock-url', mimeType: 'application/pdf' }]`

- [ ] **Extender RemitoDetail.test.tsx - Renderizado de Imagen Regular**
  Task ID: phase-1-remitodetail-image-03
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoDetail.test.tsx`.
  > **Details**:
  > - Agregar test para remito con imagen (no PDF)
  > - Verificar que se renderiza tag img con src correcto
  > - Verificar clases de estilo (object-contain, max-h-[500px])

- [ ] **Extender RemitoDetail.test.tsx - Confianza IA Colores**
  Task ID: phase-1-remitodetail-ia-04
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoDetail.test.tsx`.
  > **Details**:
  > - Test para confianzaIA >= 80 (bg-green-500)
  > - Test para confianzaIA >= 50 y < 80 (bg-yellow-500)
  > - Test para confianzaIA < 50 (bg-red-500)
  > - Test para confianzaIA = null (no se muestra sección)

- [ ] **Extender RemitoDetail.test.tsx - Sección Chofer Cargador**
  Task ID: phase-1-remitodetail-chofer-05
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoDetail.test.tsx`.
  > **Details**:
  > - Test para mostrar choferCargador cuando hay datos
  > - Verificar formato "Nombre Apellido - DNI: XXX"
  > - Test para NO mostrar sección cuando todos los campos son null

- [ ] **Extender RemitoDetail.test.tsx - Edición Cancelar**
  Task ID: phase-1-remitodetail-edit-cancel-06
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoDetail.test.tsx`.
  > **Details**:
  > - Test flujo completo: click Editar → modificar campo → click Cancelar
  > - Verificar que `updateRemito` NO se llama
  > - Verificar que se restauran los datos originales
  > - Verificar que isEditing vuelve a false

- [ ] **Extender RemitoDetail.test.tsx - Cálculo de Pesos Origen**
  Task ID: phase-1-remitodetail-calc-origen-07
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoDetail.test.tsx`.
  > **Details**:
  > - Test calcularPesoOrigen con bruto+tara → calcula neto
  > - Test calcularPesoOrigen con bruto+neto → calcula tara
  > - Test calcularPesoOrigen con tara+neto → calcula bruto
  > - Test con bruto+tara existentes → recalcular neto

- [ ] **Extender RemitoDetail.test.tsx - Cálculo de Pesos Destino**
  Task ID: phase-1-remitodetail-calc-destino-08
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoDetail.test.tsx`.
  > **Details**:
  > - Test calcularPesoDestino con bruto+tara → calcula neto
  > - Test calcularPesoDestino con bruto+neto → calcula tara
  > - Test calcularPesoDestino con tara+neto → calcula bruto

- [ ] **Extender RemitoDetail.test.tsx - InfoRow y EditableRow**
  Task ID: phase-1-remitodetail-rows-09
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoDetail.test.tsx`.
  > **Details**:
  > - Test InfoRow con icono (se renderiza icono)
  > - Test InfoRow sin icono (no se rompe)
  > - Test InfoRow con subvalue
  > - Test EditableRow type='number'
  > - Test EditableRow type='date'
  > - Test EditableRow con suffix
  > - Test EditableRow con className (uppercase para patentes)

- [ ] **Extender RemitoDetail.test.tsx - Manejo de Errores**
  Task ID: phase-1-remitodetail-errors-10
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoDetail.test.tsx`.
  > **Details**:
  > - Test approve() cuando unwrap rechaza (verificar console.error)
  > - Test reject() cuando unwrap rechaza
  > - Test reprocess() cuando unwrap rechaza
  > - Test updateRemito() cuando unwrap rechaza (verificar alert)

- [ ] **Extender RemitoDetail.test.tsx - Estados del Remito**
  Task ID: phase-1-remitodetail-estados-11
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoDetail.test.tsx`.
  > **Details**:
  > - Test para cada RemitoEstado: PENDIENTE_ANALISIS, EN_ANALISIS, PENDIENTE_APROBACION, APROBADO, RECHAZADO, ERROR_ANALISIS
  > - Verificar colores de ESTADO_COLORS
  > - Verificar labels de ESTADO_LABELS
  > - Verificar que botones de aprobación solo aparecen en PENDIENTE_APROBACION

- [ ] **Extender RemitoDetail.test.tsx - Condiciones canEdit y canReprocess**
  Task ID: phase-1-remitodetail-permissions-12
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoDetail.test.tsx`.
  > **Details**:
  > - Test con canApprove=true y estado=APROBADO (NO puede editar)
  > - Test con canApprove=false (NO puede editar ni aprobar)
  > - Test con canApprove=true y estado=PENDIENTE_APROBACION (PUEDE editar)

---

## Phase 2: Extender Tests de RemitoUploader (Múltiples Roles y Validaciones)

**Objetivo**: Llevar RemitoUploader de ~30-40% a ≥90%

- [ ] **Crear RemitoUploader.comprehensive.test.tsx - Nuevos Roles**
  Task ID: phase-2-uploader-roles-01
  > **Implementation**: Crear `src/features/remitos/components/__tests__/RemitoUploader.comprehensive.test.tsx`.
  > **Details**:
  > - Test para rol SUPERADMIN con selector de chofer
  > - Test para rol ADMIN_INTERNO con selector de chofer
  > - Test para rol DADOR_DE_CARGA con selector de chofer
  > - Test para rol TRANSPORTISTA con selector de chofer
  > - Verificar que se muestra dropdown de choferes
  > - Mock `useGetChoferesQuery` retornando lista de choferes

- [ ] **Extender RemitoUploader - Validación de Chofer**
  Task ID: phase-2-uploader-chofer-validation-02
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoUploader.comprehensive.test.tsx`.
  > **Details**:
  > - Test submit sin seleccionar chofer (roles que requieren selector)
  > - Verificar alert('Debe seleccionar un chofer')
  > - Verificar que NO se llama uploadRemito
  > - Test selección de chofer desde dropdown
  > - Test clearChofer (botón X)

- [ ] **Extender RemitoUploader - Autocomplete Choferes**
  Task ID: phase-2-uploader-autocomplete-03
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoUploader.comprehensive.test.tsx`.
  > **Details**:
  > - Test búsqueda de choferes (onChange choferSearch)
  > - Test renderizado de resultados de búsqueda
  > - Test "No se encontraron choferes" cuando lista vacía
  > - Test onFocus muestra dropdown
  > - Test onBlur con delay cierra dropdown

- [ ] **Extender RemitoUploader - Drag and Drop**
  Task ID: phase-2-uploader-dragdrop-04
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoUploader.comprehensive.test.tsx`.
  > **Details**:
  > - Test onDragOver (isDragging=true)
  > - Test onDragLeave (isDragging=false)
  > - Test onDrop con archivos válidos
  > - Verificar estilos de dragging (border-blue-500)

- [ ] **Extender RemitoUploader - Validaciones de Archivos**
  Task ID: phase-2-uploader-file-validation-05
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoUploader.comprehensive.test.tsx`.
  > **Details**:
  > - Test archivo inválido (no imagen ni PDF) → alert
  > - Test segundo PDF → alert('Solo se permite un PDF')
  > - Test PDF + imágenes → alert('No se puede mezclar')
  > - Test imágenes + PDF → alert('No se puede mezclar')
  > - Mock FileReader para imágenes

- [ ] **Extender RemitoUploader - Previews de Archivos**
  Task ID: phase-2-uploader-previews-06
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoUploader.comprehensive.test.tsx`.
  > **Details**:
  > - Test renderizado de preview de imagen
  > - Test renderizado de preview de PDF (icono DocumentIcon)
  > - Test badge de orden (1, 2, 3...)
  > - Test botón eliminar en cada preview
  > - Test "Agregar más" cuando hay imágenes (<10)

- [ ] **Extender RemitoUploader - Camera Capture**
  Task ID: phase-2-uploader-camera-07
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoUploader.comprehensive.test.tsx`.
  > **Details**:
  > - Test apertura de cámara (click "Tomar foto")
  > - Test onCapture de CameraCapture agrega archivos
  > - Mock CameraCapture component
  > - Verificar que setCameraOpen y onCapture funcionan

- [ ] **Extender RemitoUploader - Estados de Carga**
  Task ID: phase-2-uploader-loading-08
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoUploader.comprehensive.test.tsx`.
  > **Details**:
  > - Test isLoading=true (botón deshabilitado, spinner)
  > - Test isError=true (muestra mensaje de error)
  > - Test success después de upload (files vaciados, onSuccess llamado)

- [ ] **Extender RemitoUploader - clearAll**
  Task ID: phase-2-uploader-clear-09
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoUploader.comprehensive.test.tsx`.
  > **Details**:
  > - Test botón "Limpiar todo"
  > - Verificar que files queda vacío
  > - Verificar que fileInput.value se limpia

- [ ] **Extender RemitoUploader - Upload con Datos Completos**
  Task ID: phase-2-uploader-full-10
  > **Implementation**: Extender `src/features/remitos/components/__tests__/RemitoUploader.comprehensive.test.tsx`.
  > **Details**:
  > - Test upload con todos los campos (dadorCargaId, choferId, choferDni, choferNombre, choferApellido)
  > - Verificar FormData se construye correctamente
  > - Verificar que se llaman todos los append de FormData

---

## Phase 3: Extender Tests de RemitosPage (Exportación, Paginación, Modales)

**Objetivo**: Llevar RemitosPage de ~35-45% a ≥90%

- [ ] **Crear RemitosPage.comprehensive.test.tsx - Exportación**
  Task ID: phase-3-page-export-01
  > **Implementation**: Crear `src/features/remitos/pages/__tests__/RemitosPage.comprehensive.test.tsx`.
  > **Details**:
  > - Test apertura de modal de exportación (click botón Exportar)
  > - Test renderizado de filtros de exportación
  > - Test handleExport exitoso
  > - Mock global.fetch para devolver blob
  > - Verificar creación de element <a> y click
  > - Verificar revokeObjectURL y removeChild

- [ ] **Extender RemitosPage - Exportación con Filtros**
  Task ID: phase-3-page-export-filters-02
  > **Implementation**: Extender `src/features/remitos/pages/__tests__/RemitosPage.comprehensive.test.tsx`.
  > **Details**:
  > - Test exportación con fechaDesde y fechaHasta
  > - Test exportación con estado
  > - Test exportación con clienteNombre (AutocompleteInput)
  > - Test exportación con transportistaNombre
  > - Test exportación con patenteChasis
  > - Verificar URLSearchParams

- [ ] **Extender RemitosPage - Exportación Error**
  Task ID: phase-3-page-export-error-03
  > **Implementation**: Extender `src/features/remitos/pages/__tests__/RemitosPage.comprehensive.test.tsx`.
  > **Details**:
  > - Test handleExport con response !ok
  > - Verificar alert('Error al exportar los remitos')
  > - Verificar setExporting(false)

- [ ] **Extender RemitosPage - Paginación**
  Task ID: phase-3-page-pagination-04
  > **Implementation**: Extender `src/features/remitos/pages/__tests__/RemitosPage.comprehensive.test.tsx`.
  > **Details**:
  > - Test botón "Anterior" (decrementa page)
  > - Test botón "Siguiente" (incrementa page)
  > - Test botones disabled en límites (page <= 1, page >= pages)
  > - Mock pagination con pages > 1

- [ ] **Extender RemitosPage - Filtros de Estado**
  Task ID: phase-3-page-filters-05
  > **Implementation**: Extender `src/features/remitos/pages/__tests__/RemitosPage.comprehensive.test.tsx`.
  > **Details**:
  > - Test click en StatCard de cada filtro
  > - Verificar setActiveFilter y setPage(1)
  > - Test active filter (ring-2 visual)
  > - Test que queryParams usa el filtro correcto

- [ ] **Extender RemitosPage - Búsqueda**
  Task ID: phase-3-page-search-06
  > **Implementation**: Extender `src/features/remitos/pages/__tests__/RemitosPage.comprehensive.test.tsx`.
  > **Details**:
  > - Test onChange en input de búsqueda
  > - Verificar setSearch
  > - Test que numeroRemito se pasa en queryParams

- [ ] **Extender RemitosPage - Refresco Manual**
  Task ID: phase-3-page-refetch-07
  > **Implementation**: Extender `src/features/remitos/pages/__tests__/RemitosPage.comprehensive.test.tsx`.
  > **Details**:
  > - Test click en botón de actualizar (ArrowPathIcon)
  > - Verificar que se llama refetch()
  > - Test isFetching true (icono animado)

- [ ] **Extender RemitosPage - Estados Vacíos**
  Task ID: phase-3-page-empty-08
  > **Implementation**: Extender `src/features/remitos/pages/__tests__/RemitosPage.comprehensive.test.tsx`.
  > **Details**:
  > - Test "No hay remitos" con activeFilter='todos'
  > - Test "No hay remitos pendientes" con activeFilter='PENDIENTE_APROBACION'
  > - Test "Cargá tu primer remito" cuando data vacía

- [ ] **Extender RemitosPage - Skeleton Loader**
  Task ID: phase-3-page-skeleton-09
  > **Implementation**: Extender `src/features/remitos/pages/__tests__/RemitosPage.comprehensive.test.tsx`.
  > **Details**:
  > - Test que se renderizan 6 skeletons cuando isLoading
  > - Verificar clases animate-pulse
  > - Verificar estructura de skeleton

- [ ] **Extender RemitosPage - getFilterLabel Helper**
  Task ID: phase-3-page-helper-10
  > **Implementation**: Crear test para helper function.
  > **Details**:
  > - Test getFilterLabel para cada FilterType
  > - Test que retorna string vacío para 'todos'

- [ ] **Extender RemitosPage - StatCard Colors**
  Task ID: phase-3-page-statcard-11
  > **Implementation**: Extender `src/features/remitos/pages/__tests__/RemitosPage.comprehensive.test.tsx`.
  > **Details**:
  > - Test colores para cada color: blue, yellow, green, red
  > - Test active ring color
  > - Test hover:scale-[1.02]

- [ ] **Extender RemitosPage - Cierre de Modal Export**
  Task ID: phase-3-page-modal-close-12
  > **Implementation**: Extender `src/features/remitos/pages/__tests__/RemitosPage.comprehensive.test.tsx`.
  > **Details**:
  > - Test click en XMarkIcon cierra modal
  > - Test click en botón "Cancelar" cierra modal
  > - Test click fuera del modal (backdrop) NO implementado (verificar)

---

## Phase 4: Crear Tests para remitosApiSlice (Cobertura de Endpoints)

**Objetivo**: Llevar remitosApiSlice de ~20-30% a ≥90%

- [ ] **Crear remitosApiSlice.comprehensive.test.ts - Endpoints Query**
  Task ID: phase-4-api-queries-01
  > **Implementation**: Crear `src/features/remitos/api/__tests__/remitosApiSlice.comprehensive.test.ts`.
  > **Details**:
  > - Test getRemitos: query params correctos, providesTags
  > - Test getRemito: URL con id, providesTags con id
  > - Test getStats: URL /stats, providesTags RemitoStats
  > - Test getImageUrl: URL /{remitoId}/image/{imagenId}
  > - Mock store con auth state

- [ ] **Extender remitosApiSlice - Endpoints Mutation**
  Task ID: phase-4-api-mutations-02
  > **Implementation**: Extender `src/features/remitos/api/__tests__/remitosApiSlice.comprehensive.test.ts`.
  > **Details**:
  > - Test uploadRemito: FormData con archivos, append correcto
  > - Test approveRemito: URL /{id}/approve, invalidatesTags
  > - Test rejectRemito: body con motivo, invalidatesTags
  > - Test reprocessRemito: URL /{id}/reprocess
  > - Test updateRemito: PATCH con data, invalidatesTags

- [ ] **Extender remitosApiSlice - prepareHeaders**
  Task ID: phase-4-api-headers-03
  > **Implementation**: Extender `src/features/remitos/api/__tests__/remitosApiSlice.comprehensive.test.ts`.
  > **Details**:
  > - Test que se agrega header Authorization cuando hay token
  > - Test que se agrega header x-tenant-id cuando hay empresaId
  > - Test sin token (no se agrega Authorization)
  > - Mock getState() retornando auth state

- [ ] **Extender remitosApiSlice - URL Construction**
  Task ID: phase-4-api-url-04
  > **Implementation**: Extender `src/features/remitos/api/__tests__/remitosApiSlice.comprehensive.test.ts`.
  > **Details**:
  > - Test con VITE_REMITOS_API_URL definido
  > - Test fallback a VITE_DOCUMENTOS_API_URL reemplazando /api/docs
  > - Test fallback a /api/remitos
  > - Mock getRuntimeEnv

- [ ] **Extender remitosApiSlice - Invalidación de Tags**
  Task ID: phase-4-api-tags-05
  > **Implementation**: Extender `src/features/remitos/api/__tests__/remitosApiSlice.comprehensive.test.ts`.
  > **Details**:
  > - Test uploadRemito invalida Remito y RemitoStats
  > - Test approveRemito invalida Remito (con id), Remito, RemitoStats
  > - Test rejectRemito invalida Remito (con id), Remito, RemitoStats
  > - Test reprocessRemito invalida Remito (con id), Remito, RemitoStats
  > - Test updateRemito invalida Remito (con id), Remito

---

## Phase 5: Tests para Types (Constantes y Utilidades)

**Objetivo**: Alcanzar 100% en types/index.ts

- [ ] **Crear types.test.ts - Constantes ESTADO_LABELS**
  Task ID: phase-5-types-labels-01
  > **Implementation**: Crear `src/features/remitos/types/__tests__/index.test.ts`.
  > **Details**:
  > - Test que ESTADO_LABELS tiene todas las claves de RemitoEstado
  > - Test que cada valor es string no vacío
  > - Test labels esperados para cada estado

- [ ] **Extender types - Constantes ESTADO_COLORS**
  Task ID: phase-5-types-colors-02
  > **Implementation**: Extender `src/features/remitos/types/__tests__/index.test.ts`.
  > **Details**:
  > - Test que ESTADO_COLORS tiene todas las claves de RemitoEstado
  > - Test que cada valor contiene clases de Tailwind esperadas

---

## Phase 6: Tests Integración y Edge Cases

**Objetivo**: Cubrir flujos completos y casos extremos

- [ ] **Crear remitos.integration.test.tsx - Flujo Completo**
  Task ID: phase-6-integration-01
  > **Implementation**: Crear `src/features/remitos/__tests__/remitos.integration.test.tsx`.
  > **Details**:
  > - Test flujo: cargar página → ver lista → click remito → ver detalle → aprobar → volver a lista
  > - Test flujo: cargar página → upload remito → ver en lista
  > - Test flujo: rechazar remito con motivo

- [ ] **Crear remitos.edgecases.test.tsx - Casos Límite**
  Task ID: phase-6-edge-cases-02
  > **Implementation**: Crear `src/features/remitos/__tests__/remitos.edgecases.test.tsx`.
  > **Details**:
  > - Test remito con todos los campos null
  > - Test remito con valores extremos (pesos muy grandes)
  > - Test nombres muy largos (truncate)
  > - Test fechas inválidas

---

## Phase 7: Validación y Ejecución

**Objetivo**: Verificar que se alcanza el 90% y que no se rompe nada

- [ ] **Ejecutar Tests de Remitos**
  Task ID: phase-7-validate-01
  > **Implementation**: Ejecutar tests y verificar resultados.
  > **Details**:
  > - Run: `cd apps/frontend && npm test -- --testPathPattern="remitos" --coverage`
  > - Verificar que todos los tests pasan
  > - Revisar coverage report en `coverage/lcov-report/index.html`

- [ ] **Verificar Cobertura ≥90%**
  Task ID: phase-7-validate-02
  > **Implementation**: Analizar reporte de cobertura.
  > **Details**:
  > - Verificar que cada archivo en `features/remitos/` tiene ≥90%
  > - Identificar líneas/ramas restantes sin cubrir
  > - Si falta, agregar tests adicionales

- [ ] **Verificar Tests Existentes No Se Rompen**
  Task ID: phase-7-validate-03
  > **Implementation**: Ejecutar suite completa de tests.
  > **Details**:
  > - Run: `cd apps/frontend && npm test`
  > - Verificar que no hay regresiones
  > - Fix tests que puedan haberse roto

---

## Summary of Gaps to Cover

**RemitoDetail (gaps principales):**
1. Loading state con spinner
2. Renderizado condicional de PDF vs imagen
3. Colores dinámicos de confianza IA
4. Sección de chofer cargador (condicional)
5. Flujo completo de edición + cancelación
6. Cálculos de peso (calcularPesoOrigen, calcularPesoDestino)
7. Componentes InfoRow y EditableRow (params variantes)
8. Manejo de errores en mutations
9. Estados del remito (6 estados)
10. Permisos canEdit/canReprocess según estado

**RemitoUploader (gaps principales):**
1. Roles: SUPERADMIN, ADMIN_INTERNO, DADOR_DE_CARGA, TRANSPORTISTA
2. Validación de chofer seleccionado
3. Autocomplete de choferes (búsqueda, dropdown)
4. Drag and drop events
5. Validaciones de archivos (tipos, mezcla PDF/imagen)
6. Previews de archivos (imagen vs PDF, badges)
7. CameraCapture integration
8. Estados de carga y error
9. clearAll function
10. FormData construction completa

**RemitosPage (gaps principales):**
1. Exportación (modal, filtros, fetch, blob, download)
2. Paginación (Anterior, Siguiente, disabled states)
3. Filtros de estado (StatCard clicks, active states)
4. Búsqueda por número
5. Refresco manual
6. Estados vacíos (mensajes específicos)
7. Skeleton loader detallado
8. getFilterLabel helper
9. StatCard colores y active rings
10. Cierre de modal export

**remitosApiSlice (gaps principales):**
1. Endpoints query (getRemitos, getRemito, getStats, getImageUrl)
2. Endpoints mutation (uploadRemito, approveRemito, rejectRemito, reprocessRemito, updateRemito)
3. prepareHeaders (auth token, tenant-id)
4. URL construction (fallbacks, env vars)
5. Invalidación de tags

**Types (gaps):**
1. Tests de constantes ESTADO_LABELS y ESTADO_COLORS

---

*Generated by Clavix /clavix:plan*
