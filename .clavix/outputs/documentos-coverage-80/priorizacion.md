# Estrategia de Priorización - Cobertura 80% Feature Documentos

**Fecha**: 2025-01-16
**Baseline Actual**: ~47% statements overall

## Análisis Por Archivos

### API Layer - PRIORIDAD 1 (32.45% → 80%)

| Archivo | LOC | Cobertura Actual | Gap a 80% | Estimación |
|---------|-----|------------------|-----------|------------|
| `documentosApiSlice.ts` | ~2000 | 32.45% | +47.55% | 6-8 horas |

**Razón**: 133 endpoints, solo están testeados los básicos. Es el corazón de la feature.

**Acciones**:
- Crear tests por categoría de endpoints (ver Phase 2 del plan)
- Usar mock de `fetchBaseQuery` para verificar URLs y métodos
- Verificar tagTypes (providesTags/invalidatesTags)

### Components - PRIORIDAD 2 (73% → 80%)

| Archivo | LOC | Cobertura Actual | Gap a 80% | Estimación |
|---------|-----|------------------|-----------|------------|
| `CameraCapture.tsx` | ~150 | ~50% | +30% | 1-2 horas |
| Otros componentes | ~400 | ~75% | +5% | 30 min |

**Razón**: Ya está casi completo. Solo falta coverage test completo para CameraCapture.

**Acciones**:
- Crear `CameraCapture.coverage.test.tsx`
- Mock de `navigator.mediaDevices.getUserMedia`
- Probar permisos concedidos/denegados

### Pages - PRIORIDAD 3 (46.64% → 80%)

| Archivo | Cobertura Actual | Gap | Estado |
|---------|------------------|-----|--------|
| `ApprovalQueuePage.tsx` | ~40% | +40% | Tiene test, fail por mocks |
| `DocumentosMainPage.tsx` | ~45% | +35% | Tiene test, fail por mocks |
| `EquiposPage.tsx` | ~50% | +30% | Tests fallan |
| `ChoferesPage.tsx` | ~45% | +35% | Tiene test |
| `CamionesPage.tsx` | ~45% | +35% | Tiene test |
| `AcopladosPage.tsx` | ~45% | +35% | Tiene test |
| `ClientsPage.tsx` | ~50% | +30% | Tiene test |
| `TemplatesPage.tsx` | ~50% | +30% | Tiene test |
| Otras páginas | ~40% | +40% | Varía |

**Razón**: Hay tests de coverage creados pero muchos fallan por problemas de mocking.

**Acciones**:
1. Arreglar tests que fallan (problemas con `getByText` duplicados, mocks incorrectos)
2. Crear coverage tests faltantes (ConsultaPage, ExtractedDataPage, etc.)

## Orden Recomendado de Implementación

1. **Phase 2: API Layer** (6-8 horas)
   - Mayor impacto por línea de código
   - Menos dependencias (sin UI)
   - Tests más estables

2. **Phase 3: Components** (1-2 horas)
   - Ya casi completo
   - Rápido de completar

3. **Phase 4: Pages** (8-12 horas)
   - Más trabajo
   - Muchos tests ya existen pero necesitan reparación

## Tests Reparados en Esta Sesión

- ✅ `DocumentPreview.coverage.test.tsx` - Mock de `getRuntimeFlag` y fix URL.createObjectURL
- ✅ `DocumentosPage.coverage.test.tsx` - Mocks correctos de API hooks y componentes

## Tests Que Siguen Fallando (80 tests)

La mayoría son problemas de selectores duplicados en `extended.test.tsx`:
- `EquiposPage.extended.test.tsx` - `getByText("Mostrando 0")` encuentra múltiples elementos
- Solución: Usar `getAllByText` o agregar `data-testid` a los elementos

## Métricas de Éxito

- **Objetivo global**: 80% coverage para `features/documentos/`
- **API**: 32.45% → 80% (+47.55 puntos)
- **Components**: 73% → 80% (+7 puntos)
- **Pages**: 46.64% → 80% (+33.36 puntos)

## Comandos Útiles

```bash
# Ejecutar tests solo de documentos
cd apps/frontend && npm run test -- --testPathPatterns=features/documentos

# Ejecutar coverage
cd apps/frontend && npm run test:coverage -- --testPathPatterns=features/documentos

# Ver reporte HTML
open apps/frontend/coverage/lcov-report/index.html
```
