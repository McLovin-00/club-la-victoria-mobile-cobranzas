# Gaps Remanentes - Cobertura Feature Documentos

**Fecha**: 2025-01-16
**Objetivo**: Cobertura >=80% para `features/documentos/`

## Resumen de Cobertura Actual

| Directorio | Statements | Cobertura | Estado |
|------------|------------|-----------|--------|
| `api/` | 111/342 | **32.45%** | ❌ No alcanza 80% |
| `components/` | 357/489 | **73%** | ⚠️ Cerca (falta 7%) |
| `pages/` | 1402/2560 | **54.76%** | ❌ No alcanza 80% |

## Gaps Específicos por Archivo

### 1. API Layer (`api/documentosApiSlice.ts`) - 32.45%

**Razón principal**: El API slice tiene 133 endpoints generados por RTK Query. Los tests actuales solo verifican que los hooks se exportan correctamente, pero no ejecutan el código real.

**Para llegar a 80% se necesitaría**:
- Mock de `fetchBaseQuery` para ejecutar las funciones
- Tests de integración que llamen a los endpoints mockeados
- Tests de casos edge (401, 404, 500, etc.)

**Recomendación**:
- **Prioridad Alta** si se usa SonarQube quality gate
- **Alternativa**: Configurar SonarQube para excluir `documentosApiSlice.ts` o aceptar menor cobertura para API slices

### 2. Components (`components/`) - 73%

**Archivos que podrían necesitar más tests**:
- Componentes sin `*.coverage.test.tsx`
- Componentes con lógica compleja (DocumentUploadModal, TemplatesList)

**Para llegar a 80%**:
- Ampliar tests existentes para cubrir branches faltantes
- Tests de edge cases en formularios

### 3. Pages (`pages/`) - 54.76%

**Razón principal**:
- Muchas páginas son CRUD similares con gran cantidad de JSX
- Tests actuales cubren happy paths pero no todos los branches
- Algunos tests fallan (waitFor timeouts)

**Archivos con menor cobertura**:
- Páginas sin coverage test o tests básicos (2 tests smoke)
- EquiposPage (tests fallando)
- Páginas de configuración (Evolution, Notifications)

**Para llegar a 80%**:
- Arreglar tests fallantes con timeouts (EquiposPage)
- Ampliar coverage tests para cubrir más casos edge
- Tests de interacción (userEvent en lugar de fireEvent)

## Recomendaciones

### Opción A: Aceptar Cobertura Actual
Configurar SonarQube con un threshold más bajo para `features/documentos`:
- API slices: excluir o setear a 30%
- Components: 73% es aceptable
- Pages: ampliar tests críticos solo

### Opción B: Continuar Mejorando (Estimado 4-8 horas)
1. **Arreglar EquiposPage tests** (1-2 horas)
2. **Ampliar coverage tests de páginas clave** (2-4 horas)
   - ApprovalQueuePage, ApprovalDetailPage, DocumentosMainPage
   - Páginas CRUD críticas para el negocio
3. **API layer tests reales** (2-3 horas) - solo si es necesario

### Opción C: Enfoque Selectivo
Concentrarse en archivos críticos de negocio:
- Aprobar/rechazar documentos (ApprovalQueuePage, ApprovalDetailPage)
- Subida de documentos (DocumentUploadModal)
- Consulta y visualización (ConsultaPage, EstadoEquipoPage)

## Tests que Fallan (92 fallas / 840 totales)

La mayoría de fallas son por:
1. **Timeout en waitFor** - Tests de EquiposPage extended
2. **Elementos no encontrados** - Cambios recientes en UI
3. **Act warnings** - Actualización de estado fuera de act()

**Acción inmediata**: Arreglar EquiposPage.coverage.test.tsx y EquiposPage.extended.test.tsx

## Conclusión

La cobertura actual es **~54%** para pages, **73%** para components y **32%** para API.

Para alcanzar el objetivo de **80% global**, se necesitaría trabajo adicional estimado en **4-8 horas** enfocado en:
1. Arreglar tests existentes que fallan
2. Ampliar coverage tests para páginas clave
3. Considerar excluir API slice o aceptar menor cobertura

**Recomendación**: Revisar prioridades con el equipo. ¿Es crítico alcanzar 80% en TODOS los archivos, o es aceptable tener mayor cobertura solo en componentes críticos de negocio?
