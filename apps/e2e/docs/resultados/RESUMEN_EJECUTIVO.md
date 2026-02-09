# Resumen Ejecutivo: Tests E2E por Portal

> **Fecha**: 2025-12-31
> **Ambiente**: Staging (10.3.0.243:8550)
> **Ejecutor**: Playwright con 1 Worker

---

## 📊 Resumen General

| Portal | Total | ✅ Passed | ❌ Failed | ⏭️ Skipped | Pass Rate |
|--------|-------|-----------|-----------|------------|-----------|
| cliente | 187 | 181 | 1 | 5 | 96.8% |
| chofer | 271 | 197 | 4 | 70 | 72.6% |
| transportista | 380 | 339 | 3 | 38 | 89.2% |
| dadorDeCarga | 360 | 356 | 4 | 0 | 98.9% |
| adminInterno | 401 | 371 | 3 | 27 | 92.5% |
| **TOTAL** | **1,599** | **1,444** | **15** | **140** | **90.3%** |

---

## ❌ Tests Fallidos (15)

### Portal Cliente (1 fallo)

| Test | Causa | Cómo Arreglar |
|------|-------|---------------|
| `s15-seguridad › ZIP masivo solo incluye equipos propios` | Timeout de 60s excedido al generar ZIP masivo | **Backend**: Optimizar generación de ZIP. **Test**: Aumentar timeout a 120s para este test específico. |

---

### Portal Chofer (4 fallos)

| Test | Causa | Cómo Arreglar |
|------|-------|---------------|
| `s02-dashboard › debe tener fondo con gradiente apropiado` | El selector de gradiente no matchea el CSS actual | **Test**: Actualizar selector CSS para buscar la clase correcta de gradiente. |
| `s03-consulta › NO deben aparecer botones de tipo de filtro` | Los botones de filtro existen en el DOM aunque no deberían ser visibles | **Frontend**: Verificar que los botones de filtro estén ocultos para rol chofer. |
| `s15-rendimiento-ux › cálculo de compliance visible` | Elemento de compliance no visible o tarda en cargar | **Test**: Agregar `waitFor` antes de verificar visibilidad del elemento. |
| `s16-seguridad › token requerido para todas las operaciones` | Error en selector de botón o verificación de token | **Test**: Revisar y corregir el selector del botón. |

---

### Portal Transportista (3 fallos)

| Test | Causa | Cómo Arreglar |
|------|-------|---------------|
| `s03-alta-completa › campo "Dador de Carga" visible` | Campo "Dador de Carga" no visible o tiene nombre diferente | **Test**: Actualizar selector para buscar el nombre exacto del campo. |
| `s04-consulta › botón "Buscar" en modal visible` | Modal de búsqueda masiva no tiene botón con texto exacto "Buscar" | **Test**: Usar selector más flexible (`/Buscar\|Búscar/i`). |
| `s17-rendimiento-ux › spinner al buscar equipos` | Spinner no visible porque búsqueda es muy rápida | **Test**: Este test de UX puede ser flaky; considerar eliminar o ajustar timing. |

---

### Portal Dador de Carga (4 fallos)

| Test | Causa | Cómo Arreglar |
|------|-------|---------------|
| `s01-autenticacion › NO puede acceder a /documentos/auditoria` | El dador SÍ tiene acceso a auditoría (cambio de permisos) | **Backend**: Verificar si el rol dador debería tener acceso. Si es correcto, actualizar test. |
| `s06-consulta › ejecuta búsqueda masiva` | Timeout o error en el modal de búsqueda masiva | **Test**: Revisar selector del botón "Buscar" dentro del modal. Puede haber 2 botones "Buscar". |
| `s16-flujo-aprobacion › visible en KPIs ("Pendientes")` | `getByText(/Pendientes/i)` encuentra 2 elementos | **Test**: Hacer selector más específico: `.filter({ has: page.locator('.kpi-card') })`. |
| `s21-datos-prueba › al menos 5 documentos pendientes` | No hay suficientes documentos pendientes en staging | **Datos**: Cargar datos de prueba en staging. O ajustar expectativa del test. |

---

### Portal Admin Interno (3 fallos)

| Test | Causa | Cómo Arreglar |
|------|-------|---------------|
| `s07-consulta › búsqueda masiva funcional` | Mismo problema que otros portales con búsqueda masiva | **Test**: Unificar corrección de selector de búsqueda masiva en `ConsultaPage`. |
| `s17-flujo-aprobacion › KPIs se actualizan (Choferes)` | KPIs no se actualizan en tiempo real tras aprobar | **Backend**: Verificar que los KPIs se recalculan. **Test**: Agregar refresh/espera. |
| `s25-items-adicionales › logo de BCA se muestra en login` | La página de login no tiene logo de BCA | **Frontend**: Agregar logo. O **Test**: Eliminar test si no aplica. |

---

## ⏭️ Tests Skipped (140)

### Análisis por Tipo de Skip

| Tipo | Cantidad | Descripción |
|------|----------|-------------|
| **Falta de datos** | ~95 | Tests que verifican `count === 0` y se saltan si no hay equipos |
| **Tests deshabilitados** | ~35 | Tests con `test.skip()` hardcoded para evitar bloqueos de cuenta |
| **Funcionalidad no implementada** | ~10 | Tests de características en desarrollo |

---

### Desglose por Portal

#### Portal Cliente (5 skipped)

| Test | Motivo | Cómo Habilitar |
|------|--------|----------------|
| `s01 › token expira y redirige a login` | Flaky por tiempos de expiración variables | Implementar mock de token expirado |
| `s01 › no puede acceder a dashboard CHOFER` | Evita bloqueos de cuenta | Usar contexto sin auth para probar redirect |
| `s01 › no puede acceder a dashboard TRANSPORTISTA` | Evita bloqueos de cuenta | Usar contexto sin auth para probar redirect |
| `s01 › no puede acceder a /documentos/equipos/:id/editar` | Requiere ID específico | Obtener ID dinámicamente de la API |
| `s10 › descarga debe completar en menos de 10s` | Performance test deshabilitado | Habilitar solo en CI con threshold más alto |

---

#### Portal Chofer (70 skipped)

| Suite | Tests Skipped | Motivo | Cómo Arreglar |
|-------|---------------|--------|---------------|
| `s08-editar-equipo-subida` | ~20 | `count === 0` (sin equipos) | Asignar equipos al usuario chofer en staging |
| `s09-ver-estado` | ~15 | `count === 0` (sin equipos) | Asignar equipos al usuario chofer en staging |
| `s10-activar-desactivar` | ~10 | `count === 0` (sin equipos) | Asignar equipos al usuario chofer en staging |
| `s11-eliminar-equipo` | ~8 | `count === 0` (sin equipos) | Asignar equipos al usuario chofer en staging |
| `s13-documentos-pendientes` | ~8 | `count === 0` (sin equipos) | Asignar equipos al usuario chofer en staging |
| `s01-autenticacion` | ~6 | Hardcoded `test.skip()` | Implementar tests con mocks |
| `s16-seguridad` | ~3 | Evita setup complejo | Implementar con fixtures |

**Solución global**: El usuario `chofer` en staging no tiene equipos asignados. Asignarle equipos resolverá ~60 de los 70 skips.

---

#### Portal Transportista (38 skipped)

| Suite | Tests Skipped | Motivo | Cómo Arreglar |
|-------|---------------|--------|---------------|
| `s07-editar-equipo` | ~18 | `count === 0` (sin equipos) | Asignar equipos al usuario transportista |
| `s08-ver-estado` | ~14 | `count === 0` (sin equipos) | Asignar equipos al usuario transportista |
| `s01-autenticacion` | 6 | Hardcoded `test.skip()` | Implementar tests similares a dador |

---

#### Portal Dador de Carga (0 skipped) ✅

Todos los skips fueron arreglados en esta sesión:
- 6 tests de autenticación implementados
- 7 tests de editar equipo convertidos a navegación directa

---

#### Portal Admin Interno (27 skipped)

| Suite | Tests Skipped | Motivo | Cómo Arreglar |
|-------|---------------|--------|---------------|
| `s01-autenticacion` | ~6 | Hardcoded `test.skip()` | Implementar tests como en dador |
| `s25-items-adicionales` | ~8 | Funcionalidades no implementadas | Esperar implementación o eliminar |
| `s17-flujo-aprobacion` | ~5 | Requieren datos específicos | Usar fixtures de datos |
| Otros | ~8 | Variados | Revisar caso por caso |

---

## 🔧 Plan de Acción Recomendado

### Prioridad Alta (Impacto inmediato)

1. **Asignar equipos al usuario `chofer` en staging**
   - Impacto: Reduce ~60 skips
   - Esfuerzo: Bajo (configuración de datos)

2. **Corregir selector de búsqueda masiva en `ConsultaPage`**
   - Impacto: Arregla 4 tests fallidos en diferentes portales
   - Esfuerzo: Bajo (cambio en Page Object)

3. **Hacer selector de "Pendientes" más específico**
   - Impacto: Arregla 2 tests de KPIs
   - Esfuerzo: Bajo

### Prioridad Media

4. **Implementar tests de autenticación para chofer/transportista/admin**
   - Igual que se hizo para dador
   - Impacto: ~18 skips menos

5. **Revisar permisos de auditoría para rol dador**
   - Determinar si es bug de backend o test incorrecto

### Prioridad Baja

6. **Agregar logo a página de login**
   - O eliminar test si no aplica al producto

7. **Optimizar generación de ZIP masivo en backend**
   - Para que no dé timeout en tests

---

## 📁 Archivos de Resultados

- `docs/resultados/cliente.md`
- `docs/resultados/chofer.md`
- `docs/resultados/transportista.md`
- `docs/resultados/dadorDeCarga.md`
- `docs/resultados/adminInterno.md`
- `test-results/<portal>/<timestamp>/` - Evidencia de cada ejecución

---

## 📝 Notas Finales

- El **pass rate global es 90.3%**, lo cual es aceptable para un ambiente de staging.
- El portal **dadorDeCarga tiene el mejor pass rate (98.9%)** tras las correcciones aplicadas.
- El portal **chofer tiene el peor pass rate (72.6%)** principalmente por falta de datos de prueba.
- Los **15 tests fallidos** son reproducibles y tienen causas identificadas.
- Los **140 tests skipped** pueden reducirse significativamente con configuración de datos.
