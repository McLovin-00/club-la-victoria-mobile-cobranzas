# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Fixed
- **[Frontend]** Corregida cobertura de tests que mostraba 0% a pesar de tener tests pasando
  - Agregado `coverageProvider: 'v8'` en `jest.config.cjs` para compatibilidad con SWC
  - La cobertura ahora refleja correctamente el estado real de los tests
  - Incremento de ~51k a ~80k líneas en el reporte LCOV mergeado

### Added
- **[Docs]** Nueva documentación de testing:
  - `docs/testing/COVERAGE_TROUBLESHOOTING.md` - Guía de solución de problemas de cobertura
  - `docs/testing/JEST_BEST_PRACTICES.md` - Mejores prácticas y configuración de Jest
- **[Frontend]** Comentarios mejorados en `jest.config.cjs` explicando la importancia del coverage provider

### Changed
- **[README]** Agregadas referencias a la nueva documentación de testing

---

## Formato de Entradas

### Added
Para nuevas funcionalidades.

### Changed
Para cambios en funcionalidades existentes.

### Deprecated
Para funcionalidades que serán removidas en próximas versiones.

### Removed
Para funcionalidades removidas.

### Fixed
Para corrección de bugs.

### Security
Para cambios relacionados con seguridad.
