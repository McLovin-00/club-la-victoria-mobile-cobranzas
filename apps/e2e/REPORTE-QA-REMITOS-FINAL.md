# Reporte QA Remitos E2E (Consolidado)

## Objetivo
Unificar en un solo documento el estado de todos los tests E2E de remitos: legacy preexistentes y nuevos tests del plan `REM-E2E-001` a `REM-E2E-012`.

## Resultado consolidado (legacy + nuevos)
- Comando ejecutado:
  - `npx playwright test tests/dador/s22-remitos-carga.spec.ts tests/dador/s23-remitos-listado.spec.ts tests/dador/remitos tests/chofer/remitos tests/transportista/remitos tests/admin-interno/remitos`
- Resultado:
  - **76 passed / 0 failed**
- Tiempo observado:
  - ~44.2s (incluye setup por rol)

## Inventario completo de tests de remitos

### Legacy (preexistentes)
- `tests/dador/s22-remitos-carga.spec.ts`
- `tests/dador/s23-remitos-listado.spec.ts`

### Nuevos (plan QA por fases)

#### Dador
- `tests/dador/remitos/rem-e2e-001-flujo-completo.spec.ts`
- `tests/dador/remitos/rem-e2e-002-exportacion-excel.spec.ts`
- `tests/dador/remitos/rem-e2e-003-archivo-invalido.spec.ts`
- `tests/dador/remitos/rem-e2e-004-timeout-ia-reintento.spec.ts`
- `tests/dador/remitos/rem-e2e-005-campos-obligatorios.spec.ts`
- `tests/dador/remitos/rem-e2e-006-permisos-dador.spec.ts`
- `tests/dador/remitos/rem-e2e-008-filtros-listado.spec.ts`
- `tests/dador/remitos/rem-e2e-009-exportacion-excel-sin-datos.spec.ts`
- `tests/dador/remitos/rem-e2e-010-exportacion-excel-dataset-amplio.spec.ts`

#### Chofer
- `tests/chofer/remitos/rem-e2e-006-permisos-chofer.spec.ts`

#### Transportista
- `tests/transportista/remitos/rem-e2e-006-permisos-transportista.spec.ts`

#### Admin Interno
- `tests/admin-interno/remitos/rem-e2e-006-permisos-admin.spec.ts`
- `tests/admin-interno/remitos/rem-e2e-007-rechazo-motivo.spec.ts`
- `tests/admin-interno/remitos/rem-e2e-011-doble-confirmacion.spec.ts`
- `tests/admin-interno/remitos/rem-e2e-012-refresh-durante-edicion.spec.ts`

## Estado del plan nuevo (REM-E2E)
- Fase 1 (P0): 6/6 implementados.
- Fase 2 (P1): 4/4 implementados.
- Fase 3 (P2): 2/2 implementados.
- Total plan nuevo: **12/12 implementados**.

## Helpers utilizados
- `tests/helpers/remitos-qa.helper.ts`
- `tests/helpers/remitos-mock.helper.ts`
- `tests/helpers/excel-mock.helper.ts`
- `tests/helpers/remitos.helper.ts`

## Comandos operativos

### Suite consolidada (legacy + nuevos)
`npx playwright test tests/dador/s22-remitos-carga.spec.ts tests/dador/s23-remitos-listado.spec.ts tests/dador/remitos tests/chofer/remitos tests/transportista/remitos tests/admin-interno/remitos`

### Solo legacy
`npx playwright test tests/dador/s22-remitos-carga.spec.ts tests/dador/s23-remitos-listado.spec.ts`

### Solo plan nuevo
`npx playwright test tests/dador/remitos tests/chofer/remitos tests/transportista/remitos tests/admin-interno/remitos`

## Notas
- Este reporte reemplaza la separación anterior entre "legacy" y "nuevo" para tener una vista única de QA remitos.
- Parte del plan nuevo usa mocks controlados en algunos escenarios (export vacio/dataset amplio/idempotencia) para validar reglas de negocio de forma estable.
