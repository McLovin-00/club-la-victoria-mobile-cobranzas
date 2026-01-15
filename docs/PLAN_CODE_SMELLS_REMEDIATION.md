# Plan de Remediación de Code Smells - monorepo-bca

**Fecha:** 15 de Enero 2026  
**Total Code Smells:** 196  
**Estimación Total:** 16-20 horas de trabajo

---

## 📊 Resumen Ejecutivo

| Severidad | Cantidad | Prioridad | Esfuerzo Est. |
|-----------|----------|-----------|---------------|
| CRITICAL  | 28       | 🔴 Alta   | 8-10h         |
| MAJOR     | 25       | 🟠 Media  | 4-5h          |
| MINOR     | 128      | 🟢 Baja   | 3-4h          |
| INFO      | 15       | ⚪ Mínima | 1h            |

---

## 📋 Clasificación por Regla SonarQube

| Regla | Descripción | Cantidad | Severidad | Dificultad |
|-------|-------------|----------|-----------|------------|
| S4325 | Type assertions innecesarias | 98 | MINOR | ⭐ Fácil |
| S3776 | Complejidad cognitiva > 15 | 28 | CRITICAL | ⭐⭐⭐ Alta |
| S1135 | Comentarios TODO pendientes | 15 | INFO | ⭐ Fácil |
| S3863 | Imports duplicados | 13 | MINOR | ⭐ Fácil |
| S3358 | Ternarios anidados | 12 | MAJOR | ⭐⭐ Media |
| S6353 | Regex: usar `\d`/`\D` | 9 | MINOR | ⭐ Fácil |
| S1874 | API deprecated (`connection` → `socket`) | 6 | MINOR | ⭐ Fácil |
| S1854 | Asignaciones sin uso | 4 | MAJOR | ⭐ Fácil |
| S5869 | Duplicados en regex char class | 3 | MAJOR | ⭐ Fácil |
| S4624 | Template literals anidados | 2 | MAJOR | ⭐⭐ Media |
| S4043 | Array.sort() en statement separado | 1 | MAJOR | ⭐ Fácil |
| S1871 | Branches con código idéntico | 1 | MAJOR | ⭐⭐ Media |
| S4138 | Usar `for-of` en vez de `for` | 1 | MINOR | ⭐ Fácil |
| S3696 | Throw Error object, no string | 1 | MAJOR | ⭐ Fácil |
| S4323 | Union type → type alias | 1 | MINOR | ⭐ Fácil |
| S5843 | Regex muy compleja | 1 | MAJOR | ⭐⭐ Media |

---

## 🗓️ Plan de Ejecución por Sprints

### Sprint 1: CRITICAL - Complejidad Cognitiva (8-10h)
**Prioridad:** 🔴 Máxima  
**Objetivo:** Reducir complejidad cognitiva de 28 funciones

#### Archivos afectados (ordenados por cantidad de issues):

| Archivo | Issues | Complejidad Actual | Acciones |
|---------|--------|-------------------|----------|
| `portal-cliente.controller.ts` | 5 | 22, 28, 21, 25, 22 | Extraer subfunciones, early returns |
| `equipo.service.ts` | 4 | 17, 32, 17, 17 | Dividir en métodos helper |
| `approval.controller.ts` | 2 | 19, 16 | Simplificar validaciones |
| `documents.controller.ts` | 1 | 17 | Extraer lógica de filtrado |
| `portal-transportista.controller.ts` | 1 | 17 | Early returns |
| `permissions.service.ts` | 1 | 19 | Tabla de lookup |
| `approval.service.ts` | 1 | 17 | Extraer validaciones |
| `transportistas.routes.ts` | 1 | 16 | Simplificar validación |
| `equipos.routes.ts` | 1 | 20 | Dividir middleware |
| `batch.routes.ts` | 1 | 20 | Extraer lógica |
| `evolution-config.controller.ts` | 1 | 21 | Early returns |
| `flowise-config.controller.ts` | 1 | 19 | Simplificar switch |
| `notification.service.ts` | 1 | 20 | Tabla de lookup |
| `clients.service.ts` | 1 | 21 | Extraer filtros |
| `ownership.middleware.ts` | 1 | 17 | Early returns |
| `app.ts` (backend) | 1 | 17 | Extraer setup |
| `user.controller.ts` | 1 | 21 | Dividir validaciones |
| `database-initialization.service.ts` | 1 | 17 | Async/await cleanup |
| `instance.controller.ts` | 1 | 18 | Simplificar |
| `flowise.service.ts` (remitos) | 1 | 18 | Extraer parsing |

#### Técnicas de refactoring a aplicar:

```typescript
// ANTES: Complejidad alta con múltiples if anidados
async function processDocument(doc: Document) {
  if (doc.type === 'A') {
    if (doc.status === 'pending') {
      if (doc.user) {
        // más lógica...
      }
    }
  }
}

// DESPUÉS: Early returns + funciones helper
async function processDocument(doc: Document) {
  if (!isValidDocument(doc)) return;
  if (!isPending(doc)) return;
  if (!hasUser(doc)) return;
  
  await processValidDocument(doc);
}
```

---

### Sprint 2: MAJOR - Correcciones Medianas (4-5h)
**Prioridad:** 🟠 Alta

#### 2.1 Ternarios Anidados (S3358) - 12 issues

| Archivo | Líneas |
|---------|--------|
| `documents.controller.ts` | 109, 115, 889 |
| `flowise.service.ts` | 309, 504, 505 |
| `remitos.controller.ts` | 23, 25, 34 |
| `autoFilterByDador.middleware.ts` | 26 |
| `minio.service.ts` | 104 |
| `remito.service.ts` | 366 |

**Fix pattern:**
```typescript
// ANTES
const value = a ? (b ? x : y) : z;

// DESPUÉS
let value: string;
if (a) {
  value = b ? x : y;
} else {
  value = z;
}
```

#### 2.2 Asignaciones sin uso (S1854) - 4 issues

| Archivo | Variable | Línea |
|---------|----------|-------|
| `pdf-rasterize.service.ts` | `files`, `file` | 86, 87 |
| `pdf.service.ts` (remitos) | `files`, `file` | 83, 84 |

#### 2.3 Duplicados en regex (S5869) - 3 issues

| Archivo | Línea |
|---------|-------|
| `portal-cliente.controller.ts` | 790, 887, 1034 |

#### 2.4 Template literals anidados (S4624) - 2 issues

| Archivo | Línea |
|---------|-------|
| `approval.service.ts` | 479 |
| `logger.ts` (backend) | 180 |

#### 2.5 Otros MAJOR - 4 issues

- `instance.controller.ts:42` - Branches idénticos (S1871)
- `flowise.service.ts:260` - Regex muy compleja (S5843)
- `portal-cliente.controller.ts:839` - Array.sort separado (S4043)
- `packages/utils/src/index.ts:276` - Throw Error object (S3696)

---

### Sprint 3: MINOR - Limpieza Masiva (3-4h)
**Prioridad:** 🟢 Normal

#### 3.1 Type Assertions Innecesarias (S4325) - 98 issues

**Archivos con más issues:**

| Archivo | Cantidad |
|---------|----------|
| `app.ts` (backend) | 12 |
| `documents.controller.ts` | 10 |
| `approval.service.ts` | 8 |
| `document.service.ts` | 9 |
| `websocket.service.ts` | 8 |
| `performance.service.ts` | 5 |
| `platformAuth.service.ts` | 6 |
| `platformAuth.controller.ts` | 4 |
| Otros (20+ archivos) | 36 |

**Fix:** Remover `as Type` cuando TypeScript ya infiere el tipo:
```typescript
// ANTES
const value = someFunction() as string;

// DESPUÉS (si TypeScript ya sabe que es string)
const value = someFunction();
```

#### 3.2 Imports Duplicados (S3863) - 13 issues

| Archivo | Import duplicado |
|---------|-----------------|
| `equipos.routes.ts` | `validation.schemas` |
| `empresa.routes.ts` | `express-validator` |
| `instance.routes.ts` | `express-validator` |
| `permiso.routes.ts` | `express-validator` |
| `service.routes.ts` | `express-validator` |
| `transportistas.ts` | `express` |
| `debug-migration.ts` | `@prisma/client` |
| `audit.routes.ts` | `auth.middleware` |
| `config.routes.ts` | `auth.middleware` |
| `documents.routes.ts` | `auth.middleware` |
| `empresas-transportistas.routes.ts` | `auth.middleware` |
| `index.ts` (routes) | `rateLimiter.middleware` |
| `templates.routes.ts` | `auth.middleware` |

#### 3.3 Regex Concisa (S6353) - 9 issues

**Cambios simples:**
- `[0-9]` → `\d`
- `[^0-9]` → `\D`

| Archivo | Líneas |
|---------|--------|
| `portal-cliente.controller.ts` | 750, 751, 869, 870, 1016, 1017 |
| `transportistas.routes.ts` | 38 |
| `platformAuth.service.ts` | 159 |
| `packages/utils/src/index.ts` | 33 |

#### 3.4 API Deprecated (S1874) - 6 issues

Cambiar `req.connection` → `req.socket`:

| Archivo | Líneas |
|---------|--------|
| `audit.middleware.ts` | 39 |
| `validation.middleware.ts` | 143, 167, 188 |
| `logging.middleware.ts` | 15, 47 |

#### 3.5 Otros MINOR - 3 issues

- `media.service.ts:136` - Usar `for-of` (S4138)
- `status.service.ts:13` - Type alias (S4323)

---

### Sprint 4: INFO - TODOs (1h)
**Prioridad:** ⚪ Baja

#### Revisar y resolver/eliminar 15 TODOs:

| Archivo | Línea | Acción sugerida |
|---------|-------|-----------------|
| `portal-cliente.controller.ts` | 324 | Revisar si aún aplica |
| `documents.controller.ts` | 1011 | Revisar |
| `portal-transportista.controller.ts` | 18, 73, 138, 260, 342, 410 | Revisar/eliminar |
| `performance.service.ts` | 343, 344 | Revisar |
| `audit.middleware.ts` | 135, 146 | Revisar |
| `platformAuth.middleware.ts` | 59 | Revisar |
| `resetTemplates.ts` | 67 | Revisar |
| `alert.service.ts` | 200 | Revisar |

---

## 🔧 Scripts de Automatización

### Script para S4325 (assertions innecesarias)
```bash
# Identificar assertions innecesarias automáticamente
npx eslint . --rule '@typescript-eslint/no-unnecessary-type-assertion: error' --fix
```

### Script para S3863 (imports duplicados)
```bash
# Detectar y arreglar imports duplicados
npx eslint . --rule 'import/no-duplicates: error' --fix
```

### Script para S6353 (regex concisa)
```bash
# Buscar patrones de regex a simplificar
grep -rn "\[0-9\]" apps/ packages/
grep -rn "\[\^0-9\]" apps/ packages/
```

---

## ✅ Checklist de Validación

Después de cada Sprint, ejecutar:

```bash
# 1. Lint
npm run lint --workspaces

# 2. Compilación
npm run build --workspaces

# 3. Tests (cuando estén listos)
npm run test --workspaces

# 4. SonarQube
docker run --rm \
  -e SONAR_HOST_URL="http://10.3.0.244:9900" \
  -e SONAR_TOKEN="squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856" \
  -v "$(pwd):/usr/src" \
  sonarsource/sonar-scanner-cli
```

---

## 📈 Métricas de Éxito

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Code Smells | 196 | 0 |
| CRITICAL | 28 | 0 |
| MAJOR | 25 | 0 |
| Maintainability Rating | A | A |
| Technical Debt | ~4d | < 1d |

---

## 🚀 Orden de Ejecución Recomendado

1. **Sprint 1** - CRITICAL primero (máximo impacto en calidad)
2. **Sprint 3.1** - S4325 (98 issues con un solo tipo de fix)
3. **Sprint 2** - MAJOR (mejora legibilidad)
4. **Sprint 3.2-3.5** - Resto de MINOR
5. **Sprint 4** - TODOs (limpieza final)

---

## 📝 Notas

- Los tests de cobertura están siendo manejados por otro developer en branch separada
- Cada Sprint debe terminar con código compilable y sin errores de lint
- Commits atómicos siguiendo Conventional Commits: `fix(scope): descripción`
