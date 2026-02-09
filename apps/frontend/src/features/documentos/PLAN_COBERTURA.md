# Plan de Cobertura de Tests - Feature Documentos

## Objetivo
Aumentar la cobertura de tests de la carpeta `src/features/documentos/` a más del **93%** en statements, branches, functions y lines.

## Estado Actual de Cobertura

| Carpeta | Statements | Branches | Functions | Lines |
|---------|------------|----------|-----------|-------|
| **api** | 31.92% (113/354) | 18.68% (57/305) | 14.9% (31/208) | 30% (90/300) |
| **components** | 73% (357/489) | 66.01% (270/409) | 76% (76/100) | 76.19% (336/441) |
| **pages** | 54.68% (1406/2571) | 51.66% (1083/2096) | 50.79% (351/691) | 58.96% (1237/2098) |
| **Total** | ~60% | ~52% | ~53% | ~62% |

## Componentes que Requieren Atención

### Componentes con Baja Cobertura (<93%)

1. **CameraCapture.tsx** - 67.44% statements, 63.04% branches
   - Líneas sin cubrir: manejo de errores de cámara (NotAllowedError, NotFoundError, NotReadableError, OverconstrainedError, SecurityError)
   - Funciones sin cubrir: `removeAt`, callback completo de `onCapture`

2. **DocumentUploadModal.tsx** - 79.81% statements, 57.14% branches
   - Branches sin cubrir: `getEntityIdLabel` para CAMION, ACOPLADO, EMPRESA_TRANSPORTISTA, default
   - Branches sin cubrir: `getEntityIdPlaceholder` para CAMION, ACOPLADO, EMPRESA_TRANSPORTISTA, default
   - Funciones sin cubrir: `handleDrop`, `handleDragOver`, `handleDragLeave`
   - Branches sin cubrir: manejo de errores en batch upload, cambio de expiresAt

3. **DocumentsList.tsx** - 93.75% statements, 100% branches
   - Solo falta: `handleClosePreview`

4. **ResubmitDocument.tsx** - 88.46% statements, 76.19% branches
   - Funciones sin cubrir: callbacks de click en fileInputRef, setSelectedFile
   - Branches sin cubrir: entityName, isLoading, manejo de errores

### Componentes con Cobertura Aceptable (requieren pequeños ajustes)

5. **DocumentPreview.tsx** - Requiere revisión

### Componentes con Excelente Cobertura (mantener)

6. **TemplatesList.tsx** - 100% ✅
7. **RejectModal.tsx** - 100% statements ✅
8. **TemplateFormModal.tsx** - 96.66% ✅

## Plan de Implementación

### FASE 1: API Tests (Prioridad Alta - Impacto Mayor)

**Objetivo:** Llevar la cobertura del API de 31.92% a >93%

#### Archivo: `api/__tests__/documentosApiSlice.gap-coverage.test.ts`

**Tests a agregar:**

1. **Endpoints sin cobertura completa:**
   - `getDocuments` - probar diferentes filtros y paginaciones
   - `getDocumentById` - probar casos de error
   - `updateDocument` - probar todos los campos actualizables
   - `deleteDocument` - probar manejo de errores
   - `approveDocument` - probar estados y validaciones
   - `rejectDocument` - probar con diferentes motivos
   - `getApprovalQueue` - probar filtros y estados
   - `getClientDocuments` - probar paginación y filtros
   - `getJobStatus` - probar diferentes estados de job
   - `uploadBatchDocsTransportistas` - probar skipDedupe, validaciones

2. **Tests de integración de API:**
   - Secuencia completa: upload → approve → reject → resubmit
   - Manejo de errores de red
   - Estados de carga (isLoading, isError)

### FASE 2: Componentes Críticos (Prioridad Alta)

#### Archivo: `components/__tests__/CameraCapture.gap-coverage.test.tsx`

**Tests a agregar:**

```typescript
describe('CameraCapture - Gap Coverage', () => {
  // Permisos denegados
  it('debe mostrar error cuando permisos son denegados', () => {
    (useCameraPermissions as jest.Mock).mockReturnValue({
      permissionStatus: 'denied',
      requestPermission: jest.fn(),
    });
    // Assert error message
  });

  // Permisos not-supported
  it('debe mostrar error cuando dispositivo no soporta cámara', () => {
    (useCameraPermissions as jest.Mock).mockReturnValue({
      permissionStatus: 'not-supported',
      requestPermission: jest.fn(),
    });
    // Assert error message
  });

  // Errores de getUserMedia
  it('debe manejar NotAllowedError', () => {
    // Mock getUserMedia throwing NotAllowedError
  });

  it('debe manejar NotFoundError', () => {
    // Mock getUserMedia throwing NotFoundError
  });

  it('debe manejar NotReadableError', () => {
    // Mock getUserMedia throwing NotReadableError
  });

  it('debe manejar OverconstrainedError', () => {
    // Mock getUserMedia throwing OverconstrainedError
  });

  it('debe manejar SecurityError', () => {
    // Mock getUserMedia throwing SecurityError
  });

  // Función removeAt
  it('debe eliminar foto capturada', () => {
    // Test removeAt function
  });

  // Callback onCapture completo
  it('debe llamar onCapture con todas las fotos', () => {
    // Test onCapture with multiple photos
  });
});
```

#### Archivo: `components/__tests__/DocumentUploadModal.gap-coverage.test.tsx`

**Tests a agregar:**

```typescript
describe('DocumentUploadModal - Gap Coverage', () => {
  describe('getEntityIdLabel', () => {
    it('debe retornar label correcto para EMPRESA_TRANSPORTISTA', () => {
      // Test entityType EMPRESA_TRANSPORTISTA
    });

    it('debe retornar label correcto para CAMION', () => {
      // Test entityType CAMION
    });

    it('debe retornar label correcto para ACOPLADO', () => {
      // Test entityType ACOPLADO
    });

    it('debe retornar label default', () => {
      // Test unknown entityType
    });
  });

  describe('getEntityIdPlaceholder', () => {
    // Similar tests para placeholder
  });

  describe('Drag and Drop', () => {
    it('debe manejar handleDrop', () => {
      // Simular drop de archivos
    });

    it('debe manejar handleDragOver', () => {
      // Simular drag over
    });

    it('debe manejar handleDragLeave', () => {
      // Simular drag leave
    });
  });

  describe('Batch Upload', () => {
    it('debe manejar error en batch upload', async () => {
      // Mock uploadBatch throwing error
    });

    it('debe mostrar estado de carga durante batch', async () => {
      // Test loading state
    });

    it('debe cambiar fecha de vencimiento', () => {
      // Test expiresAt onChange
    });
  });
});
```

#### Archivo: `components/__tests__/DocumentsList.gap-coverage.test.tsx`

```typescript
describe('DocumentsList - Gap Coverage', () => {
  it('debe cerrar preview de documento', () => {
    // Test handleClosePreview via DocumentPreview onClose
  });
});
```

#### Archivo: `components/__tests__/ResubmitDocument.gap-coverage.test.tsx`

```typescript
describe('ResubmitDocument - Gap Coverage', () => {
  it('debe mostrar entityName cuando está presente', () => {
    // Test with entityName prop
  });

  it('debe manejar submit sin archivo seleccionado', () => {
    // Test handleSubmit when selectedFile is null
  });

  it('debe manejar error genérico en resubmit', async () => {
    // Mock error without data.message
  });

  it('debe mostrar loading state durante resubmit', () => {
    // Test isLoading state
  });

  it('debe llamar fileInputRef.click() al seleccionar archivo', () => {
    // Test click trigger on hidden file input
  });

  it('debe limpiar archivo seleccionado', () => {
    // Test setSelectedFile(null)
  });
});
```

### FASE 3: Pages con Baja Cobertura (Prioridad Media)

#### Páginas que necesitan atención:

Revisar cada página en `pages/` y agregar tests para branches faltantes:

1. **AcopladosPage** - Agregar tests para branches no cubiertos
2. **AuditLogsPage** - Completar coverage de estados y filtros
3. **CamionesPage** - Completar coverage de filtros y acciones
4. **ChoferesPage** - Completar coverage de modales y validaciones
5. **ClientRequirementsPage** - Tests de configuraciones
6. **ClientsPage** - Tests de CRUD completo
7. **ConsultaPage** - Tests de búsqueda y filtros
8. **DadoresPage** - Tests de gestión de dadores
9. **DashboardDadoresPage** - Tests de métricas y gráficos
10. **DocumentosMainPage** - Tests de navegación y estados
11. **DocumentosPage** - Tests de listado y filtros
12. **EmpresaTransportistaDetailPage** - Tests de detalle completo
13. **EmpresasTransportistasPage** - Tests de listado y acciones
14. **EquiposPage** - Tests de estados y semáforos (ya existe algo)
15. **EstadoEquipoPage** - Tests de estados y transiciones
16. **EvolutionConfigPage** - Tests de configuración Evolution
17. **ExtractedDataPage** - Tests de datos extraídos
18. **FlowiseConfigPage** - Tests de config Flowise
19. **NotificationsConfigPage** - Tests de notificaciones
20. **TemplatesPage** - Tests de gestión de templates

### FASE 4: Tests Integrales (Prioridad Baja)

#### Archivo: `__tests__/documentos-feature.integrals.test.ts`

Tests de flujos completos:

1. **Flujo de aprobación de documento:**
   - Upload → Pending → Approved → Download
   - Upload → Pending → Rejected → Resubmit → Approved

2. **Flujo de subida masiva:**
   - Selección múltiple → Upload → Clasificación IA → Aprobación

3. **Flujo de gestión de templates:**
   - Crear → Editar → Activar/Desactivar → Eliminar

## Patrones de Tests a Utilizar

### Mocks de API:

```typescript
// Mocks consistentes para RTK Query
const mockGetDocuments = (documents: Document[]) => {
  (documentosApiSlice.endpoints.getDocuments.select as jest.Mock).mockReturnValue({
    data: documents,
  });
};

// Mock de hooks
const mockUseUploadBatchDocsTransportistasMutation = () => {
  const [uploadBatch] = useStateMutation(uploadBatchDocsTransportistas);
  return { uploadBatch, isLoading: false };
};
```

### Helpers:

```typescript
// Helper para crear mock de documento
const createMockDocument = (overrides?: Partial<Document>): Document => ({
  id: 1,
  fileName: 'test.pdf',
  status: 'PENDIENTE',
  uploadedAt: new Date().toISOString(),
  templateId: 1,
  entityType: 'CHOFER',
  entityId: '12345678',
  ...overrides,
});

// Helper para mock File
const createMockFile = (name: string, size: number): File => {
  const file = new File(['content'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};
```

## Ejecución del Plan

### Orden de Implementación (de mayor a menor impacto):

1. ✅ **Fase 1: API** - Mayor impacto, base de todo
2. ✅ **Fase 2: Componentes Críticos** - Componentes reutilizables
3. ✅ **Fase 3: Pages** - Cobertura de flujos de usuario
4. ✅ **Fase 4: Integrales** - Validación de flujos completos

### Comandos Útiles:

```bash
# Ejecutar tests de la carpeta documentos
npm test -- apps/frontend/src/features/documentos

# Ejecutar tests con cobertura
npm test -- --coverage apps/frontend/src/features/documentos

# Ejecutar tests específicos
npm test -- apps/frontend/src/features/documentos/api/__tests__/documentosApiSlice.gap-coverage.test.ts
```

## Métricas de Éxito

Al completar el plan,我们应该 alcanzar:

- **API**: >93% statements, >93% branches, >93% functions
- **Components**: >93% statements, >93% branches, >93% functions
- **Pages**: >93% statements, >93% branches, >93% functions
- **Total documentos**: >93% en todas las métricas

## Notas Importantes

1. **Mantener tests existentes** - No modificar tests que ya pasan
2. **Usar nombres descriptivos** - Los tests deben documentar el comportamiento
3. **Evitar mocking excesivo** - Solo mockear lo necesario
4. **Tests independientes** - Cada test debe poder ejecutarse solo
5. **Seguir patrones existentes** - Mantener consistencia con tests actuales

## Recursos de Referencia

- Tests existentes en `apps/frontend/src/features/documentos/**/__tests__/`
- Documentación de Vitest: https://vitest.dev/
- Documentación de Testing Library: https://testing-library.com/
- Coverage reports en `apps/frontend/coverage/lcov-report/`
