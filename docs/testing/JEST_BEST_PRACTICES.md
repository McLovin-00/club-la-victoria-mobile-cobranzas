# Jest - Mejores Prácticas y Configuración

## Configuración de Transformadores y Coverage

### Regla de Oro: Coverage Provider debe coincidir con el Transformador

```javascript
// ✅ CORRECTO: SWC + V8
{
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', { /* ... */ }],
  },
  coverageProvider: 'v8',
}

// ✅ CORRECTO: ts-jest + babel (default)
{
  transform: {
    '^.+\\.ts$': ['ts-jest', { /* ... */ }],
  },
  // coverageProvider: 'babel' (default, no necesita especificarse)
}

// ❌ INCORRECTO: SWC + babel (default)
{
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', { /* ... */ }],
  },
  // coverageProvider: 'babel' <- Esto causará cobertura 0%
}
```

## Checklist de Configuración por Workspace

### Frontend (React + SWC)

```javascript
module.exports = {
  testEnvironment: 'jsdom',           // ✅ Para React
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', {
      jsc: {
        parser: { syntax: 'typescript', tsx: true },
        transform: { react: { runtime: 'automatic' } },
      },
    }],
  },
  coverageProvider: 'v8',             // ✅ CRÍTICO con SWC
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|scss)$': 'identity-obj-proxy',
    '\\.(jpg|png|svg)$': 'jest-transform-stub',
  },
};
```

### Backend/Documentos (Node + ts-jest)

```javascript
module.exports = {
  testEnvironment: 'node',            // ✅ Para Node.js
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  // coverageProvider: 'babel' (default) ✅ Funciona bien con ts-jest
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
```

## Comandos de Coverage

### Generar cobertura con cache limpio

```powershell
# Limpiar coverage anterior
Remove-Item -Recurse -Force coverage -ErrorAction SilentlyContinue

# Ejecutar tests con cobertura (sin cache)
npm test -- --coverage --no-cache
```

### Verificar cobertura generada

```powershell
# Ver estadísticas en consola
npm test -- --coverage --coverageReporters=text-summary

# Ver reporte HTML
npm test -- --coverage --coverageReporters=html
# Abrir: coverage/lcov-report/index.html
```

### Generar cobertura del monorepo completo

```powershell
cd monorepo-bca
npm run test:coverage
```

## Troubleshooting Común

### 1. Cobertura en 0% con tests pasando

**Causa**: Coverage provider incorrecto para el transformador usado.

**Solución**: Ver [COVERAGE_TROUBLESHOOTING.md](./COVERAGE_TROUBLESHOOTING.md)

### 2. Tests muy lentos

**Opciones**:
```javascript
{
  maxWorkers: '50%',           // Usar 50% de CPUs
  testTimeout: 10000,          // 10s timeout
  coverageProvider: 'v8',      // v8 es más rápido que babel
}
```

### 3. Errores de "import.meta" en tests

**Solución**:
```javascript
{
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', {
      module: { type: 'es6' },
    }],
  },
}
```

### 4. Mocks no funcionan correctamente

**Verificar**:
```javascript
{
  clearMocks: true,      // Limpiar mocks entre tests
  restoreMocks: true,    // Restaurar implementación original
  resetMocks: false,     // No resetear (puede causar problemas)
}
```

## Umbrales de Cobertura

### Configuración Recomendada (Incremental)

```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 75,
    lines: 80,
    statements: 80,
  },
  // Por archivo (más estricto para código crítico)
  './src/services/**/*.ts': {
    branches: 80,
    functions: 90,
    lines: 90,
    statements: 90,
  },
}
```

### Estrategia de Incremento

1. **Fase 1**: Establecer baseline actual (0% si es nuevo)
2. **Fase 2**: Subir a 50% en 2 semanas
3. **Fase 3**: Subir a 70% en 1 mes
4. **Fase 4**: Subir a 80% en 2 meses
5. **Mantener**: 80%+ con revisiones mensuales

## Exclusiones de Cobertura

### Qué excluir

```javascript
collectCoverageFrom: [
  'src/**/*.{ts,tsx}',
  // Excluir archivos técnicos
  '!src/**/*.d.ts',
  '!src/**/*.test.{ts,tsx}',
  '!src/**/*.spec.{ts,tsx}',
  '!src/**/*.stories.{ts,tsx}',
  // Excluir entry points
  '!src/main.tsx',
  '!src/App.tsx',
  '!src/index.ts',
  // Excluir configuración
  '!src/test-utils/**',
  '!src/__tests__/**',
  // Excluir tipos y constantes puros
  '!src/constants/**',
  '!src/types/**',
],
```

## Scripts Útiles

### package.json

```json
{
  "scripts": {
    "test": "jest --passWithNoTests",
    "test:coverage": "jest --coverage --passWithNoTests",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand",
    "test:clear-cache": "jest --clearCache"
  }
}
```

## Referencias

- [Jest Configuration](https://jestjs.io/docs/configuration)
- [SWC Jest](https://swc.rs/docs/usage/jest)
- [ts-jest](https://kulshekhar.github.io/ts-jest/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## Mantenimiento

### Checklist Mensual

- [ ] Revisar umbrales de cobertura
- [ ] Actualizar dependencias de testing
- [ ] Limpiar tests obsoletos
- [ ] Revisar tests lentos (>1s)
- [ ] Verificar que coverage provider sea correcto en todos los workspaces

### Al agregar nuevo workspace

1. Copiar configuración de workspace similar
2. Verificar que `coverageProvider` coincida con `transform`
3. Probar con `npm test -- --coverage --no-cache`
4. Agregar al script `coverage-report.mjs` si corresponde
