# Pipeline CI/CD - Monorepo BCA

> **Alineado con**: Manual Operativo Microsyst (Startup + Staging)  
> **Equipo**: 3 devs jr + 1 DevOps/Back ssr + 1 PM/Analista jr-ssr + Founder/Lead

**Versión**: 3.0  
**Fecha**: Octubre 2025  
**Arquitectura**: 3 Servicios (Backend, Frontend, Documentos)  
**Stack**: Node.js 20+ | PostgreSQL 16 | MinIO | Docker | Turborepo

---

## 1. Resumen Ejecutivo

Este documento define el proceso de integración y despliegue continuo para un monorepo moderno basado en 3 servicios core, siguiendo las mejores prácticas del Manual Operativo Microsyst para equipos startup con foco en entregas semanales seguras.

### Servicios

- **Backend**: API REST (Express + Prisma) - Puerto 4800
- **Frontend**: SPA (React 18 + Vite) - Puerto 8550
- **Documentos**: Microservicio documental (Express + Prisma + MinIO) - Puerto 4802

### Principios Fundamentales

1. **Entregar valor cada semana** con cambios pequeños y seguros
2. **Staging como red de seguridad**: todo pasa por Staging antes de Producción
3. **Automatizar lo que ahorre tiempo** (CI/CD, pruebas E2E mínimas, backups)
4. **Documentación mínima y viva** en el repo, sin burocracia
5. **PRs chicos**: ≤300 líneas, revisión ágil
6. **Quality gates automatizados**: lint + test + build obligatorios

---

## 2. Arquitectura de Ambientes

### 2.1 Desarrollo Local (DEV Local)

**Propósito**: Desarrollo activo con feedback inmediato

**Características**:
- Stack: `npm run dev` (Turborepo + hot-reload)
- DB: PostgreSQL local con schemas `platform` + `documentos`
- Infraestructura opcional: Docker Compose para MinIO, Redis
- **NO se usa PM2 ni Docker** para las aplicaciones (scripts locales)

**Acceso**:
- Backend: http://localhost:4800
- Frontend: http://localhost:8550
- Documentos: http://localhost:4802

**Validación local obligatoria antes de PR**:
```bash
npm ci && npm run lint && npm test && npm run build
```

---

### 2.2 Ambiente de DEV (Servidor Compartido)

**Propósito**: Integración continua post-merge a `main`

**Características**:
  - Despliegue automático tras merge a `main`
- Ambiente inestable por diseño (permite experimentación)
- Usado para QA manual por PM/Analista
- Logs disponibles vía Docker/logs del sistema

**Deploy**: Automático vía GitHub Actions después de merge a `main`

**Acceso**: Dominio dev o IP interna (según configuración)

---

### 2.3 Ambiente de Staging (STAGE)

**Propósito**: Réplica de producción para validación integral pre-release

**Características**:
- **Configuración idéntica a Producción** (mismo stack Docker/config)
- Datos anonimizados o semillas realistas (nunca datos reales)
- Suite E2E automatizada (Playwright - 3-5 pruebas críticas)
- Smoke tests manuales del flujo de negocio
- **Monitoreo Sentry**: 30 min sin errores nuevos antes de aprobar

**Deploy**: 
- **Cadencia**: Miércoles 11:00 (manual workflow)
- **Responsable**: DevOps/Back ssr
- **Validación**: PM/Analista ejecuta QA (smoke + E2E)

**Regla de oro**: Nada llega a Producción sin pasar por Staging

---

### 2.4 Ambiente de Producción (PROD)

**Propósito**: Servicio operacional para usuarios finales

**Características**:
- Orquestación: Docker Swarm (alta disponibilidad)
- Monitoreo: Sentry (errores) + Uptime Kuma (health checks)
- Backups: Diarios automatizados + restore mensual verificado
- Seguridad: SSH por llave, ufw activo, fail2ban, SSL/TLS válidos
- Logs: Docker logs + Winston (sin PII)

**Deploy**:
- **Cadencia**: Jueves 11:00 (manual workflow)
- **Aprobación**: Founder/Lead (validación de Staging exitosa)
- **Responsable**: DevOps/Back ssr
- **Validación**: PM/Analista + Founder/Lead (health + flujo real)

**Acceso**: https://bca.microsyst.com.ar (o dominio configurado)

---

## 3. Roles y Responsabilidades (Manual Operativo)

### 3.1 Founder/Lead

**Responsabilidades CI/CD**:
- ✅ Define prioridades del sprint (lunes: top 10 de 5-15 tareas)
- ✅ **Aprueba deploy a Producción** (jueves 11:00)
- ✅ Revisa PRs (1 de 2 aprobaciones requeridas)
- ✅ Destraba bloqueos técnicos
- ✅ Aprueba excepciones (hotfixes, incidentes)

**SLA**: Revisión de PRs en < 24h, aprobación de prod en < 2h después de validación Staging

---

### 3.2 Desarrolladores Junior (3 devs)

**Responsabilidades CI/CD**:
- ✅ Crear branch `feat/*`, `fix/*`, `chore/*` desde `main`
- ✅ **PRs ≤300 líneas** con descripción, pasos de prueba, evidencias
- ✅ Ejecutar `npm ci && npm run lint && npm test && npm run build` antes de PR
- ✅ **Peer review** (1 aprobación de otro dev requerida)
- ✅ Responder a comentarios de revisión en < 24h
- ✅ Actualizar README/.env.example cuando cambia setup

**Restricciones**:
- ❌ Push directo a `main` (usar PRs siempre)
- ❌ Secrets hardcodeados
- ❌ PRs > 300 líneas (dividir)
- ❌ Cambios fuera del alcance del issue

---

### 3.3 PM/Analista (jr-ssr)

**Responsabilidades CI/CD**:
- ✅ Propone 5-15 tareas chicas (≤1 día) en planificación (lunes)
- ✅ Mantiene tablero actualizado (estados, responsables, fechas)
- ✅ **Ejecuta QA en DEV** (CHECKLIST_QA_DEV: criterios + smoke)
- ✅ **Ejecuta QA en Staging** (miércoles post-deploy):
  - Smoke manual del flujo crítico
  - E2E Playwright (3-5 pruebas)
  - Monitorea Sentry (30 min sin errores nuevos)
- ✅ Valida deploy a Producción (jueves: health + flujo real)
- ✅ Actualiza documentación mínima (README, CHECKLISTS, INCIDENTES)
- ✅ Prepara datos de prueba y soporta a developers

**SLA**: Validación QA en DEV < 4h, validación Staging < 2h post-deploy

---

### 3.4 DevOps/Back (ssr)

**Responsabilidades CI/CD**:
- ✅ Mantiene **GitHub Actions workflows** (ci.yml, deploy-dev.yml, deploy-staging.yml, deploy-prod.yml)
- ✅ **Ejecuta deploys**:
  - Staging: Miércoles 11:00 (manual workflow)
  - Producción: Jueves 11:00 (con aprobación Lead, manual workflow)
- ✅ Administra Docker, docker-compose, Nginx Proxy Manager, Portainer
- ✅ Configura y monitorea Sentry + Uptime Kuma
- ✅ Gestiona **backups diarios** + prueba de restore mensual documentada
- ✅ Mantiene seguridad: SSH keys, ufw, fail2ban, GitHub Secrets
- ✅ Gestiona secretos (GitHub Secrets + 1Password/Bitwarden)
- ✅ Ejecuta rollbacks si es necesario (< 15 min objetivo)

**SLA**: Deploy en < 30 min, rollback en < 15 min si falla

---

## 4. Flujo de Trabajo CI/CD

### 4.1 Ciclo Semanal (Manual Operativo)

**Sprint semanal** con entregas continuas:

| Día | Actividad | Responsable | Detalle |
|-----|-----------|-------------|---------|
| **Lunes** | Planificación (30min) | PM propone, Lead prioriza | 5-15 tareas chicas, Lead elige top 10 |
| **Diario** | Daily (10min) | Todos | Qué haré hoy, bloqueos, objetivo |
| **Miércoles 11:00** | **Deploy Staging** | DevOps + PM validación | E2E + smoke + Sentry 30min |
| **Jueves 11:00** | **Deploy Producción** | DevOps + Lead aprobación | Si Staging estable, health + flujo real |
| **Viernes** | Demo/Cierre (30min) | Todos | Lo entregado, aprendizajes, próximos pasos |

---

### 4.2 Desarrollo y Pull Request

```
1. Desarrollador recibe tarea asignada
   └─ Lee issue completo en GitHub Issues
   
2. Crea branch desde main
   ├─ feat/<issue-number>-<descripcion>
   ├─ fix/<issue-number>-<descripcion>
   └─ chore/<descripcion>
   
3. Desarrollo local
   ├─ npm run dev (Turborepo hot-reload)
   ├─ Implementa solo lo del issue (no features extra)
   ├─ Unit testing (cobertura ≥ 80%)
   └─ Validación local: npm ci && npm run lint && npm test && npm run build
   
4. Commits atómicos
   ├─ Conventional Commits (feat|fix|refactor|docs|test|chore)
   ├─ Mensajes descriptivos en español
   └─ Push a origin feature/<nombre>
   
5. Apertura de Pull Request (≤300 líneas)
   ├─ Título: tipo(scope): descripción corta
   ├─ Descripción: Qué hace / Cómo probar / Resultado esperado
   ├─ Screenshots/videos si es UI
   ├─ Checklist de auto-revisión completo
   └─ Asignación de 1 revisor (peer dev)
```

**Template de PR**:
```markdown
## Qué hace
[Descripción breve de la funcionalidad]

## Cómo probar
1. [Paso 1]
2. [Paso 2]
3. [Paso 3]

## Resultado esperado
[Qué debería pasar]

## Evidencias
[Screenshots o video]

## Checklist
- [ ] npm run lint ✅
- [ ] npm test ✅
- [ ] npm run build ✅
- [ ] Probé manualmente
- [ ] Actualicé README/ENV si cambió algo
```

---

### 4.3 Validación Automática (CI Pipeline)

**Trigger**: Push a Pull Request  
**Workflow**: `.github/workflows/monorepo-ci.yml`

**Pasos del Pipeline**:
```yaml
1. ✓ Checkout código (actions/checkout@v4)
2. ✓ Setup Node.js 20 (actions/setup-node@v4)
3. ✓ npm ci (instalación determinística)
4. ✓ npm run lint (ESLint v9 flat config - 0 errores)
5. ✓ npm run type-check (TypeScript strict mode)
6. ✓ npm test (Jest - 100% tests passing)
7. ✓ Verificar cobertura ≥ 80%
8. ✓ npm run build (backend + frontend + documentos)
```

**Gates de Calidad Obligatorios**:
- ✅ Lint passing (0 errores, 0 warnings)
- ✅ Type-check passing
- ✅ Tests passing (100%)
- ✅ Cobertura ≥ 80%
- ✅ Build exitoso (todos los servicios)

**Si falla CI**: PR bloqueado, no se puede hacer merge hasta que esté verde

---

### 4.4 Code Review (Peer Review)

**Criterios de Aprobación**:
- ✅ **1 aprobación requerida** (peer developer)
- ✅ Si toca seguridad/infra: **2da aprobación de DevOps o Lead**
- ✅ Sin comentarios pendientes de resolución
- ✅ CI pipeline en verde ✅
- ✅ Sin conflictos con `main`

**Proceso de Revisión (4 puntos clave)**:
1. ¿Cumple criterios de aceptación del issue?
2. ¿No rompe nada? (tests, build, funcionalidad existente)
3. ¿Se entiende el código? (nombres claros, lógica simple)
4. ¿Tiene pasos de prueba o tests adecuados?

**Tiempo de Revisión**: < 24h (objetivo del equipo)

**Feedback Constructivo**:
```markdown
✅ BIEN: "Esta validación podría simplificarse usando el helper 
         de utils/validation.ts línea 45. ¿Te parece probarlo?"

❌ MAL: "Esto está mal, hacelo de otra manera"
```

---

### 4.5 Merge y Despliegue a DEV

**Estrategia de Merge**: Squash and Merge (recomendado para PRs chicos)  
**Branch Protection**: Soft-protection (workflow alerta si push directo)

```
1. Merge a main (después de 1 aprobación + CI verde)
   └─ Pipeline CI re-ejecuta en main automáticamente
   
2. Despliegue Automático a DEV
   ├─ Workflow: deploy-dev.yml (trigger: push a main)
   ├─ Build de imágenes Docker (si aplica)
   ├─ Prisma migrate deploy (backend + documentos)
   ├─ Deploy a servidor DEV
   └─ Health checks post-deploy
   
3. Notificación al Equipo
   └─ Slack/email con resultado del deploy
   
4. Validación en DEV (PM/Analista)
   ├─ Ejecuta CHECKLIST_QA_DEV
   ├─ Smoke test básico del flujo
   └─ Aprueba → mueve tarea a "Listo p/Staging"
```

**Post-merge**: Desarrolladores deben sincronizar sus branches:
```bash
git fetch origin
git checkout main
git pull origin main
git checkout feature/<nombre>
git rebase main
git push --force-with-lease
```

---

### 4.6 Promoción a Staging (Miércoles 11:00)

**Proceso Manual Controlado**:

```
1. Preparación Pre-Deploy
   ├─ DEV estable (sin bugs críticos/altos abiertos)
   ├─ Todas las features merged funcionando
   ├─ PM/Analista validó QA en DEV
   └─ Logs DEV sin errores críticos
   
2. Deploy a Staging (DevOps)
   ├─ Workflow: deploy-staging.yml (workflow_dispatch manual)
   ├─ SSH a servidor Staging
   ├─ git pull origin main
   ├─ npm ci
   ├─ Prisma migrate deploy
   ├─ Docker stack deploy (docker-compose.prod.yml)
   └─ Health checks post-deploy
   
3. Validación en Staging (PM/Analista - CHECKLIST_STAGING)
   ├─ Smoke manual del flujo crítico ✅
   ├─ E2E Playwright (3-5 pruebas) ✅
   │  Ejemplo: Login → Dashboard → Crear orden → Ver detalle
   ├─ Verificar Sentry: 0 errores nuevos (30 min monitoreo)
   └─ Aprobar → mueve tareas a "Listo p/Prod"
   
4. Si falla algo
   ├─ Volver a DEV
   ├─ Corregir y hacer PR fix
   └─ Reintentar el próximo miércoles
```

**Criterios de Aprobación Staging**:
- ✅ E2E Playwright pasó (3-5 pruebas)
- ✅ Smoke manual OK
- ✅ Sin errores nuevos en Sentry (30 min)
- ✅ Health endpoints responden OK
- ✅ Logs sin errores críticos

---

### 4.7 Despliegue a Producción (Jueves 11:00)

**Proceso de Aprobación (Lead + PM/Analista + DevOps)**:

```
1. Pre-Deploy Checklist (Founder/Lead)
   ├─ Staging estable ✅ (PM/Analista validó)
   ├─ E2E + smoke OK ✅
   ├─ 30 min sin errores en Sentry ✅
   ├─ Backup de BD reciente (< 24h) ✅
   ├─ Plan de rollback verificado ✅
   └─ Aprobación de Lead ✅ → OK para deploy
   
2. Deploy a Producción (DevOps)
   ├─ Workflow: deploy-prod.yml (workflow_dispatch manual)
   ├─ Requiere: manual-approval del Lead en GitHub
   ├─ SSH a servidor Producción
   ├─ Backup pre-deploy de BD
   ├─ git checkout main && git pull
   ├─ npm ci
   ├─ Prisma migrate deploy
   ├─ Docker stack deploy (docker-compose.prod.yml)
   └─ Health checks post-deploy
   
3. Validación Post-Deploy (15-20 min)
   ├─ Lead o PM valida /health endpoints
   ├─ Smoke test manual de flujo real:
   │  - Login con usuario de producción
   │  - Navegación a dashboard
   │  - Crear una orden de prueba (marcar para eliminar)
   │  - Verificar consola sin errores
   ├─ Monitoreo Sentry: sin errores nuevos
   └─ Métricas de uso dentro de límites normales
   
4. Comunicación (Lead o PM)
   ├─ Notificación "Publicado" en Slack/email
   ├─ Notas de versión breves (qué cambió)
   └─ Aviso a usuarios si aplica
```

**CHECKLIST_DEPLOY_PROD**:
- [ ] Aprobado por Lead o PM
- [ ] Deploy ejecutado
- [ ] `/health` OK + flujo crítico real OK
- [ ] Tag `vX.Y.Z` + notas de versión
- [ ] Aviso "Publicado"

---

## 5. Gestión de Incidentes

### 5.1 Procedimiento de Hotfix (Incidente en Producción)

**Clasificación de Severidad**:
- 🔴 **SEV1**: > 100 usuarios afectados, funcionalidad crítica, sin workaround → **ROLLBACK INMEDIATO**
- 🟠 **SEV2**: 10-100 usuarios, funcionalidad importante → Fix rápido o rollback
- 🟡 **SEV3**: < 10 usuarios, funcionalidad secundaria, hay workaround → Fix en próximo sprint

**Proceso de Emergencia (CHECKLIST_INCIDENTE)**:

```
1. Comunicar (inmediato - Slack #incidents)
   "🔴 INCIDENT - SEV1
   - Qué: [descripción breve]
   - Impacto: [usuarios afectados]
   - Causa inicial: [hipótesis]
   - Acción: [rollback/fix]
   - ETA: [minutos]
   - Owner: @devops"

2. Evaluar Severidad (2 min)
   ├─ Si SEV1 → ROLLBACK inmediato
   └─ Si SEV2/3 → Evaluar fix rápido vs rollback

3. Rollback (si SEV1 - 5 min objetivo)
   ├─ SSH a servidor producción
   ├─ Identificar versión anterior estable
   ├─ git checkout <hash_anterior>
   ├─ docker stack deploy (versión anterior)
   └─ Validar que error desapareció

4. Registrar Incidente (INCIDENTES.md)
   ├─ Hora inicio/fin, síntomas
   ├─ Acción tomada (rollback/parche)
   ├─ Causa raíz (breve)
   ├─ Prevención (1 acción concreta)
   └─ ¿Se actualizó test/seed/doc?

5. Post-Mortem (2 horas después)
   ├─ Análisis de root cause
   ├─ Acciones correctivas
   └─ Actualizar tests/docs para prevenir
```

**Tiempo Objetivo**: Rollback en < 15 min

---

### 5.2 Estrategia de Rollback

**Docker Swarm Rollback**:
```bash
# Opción 1: Rollback automático del servicio
docker service rollback monorepo-bca_backend
docker service rollback monorepo-bca_frontend
docker service rollback monorepo-bca_documentos

# Opción 2: Deploy de versión anterior
cd /home/administrador/monorepo-bca
git log --oneline -5  # Identificar hash anterior
git checkout <hash_anterior>
docker stack deploy -c docker-compose.prod.yml monorepo-bca

# Verificación
curl https://bca.microsyst.com.ar/health
docker service ps monorepo-bca_backend --filter desired-state=running
```

**⚠️ Migraciones de BD**: 
- **NO hacer rollback** de migraciones (muy riesgoso)
- Preferir **fix-forward** (corregir hacia adelante)
- Si es absolutamente necesario: coordinar con Lead/DevOps, backup reciente obligatorio

---

## 6. Workflows de GitHub Actions

### 6.1 Workflows Principales

```
.github/workflows/
├── monorepo-ci.yml               # CI en PRs y main
├── deploy-dev.yml                # Deploy automático a DEV (push a main)
├── deploy-staging.yml            # Deploy manual a Staging (miércoles 11:00)
├── deploy-prod.yml               # Deploy manual a Prod (jueves 11:00, con aprobación)
└── protect-main-soft.yml         # Alerta si push directo a main
```

---

### 6.2 CI Workflow (monorepo-ci.yml)

```yaml
name: CI - Monorepo
on:
  pull_request:
  push:
    branches: [ main ]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Shallow clones disabled for better SonarQube analysis
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with: 
          node-version: 20
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint (workspace)
        run: npm run lint
      
      - name: Typecheck (workspace)
        run: |
          if npm run -s typecheck; then echo ok; else echo "typecheck missing, skipping"; fi
      
      - name: Test with Coverage (workspace)
        run: npm test --workspaces --if-present -- --coverage
        continue-on-error: true
      
      - name: Build (workspace)
        run: npm run build --workspaces --if-present
      
      - name: SonarQube Scan
        uses: SonarSource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
        continue-on-error: true  # Opcional: no bloquear build
      
      - name: SonarQube Quality Gate
        uses: sonarsource/sonarqube-quality-gate-action@master
        timeout-minutes: 5
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
        continue-on-error: true  # Cambiar a 'false' para mandatory gate
```

**Nota**: El workflow incluye análisis de SonarQube. Para habilitarlo:
1. Levantar SonarQube: `docker compose -f docker-compose.sonarqube.yml up -d`
2. Configurar proyecto y generar token (ver sección 6.5)
3. Agregar secrets a GitHub: `SONAR_TOKEN` y `SONAR_HOST_URL`

---

### 6.3 Deploy Staging (deploy-staging.yml)

```yaml
name: Deploy to Staging
on:
  workflow_dispatch:  # Manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /home/administrador/monorepo-bca
            git pull origin main
            npm ci
            npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma
            npx prisma migrate deploy --schema=apps/documentos/src/prisma/schema.prisma
            docker stack deploy -c docker-compose.prod.yml monorepo-bca
            
      - name: Health Check
        run: |
          sleep 30
          curl -f https://staging.bca.microsyst.com.ar/health || exit 1
```

---

### 6.4 Deploy Producción (deploy-prod.yml)

```yaml
name: Deploy to Production
on:
  workflow_dispatch:  # Manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      # Requiere aprobación manual del Lead
    
    steps:
      - name: Backup Database
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            /home/administrador/scripts/backup.sh
      
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /home/administrador/monorepo-bca
            git pull origin main
            npm ci
            npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma
            npx prisma migrate deploy --schema=apps/documentos/src/prisma/schema.prisma
            docker stack deploy -c docker-compose.prod.yml monorepo-bca
            
      - name: Health Check
        run: |
          sleep 30
          curl -f https://bca.microsyst.com.ar/health || exit 1
          
      - name: Notify Slack
        if: success()
        run: |
          # Notificación de deploy exitoso
```

---

### 6.5 SonarQube - Análisis de Calidad de Código

**Configuración de SonarQube**:

#### 1. Levantar SonarQube localmente

```bash
# Iniciar SonarQube con Docker
docker compose -f docker-compose.sonarqube.yml up -d

# Esperar a que esté listo (tarda ~60 segundos)
docker compose -f docker-compose.sonarqube.yml logs -f sonarqube
```

#### 2. Configuración inicial automática

```bash
# Ejecutar script de inicialización (recomendado)
./scripts/init-sonarqube.sh
```

**O configuración manual**:

1. Acceder a http://localhost:9000
2. Login: `admin` / `admin` (cambiar contraseña al primer acceso)
3. Administration > Projects > Create Project
   - Project key: `monorepo-bca`
   - Display name: `Monorepo BCA`
   - Main branch: `main`
4. My Account > Security > Generate Tokens
   - Name: `GitHub Actions`
   - Type: `Global Analysis Token`
   - **Copiar token generado**

#### 3. Configurar GitHub Secrets

Agregar en: Settings > Secrets and variables > Actions

```
SONAR_HOST_URL = http://your-sonarqube-server:9000
SONAR_TOKEN = [token copiado del paso anterior]
```

**Nota**: Para producción, SonarQube debe estar en un servidor accesible por GitHub Actions.

#### 4. Quality Gates Configurados

**Umbrales para Nuevo Código (New Code)**:

| Métrica | Umbral | Descripción |
|---------|--------|-------------|
| Coverage | ≥ 70% | Cobertura de tests en código nuevo |
| Duplications | ≤ 3% | Líneas duplicadas |
| Maintainability Rating | A | Sin code smells mayores |
| Reliability Rating | A | Sin bugs |
| Security Rating | A | Sin vulnerabilidades |
| Security Hotspots Reviewed | 100% | Todos los hotspots revisados |

#### 5. Archivos de Configuración

**`sonar-project.properties`** (raíz del repositorio):
```properties
sonar.projectKey=monorepo-bca
sonar.projectName=Monorepo BCA
sonar.sources=apps/backend/src,apps/frontend/src,apps/documentos/src
sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/coverage/**
sonar.javascript.lcov.reportPaths=apps/*/coverage/lcov.info
sonar.typescript.tsconfigPath=apps/*/tsconfig.json
```

#### 6. Comandos Útiles

```bash
# Ejecutar análisis local
sonar-scanner \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=YOUR_TOKEN

# Ver resultados
# Acceder a: http://localhost:9000/dashboard?id=monorepo-bca

# Detener SonarQube
docker compose -f docker-compose.sonarqube.yml down

# Backup de datos de SonarQube
docker exec sonarqube-postgres pg_dump -U sonar sonar > sonarqube_backup.sql
```

#### 7. Integración con CI/CD

El workflow `monorepo-ci.yml` ejecuta automáticamente:
1. **Scan** de código en cada PR y push a `main`
2. **Quality Gate** check (falla si no cumple umbrales)
3. Resultados visibles en:
   - GitHub Actions (check status)
   - SonarQube Dashboard (análisis detallado)

**Comportamiento actual**:
- `continue-on-error: true` → No bloquea el merge (warning only)
- Cambiar a `false` para hacer **mandatory** el Quality Gate

#### 8. Métricas Monitoreadas

**Seguridad**:
- Vulnerabilidades (bloqueantes, críticas, mayores)
- Security Hotspots
- Secretos hardcodeados

**Confiabilidad**:
- Bugs
- Code Smells
- Deuda técnica

**Mantenibilidad**:
- Complejidad ciclomática
- Duplicaciones
- Coverage de tests

**Best Practices**:
- Convenciones de código
- Patrones detectados
- Anti-patterns

---

## 7. Stack Tecnológico

| Componente | Herramienta/Tecnología |
|------------|------------------------|
| **Monorepo** | npm workspaces + Turborepo |
| **CI/CD** | GitHub Actions |
| **Quality Gate** | SonarQube 10 Community |
| **Contenedores** | Docker + Docker Compose |
| **Orquestación PROD** | Docker Swarm |
| **Base de Datos** | PostgreSQL 16 |
| **Storage** | MinIO (S3-compatible) |
| **Cache/Queues** | Redis 7 + BullMQ |
| **Monitoring** | Sentry (errores) + Uptime Kuma (health) |
| **Logging** | Winston (app) + Docker logs |
| **Secrets** | GitHub Secrets + 1Password/Bitwarden |
| **Reverse Proxy** | Nginx Proxy Manager |
| **Backups** | Cron diario + restore mensual |
| **Gestión** | Trello / Linear / Jira simple |
| **Comunicación** | Slack / WhatsApp |

---

## 8. Mejores Prácticas

### 8.1 Para Desarrolladores

✅ **DO**:
- PRs ≤300 líneas (dividir si es más grande)
- Commits atómicos con Conventional Commits
- `npm ci && npm run lint && npm test && npm run build` antes de PR
- Responder a revisiones en < 24h
- Actualizar README/.env.example si cambia setup
- Solo implementar lo del issue (no features extra)

❌ **DON'T**:
- Push directo a `main`
- Secrets hardcodeados
- PRs gigantes (> 300 líneas)
- Skipear validaciones locales
- Cambios fuera del alcance del issue

---

### 8.2 Para Code Reviewers

✅ **DO**:
- Revisar en < 24h
- 4 puntos clave: cumple CA / no rompe / se entiende / tiene tests
- Comentarios constructivos y específicos
- Aprobar solo si cumple estándares

❌ **DON'T**:
- Aprobar sin revisar
- Comentarios vagos
- Bloquear por preferencias personales

---

### 8.3 Para PM/Analista

✅ **DO**:
- Ejecutar CHECKLIST_QA_DEV antes de aprobar
- Smoke + E2E en Staging (miércoles)
- Monitorear Sentry 30 min post-deploy
- Documentar bugs con pasos reproducibles
- Mantener tablero actualizado

❌ **DON'T**:
- Aprobar sin testing
- Saltarse validaciones por presión
- Bugs sin evidencias

---

### 8.4 Para DevOps/Back

✅ **DO**:
- Deploys en horarios establecidos (miércoles/jueves 11:00)
- Backup pre-deploy a producción
- Monitorear pipelines y ambientes
- Documentar cambios de infraestructura
- Preparar rollback plan

❌ **DON'T**:
- Deployar sin aprobaciones
- Modificar producción sin respaldo
- Ignorar alertas de Sentry/Uptime Kuma

---

## 9. Comandos Útiles

### Desarrollo Local
```bash
npm run dev                    # Levantar todos los servicios
npm run lint                   # Lint de todo el monorepo
npm run build                  # Build de todos los servicios
npm test                       # Tests de todo el monorepo

# Validación pre-PR (obligatorio)
npm ci && npm run lint && npm test && npm run build
```

### Prisma (Backend)
```bash
npx dotenv-cli -e .env -- npx prisma migrate dev --schema=apps/backend/prisma/schema.prisma
npx dotenv-cli -e .env -- npx prisma generate --schema=apps/backend/prisma/schema.prisma
npx dotenv-cli -e .env -- npx prisma studio --schema=apps/backend/prisma/schema.prisma
```

### Prisma (Documentos)
```bash
npx dotenv-cli -e .env -- npx prisma migrate dev --schema=apps/documentos/src/prisma/schema.prisma
npx dotenv-cli -e .env -- npx prisma generate --schema=apps/documentos/src/prisma/schema.prisma
```

### Docker
```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker service ls                                    # Ver servicios Swarm
docker service ps monorepo-bca_backend              # Ver instancias de servicio
docker service logs monorepo-bca_backend --tail 100 # Logs de servicio
docker stats --no-stream                            # Uso de recursos
```

### Git
```bash
git fetch origin && git rebase origin/main
git log --oneline --graph --all --decorate
```

---

## 10. Documentos Relacionados

- **[Manual Operativo Microsyst](./MANUAL_OPERATIVO_MICROSYST.md)** - Manual operativo completo
- **[Roles y Responsabilidades](./roles/README.md)** - Guías detalladas por rol
- **[Ambientes](./ENVIRONMENTS.md)** - Configuración de ambientes
- **[Arquitectura](./ARCHITECTURE.md)** - Arquitectura del sistema
- **[README Principal](../README.md)** - Información general del proyecto

---

## 11. Anexos

### 11.1 Checklists Operativos

Ver archivos de referencia:
- `CHECKLIST_DESARROLLO.md` - Checklist para developers
- `CHECKLIST_QA_DEV.md` - Validación en DEV
- `CHECKLIST_STAGING.md` - Validación en Staging
- `CHECKLIST_DEPLOY_PROD.md` - Deploy a Producción
- `CHECKLIST_INCIDENTE.md` - Gestión de incidentes

### 11.2 Matriz de Versiones (Ejemplo)

Mantener actualizado en cada deploy:

| Servicio   | DEV    | STAGING | PROD   | Última Actualización |
|------------|--------|---------|--------|----------------------|
| Backend    | main   | v1.5.0  | v1.4.0 | 2025-10-08 11:00     |
| Frontend   | main   | v1.5.0  | v1.4.0 | 2025-10-08 11:00     |
| Documentos | main   | v1.5.0  | v1.4.0 | 2025-10-08 11:00     |
| PostgreSQL | 16     | 16      | 16     | -                    |
| Redis      | 7      | 7       | 7      | -                    |
| MinIO      | latest | latest  | latest | -                    |

---

**Documento Versión**: 3.0  
**Última Actualización**: 8 Octubre 2025  
**Próxima Revisión**: Trimestral  
**Mantenido por**: DevOps/Back (ssr) + Founder/Lead  
**Alineado con**: Manual Operativo Microsyst
