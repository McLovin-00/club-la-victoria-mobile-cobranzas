# ADR 002: Usar V8 Coverage Provider con SWC en Frontend

**Fecha**: 2026-02-13  
**Estado**: ✅ Aceptado  
**Decisores**: Equipo de Desarrollo  
**Contexto**: Migración de cobertura de tests del frontend

---

## Contexto y Problema

El frontend del proyecto utiliza `@swc/jest` como transformador de TypeScript/JSX para mejorar la velocidad de los tests. Sin embargo, al ejecutar los tests con cobertura, se observó que:

1. **Todos los tests pasaban correctamente** (2000+ tests)
2. **La cobertura reportada era ~2%** (incorrecta)
3. **El archivo `lcov.info` mostraba valores en 0**:
   - `FNH:0` (Functions Hit: 0)
   - `LH:0` (Lines Hit: 0)
   - `BRH:0` (Branches Hit: 0)

### Análisis del Problema

Jest utiliza por defecto el coverage provider `babel`, que funciona bien con `babel-jest` o `ts-jest`, pero **NO es compatible con `@swc/jest`**. 

Cuando se usa SWC como transformador:
- El código se transpila correctamente para ejecutar los tests
- Pero el instrumentador de cobertura de Babel no puede procesar el código transformado por SWC
- Resultado: código ejecutado pero no medido = cobertura 0%

## Decisión

**Cambiar el coverage provider de Jest de `babel` (default) a `v8` en el frontend.**

```javascript
// apps/frontend/jest.config.cjs
module.exports = {
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', { /* ... */ }],
  },
  coverageProvider: 'v8', // ✅ Agregado
};
```

## Consecuencias

### Positivas ✅

1. **Cobertura precisa**: La cobertura ahora refleja el estado real de los tests
   - Antes: ~51k líneas en reporte mergeado
   - Después: ~80k líneas en reporte mergeado (+56%)

2. **Mayor velocidad**: V8 es más rápido que Babel para instrumentación
   - V8 usa instrumentación nativa de Node.js
   - No requiere transformaciones adicionales

3. **Compatibilidad con SWC**: V8 funciona correctamente con cualquier transformador
   - Compatible con `@swc/jest`, `babel-jest`, `ts-jest`
   - No depende del transformador usado

4. **Mejor integración con SonarQube**: Los reportes LCOV ahora contienen datos reales

### Negativas ⚠️

1. **Diferencias menores en precisión**: V8 puede tener pequeñas diferencias vs Babel en casos edge
   - En la práctica, estas diferencias son mínimas y aceptables
   - La precisión general es equivalente

2. **Requiere Node.js ≥ 12**: V8 coverage requiere versiones modernas de Node
   - No es problema: el proyecto ya requiere Node.js ≥ 20

### Neutras ℹ️

1. **No afecta a otros workspaces**: Backend y Documentos siguen usando `ts-jest` + `babel` (default)
2. **No cambia la forma de ejecutar tests**: Mismos comandos funcionan igual

## Alternativas Consideradas

### 1. Cambiar de SWC a ts-jest
- ❌ **Rechazada**: Pérdida significativa de velocidad en tests
- SWC es ~20x más rápido que ts-jest para transformación
- Los tests del frontend son numerosos (2000+) y la velocidad es crítica

### 2. Usar babel-jest en lugar de @swc/jest
- ❌ **Rechazada**: Misma razón que la anterior
- Babel es más lento que SWC
- No justifica el cambio solo por cobertura

### 3. Mantener babel provider y aceptar cobertura incorrecta
- ❌ **Rechazada**: Viola estándares de calidad del proyecto
- Objetivo de cobertura: ≥ 80%
- SonarQube requiere datos precisos de cobertura

## Implementación

### Cambios Realizados

1. **Configuración de Jest** (`apps/frontend/jest.config.cjs`):
   ```javascript
   coverageProvider: 'v8',
   ```

2. **Documentación**:
   - `docs/testing/COVERAGE_TROUBLESHOOTING.md` - Guía de troubleshooting
   - `docs/testing/JEST_BEST_PRACTICES.md` - Mejores prácticas
   - `README.md` - Referencias a nueva documentación
   - `CHANGELOG.md` - Registro del cambio

### Verificación

```powershell
# Limpiar y regenerar cobertura
cd apps/frontend
Remove-Item -Recurse -Force coverage
npm test -- --coverage --no-cache

# Verificar valores > 0
Get-Content coverage\lcov.info | Select-String -Pattern "^(FNH|LH|BRH)" | Select-Object -First 20
```

## Referencias

- [Jest Configuration - coverageProvider](https://jestjs.io/docs/configuration#coverageprovider-string)
- [SWC Jest Plugin](https://swc.rs/docs/usage/jest)
- [V8 Coverage](https://v8.dev/blog/javascript-code-coverage)
- [Issue similar en Jest](https://github.com/jestjs/jest/issues/11956)

## Notas

- Esta decisión aplica específicamente al **frontend** que usa React + SWC
- **Backend** y **Documentos** continúan usando `ts-jest` con el provider por defecto (`babel`)
- Si en el futuro se migran otros workspaces a SWC, deberán aplicar el mismo cambio

## Revisión

Esta decisión debe revisarse si:
- Se cambia el transformador del frontend (de SWC a otro)
- Aparecen problemas de precisión con V8 coverage
- Jest introduce mejoras en la compatibilidad babel + SWC
