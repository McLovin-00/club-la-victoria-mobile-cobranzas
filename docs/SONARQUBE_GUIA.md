# SonarQube - Guía de Acceso, Diagnóstico y Lectura de Resultados

**Proyecto**: Monorepo BCA  
**Última actualización**: 2026-03-05  
**Versión SonarQube**: 9.9.8 (Community Edition)

---

## 1. Acceso al Servidor

### Datos de conexión

| Dato | Valor |
|------|-------|
| **URL** | http://10.3.0.244:9900 |
| **Servidor** | 10.3.0.244 (Docker) |
| **Puerto** | 9900 |
| **Project Key** | `monorepo-bca` |
| **Dashboard** | http://10.3.0.244:9900/dashboard?id=monorepo-bca |

### Credenciales de la UI

| Campo | Valor |
|-------|-------|
| **Usuario** | `admin` |
| **Contraseña** | `admin` (default de SonarQube) |

> Si la contraseña fue cambiada y no se recuerda, se puede resetear desde la base de datos
> del contenedor Docker en la 244.

### Token de API (lectura + análisis)

```
squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856
```

- **Scope**: Global (scan, admin, gateadmin, profileadmin, provisioning)
- **Usuario asociado**: `admin`
- Este token sirve tanto para consultar issues via MCP como para ejecutar análisis

### MCP (Model Context Protocol) en Cursor

El MCP de SonarQube está configurado en Cursor con estos datos:

```json
{
  "sonarqube": {
    "command": "npx",
    "args": ["-y", "oe-sonar-mcp@latest"],
    "env": {
      "SONARQUBE_TOKEN": "squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856",
      "SONARQUBE_URL": "http://10.3.0.244:9900"
    }
  }
}
```

Herramienta disponible: `issues` (consulta de issues del proyecto).

---

## 2. Cómo Ejecutar un Análisis (Diagnóstico)

### Prerrequisito

- Docker instalado en la máquina local
- Conectividad de red a `10.3.0.244:9900`
- Estar posicionado en la raíz del monorepo (`/home/administrador/monorepo-bca`)

### Comando de ejecución

```bash
cd /home/administrador/monorepo-bca

docker run --rm \
  -e SONAR_HOST_URL="http://10.3.0.244:9900" \
  -e SONAR_TOKEN="squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856" \
  -v "$(pwd):/usr/src" \
  sonarsource/sonar-scanner-cli
```

### Qué hace este comando

1. Levanta un contenedor Docker con `sonar-scanner-cli` (incluye Java, no requiere instalación local)
2. Monta el directorio del proyecto en `/usr/src` dentro del contenedor
3. Lee la configuración de `sonar-project.properties` en la raíz del proyecto
4. Indexa los archivos fuente de las 6 apps/packages
5. Ejecuta el análisis estático (bugs, vulnerabilidades, code smells, cobertura)
6. Sube el reporte al servidor SonarQube en la 244
7. El servidor procesa el reporte (puede demorar 1-2 minutos adicionales)

### Tiempos esperados

| Fase | Duración |
|------|----------|
| Descarga de imagen Docker (primera vez) | ~30 seg |
| Indexación de archivos | ~10 seg |
| Análisis estático (TypeScript/JavaScript) | ~3 min |
| Subida del reporte | ~5 seg |
| Procesamiento en servidor | ~2 min |
| **Total** | **~4-5 min** |

### Verificar que el análisis se procesó

```bash
curl -s -u "squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856:" \
  "http://10.3.0.244:9900/api/ce/activity?component=monorepo-bca&ps=1" \
  | python3 -m json.tool
```

Buscar `"status": "SUCCESS"` en la respuesta.

### Salida esperada (éxito)

```
INFO  ANALYSIS SUCCESSFUL, you can find the results at:
      http://10.3.0.244:9900/dashboard?id=monorepo-bca
INFO  EXECUTION SUCCESS
INFO  Total time: 4:22s
```

### Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Not authorized to run analysis` | Token sin permiso de scan | Generar nuevo token con scope "Execute Analysis" en My Account → Security |
| `404 on /api/server/version` | Servidor SonarQube caído o URL incorrecta | Verificar que `http://10.3.0.244:9900` responda |
| `Permission denied` (sonar-scanner local) | Java no instalado en la máquina | Usar el método Docker (no requiere Java) |
| `Could not find tsconfig` | tsconfig.json no encontrado | Verificar rutas en `sonar.typescript.tsconfigPaths` |

---

## 3. Cómo Leer los Resultados

### 3.1 Dashboard Web

Acceder a http://10.3.0.244:9900/dashboard?id=monorepo-bca

El dashboard muestra dos vistas:

#### Vista "Overall Code" (todo el código)

| Métrica | Significado | Objetivo |
|---------|-------------|----------|
| **Bugs** | Errores que pueden causar comportamiento incorrecto | 0 (Rating A) |
| **Vulnerabilities** | Problemas de seguridad explotables | 0 (Rating A) |
| **Code Smells** | Problemas de mantenibilidad | 0 (Rating A) |
| **Coverage** | % de líneas cubiertas por tests | ≥ 80% |
| **Duplications** | % de código duplicado | ≤ 3% |
| **Lines of Code** | Total de líneas analizadas | Informativo |

#### Vista "New Code" (código nuevo desde el último período)

Estas métricas determinan si el **Quality Gate** pasa o falla:

| Condición | Umbral |
|-----------|--------|
| New Reliability Rating | ≤ A (0 bugs nuevos) |
| New Security Rating | ≤ A (0 vulnerabilidades nuevas) |
| New Maintainability Rating | ≤ A (0 code smells nuevos) |
| New Coverage | ≥ 80% |
| New Duplicated Lines | ≤ 3% |

### 3.2 Quality Gate

- **Passed** (verde): Todas las condiciones se cumplen. El código es apto.
- **Failed** (rojo): Al menos una condición no se cumple. Requiere corrección.

### 3.3 Severidades de Issues

| Severidad | Significado | Acción |
|-----------|-------------|--------|
| **BLOCKER** | Bug o vulnerabilidad que afecta producción | Corregir inmediatamente |
| **CRITICAL** | Alto impacto en fiabilidad o seguridad | Corregir antes de merge |
| **MAJOR** | Impacto moderado en mantenibilidad | Corregir en el sprint |
| **MINOR** | Bajo impacto, mejora de estilo o convención | Corregir cuando sea conveniente |
| **INFO** | Sugerencia informativa | Evaluar si aplica |

### 3.4 Tipos de Issues

| Tipo | Descripción |
|------|-------------|
| **Bug** | Código que produce o puede producir comportamiento incorrecto |
| **Vulnerability** | Punto de entrada para un atacante |
| **Code Smell** | Problema de mantenibilidad (complejidad, duplicación, naming) |
| **Security Hotspot** | Código sensible que requiere revisión manual |

### 3.5 Consulta de Issues via API (desde terminal)

```bash
# Todos los issues abiertos
curl -s -u "squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856:" \
  "http://10.3.0.244:9900/api/issues/search?projectKeys=monorepo-bca&statuses=OPEN,CONFIRMED,REOPENED" \
  | python3 -m json.tool

# Solo CRITICAL y BLOCKER
curl -s -u "squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856:" \
  "http://10.3.0.244:9900/api/issues/search?projectKeys=monorepo-bca&severities=CRITICAL,BLOCKER&statuses=OPEN" \
  | python3 -m json.tool

# Métricas generales del proyecto
curl -s -u "squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856:" \
  "http://10.3.0.244:9900/api/measures/component?component=monorepo-bca&metricKeys=bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,ncloc,alert_status" \
  | python3 -m json.tool
```

### 3.6 Consulta de Issues via MCP (desde Cursor)

El MCP `user-sonarqube` expone la herramienta `issues` con estos filtros útiles:

```
project_key: "monorepo-bca"
statuses: ["OPEN", "CONFIRMED", "REOPENED"]
severities: ["CRITICAL", "BLOCKER"]
types: ["BUG", "VULNERABILITY", "CODE_SMELL"]
facets: ["severities", "types", "rules", "directories"]
```

---

## 4. Configuración del Proyecto

### Archivo de configuración

Ubicación: `/home/administrador/monorepo-bca/sonar-project.properties`

### Fuentes analizadas

| App/Package | Directorio |
|-------------|-----------|
| Backend | `apps/backend/src` |
| Documentos | `apps/documentos/src` |
| Frontend | `apps/frontend/src` |
| Remitos | `apps/remitos/src` |
| Types | `packages/types/src` |
| Utils | `packages/utils/src` |

### Exclusiones del análisis

- `node_modules`, `dist`, `build`, `coverage`
- Migraciones de Prisma
- Archivos de test (`*.test.ts`, `*.spec.ts`)
- Scripts de desarrollo y datos de importación

### Exclusiones de cobertura

- Archivos de configuración (`*.config.ts`)
- Archivos de routing y setup (`routes/`, `server.ts`, `App.tsx`)
- Mocks y fixtures de test
- Servicios de WebSocket
- Hooks complejos con muchas dependencias

### Reglas suprimidas (con justificación documentada)

| Regla | Archivo | Motivo |
|-------|---------|--------|
| S4325 | `services/**/*.ts` | Type assertions requeridos por Prisma JSON fields |
| S4721/S2076 | `setup-database.ts` | Comandos hardcodeados (whitelist), solo dev |
| S5693 | Controllers de upload | Límites de Multer intencionales (50MB docs, 20MB remitos) |
| S5852/S5857 | `**/*.ts` | Todas las regex tienen input bounded antes de aplicar |
| S5332 | `document-stakeholders.service.ts` | HTTP interno en red Docker |
| S1874 | `eslint.config.*` | API deprecada de typescript-eslint (forma estándar documentada) |
| S4325 | `platformAuth.routes.ts` | Double-cast requerido por incompatibilidad de tipos Express |

---

## 5. Cobertura de Tests

### Cómo funciona

SonarQube lee el archivo `coverage/lcov.info` en la raíz del monorepo para calcular la cobertura.

### Generar cobertura actualizada

```bash
cd /home/administrador/monorepo-bca

# Correr tests con cobertura en cada app
npx jest --coverage --workspaces

# El archivo mergeado queda en coverage/lcov.info
```

Los paths en `lcov.info` deben ser relativos al root del monorepo (ej: `SF:apps/documentos/src/services/...`). Si son relativos a cada app individual, SonarQube no puede mapearlos.

---

## 6. Referencia Rápida

### Ejecutar análisis completo (copiar y pegar)

```bash
cd /home/administrador/monorepo-bca && docker run --rm -e SONAR_HOST_URL="http://10.3.0.244:9900" -e SONAR_TOKEN="squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856" -v "$(pwd):/usr/src" sonarsource/sonar-scanner-cli
```

### Ver dashboard

```
http://10.3.0.244:9900/dashboard?id=monorepo-bca
```

### Login UI

```
Usuario: admin
Contraseña: admin
```

### Token API

```
squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856
```

---

## 7. Historial de Métricas (5 de marzo 2026)

| Métrica | Valor |
|---------|-------|
| Quality Gate | **Passed** |
| Bugs | 0 (A) |
| Vulnerabilities | 0 (A) |
| Code Smells | 0 (A) |
| Coverage | 80.2% |
| Duplications | 0.8% |
| Lines of Code | 34,983 |
| New Code Coverage | 81.7% |
| Issues Abiertos | 0 |
