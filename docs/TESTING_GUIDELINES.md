# Testing Guidelines

> Guía de referencia para desarrollo y mantenimiento de tests en BCA

---

## 1. Estrategia de Testing

El proyecto sigue una estrategia de testing basada en la **pirámide de tests**, con énfasis en:

1. **Tests Unitarios** - Lógica de negocio aislada (POs, utils, services)
2. **Tests de Integración** - Interacción entre componentes
3. **Tests E2E** - Flujos críticos de usuario a través de la UI

```
        ┌─────────────┐
        │    E2E      │  ← Flujos críticos, smoke tests
        │   (10%)     │
       ╱─────────────╲
      ╱  Integración  ╲  ← APIs, controllers, middlewares
     ╱      (30%)      ╲
    ╱─────────────────────╲
   ╱      Unitarios         ╲  ← POs, utils, config
  ╱         (60%)             ╲
 ╱_____________________________╲
```

---

## 2. Tipos de Tests según el Cambio

### Agregar nueva feature

| Cambio | Tests Requeridos |
|--------|------------------|
| Nuevo Page Object | Unitarios (≥85% cobertura) |
| Nuevo endpoint/controller | Unitarios + Integración |
| Nuevo flujo de usuario | E2E completo + Smoke |
| Modificación de UI existente | E2E regresión del módulo |
| Bugfix | Unitario/E2E que reproduzca y valide el fix |

### Cambios que NO requieren E2E

- Refactor interno de código sin cambios de comportamiento
- Actualización de dependencias (validar con smoke tests)
- Cambios de configuración no relacionada con flujos de usuario

---

## 3. Convenciones y Buenas Prácticas

### 3.1. Estructura de Archivos

```
tests/
├── {rol}/
│   ├── s01-autenticacion.spec.ts    # Naming: sXX-descripcion.spec.ts
│   ├── s02-dashboard.spec.ts
│   └── ...
├── auth/                             # Smoke tests
└── setup/                            # Generación de storageState
```

### 3.2. Nombres de Tests

```typescript
test.describe("Módulo: Dashboard", () => {
  test("UC-001: debería mostrar el logo de la empresa", async ({ page }) => {
    // GIVEN WHEN THEN pattern
  });
});
```

### 3.3. Page Objects Pattern

**✅ Hacer:**

```typescript
// tests/cliente/s01-autenticacion.spec.ts
const loginPage = new LoginPage(page);
await loginPage.goto();
await loginPage.login(email, password);
```

**❌ Evitar:**

```typescript
// Locators directamente en el test
await page.locator("#email").fill(email);
await page.locator("#password").fill(password);
await page.locator("button[type='submit']").click();
```

### 3.4. Selectores

**Preferencia en orden:**

1. `data-testid="..."` - Más estable, solo para testing
2. `aria-label="..."` - Accesible y semántico
3. `role="button"` - Role de ARIA
4. IDs específicos - Solo si son estables

**❌ Evitar:**

- Selectores CSS frágiles (`.class1 > div:nth-child(3)`)
- XPath (menos legible, más frágil)
- Selectores por texto dinámico

### 3.5. Autenticación

Usar siempre `storageState` para evitar logins repetitivos:

```typescript
// playwright.config.ts
use: {
  storageState: 'tests/auth/.auth/adminInterno.json'
}
```

**❌ Evitar:** Login en cada test (slow, frágil, rate limiting)

### 3.6. Assertions

**Preferir assertions específicas:**

```typescript
// ✅ Específico
await expect(page.getByTestId("logo")).toBeVisible();

// ❌ Genérico
await expect(page.locator("img")).toBeTruthy();
```

---

## 4. Qué Evitar Testear

| No Testear | Motivo |
|------------|--------|
| Librerías de terceros | Ya tienen sus propios tests |
| CSS/estilos visuales (salvo crítica) | Frágil, cambia frecuentemente |
| Datos externos (APIs de terceros) | No controlamos su disponibilidad |
| Funcionalidad del framework | Ya testeado por Playwright/Jest |

---

## 5. Requisitos Mínimos de Calidad

### 5.1. Cobertura

| Tipo | Target Mínimo |
|------|---------------|
| Global (Unitarios) | ≥ 85% |
| Branches | ≥ 70% |
| Functions | ≥ 80% |
| Lines | ≥ 90% |
| Statements | ≥ 90% |

### 5.2. Criterios de Aceptación

Un PR **será rechazado** si:

- [ ] Cobertura de código disminuye respecto al baseline
- [ ] Tests unitarios nuevos no cubren el happy path + edge cases
- [ ] Tests E2E nuevos no pasan consistentemente (3 runs consecutivos)
- [ ] Tests agregados son flaky (intermitentes)
- [ ] No hay tests para flujos críticos modificados
- [ ] Page Objects nuevos no tienen tests unitarios

### 5.3. Código de Test

Todo test debe:

- [ ] Ser independiente de otros tests (puede correr solo)
- [ ] Limpiar recursos después de ejecutarse
- [ ] Tener nombres descriptivos (qué hace, no cómo)
- [ ] Usar Page Objects para interacciones UI
- [ ] Tener assertions específicas (no genéricas)

---

## 6. Pirámide de Tests - Aplicación Práctica

### Base: Unitarios (60%)

**Qué testear:**
- Lógica de Page Objects
- Utilidades y helpers
- Configuración y environment
- Validaciones y transforms de datos

**Herramienta:** Jest

**Ejemplo:**

```typescript
describe("LoginPage", () => {
  it("debería construir la URL correcta", () => {
    const page = new LoginPage(mockPage);
    expect(page.url).toContain("/login");
  });
});
```

---

### Medio: Integración (30%)

**Qué testear:**
- Controllers con servicios mock
- Middlewares de autenticación
- Routes y su wiring
- Integración con DB (en memoria)

**Herramienta:** Jest + mocks

---

### Tope: E2E (10%)

**Qué testear:**
- Flujos críticos de negocio (happy paths)
- Autenticación y autorización
- Navegación entre módulos
- Smoke tests de despliegue

**Herramienta:** Playwright

**Ejemplo:**

```typescript
test("cliente completo: login -> dashboard -> logout", async ({ page }) => {
  const dashboard = new ClienteDashboardFlow(page);
  await dashboard.loginAndNavigate();
  await expect(page).toHaveURL(/.*dashboard/);
});
```

---

## 7. Scripts y Comandos

```bash
# Desarrollo
npm run e2e:ui              # Playwright UI modo interactivo
npm run test:unit -- --watch  # Jest en modo watch

# Validación
npm run test:coverage        # Cobertura completa
npm run e2e                 # Suite E2E completa
npm run e2e:cliente         # E2E por rol

# Setup
npm run e2e:setup           # Regenerar storageStates
```

---

## 8. Checklist para Nuevo Test

Antes de commitear un nuevo test, verificar:

- [ ] Test pasa en local (3 runs consecutivos)
- [ ] Test pasa en CI
- [ ] Nombres descriptivos (UC-XXX, negocio)
- [ ] Usa Page Objects cuando aplica
- [ ] Limpia afterAll/afterEach si corresponde
- [ ] No depende del orden de ejecución
- [ ] Coverage no disminuye
- [ ] Documenta comportamiento no obvio si es necesario

---

## 9. Troubleshooting

### Tests Flaky

1. Verificar selectores (esperar estabilidad)
2. Agregar `await expect(...).toBeVisible()` antes de interactuar
3. Revisar timeouts (específicos vs globales)
4. Evitar sleeps fijos (`page.waitForTimeout`)

### Rate Limiting en Login

1. Usar `storageState` siempre
2. No crear tests de login inválido repetidamente
3. Regenerar setup con `npm run e2e:setup` si expira

### Coverage Baja

1. Identificar branches no cubiertas
2. Agregar casos edge en tests unitarios
3. Verificar que tests ejecuten todos los caminos

---

*Última actualización: Enero 2026*
