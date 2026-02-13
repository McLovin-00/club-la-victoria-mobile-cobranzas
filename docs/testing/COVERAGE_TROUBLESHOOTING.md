# Troubleshooting de Cobertura de Tests

## Problema: Cobertura en 0% o muy baja a pesar de tener tests

### Síntomas

- Los tests pasan correctamente
- El reporte de cobertura muestra 0% o valores muy bajos
- En el archivo `lcov.info` se ven valores como:
  ```
  FNH:0  (Functions Hit: 0)
  LH:0   (Lines Hit: 0)
  BRH:0  (Branches Hit: 0)
  ```

### Causa

**Incompatibilidad entre el coverage provider de Jest y el transformador usado.**

Cuando se usa `@swc/jest` como transformador (en lugar de `babel-jest`), el coverage provider por defecto de Jest (`babel`) NO puede instrumentar correctamente el código.

### Solución

Agregar `coverageProvider: 'v8'` en la configuración de Jest:

```javascript
// jest.config.cjs o jest.config.js
module.exports = {
  // ... otras configuraciones
  
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', { /* config */ }],
  },
  
  // CRÍTICO: Usar v8 cuando se usa SWC
  coverageProvider: 'v8',
  
  // ... resto de configuración
};
```

### Verificación

Después de aplicar el cambio:

1. **Limpiar cache y coverage anterior:**
   ```powershell
   Remove-Item -Recurse -Force coverage
   npm test -- --coverage --no-cache
   ```

2. **Verificar el archivo lcov.info:**
   ```powershell
   Get-Content coverage\lcov.info | Select-String -Pattern "^(FNH|LH|BRH)" | Select-Object -First 20
   ```

   Deberías ver valores > 0:
   ```
   FNH:8   (8 funciones ejecutadas)
   LH:265  (265 líneas ejecutadas)
   BRH:41  (41 branches ejecutadas)
   ```

3. **Verificar el reporte mergeado:**
   ```powershell
   cd monorepo-bca
   npm run test:coverage
   ```

   El número de líneas en el reporte debe ser significativamente mayor.

## Comparación de Providers

| Provider | Transformador Compatible | Velocidad | Precisión |
|----------|-------------------------|-----------|-----------|
| `babel`  | babel-jest, ts-jest     | Lenta     | Alta      |
| `v8`     | @swc/jest, babel-jest   | Rápida    | Alta      |

### Recomendaciones

- ✅ **Usar `v8`** cuando se usa `@swc/jest` (nuestro caso)
- ✅ **Usar `v8`** para proyectos grandes (más rápido)
- ⚠️ **Usar `babel`** solo si hay problemas específicos con v8

## Configuración Actual del Monorepo

### Frontend (`apps/frontend/jest.config.cjs`)
```javascript
transform: {
  '^.+\\.(t|j)sx?$': ['@swc/jest', { /* ... */ }],
},
coverageProvider: 'v8', // ✅ Correcto para SWC
```

### Backend (`apps/backend/jest.config.js`)
```javascript
transform: {
  '^.+\\.ts$': ['ts-jest', { /* ... */ }],
},
// coverageProvider: 'babel' (default) ✅ Correcto para ts-jest
```

### Documentos (`apps/documentos/jest.config.js`)
```javascript
transform: {
  '^.+\\.ts$': ['ts-jest', { /* ... */ }],
},
// coverageProvider: 'babel' (default) ✅ Correcto para ts-jest
```

## Referencias

- [Jest Configuration - coverageProvider](https://jestjs.io/docs/configuration#coverageprovider-string)
- [SWC Jest Plugin](https://swc.rs/docs/usage/jest)
- [V8 Coverage Provider](https://v8.dev/blog/javascript-code-coverage)

## Historial de Cambios

| Fecha | Cambio | Motivo |
|-------|--------|--------|
| 2026-02-13 | Agregado `coverageProvider: 'v8'` en frontend | Cobertura estaba en 2% con SWC |
