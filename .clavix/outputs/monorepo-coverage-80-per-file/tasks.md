# Implementation Plan

**Project**: monorepo-coverage-80-sonar
**Generated**: 2026-02-13T02:35:00Z

## Technical Context & Standards
*Detected Stack & Patterns*
- **Architecture**: Monorepo (npm workspaces + Turborepo)
- **Framework**: Backend/Servicios en Node.js + TypeScript, Frontend React 18 + Vite
- **Testing**: Jest 30 (multi-workspace). Frontend con `@testing-library/*`. E2E con Playwright (fuera de este alcance: unit tests).
- **Coverage**: Reporte por workspace + merge LCOV para SonarQube vía `scripts/coverage-report.mjs`
- **Conventions**:
  - Tests en `__tests__/` y archivos `*.test.ts(x)` / `*.spec.ts(x)`.
  - En frontend existen tests `*.smoke.*`, `*.render.*`, `*.coverage.*` como patrón para sumar cobertura sin acoplarse a UI compleja.
  - Objetivo solicitado: **>=80% de cobertura en SonarQube** (quality gate / dashboard), usando `coverage/lcov.info` mergeado.

> Nota: no se encontró un PRD (`full-prd.md` / `quick-prd.md`) para este pedido. Este plan se basa en tu requerimiento: “crear tests unitarios para subir la cobertura a 80% de cada archivo”.

---

## Phase 1: Baseline (Jest → LCOV mergeado → Sonar)

- [ ] **Correr coverage mergeado (baseline)** (ref: calidad/cobertura)
  Task ID: phase-1-baseline-01
  > **Implementation**: Ejecutar desde PowerShell en `monorepo-bca/` y guardar evidencia en `.clavix/outputs/monorepo-coverage-80-sonar/baseline/`.
  > **Details**:
  > - Comandos:
  >   - `npm ci`
  >   - `npm run test:coverage`
  > - Guardar:
  >   - `coverage/lcov.info`
  >   - Copia de `apps/*/coverage/lcov-report/` y `packages/*/coverage/lcov-report/` si existen (para inspección rápida de líneas sin cubrir).

- [ ] **Correr SonarQube y registrar el % actual** (ref: objetivo Sonar)
  Task ID: phase-1-baseline-02
  > **Implementation**: Ejecutar Sonar y guardar el resultado.
  > **Details**:
  > - Comandos (PowerShell, siguiendo README):
  >   - `$env:SONAR_TOKEN = "<token>"` (si aplica)
  >   - `npm run sonar`
  >   - `Remove-Item Env:SONAR_TOKEN`
  > - Guardar en `monorepo-bca/.clavix/outputs/monorepo-coverage-80-sonar/baseline/sonar.md`:
  >   - “Overall coverage” actual
  >   - Si el quality gate falla/pasa
  >   - Notas de qué módulos aportan más al denominador (apps/backend, apps/documentos, apps/frontend, apps/remitos, packages/*)

---

## Phase 2: Identificar gaps (qué testear primero)

- [ ] **Listar “top archivos/directorios” con peor cobertura por workspace** (ref: acelerar a 80%)
  Task ID: phase-2-gaps-01
  > **Implementation**: Crear `monorepo-bca/.clavix/outputs/monorepo-coverage-80-sonar/gaps/prioridad.md`.
  > **Details**:
  > - Usar los reportes HTML de Jest:
  >   - `apps/backend/coverage/lcov-report/index.html`
  >   - `apps/documentos/coverage/lcov-report/index.html`
  >   - `apps/frontend/coverage/lcov-report/index.html`
  >   - `apps/remitos/coverage/lcov-report/index.html`
  >   - `packages/utils/coverage/lcov-report/index.html`
  >   - `packages/types/coverage/lcov-report/index.html`
  > - Armar una lista priorizada con:
  >   - Path del archivo o carpeta (relativo al repo)
  >   - Motivo (muchas líneas, muchas branches, core de negocio, etc.)
  >   - Tipo de test esperado (unit puro / unit con mocks / “smoke”)

---

## Phase 3: Incrementar cobertura (sin tocar lógica de negocio)

- [ ] **Cerrar gaps en `packages/utils` (rápido y de alto impacto en %)** (ref: gaps/prioridad.md)
  Task ID: phase-3-impl-01
  > **Implementation**: Agregar/expandir tests en `monorepo-bca/packages/utils/src/__tests__/`.
  > **Details**:
  > - Por cada módulo utilitario con ramas sin cubrir, crear/ajustar `*.coverage.test.ts`.
  > - Incluir casos borde y paths de error (inputs inválidos, `null/undefined` si aplica, límites).

- [ ] **Cerrar gaps en `apps/backend` (services/middlewares/utils)** (ref: gaps/prioridad.md)
  Task ID: phase-3-impl-02
  > **Implementation**: Agregar/expandir tests en `monorepo-bca/apps/backend/src/**/__tests__/`.
  > **Details**:
  > - Priorizar `src/services/`, `src/middlewares/`, `src/utils/`, `src/schemas/`.
  > - Cubrir:
  >   - validación/sanitización en bordes
  >   - paths de error (rechazos, excepciones esperadas)
  >   - timeouts/reintentos cuando haya IO (mockeando bordes)

- [ ] **Cerrar gaps en `apps/documentos` (services/workers/utils)** (ref: gaps/prioridad.md)
  Task ID: phase-3-impl-03
  > **Implementation**: Agregar/expandir tests en `monorepo-bca/apps/documentos/__tests__/`.
  > **Details**:
  > - Priorizar `src/services/`, `src/workers/`, `src/utils/`.
  > - Mockear bordes (MinIO/Redis/HTTP/FS) y cubrir branches de error.

- [ ] **Cerrar gaps en `apps/remitos`** (ref: gaps/prioridad.md)
  Task ID: phase-3-impl-04
  > **Implementation**: Agregar/expandir tests en `monorepo-bca/apps/remitos/__tests__/` y/o `src/**/__tests__/`.
  > **Details**:
  > - Priorizar servicios/workers con más líneas/branches sin cubrir.

- [ ] **Cerrar gaps en `apps/frontend` (priorizar hooks/utils antes que páginas enormes)** (ref: gaps/prioridad.md)
  Task ID: phase-3-impl-05
  > **Implementation**: Agregar/expandir tests bajo `monorepo-bca/apps/frontend/src/**/__tests__/`.
  > **Details**:
  > - Priorizar `src/hooks/`, `src/utils/`, `src/services/` y componentes “puros”.
  > - Para UI compleja: empezar por `*.smoke.test.tsx` y `*.render.test.tsx`, y sumar `*.coverage.test.tsx` solo donde haya lógica real.
  > - Mock de RTK Query/hooks con `jest.unstable_mockModule` (patrón ya usado en el repo).

---

## Phase 4: Validación final + SonarQube

- [ ] **Re-ejecutar coverage mergeado y Sonar hasta pasar >=80%** (ref: DoD)
  Task ID: phase-4-validate-01
  > **Implementation**: Ejecutar desde `monorepo-bca/`.
  > **Details**:
  > - `npm run test:coverage` (genera/mergea `coverage/lcov.info`)
  > - `npm run sonar`
  > - Registrar en `monorepo-bca/.clavix/outputs/monorepo-coverage-80-sonar/final/sonar.md`:
  >   - cobertura final
  >   - resultado del quality gate
  >   - nota de qué carpetas/tests movieron más el %

---

*Generated by Clavix /clavix-plan*
