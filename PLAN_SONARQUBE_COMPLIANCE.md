# 📋 Plan de Cumplimiento SonarQube - Monorepo BCA

> **Objetivo:** Alcanzar estándares aceptables de calidad de código según ISO 9001 y mejores prácticas de la industria.
> 
> **Fecha de inicio:** 21 de Diciembre 2025  
> **Duración estimada:** 6-8 semanas (4 sprints)

---

## 📊 Estado Actual vs Objetivo

| Métrica | Actual | Objetivo | Prioridad |
|---------|--------|----------|-----------|
| **Bugs** | 2 | 0 | 🔴 Crítica |
| **Vulnerabilidades** | 0 | 0 | ✅ Cumple |
| **Cobertura** | 0.0% | ≥80% | 🔴 Crítica |
| **Reliability Rating** | C | A | 🔴 Crítica |
| **Security Hotspots** | 123 | 0 TO_REVIEW | 🟠 Alta |
| **Code Smells** | 286 | <200 | 🟡 Media |
| **Issues CRITICAL** | 88 | 0 | 🟠 Alta |
| **Max Complejidad** | 86 | <50 | 🔴 Crítica |
| **Duplicación** | 2.5% | <3% | ✅ Cumple |
| **Deuda Técnica** | 0.2% | <5% | ✅ Cumple |

---

## 🗓️ Roadmap por Sprints

### Sprint 1: Fundamentos y Bugs Críticos (Semana 1-2)

**Objetivo:** Eliminar bugs, arreglar infraestructura de tests, lograr cobertura inicial.

#### 1.1 Corregir Bugs de Regex (2 MAJOR) ⏱️ 2h

**Archivo:** `apps/documentos/src/controllers/documents.controller.ts`

**Líneas afectadas:** 176, 193

**Problema:** Expresiones regulares sin agrupación explícita de precedencia de operadores.

**Acción:**
```typescript
// ANTES (ejemplo típico)
const regex = /pattern|alternative/;

// DESPUÉS (con agrupación explícita)
const regex = /(pattern)|(alternative)/;
// O bien:
const regex = /(?:pattern)|(?:alternative)/;
```

**Comando para verificar:**
```bash
npm run lint -- --fix apps/documentos/src/controllers/documents.controller.ts
```

#### 1.2 Arreglar Infraestructura de Tests ⏱️ 4h

**Problema:** `apps/remitos` no tiene `jest.config.js`

**Acción:** Crear configuración de Jest para remitos:

```bash
# Crear jest.config.js en apps/remitos
cat > apps/remitos/jest.config.js << 'EOF'
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  passWithNoTests: true,
};
EOF
```

**Verificar:**
```bash
cd /home/administrador/monorepo-bca
npm test
```

#### 1.3 Configurar Cobertura de Código ⏱️ 2h

**Archivo:** `apps/documentos/jest.config.js` y `apps/backend/jest.config.js`

**Añadir configuración de cobertura:**
```javascript
module.exports = {
  // ... configuración existente ...
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 30,    // Sprint 1: objetivo inicial
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
};
```

#### 1.4 Escribir Tests para Rutas Críticas ⏱️ 16h

**Prioridad de archivos (por complejidad y criticidad):**

| # | Archivo | Complejidad | Tests a crear |
|---|---------|-------------|---------------|
| 1 | `documents.controller.ts` | 86 | `documents.controller.test.ts` |
| 2 | `portal-cliente.controller.ts` | 49 | `portal-cliente.controller.test.ts` |
| 3 | `notification.service.ts` | 47 | Ampliar `notification.service.test.ts` |
| 4 | `equipo-estado.service.ts` | 40 | `equipo-estado.service.test.ts` |

**Template de test:**
```typescript
// __tests__/documents.controller.uploadDocument.test.ts
import { DocumentsController } from '../src/controllers/documents.controller';
import { db } from '../src/config/database';
import { minioService } from '../src/services/minio.service';

jest.mock('../src/config/database');
jest.mock('../src/services/minio.service');

describe('DocumentsController.uploadDocument', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validaciones', () => {
    it('debe rechazar si no hay archivos', async () => {
      // Arrange
      const req = mockRequest({ body: {}, files: [] });
      const res = mockResponse();
      
      // Act & Assert
      await expect(DocumentsController.uploadDocument(req, res))
        .rejects.toThrow('Se requiere al menos una imagen o PDF');
    });

    it('debe validar permisos de empresa para TRANSPORTISTA', async () => {
      // ...
    });
  });

  describe('Flujo exitoso', () => {
    it('debe subir documento y encolarlo para clasificación', async () => {
      // ...
    });
  });
});
```

**Meta Sprint 1:** Cobertura **30%**

---

### Sprint 2: Refactorización de Complejidad (Semana 3-4)

**Objetivo:** Reducir complejidad cognitiva de funciones >50 y eliminar issues CRITICAL.

#### 2.1 Refactorizar `documents.controller.ts:39` (CC=86) ⏱️ 8h

**Estrategia: Extracción de métodos**

```typescript
// ANTES: Una función monolítica de 200+ líneas con CC=86
static async uploadDocument(req: AuthRequest, res: Response): Promise<void> {
  // Toda la lógica mezclada
}

// DESPUÉS: Funciones pequeñas y enfocadas
static async uploadDocument(req: AuthRequest, res: Response): Promise<void> {
  const input = this.parseUploadInput(req);
  await this.validateUploadPermissions(req.user, input.dadorId);
  const template = await this.validateTemplate(input.templateId);
  const files = await this.processUploadedFiles(req, input);
  const documents = await this.saveDocuments(files, input, template);
  await this.enqueueForClassification(documents);
  res.status(201).json({ documents, count: documents.length });
}

private static parseUploadInput(req: AuthRequest): UploadInput {
  // Lógica de parsing (~10 líneas)
}

private static async validateUploadPermissions(user: User, dadorId: number): Promise<void> {
  // Lógica de permisos (~15 líneas)
}

private static async validateTemplate(templateId: number): Promise<Template> {
  // Lógica de validación (~10 líneas)
}

private static async processUploadedFiles(req: AuthRequest, input: UploadInput): Promise<ProcessedFile[]> {
  // Lógica de procesamiento (~20 líneas)
}
```

**Objetivo:** CC < 15 para función principal, CC < 25 para helpers.

#### 2.2 Refactorizar Otras Funciones de Alta Complejidad ⏱️ 12h

| Archivo | Línea | CC Actual | CC Objetivo |
|---------|-------|-----------|-------------|
| `portal-cliente.controller.ts` | 20 | 49 | <25 |
| `notification.service.ts` | 105 | 47 | <25 |
| `equipo-estado.service.ts` | 22 | 40 | <25 |
| `portal-cliente.controller.ts` | 236 | 38 | <20 |
| `document-validation.worker.ts` | 87 | 36 | <20 |
| `equipo.service.ts` | 1743 | 36 | <20 |

**Técnicas de refactorización:**

1. **Extract Method:** Dividir en funciones pequeñas
2. **Replace Conditional with Polymorphism:** Para múltiples if/else
3. **Replace Nested Conditional with Guard Clauses:** Early returns
4. **Introduce Parameter Object:** Cuando hay muchos parámetros

**Ejemplo Guard Clauses:**
```typescript
// ANTES (CC alto)
function process(data) {
  if (data) {
    if (data.isValid) {
      if (data.hasPermission) {
        // lógica real
      }
    }
  }
}

// DESPUÉS (CC bajo)
function process(data) {
  if (!data) return;
  if (!data.isValid) return;
  if (!data.hasPermission) return;
  // lógica real
}
```

#### 2.3 Ampliar Tests para Código Refactorizado ⏱️ 8h

**Regla:** Todo código refactorizado debe mantener o aumentar cobertura.

**Meta Sprint 2:** Cobertura **50%**, CC máximo **50**

---

### Sprint 3: Security Hotspots y Code Smells (Semana 5-6)

**Objetivo:** Revisar y resolver security hotspots, reducir code smells.

#### 3.1 Resolver Security Hotspots por Categoría ⏱️ 16h

**Distribución actual:**

| Categoría | Cantidad | Acción |
|-----------|----------|--------|
| `encrypt-data` | 37 | Revisar uso de crypto |
| `permission` | 24 | Verificar permisos de archivos |
| `dos` | 23 | Validar límites de recursos |
| `auth` | 18 | Revisar credenciales hardcodeadas |
| `others` | 13 | Revisar caso por caso |
| `weak-cryptography` | 5 | Actualizar algoritmos |
| `command-injection` | 1 | Sanitizar entrada |
| `insecure-conf` | 1 | Revisar configuración |
| `sql-injection` | 1 | Usar queries parametrizadas |

**Acciones por categoría:**

##### 3.1.1 `auth` - Credenciales Hardcodeadas (18)

**Ubicación principal:** `import-data/*.js` (scripts de desarrollo)

**Acción:**
```javascript
// ANTES
const API_URL = 'http://localhost:4802';
const TOKEN = 'eyJ...hardcoded...';

// DESPUÉS
const API_URL = process.env.API_URL || 'http://localhost:4802';
const TOKEN = process.env.AUTH_TOKEN;
if (!TOKEN) throw new Error('AUTH_TOKEN environment variable required');
```

**O bien:** Mover `import-data/` a exclusiones de SonarQube en `sonar-project.properties`:
```properties
sonar.exclusions=**/node_modules/**,...,**/import-data/**
```

##### 3.1.2 `encrypt-data` - Datos Sensibles (37)

**Revisar:**
- Uso de `crypto.randomBytes()` para tokens
- Algoritmos de hash (bcrypt para passwords, SHA-256 para integridad)
- Transmisión de datos sensibles (HTTPS obligatorio)

##### 3.1.3 `dos` - Denial of Service (23)

**Revisar:**
- Rate limiting configurado ✅ (ya existe)
- Límites de tamaño de archivo ✅ (50MB en multer)
- Timeouts en conexiones externas
- Paginación en queries

**Añadir timeouts si faltan:**
```typescript
// En servicios externos
const response = await axios.get(url, {
  timeout: 30000, // 30 segundos
  signal: AbortSignal.timeout(30000),
});
```

##### 3.1.4 `command-injection` (1)

**Archivo:** `apps/backend/src/scripts/setup-database.ts:14`

**Revisar:** Uso de `exec()` o `spawn()` con entrada del usuario.

```typescript
// ANTES (peligroso)
exec(`psql ${userInput}`);

// DESPUÉS (seguro)
import { execFile } from 'child_process';
execFile('psql', ['-d', sanitizedDbName], { env: process.env });
```

##### 3.1.5 `sql-injection` (1)

**Archivo:** `apps/backend/scripts/reset-database.ts:238`

**Revisar:** Usar Prisma queries (ya seguros) o queries parametrizadas:

```typescript
// ANTES (peligroso)
await prisma.$executeRawUnsafe(`DELETE FROM ${tableName}`);

// DESPUÉS (seguro - si tableName es controlado)
const allowedTables = ['users', 'documents', 'equipos'];
if (!allowedTables.includes(tableName)) throw new Error('Invalid table');
await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}"`);
```

#### 3.2 Reducir Code Smells (286 → <200) ⏱️ 8h

**Reglas más frecuentes a corregir:**

1. **Unused variables:** Eliminar o usar
2. **Any type:** Reemplazar con tipos específicos
3. **Console.log:** Reemplazar con logger
4. **TODO comments:** Resolver o crear issues

```bash
# Identificar code smells más comunes
curl -s -u "squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856:" \
  "http://10.3.0.244:9900/api/issues/search?projectKeys=monorepo-bca&types=CODE_SMELL&ps=1&facets=rules" \
  | jq '.facets[] | select(.property == "rules") | .values | sort_by(-.count) | .[0:10]'
```

**Meta Sprint 3:** 
- Security Hotspots: <20 TO_REVIEW
- Code Smells: <200
- Cobertura: **65%**

---

### Sprint 4: Cobertura 80% y Estabilización (Semana 7-8)

**Objetivo:** Alcanzar cobertura objetivo y establecer gates de calidad.

#### 4.1 Completar Cobertura de Tests ⏱️ 24h

**Archivos prioritarios sin tests:**

```bash
# Identificar archivos sin cobertura
npm test -- --coverage --collectCoverageFrom='src/**/*.ts'
```

**Estrategia de testing:**

| Tipo de archivo | Estrategia | Cobertura objetivo |
|-----------------|------------|-------------------|
| Controllers | Integration tests con supertest | 90% |
| Services | Unit tests con mocks | 85% |
| Middlewares | Unit tests | 80% |
| Utils | Unit tests puras | 95% |
| Workers | Integration tests | 70% |

**Ejemplo test de integración:**
```typescript
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/config/database';

describe('POST /api/docs/documents/upload', () => {
  beforeAll(async () => {
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  it('debe subir un documento PDF válido', async () => {
    const response = await request(app)
      .post('/api/docs/documents/upload')
      .set('Authorization', `Bearer ${testToken}`)
      .attach('document', 'test-fixtures/sample.pdf')
      .field('templateId', '1')
      .field('entityType', 'CHOFER')
      .field('entityId', '1')
      .field('dadorCargaId', '1');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('documents');
  });
});
```

#### 4.2 Configurar Quality Gate Obligatorio ⏱️ 4h

**En SonarQube (http://10.3.0.244:9900):**

1. Quality Gates → Create
2. Nombre: `Monorepo BCA Gate`
3. Condiciones:

| Métrica | Operador | Valor | Aplica a |
|---------|----------|-------|----------|
| Coverage on New Code | < | 80% | New Code |
| Duplicated Lines on New Code | > | 3% | New Code |
| Maintainability Rating on New Code | worse than | A | New Code |
| Reliability Rating on New Code | worse than | A | New Code |
| Security Rating on New Code | worse than | A | New Code |
| Security Hotspots Reviewed | < | 100% | New Code |
| Bugs | > | 0 | Overall |
| Vulnerabilities | > | 0 | Overall |

#### 4.3 Integrar en CI/CD ⏱️ 4h

**Actualizar `.github/workflows/monorepo-ci.yml`:**

```yaml
name: CI Quality Check

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Run Lint
        run: npm run lint

      - name: Run Tests with Coverage
        run: npm test -- --coverage

      - name: Upload Coverage to SonarQube
        uses: SonarSource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}

      - name: Quality Gate Check
        uses: sonarsource/sonarqube-quality-gate-action@master
        timeout-minutes: 5
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
```

**Meta Sprint 4:** 
- Cobertura: **≥80%**
- Bugs: **0**
- Reliability Rating: **A**
- Quality Gate: **Passed**

---

## 📈 Métricas de Seguimiento

### Dashboard de Progreso

| Sprint | Cobertura | Bugs | CC Max | Code Smells | Hotspots |
|--------|-----------|------|--------|-------------|----------|
| Inicial | 0% | 2 | 86 | 286 | 123 |
| Sprint 1 | 30% | 0 | 86 | 280 | 123 |
| Sprint 2 | 50% | 0 | 50 | 250 | 100 |
| Sprint 3 | 65% | 0 | 40 | 200 | 20 |
| Sprint 4 | 80% | 0 | 30 | 150 | 0 |

### Comando para Verificar Progreso

```bash
# Ejecutar análisis y ver métricas
cd /home/administrador/monorepo-bca

# 1. Ejecutar tests con cobertura
npm test -- --coverage

# 2. Ejecutar análisis SonarQube
docker run --rm \
  -e SONAR_HOST_URL="http://10.3.0.244:9900" \
  -e SONAR_TOKEN="squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856" \
  -v "$(pwd):/usr/src" \
  sonarsource/sonar-scanner-cli

# 3. Ver métricas actualizadas
curl -s -u "squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856:" \
  "http://10.3.0.244:9900/api/measures/component?component=monorepo-bca&metricKeys=bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,reliability_rating,security_rating,sqale_rating" \
  | jq '.component.measures[] | {metric: .metric, value: .value}'
```

---

## 🛠️ Herramientas y Tecnologías

### Versiones Recomendadas (Diciembre 2025)

| Herramienta | Versión Actual | Última Estable | Acción |
|-------------|----------------|----------------|--------|
| Node.js | 20.x | 22.x LTS | Migrar cuando sea LTS |
| TypeScript | 5.x | 5.7.x | ✅ Actualizado |
| Jest | 29.x | 29.7.x | ✅ Actualizado |
| SonarQube | 9.9.8 | 10.7 LTS | Planificar upgrade |
| Prisma | 5.x | 6.x | Evaluar migración |

### Configuración de `sonar-project.properties` Optimizada

```properties
# Configuración actualizada para monorepo-bca
sonar.projectKey=monorepo-bca
sonar.projectName=Monorepo BCA
sonar.projectVersion=2.0

# URL del servidor SonarQube
sonar.host.url=http://10.3.0.244:9900

# Directorios de código fuente
sonar.sources=apps/backend/src,apps/documentos/src,apps/frontend/src,apps/remitos/src,packages

# Exclusiones (actualizadas)
sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/coverage/**,**/.next/**,**/prisma/migrations/**,**/import-data/**,**/__mocks__/**

# Tests
sonar.tests=apps/backend/__tests__,apps/documentos/__tests__,apps/remitos/__tests__
sonar.test.inclusions=**/*.test.ts,**/*.spec.ts

# Cobertura
sonar.javascript.lcov.reportPaths=apps/backend/coverage/lcov.info,apps/documentos/coverage/lcov.info,apps/frontend/coverage/lcov.info,apps/remitos/coverage/lcov.info

# TypeScript
sonar.typescript.tsconfigPaths=apps/backend/tsconfig.json,apps/documentos/tsconfig.json,apps/frontend/tsconfig.json,apps/remitos/tsconfig.json

# Encoding
sonar.sourceEncoding=UTF-8
```

---

## ✅ Checklist de Cumplimiento Final

### Métricas Obligatorias (ISO 9001 + SonarQube)

- [ ] **Bugs = 0** (Reliability Rating A)
- [ ] **Vulnerabilities = 0** (Security Rating A)
- [ ] **Cobertura ≥ 80%** (en código nuevo)
- [ ] **Duplicación < 3%** (en código nuevo)
- [ ] **Deuda Técnica < 5%** (Maintainability Rating A)
- [ ] **Complejidad Cognitiva < 50** (por función)
- [ ] **Security Hotspots 100% Reviewed**
- [ ] **Quality Gate = PASSED**

### Documentación

- [ ] Tests documentados con describe/it claros
- [ ] ADR para decisiones de refactorización
- [ ] README actualizado con instrucciones de testing
- [ ] CHANGELOG actualizado

---

## 📚 Referencias

1. **SonarSource Documentation** - https://docs.sonarqube.org
2. **Cognitive Complexity White Paper** - G. Ann Campbell (SonarSource, 2017)
3. **ISO 9001:2015** - Sistemas de gestión de la calidad
4. **Clean Code** - Robert C. Martin
5. **Refactoring** - Martin Fowler

---

**Última actualización:** 21 de Diciembre 2025  
**Responsable:** Tech Lead  
**Próxima revisión:** Fin de Sprint 1

