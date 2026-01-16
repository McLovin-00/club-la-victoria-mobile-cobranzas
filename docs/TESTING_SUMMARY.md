# Testing Summary

> Estado actual del sistema de testing del proyecto BC&A

---

## 1. Estructura de Carpetas

```
monorepo-bca/
├── apps/
│   ├── e2e/                          # Tests E2E (Playwright)
│   │   ├── tests/
│   │   │   ├── admin-interno/        # 11 specs - Admin Interno
│   │   │   ├── auth/                 # 5 specs - Smoke tests por rol
│   │   │   ├── cliente/              # Specs - Portal Cliente
│   │   │   ├── chofer/               # Specs - Portal Chofer
│   │   │   ├── transportista/        # Specs - Portal Transportista
│   │   │   ├── dador/                # Specs - Dador de Carga
│   │   │   ├── setup/                # 4 scripts - Generación de storageState
│   │   │   ├── fixtures/             # Data fixtures
│   │   │   ├── helpers/              # Utilities y helpers
│   │   │   └── seed/                 # Scripts de seed
│   │   ├── pages/                    # Page Objects
│   │   └── playwright.config.ts
│   │
│   └── backend/                      # Tests Unitarios (Jest)
│       └── src/
│           ├── __tests__/            # Setup global
│           ├── config/__tests__/     # Config, DB, logger
│           ├── controllers/__tests__/
│           ├── middlewares/__tests__/
│           ├── routes/__tests__/
│           ├── schemas/__tests__/
│           ├── services/__tests__/
│           └── utils/__tests__/
└── coverage/                         # Reportes de cobertura (Jest)
```

---

## 2. Tipos de Tests Implementados

| Tipo | Herramienta | Propósito | Ubicación |
|------|-------------|-----------|-----------|
| **E2E** | Playwright | Validar flujos completos de usuario | `apps/e2e/tests/` |
| **Smoke** | Playwright | Verificación rápida de autenticación por rol | `apps/e2e/tests/auth/` |
| **Unitarios** | Jest | Probar units aisladas (POs, utils, config) | `apps/backend/src/**/__tests__/` |
| **Setup** | Playwright | Generar storageState persistente para autenticación | `apps/e2e/tests/setup/` |

---

## 3. Estado Actual de Tests

### Tests E2E (Playwright)

| Categoría | Estado | Observaciones |
|-----------|--------|---------------|
| **Autenticación (Smoke)** | ✅ Estables | 5 specs por rol, validan login básico |
| **Admin Interno** | ⚠️ Inestables | 11 specs, algunos tests fallan intermitentemente |
| **Cliente** | ⚠️ Parciales | Algunos flujos completados, otros en desarrollo |
| **Chofer** | ⚠️ Parciales | Tests de dashboard implementados |
| **Transportista** | 🚧 Pendiente | Especificaciones definidas, sin implementar |
| **Dador de Carga** | 🚧 Pendiente | Especificaciones definidas, sin implementar |

### Tests Unitarios (Jest - Page Objects)

| Componente | Cobertura | Estado |
|------------|-----------|--------|
| Page Objects | Configurada | Thresholds: 70-90% |
| Config / Utils | Configurada | Thresholds: 70-90% |
| Controllers / Services | Parcial | Cobertura no uniforme |

---

## 4. Cobertura Actual

### Métricas Globales (Jest - Page Objects)

| Métrica | Target | Actual* | Estado |
|---------|--------|---------|--------|
| Branches | 70% | — | ⏳ Por medir |
| Functions | 80% | — | ⏳ Por medir |
| Lines | 90% | — | ⏳ Por medir |
| Statements | 90% | — | ⏳ Por medir |

\* *Última medición completa pendiente de ejecución*

### Cobertura por Tipo de Test

| Tipo | Cobertura Configurada | Observaciones |
|------|------------------------|---------------|
| E2E | No configurada | Playwright no tiene coverage nativo |
| Unitarios (POs) | Sí (Jest) | Thresholds definidos en jest.config.js |

---

## 5. Métricas de Calidad

### Configuración de Ejecución

| Parámetro | Valor Local | Valor CI |
|-----------|-------------|----------|
| Workers | 4 | 2 |
| Timeout (test) | 120s | 120s |
| Timeout (expect) | 30s | 30s |
| Retries | 0 | 0 |

### Deuda Técnica Detectada

| Área | Problema | Impacto | Prioridad |
|------|----------|---------|-----------|
| **Admin Interno** | Tests inestables | Dificulta validación de despliegues | Alta |
| **Transportista/Dador** | Sin implementar | Cobertura incompleta de flujos críticos | Alta |
| **E2E Coverage** | No configurada | No se puede medir cobertura de flujos | Media |
| **Tests Unitarios** | Cobertura desigual | Algunos módodos sin testear | Media |

---

## 6. Observaciones y Recomendaciones

### Críticas

1. **Completar implementación de Transportista y Dador** - Son flujos críticos de negocio sin cobertura aún.
2. **Estabilizar tests de Admin Interno** - Revisar selectores flaky y timing dependencies.
3. **Ejecutar medición completa de cobertura** - Correr `npm run test:coverage` para obtener baseline actual.

### Importantes

4. **Considerar retries en CI** - Ambiente de testing puede tener latencia variable.
5. **Agregar reporte de cobertura en pipeline** - Integrar métricas en CD.
6. **Documentar Page Objects faltantes** - Algunos tests usan `page` directamente.

### Mejoras Continuas

7. **Estandarizar patrón de assertions** - Usar `toBeVisible()` vs `toBeTruthy()` consistentemente.
8. **Agregar tests visuales regresion** - Considerar Playwright screenshot comparison para UI crítica.
9. **Revisar timeouts** - 120s puede ser excesivo para algunos tests específicos.

---

## 7. Scripts Disponibles

```bash
# E2E - Todos los proyectos
npm run e2e

# E2E - Por rol
npm run e2e:cliente
npm run e2e:chofer
npm run e2e:transportista
npm run e2e:admin

# E2E - UI modo interactivo
npm run e2e:ui

# E2E - Setup de autenticación
npm run e2e:setup

# Unitarios con cobertura
npm run test:coverage
```

---

*Última actualización: Enero 2026*
