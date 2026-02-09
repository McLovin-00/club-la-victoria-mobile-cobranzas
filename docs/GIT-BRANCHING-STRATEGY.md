# Quebracho Blanco S.A.
# Estrategia de Control de Versiones

## Monorepo BCA - Sistema de Gestión Documental

**Versión:** 2.0  
**Fecha:** Enero 2026  
**Estado:** Documento Oficial

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura de Ambientes](#2-arquitectura-de-ambientes)
3. [Estructura de Ramas](#3-estructura-de-ramas)
4. [Flujo de Desarrollo](#4-flujo-de-desarrollo)
5. [Convenciones de Nombrado](#5-convenciones-de-nombrado)
6. [Proceso de Feature Development](#6-proceso-de-feature-development)
7. [Promoción entre Ambientes](#7-promoción-entre-ambientes)
8. [Hotfix de Emergencia](#8-hotfix-de-emergencia)
9. [Releases y Versionado](#9-releases-y-versionado)
10. [Migraciones de Base de Datos](#10-migraciones-de-base-de-datos)
11. [Rollback de Emergencia](#11-rollback-de-emergencia)
12. [CI/CD Pipeline](#12-cicd-pipeline)
13. [Configuración de GitHub](#13-configuración-de-github)
14. [Checklists Operativos](#14-checklists-operativos)
15. [Comandos de Referencia](#15-comandos-de-referencia)

---

## 1. Resumen Ejecutivo

### 1.1 Principios

1. **Una rama = Un ambiente**: Cada rama permanente corresponde a un servidor específico
2. **Feature branches**: Todo desarrollo en ramas temporales, nunca directo a ramas permanentes
3. **Pull Requests obligatorios**: Todo cambio pasa por PR con CI checks
4. **Promoción controlada**: El código sube de ambiente en ambiente, nunca salta
5. **Releases con tags**: Producción solo recibe código taggeado

### 1.2 Diagrama General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FLUJO DE CÓDIGO                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   feature/*  ──┐                                                            │
│   fix/*     ───┼──→ PR ──→ develop ──→ PR ──→ staging ──→ PR ──→ main      │
│   refactor/*───┘           │                  │                 │           │
│                            ▼                  ▼                 ▼           │
│                       🧪 Testing         🎭 Staging        🚀 Producción    │
│                       10.3.0.246         10.3.0.243        10.8.10.20       │
│                       (automático)       (manual)          (manual+tag)     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Arquitectura de Ambientes

### 2.1 Mapeo Rama ↔ Ambiente ↔ Servidor

| Rama | Ambiente | Servidor | Deploy | URL |
|------|----------|----------|--------|-----|
| `develop` | 🧪 Testing | `10.3.0.246` | Automático | `http://10.3.0.246:8560` |
| `staging` | 🎭 Staging | `10.3.0.243` | **Manual** | `http://10.3.0.243:8550` |
| `main` | 🚀 Producción | `10.8.10.20` | Manual + Tag | `https://bca-group.microsyst.com.ar` |

### 2.2 Propósito de Cada Ambiente

| Ambiente | Propósito | Datos | Quién Usa |
|----------|-----------|-------|-----------|
| **Testing** | Desarrollo diario, pruebas de features nuevas | Sintéticos o copia | Desarrolladores |
| **Staging** | Validación pre-producción, pruebas de integración | Copia de producción | QA, Stakeholders |
| **Producción** | Sistema en vivo | Reales | Usuarios finales |

### 2.3 Características Técnicas

| Característica | Testing | Staging | Producción |
|----------------|---------|---------|------------|
| **Rate Limiting** | x10 (relajado) | Normal | Normal |
| **SSL/HTTPS** | No | No | Sí |
| **Logs** | Debug | Info | Warn/Error |
| **Backups** | No | Diario | Diario + Offsite |
| **Monitoreo** | Básico | Completo | Completo + Alertas |
| **Restart Policy** | unless-stopped | unless-stopped | always |

---

## 3. Estructura de Ramas

### 3.1 Ramas Permanentes

```
main (producción)     ← Código en producción, solo tags
    │
    └── staging       ← Código validado, pre-producción
            │
            └── develop   ← Código en testing, desarrollo activo
```

| Rama | Protegida | Merge vía | Deploy |
|------|-----------|-----------|--------|
| `main` | ✅ Máxima | PR + Tag + Aprobación | Manual |
| `staging` | ✅ Alta | PR + CI pass | Automático |
| `develop` | ✅ Media | PR + CI pass | Automático |

### 3.2 Ramas Temporales (Feature Branches)

| Prefijo | Uso | Ejemplo |
|---------|-----|---------|
| `feat/` | Nueva funcionalidad | `feat/batch-upload-documents` |
| `fix/` | Corrección de bug | `fix/login-timeout` |
| `hotfix/` | Emergencia en producción | `hotfix/security-patch` |
| `refactor/` | Refactorización sin cambio funcional | `refactor/split-controller` |
| `docs/` | Documentación | `docs/api-swagger` |
| `chore/` | Mantenimiento | `chore/update-deps` |
| `test/` | Agregar/mejorar tests | `test/coverage-80` |

### 3.3 Ciclo de Vida de una Rama

```
1. Crear desde develop
2. Desarrollar y commitear
3. Push a origin
4. Crear PR a develop
5. CI valida (lint, tests, build)
6. Review (si aplica)
7. Merge
8. Eliminar rama
```

---

## 4. Flujo de Desarrollo

### 4.1 Flujo Completo

```
┌──────────────────────────────────────────────────────────────────────────┐
│  DESARROLLO                                                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐               │
│  │ feature │───►│   PR    │───►│   CI    │───►│ develop │               │
│  │ branch  │    │         │    │ checks  │    │         │               │
│  └─────────┘    └─────────┘    └─────────┘    └────┬────┘               │
│                                                     │                    │
│                                           ┌────────▼────────┐            │
│                                           │  Auto-deploy    │            │
│                                           │  Testing        │            │
│                                           │  10.3.0.246     │            │
│                                           └────────┬────────┘            │
│                                                    │ Verificar OK        │
├──────────────────────────────────────────────────────────────────────────┤
│  VALIDACIÓN                                                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                    │                     │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌───▼─────┐               │
│  │ develop │───►│   PR    │───►│   CI    │───►│ staging │               │
│  │         │    │         │    │ checks  │    │         │               │
│  └─────────┘    └─────────┘    └─────────┘    └────┬────┘               │
│                                                     │                    │
│                                           ┌────────▼────────┐            │
│                                           │  Auto-deploy    │            │
│                                           │  Staging        │            │
│                                           │  10.3.0.243     │            │
│                                           └────────┬────────┘            │
│                                                    │ QA valida OK        │
├──────────────────────────────────────────────────────────────────────────┤
│  RELEASE                                                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                    │                     │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌───▼─────┐               │
│  │ staging │───►│   PR    │───►│  Tag    │───►│  main   │               │
│  │         │    │         │    │ vX.Y.Z  │    │         │               │
│  └─────────┘    └─────────┘    └─────────┘    └────┬────┘               │
│                                                     │                    │
│                                  ┌─────────────────▼────────────────┐   │
│                                  │  Deploy Manual + Aprobación      │   │
│                                  │  Producción - 10.8.10.20         │   │
│                                  └──────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Reglas de Oro

1. **Nunca commitear directamente** a `develop`, `staging` o `main`
2. **Siempre crear PR** para merge a ramas permanentes
3. **CI debe pasar** antes de poder mergear
4. **El código sube**, nunca baja (develop → staging → main)
5. **Hotfixes** son la única excepción (van directo a main y se propagan hacia abajo)

---

## 5. Convenciones de Nombrado

### 5.1 Nombres de Ramas

```bash
# Formato
<tipo>/<descripcion-kebab-case>

# Ejemplos válidos
feat/add-batch-upload
feat/documentos-ocr-integration
fix/login-session-timeout
fix/frontend-mobile-responsive
hotfix/security-jwt-validation
refactor/split-documentos-controller
docs/update-api-endpoints
chore/upgrade-prisma-5
test/add-integration-tests-equipos
```

### 5.2 Mensajes de Commit (Conventional Commits)

```bash
# Formato
<tipo>(<alcance>): <descripción>

[cuerpo opcional]

[footer opcional]

# Tipos permitidos
feat:     Nueva funcionalidad
fix:      Corrección de bug
refactor: Cambio sin modificar funcionalidad
docs:     Documentación
test:     Tests
chore:    Mantenimiento
style:    Formato (no afecta lógica)
perf:     Mejora de rendimiento
ci:       Cambios en CI/CD
build:    Cambios en build system

# Alcances sugeridos
backend, frontend, documentos, remitos, shared, ci, deps

# Ejemplos
feat(documentos): agregar carga masiva de archivos

Permite subir hasta 50 archivos simultáneamente con
barra de progreso individual.

Closes #123

fix(frontend): corregir timeout en login

refactor(backend): extraer validación JWT a middleware

chore(deps): actualizar dependencias de seguridad
```

### 5.3 Títulos de Pull Request

```bash
# Formato
[TIPO] Descripción concisa

# Ejemplos
[FEAT] Agregar carga masiva de documentos
[FIX] Corregir error de autenticación en móviles
[REFACTOR] Dividir DocumentosController en servicios
[HOTFIX] Parche de seguridad JWT
[DOCS] Actualizar guía de API
[CHORE] Actualizar dependencias
```

### 5.4 Tags de Versión

```bash
# Formato SemVer
vMAJOR.MINOR.PATCH

# Releases regulares
v1.0.0    # Release inicial
v1.1.0    # Nueva funcionalidad
v1.2.0    # Más funcionalidades
v2.0.0    # Breaking changes

# Hotfixes
v1.2.1    # Hotfix sobre v1.2.0
v1.2.2    # Segundo hotfix

# Pre-releases (opcional)
v1.3.0-rc.1    # Release candidate
v1.3.0-beta.1  # Beta
```

---

## 6. Proceso de Feature Development

### 6.1 Iniciar Feature

```bash
# 1. Actualizar develop
git checkout develop
git pull origin develop

# 2. Crear feature branch
git checkout -b feat/nombre-descriptivo

# 3. Verificar
git branch
# * feat/nombre-descriptivo
```

### 6.2 Desarrollar

```bash
# Commits frecuentes y atómicos
git add .
git commit -m "feat(modulo): implementar funcionalidad X"

# Más trabajo...
git add .
git commit -m "feat(modulo): agregar validaciones"

# Push inicial
git push -u origin feat/nombre-descriptivo

# Pushes subsecuentes
git push
```

### 6.3 Mantener Actualizado

```bash
# Si develop avanzó, rebasar
git fetch origin
git rebase origin/develop

# Resolver conflictos si hay
# Luego:
git push --force-with-lease
```

### 6.4 Crear Pull Request

1. Ir a GitHub → Pull Requests → **New Pull Request**
2. **Base:** `develop` ← **Compare:** `feat/nombre-descriptivo`
3. Título: `[FEAT] Descripción concisa`
4. Descripción:
   ```markdown
   ## Descripción
   Explicación de qué hace este cambio y por qué.
   
   ## Tipo de Cambio
   - [x] Feature (nueva funcionalidad)
   - [ ] Fix (corrección de bug)
   - [ ] Refactor (cambio sin modificar funcionalidad)
   
   ## Testing
   - [ ] Tests unitarios agregados/actualizados
   - [ ] Probado manualmente en local
   
   ## Screenshots (si aplica)
   [Agregar capturas de UI]
   
   ## Checklist
   - [ ] El código sigue las convenciones del proyecto
   - [ ] No hay console.log ni código de debug
   - [ ] Complejidad cognitiva ≤15 por función
   ```
5. Esperar que CI pase
6. Solicitar review si es necesario

### 6.5 Merge y Cleanup

```bash
# Después del merge en GitHub:

# 1. Volver a develop
git checkout develop
git pull origin develop

# 2. Eliminar branch local
git branch -d feat/nombre-descriptivo

# 3. Limpiar referencias remotas
git fetch --prune
```

---

## 7. Promoción entre Ambientes

### 7.1 Develop → Staging

**Cuándo:** Cuando hay funcionalidades estables listas para validación de QA.

**Frecuencia sugerida:** Semanal o cuando haya cambios significativos.

```bash
# 1. Verificar que develop/Testing está estable
curl -s http://10.3.0.246:4810/health  # Backend
curl -s http://10.3.0.246:4812/health  # Documentos

# 2. Crear PR en GitHub
#    Base: staging ← Compare: develop
#    Título: [PROMOTE] Promote develop to staging - [fecha]

# 3. CI ejecuta checks

# 4. Merge (el código está en staging pero NO desplegado aún)

# 5. Deploy MANUAL:
#    - Ir a GitHub → Actions → "Deploy Staging"
#    - Click "Run workflow"
#    - Branch: staging
#    - Confirm: deploy
#    - Click "Run workflow"

# 6. Notificar a QA que staging está actualizado
```

### 7.2 Staging → Main (Release)

**Cuándo:** Cuando staging está validado y listo para producción.

**Frecuencia sugerida:** Quincenal o mensual.

```bash
# 1. Verificar staging estable
curl -s http://10.3.0.243:4800/health
curl -s http://10.3.0.243:4802/health

# 2. Determinar versión (SemVer)
#    ¿Breaking changes? → MAJOR
#    ¿Features nuevas? → MINOR  
#    ¿Solo fixes? → PATCH

# 3. Crear PR en GitHub
#    Base: main ← Compare: staging
#    Título: [RELEASE] v1.4.0

# 4. Merge

# 5. Crear tag localmente
git checkout main
git pull origin main
git tag -a v1.4.0 -m "Release v1.4.0 - Enero 2026

Features:
- Carga masiva de documentos
- Dashboard de compliance

Fixes:
- Corrección de timeout en login
- Mejora de performance"

# 6. Push tag
git push origin v1.4.0

# 7. Deploy a producción (manual o via workflow)
```

### 7.3 Diagrama de Promoción

```
        develop                 staging                  main
           │                       │                       │
           │    PR [PROMOTE]       │                       │
           ├──────────────────────►│                       │
           │                       │                       │
           │               ┌───────┴───────┐               │
           │               │ Deploy Manual │               │
           │               │ (workflow)    │               │
           │               └───────┬───────┘               │
           │                       │     PR [RELEASE]      │
           │                       ├──────────────────────►│
           │                       │                       │
           │                       │                    tag v1.4.0
           │                       │               ┌───────┴───────┐
           │                       │               │ Deploy Manual │
           │                       │               │ + Aprobación  │
           │                       │               └───────┬───────┘
           ▼                       ▼                       ▼
        Testing                 Staging               Producción
       10.3.0.246              10.3.0.243             10.8.10.20
       (automático)             (manual)              (manual)
```

---

## 8. Hotfix de Emergencia

### 8.1 Cuándo Usar Hotfix

**SÍ usar para:**
- Bugs críticos que afectan operación
- Vulnerabilidades de seguridad
- Pérdida o corrupción de datos
- Sistema completamente caído

**NO usar para:**
- Bugs menores
- Mejoras de UX
- Optimizaciones
- Features nuevas

### 8.2 Proceso de Hotfix

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FLUJO DE HOTFIX                                  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                              main (producción)                         │
│                                 │                                      │
│                                 │ checkout                             │
│                                 ▼                                      │
│                          hotfix/nombre                                 │
│                                 │                                      │
│                                 │ fix + commit + push                  │
│                                 ▼                                      │
│                            PR a main                                   │
│                                 │                                      │
│                                 │ CI + merge + tag                     │
│                                 ▼                                      │
│                         Deploy Producción                              │
│                                 │                                      │
│                    ┌────────────┴────────────┐                         │
│                    ▼                         ▼                         │
│              PR a staging              PR a develop                    │
│              (propagar fix)            (propagar fix)                  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Comandos de Hotfix

```bash
# 1. Crear hotfix desde main
git checkout main
git pull origin main
git checkout -b hotfix/descripcion-corta

# 2. Implementar fix MÍNIMO
# ... editar código ...

# 3. Commit
git add .
git commit -m "fix(modulo): descripción del problema crítico"

# 4. Push
git push -u origin hotfix/descripcion-corta

# 5. Crear PR a main (en GitHub)
#    Base: main ← Compare: hotfix/descripcion-corta
#    Título: [HOTFIX] Descripción del problema

# 6. Después del merge, crear tag
git checkout main
git pull origin main
git tag -a v1.4.1 -m "Hotfix: descripción del problema"
git push origin v1.4.1

# 7. Deploy a producción

# 8. Propagar a staging
git checkout staging
git pull origin staging
git merge main  # O crear PR
git push origin staging

# 9. Propagar a develop
git checkout develop
git pull origin develop
git merge staging  # O crear PR
git push origin develop

# 10. Cleanup
git branch -d hotfix/descripcion-corta
git push origin --delete hotfix/descripcion-corta
```

---

## 9. Releases y Versionado

### 9.1 Semantic Versioning

| Componente | Cuándo Incrementar | Ejemplo |
|------------|-------------------|---------|
| **MAJOR** | Breaking changes, arquitectura nueva | v2.0.0 |
| **MINOR** | Nuevas funcionalidades compatibles | v1.5.0 |
| **PATCH** | Hotfixes, correcciones menores | v1.5.1 |

### 9.2 Crear Release

```bash
# 1. Asegurar que main está actualizado con staging
git checkout main
git pull origin main

# 2. Crear tag anotado
git tag -a v1.5.0 -m "Release v1.5.0 - Febrero 2026

## Features
- Carga masiva de documentos (#145)
- Nuevo dashboard de compliance (#152)
- Integración con WhatsApp (#160)

## Fixes
- Corrección de timeout en login (#148)
- Mejora de performance en búsquedas (#155)

## Breaking Changes
- Ninguno

## Notas de Deploy
- Nueva variable: WHATSAPP_API_KEY"

# 3. Push tag
git push origin v1.5.0
```

### 9.3 GitHub Release

1. Ir a GitHub → Releases → **Draft a new release**
2. **Choose tag:** `v1.5.0`
3. **Release title:** `v1.5.0 - Febrero 2026`
4. **Description:** (copiar del tag o expandir)
5. **Publish release**

### 9.4 Historial de Versiones

Mantener un `CHANGELOG.md` en la raíz:

```markdown
# Changelog

## [v1.5.0] - 2026-02-01

### Added
- Carga masiva de documentos (#145)
- Dashboard de compliance (#152)

### Fixed
- Timeout en login (#148)

### Changed
- Mejorada performance de búsquedas (#155)

## [v1.4.1] - 2026-01-15

### Fixed
- [HOTFIX] Validación JWT (#167)

## [v1.4.0] - 2026-01-01
...
```

---

## 10. Migraciones de Base de Datos

### 10.1 Crear Migración (Local/Develop)

```bash
# Backend (schema platform)
npx prisma migrate dev \
  --schema=apps/backend/prisma/schema.prisma \
  --name descripcion_cambio

# Documentos (schema documentos)
npx prisma migrate dev \
  --schema=apps/documentos/src/prisma/schema.prisma \
  --name descripcion_cambio

# Remitos (schema remitos)
npx prisma migrate dev \
  --schema=apps/remitos/src/prisma/schema.prisma \
  --name descripcion_cambio
```

### 10.2 Aplicar Migraciones (CI/CD)

Las migraciones se aplican automáticamente durante el deploy:

```bash
# En cada ambiente
npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma
npx prisma migrate deploy --schema=apps/documentos/src/prisma/schema.prisma
npx prisma migrate deploy --schema=apps/remitos/src/prisma/schema.prisma
```

### 10.3 Verificar Estado

```bash
# Ver migraciones pendientes
npx prisma migrate status --schema=apps/backend/prisma/schema.prisma
```

### 10.4 Migraciones Destructivas

**IMPORTANTE:** Cambios que eliminan datos requieren:

1. Backup previo obligatorio
2. Aprobación explícita en PR
3. Script de migración de datos si aplica
4. Plan de rollback documentado

```bash
# Ejemplo: Antes de eliminar una columna
# 1. Crear migración que la hace nullable
# 2. Deploy a todos los ambientes
# 3. Verificar que no se usa
# 4. Crear migración que la elimina
```

---

## 11. Rollback de Emergencia

### 11.1 Rollback de Código (Sin Cambios de BD)

```bash
# Conectar al servidor
ssh -i ~/.ssh/bca_10_8_10_20 administrador@10.8.10.20

# Ver tags disponibles
cd /home/administrador/monorepo
git tag -l | tail -10

# Volver a versión anterior
git fetch --all
git checkout v1.4.0  # Tag anterior estable

# Reconstruir
docker compose down
docker compose up -d --build

# Verificar
curl -s http://localhost:4800/health
curl -s http://localhost:4802/health
```

### 11.2 Rollback con Cambios de BD

```bash
# 1. Backup del estado actual
docker exec bca_postgres pg_dump -U evo -d monorepo-bca > /tmp/backup_post_v1.5.0.sql

# 2. Restaurar backup pre-release
docker exec -i bca_postgres psql -U evo -d monorepo-bca < /backups/backup_pre_v1.5.0.sql

# 3. Volver a código anterior
git checkout v1.4.0

# 4. Regenerar Prisma clients
npx prisma generate --schema=apps/backend/prisma/schema.prisma
npx prisma generate --schema=apps/documentos/src/prisma/schema.prisma

# 5. Reconstruir
docker compose down
docker compose up -d --build
```

### 11.3 Rollback de Imagen Docker

```bash
# Si existe backup de imagen
docker images bca/frontend
docker images bca/backend

# Usar imagen anterior
docker stop bca_frontend && docker rm bca_frontend
docker run -d --name bca_frontend \
  [opciones...] \
  bca/frontend:backup-YYYYMMDD-HHMMSS
```

### 11.4 Plan de Rollback (Documentar en cada Release)

Cada PR de release a main debe incluir:

```markdown
## Plan de Rollback

### Cambios de BD
- [ ] Sí hay migraciones
- [ ] No hay migraciones

### Si hay que hacer rollback:
1. Ejecutar: `git checkout v1.4.0`
2. Restaurar backup: `backup_pre_v1.5.0.sql`
3. Reconstruir: `docker compose up -d --build`

### Tiempo estimado de rollback: 15 minutos
```

---

## 12. CI/CD Pipeline

### 12.1 Arquitectura de Workflows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GITHUB ACTIONS WORKFLOWS                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    Trigger: PR a develop/staging/main                     │
│  │    CI       │    Jobs: lint, test, build, sonarqube                     │
│  │  Validate   │    Bloquea merge si falla                                 │
│  └─────────────┘                                                            │
│                                                                             │
│  ┌─────────────┐    Trigger: Push a develop                                │
│  │   Deploy    │    Jobs: build, migrate, deploy                           │
│  │   Testing   │    Target: 10.3.0.246 (automático)                        │
│  └─────────────┘                                                            │
│                                                                             │
│  ┌─────────────┐    Trigger: Manual (workflow_dispatch)                    │
│  │   Deploy    │    Jobs: build, migrate, deploy                           │
│  │   Staging   │    Target: 10.3.0.243 (manual)                            │
│  └─────────────┘                                                            │
│                                                                             │
│  ┌─────────────┐    Trigger: Tag push (v*)                                 │
│  │   Deploy    │    Jobs: backup, build, migrate, deploy                   │
│  │   Prod      │    Target: 10.8.10.20 (manual + aprobación)               │
│  └─────────────┘                                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Workflow: CI (Validación)

**Archivo:** `.github/workflows/ci.yml`

**Trigger:** Pull Request a `develop`, `staging`, `main`

**Jobs:**
1. **lint** - ESLint + Prettier
2. **test** - Jest con coverage
3. **build** - Compilar todos los apps
4. **sonarqube** - Análisis de calidad

**Resultado:** Bloquea merge si falla

### 12.3 Workflow: Deploy Testing

**Archivo:** `.github/workflows/deploy-testing.yml`

**Trigger:** Push a `develop`

**Pasos:**
1. Checkout código
2. SSH a 10.3.0.246
3. `git pull origin develop`
4. `npm ci`
5. `prisma migrate deploy` (cada schema)
6. `docker compose up -d --build`
7. Health check

### 12.4 Workflow: Deploy Staging

**Archivo:** `.github/workflows/deploy-staging.yml`

**Trigger:** Manual (`workflow_dispatch`) - Solo desde rama `staging`

**Inputs:**
- `confirm`: Debe escribir "deploy" para confirmar
- `notes`: Notas opcionales del deploy

**Pasos:**
1. Validar confirmación y rama
2. SSH a 10.3.0.243
3. `git pull origin staging`
4. `npm ci`
5. `prisma migrate deploy`
6. `docker compose up -d --build`
7. Health check

**Cómo ejecutar:**
1. Ir a GitHub → Actions → "Deploy Staging"
2. Click "Run workflow"
3. Seleccionar rama: `staging`
4. Escribir "deploy" en confirmación
5. (Opcional) Agregar notas
6. Click "Run workflow"

### 12.5 Workflow: Deploy Producción

**Archivo:** `.github/workflows/deploy-production.yml`

**Trigger:** Push de tag `v*`

**Pasos:**
1. Checkout por tag
2. **Requiere aprobación manual**
3. Crear backup de BD
4. SSH a 10.8.10.20
5. `git checkout <tag>`
6. `npm ci`
7. `prisma migrate deploy`
8. `docker compose up -d --build`
9. Health check
10. Notificación de éxito/fallo

### 12.6 Secrets Necesarios

| Secret | Descripción | Usado por |
|--------|-------------|-----------|
| `TESTING_SSH_HOST` | `10.3.0.246` | deploy-testing |
| `TESTING_SSH_USER` | `administrador` | deploy-testing |
| `TESTING_SSH_KEY` | Clave privada SSH | deploy-testing |
| `STAGING_SSH_HOST` | `10.3.0.243` | deploy-staging |
| `STAGING_SSH_USER` | `administrador` | deploy-staging |
| `STAGING_SSH_KEY` | Clave privada SSH | deploy-staging |
| `PROD_SSH_HOST` | `10.8.10.20` | deploy-production |
| `PROD_SSH_USER` | `administrador` | deploy-production |
| `PROD_SSH_KEY` | Clave privada SSH | deploy-production |
| `SONAR_TOKEN` | Token SonarQube | ci |
| `SONAR_HOST_URL` | URL SonarQube | ci |

---

## 13. Configuración de GitHub

### 13.1 Branch Protection: `develop`

**Settings → Branches → Add rule**

- **Branch name pattern:** `develop`
- [x] Require a pull request before merging
- [x] Require status checks to pass
  - `lint`
  - `test`
  - `build`
- [x] Require branches to be up to date
- [ ] Require approvals (opcional)
- [x] Do not allow bypassing

### 13.2 Branch Protection: `staging`

- **Branch name pattern:** `staging`
- [x] Require a pull request before merging
- [x] Require status checks to pass
- [x] Require approvals: **1**
- [x] Dismiss stale approvals
- [x] Do not allow bypassing

### 13.3 Branch Protection: `main`

- **Branch name pattern:** `main`
- [x] Require a pull request before merging
- [x] Require status checks to pass
- [x] Require approvals: **1**
- [x] Dismiss stale approvals
- [x] Require conversation resolution
- [x] Do not allow bypassing
- [x] Do not allow force pushes
- [x] Do not allow deletions

### 13.4 Tag Protection

**Settings → Tags → Protected tags**

- **Pattern:** `v*`
- **Who can create:** Maintainers only

### 13.5 Environments

**Settings → Environments**

| Environment | Protection | Reviewers |
|-------------|------------|-----------|
| `testing` | Ninguna | - |
| `staging` | Ninguna | - |
| `production` | Required reviewers | [lista de aprobadores] |

---

## 14. Checklists Operativos

### 14.1 Antes de Crear PR a Develop

- [ ] Código compila: `npm run build`
- [ ] Linter pasa: `npm run lint`
- [ ] Tests pasan: `npm test`
- [ ] No hay `console.log` de debug
- [ ] No hay credenciales hardcodeadas
- [ ] Commits siguen Conventional Commits
- [ ] Complejidad cognitiva ≤15 por función

### 14.2 Antes de Promover a Staging

- [ ] Testing (10.3.0.246) está estable
- [ ] Funcionalidades nuevas probadas en Testing
- [ ] No hay issues críticos abiertos
- [ ] PR creado: `develop → staging`
- [ ] CI pasó todos los checks

### 14.3 Antes de Release a Producción

- [ ] Staging (10.3.0.243) validado por QA
- [ ] Todas las funcionalidades verificadas
- [ ] Performance aceptable
- [ ] No hay bugs críticos
- [ ] PR creado: `staging → main`
- [ ] Versión SemVer determinada
- [ ] Tag creado y pusheado
- [ ] Plan de rollback documentado
- [ ] Backup de producción reciente
- [ ] Stakeholders notificados

### 14.4 Después de Deploy a Producción

- [ ] Health checks pasan
- [ ] Funcionalidades críticas verificadas
- [ ] Logs sin errores inesperados
- [ ] Métricas de performance normales
- [ ] GitHub Release publicado
- [ ] CHANGELOG actualizado
- [ ] Equipo notificado

### 14.5 Hotfix de Emergencia

- [ ] Problema crítico confirmado
- [ ] Causa raíz identificada
- [ ] Branch hotfix creado desde main
- [ ] Fix implementado (mínimo necesario)
- [ ] PR a main creado
- [ ] CI pasó
- [ ] Merge realizado
- [ ] Tag de hotfix creado (vX.Y.Z)
- [ ] Deploy a producción ejecutado
- [ ] Fix verificado en producción
- [ ] Fix propagado a staging
- [ ] Fix propagado a develop
- [ ] Post-mortem documentado

---

## 15. Comandos de Referencia

### 15.1 Operaciones Diarias

```bash
# Actualizar develop
git checkout develop && git pull

# Crear feature
git checkout -b feat/mi-feature

# Commit
git add . && git commit -m "feat(modulo): descripcion"

# Push
git push -u origin feat/mi-feature
```

### 15.2 Promoción

```bash
# Develop → Staging (crear PR en GitHub)
# Staging → Main (crear PR en GitHub)

# Después del merge a main, crear tag
git checkout main && git pull
git tag -a v1.5.0 -m "Release v1.5.0"
git push origin v1.5.0
```

### 15.3 Hotfix

```bash
git checkout main && git pull
git checkout -b hotfix/descripcion
# ... fix ...
git add . && git commit -m "fix(modulo): descripcion"
git push -u origin hotfix/descripcion
# Crear PR a main
# Después del merge:
git checkout main && git pull
git tag -a v1.4.1 -m "Hotfix: descripcion"
git push origin v1.4.1
# Propagar a staging y develop
```

### 15.4 Tags

```bash
# Ver tags
git tag -l

# Crear tag
git tag -a v1.5.0 -m "mensaje"

# Push tag
git push origin v1.5.0

# Checkout tag
git checkout v1.5.0
```

### 15.5 Cleanup

```bash
# Eliminar branch local
git branch -d feat/mi-feature

# Eliminar branch remoto
git push origin --delete feat/mi-feature

# Limpiar referencias
git fetch --prune
```

---

## Apéndice A: Configuración Inicial

### A.1 Crear Ramas desde Main

Si actualmente solo existe `main`:

```bash
# 1. Asegurar que main está actualizado
git checkout main
git pull origin main

# 2. Crear staging desde main
git checkout -b staging
git push -u origin staging

# 3. Crear develop desde staging
git checkout -b develop
git push -u origin develop

# 4. Configurar default branch en GitHub
# Settings → Branches → Default branch → develop
```

### A.2 Configurar Protecciones

Ver Sección 13 para configurar protecciones de ramas en GitHub.

---

## Apéndice B: Troubleshooting

### B.1 PR no puede mergearse

```bash
# Actualizar branch con base
git checkout feat/mi-feature
git fetch origin
git rebase origin/develop
git push --force-with-lease
```

### B.2 CI falla en PR

1. Ver logs del workflow en GitHub Actions
2. Corregir errores localmente
3. Push nuevos commits
4. CI se re-ejecuta automáticamente

### B.3 Deploy falla

1. Conectar al servidor via SSH
2. Ver logs: `docker logs bca_backend`
3. Verificar: `docker compose ps`
4. Si es necesario: rollback (Sección 11)

---

*Documento oficial - Monorepo BCA - Quebracho Blanco S.A.*
*Última actualización: Enero 2026*
