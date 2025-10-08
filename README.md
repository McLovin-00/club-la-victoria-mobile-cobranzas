# Monorepo BCA — Backend, Frontend y Documentos

> **Stack Moderno**: Node.js 20+ | TypeScript | React 18 | PostgreSQL 16 | Docker  
> **Arquitectura**: Monorepo (npm workspaces + Turborepo)  
> **Metodología**: Manual Operativo Microsyst (Sprints semanales, DEV → Staging → Producción)

---

## 🎯 Descripción del Proyecto

Sistema integral de gestión empresarial compuesto por 3 servicios principales:

- **Backend** (apps/backend): API REST (Express + Prisma + PostgreSQL + Redis)
- **Frontend** (apps/frontend): SPA (React 18 + Vite + Tailwind + RTK + Shadcn/UI)
- **Documentos** (apps/documentos): Microservicio de gestión documental para transportistas (Express + Prisma + MinIO)

**Infraestructura**: PostgreSQL 16, Redis 7, MinIO (S3-compatible), Nginx Proxy Manager como reverse proxy.

---

## ⚡ Inicio Rápido

### Requisitos Previos

- **Node.js** ≥ 20
- **npm** ≥ 9
- **Docker** y **Docker Compose** (para infraestructura opcional)
- **Git**

### Instalación

```bash
# 1. Clonar repositorio
git clone <repository-url>
cd monorepo-bca

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores (ver sección Variables de Entorno)

# 4. (Opcional) Levantar infraestructura con Docker
npm run compose:dev:infra:up

# 5. Ejecutar migraciones de Prisma
npm run prisma:migrate

# 6. Levantar aplicaciones en desarrollo
npm run dev
```

### Acceso Local

| Servicio | URL | Puerto |
|----------|-----|--------|
| **Frontend** | http://localhost:8550 | 8550 |
| **Backend** | http://localhost:4800 | 4800 |
| **Documentos** | http://localhost:4802 | 4802 |
| **MinIO Console** | http://localhost:9001 | 9001 |

---

## 📦 Estructura del Monorepo

```
monorepo-bca/
├── apps/
│   ├── backend/              # API principal (Express + Prisma)
│   │   ├── src/
│   │   │   ├── config/       # Configuración
│   │   │   ├── controllers/  # Controladores
│   │   │   ├── middlewares/  # Middlewares
│   │   │   ├── routes/       # Rutas API
│   │   │   ├── services/     # Lógica de negocio
│   │   │   └── utils/        # Utilidades
│   │   └── prisma/
│   │       ├── schema.prisma # Schema de BD (platform)
│   │       └── migrations/   # Migraciones
│   │
│   ├── frontend/             # SPA (React 18 + Vite)
│   │   ├── src/
│   │   │   ├── components/   # Componentes reutilizables
│   │   │   ├── features/     # Features (por dominio)
│   │   │   ├── pages/        # Páginas
│   │   │   ├── store/        # Estado global (RTK)
│   │   │   └── utils/        # Utilidades
│   │   └── public/           # Archivos estáticos
│   │
│   └── documentos/           # Microservicio documental
│       ├── src/
│       │   ├── controllers/
│       │   ├── routes/
│       │   ├── services/
│       │   └── prisma/
│       │       ├── schema.prisma  # Schema de BD (documentos)
│       │       └── migrations/
│       └── uploads/          # Almacenamiento temporal
│
├── docs/                     # Documentación
│   ├── MANUAL_OPERATIVO_MICROSYST.md
│   ├── CICD_PIPELINE_3_SERVICES.md
│   ├── ENVIRONMENTS.md
│   ├── ARCHITECTURE.md
│   └── roles/                # Guías por rol
│
├── .github/
│   └── workflows/            # GitHub Actions CI/CD
│       ├── monorepo-ci.yml
│       ├── deploy-dev.yml
│       ├── deploy-staging.yml
│       └── deploy-prod.yml
│
├── .env.example              # Plantilla de variables
├── package.json              # Root package
├── turbo.json                # Configuración Turborepo
└── docker-compose.*.yml      # Diferentes entornos
```

---

## 🔧 Scripts Principales

### Desarrollo

```bash
npm run dev                    # Levantar todos los servicios (Turborepo)
npm run lint                   # ESLint v9 (flat config) en todo el monorepo
npm run type-check             # TypeScript strict check
npm test                       # Ejecutar todos los tests
npm run build                  # Build de todos los servicios
```

### Prisma (Base de Datos)

```bash
# Backend
npm run prisma:migrate         # Ejecutar migraciones (backend)
npm run prisma:generate        # Generar cliente Prisma (backend)
npm run prisma:studio          # Abrir Prisma Studio (backend)

# Documentos
npm run prisma:migrate:docs    # Ejecutar migraciones (documentos)
npm run prisma:generate:docs   # Generar cliente Prisma (documentos)
npm run prisma:studio:docs     # Abrir Prisma Studio (documentos)
```

### Docker Compose

```bash
# Infraestructura de desarrollo (Postgres, Redis, MinIO)
npm run compose:dev:infra:up
npm run compose:dev:infra:down
npm run compose:dev:infra:logs

# Testing completo
npm run compose:test:up
npm run compose:test:down
npm run compose:test:logs
```

### Validación Pre-PR (Obligatorio)

```bash
# Ejecutar antes de abrir Pull Request
npm ci && npm run lint && npm test && npm run build
```

---

## 🔐 Variables de Entorno

### Archivo `.env` (Raíz del Proyecto)

```bash
# === APLICACIÓN ===
NODE_ENV=development              # development | staging | production
BACKEND_PORT=4800                 # Puerto del backend
FRONTEND_PORT=8550                # Puerto del frontend
DOCUMENTOS_PORT=4802              # Puerto del microservicio documentos

# === BASE DE DATOS ===
DATABASE_URL=postgresql://evo:phoenix@localhost:5432/monorepo-bca?schema=platform
DOCUMENTOS_DATABASE_URL=postgresql://evo:phoenix@localhost:5432/monorepo-bca?schema=documentos

# === FRONTEND (Vite) ===
VITE_API_URL=http://localhost:4800
VITE_DOCUMENTOS_API_URL=http://localhost:4802
VITE_DOCUMENTOS_WS_URL=ws://localhost:4802

# === BACKEND/MICROSERVICIOS ===
FRONTEND_URLS=http://localhost:8550   # CORS allowed origins (coma-separados)

# === JWT (RS256) ===
JWT_PUBLIC_KEY_PATH=./keys/jwt-dev-public.pem
JWT_PRIVATE_KEY_PATH=./keys/jwt-dev-private.pem

# === MINIO ===
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_PREFIX=bca-dev-

# === REDIS ===
REDIS_HOST=localhost
REDIS_PORT=6379

# === RATE LIMITING ===
RATE_LIMIT_WINDOW=15              # Minutos
RATE_LIMIT_MAX=200                # Requests por ventana

# === LOGGING ===
LOG_LEVEL=debug                   # debug | info | warn | error
```

**Ver**: `docs/env/` para plantillas por ambiente (development, testing, staging, production)

---

## 🛠️ Stack Tecnológico

### Backend
- **Runtime**: Node.js 20+ con TypeScript
- **Framework**: Express.js
- **ORM**: Prisma (PostgreSQL 16)
- **Autenticación**: JWT RS256
- **Validación**: Zod
- **Logging**: Winston
- **Caché/Queues**: Redis 7 + BullMQ
- **Storage**: MinIO (S3-compatible)

### Frontend
- **Framework**: React 18 con TypeScript
- **Bundler**: Vite
- **Estado**: Redux Toolkit (RTK)
- **Routing**: React Router
- **Estilos**: Tailwind CSS
- **Componentes**: Shadcn/UI
- **HTTP**: Axios + RTK Query

### Infraestructura
- **Monorepo**: npm workspaces + Turborepo
- **CI/CD**: GitHub Actions
- **Contenedores**: Docker + Docker Compose
- **Orquestación Prod**: Docker Swarm
- **Reverse Proxy**: Nginx Proxy Manager
- **Monitoreo**: Sentry (errores) + Uptime Kuma (health checks)
- **Backups**: Cron diario + restore mensual

---

## 🔄 Flujo de Trabajo (Git + PRs + CI/CD)

### Modelo de Branching

**Branch principal**: `main` (siempre desplegable)

**Branches de trabajo**:
```bash
feat/<issue-number>-<descripcion>   # Nueva funcionalidad
fix/<issue-number>-<descripcion>    # Corrección de bug
chore/<descripcion>                 # Tareas de mantenimiento
```

**Reglas**:
- ❌ **NO push directo a `main`** (usar PRs siempre)
- ✅ **PRs ≤300 líneas** (dividir si es más grande)
- ✅ **Commits con Conventional Commits** (feat|fix|refactor|docs|test|chore)
- ✅ **CI debe estar verde** antes de merge

### Proceso de Pull Request

1. **Crear branch** desde `main`
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/123-nueva-funcionalidad
   ```

2. **Desarrollar y validar localmente**
   ```bash
   npm ci && npm run lint && npm test && npm run build
   ```

3. **Commits atómicos**
   ```bash
   git add .
   git commit -m "feat(backend): agregar endpoint de usuarios"
   git push origin feat/123-nueva-funcionalidad
   ```

4. **Abrir PR en GitHub**
   - Título: `tipo(scope): descripción corta`
   - Descripción: Qué hace / Cómo probar / Resultado esperado
   - Screenshots si es UI
   - Checklist completo

5. **Code Review**
   - **1 aprobación requerida** (peer developer)
   - Si toca seguridad/infra: 2da aprobación de DevOps/Lead
   - Responder a comentarios en < 24h

6. **Merge** (después de CI verde + aprobaciones)
   - Estrategia: Squash and Merge (recomendado)
   - Deploy automático a DEV

### CI/CD Pipeline

```
PR → CI (lint + test + build) → Code Review → Merge a main 
   → Deploy automático a DEV → QA en DEV → Deploy Staging (miércoles 11:00) 
   → QA en Staging → Deploy Producción (jueves 11:00, con aprobación Lead)
```

**Ver documentación completa**: `docs/CICD_PIPELINE_3_SERVICES.md`

---

## 📅 Cadencia Semanal (Manual Operativo Microsyst)

**Sprints semanales** con foco en entregas continuas:

| Día | Hora | Actividad | Responsable |
|-----|------|-----------|-------------|
| **Lunes** | - | Planificación (30min) | PM propone 5-15 tareas, Lead prioriza top 10 |
| **Diario** | - | Daily (10min) | Todos: qué haré hoy, bloqueos |
| **Miércoles** | 11:00 | **Deploy Staging** | DevOps + PM validación (E2E + smoke + Sentry 30min) |
| **Jueves** | 11:00 | **Deploy Producción** | DevOps + Lead aprobación (si Staging OK) |
| **Viernes** | - | Demo/Cierre (30min) | Todos: entregado, aprendizajes, próximos pasos |

**Regla de oro**: Nada llega a Producción sin pasar por Staging (E2E + smoke OK + 30 min sin errores en Sentry)

---

## 👥 Roles y Responsabilidades

### Founder/Lead
- Define prioridades del sprint
- Aprueba deploys a Producción
- Code review y arquitectura
- Destraba bloqueos

### Desarrolladores Junior (3 devs)
- Implementan features/fixes
- PRs ≤300 líneas
- Peer review (1 aprobación)
- Quality gates (lint/test/build)
- Actualizan docs

### PM/Analista (jr-ssr)
- Redacta User Stories con CA
- Mantiene tablero actualizado
- QA en DEV y Staging
- Smoke/E2E en Staging
- Documenta (README, CHECKLISTS)

### DevOps/Back (ssr)
- Mantiene CI/CD (GitHub Actions)
- Ejecuta deploys (Staging/Prod)
- Infraestructura (Docker, Nginx)
- Monitoreo (Sentry, Uptime Kuma)
- Backups y seguridad

**Ver guías detalladas**: `docs/roles/`

---

## 📚 Documentación Completa

### Operativa
- **[Manual Operativo Microsyst](./docs/MANUAL_OPERATIVO_MICROSYST.md)** - Manual completo del equipo
- **[CI/CD Pipeline](./docs/CICD_PIPELINE_3_SERVICES.md)** - Flujo de integración y despliegue
- **[Ambientes](./docs/ENVIRONMENTS.md)** - Configuración de ambientes (DEV, Testing, Staging, Prod)
- **[Arquitectura](./docs/ARCHITECTURE.md)** - Arquitectura del sistema
- **[Recursos de Hardware](./docs/RESOURCES_HARDWARE.md)** - Especificación de recursos y límites por ambiente

### Roles
- **[Guías por Rol](./docs/roles/README.md)** - Procedimientos detallados
  - Desarrollador Junior
  - Founder/Lead
  - PM/Analista de Calidad
  - DevOps/Back (SSR)
  - Product Owner (referencia)

### Técnica
- **[Prisma Configuration](./docs/PRISMA_CONFIGURATION.md)** - Arquitectura y configuración de Prisma
- **[Prisma Quick Reference](./docs/PRISMA_QUICK_REFERENCE.md)** - Comandos esenciales

---

## 🧪 Testing

### Tests Unitarios
```bash
npm test                       # Todos los tests
npm test -- --coverage         # Con cobertura
npm test -- backend            # Solo backend
npm test -- frontend           # Solo frontend
```

**Objetivo de cobertura**: ≥ 80%

### Tests E2E (Playwright)
```bash
cd apps/frontend
npx playwright test            # Tests E2E
npx playwright test --ui       # Modo UI
npx playwright show-report     # Ver reporte
```

**E2E en Staging**: 3-5 pruebas críticas del flujo de negocio

---

## 🔒 Seguridad

### Autenticación
- JWT RS256 (claves pública/privada)
- Tokens en httpOnly cookies (recomendado) o Authorization header
- Refresh tokens para sesiones extendidas

### Sistema de Roles
```typescript
enum Role {
  USER = 'USER',           // Acceso básico
  ADMIN = 'ADMIN',         // Gestión de usuarios y sistema
  SUPERADMIN = 'SUPERADMIN' // Acceso completo
}
```

### Buenas Prácticas
- ✅ Validación de entrada con Zod
- ✅ Rate limiting por IP (configurable)
- ✅ CORS restrictivo (solo orígenes permitidos, no `*`)
- ✅ Secrets en variables de entorno (nunca en código)
- ✅ HTTPS en Staging/Producción
- ✅ SQL injection prevention (Prisma)
- ✅ Logs sin PII

---

## 🚀 Despliegue

### Ambientes

| Ambiente | Propósito | Orquestación | Deploy |
|----------|-----------|--------------|--------|
| **DEV Local** | Desarrollo activo | Scripts locales (`npm run dev`) | Local |
| **DEV Server** | Integración continua | Docker Compose | Automático (merge a `main`) |
| **Staging** | Validación pre-prod | Docker Swarm | Manual (miércoles 11:00) |
| **Producción** | Usuarios finales | Docker Swarm | Manual (jueves 11:00, con aprobación) |

### Deploy Manual (Ejemplo Staging/Prod)

```bash
# En servidor (SSH)
cd /home/administrador/monorepo-bca

# 1. Backup (solo producción)
/home/administrador/scripts/backup.sh

# 2. Pull código
git pull origin main

# 3. Instalar dependencias
npm ci

# 4. Migraciones
npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma
npx prisma migrate deploy --schema=apps/documentos/src/prisma/schema.prisma

# 5. Deploy Swarm
bash scripts/deploy-prod.sh

# 6. Verificar
docker service ls
curl https://api.microsyst.com.ar/health
```

**Ver procedimientos completos**: `docs/CICD_PIPELINE_3_SERVICES.md`

---

## 🐛 Debugging y Logs

### Logs de Aplicación
```bash
# Backend (Winston)
tail -f apps/backend/logs/app.log
tail -f apps/backend/logs/error.log

# Documentos
tail -f apps/documentos/logs/app.log
```

### Logs de Docker
```bash
# Servicios Swarm
docker service logs monorepo-bca_backend --tail 100 --follow
docker service logs monorepo-bca_frontend --tail 100 --follow
docker service logs monorepo-bca_documentos --tail 100 --follow

# Contenedores locales
docker logs bca_backend --tail 100 --follow
```

### Health Checks
```bash
# Local
curl http://localhost:4800/health
curl http://localhost:4802/api/docs/health

# Staging
curl https://api.staging.microsyst.com.ar/health

# Producción
curl https://api.microsyst.com.ar/health
```

---

## 📊 Monitoreo

### Sentry (Error Tracking)
- Configurado en `SENTRY_DSN`
- Captura errores de backend y frontend
- Alertas en Slack (configurar webhook)

### Uptime Kuma (Health Checks)
- Monitorea endpoints `/health`
- Alertas si servicios caen
- Dashboard de disponibilidad

### Métricas Clave
- **Uptime**: > 99.5%
- **Response Time**: < 500ms (p95)
- **Error Rate**: < 1%
- **Deploy Success**: > 95%

---

## 🤝 Contribución

### Para Nuevos Desarrolladores

1. **Leer documentación**
   - [Manual Operativo](./docs/MANUAL_OPERATIVO_MICROSYST.md)
   - [Guía del Desarrollador](./docs/roles/01_DESARROLLADOR.md)
   - [CI/CD Pipeline](./docs/CICD_PIPELINE_3_SERVICES.md)

2. **Setup local**
   - Seguir sección "Inicio Rápido"
   - Completar checklist de onboarding

3. **Primera tarea**
   - Asignada en GitHub Issues
   - Seguir flujo de PR completo
   - Pedir ayuda si bloqueado > 2h

### Estándares de Código

Ver: `docs/user_rules.md` (reglas detalladas del proyecto)

**Resumen**:
- TypeScript strict mode
- ESLint v9 flat config (0 errores, 0 warnings)
- Conventional Commits
- Tests con cobertura ≥ 80%
- PRs ≤ 300 líneas
- Code review obligatorio (1 aprobación mínima)

---

## 📞 Soporte y Escalamiento

| Tema | Contacto | Canal |
|------|----------|-------|
| Dudas técnicas | Tech Lead/Founder | Slack #dev |
| Bugs/Issues | GitHub Issues | GitHub |
| Bloqueos | Daily standup | Slack #general |
| Infraestructura | DevOps/Back | Slack #devops |
| Requerimientos | PM/Analista | Slack #product |
| Incidentes Prod | DevOps + Lead | Slack #incidents |

---

## 📄 Licencia

[Especificar licencia del proyecto]

---

## 🔗 Enlaces Útiles

- **GitHub**: [Repository URL]
- **Documentación**: `/docs`
- **Jira/Linear**: [Project Management URL]
- **Slack**: [Workspace URL]
- **Sentry**: [Sentry Project URL]
- **Staging**: https://app.staging.microsyst.com.ar
- **Producción**: https://app.microsyst.com.ar

---

**Última actualización**: 8 Octubre 2025  
**Versión**: 3.0  
**Mantenido por**: Founder/Lead + DevOps/Back (ssr)  
**Alineado con**: Manual Operativo Microsyst
