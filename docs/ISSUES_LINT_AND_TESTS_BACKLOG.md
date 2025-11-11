## Backlog técnico — Lint y Tests

### 1) Frontend — ESLint
- Problema: 32 errores (hooks deps, no-empty, unused vars, react-refresh/only-export-components) y 6 warnings.
- Adicional: ESLint no encuentra config "@typescript-eslint/recommended" desde la raíz.
- Acciones propuestas:
  - A. Verificar dependencias del root: instalar `@typescript-eslint/eslint-plugin` y `@typescript-eslint/parser` si faltan o ajustar `.eslintrc.js` para evitar la extensión global si no se usa en todos los paquetes.
  - B. Corregir reglas triviales:
    - Remover `eslint-disable` sin efecto.
    - Sustituir bloques vacíos `{}` por llamadas a `console.debug` condicionadas o eliminar.
    - Ajustar dependencias de hooks (useEffect/useMemo).
    - Dividir `toast.tsx`: mover constantes/funciones a archivo aparte para `react-refresh/only-export-components`.
    - Eliminar imports/variables no utilizadas.
  - C. Ejecutar `eslint --max-warnings 0` hasta ver 0 errores en frontend.

### 2) Documentos — Tests (Jest)
- Problema: Tests en `dist/__tests__/*` requieren módulos via `../dist/...`, generando rutas `dist/dist` inválidas tras build.
- Acciones propuestas:
  - A. Cambiar estrategia a `ts-jest` directo sobre `src` (sin compilar a `dist` antes de test):
    - Jest config: `transform` con ts-jest; `testMatch` apuntando a `src/**/__tests__/**/*.test.ts`.
    - `moduleNameMapper` para alias si aplica.
  - B. Alternativa menor: corregir imports en tests compilados (bajar un nivel: `../` en vez de `../dist/`), pero preferir opción A por claridad.
  - C. Instalar `jest-environment-node` (o `jsdom` si se requiere DOM); setear `testEnvironment` apropiado.
  - D. Añadir mocks explícitos para `config/database` con `jest.mock` sobre la ruta de `src` (no `dist`).

### 3) Frontend — Tests (Jest)
- Problema: Falta `jest-environment-jsdom` (Jest ≥28 no lo incluye).
- Acciones propuestas:
  - A. Instalar `jest-environment-jsdom` y setear `testEnvironment: 'jsdom'` (si UI).
  - B. O usar `node` si los tests no requieren DOM.
  - C. Revisar setupTests (RTL) si aplica.

### 4) Pipeline sugerido (por pasos)
1. Fix root ESLint config/deps para "@typescript-eslint/recommended".
2. Corregir errores de frontend (rápidos) y re‑ejecutar lint solo en frontend.
3. Ajustar Jest en documentos a `ts-jest` sobre `src`; mover tests a `src/__tests__`.
4. Añadir `jest-environment-jsdom` para frontend; correr tests segmentados.
5. Volver a correr `npm run lint -ws` y `npm test -ws` global.


