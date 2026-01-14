# RESUMEN EJECUTIVO - STACK TÉCNICO MONOREPO BCA

> **Documento de Referencia Rápida**  
> **Fecha**: 14 Enero 2026  
> Para documento completo ver: `RACONTO_COMPLETO_STACK_TECNICO.md`

---

## 🎯 VISIÓN GENERAL

**Monorepo BCA** es un sistema de gestión empresarial multi-tenant con arquitectura de microservicios, construido con TypeScript, React 18, Node.js 20, PostgreSQL 16 y Docker Swarm.

**Principios**: KISS, TypeScript Strict, API-First, Multi-Tenant, Cloud-Ready

---

## 📦 ARQUITECTURA

### Monorepo
- **Gestión**: npm workspaces + Turborepo
- **Node.js**: ≥20.0.0
- **npm**: ≥10.0.0
- **TypeScript**: 5.8.3 (strict mode)

### Aplicaciones

| App | Puerto | Tecnología | Propósito |
|-----|--------|------------|-----------|
| **backend** | 4800 | Express + Prisma | API principal, auth, RBAC |
| **frontend** | 8550 | React 18 + Vite | SPA multi-portal |
| **documentos** | 4802 | Express + Prisma + MinIO | Microservicio documental + IA |
| **remitos** | 4803 | Express + Prisma | Microservicio remitos (dev) |

### Packages Compartidos

| Package | Propósito |
|---------|-----------|
| `@workspace/types` | Tipos TypeScript compartidos |
| `@workspace/utils` | Utilidades compartidas |

---

## 🛠️ STACK TECNOLÓGICO

### Frontend
```
React 18.2.0
├── Build: Vite 6.2.0
├── Estado: Redux Toolkit 2.6.1
├── Routing: React Router 7.5.0
├── Estilos: Tailwind CSS 3.4.17
├── Componentes: Shadcn/UI + Radix UI + Headless UI
├── Forms: React Hook Form 7.57.0 + Zod
├── HTTP: Axios 1.9.0 + RTK Query
├── WebSockets: Socket.io-client 4.8.1
└── Icons: Heroicons + Lucide
```

### Backend
```
Node.js 20+ + TypeScript 5.8.3
├── Framework: Express 4.18.2 / 5.1.0
├── ORM: Prisma 6.12.0
├── Validación: Zod 3.21.4+
├── Auth: JWT RS256 (jsonwebtoken 9.0.2)
├── Hashing: bcryptjs 3.0.2 (12 rounds)
├── Logging: Winston 3.16.0 / 3.17.0
├── HTTP Client: Axios 1.10.0 / 1.11.0
├── Upload: Multer 1.4.5-lts.1 / 2.0.2
├── Rate Limit: express-rate-limit 7.5.0+
└── CORS: cors 2.8.5
```

### Base de Datos
```
PostgreSQL 16 (Alpine)
├── ORM: Prisma 6.12.0
├── Schemas: platform, documentos, remitos, flowise
├── Multi-Tenant: Por tenant_empresa_id
├── Migraciones: Prisma Migrate (versionadas)
└── Backups: pg_dump diario
```

### Cache y Colas
```
Redis 7 (Alpine)
├── Persistencia: AOF
├── Política: allkeys-lru (512MB max)
├── Cliente: ioredis 5.6.1
└── Colas: BullMQ 5.56.4
```

### Storage
```
MinIO (S3-compatible)
├── Versión: minio/minio:latest
├── API: Puerto 9000
├── Console: Puerto 9001
├── Cliente: minio 8.0.1
└── Buckets: Prefijos por tenant
```

### IA (Opcional)
```
Flowise AI
├── Versión: flowiseai/flowise:latest
├── Puerto: 3000 (dev) / 3005 (prod)
├── BD: PostgreSQL (schema flowise)
├── API: /api/v1/prediction/{flowId}
└── Uso: Clasificación documental, OCR
```

---

## 🏗️ INFRAESTRUCTURA

### Desarrollo
```
Docker Compose (docker-compose.dev.yml)
├── PostgreSQL 16
├── Redis 7
├── MinIO
├── Flowise AI (opcional)
├── Adminer (opcional)
└── MailHog (opcional)

Apps: npm run dev (Turborepo, NO Docker)
```

### Staging/Producción
```
Docker Swarm
├── nginx (reverse proxy, SSL)
├── frontend (2 réplicas)
├── backend (2 réplicas)
├── documentos (2 réplicas)
├── PostgreSQL (1 réplica, manager)
├── Redis (1 réplica)
├── MinIO (1 réplica)
└── Flowise (1 réplica, opcional)

Redes: frontend (nginx↔apps), backend (apps↔infra)
```

### Servicios Auxiliares

| Servicio | Propósito | Puerto/URL |
|----------|-----------|------------|
| **Nginx** | Reverse proxy, SSL | 80, 443 |
| **SonarQube** | Code quality | http://10.3.0.244:9900 |
| **Sentry** | Error tracking | Cloud |
| **Uptime Kuma** | Health monitoring | Servidor interno |
| **GitHub Actions** | CI/CD | Cloud |

---

## 🔐 SEGURIDAD

### Autenticación
- **JWT RS256** (claves asimétricas)
- **Access Token**: 15 min
- **Refresh Token**: 7 días
- **Payload**: sub (user.id), email, role, empresaId

### Contraseñas
- **bcryptjs** con 12 rounds

### Validación
- **Zod** en todas las fronteras

### CORS
- Lista explícita de dominios (NO `*`)
- Configurado por ambiente

### Rate Limiting
- **15 min / 200 requests** (default)
- **15 min / 50 requests** (upload endpoints)

### Security Headers
- X-Frame-Options, X-Content-Type-Options, HSTS, CSP (configurados en Nginx)

---

## 🗄️ BASE DE DATOS

### Schemas

#### Backend (`platform`)
```
Modelos: Empresa, User (platform_users), EndUser, Service, Instance, 
         Permiso, PermisoTemporal, AuditLog, Payment, Schedule
Enums: UserRole (SUPERADMIN, ADMIN, OPERATOR, OPERADOR_INTERNO, 
       ADMIN_INTERNO, DADOR_DE_CARGA, TRANSPORTISTA, CHOFER, CLIENTE),
       EndUserRole (CLIENT, CONTACT), IdentifierType,
       ServiceEstado, InstanceEstado, PeriodoReseteo, PaymentTipo, 
       PaymentStatus, ScheduleTipo
```

#### Documentos (`documentos`)
```
Modelos: DocumentTemplate, Document, DocumentClassification,
         Chofer, Camion, Acoplado, DadorCarga, Cliente, 
         EmpresaTransportista, Equipo, EquipoCliente, EquipoHistory,
         ClienteDocumentRequirement, EntityExtractedData, 
         EntityExtractionLog, NotificationLog, SystemConfig, 
         AuditLog, EquipoAuditLog
Enums: EntityType (DADOR, EMPRESA_TRANSPORTISTA, CHOFER, CAMION, ACOPLADO),
       DocumentStatus, NotificationType, NotificationAudience, EquipoEstado
```

#### Remitos (`remitos`)
```
Modelos: Remito, RemitoImagen, RemitoHistory, RemitoSystemConfig
Enums: RemitoEstado, TipoImagen, RemitoAction
```

### Conexión
```bash
# Backend
DATABASE_URL=postgresql://user:pass@host:5432/monorepo-bca?schema=platform

# Documentos
DOCUMENTOS_DATABASE_URL=postgresql://user:pass@host:5432/monorepo-bca?schema=documentos
```

---

## 🚀 CI/CD

### Pipeline CI (GitHub Actions)

**Trigger**: PR a main, push a main

**Pasos**:
1. Checkout (fetch-depth: 0)
2. Setup Node.js 20
3. `npm ci`
4. `npm run lint` (ESLint v9)
5. `npm run type-check` (TypeScript)
6. `npm test -- --coverage` (Jest)
7. `npm run build` (Turborepo)
8. SonarQube Scan
9. Quality Gate check

**Tiempo**: 5-8 minutos

### Pipeline CD

| Ambiente | Trigger | Deploy | Validación |
|----------|---------|--------|------------|
| **DEV** | Automático (merge a main) | Docker Compose | Health checks |
| **Staging** | Manual (miércoles 11:00) | Docker Swarm | E2E + smoke + Sentry 30min |
| **Producción** | Manual + Aprobación (jueves 11:00) | Docker Swarm | Monitoreo intensivo 1h |

---

## 🌍 AMBIENTES

| Ambiente | Orquestación | URL | Datos |
|----------|--------------|-----|-------|
| **DEV Local** | Scripts (`npm run dev`) | localhost:8550 | Sintéticos |
| **DEV Server** | Docker Compose | dev.microsyst.com.ar | Sintéticos |
| **Staging** | Docker Swarm | staging.microsyst.com.ar | Anonimizados |
| **Producción** | Docker Swarm | microsyst.com.ar | Reales |

---

## 📊 OBSERVABILIDAD

### Logging
- **Winston** con rotación diaria
- **Niveles**: error, warn, info, debug
- **Formato**: JSON estructurado
- **Retención**: 30 días (errors 90 días)

### Error Tracking
- **Sentry** (backend + frontend)
- Error tracking + APM
- Alertas en tiempo real

### Health Checks
- `GET /api/health` (backend)
- `GET /api/docs/health` (documentos)
- Monitoreados por Uptime Kuma (60s interval)

### Métricas Clave
- Uptime > 99.5%
- Response Time < 500ms (p95)
- Error Rate < 1%
- Deploy Success > 95%

---

## 🔧 COMANDOS ESENCIALES

### Desarrollo
```bash
# Setup inicial
cp .env.example .env        # Configurar variables
npm install                 # Instalar dependencias

# Levantar infraestructura (opcional)
npm run compose:dev:infra:up

# Levantar aplicaciones
npm run dev                 # Turborepo dev

# Validación
npm run lint                # ESLint
npm test                    # Jest
npm run build               # Turborepo build
```

### Base de Datos
```bash
# Backend
npm run prisma:migrate      # Aplicar migraciones
npm run prisma:generate     # Generar cliente
npm run prisma:studio       # UI de BD

# Documentos
npm run prisma:migrate:docs
npm run prisma:generate:docs
npm run prisma:studio:docs
```

### Docker
```bash
# Desarrollo
npm run compose:dev:infra:up
npm run compose:dev:infra:down
npm run compose:dev:infra:logs

# Staging/Prod
docker stack deploy -c docker-compose.prod.yml monorepo-bca
docker service ls
docker service logs -f monorepo-bca_backend
```

### Scripts
```bash
bash scripts/health-check-all.sh    # Health checks
bash scripts/monitor-resources.sh   # Monitoreo
bash scripts/backup.sh              # Backup BD
bash scripts/restore.sh backup.sql  # Restore BD
bash scripts/cleanup-docker.sh      # Limpieza Docker
```

---

## 📁 ESTRUCTURA CLAVE

```
monorepo-bca/
├── apps/
│   ├── backend/           # Express API + Prisma (platform)
│   ├── frontend/          # React 18 SPA + Vite
│   ├── documentos/        # Express API + Prisma (documentos)
│   └── remitos/           # Express API + Prisma (remitos)
│
├── packages/
│   ├── types/             # @workspace/types
│   └── utils/             # @workspace/utils
│
├── docs/                  # Documentación completa
├── scripts/               # Scripts de automatización
├── .github/workflows/     # GitHub Actions
├── keys/                  # Claves JWT (NO versionadas)
├── nginx/                 # Configuración Nginx
│
├── docker-compose.dev.yml      # Dev infrastructure
├── docker-compose.prod.yml     # Production stack
├── turbo.json                  # Turborepo config
├── .env.example                # Variables template
└── package.json                # Root workspace
```

---

## 🎯 METODOLOGÍA

### Git Flow
```
main (protegida)
  ├── feat/<issue>-<desc>    # Features
  ├── fix/<issue>-<desc>     # Bugfixes
  └── chore/<desc>           # Mantenimiento
```

**Reglas**:
- ❌ NO push directo a main
- ✅ PRs obligatorios (1 aprobación)
- ✅ CI verde obligatorio
- ✅ PRs ≤ 300 líneas
- ✅ Conventional Commits

### Cadencia Semanal

| Día | Actividad |
|-----|-----------|
| **Lunes** | Planificación Sprint (30min) |
| **Diario** | Daily Standup (10min) |
| **Miércoles 11:00** | Deploy Staging |
| **Jueves 11:00** | Deploy Producción (con aprobación) |
| **Viernes** | Demo/Retro (30min) |

### Definition of Done
- ✅ Código + Tests (≥80% coverage)
- ✅ Lint + Typecheck + Build OK
- ✅ PR aprobado + merged
- ✅ Deploy DEV + validación QA
- ✅ Docs actualizadas

---

## 📞 CONTACTOS Y RECURSOS

### Repositorio
- **GitHub**: https://github.com/sergiobleynat1969/monorepo-bca
- **Branch**: `main`

### Servidores
- **Producción**: microsyst.com.ar
- **Staging**: staging.microsyst.com.ar
- **SonarQube**: http://10.3.0.244:9900

### Documentación
- **README**: `/README.md`
- **Completa**: `/docs/`
- **Este documento**: `/RACONTO_COMPLETO_STACK_TECNICO.md`

### Herramientas
- **IDE**: Cursor AI (recomendado)
- **BD Client**: HeidiSQL / DBeaver / Prisma Studio
- **API Testing**: Postman
- **Monitoring**: Sentry + Uptime Kuma

---

## 🔑 VARIABLES CRÍTICAS (.env)

```bash
# Aplicación
NODE_ENV=development
BACKEND_PORT=4800
FRONTEND_PORT=8550
DOCUMENTOS_PORT=4802

# Base de Datos
DATABASE_URL=postgresql://...?schema=platform
DOCUMENTOS_DATABASE_URL=postgresql://...?schema=documentos

# JWT
JWT_PUBLIC_KEY_PATH=./keys/jwt-dev-public.pem
JWT_PRIVATE_KEY_PATH=./keys/jwt-dev-private.pem

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Frontend (Vite)
VITE_API_URL=http://localhost:4800
VITE_DOCUMENTOS_API_URL=http://localhost:4802

# CORS
FRONTEND_URLS=http://localhost:8550

# Logging
LOG_LEVEL=debug

# Monitoring (opcional)
SENTRY_DSN=https://...
```

---

## 🚨 TROUBLESHOOTING RÁPIDO

### Puerto ocupado
```bash
lsof -ti:4800 | xargs kill -9  # Matar proceso en puerto
```

### Limpiar caché
```bash
npm run clean               # Limpiar builds
rm -rf node_modules         # Limpiar deps
npm install                 # Reinstalar
```

### Prisma issues
```bash
npm run prisma:generate     # Regenerar cliente
npm run prisma:migrate:deploy  # Aplicar migraciones
```

### Docker issues
```bash
docker system prune -a      # Limpiar todo (cuidado)
docker volume prune         # Limpiar volúmenes
```

### Logs
```bash
tail -f apps/backend/logs/app.log
tail -f apps/documentos/logs/app.log
docker service logs -f monorepo-bca_backend
```

---

## 🚀 PLANES FUTUROS (ROADMAP)

### Single Sign-On (SSO) Centralizado

**Objetivo**: Autenticación unificada para todos los monorepos BCA y acceso a red corporativa

**Solución Propuesta**: Keycloak (OpenID Connect / OAuth 2.0)

**Beneficios**:
- Una única credencial para todas las aplicaciones BCA
- Gestión centralizada de identidades
- Integración con Active Directory / LDAP
- Onboarding/offboarding simplificado

**Timeline Estimado**: 2-3 meses

**Aplicaciones a Integrar**:
- ✅ Monorepo BCA (actual)
- 🔄 Monorepo Logística (en desarrollo)
- 🔄 Monorepo Inventario (planificado)
- 🔄 Red corporativa (VPN/Firewall)

### Cifrado de Datos

**PostgreSQL**:
- **Baseline**: LUKS (cifrado de disco completo) - ALTA PRIORIDAD
- **Avanzado**: Cifrado de columnas sensibles (DNI, CUIL, datos financieros) - MEDIA PRIORIDAD
- **Gestión de claves**: HashiCorp Vault

**MinIO (Archivos)**:
- **Baseline**: SSE-S3 (server-side encryption) - ALTA PRIORIDAD
- **Avanzado**: Cifrado cliente para archivos críticos - MEDIA PRIORIDAD

**Marca de Agua en Documentos**:
- **Visible**: Texto/logo superpuesto (Sharp + PDF-Lib) - ALTA PRIORIDAD
- **Metadata**: EXIF/XMP con info de usuario y empresa - MEDIA PRIORIDAD
- **Steganografía**: Marca invisible para rastreo forense - BAJA PRIORIDAD (opcional)

**Roadmap de Cifrado**:
1. **Mes 1**: LUKS + MinIO SSE-S3 + Marca de agua visible
2. **Mes 2-3**: Cifrado columnas BD + Metadata embedding
3. **Mes 4-5**: HashiCorp Vault + Cifrado cliente MinIO
4. **Mes 6 (opcional)**: Steganografía

### Otros Planes

| Feature | Prioridad | Timeline |
|---------|-----------|----------|
| **Microservicio Notificaciones** (Email, SMS, Push) | Media | 2 meses |
| **Prometheus + Grafana** (Métricas) | Media | 1.5 meses |
| **Backup Offsite** (S3 compatible) | Alta | 1 mes |
| **API Gateway** (Kong/Traefik) | Baja | 2 meses |

Ver detalles completos en: `RACONTO_COMPLETO_STACK_TECNICO.md` → Sección 15

---

**Última actualización**: 14 Enero 2026  
**Versión**: 1.0  
**Mantenido por**: Founder/Lead + DevOps

Para información detallada, consultar: `RACONTO_COMPLETO_STACK_TECNICO.md`
