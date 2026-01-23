# Implementation Plan: Cobertura SonarQube 90%+ - Platform Users

**Project**: platform-users-coverage-90
**Generated**: 2025-01-21T10:00:00Z
**Target**: ≥90% coverage en `frontend/src/features/platform-users`

---

## Technical Context & Standards

**Detected Stack & Patterns:**
- **Framework**: React 18 con TypeScript
- **Testing**: Jest + React Testing Library (RTL)
- **State Management**: Redux Toolkit (@reduxjs/toolkit)
- **Forms**: react-hook-form + Controller
- **Mocking**: `jest.unstable_mockModule` para ESM, mocks en `src/test-utils/mocks/`
- **Conventions**:
  - Tests en carpetas `__tests__` junto al código
  - Smoke tests: importación básica
  - Render tests: renderizado condicional
  - Unit tests: lógica de componentes
  - `describe`/`it` de `@jest/globals`
  - Mocking con `jest.unstable_mockModule` y `jest.fn()`

**Archivos bajo test:**
```
frontend/src/features/platform-users/
├── api/
│   └── platformUsersApiSlice.ts      (165 líneas)
├── components/
│   ├── EditPlatformUserModal.tsx     (813 líneas)
│   └── RegisterUserModal.tsx         (1037 líneas)
└── pages/
    └── PlatformUsersPage.tsx         (146 líneas)
```

**Tests existentes:**
```
├── __tests__/platform-users.smoke.test.ts
├── api/__tests__/platformUsersApiSlice.smoke.test.ts
├── components/__tests__/
│   ├── EditPlatformUserModal.smoke.test.tsx
│   ├── EditPlatformUserModal.test.tsx
│   ├── EditPlatformUserModal.render.test.tsx
│   ├── RegisterUserModal.smoke.test.tsx
│   └── RegisterUserModal.render.test.tsx
└── pages/__tests__/
    ├── PlatformUsersPage.smoke.test.ts
    └── PlatformUsersPage.test.tsx
```

---

## Phase 1: API Slice Coverage (platformUsersApiSlice.ts)

**Objetivo**: Cubrir lógica de query params, mutations y hooks

- [ ] **Extender tests de API slice con query params y mutations**
  Task ID: phase-1-api-01
  > **Implementation**: Crear `api/__tests__/platformUsersApiSlice.query.test.ts`
  > **Details**:
  > - Probar construcción de query params con URLSearchParams
  > - Probar parámetros: page, limit, search, role, empresaId
  > - Provar timestamp de cache-busting (`Date.now()`)
  > - Verificar `providesTags` y `invalidatesTags` en cada endpoint
  > - Mockear `apiSlice.injectEndpoints` para verificar configuración

- [ ] **Tests de hooks generados por RTK Query**
  Task ID: phase-1-api-02
  > **Implementation**: Agregar a `api/__tests__/platformUsersApiSlice.hooks.test.ts`
  > **Details**:
  > - Verificar exportación de todos los hooks (useListPlatformUsersQuery, etc.)
  > - Probar que los hooks retornan estructura esperada `{ data, isLoading, error, refetch }`
  > - Verificar estructura de mutation `[trigger, { isLoading }]`

---

## Phase 2: EditPlatformUserModal Coverage

**Objetivo**: Cubrir branches de roles, validación, errores, efectos

- [ ] **Tests de edición restringida (DADOR_DE_CARGA, TRANSPORTISTA)**
  Task ID: phase-2-edit-01
  > **Implementation**: Crear `components/__tests__/EditPlatformUserModal.restricted.test.tsx`
  > **Details**:
  > - Mock currentUser con role='DADOR_DE_CARGA' o 'TRANSPORTISTA'
  > - Verificar que email y rol son read-only
  > - Verificar que solo nombre, apellido y password son editables
  > - Probar payload de update (sin email ni role)

- [ ] **Tests de cascada Dador → Transportista → Chofer**
  Task ID: phase-2-edit-02
  > **Implementation**: Extender `components/__tests__/EditPlatformUserModal.cascade.test.tsx`
  > **Details**:
  > - Role CHOFER: probar que cambiar dador resetea transportista y chofer
  > - Role CHOFER: probar que cambiar transportista resetea chofer
  > - Verificar useEffect de inicialización con user.dadorCargaId
  > - Verificar useEffect de fallback con transportistaActual/choferActual

- [ ] **Tests de búsqueda y filtrado**
  Task ID: phase-2-edit-03
  > **Implementation**: Extender `components/__tests__/EditPlatformUserModal.search.test.tsx`
  > **Details**:
  > - Probar searchTransportista filtra transportistasRaw
  > - Probar searchChofer filtra choferesConActual
  > - Verificar búsqueda por nombre, CUIT/DNI
  > - Probar límite de 50 resultados en filtered arrays

- [ ] **Tests de update con diferentes roles objetivo**
  Task ID: phase-2-edit-04
  > **Implementation**: Extender `components/__tests__/EditPlatformUserModal.update.test.tsx`
  > **Details**:
  > - Probar update exitoso para rol DADOR_DE_CARGA (payload con dadorCargaId)
  > - Probar update para rol TRANSPORTISTA (payload con empresaTransportistaId)
  > - Probar update para rol CHOFER (payload con choferId y empresaTransportistaId)
  > - Probar update para rol CLIENTE (payload con clienteId)
  > - Verificar limpieza de asociaciones no relevantes al rol

- [ ] **Tests de manejo de errores**
  Task ID: phase-2-edit-05
  > **Implementation**: Extender `components/__tests__/EditPlatformUserModal.errors.test.tsx`
  > **Details**:
  > - Mock updateUserMutation rechazando con error
  > - Verificar showToast con mensaje de error
  > - Verificar que modal NO se cierra en caso de error

- [ ] **Tests de reset de estados**
  Task ID: phase-2-edit-06
  > **Implementation**: Extender `components/__tests__/EditPlatformUserModal.reset.test.tsx`
  > **Details**:
  > - Probar reset al cerrar modal (isOpen=false)
  > - Probar reset cuando selectedRole cambia de TRANSPORTISTA/CHOFER
  > - Verificar reset de searchTransportista y searchChofer

- [ ] **Tests de elementos actuales no en lista filtrada**
  Task ID: phase-2-edit-07
  > **Implementation**: Extender `components/__tests__/EditPlatformUserModal.currentItem.test.tsx`
  > **Details**:
  > - Probar que transportistaActual se incluye si no está en transportistas
  > - Probar que choferActual se incluye si no está en choferes
  > - Verificar lógica de `existsInList` y `currentItem`

---

## Phase 3: RegisterUserModal Coverage

**Objetivo**: Cubrir wizards, validaciones, permisos, errores

- [ ] **Tests de wizard CLIENTE**
  Task ID: phase-3-register-01
  > **Implementation**: Crear `components/__tests__/RegisterUserModal.cliente.test.tsx`
  > **Details**:
  > - Probar submit con clienteMode='existing'
  > - Probar submit con clienteMode='new' (crea cliente + usuario)
  > - Verificar llamada a createClientMutation y registerClientWizardMutation
  > - Verificar password no se muestra en modo CLIENTE
  > - Probar validación: clienteId requerido en modo existing
  > - Probar validación: clienteRazonSocial y clienteCuit requeridos en modo new

- [ ] **Tests de wizard DADOR_DE_CARGA**
  Task ID: phase-3-register-02
  > **Implementation**: Crear `components/__tests__/RegisterUserModal.dador.test.tsx`
  > **Details**:
  > - Probar submit con dadorMode='existing'
  > - Probar submit con dadorMode='new' (crea dador + usuario)
  > - Verificar llamada a createDadorMutation y registerDadorWizardMutation
  > - Probar validación: dadorCargaId requerido en modo existing
  > - Probar validación: dadorRazonSocial y dadorCuit requeridos en modo new

- [ ] **Tests de wizard TRANSPORTISTA**
  Task ID: phase-3-register-03
  > **Implementation**: Crear `components/__tests__/RegisterUserModal.transportista.test.tsx`
  > **Details**:
  > - Probar submit con transportistaMode='existing'
  > - Probar submit con transportistaMode='new'
  > - Probar asociación automática para DADOR_DE_CARGA (currentUser.dadorCargaId)
  > - Verificar llamada a createEmpresaTransportistaMutation y registerTransportistaWizardMutation

- [ ] **Tests de wizard CHOFER**
  Task ID: phase-3-register-04
  > **Implementation**: Crear `components/__tests__/RegisterUserModal.chofer.test.tsx`
  > **Details**:
  > - Probar submit con choferMode='existing'
  > - Probar submit con choferMode='new'
  > - Probar asociación automática para DADOR_DE_CARGA y TRANSPORTISTA
  > - Verificar cascada: dador → transportista → chofer

- [ ] **Tests de validación de password**
  Task ID: phase-3-register-05
  > **Implementation**: Crear `components/__tests__/RegisterUserModal.password.test.tsx`
  > **Details**:
  > - Probar validación required: password requerido
  > - Probar validación minLength: mínimo 8 caracteres
  > - Probar validación pattern: mayúscula, minúscula y número
  > - Verificar que password NO se requiere para roles wizard (CLIENTE)

- [ ] **Tests de permisos por rol del usuario actual**
  Task ID: phase-3-register-06
  > **Implementation**: Crear `components/__tests__/RegisterUserModal.permissions.test.tsx`
  > **Details**:
  > - SUPERADMIN: puede crear todos los roles
  > - ADMIN: puede crear todos menos SUPERADMIN
  > - DADOR_DE_CARGA: puede crear TRANSPORTISTA y CHOFER
  > - TRANSPORTISTA: puede crear CHOFER
  > - Verificar matriz PERMISOS_CREACION

- [ ] **Tests de empresa obligatoria**
  Task ID: phase-3-register-07
  > **Implementation**: Crear `components/__tests__/RegisterUserModal.empresa.test.tsx`
  > **Details**:
  > - Verificar error si no se selecciona empresa
  > - Probar que empresaId se usa de currentUser para no-SUPERADMIN
  > - Probar useEffect que setea empresaId al abrir modal

- [ ] **Tests de modal de contraseña temporal**
  Task ID: phase-3-register-08
  > **Implementation**: Crear `components/__tests__/RegisterUserModal.tempPassword.test.tsx`
  > **Details**:
  > - Probar display de tempPasswordToShow después de wizard exitoso
  > - Provar botón "Copiar" llama a navigator.clipboard.writeText
  > - Probar botón "Listo" reset form y cierra modal
  > - Manejar caso donde clipboard no está disponible

- [ ] **Tests de reset de estados al cambiar rol**
  Task ID: phase-3-register-09
  > **Implementation**: Crear `components/__tests__/RegisterUserModal.reset.test.tsx`
  > **Details**:
  > - Probar useEffect que resetea estados al cambiar de TRANSPORTISTA
  > - Probar reset al cambiar de CHOFER
  > - Probar reset al cambiar de CLIENTE (clear clienteRazonSocial, etc.)
  > - Probar reset al cambiar de DADOR_DE_CARGA

- [ ] **Tests de manejo de errores**
  Task ID: phase-3-register-10
  > **Implementation**: Crear `components/__tests__/RegisterUserModal.errors.test.tsx`
  > **Details**:
  > - Mock mutations rechazando con error
  > - Verificar showToast con mensaje de error
  > - Verificar que modal NO se cierra en caso de error
  > - Probar error cuando finalEmpresaId es undefined

---

## Phase 4: PlatformUsersPage Coverage

**Objetivo**: Cubrir paginación, estados vacíos, errores

- [ ] **Tests de paginación**
  Task ID: phase-4-page-01
  > **Implementation**: Extender `pages/__tests__/PlatformUsersPage.pagination.test.tsx`
  > **Details**:
  > - Probar botón "Anterior" decrementa página (page > 1)
  > - Probar botón "Siguiente" incrementa página (page < totalPages)
  > - Verificar botones disabled en límites
  > - Probar cálculo de "Mostrando X - Y de Z usuarios"

- [ ] **Tests de estado vacío**
  Task ID: phase-4-page-02
  > **Implementation**: Extender `pages/__tests__/PlatformUsersPage.empty.test.tsx`
  > **Details**:
  > - Probar renderizado con data.data = []
  > - Verificar que tabla se muestra sin filas

- [ ] **Tests de errores de mutations**
  Task ID: phase-4-page-03
  > **Implementation**: Extender `pages/__tests__/PlatformUsersPage.mutations.test.tsx`
  > **Details**:
  > - Probar toggleActivo con error (muestra toast)
  > - Probar deleteUser con error (muestra toast)
  > - Verificar que refetch NO se llama en caso de error

- [ ] **Tests de interacción de búsqueda**
  Task ID: phase-4-page-04
  > **Implementation**: Extender `pages/__tests__/PlatformUsersPage.search.test.tsx`
  > **Details**:
  > - Probar typing en input de búsqueda actualiza estado
  > - Probar click en "Buscar" resetea page a 1 y llama refetch
  > - Verificar que search se pasa en query params

- [ ] **Tests de loading state**
  Task ID: phase-4-page-05
  > **Implementation**: Extender `pages/__tests__/PlatformUsersPage.loading.test.tsx`
  > **Details**:
  > - Probar renderizado de Spinner cuando isLoading=true
  > - Verificar que tabla NO se muestra durante loading

---

## Phase 5: Helpers y Mocks Avanzados

**Objetivo**: Crear helpers reutilizables para tests complejos

- [ ] **Crear helper de renderizado con Redux Store real**
  Task ID: phase-5-helpers-01
  > **Implementation**: Crear `src/test-utils/platform-users/testHelpers.tsx`
  > **Details**:
  > - `renderWithAuthUser(ui, userRole)`: wrapper con Provider + MemoryRouter + store configurado
  > - `createMockUser(overrides)`: factory para crear usuario mock
  > - `waitForMutation()`: helper para esperar que se llame a una mutation

- [ ] **Crear mocks de RTK Query con estado controlable**
  Task ID: phase-5-helpers-02
  > **Implementation**: Extender `src/test-utils/mocks/api.mocks.ts`
  > **Details**:
  > - Agregar `createPlatformUsersApiMock` con mutations controlables
  > - Permitir `shouldError` y `isLoading` en cada mutation
  > - Agregar mock de `useUpdatePlatformUserMutation`

- [ ] **Crear fixtures de datos de prueba**
  Task ID: phase-5-helpers-03
  > **Implementation**: Crear `src/test-utils/platform-users/fixtures.ts`
  > **Details**:
  > - `mockDadores`: array de dadores mock
  > - `mockTransportistas`: array de transportistas mock
  > - `mockChoferes`: array de choferes mock
  > - `mockClientes`: array de clientes mock
  > - `mockEmpresas`: array de empresas mock

---

## Phase 6: Ejecución y Validación

**Objetivo**: Verificar que se alcanza ≥90% de cobertura

- [ ] **Ejecutar tests con cobertura**
  Task ID: phase-6-validate-01
  > **Implementation**: Ejecutar comando `npm run test:coverage -- src/features/platform-users`
  > **Details**:
  > - Revisar reporte de cobertura en `coverage/lcov-report/index.html`
  > - Verificar porcentaje de líneas ≥90%
  > - Verificar porcentaje de branches ≥85%

- [ ] **Iterar en gaps残antes**
  Task ID: phase-6-validate-02
  > **Implementation**: Agregar tests adicionales para líneas no cubiertas
  > **Details**:
  > - Revisar archivo `coverage/lcov.info` para identificar líneas específicas
  > - Agregar tests para branches condicionales faltantes
  > - Priorizar líneas de lógica de negocio sobre líneas de UI

- [ ] **Validar que todos los tests pasan**
  Task ID: phase-6-validate-03
  > **Implementation**: Ejecutar `npm run test -- src/features/platform-users`
  > **Details**:
  > - Verificar que no hay tests failing
  > - Verificar que no hay console.errors durante tests

---

## Gaps Específicos Identificados

### platformUsersApiSlice.ts
| Línea | Código | Gap |
|-------|--------|-----|
| 44-51 | Construcción de query params | No probado |
| 51 | Cache busting timestamp | No probado |
| 54, 63, 75, 87, 99, 111, 120, 128, 137, 146 | Tags | No probado |

### EditPlatformUserModal.tsx
| Línea | Código | Gap |
|-------|--------|-----|
| 61-63 | isRestrictedEditor | No probado |
| 73-75 | Inicialización de estados con user data | Parcialmente probado |
| 155-162 | Filtrado de transportistas | No probado |
| 174-182 | Filtrado de choferes | No probado |
| 209-224 | useEffect de inicialización TRANSPORTISTA | No probado |
| 228-247 | useEffect de inicialización CHOFER | No probado |
| 312-322 | Update restringido | No probado |
| 341-354 | Limpieza de asociaciones por rol | Parcialmente probado |

### RegisterUserModal.tsx
| Línea | Código | Gap |
|-------|--------|-----|
| 232-276 | Wizard CLIENTE | Parcialmente probado |
| 279-323 | Wizard DADOR_DE_CARGA | Parcialmente probado |
| 326-376 | Wizard TRANSPORTISTA | Parcialmente probado |
| 379-430 | Wizard CHOFER | Parcialmente probado |
| 962-965 | Validación de password | No probado |
| 1009-1011 | Clipboard copy | No probado |
| 168-172 | useEffect empresaId automático | No probado |
| 182-205 | useEffect reset por rol | No probado |

### PlatformUsersPage.tsx
| Línea | Código | Gap |
|-------|--------|-----|
| 20-27 | handleToggleActivo con error | No probado |
| 112-130 | Paginación | No probado |
| 109-110 | Cálculo de rango "Mostrando X-Y de Z" | No probado |

---

## Priorización de Implementación

**Orden recomendado:**
1. Phase 5 (Helpers) → Facilita tests siguientes
2. Phase 2 (EditModal) → Mayor complejidad, más gaps
3. Phase 3 (RegisterModal) → Segunda mayor complejidad
4. Phase 1 (API) → Tests unitarios simples
5. Phase 4 (Page) → Tests ya existen, solo extender
6. Phase 6 (Validación) → Verificar objetivo

---

*Generated by Clavix /clavix:plan*