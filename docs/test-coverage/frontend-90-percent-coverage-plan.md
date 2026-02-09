# Plan de Cobertura de Tests - Frontend 90%

**Proyecto**: Frontend Test Coverage Improvement
**Generado**: 2025-01-21
**Objetivo**: Aumentar cobertura de tests del 63% actual al 90%
**Ruta de guardado**: `docs/test-coverage/frontend-90-percent-coverage-plan.md`

---

## Resumen Ejecutivo

**Estado Actual de Cobertura:**
| Métrica | Actual | Objetivo | Gap |
|---------|--------|----------|-----|
| Statements | 63.39% (6198/9777) | 90% | +26.61% |
| Branches | 55.52% (4135/7447) | 90% | +34.48% |
| Functions | 56.17% (1597/2843) | 90% | +33.83% |
| Lines | 65.21% (5634/8639) | 90% | +24.79% |

**Archivos Analizados:**
- Total archivos de código fuente: ~484 archivos `.ts`/`.tsx`
- Archivos de tests existentes: ~200 archivos `.test.ts`/`.test.tsx`
- Ratio actual: ~1 test por cada 2.4 archivos de código

---

## Technical Context & Standards

**Stack Detectado:**
- **Framework**: React 18.2.0 + TypeScript
- **State Management**: Redux Toolkit (@reduxjs/toolkit)
- **Router**: React Router DOM v7.5.0
- **Testing**: Jest 30.0.4 + Testing Library (@testing-library/react)
- **Styling**: Tailwind CSS + Radix UI
- **Validation**: Zod
- **HTTP Client**: Axios
- **Real-time**: Socket.io-client

**Patrones Detectados:**
- Los tests se organizan en carpetas `__tests__/` o como archivos `.test.ts/.tsx` co-locados
- Redux slices en `src/store/` con estructura estándar de RTK
- API slices en `src/features/*/api/`
- Custom hooks en `src/hooks/`
- Páginas en `src/features/*/pages/` y `src/pages/`
- Utils en `src/utils/` y `src/lib/`

**Convenios de Testing:**
- Mocks por test, no globales (ver `src/test-utils/mocks/`)
- Setup file: `jest.setup.cjs`
- Configuración de coverage en `jest.config.cjs`
- Transformers: SWC/Jest para TypeScript

---

## Estrategia General

### Enfoque Incremental por Fases

1. **Fase 1: Ganancia Rápida (Low Hanging Fruit)** - Utils, Helpers, Hooks simples
2. **Fase 2: Componentes UI** - Componentes de presentación y Radix UI
3. **Fase 3: Hooks Personalizados** - Custom hooks complejos
4. **Fase 4: Redux Slices y Store** - Lógica de estado
5. **Fase 5: Servicios y API** - Lógica de negocio y API calls
6. **Fase 6: Páginas y Componentes de Features** - Componentes completos

### Priorización

- **Alta prioridad**: Utils, hooks, store (lógica reutilizable)
- **Media prioridad**: Componentes UI, servicios
- **Baja prioridad**: Páginas grandes (mejor dividirlas en sub-componentes)

---

## Phase 1: Ganancia Rápida - Utils y Helpers

**Objetivo**: +15% cobertura
**Archivos objetivo**: ~15 archivos de utilidades

### Tasks Phase 1:

- [ ] **Tests para `src/utils/apiErrors.ts`**
  Task ID: phase-1-utils-01
  > **Implementation**: Crear `src/utils/__tests__/apiErrors.test.ts`
  > **Details**: Test functions que manejan errores de API. Verificar parsing de errores, mensajes, y códigos de estado. No requiere mocking complejo.

- [ ] **Tests para `src/utils/fileHandlers.ts`**
  Task ID: phase-1-utils-02
  > **Implementation**: Crear `src/utils/__tests__/fileHandlers.test.ts`
  > **Details**: Test funciones de manejo de archivos (download, upload helpers). Mock File API y Blob.

- [ ] **Tests para `src/utils/formatters.ts`**
  Task ID: phase-1-utils-03
  > **Implementation**: Crear `src/utils/__tests__/formatters.test.ts`
  > **Details**: Test funciones de formateo (fechas, números, moneda). Usar `date-fns` mock si es necesario.

- [ ] **Tests para `src/utils/logger.ts`**
  Task ID: phase-1-utils-04
  > **Implementation**: Crear `src/utils/__tests__/logger.test.ts`
  > **Details**: Test funciones de logging. Mock `console.log`, `console.error`, etc.

- [ ] **Tests para `src/utils/validators.ts`**
  Task ID: phase-1-utils-05
  > **Implementation**: Crear `src/utils/__tests__/validators.test.ts`
  > **Details**: Test funciones de validación. Casos: válido, inválido, edge cases.

- [ ] **Tests para `src/lib/utils.ts`**
  Task ID: phase-1-utils-06
  > **Implementation**: Crear `src/lib/__tests__/utils.test.ts` (ya existe, expandir)
  > **Details**: Expandir tests existentes para `cn()` (classnames merge), y otras utilidades.

- [ ] **Tests para `src/lib/api.ts`**
  Task ID: phase-1-utils-07
  > **Implementation**: Crear `src/lib/__tests__/api.test.ts` (ya existe, expandir)
  > **Details**: Test axios instance configuration, interceptors, error handling.

- [ ] **Tests para `src/lib/runtimeEnv.ts`**
  Task ID: phase-1-utils-08
  > **Implementation**: Crear `src/lib/__tests__/runtimeEnv.test.ts`
  > **Details**: Test runtime environment variable reading. Mock `import.meta.env`.

---

## Phase 2: Hooks Personalizados - Nivel Básico

**Objetivo**: +10% cobertura
**Archivos objetivo**: Hooks simples con pocas dependencias

### Tasks Phase 2:

- [ ] **Tests para `src/hooks/useConfirmDialog.ts`**
  Task ID: phase-2-hooks-01
  > **Implementation**: Crear `src/hooks/__tests__/useConfirmDialog.test.ts`
  > **Details**: Test hook que retorna función de confirmación. Mock context si existe.

- [ ] **Tests para `src/hooks/useLoadingState.ts`**
  Task ID: phase-2-hooks-02
  > **Implementation**: Crear `src/hooks/__tests__/useLoadingState.test.ts`
  > **Details**: Test hook de loading state (boolean + setter). RenderHook de Testing Library.

- [ ] **Tests para `src/hooks/useToast.ts`**
  Task ID: phase-2-hooks-03
  > **Implementation**: Crear `src/hooks/__tests__/useToast.test.ts`
  > **Details**: Test hook de toast notifications. Mock react-toastify.

- [ ] **Tests para `src/hooks/useRoleBasedNavigation.ts`**
  Task ID: phase-2-hooks-04
  > **Implementation**: Crear `src/hooks/__tests__/useRoleBasedNavigation.test.ts`
  > **Details**: Test hook que retorna rutas basadas en rol. Mock auth state.

- [ ] **Tests para `src/hooks/useFormValidation.ts`**
  Task ID: phase-2-hooks-05
  > **Implementation**: Crear `src/hooks/__tests__/useFormValidation.test.ts`
  > **Details**: Test hook de validación de formularios. Casos: válido, inválido, touched.

- [ ] **Tests para `src/hooks/useFileUpload.ts`**
  Task ID: phase-2-hooks-06
  > **Implementation**: Crear `src/hooks/__tests__/useFileUpload.test.ts`
  > **Details**: Test hook de upload de archivos. Mock FileReader y API calls.

---

## Phase 3: Hooks Personalizados - Nivel Avanzado

**Objetivo**: +8% cobertura
**Archivos objetivo**: Hooks complejos con muchas dependencias

### Tasks Phase 3:

- [ ] **Tests para `src/hooks/useCalendarEvents.ts`**
  Task ID: phase-3-hooks-01
  > **Implementation**: Crear `src/hooks/__tests__/useCalendarEvents.test.ts`
  > **Details**: Test hook de eventos de calendario. Mock API calls, test filtering, sorting.

- [ ] **Tests para `src/hooks/useEquipoStats.ts`**
  Task ID: phase-3-hooks-02
  > **Implementation**: Crear `src/hooks/__tests__/useEquipoStats.test.ts`
  > **Details**: Test hook de estadísticas de equipos. Mock API, test loading/error/success states.

- [ ] **Tests para `src/hooks/useEventFilters.ts`**
  Task ID: phase-3-hooks-03
  > **Implementation**: Crear `src/hooks/__tests__/useEventFilters.test.ts`
  > **Details**: Test hook de filtros de eventos. Test filter application, reset, presets.

- [ ] **Tests para `src/hooks/useProfile.ts`**
  Task ID: phase-3-hooks-04
  > **Implementation**: Crear `src/hooks/__tests__/useProfile.test.ts`
  > **Details**: Test hook de perfil de usuario. Mock API calls, test CRUD operations.

- [ ] **Tests para `src/hooks/useServiceConfig.ts`**
  Task ID: phase-3-hooks-05
  > **Implementation**: Crear `src/hooks/__tests__/useServiceConfig.test.ts`
  > **Details**: Test hook de configuración de servicios. Test loading, config retrieval.

- [ ] **Tests para `src/hooks/useCameraPermissions.ts`**
  Task ID: phase-3-hooks-06
  > **Implementation**: Crear `src/hooks/__tests__/useCameraPermissions.test.ts`
  > **Details**: Test hook de permisos de cámara. Mock navigator.mediaDevices.

- [ ] **Tests para `src/hooks/useImageUpload.ts`**
  Task ID: phase-3-hooks-07
  > **Implementation**: Crear `src/hooks/__tests__/useImageUpload.test.ts`
  > **Details**: Test hook complejo de upload de imágenes. Mock FileReader, compression, API.

- [ ] **Tests para `src/hooks/useWhatsAppNotifications.ts`**
  Task ID: phase-3-hooks-08
  > **Implementation**: Crear `src/hooks/__tests__/useWhatsAppNotifications.test.ts`
  > **Details**: Test hook de notificaciones WhatsApp. Mock API, test subscription/unsubscription.

- [ ] **Tests para `src/hooks/useAutoWhatsAppNotifications.ts`**
  Task ID: phase-3-hooks-09
  > **Implementation**: Crear `src/hooks/__tests__/useAutoWhatsAppNotifications.test.ts`
  > **Details**: Este hook está marcado como complejo. Dividir en tests unitarios pequeños. Mock todas las dependencias externas.

---

## Phase 4: Redux Slices y Store

**Objetivo**: +8% cobertura
**Archivos objetivo**: Slices de Redux y store configuration

### Tasks Phase 4:

- [ ] **Tests para `src/store/store.ts`**
  Task ID: phase-4-redux-01
  > **Implementation**: Crear `src/store/__tests__/store.test.ts` (ya existe, expandir)
  > **Details**: Test store configuration, reducer combination, middleware.

- [ ] **Tests para `src/store/apiSlice.ts`**
  Task ID: phase-4-redux-02
  > **Implementation**: Crear `src/store/__tests__/apiSlice.test.ts`
  > **Details**: Test base API slice configuration. Test baseQuery, tagTypes, endpoints.

- [ ] **Tests para `src/store/uiSlice.ts`**
  Task ID: phase-4-redux-03
  > **Implementation**: Crear `src/store/__tests__/uiSlice.test.ts`
  > **Details**: Test UI reducer actions y selectors. Modals, theme, etc.

- [ ] **Tests para `src/features/auth/authSlice.ts`**
  Task ID: phase-4-redux-04
  > **Implementation**: Crear `src/features/auth/__tests__/authSlice.test.ts`
  > **Details**: Test auth reducer: login, logout, token refresh, user state.

- [ ] **Tests para `src/features/dashboard/api/dashboardApiSlice.ts`**
  Task ID: phase-4-redux-05
  > **Implementation**: Crear `src/features/dashboard/api/__tests__/dashboardApiSlice.test.ts`
  > **Details**: Test RTK Query endpoints. Mock baseQuery, test data transformation.

- [ ] **Tests para `src/features/documentos/api/documentosApiSlice.ts`**
  Task ID: phase-4-redux-06
  > **Implementation**: Crear `src/features/documentos/api/__tests__/documentosApiSlice.test.ts`
  > **Details**: Test documentos API endpoints. Mock responses, test cache tags.

- [ ] **Tests para `src/features/empresas/api/empresasApiSlice.ts`**
  Task ID: phase-4-redux-07
  > **Implementation**: Crear `src/features/empresas/api/__tests__/empresasApiSlice.test.ts`
  > **Details**: Test empresas API endpoints. CRUD operations, error handling.

- [ ] **Tests para `src/features/users/api/usersApiSlice.ts`**
  Task ID: phase-4-redux-08
  > **Implementation**: Crear `src/features/users/api/__tests__/usersApiSlice.test.ts`
  > **Details**: Test users API endpoints. List, create, update, delete.

---

## Phase 5: Servicios y Lógica de Negocio

**Objetivo**: +7% cobertura
**Archivos objetivo**: Servicios en `src/services/`

### Tasks Phase 5:

- [ ] **Tests para `src/services/websocket.service.ts`**
  Task ID: phase-5-services-01
  > **Implementation**: Crear `src/services/__tests__/websocket.service.test.ts`
  > **Details**: Test WebSocket service. Mock socket.io-client. Test connect, disconnect, events.

---

## Phase 6: Componentes UI Faltantes

**Objetivo**: +10% cobertura
**Archivos objetivo**: Componentes UI sin tests completos

### Tasks Phase 6:

- [ ] **Tests completos para componentes UI en `src/components/ui/`**
  Task ID: phase-6-ui-01
  > **Implementation**: Crear/expandir tests para:
  > - `src/components/ui/confirm-dialog.tsx`
  > - `src/components/ui/data-table.tsx`
  > - `src/components/ui/dialog.tsx`
  > - `src/components/ui/input.tsx`
  > - `src/components/ui/label.tsx`
  > - `src/components/ui/progress.tsx`
  > - `src/components/ui/select-advanced.tsx`
  > - `src/components/ui/select-full.tsx`
  > - `src/components/ui/select.tsx`
  > - `src/components/ui/spinner.tsx`
  > - `src/components/ui/switch.tsx`
  > - `src/components/ui/table.tsx`
  > - `src/components/ui/tabs.tsx`
  > - `src/components/ui/textarea.tsx`
  > - `src/components/ui/theme-toggle.tsx`
  > - `src/components/ui/toggle-switch.tsx`
  > **Details**: Cada componente en su archivo `.test.tsx`. Test rendering, user interactions, accessibility.

- [ ] **Tests para `src/components/ChangePasswordForm.tsx`**
  Task ID: phase-6-ui-02
  > **Implementation**: Crear `src/components/__tests__/ChangePasswordForm.test.tsx`
  > **Details**: Test form validation, submission, error handling.

- [ ] **Tests para `src/components/ProtectedServiceRoute.tsx`**
  Task ID: phase-6-ui-03
  > **Implementation**: Crear `src/components/__tests__/ProtectedServiceRoute.test.tsx`
  > **Details**: Test route protection based on service availability. Mock auth y service status.

- [ ] **Tests para `src/components/WebSocketStatus.tsx`**
  Task ID: phase-6-ui-04
  > **Implementation**: Crear `src/components/__tests__/WebSocketStatus.test.tsx`
  > **Details**: Test WebSocket status indicator. Test connected/disconnected/connecting states.

- [ ] **Tests para `src/components/contexts/`**
  Task ID: phase-6-ui-05
  > **Implementation**: Crear tests para:
  > - `src/contexts/confirmContext.ts` → `src/contexts/__tests__/confirmContext.test.tsx`
  > - `src/contexts/toastContext.ts` → `src/contexts/__tests__/toastContext.test.tsx`
  > **Details**: Test context providers, consumers, hooks.

---

## Phase 7: Componentes de Features - Auth

**Objetivo**: +5% cobertura
**Archivos objetivo**: Feature auth

### Tasks Phase 7:

- [ ] **Tests para `src/features/auth/components/LoginForm.tsx`**
  Task ID: phase-7-auth-01
  > **Implementation**: Crear `src/features/auth/components/__tests__/LoginForm.test.tsx`
  > **Details**: Test form submission, validation, error handling, successful login redirect.

- [ ] **Tests para `src/features/auth/components/RequireAuth.tsx`**
  Task ID: phase-7-auth-02
  > **Implementation**: Crear `src/features/auth/components/__tests__/RequireAuth.test.tsx`
  > **Details**: Test authentication wrapper. Test authenticated/unauthenticated states, redirect.

- [ ] **Tests para `src/features/auth/components/RequirePasswordChange.tsx`**
  Task ID: phase-7-auth-03
  > **Implementation**: Crear `src/features/auth/components/__tests__/RequirePasswordChange.test.tsx`
  > **Details**: Test password change requirement flow.

---

## Phase 8: Componentes de Features - Documentos

**Objetivo**: +8% cobertura
**Archivos objetivo**: Feature documentos (muy grande, prioritario)

### Tasks Phase 8:

- [ ] **Tests para componentes de documentos**
  Task ID: phase-8-docs-01
  > **Implementation**: Crear tests para:
  > - `src/features/documentos/components/CameraCapture.tsx` → `__tests__/CameraCapture.test.tsx`
  > - `src/features/documentos/components/DocumentPreview.tsx` → `__tests__/DocumentPreview.test.tsx`
  > - `src/features/documentos/components/DocumentUploadModal.tsx` → `__tests__/DocumentUploadModal.test.tsx`
  > - `src/features/documentos/components/DocumentsList.tsx` → `__tests__/DocumentsList.test.tsx`
  > - `src/features/documentos/components/DocumentsSemaforo.tsx` → `__tests__/DocumentsSemaforo.test.tsx`
  > **Details**: Test rendering, user interactions, data loading, error states.

- [ ] **Tests para páginas de documentos (prioridad alta)**
  Task ID: phase-8-docs-02
  > **Implementation**: Crear tests smoke tests para páginas:
  > - `src/features/documentos/pages/ConsultaPage.tsx` → `__tests__/ConsultaPage.smoke.test.tsx`
  > - `src/features/documentos/pages/ApprovalQueuePage.tsx` → `__tests__/ApprovalQueuePage.smoke.test.tsx`
  > - `src/features/documentos/pages/ApprovalDetailPage.tsx` → `__tests__/ApprovalDetailPage.smoke.test.tsx`
  > - `src/features/documentos/pages/EstadoEquipoPage.tsx` → `__tests__/EstadoEquipoPage.smoke.test.tsx`
  > **Details**: Smoke tests: verifica que la página renderiza sin crash. Para tests completos, considerar dividir estas páginas en componentes más pequeños.

---

## Phase 9: Componentes de Features - Equipos

**Objetivo**: +4% cobertura
**Archivos objetivo**: Feature equipos

### Tasks Phase 9:

- [ ] **Tests para componentes de equipos**
  Task ID: phase-9-equipos-01
  > **Implementation**: Crear tests para:
  > - `src/features/equipos/components/DocumentoField.tsx` → `__tests__/DocumentoField.test.tsx`
  > - `src/features/equipos/components/SeccionDocumentos.tsx` → `__tests__/SeccionDocumentos.test.tsx`
  > **Details**: Test rendering de campos de documentos, validación, submission.

- [ ] **Tests para páginas de equipos**
  Task ID: phase-9-equipos-02
  > **Implementation**: Crear smoke tests para:
  > - `src/features/equipos/pages/AltaEquipoCompletaPage.tsx` → `__tests__/AltaEquipoCompletaPage.smoke.test.tsx`
  > - `src/features/equipos/pages/EditarEquipoPage.tsx` → `__tests__/EditarEquipoPage.smoke.test.tsx`
  > **Details**: Smoke tests básicos. Considerar refactorización para components más testables.

---

## Phase 10: Páginas Principales

**Objetivo**: +5% cobertura
**Archivos objetivo**: Páginas en `src/pages/`

### Tasks Phase 10:

- [ ] **Tests para páginas principales**
  Task ID: phase-10-pages-01
  > **Implementation**: Crear smoke tests para:
  > - `src/pages/LoginPage.tsx` → `__tests__/LoginPage.smoke.test.tsx`
  > - `src/pages/DashboardPage.tsx` → `__tests__/DashboardPage.smoke.test.tsx`
  > - `src/pages/PerfilPage.tsx` → `__tests__/PerfilPage.smoke.test.tsx`
  > - `src/pages/UsuariosPage.tsx` → `__tests__/UsuariosPage.smoke.test.tsx`
  > **Details**: Smoke tests que verifican renderizado básico. Para mejorar, extraer lógica a custom hooks y components.

- [ ] **Tests para páginas de portales**
  Task ID: phase-10-pages-02
  > **Implementation**: Crear smoke tests para:
  > - `src/pages/ClientePortalPage.tsx` → `__tests__/ClientePortalPage.smoke.test.tsx`
  > - `src/pages/DadoresPortalPage.tsx` → `__tests__/DadoresPortalPage.smoke.test.tsx`
  > - `src/pages/TransportistasPortalPage.tsx` → `__tests__/TransportistasPortalPage.smoke.test.tsx`
  > - `src/pages/AdminInternoPortalPage.tsx` → `__tests__/AdminInternoPortalPage.smoke.test.tsx`
  > **Details**: Smoke tests básicos. Considerar crear components comunes para reducir duplicación.

---

## Phase 11: Features Adicionales

**Objetivo**: +5% cobertura
**Archivos objetivo**: Features sin tests completos

### Tasks Phase 11:

- [ ] **Tests para feature Clientes**
  Task ID: phase-11-features-01
  > **Implementation**: Crear tests para:
  > - `src/features/cliente/pages/ClienteDashboard.tsx` → `__tests__/ClienteDashboard.smoke.test.tsx`
  > - `src/features/cliente/pages/ClienteEquipoDetalle.tsx` → `__tests__/ClienteEquipoDetalle.smoke.test.tsx`
  > **Details**: Smoke tests. Extraer lógica a hooks y components.

- [ ] **Tests para feature Chofer**
  Task ID: phase-11-features-02
  > **Implementation**: Crear tests para:
  > - `src/features/chofer/pages/ChoferDashboard.tsx` → `__tests__/ChoferDashboard.smoke.test.tsx`
  > **Details**: Smoke test básico.

- [ ] **Tests para feature Dador**
  Task ID: phase-11-features-03
  > **Implementation**: Crear tests para:
  > - `src/features/dador/pages/DadorDashboard.tsx` → `__tests__/DadorDashboard.smoke.test.tsx`
  > **Details**: Smoke test básico.

- [ ] **Tests para feature Transportista**
  Task ID: phase-11-features-04
  > **Implementation**: Crear tests para:
  > - `src/features/transportista/pages/TransportistaDashboard.tsx` → `__tests__/TransportistaDashboard.smoke.test.tsx`
  > **Details**: Smoke test básico.

- [ ] **Tests para feature Remitos**
  Task ID: phase-11-features-05
  > **Implementation**: Crear tests para:
  > - `src/features/remitos/components/RemitoCard.tsx` → `__tests__/RemitoCard.test.tsx`
  > - `src/features/remitos/components/RemitoDetail.tsx` → `__tests__/RemitoDetail.test.tsx`
  > - `src/features/remitos/components/RemitoUploader.tsx` → `__tests__/RemitoUploader.test.tsx`
  > - `src/features/remitos/pages/RemitosPage.tsx` → `__tests__/RemitosPage.smoke.test.tsx`
  > **Details**: Test componentes de remitos. Mock API calls y file upload.

---

## Phase 12: Componentes Comunes Faltantes

**Objetivo**: +3% cobertura
**Archivos objetivo**: Componentes comunes sin tests

### Tasks Phase 12:

- [ ] **Tests para `src/components/ErrorBoundary.tsx`**
  Task ID: phase-12-common-01
  > **Implementation**: Crear `src/components/__tests__/ErrorBoundary.test.tsx`
  > **Details**: Test error boundary. Simular error con componente defectuoso, verificar fallback UI.

- [ ] **Tests para `src/components/AuthInitializer.tsx`**
  Task ID: phase-12-common-02
  > **Implementation**: Crear `src/components/__tests__/AuthInitializer.test.tsx`
  > **Details**: Test inicialización de auth. Mock auth check y redirect.

---

## Guidelines de Testing

### 1. Patrón AAA (Arrange-Act-Assert)

```typescript
describe('MiComponente', () => {
  it('should do something', () => {
    // Arrange: Setup del test
    const mockFn = jest.fn();
    render(<MiComponente onClick={mockFn} />);

    // Act: Ejecutar la acción
    fireEvent.click(screen.getByRole('button'));

    // Assert: Verificar resultado
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
```

### 2. Mocking de Dependencias

**Para API calls:**
```typescript
// Mock de axios o API slice
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(() => Promise.resolve({ data: {} }))
  }
}));
```

**Para hooks:**
```typescript
// Usar renderHook de Testing Library
import { renderHook } from '@testing-library/react';
import { useMiHook } from '../useMiHook';

test('useMiHook funciona', () => {
  const { result } = renderHook(() => useMiHook());
  expect(result.current.value).toBe('expected');
});
```

### 3. Testing de Redux Slices

```typescript
import { reducer } from './authSlice';
import { loginSuccess, logout } from './authSlice';

describe('authSlice', () => {
  const initialState = {
    user: null,
    isAuthenticated: false,
    token: null
  };

  it('should handle loginSuccess', () => {
    const action = loginSuccess({ user: { id: '1' }, token: 'abc' });
    const state = reducer(initialState, action);
    expect(state.isAuthenticated).toBe(true);
  });
});
```

### 4. Testing de RTK Query

```typescript
import { api } from './dashboardApiSlice';
import { matchRequestsById } from '../../test-utils/mocks/api.mocks';

describe('dashboardApiSlice', () => {
  it('should get dashboard data', async () => {
    const { data } = await api.endpoints.getDashboard.initiate({ id: '1' });
    // Assertions sobre data transformada
  });
});
```

### 5. Testing de Componentes con Router

```typescript
import { BrowserRouter } from 'react-router-dom';

const renderWithRouter = (component) => {
  render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};
```

---

## Recomendaciones de Refactorización

### Para Hacer Components más Testables

1. **Extraer lógica a hooks personalizados**
   - En lugar de tener toda la lógica en el componente, crear hooks reutilizables
   - Los hooks son más fáciles de testear en aislamiento

2. **Inyectar dependencias**
   - Usar props para inyectar callbacks y dependencies
   - Facilita mocking

3. **Dividir componentes grandes**
   - Páginas grandes (>500 líneas) deberían dividirse
   - Crear sub-componentes con responsabilidades específicas

4. **Usar composition**
   - Componentes compuestos de otros componentes más pequeños
   - Cada sub-componente se puede testear independientemente

### Ejemplo de Refactorización

**Antes (difícil de testear):**
```typescript
export const MiPagina = () => {
  // 300 líneas de lógica
  const [data, setData] = useState();
  const [loading, setLoading] = useState(false);
  // ... más lógica ...

  return <div>...</div>;
};
```

**Después (fácil de testear):**
```typescript
// Hook con la lógica
export const useMiPaginaLogic = () => {
  // Lógica extraída
  return { data, loading, /* ... */ };
};

// Componente de presentación
export const MiPaginaView = ({ data, loading }) => {
  return <div>...</div>;
};

// Componente contenedor
export const MiPagina = () => {
  const logic = useMiPaginaLogic();
  return <MiPaginaView {...logic} />;
};
```

---

## Métricas y Progreso

### Tabla de Seguimiento

| Phase | Descripción | Ganancia Estimada | Completo |
|-------|-------------|-------------------|----------|
| 1 | Utils y Helpers | +15% | ☐ |
| 2 | Hooks Básicos | +10% | ☐ |
| 3 | Hooks Avanzados | +8% | ☐ |
| 4 | Redux Slices | +8% | ☐ |
| 5 | Servicios | +7% | ☐ |
| 6 | Componentes UI | +10% | ☐ |
| 7 | Feature Auth | +5% | ☐ |
| 8 | Feature Documentos | +8% | ☐ |
| 9 | Feature Equipos | +4% | ☐ |
| 10 | Páginas Principales | +5% | ☐ |
| 11 | Features Adicionales | +5% | ☐ |
| 12 | Componentes Comunes | +3% | ☐ |
| **TOTAL** | **63% → 90%** | **+27%** | ☐ |

### Comandos Útiles

```bash
# Ejecutar tests con coverage
cd apps/frontend
npm run test:coverage

# Ver reporte HTML
open coverage/lcov-report/index.html

# Ejecutar tests en watch mode
npm run test:watch

# Ejecutar tests de un archivo específico
npm test -- path/to/test.test.tsx

# Ver coverage de un archivo específico
npm test -- --coverage --collectCoverageFrom=src/utils/*.ts
```

---

## Cronograma Sugerido

### Semana 1-2: Phases 1-3 (Utils + Hooks)
- Ganancia estimada: +33%
- Prioridad alta, baja complejidad

### Semana 3-4: Phases 4-6 (Redux + UI Components)
- Ganancia estimada: +25%
- Testing de state y componentes reutilizables

### Semana 5-6: Phases 7-9 (Features Principales)
- Ganancia estimada: +17%
- Auth, Documentos, Equipos

### Semana 7-8: Phases 10-12 (Páginas + Features Adicionales)
- Ganancia estimada: +13%
- Completar cobertura al 90%

---

## Notas Importantes

1. **No excluir archivos temporalmente**: La configuración actual de Jest no excluye archivos difíciles. Mantener así para asegurar cobertura real.

2. **Tests smoke vs tests completos**: Para páginas muy grandes, empezar con smoke tests que verifican renderizado básico. Luego, refactorizar para components más testables.

3. **Monitoreo continuo**: Ejecutar `npm run test:coverage` después de cada phase para verificar progreso real.

4. **Refactorización permitida**: Si un archivo es muy difícil de testear, está bien refactorizarlo primero para hacerlo más testable.

5. **Mocks por test**: Seguir el patrón establecido de mocks por test, no globales.

---

*Generado por Clavix /clavix:plan*
*Última actualización: 2025-01-21*
