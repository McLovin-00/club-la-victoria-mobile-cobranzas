
# Manual Operativo Microsyst (Startup + Staging) — **Versión MD Completa**

> **Objetivo**: Manual práctico para dirigir la software factory de Microsyst con un equipo chico (3 devs jr, 1 devops/back ssr, 1 PM/Analista jr-ssr y Founder/Lead). Incluye **procesos**, **herramientas**, **procedimientos**, **roles y funciones**, y **plantillas** listas para usar. Entornos: **DEV → Staging → Producción**.

---

## 1) Visión y principios
- **Entregar valor cada semana** con cambios pequeños y seguros.
- **Staging como red de seguridad**: todo pasa por Staging antes de Producción.
- **Automatizar lo que ahorre tiempo** (CI/CD, pruebas E2E mínimas, backups).
- **Documentación mínima y viva** en el repo, sin burocracia.

---

## 2) Roles y funciones (responsabilidades claras)

### 2.1 Founder/Lead
- Define prioridades del sprint y aprueba publicación a **Producción**.
- Alinea objetivos de negocio y comunica hitos.
- Destraba bloqueos y aprueba excepciones (incidentes, hotfixes).

### 2.2 PM/Analista (jr/ssr)
- Redacta **historias** con **Criterios de Aceptación (CA)** y **datos de prueba**.
- Mantiene el **tablero** al día (estados, responsables, fechas).
- Ejecuta **QA en DEV** y **smoke/E2E** en **Staging** (con soporte de devs).
- Escribe/actualiza documentación mínima (README, CHECKLISTS, INCIDENTES).

### 2.3 DevOps/Back (ssr)
- Mantiene **CI/CD** (GitHub Actions), **despliegues** y **secretos**.
- Administra **Docker**, **docker-compose**, **Nginx Proxy Manager**, **Portainer** (opcional).
- Configura **Sentry**, **Uptime Kuma**, **backups** y prueba de **restore** mensual.
- Cuida **seguridad básica** (SSH por llave, `ufw`, `fail2ban`) y acceso a servidores.

### 2.4 Desarrolladores (3 x jr)
- Implementan tareas, **abren PRs chicos** y hacen **revisión entre pares** (1 aprobación).
- Ejecutan `lint/test/build` y dejan **pasos de prueba** en la PR.
- Actualizan **README** y `.env.example` cuando cambia cómo correr o desplegar.
- Soportan a PM/Analista en preparación de datos de prueba y verificación funcional.

---

## 3) Cadencia y reuniones
- **Sprints semanales**.
- **Planificación (lunes, 30 min)**: PM propone 5–15 tareas chicas (≤1 día), Lead prioriza (top 10).
- **Daily (10 min)**: qué haré hoy, bloqueos, objetivo de la jornada.
- **Demo/Cierre (viernes, 30 min)**: lo entregado, aprendizajes, próximos pasos.
- **Cadencia de release**: **Miércoles 11:00 → Staging**; **Jueves 11:00 → Producción** (si Staging estable).

---

## 4) Tablero de trabajo (Trello / Linear / Jira simple)
Columnas: **Por hacer** → **En curso** → **Revisión de código** → **QA (DEV)** → **Listo p/Staging** → **En Staging** → **Listo p/Prod** → **Publicado**.

**Tarjeta mínima**:
- **Descripción corta**: problema/valor.
- **CA (Criterios de Aceptación)**: lista de chequeo.
- **Datos de prueba** (si aplica).
- **Due date** (si es sensible) y **owner**.

---

## 5) Flujo de cambio (paso a paso)

### 5.1 Planificar (lunes)
- PM redacta historias con CA claros y datos de prueba.
- Lead prioriza y define qué entra en la semana.

### 5.2 Desarrollar (DEV → PR)
- Rama por tarea: `feat/*`, `fix/*`, `chore/*`.
- Antes de subir: `npm ci && npm run lint && npm test && npm run build` (mínimo).
- Abrir **PR corto** (≤300 líneas) con plantilla: **Qué hace**, **Cómo probar**, **Resultado esperado**, **Capturas** (si UI).

### 5.3 Revisión de código (gate liviano)
- **1 aprobación obligatoria** de otro dev (peer review).
- Si toca seguridad/infra, pedir segunda mirada de DevOps/Back.
- Revisar 4 puntos: cumple CA / no rompe / se entiende / tiene pasos de prueba o tests.

### 5.4 QA simple en DEV
- PM/Analista ejecuta **CHECKLIST_QA_DEV** (criterios + smoke básico).
- Si aprueba → mover a **Listo p/Staging**.

### 5.5 Deploy a Staging (miércoles 11:00)
- DevOps corre workflow **manual** de Staging.
- Se ejecutan **E2E Playwright (3–5 pruebas)** + **smoke manual** del flujo crítico.
- **Sentry** monitoreo 30 min (sin errores nuevos). Si falla algo → volver a DEV, corregir y reintentar.

### 5.6 Deploy a Producción (jueves 11:00)
- Si Staging estable, DevOps publica.
- Lead o PM validan `/health` y **un flujo real**.
- Aviso “Publicado” + **Notas de versión** (breves).

### 5.7 Incidentes
- Comunicar en Slack/WhatsApp (qué pasa, impacto, ETA).
- **Rollback inmediato** si hay impacto alto (script/compose).
- Registrar en `INCIDENTES.md`: **causa**, **arreglo**, **prevención**; actualizar tests/seed/doc si corresponde.

---

## 6) Entornos y datos
- **DEV/Pruebas**: integración continua, debugging on, datos de prueba.
- **Staging**: espejo de Producción (mismo stack/config), **datos anonimizados** o semillas realistas, ejecuta E2E.
- **Producción**: tráfico real, backups y monitoreo.

**Regla de oro**: nada llega a **Producción** sin pasar por **Staging** (E2E + smoke OK y 30 min sin errores en Sentry).

---

## 7) Stack de herramientas y procedimientos

### 7.1 Gestión y documentación
- **Trello/Linear/Jira simple**: backlog, estados y responsables.
- **Mini Wiki** (Docusaurus o Notion): solo 3 páginas vivas: **Cómo correr**, **Cómo desplegar**, **Accesos y secretos**.
- **README** por servicio con: *setup local*, *scripts*, *env vars*, *deploy*.

### 7.2 Repositorio y control de calidad
- **GitHub**: PRs, **CODEOWNERS** (Lead/DevOps en paths críticos), protección de `main` (1 review mínimo).
- **PR Template**: Qué hace / Cómo probar / Resultado esperado / Evidencias.
- **Renovate** (semanal, batch): PRs de actualización de dependencias.

### 7.3 CI/CD (GitHub Actions)
Workflows mínimos en `.github/workflows/`:
- `monorepo-ci.yml`: en PR y `main` → `npm ci` + `lint` + `test` + `build` + **SonarQube** (análisis) + **Quality Gate**.
- `deploy-dev.yml`: auto en `main` (si aplica) para actualizar DEV.
- `deploy-staging.yml`: **manual** (miércoles) → despliegue a Staging.
- `deploy-prod.yml`: **manual** (jueves) → despliegue a Producción.
- `release-notes.yml`: opcional, genera notas de versión breves.

Variables/Secrets requeridos (ejemplos):
- `STG_HOST`, `STG_USER`, `STG_SSH_KEY` / `PROD_HOST`, `PROD_USER`, `PROD_SSH_KEY`.
- `SONAR_HOST_URL`, `SONAR_TOKEN` (para SonarQube).
- `SENTRY_DSN` (para monitoreo de errores).

### 7.4 Contenedores y red
- **Docker + docker-compose** por servicio.
- **Nginx Proxy Manager** para hosts/SSL (o Nginx clásico si prefieren).
- **Portainer** (opcional) para visibilidad de contenedores y logs.

### 7.5 Observabilidad
- **Sentry** (errores app) → alertas a Slack/Email.
- **Uptime Kuma** → sondas /health para Staging y Prod.
- **Logs**: `docker logs` + **logrotate**; Portainer para inspección.

### 7.6 Seguridad y secretos
- Acceso por **SSH con llave**, **ufw** y **fail2ban** activos.
- **GitHub Secrets** y gestor (1Password/Bitwarden). Mantener `.env.example` **sin secretos** y al día.
- **Privacidad**: en Staging **nunca** usar datos reales; solo anonimizados o semillas.

### 7.7 Backups y continuidad
- **Backups diarios** de BD y archivos (cron).
- **Prueba de restore mensual** documentada.
- Retención razonable (por ej., 7/14/30 días).

### 7.8 Testing
- **Unit** (Vitest/Jest) en módulos clave.
- **API** (Supertest) en endpoints críticos.
- **E2E** (Playwright) **3–5 pruebas** del flujo de negocio en Staging tras deploy.
- **Datos de prueba**: seeds reutilizables + dataset anónimo para Staging.

### 7.9 SonarQube (calidad y seguridad en PR)
- Levantar **SonarQube** con Docker (ver Anexo 12) o usar **SonarCloud**.
- `sonar-project.properties` en raíz del monorepo.
- **Quality Gate (New code)** recomendado:\
  - **Cobertura** en código nuevo ≥ **70%**.\
  - **Duplicación** en código nuevo < **3%**.\
  - **Maintainability Rating**: A.\
  - **Reliability Rating**: A.\
  - **Security Rating**: A.\
  - Sin **Vulnerabilidades** Bloqueantes/Críticas.
- Workflows incluyen: **scan** y **quality gate** (opcional: hacer mandatory).

---

## 8) Convenciones mínimas
- **Branches**: `feat/*`, `fix/*`, `chore/*`.
- **Commits**: frases simples y claras.
- **PRs chicos**: mejor 3 chicos que 1 gigante.
- **.env**: mantener `.env.example` (sin secretos).
- **ADR liviano** (opcional): para decisiones que afecten a todo el stack.

---

## 9) Estructura mínima del repo (sugerida)
```
/docs/ (mini wiki)
/scripts/backup.sh
/scripts/deploy-prod.sh
/tests/e2e/ (Playwright)
CHECKLIST_DESARROLLO.md
CHECKLIST_QA_DEV.md
CHECKLIST_STAGING.md
CHECKLIST_DEPLOY_PROD.md
CHECKLIST_INCIDENTE.md
INCIDENTES.md
sonar-project.properties
.github/CODEOWNERS
.github/PULL_REQUEST_TEMPLATE.md
.github/workflows/monorepo-ci.yml
.github/workflows/deploy-dev.yml (opcional)
.github/workflows/deploy-staging.yml
.github/workflows/deploy-prod.yml
.github/workflows/release-notes.yml (opcional)
docker-compose.sonarqube.yml
docker-compose.staging.yml
docker-compose.prod.yml
```

---

## 10) Checklists (copiar al repo)

### 10.1 `CHECKLIST_DESARROLLO.md`
- [ ] Rama desde `main` (`feat/*` o `fix/*`)
- [ ] `npm run lint` / `npm test` / `npm run build` OK
- [ ] Probé manualmente el flujo
- [ ] Actualicé README/ENV si cambió algo
- [ ] PR con: qué hace / cómo probar / resultado esperado / capturas

### 10.2 `CHECKLIST_QA_DEV.md`
- [ ] Ejecuté los **criterios de aceptación**
- [ ] Smoke en DEV sin errores
- [ ] Registré hallazgos con captura
- [ ] Pasa a **Listo p/Staging**

### 10.3 `CHECKLIST_STAGING.md`
- [ ] Deploy ejecutado (workflow)
- [ ] **E2E Playwright** pasó (3–5 pruebas)
- [ ] **Smoke manual** del flujo crítico OK
- [ ] Sin errores nuevos en Sentry (30 min)
- [ ] Pasa a **Listo p/Prod**

### 10.4 `CHECKLIST_DEPLOY_PROD.md`
- [ ] Aprobado por Lead o PM
- [ ] Deploy ejecutado
- [ ] `/health` OK + flujo crítico real OK
- [ ] Tag `vX.Y.Z` + notas de versión
- [ ] Aviso “Publicado”

### 10.5 `CHECKLIST_INCIDENTE.md`
- [ ] Hora inicio/fin, síntomas
- [ ] Acción (rollback/parche)
- [ ] Causa raíz (breve)
- [ ] Prevención (1 acción concreta)
- [ ] ¿Se actualizó test/seed/doc?

---

## 11) Workflows — ejemplos

### 11.1 CI + SonarQube (`.github/workflows/monorepo-ci.yml`)
```yaml
name: monorepo-ci
on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Para mejor análisis de SonarQube
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Lint (workspace)
        run: npm run lint
      - name: Test with Coverage (workspace)
        run: npm test --workspaces --if-present -- --coverage
      - name: Build (workspace)
        run: npm run build --workspaces --if-present
      - name: SonarQube Scan
        uses: SonarSource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
      - name: SonarQube Quality Gate
        uses: sonarsource/sonarqube-quality-gate-action@master
        timeout-minutes: 5
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
```

### 11.2 Deploy Staging (`.github/workflows/deploy-staging.yml`)
```yaml
name: Deploy Staging
on:
  workflow_dispatch:
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.STG_HOST }}
          username: ${{ secrets.STG_USER }}
          key: ${{ secrets.STG_SSH_KEY }}
          script: |
            cd /srv/app && docker compose pull && docker compose up -d
```

### 11.3 Deploy Producción (`.github/workflows/deploy-prod.yml`)
```yaml
name: Deploy Producción
on:
  workflow_dispatch:
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /srv/app && docker compose pull && docker compose up -d
```

### 11.4 Notas de versión (`.github/workflows/release-notes.yml`) — opcional
```yaml
name: Release Notes
on:
  workflow_dispatch:
jobs:
  notes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            const { data: prs } = await github.rest.pulls.list({ owner: context.repo.owner, repo: context.repo.repo, state: 'closed' });
            const merged = prs.filter(p => p.merged_at)
              .map(p => `- #${p.number} ${p.title}`)
              .join('\\n');
            core.setOutput('body', merged || 'Sin cambios');
```

---

## 12) SonarQube — archivos y docker-compose

### 12.1 `sonar-project.properties` (raíz)
```properties
sonar.projectKey=monorepo-bca
sonar.projectName=Monorepo BCA
sonar.sources=apps/backend/src,apps/frontend/src,apps/documentos/src
sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/coverage/**,**/*.spec.ts,**/*.spec.js,**/tests/**,**/e2e/**
sonar.tests=apps/backend/src,apps/frontend/src,apps/documentos/src
sonar.test.inclusions=**/*.spec.ts,**/*.spec.js,**/tests/**,**/e2e/**
sonar.javascript.lcov.reportPaths=apps/backend/coverage/lcov.info,apps/frontend/coverage/lcov.info,apps/documentos/coverage/lcov.info
sonar.typescript.tsconfigPath=apps/backend/tsconfig.json,apps/frontend/tsconfig.json,apps/documentos/tsconfig.json
```

> **Monorepo**: ejecutar análisis por app usando `-Dsonar.projectBaseDir=apps/<nombre>` y claves por app (`monorepo-bca-backend`, `monorepo-bca-frontend`, `monorepo-bca-documentos`).

### 12.2 `docker-compose.sonarqube.yml`
```yaml
version: "3.9"
services:
  sonarqube:
    image: sonarqube:10-community
    container_name: sonarqube
    restart: unless-stopped
    ports:
      - "9000:9000"
    environment:
      SONAR_JDBC_URL: jdbc:postgresql://sonarqube-db:5432/sonar
      SONAR_JDBC_USERNAME: sonar
      SONAR_JDBC_PASSWORD: sonar123
    depends_on:
      - sonarqube-db
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_logs:/opt/sonarqube/logs
      - sonarqube_extensions:/opt/sonarqube/extensions
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:9000/api/system/status | grep -q UP"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
  sonarqube-db:
    image: postgres:15-alpine
    container_name: sonarqube-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: sonar
      POSTGRES_PASSWORD: sonar123
      POSTGRES_DB: sonar
    volumes:
      - sonarqube_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sonar"]
      interval: 10s
      timeout: 5s
      retries: 5
volumes:
  sonarqube_data:
  sonarqube_logs:
  sonarqube_extensions:
  sonarqube_postgres_data:
```

Arranque:
```bash
docker compose -f docker-compose.sonarqube.yml up -d
# Abrí http://localhost:9000  (admin / admin)  → cambiá la contraseña
# Projects → Create Project → Manually → Project key: monorepo-bca → genera TOKEN
# Guardar token en GitHub Secrets como SONAR_TOKEN
```

### 12.3 Configuración inicial de SonarQube

**1. Levantar SonarQube**:
```bash
docker compose -f docker-compose.sonarqube.yml up -d
```

**2. Acceder y configurar**:
- URL: http://localhost:9000
- Login inicial: `admin` / `admin`
- Cambiar contraseña cuando se solicite

**3. Crear proyecto**:
- Administration > Projects > Create Project
- Project key: `monorepo-bca`
- Display name: `Monorepo BCA`
- Main branch: `main`

**4. Generar token**:
- My Account > Security > Generate Tokens
- Name: `GitHub Actions`
- Type: `Global Analysis Token`
- Copiar y guardar en GitHub Secrets como `SONAR_TOKEN`

**5. Configurar Quality Gate** (opcional):
- Quality Gates > Create
- Nombre: `Monorepo BCA Gate`
- Condiciones recomendadas (New Code):
  - Coverage >= 70%
  - Duplicated Lines <= 3%
  - Maintainability Rating = A
  - Reliability Rating = A
  - Security Rating = A

**6. GitHub Secrets**:
```
SONAR_HOST_URL = http://your-sonarqube-server:9000
SONAR_TOKEN = [token generado en paso 4]
```

---

## 13) Operación y seguridad
- **Monitoreo**: Uptime Kuma a `/health` en Staging/Prod; Sentry para errores app.
- **Logs**: `docker logs` + rotación (`logrotate`). Portainer opcional para inspección.
- **Backups**: cron diario BD + archivos; **prueba de restore mensual**.
- **Accesos**: SSH por clave, `ufw`, `fail2ban`.
- **Privacidad**: en Staging, **datos anonimizados**; nunca reales.

### 13.1 Cron de backups (ejemplo)
```bash
# diario 02:00
0 2 * * * pg_dump $DB_URL > /backups/pg_$(date +\%F).sql
0 2 * * * tar -czf /backups/files_$(date +\%F).tar.gz /var/app/uploads
```

---

## 14) RACI (con Staging)
| Actividad                       | Responsable   | Aprueba | Apoya                   | Informado |
|---------------------------------|---------------|---------|-------------------------|-----------|
| Priorizar sprint                | Lead          | —       | PM                      | Equipo    |
| Historias y CA                  | PM/Analista   | Lead    | Devs                    | Equipo    |
| Desarrollo y PR                 | Dev Jr        | —       | Dev par                 | PM        |
| Revisión de código              | Dev par       | —       | DevOps/Back (si aplica) | PM        |
| Deploy a Staging                | DevOps/Back   | PM/Lead | Dev autor               | Equipo    |
| E2E + Smoke en Staging          | PM/Analista   | —       | Dev autor               | Lead      |
| Deploy a Producción             | DevOps/Back   | Lead    | Dev autor               | Equipo    |
| Backups/Restore                 | DevOps/Back   | Lead    | —                       | Equipo    |
| Gestión de incidentes           | DevOps/Back   | Lead    | Dev autor / PM          | Clientes* |

\* Solo si aplica (cliente con acuerdo de comunicación).

---

## 15) Anexos rápidos

### 15.1 Plantilla de PR (resumen)
```
### Qué hace

### Cómo probar

### Resultado esperado

### Evidencias (capturas/video)
```

### 15.2 Notas de versión (plantilla)
```
## vX.Y.Z – AAAA-MM-DD
- [Feat] Breve descripción (#PR)
- [Fix] Arreglo de … (#PR)
- [Chore] Dependencias (Renovate)
```

### 15.3 Ejemplo `docker-compose.yml` (prod simple)
```yaml
services:
  api:
    image: repo/api:latest
    env_file: .env
    ports: ["3000:3000"]
    restart: always
  web:
    image: repo/web:latest
    env_file: .env
    ports: ["80:80"]
    restart: always
```

---

## 16) Variables de entorno (base sugerida)
- `APP_ENV` = `dev` | `staging` | `prod`
- `FEATURE_*` = flags simples
- `DB_URL`, `REDIS_URL`, `S3_ENDPOINT`, `S3_BUCKET`, `SENTRY_DSN`
- `PORT`, `PUBLIC_URL`, `CORS_ORIGINS`
