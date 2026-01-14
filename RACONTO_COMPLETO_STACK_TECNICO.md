# RACONTO COMPLETO DEL STACK TÉCNICO - MONOREPO BCA

> **Fecha de Elaboración**: 14 Enero 2026  
> **Propósito**: Documento de referencia completo para continuidad del trabajo  
> **Audiencia**: Equipos de desarrollo, IA asistente, nuevos integrantes  

---

## 📑 ÍNDICE

1. [Visión General del Sistema](#1-visión-general-del-sistema)
2. [Arquitectura del Monorepo](#2-arquitectura-del-monorepo)
3. [Stack Tecnológico Detallado](#3-stack-tecnológico-detallado)
4. [Aplicaciones y Microservicios](#4-aplicaciones-y-microservicios)
5. [Infraestructura y Servicios Auxiliares](#5-infraestructura-y-servicios-auxiliares)
6. [Base de Datos y Persistencia](#6-base-de-datos-y-persistencia)
7. [Seguridad y Autenticación](#7-seguridad-y-autenticación)
8. [CI/CD y DevOps](#8-cicd-y-devops)
9. [Ambientes y Despliegue](#9-ambientes-y-despliegue)
10. [Observabilidad y Monitoreo](#10-observabilidad-y-monitoreo)
11. [Herramientas de Desarrollo](#11-herramientas-de-desarrollo)
12. [Configuración y Variables de Entorno](#12-configuración-y-variables-de-entorno)
13. [Scripts y Automatización](#13-scripts-y-automatización)
14. [Metodología y Proceso de Trabajo](#14-metodología-y-proceso-de-trabajo)
15. [Roadmap y Planes de Implementación Futura](#15-roadmap-y-planes-de-implementación-futura)
16. [Referencias y Documentación](#16-referencias-y-documentación)

---

## 1. VISIÓN GENERAL DEL SISTEMA

### 1.1 Descripción del Proyecto

**Monorepo BCA** es un sistema integral de gestión empresarial compuesto por múltiples servicios que gestionan:
- Plataforma de administración (usuarios, empresas, instancias de servicio)
- Gestión documental para transportistas (documentos, validación, IA)
- Gestión de remitos con análisis OCR/IA
- Sistema de permisos y autenticación multi-tenant

### 1.2 Principios de Arquitectura

- **Monorepo**: Un único repositorio con múltiples aplicaciones relacionadas
- **Microservicios**: Servicios independientes con responsabilidades específicas
- **TypeScript First**: Todo el código es TypeScript con strict mode
- **API-First**: Backend expone APIs REST consumidas por frontend SPA
- **Multi-Tenant**: Arquitectura preparada para múltiples empresas/clientes
- **Cloud-Ready**: Diseñado para contenedores y orquestación

### 1.3 Características Clave

- ✅ **Multi-tenancy** con aislamiento por tenant (empresa)
- ✅ **RBAC** (Role-Based Access Control) con permisos granulares
- ✅ **JWT RS256** para autenticación distribuida
- ✅ **Storage S3-compatible** (MinIO) para archivos
- ✅ **Cache distribuido** (Redis) con soporte para colas (BullMQ)
- ✅ **IA integrada** (Flowise) para clasificación documental y OCR
- ✅ **WebSockets** para comunicación en tiempo real
- ✅ **Validación con schemas** (Zod) en todas las fronteras
- ✅ **Logging estructurado** (Winston) con rotación automática
- ✅ **Health checks** y métricas para monitoreo

---

## 2. ARQUITECTURA DEL MONOREPO

### 2.1 Estructura de Directorios

```
monorepo-bca/
├── apps/                          # Aplicaciones del sistema
│   ├── backend/                   # API principal (Express + Prisma)
│   ├── frontend/                  # SPA (React 18 + Vite)
│   ├── documentos/                # Microservicio documental
│   └── remitos/                   # Microservicio de remitos (en desarrollo)
│
├── packages/                      # Código compartido
│   ├── types/                     # Tipos TypeScript compartidos
│   └── utils/                     # Utilidades compartidas
│
├── docs/                          # Documentación completa
│   ├── roles/                     # Guías por rol (dev, PM, QA, DevOps)
│   ├── env/                       # Plantillas de variables por ambiente
│   ├── procedures/                # Procedimientos operativos
│   └── onboarding/                # Material de onboarding
│
├── scripts/                       # Scripts de automatización
│   ├── deploy-*.sh               # Scripts de despliegue
│   ├── health-check-all.sh       # Health checks
│   ├── monitor-resources.sh      # Monitoreo de recursos
│   ├── backup.sh                 # Backup de BD
│   └── restore.sh                # Restore de BD
│
├── .github/
│   └── workflows/                 # GitHub Actions CI/CD
│       ├── monorepo-ci.yml       # Lint + Test + Build + SonarQube
│       ├── deploy-dev.yml        # Deploy automático a DEV
│       ├── deploy-staging.yml    # Deploy manual a Staging
│       └── deploy-prod.yml       # Deploy manual a Producción
│
├── nginx/                         # Configuración Nginx
│   ├── nginx.conf                # Configuración principal
│   └── ssl/                      # Certificados SSL/TLS
│
├── keys/                          # Claves criptográficas (NO versionadas)
│   ├── jwt-dev-public.pem        # Clave pública JWT (desarrollo)
│   ├── jwt-dev-private.pem       # Clave privada JWT (desarrollo)
│   ├── jwt-staging-public.pem    # Clave pública JWT (staging)
│   └── jwt-prod-public.pem       # Clave pública JWT (producción)
│
├── logs/                          # Logs de aplicaciones (NO versionados)
│   ├── backend.*.log
│   ├── frontend.*.log
│   └── documentos.*.log
│
├── docker-compose.dev.yml         # Infraestructura de desarrollo
├── docker-compose.hybrid.yml      # Modo híbrido (apps PM2 + Docker infra)
├── docker-compose.staging.yml     # Staging (Docker Swarm)
├── docker-compose.prod.yml        # Producción (Docker Swarm)
├── docker-compose.sonarqube.yml   # SonarQube local
│
├── ecosystem.config.js            # PM2 config (solo híbrido)
├── turbo.json                     # Configuración Turborepo
├── package.json                   # Root package (workspaces)
├── tsconfig.json                  # TypeScript config base
├── .env                           # Variables de entorno (NO versionado)
├── .env.example                   # Plantilla de variables
└── README.md                      # Documentación principal
```

### 2.2 Gestión de Monorepo

**Herramienta**: `npm workspaces` + `Turborepo`

**Configuración**:
- `npm workspaces`: Gestión de dependencias compartidas
- `Turborepo`: Orquestación de builds, tests, lint con caché inteligente
- Package manager: `npm@10.0.0`
- Node.js: `≥20.0.0`

**Workspaces**:
```json
"workspaces": [
  "apps/*",
  "packages/*"
]
```

**Ventajas**:
- ✅ Instalación única de dependencias compartidas
- ✅ Hoisting automático de paquetes comunes
- ✅ Builds incrementales con caché (Turborepo)
- ✅ Ejecución paralela de tareas
- ✅ Versionado atómico de todo el sistema

---

## 3. STACK TECNOLÓGICO DETALLADO

### 3.1 Runtime y Lenguajes

| Componente | Tecnología | Versión | Propósito |
|------------|------------|---------|-----------|
| **Runtime** | Node.js | 20+ | Ejecución JavaScript/TypeScript |
| **Lenguaje Backend** | TypeScript | 5.8.3 | Desarrollo backend tipado |
| **Lenguaje Frontend** | TypeScript | 5.8.3 | Desarrollo frontend tipado |
| **Strict Mode** | TypeScript | Activado | Máxima seguridad de tipos |
| **Package Manager** | npm | 10+ | Gestión de dependencias |

### 3.2 Backend Stack

#### 3.2.1 Framework y Core

| Componente | Tecnología | Versión | Propósito |
|------------|------------|---------|-----------|
| **Framework Web** | Express.js | 4.18.2 / 5.1.0 | Servidor HTTP y routing |
| **ORM** | Prisma | 6.12.0 | Acceso a base de datos |
| **Base de Datos** | PostgreSQL | 16 | Base de datos principal |
| **Validación** | Zod | 3.21.4+ | Validación de schemas |
| **Logging** | Winston | 3.16.0+ | Logging estructurado |

#### 3.2.2 Seguridad y Autenticación

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| **Autenticación** | JWT (RS256) | Tokens firmados con clave asimétrica |
| **Hashing** | bcryptjs | Hash de contraseñas (12 rounds) |
| **CORS** | cors | Control de acceso cross-origin |
| **Rate Limiting** | express-rate-limit | Protección contra abuse |

#### 3.2.3 Integraciones Backend

| Componente | Tecnología | Versión | Propósito |
|------------|------------|---------|-----------|
| **HTTP Client** | axios | 1.10.0 / 1.11.0 | Llamadas HTTP a servicios externos |
| **File Upload** | multer | 1.4.5-lts.1 / 2.0.2 | Manejo de uploads multipart |
| **Proxy** | http-proxy-middleware | 3.0.5 | Proxy reverso interno |

### 3.3 Frontend Stack

#### 3.3.1 Framework y Core

| Componente | Tecnología | Versión | Propósito |
|------------|------------|---------|-----------|
| **Framework** | React | 18.2.0 | UI library |
| **Build Tool** | Vite | 6.2.0 | Build y dev server ultra-rápido |
| **Estado Global** | Redux Toolkit | 2.6.1 | State management |
| **Routing** | React Router | 7.5.0 | Enrutamiento SPA |
| **HTTP Client** | axios | 1.9.0 | Llamadas API REST (nota: no usa Sentry directamente) |
| **RTK Query** | @reduxjs/toolkit | Incluido | Cache de datos del servidor |

#### 3.3.2 UI y Estilos

| Componente | Tecnología | Versión | Propósito |
|------------|------------|---------|-----------|
| **CSS Framework** | Tailwind CSS | 3.4.17 | Utility-first CSS |
| **Component Library** | Shadcn/UI | Latest | Componentes accesibles |
| **Headless UI** | @headlessui/react | 2.2.1 | Componentes sin estilos |
| **Radix UI** | @radix-ui/* | Latest | Primitivos accesibles |
| **Icons** | Heroicons + Lucide | Latest | Biblioteca de iconos |
| **Forms** | React Hook Form | 7.57.0 | Manejo eficiente de formularios |
| **Validation** | Zod + @hookform/resolvers | Latest | Validación de formularios |

#### 3.3.3 Utilidades Frontend

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| **Date Handling** | date-fns | 4.1.0 | Manipulación de fechas |
| **Toasts** | react-toastify | 11.0.5 | Notificaciones toast |
| **Error Boundary** | react-error-boundary | 6.0.0 | Manejo de errores React |
| **WebSockets** | socket.io-client | 4.8.1 | Comunicación en tiempo real |
| **ZIP Files** | jszip | 3.10.1 | Compresión/descompresión |
| **Class Utils** | clsx + tailwind-merge | Latest | Utilidades CSS |

### 3.4 Base de Datos

#### 3.4.1 PostgreSQL

| Aspecto | Detalle |
|---------|---------|
| **Versión** | PostgreSQL 16 (Alpine en Docker) |
| **Motor ORM** | Prisma 6.12.0 |
| **Schemas** | 3 schemas: `platform` (backend), `documentos` (microservicio), `remitos` (microservicio) |
| **Multi-Tenant** | Por tenant_empresa_id (columna discriminante) |
| **Migraciones** | Prisma Migrate (versionadas en Git) |
| **Backups** | pg_dump diario automatizado (cron) |

#### 3.4.2 Prisma Configuration

**Schema Backend** (`apps/backend/prisma/schema.prisma`):
- **Entidades principales**: Empresa, Service, Instance, User, EndUser, Permiso, AuditLog
- **Enums**: Role, ServiceEstado, InstanceEstado, PeriodoReseteo, PaymentTipo, PaymentStatus
- **Relaciones**: Multi-tenant por empresa, RBAC granular
- **Índices**: Optimizados para consultas frecuentes

**Schema Documentos** (`apps/documentos/src/prisma/schema.prisma`):
- **Entidades principales**: DocumentTemplate, Document, Chofer, Camion, Acoplado, DadorCarga, Cliente, EmpresaTransportista, Equipo, DocumentClassification, EntityExtractedData, NotificationLog, SystemConfig
- **Enums**: EntityType (DADOR, EMPRESA_TRANSPORTISTA, CHOFER, CAMION, ACOPLADO), DocumentStatus, NotificationType, NotificationAudience, EquipoEstado
- **Features**: Clasificación IA, validación automática, extracción de datos, equipos (chofer+camión+acoplado), notificaciones, auditoría
- **Nota**: Los modelos Driver, Truck, Trailer fueron renombrados a Chofer, Camion, Acoplado (nomenclatura en español)

**Schema Remitos** (`apps/remitos/src/prisma/schema.prisma`):
- **Entidades principales**: Remito, RemitoImagen, RemitoHistory, RemitoSystemConfig
- **Enums**: RemitoEstado (PENDIENTE_ANALISIS, EN_ANALISIS, PENDIENTE_APROBACION, APROBADO, RECHAZADO, ERROR_ANALISIS), TipoImagen, RemitoAction
- **Features**: Análisis OCR/IA de remitos, gestión de imágenes, vinculación con equipos del schema documentos, auditoría de cambios
- **Integración**: Usa IDs de entidades del schema documentos (equipoId, choferId, camionId, acopladoId, empresaTransportistaId)

### 3.5 Cache y Colas

#### 3.5.1 Redis

| Aspecto | Detalle |
|---------|---------|
| **Versión** | Redis 7 (Alpine) |
| **Uso Principal** | Cache, sesiones, colas de trabajo |
| **Persistencia** | AOF (Append-Only File) habilitada |
| **Política** | allkeys-lru con maxmemory 512MB |
| **Cliente Node.js** | ioredis 5.6.1 |

#### 3.5.2 BullMQ

| Aspecto | Detalle |
|---------|---------|
| **Versión** | BullMQ 5.56.4 |
| **Uso** | Procesamiento asíncrono de trabajos |
| **Backend Redis** | Redis 7 |
| **Casos de Uso** | Validación de documentos, procesamiento OCR, notificaciones |

### 3.6 Storage

#### 3.6.1 MinIO (S3-Compatible)

| Aspecto | Detalle |
|---------|---------|
| **Versión** | minio/minio:latest |
| **Puerto API** | 9000 (S3 compatible) |
| **Puerto Console** | 9001 (UI web) |
| **Cliente Node.js** | minio 8.0.1 |
| **Buckets** | Prefijos por tenant: `bca-dev-`, `documentos-empresa-`, etc. |
| **Seguridad** | Pre-signed URLs con expiración |
| **Uso** | Documentos, imágenes, archivos subidos por usuarios |

**Configuración**:
- URL interna: `http://minio:9000` (entre contenedores)
- URL pública: Expuesta vía Nginx con SSL

### 3.7 Inteligencia Artificial

#### 3.7.1 Flowise AI

| Aspecto | Detalle |
|---------|---------|
| **Versión** | flowiseai/flowise:latest |
| **Puerto** | 3000 (dev) / 3005 (prod) |
| **Base de Datos** | PostgreSQL (schema: flowise) |
| **Uso Principal** | Clasificación automática de documentos, validación IA |
| **Integración** | API REST desde microservicio Documentos |
| **LLM Backend** | Configurable (OpenAI, Anthropic, local models) |

**Endpoints Principales**:
- `/api/v1/prediction/{flowId}` - Predicción/clasificación
- `/api/v1/ping` - Health check
- UI: Puerto console (autenticada)

**Casos de Uso**:
1. **Clasificación Documental**: Identificar tipo de documento subido (DNI, licencia, seguro, etc.)
2. **Validación de Datos**: Extraer campos estructurados de imágenes
3. **OCR Inteligente**: Análisis de remitos y facturas
4. **Confianza Score**: Scoring de precisión de clasificación

---

## 4. APLICACIONES Y MICROSERVICIOS

### 4.1 Backend Principal (`apps/backend`)

**Responsabilidades**:
- Autenticación y autorización (JWT RS256)
- Gestión de empresas, usuarios y roles
- Sistema de permisos (RBAC) granular
- Instancias de servicios
- Auditoría de acciones
- Gateway API (enrutamiento a microservicios)

**Tecnologías Core**:
- Express.js 4.18.2
- Prisma 6.12.0 (schema: platform)
- PostgreSQL 16
- Redis (cache + sesiones)
- JWT RS256 (claves asimétricas)

**Estructura**:
```
apps/backend/
├── src/
│   ├── config/          # Configuración (DB, Redis, JWT)
│   ├── controllers/     # Controladores Express
│   ├── middlewares/     # Auth, validación, rate-limit, error handling
│   ├── routes/          # Definición de rutas API
│   ├── services/        # Lógica de negocio
│   ├── utils/           # Utilidades (logger, helpers)
│   ├── seed/            # Seeds iniciales de BD
│   ├── scripts/         # Scripts de setup y migración
│   └── server.ts        # Entry point
├── prisma/
│   ├── schema.prisma    # Schema principal (platform)
│   └── migrations/      # Migraciones versionadas
└── package.json
```

**API Key Endpoints** (ejemplos):
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro
- `GET /api/users` - Listar usuarios
- `GET /api/empresas` - Listar empresas
- `GET /api/instances` - Instancias de servicios
- `GET /api/permisos` - Sistema de permisos
- `GET /api/health` - Health check

**Puerto**: `4800` (configurable: `BACKEND_PORT`)

**Logging**: Winston con rotación diaria (`logs/backend.*.log`)

### 4.2 Frontend SPA (`apps/frontend`)

**Responsabilidades**:
- Interfaz de usuario completa (SPA)
- Gestión de estado global (Redux Toolkit)
- Autenticación (JWT en localStorage/httpOnly cookie)
- Portales por rol:
  - Admin Interno (superadmin, gestión de empresas)
  - Admin Dador (clientes, documentos requeridos)
  - Transportista (chofer, documentos, camiones)
  - Cliente/Dador de Carga (visualización de flota)
- Upload de archivos
- WebSockets para notificaciones en tiempo real

**Tecnologías Core**:
- React 18.2.0 (función components + hooks)
- Vite 6.2.0 (build ultra-rápido)
- Redux Toolkit 2.6.1 (estado global)
- React Router 7.5.0 (routing)
- Tailwind CSS 3.4.17 (estilos)
- Shadcn/UI (componentes)

**Estructura**:
```
apps/frontend/
├── src/
│   ├── components/      # Componentes reutilizables
│   │   ├── ui/          # Shadcn/UI components
│   │   ├── layout/      # Layout components
│   │   └── shared/      # Shared components
│   ├── features/        # Features por dominio
│   │   ├── auth/        # Autenticación
│   │   ├── usuarios/    # Gestión de usuarios
│   │   ├── empresas/    # Gestión de empresas
│   │   ├── documentos/  # Gestión documental
│   │   └── permisos/    # Permisos
│   ├── pages/           # Páginas (routing)
│   ├── store/           # Redux store (slices)
│   ├── hooks/           # Custom hooks
│   ├── utils/           # Utilidades
│   ├── api/             # Axios clients
│   ├── types/           # TypeScript types
│   ├── App.tsx          # Root component
│   └── main.tsx         # Entry point
├── public/              # Assets estáticos
├── index.html           # HTML template
├── vite.config.ts       # Vite config
├── tailwind.config.js   # Tailwind config
└── package.json
```

**Key Features**:
- ✅ Autenticación JWT con refresh
- ✅ Routing protegido por roles
- ✅ Estado persistente (Redux + localStorage)
- ✅ Forms con validación (React Hook Form + Zod)
- ✅ Upload de archivos con preview
- ✅ Dark mode (configurable)
- ✅ Responsive design (mobile-first)
- ✅ Error boundaries para estabilidad
- ✅ Toasts para feedback

**Puerto**: `8550` (configurable: `FRONTEND_PORT`)

**Build Output**: `dist/` (archivos estáticos para servir con Nginx)

### 4.3 Microservicio Documentos (`apps/documentos`)

**Responsabilidades**:
- Gestión documental para transportistas
- Upload y almacenamiento en MinIO
- Clasificación automática con Flowise IA
- Validación de documentos (vencimientos, campos)
- Notificaciones de expiración
- WebSockets para actualizaciones en tiempo real
- Templates de documentos requeridos por cliente
- Auditoría de acciones documentales

**Tecnologías Core**:
- Express 5.1.0
- Prisma 6.12.0 (schema: documentos)
- MinIO 8.0.1 (S3 client)
- BullMQ 5.56.4 (colas asíncronas)
- Socket.io 4.8.1 (WebSockets)
- Sharp 0.33.5 (procesamiento de imágenes)
- PDF-Lib 1.17.1 (manipulación de PDFs)
- Axios 1.11.0 (integración con Flowise)
- ClamScan 2.1.3 (escaneo antivirus)
- ExcelJS 4.4.0 (generación de Excel)
- Archiver 6.0.1 (compresión ZIP)
- Multer 1.4.5-lts.1 (upload de archivos)
- Node-cron 4.2.1 (tareas programadas)
- Winston 3.16.0 (logging)
- Zod 3.24.1 (validación de schemas)

**Estructura**:
```
apps/documentos/
├── src/
│   ├── controllers/     # Controladores
│   ├── routes/          # Rutas API
│   ├── services/        # Lógica de negocio
│   │   ├── document-validation.service.ts
│   │   ├── flowise.service.ts
│   │   ├── minio.service.ts
│   │   ├── notification.service.ts
│   │   └── websocket.service.ts
│   ├── jobs/            # BullMQ jobs
│   ├── middlewares/     # Auth, validación
│   ├── utils/           # Utilidades
│   ├── prisma/
│   │   ├── schema.prisma    # Schema documentos
│   │   └── migrations/
│   └── index.ts         # Entry point
├── uploads/             # Temporal uploads (luego a MinIO)
├── openapi.yaml         # Documentación OpenAPI
└── package.json
```

**API Key Endpoints** (parcial - ver openapi.yaml para lista completa):
- Templates: `/api/docs/templates` (GET lista, POST crear, PUT actualizar, DELETE eliminar)
- Config: `/api/docs/config` (GET, PUT)
- Flowise Config: `/api/docs/flowise` (GET status, POST test, PUT configurar)
- Evolution Config: `/api/docs/evolution` (GET status, PUT configurar)
- Documents: `/api/docs/documents` (upload, list, approve, reject, archive, download)
- Dashboard: `/api/docs/dashboard` (estadísticas, compliance, vencimientos)
- Maestros: `/api/docs/maestros` (choferes, camiones, acoplados - CRUD)
- Dadores: `/api/docs/dadores` (dadores de carga - CRUD)
- Empresas Transportistas: `/api/docs/empresas-transportistas` (CRUD)
- Equipos: `/api/docs/equipos` (crear, listar, vincular con clientes, historial)
- Clientes: `/api/docs/clients` (CRUD, requisitos documentales)
- Portal Transportista: `/api/docs/portal-transportista` (vista simplificada para transportistas)
- Portal Cliente: `/api/docs/portal-cliente` (validación de equipos, cumplimiento)
- Search: `/api/docs/search` (búsqueda global)
- Storage: `/api/docs/storage` (presigned URLs, download)
- Notifications: `/api/docs/notifications` (enviar, listar, marcar leídas)
- Batch: `/api/docs/batch` (operaciones batch de documentos)
- Approval: `/api/docs/approval` (aprobación/rechazo de documentos)
- Compliance: `/api/docs/compliance` (compliance por equipo)
- Entity Data: `/api/docs/entities` (datos extraídos por IA de entidades)
- Audit: `/api/docs/audit` (logs de auditoría)
- Health: `/health` (básico), `/health/detailed` (completo)
- Metrics: `/metrics` (métricas Prometheus-compatible)
- WebSocket: `/` (conexión Socket.io para updates en tiempo real)

**Puerto**: `4802` (configurable: `DOCUMENTOS_PORT`)

**Logging**: Winston con rotación diaria (`logs/documentos.*.log`)

**Features Especiales**:
- ✅ Clasificación automática con Flowise (confianza score + validación)
- ✅ Validación de campos extraídos por IA con detección de disparidades
- ✅ Extracción consolidada de datos por entidad (EntityExtractedData)
- ✅ Gestión de equipos (chofer + camión + acoplado)
- ✅ Requisitos documentales por cliente
- ✅ Portales específicos para transportistas y clientes
- ✅ Conversión de imágenes (Sharp)
- ✅ Generación de PDFs (PDF-Lib)
- ✅ Generación de reportes Excel (ExcelJS)
- ✅ Compresión de documentos en ZIP (Archiver)
- ✅ Escaneo antivirus de archivos subidos (ClamScan)
- ✅ Notificaciones automáticas de vencimiento (BullMQ scheduled + node-cron)
- ✅ WebSockets para updates en tiempo real
- ✅ Multi-tenant seguro (tenant_empresa_id + dador_carga_id)
- ✅ Auditoría completa de operaciones (AuditLog + EquipoAuditLog)

### 4.4 Microservicio Remitos (`apps/remitos`)

**Estado**: En desarrollo activo

**Responsabilidades**:
- Gestión de remitos de transporte con análisis OCR/IA
- Integración con Flowise para extracción de datos de remitos
- Carga de imágenes múltiples por remito (principal, reverso, ticket destino, adicionales)
- Vinculación automática con equipos del sistema documentos
- Validación y aprobación por ADMIN_INTERNO
- Storage en MinIO con procesamiento de imágenes
- Historial completo de cambios

**Tecnologías Core**:
- Express 5.1.0
- Prisma 6.12.0 (schema: remitos)
- MinIO 8.0.1 (S3 client)
- BullMQ 5.56.4 (colas asíncronas para análisis IA)
- Sharp 0.33.5 (procesamiento de imágenes)
- PDF-Lib 1.17.1 (manipulación de PDFs)
- Axios 1.11.0 (integración con Flowise)
- Multer 1.4.5-lts.1 (upload de archivos)
- Winston 3.16.0 (logging estructurado)
- Zod 3.24.1 (validación de schemas)

**Schema de Base de Datos** (`apps/remitos/src/prisma/schema.prisma`):

**Modelos**:
1. **Remito**
   - Datos extraídos por IA: numeroRemito, fechaOperacion, emisorNombre, clienteNombre, producto
   - Transportista y chofer: transportistaNombre, choferNombre, choferDni
   - Patentes: patenteChasis, patenteAcoplado
   - Pesos origen: pesoOrigenBruto, pesoOrigenTara, pesoOrigenNeto
   - Pesos destino (opcionales): pesoDestinoBruto, pesoDestinoTara, pesoDestinoNeto, tieneTicketDestino
   - Vinculación: equipoId, choferId, camionId, acopladoId, empresaTransportistaId (IDs del schema documentos)
   - Multi-tenant: dadorCargaId, tenantEmpresaId
   - Chofer cargador: choferCargadorDni, choferCargadorNombre, choferCargadorApellido
   - Flujo: estado (RemitoEstado), cargadoPorUserId, cargadoPorRol
   - Aprobación: aprobadoPorUserId, aprobadoAt, rechazadoPorUserId, rechazadoAt, motivoRechazo
   - Análisis IA: datosOriginalesIA (JSON), confianzaIA, camposDetectados (array), erroresAnalisis (array), analizadoAt

2. **RemitoImagen**
   - MinIO: bucketName, objectKey, fileName, mimeType, size
   - Tipo: tipo (REMITO_PRINCIPAL, REMITO_REVERSO, TICKET_DESTINO, ADICIONAL), orden
   - procesadoPorIA, createdAt

3. **RemitoHistory**
   - Auditoría: action (RemitoAction), userId, userRole, payload (JSON), createdAt

4. **RemitoSystemConfig**
   - Configuración: key (unique), value, encrypted, description, updatedBy, updatedAt

**Enums**:
- `RemitoEstado`: PENDIENTE_ANALISIS, EN_ANALISIS, PENDIENTE_APROBACION, APROBADO, RECHAZADO, ERROR_ANALISIS
- `TipoImagen`: REMITO_PRINCIPAL, REMITO_REVERSO, TICKET_DESTINO, ADICIONAL
- `RemitoAction`: CREADO, IMAGEN_AGREGADA, ANALISIS_INICIADO, ANALISIS_COMPLETADO, ANALISIS_FALLIDO, DATOS_EDITADOS, EQUIPO_VINCULADO, APROBADO, RECHAZADO, REPROCESAR_SOLICITADO

**Puerto**: `4803` (configurable: `REMITOS_PORT`)

**Logging**: Winston con rotación diaria (`logs/remitos.*.log`)

**Features Especiales**:
- ✅ Análisis OCR/IA con Flowise (extracción de datos estructurados de imágenes)
- ✅ Soporte para múltiples imágenes por remito con tipos específicos
- ✅ Vinculación automática con equipos del schema documentos
- ✅ Procesamiento de imágenes con Sharp
- ✅ Auditoría completa de cambios (RemitoHistory)
- ✅ Flujo de aprobación (CHOFER → ADMIN_INTERNO → APROBADO)
- ✅ Multi-tenant seguro (tenant_empresa_id + dador_carga_id)
- ✅ Storage en MinIO con bucket por tenant

**Tecnologías Core**:
- Express 5.1.0
- Prisma 6.12.0 (schema: remitos)
- MinIO 8.0.1
- BullMQ 5.56.4
- PDF-Lib, Sharp
- Axios (Flowise)

**Puerto**: `4803` (estimado)

**Estructura**: Similar a Documentos

---

## 5. INFRAESTRUCTURA Y SERVICIOS AUXILIARES

### 5.1 Nginx (Reverse Proxy)

**Versión**: nginx:alpine

**Responsabilidades**:
- Reverse proxy para todas las aplicaciones
- Terminación SSL/TLS (HTTPS)
- Load balancing (en Docker Swarm con múltiples réplicas)
- Compresión gzip
- Caching de assets estáticos
- Rate limiting a nivel de red
- Security headers (HSTS, CSP, etc.)

**Configuración** (`nginx/nginx.conf`):
```nginx
# Ejemplo simplificado
upstream frontend {
  server frontend:8550;
}

upstream backend {
  server backend:4800;
}

upstream documentos {
  server documentos:4802;
}

server {
  listen 80;
  server_name app.microsyst.com.ar;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name app.microsyst.com.ar;
  
  ssl_certificate /etc/nginx/ssl/cert.pem;
  ssl_certificate_key /etc/nginx/ssl/key.pem;
  
  location / {
    proxy_pass http://frontend;
  }
  
  location /api/ {
    proxy_pass http://backend;
  }
  
  location /api/docs/ {
    proxy_pass http://documentos;
  }
}
```

**Puertos**:
- `80` (HTTP → redirect a HTTPS)
- `443` (HTTPS)

### 5.2 SonarQube (Code Quality)

**Versión**: SonarQube Community 10+

**Responsabilidades**:
- Análisis estático de código
- Detección de bugs, code smells, vulnerabilidades
- Cobertura de tests
- Duplicaciones
- Deuda técnica
- Quality gates (bloqueantes en CI/CD)

**Configuración**:
- Servidor: `http://10.3.0.244:9900` (interno)
- Project: `monorepo-bca`
- Config: `sonar-project.properties`

**Integración CI/CD**:
- GitHub Actions ejecuta scan en cada PR y push a main
- Quality Gate status visible en GitHub PR checks
- Configurado para no bloquear merge (actualmente)

**Métricas Clave**:
- Coverage > 80%
- 0 Vulnerabilidades críticas
- 0 Bugs bloqueantes
- Deuda técnica < 5 días

### 5.3 Sentry (Error Tracking)

**Responsabilidades**:
- Tracking de errores en producción
- Performance monitoring (APM)
- Release tracking
- Alertas en tiempo real
- Stack traces enriquecidos
- User context y breadcrumbs

**Integración**:
- Backend: `@sentry/node`
- Frontend: `@sentry/react`
- DSN configurado en `.env` (SENTRY_DSN)

**Configuración**:
- Entorno: desarrollo/staging/producción
- Release: Version tag de Git
- Sampling: 100% errores, 10% transacciones

### 5.4 Uptime Kuma (Health Monitoring)

**Responsabilidades**:
- Monitoreo de disponibilidad de servicios
- Health checks periódicos (HTTP ping)
- Alertas por Slack/Email si servicio cae
- Dashboard de uptime
- Histórico de incidentes

**Endpoints Monitoreados**:
- `https://api.microsyst.com.ar/health`
- `https://api.microsyst.com.ar/api/docs/health`
- `https://app.microsyst.com.ar`

**Frecuencia**: Cada 60 segundos

### 5.5 Adminer (Database UI)

**Versión**: adminer:4

**Responsabilidades**:
- UI web para gestión de PostgreSQL
- Alternativa ligera a pgAdmin
- Queries SQL interactivas
- Visualización de schemas y datos

**Puerto**: `8080`

**Acceso**: Solo en desarrollo (no en producción)

### 5.6 MailHog (Email Testing)

**Versión**: mailhog/mailhog:v1.0.1

**Responsabilidades**:
- SMTP server falso para desarrollo
- Captura todos los emails enviados
- UI para revisar emails
- No envía emails reales

**Puertos**:
- `1025` (SMTP)
- `8025` (UI web)

**Uso**: Solo en desarrollo

### 5.7 GitHub Actions (CI/CD)

**Responsabilidades**:
- Integración continua (lint, test, build)
- Análisis de código con SonarQube
- Deploy automático a DEV (push a main)
- Deploy manual a Staging y Producción

**Workflows**:
1. `monorepo-ci.yml` - CI completo en PRs
2. `deploy-dev.yml` - Deploy automático a DEV
3. `deploy-staging.yml` - Deploy manual a Staging
4. `deploy-prod.yml` - Deploy manual a Prod

**Secrets**:
- `SONAR_TOKEN` - Token SonarQube
- `SONAR_HOST_URL` - URL SonarQube
- `DEPLOY_SSH_KEY` - Clave SSH para deploys
- `SENTRY_DSN` - DSN de Sentry

---

## 6. BASE DE DATOS Y PERSISTENCIA

### 6.1 PostgreSQL - Configuración

**Versión**: PostgreSQL 16 (Alpine)

**Arquitectura Multi-Schema**:
- `platform` - Backend principal (empresas, usuarios, instancias, permisos)
- `documentos` - Microservicio documental
- `remitos` - Microservicio remitos (futuro)
- `flowise` - Metadata de Flowise AI

**Conexión**:
```bash
# Backend
DATABASE_URL=postgresql://user:pass@host:5432/monorepo-bca?schema=platform

# Documentos
DOCUMENTOS_DATABASE_URL=postgresql://user:pass@host:5432/monorepo-bca?schema=documentos
```

**Optimizaciones**:
```sql
# postgresql.conf (ejemplo)
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 8MB
maintenance_work_mem = 128MB
```

### 6.2 Prisma - Schema Principal (Backend)

**Ubicación**: `apps/backend/prisma/schema.prisma`

**Modelos Principales**:

1. **Empresa** (Tenants)
   - id, nombre, descripción, timestamps
   - Relación 1:N con Users, EndUsers, Instances, Schedules

2. **User** (Usuarios de plataforma - platform_users)
   - id, email, password (bcryptjs), role (ENUM), empresaId, nombre, apellido
   - activo, mustChangePassword, passwordChangedAt
   - Asociaciones por rol: dadorCargaId, empresaTransportistaId, choferId, clienteId
   - creadoPorId (auditoría de creación)
   - JWT subject: `user.id`

3. **EndUser** (Usuarios finales - end_users, legacy para contactos)
   - id, email, password, role (CLIENT|CONTACT), empresaId
   - identifierType (email, whatsapp, telegram, facebook), identifier_value
   - nombre, apellido, direccion, localidad, provincia, pais, contacto
   - is_active, last_access, metadata (JSON)
   - Relación con Permisos

4. **Service** (Catálogo de servicios)
   - id, nombre, descripción, version, estado

5. **Instance** (Instancias de servicios por empresa)
   - id, serviceId, empresaId, estado, configuracion (JSON)
   - requierePermisos (boolean)

6. **Permiso** (Control de acceso granular)
   - id, platformUserId, endUserId, instanciaId
   - esWhitelist, limiteTotal, consumido
   - periodoReseteo (ENUM: DIARIO, SEMANAL, MENSUAL, NUNCA)

7. **AuditLog** (Auditoría de acciones)
   - id, timestamp, instanciaId, accion, detalles (JSON)
   - platformAdminId, endUserId

8. **Schedule** (Eventos/calendario)
   - id, empresaId, tipo, titulo, fechaInicio, fechaFin

**Enums**:
- `UserRole` (platform_users): SUPERADMIN, ADMIN, OPERATOR, OPERADOR_INTERNO, ADMIN_INTERNO, DADOR_DE_CARGA, TRANSPORTISTA, CHOFER, CLIENTE
- `EndUserRole`: CLIENT, CONTACT
- `IdentifierType`: email, whatsapp, telegram, facebook
- `ServiceEstado`: activo, inactivo, mantenimiento
- `InstanceEstado`: activa, inactiva, error
- `PeriodoReseteo`: NUNCA, DIARIO, SEMANAL, MENSUAL, ANUAL
- `PaymentTipo`: CREDIT, SUBSCRIPTION
- `PaymentStatus`: PENDING, SUCCESS, FAILED, CANCELLED
- `ScheduleTipo`: VIAJE, MANTENIMIENTO, INSPECCION

### 6.3 Prisma - Schema Documentos

**Ubicación**: `apps/documentos/src/prisma/schema.prisma`

**Modelos Principales**:

1. **DocumentTemplate** (Tipos de documentos)
   - id, name, entityType (ENUM), active
   - Ejemplos: "DNI Chofer", "Licencia Conducir", "Seguro Camión"

2. **Document** (Documentos subidos)
   - id, templateId, entityType, entityId
   - dadorCargaId, tenantEmpresaId (multi-tenant)
   - fileName, filePath, fileSize, mimeType
   - status (ENUM), validationData (JSON), expiresAt
   - classificationConfidence, approvedBy, rejectedBy

3. **DocumentClassification** (Resultado de clasificación IA)
   - id, documentId (unique), detectedEntityType, detectedEntityId, detectedExpiration
   - detectedDocumentType, confidence, aiResponse (JSON)
   - reviewedAt, reviewedBy, reviewNotes
   - Validación: documentoEsValido, motivoInvalidez, datosExtraidos, disparidades
   - tieneDisparidades, vencimientoDetectado, vencimientoOrigen, validationStatus

4. **Chofer** (Choferes - renombrado de Driver)
   - id, dadorCargaId, tenantEmpresaId, empresaTransportistaId
   - dni, dniNorm, nombre, apellido, phones (array)
   - activo, createdAt, updatedAt
   - Relaciones: dador, empresaTransportista
   - Tabla: choferes, índice único por (tenantEmpresaId, dadorCargaId, dniNorm)

5. **Camion** (Camiones - renombrado de Truck)
   - id, dadorCargaId, tenantEmpresaId, empresaTransportistaId
   - patente, patenteNorm, marca, modelo
   - activo, createdAt, updatedAt
   - Relaciones: dador, empresaTransportista
   - Tabla: camiones, índice único por (tenantEmpresaId, dadorCargaId, patenteNorm)

6. **Acoplado** (Acoplados/Trailers - renombrado de Trailer)
   - id, dadorCargaId, tenantEmpresaId, empresaTransportistaId
   - patente, patenteNorm, tipo
   - activo, createdAt, updatedAt
   - Relaciones: dador, empresaTransportista
   - Tabla: acoplados, índice único por (tenantEmpresaId, dadorCargaId, patenteNorm)

7. **DadorCarga** (Empresa proveedora de transporte)
   - id, tenantEmpresaId, razonSocial, cuit, phones (array)
   - notifyDriverEnabled, notifyDadorEnabled, activo, notas
   - Relaciones: equipos, choferes, camiones, acoplados, empresasTransportistas
   - Tabla: dadores_carga, índice único por (tenantEmpresaId, cuit)

8. **EmpresaTransportista** (Empresa intermedia bajo DadorCarga)
   - id, dadorCargaId, tenantEmpresaId, razonSocial, cuit
   - activo, notas, createdAt, updatedAt
   - Relaciones: dador, choferes, camiones, acoplados, equipos
   - Tabla: empresas_transportistas, índice único por (tenantEmpresaId, dadorCargaId, cuit)

9. **Cliente** (Cliente destino de documentos)
   - id, tenantEmpresaId, razonSocial, cuit, activo, notas
   - Relaciones: requisitos (ClienteDocumentRequirement), equipos (EquipoCliente)
   - Tabla: clientes, índice único por (tenantEmpresaId, cuit)

10. **ClienteDocumentRequirement** (Requisitos documentales por cliente)
    - id, tenantEmpresaId, clienteId, templateId, entityType
    - obligatorio, diasAnticipacion, visibleChofer
    - Relaciones: cliente, template
    - Tabla: cliente_document_requirement, índice único por (tenantEmpresaId, clienteId, templateId, entityType)

11. **Equipo** (Chofer + Camión + Acoplado asignado)
    - id, driverId, truckId, trailerId (nullable), dadorCargaId, tenantEmpresaId, empresaTransportistaId
    - driverDniNorm, truckPlateNorm, trailerPlateNorm (nullable)
    - validFrom, validTo, estado (activa|finalizada), activo
    - Relaciones: clientes (EquipoCliente), history, auditLogs, dador, empresaTransportista
    - Tabla: equipo, índice único por (tenantEmpresaId, dadorCargaId, driverDniNorm, truckPlateNorm, trailerPlateNorm, validFrom)

12. **EntityExtractedData** (Datos consolidados extraídos por IA)
    - id, tenantEmpresaId, dadorCargaId, entityType, entityId
    - datosExtraidos (JSON), ultimaExtraccionAt, ultimoDocumentoId, confianzaPromedio
    - Campos CHOFER: cuil, fechaNacimiento, nacionalidad, numeroLicencia, clasesLicencia, vencimientoLicencia
    - Campos CAMION/ACOPLADO: anioFabricacion, numeroMotor, numeroChasis, titular, titularDni
    - Campos EMPRESA_TRANSPORTISTA: condicionIva, domicilioFiscal, actividadPrincipal, cantidadEmpleados, artNombre, artPoliza
    - Tabla: entity_extracted_data, índice único por (tenantEmpresaId, entityType, entityId)

13. **EntityExtractionLog** (Log de extracciones de datos)
    - id, tenantEmpresaId, entityType, entityId, documentId, templateName
    - datosExtraidos (JSON), disparidades (JSON), esValido, confianza
    - solicitadoPor, esRechequeo, createdAt
    - Tabla: entity_extraction_log

14. **NotificationLog** (Log de notificaciones enviadas)
    - id, tenantEmpresaId, dadorCargaId, documentId, equipoId
    - type (aviso|alerta|alarma|faltante), audience (CHOFER|DADOR)
    - target, templateKey, payload (JSON), status, error
    - sentAt
    - Tabla: notification_log

15. **SystemConfig** (Configuración del sistema)
    - id, key (unique), value, encrypted, createdAt, updatedAt
    - Tabla: system_config

6. **Trailer** (Acoplados)
   - Similar a Truck

7. **Notification** (Notificaciones)
   - id, tipo (ENUM), audiencia (ENUM), entityType, entityId
   - mensaje, leido, fechaEnvio

**Enums**:
- `EntityType`: DADOR, EMPRESA_TRANSPORTISTA, CHOFER, CAMION, ACOPLADO
- `DocumentStatus`: PENDIENTE, VALIDANDO, CLASIFICANDO, PENDIENTE_APROBACION, APROBADO, RECHAZADO, VENCIDO, DEPRECADO
- `NotificationType`: aviso, alerta, alarma, faltante
- `NotificationAudience`: CHOFER, DADOR

### 6.4 Migraciones

**Gestión**: Prisma Migrate

**Comandos**:
```bash
# Backend
npm run prisma:migrate       # Crear y aplicar migración
npm run prisma:migrate:deploy # Aplicar migraciones en prod (no interactivo)
npm run prisma:generate      # Generar cliente Prisma

# Documentos
npm run prisma:migrate:docs
npm run prisma:generate:docs
```

**Versionamiento**: Todas las migraciones versionadas en Git

**Estrategia**:
- DEV: `prisma migrate dev` (interactivo)
- Staging/Prod: `prisma migrate deploy` (no interactivo, idempotente)

### 6.5 Backups

**Estrategia**:
- **Frecuencia**: Diario (cron 2:00 AM)
- **Herramienta**: `pg_dump`
- **Retención**: 30 días backups diarios, 12 meses backups mensuales
- **Almacenamiento**: Servidor local + S3 (futuro)

**Script**: `scripts/backup.sh`

**Restauración**: `scripts/restore.sh`

**Testing**: Restore mensual en ambiente de testing

---

## 7. SEGURIDAD Y AUTENTICACIÓN

### 7.1 JWT RS256

**Algoritmo**: RS256 (RSA con SHA-256)

**Claves**:
- Clave privada: Firmado de tokens (solo backend)
- Clave pública: Verificación (backend + microservicios)

**Generación de Claves**:
```bash
# Generar par de claves
openssl genrsa -out jwt-private.pem 2048
openssl rsa -in jwt-private.pem -outform PEM -pubout -out jwt-public.pem
```

**Ubicación**:
- Desarrollo: `keys/jwt-dev-*.pem`
- Staging: `keys/jwt-staging-*.pem`
- Producción: `keys/jwt-prod-*.pem` (NO versionadas)

**Payload**:
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "ADMIN",
  "empresaId": 1,
  "iat": 1234567890,
  "exp": 1234571490
}
```

**Expiración**:
- Access Token: 15 minutos
- Refresh Token: 7 días

**Flujo**:
1. Login → Backend verifica credenciales → Genera Access + Refresh Token
2. Cliente almacena tokens (localStorage o httpOnly cookie)
3. Cada request incluye Access Token en header `Authorization: Bearer <token>`
4. Backend verifica token con clave pública
5. Si Access Token expira, usar Refresh Token para obtener nuevo par

### 7.2 Hashing de Contraseñas

**Librería**: bcryptjs 3.0.2 (usado en auth.service.ts)

**Configuración**:
- Salt rounds: 12
- Comparación async

**Ejemplo**:
```typescript
import bcrypt from 'bcrypt';

const hashedPassword = await bcrypt.hash(plainPassword, 12);
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

### 7.3 Validación de Input

**Librería**: Zod 3.21.4+

**Estrategia**:
- Validación en todas las fronteras (API endpoints, forms)
- Schemas reutilizables
- Mensajes de error claros

**Ejemplo**:
```typescript
import { z } from 'zod';

const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['SUPERADMIN', 'ADMIN', 'OPERATOR', 'DADOR_DE_CARGA', 'TRANSPORTISTA', 'CHOFER', 'CLIENTE']),
});

// En endpoint
app.post('/api/users', (req, res) => {
  const result = UserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors });
  }
  // ...
});
```

### 7.4 CORS

**Librería**: cors 2.8.5

**Configuración**:
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URLS.split(','), // http://localhost:8550
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

**Política**:
- ❌ Nunca `origin: '*'` en staging/producción
- ✅ Lista explícita de dominios permitidos
- ✅ Credentials habilitado para cookies

### 7.5 Rate Limiting

**Librería**: express-rate-limit 7.5.0+

**Configuración**:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // 200 requests por ventana
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
```

**Excepciones**:
- Health checks sin rate limit
- Endpoints de upload con límite más bajo (50/15min)

### 7.6 Security Headers

**Nginx Configuration**:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 7.7 Secretos y Variables Sensibles

**Gestión**:
- ❌ NUNCA hardcodear en código
- ✅ Variables de entorno (`.env` local, no versionado)
- ✅ GitHub Secrets para CI/CD
- ✅ 1Password o Bitwarden para equipo

**Secretos Críticos**:
- `DATABASE_URL` (credenciales BD)
- `JWT_PRIVATE_KEY_PATH` (clave privada JWT)
- `MINIO_SECRET_KEY` (MinIO root password)
- `FLOWISE_SECRET_KEY` (Flowise encryption key)
- `SENTRY_DSN` (Sentry project DSN)

---

## 8. CI/CD Y DEVOPS

### 8.1 Pipeline de CI (Integración Continua)

**Herramienta**: GitHub Actions

**Archivo**: `.github/workflows/monorepo-ci.yml`

**Trigger**:
- Pull Requests a `main`
- Push a `main`

**Pasos**:
1. **Checkout** código con history completo (para SonarQube)
2. **Setup Node.js** 20 con cache npm
3. **Install dependencies** con `npm ci` (clean install)
4. **Lint** con ESLint v9 (flat config)
5. **Typecheck** con TypeScript (strict mode)
6. **Test** con Jest + coverage
7. **Build** todos los workspaces (Turborepo)
8. **SonarQube Scan** (análisis estático)
9. **Quality Gate** check (SonarQube)

**Resultado**:
- ✅ Green check si todo pasa
- ❌ Red X si alguna validación falla
- 🟡 Quality Gate en warning (no bloqueante actualmente)

**Tiempo Promedio**: 5-8 minutos

### 8.2 Pipeline de CD (Despliegue Continuo)

#### 8.2.1 Deploy a DEV (Automático)

**Trigger**: Push a `main` después de merge de PR

**Pasos**:
1. SSH al servidor DEV
2. `git pull origin main`
3. `npm ci`
4. `npx prisma migrate deploy` (ambos schemas)
5. `npm run build`
6. Restart servicios (Docker Compose o PM2)
7. Health checks

**Tiempo**: 3-5 minutos

#### 8.2.2 Deploy a Staging (Manual)

**Trigger**: Manual desde GitHub Actions UI

**Día/Hora**: Miércoles 11:00 AM

**Pasos**:
1. SSH al servidor Staging
2. Backup de BD
3. `git pull origin main`
4. `npm ci`
5. `npx prisma migrate deploy`
6. `npm run build`
7. Deploy Docker Swarm (`docker stack deploy`)
8. Health checks
9. Validación QA (smoke tests + E2E críticos)

**Validación Post-Deploy**:
- ✅ Health checks pasan
- ✅ Sentry 0 errores en 30 minutos
- ✅ 3-5 tests E2E críticos pasan

**Rollback**: Si falla validación, rollback inmediato a versión anterior

#### 8.2.3 Deploy a Producción (Manual + Aprobación)

**Trigger**: Manual desde GitHub Actions UI + Aprobación de Lead

**Día/Hora**: Jueves 11:00 AM (solo si Staging OK)

**Requisitos**:
- ✅ Staging OK por 24 horas sin errores críticos
- ✅ Aprobación explícita de Founder/Lead
- ✅ Backup reciente de BD (< 4 horas)

**Pasos**:
1. Notificación en Slack #deploys
2. SSH al servidor Producción
3. Backup de BD (doble verificación)
4. `git pull origin main`
5. `npm ci`
6. `npx prisma migrate deploy`
7. `npm run build`
8. Deploy Docker Swarm con rolling update
9. Health checks
10. Monitoreo intensivo por 1 hora

**Rollback Plan**:
- Revertir stack a imagen anterior
- Restore de BD si hubo cambios de schema
- Tiempo estimado de rollback: 5-10 minutos

### 8.3 Docker y Contenedores

#### 8.3.1 Desarrollo Local

**Archivo**: `docker-compose.dev.yml`

**Servicios**:
- PostgreSQL 16
- Redis 7
- MinIO
- Flowise AI (opcional)
- Adminer (opcional)
- MailHog (opcional)

**Comandos**:
```bash
npm run compose:dev:infra:up    # Levantar infraestructura
npm run compose:dev:infra:down  # Detener y limpiar
npm run compose:dev:infra:logs  # Ver logs
```

**Nota**: Apps (backend, frontend, documentos) corren con `npm run dev` en host (no Docker)

#### 8.3.2 Staging y Producción

**Archivo**: `docker-compose.{staging|prod}.yml`

**Orquestación**: Docker Swarm

**Servicios**:
- nginx (reverse proxy)
- frontend (2 réplicas)
- backend (2 réplicas)
- documentos (2 réplicas)
- remitos (1 réplica, futuro)
- PostgreSQL (1 réplica, manager node)
- Redis (1 réplica)
- MinIO (1 réplica)
- Flowise AI (1 réplica, opcional)

**Redes**:
- `frontend`: Nginx ↔ Apps
- `backend`: Apps ↔ Infra (BD, Redis, MinIO)

**Volúmenes**:
- `pg_data`: PostgreSQL data
- `redis_data`: Redis persistence
- `minio_data`: MinIO buckets
- `flowise_data`: Flowise flows
- `nginx_logs`: Nginx logs

**Healthchecks**:
Todos los servicios tienen healthchecks configurados para:
- Detección automática de fallos
- Restart automático si unhealthy
- Load balancing solo a instancias healthy

**Recursos**:
```yaml
# Ejemplo backend
deploy:
  replicas: 2
  resources:
    limits:
      memory: 1G
      cpus: '1.0'
    reservations:
      memory: 512M
      cpus: '0.5'
```

**Comandos**:
```bash
# Staging
docker stack deploy -c docker-compose.staging.yml monorepo-bca

# Producción
docker stack deploy -c docker-compose.prod.yml monorepo-bca

# Ver servicios
docker service ls

# Logs de un servicio
docker service logs -f monorepo-bca_backend

# Escalar servicio
docker service scale monorepo-bca_backend=3
```

### 8.4 Scripts de Automatización

**Ubicación**: `scripts/`

| Script | Propósito | Uso |
|--------|-----------|-----|
| `deploy-prod.sh` | Deploy a producción | Llamado desde GitHub Actions o manual |
| `deploy-hybrid.sh` | Deploy modo híbrido (PM2 + Docker) | Desarrollo avanzado |
| `health-check-all.sh` | Verificar health de todos los servicios | Monitoreo manual |
| `monitor-resources.sh` | CPU, RAM, Disco de servicios | Diagnóstico de rendimiento |
| `cleanup-docker.sh` | Limpiar imágenes, contenedores, volúmenes no usados | Mantenimiento |
| `backup.sh` | Backup de PostgreSQL | Cron diario |
| `restore.sh` | Restore de backup | Recuperación de desastres |
| `daily-report.sh` | Reporte diario del sistema | Cron diario, envía a Slack |
| `test-proxy-routes.sh` | Test de rutas del proxy | Validación post-deploy |

---

## 9. AMBIENTES Y DESPLIEGUE

### 9.1 Ambientes Disponibles

| Ambiente | Propósito | Orquestación | Deploy | Datos |
|----------|-----------|--------------|--------|-------|
| **DEV Local** | Desarrollo activo | Scripts locales (`npm run dev`) | Local | Sintéticos |
| **DEV Server** | Integración continua | Docker Compose | Automático (merge a `main`) | Sintéticos |
| **Testing** | Testing de QA | Docker Compose | Manual | Sintéticos |
| **Staging** | Pre-producción | Docker Swarm | Manual (miércoles 11:00) | Anonimizados |
| **Producción** | Usuarios finales | Docker Swarm | Manual (jueves 11:00) | Reales |

### 9.2 Configuración por Ambiente

#### DEV Local
```bash
# Variables clave (.env)
NODE_ENV=development
DATABASE_URL=postgresql://evo:phoenix@localhost:5432/monorepo-bca?schema=platform
DOCUMENTOS_DATABASE_URL=postgresql://evo:phoenix@localhost:5432/monorepo-bca?schema=documentos
BACKEND_PORT=4800
FRONTEND_PORT=8550
DOCUMENTOS_PORT=4802
VITE_API_URL=http://localhost:4800
FRONTEND_URLS=http://localhost:8550
JWT_PUBLIC_KEY_PATH=./keys/jwt-dev-public.pem
JWT_PRIVATE_KEY_PATH=./keys/jwt-dev-private.pem
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
REDIS_HOST=localhost
REDIS_PORT=6379
LOG_LEVEL=debug
```

#### Staging
```bash
NODE_ENV=staging
DATABASE_URL=postgresql://user:pass@10.3.0.244:5432/monorepo-bca?schema=platform
DOCUMENTOS_DATABASE_URL=postgresql://user:pass@10.3.0.244:5432/monorepo-bca?schema=documentos
BACKEND_PORT=4800
FRONTEND_PORT=8550
DOCUMENTOS_PORT=4802
VITE_API_URL=https://api.staging.microsyst.com.ar
FRONTEND_URLS=https://app.staging.microsyst.com.ar
JWT_PUBLIC_KEY_PATH=/app/keys/jwt_public.pem
JWT_PRIVATE_KEY_PATH=/app/keys/jwt_private.pem
MINIO_ENDPOINT=minio:9000
MINIO_USE_SSL=false
REDIS_URL=redis://redis:6379
LOG_LEVEL=info
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=staging
```

#### Producción
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@postgres:5432/monorepo-bca?schema=platform
DOCUMENTOS_DATABASE_URL=postgresql://user:pass@postgres:5432/monorepo-bca?schema=documentos
BACKEND_PORT=4800
FRONTEND_PORT=8550
DOCUMENTOS_PORT=4802
VITE_API_URL=https://api.microsyst.com.ar
FRONTEND_URLS=https://app.microsyst.com.ar
JWT_PUBLIC_KEY_PATH=/app/keys/jwt_public.pem
JWT_PRIVATE_KEY_PATH=/app/keys/jwt_private.pem
MINIO_ENDPOINT=minio:9000
MINIO_USE_SSL=false
REDIS_URL=redis://redis:6379
LOG_LEVEL=warn
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=production
```

### 9.3 Recursos de Hardware

#### Desarrollo Local (mínimo)
- CPU: 4 cores
- RAM: 8 GB
- Disco: 20 GB SSD

#### Servidor DEV/Testing
- CPU: 4 cores
- RAM: 8 GB
- Disco: 50 GB SSD

#### Servidor Staging
- CPU: 8 cores
- RAM: 16 GB
- Disco: 100 GB SSD

#### Servidor Producción
- CPU: 16 cores
- RAM: 32 GB
- Disco: 500 GB SSD (RAID)
- Backup: NAS externo

---

## 10. OBSERVABILIDAD Y MONITOREO

### 10.1 Logging

**Librería**: Winston 3.16.0+

**Configuración**:
- Formato: JSON estructurado
- Transports: Console + File (rotación diaria)
- Niveles: error, warn, info, debug

**Ejemplo**:
```typescript
import winston from 'winston';
import 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '90d',
    }),
  ],
});
```

**Ubicación Logs**:
- Backend: `apps/backend/logs/`
- Documentos: `apps/documentos/logs/`
- Remitos: `apps/remitos/logs/`

**Rotación**: Diaria, retención 30 días (errors 90 días)

### 10.2 Error Tracking (Sentry)

**Integración**:
```typescript
// Backend
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.npm_package_version,
  tracesSampleRate: 0.1, // 10% de transacciones
});

// Middleware Express
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
// ... rutas ...
app.use(Sentry.Handlers.errorHandler());

// Frontend
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 0.1,
});
```

**Features Usadas**:
- Error tracking automático
- Performance monitoring (APM)
- Release tracking
- User context
- Breadcrumbs
- Source maps (frontend)

### 10.3 Health Checks

**Backend** (`GET /api/health`):
```json
{
  "status": "ok",
  "timestamp": "2026-01-14T10:00:00Z",
  "uptime": 86400,
  "database": "connected",
  "redis": "connected",
  "version": "1.0.0"
}
```

**Documentos** (`GET /api/docs/health`):
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "minio": "connected",
  "flowise": "connected"
}
```

**Frontend** (`GET /health`):
Servido por Nginx, verifica que frontend esté servible.

### 10.4 Métricas (Futuro)

**Plan**: Prometheus + Grafana

**Métricas Clave**:
- Request rate (req/s)
- Response time (p50, p95, p99)
- Error rate (%)
- CPU/RAM por servicio
- BD connections pool
- Redis memory usage
- MinIO storage usage

### 10.5 Uptime Monitoring

**Herramienta**: Uptime Kuma

**Endpoints Monitoreados**:
- `https://api.microsyst.com.ar/health` (60s interval)
- `https://app.microsyst.com.ar` (60s interval)
- `https://api.microsyst.com.ar/api/docs/health` (60s interval)

**Alertas**:
- Slack: #incidents
- Email: devops@microsyst.com.ar

**Dashboard**: Accesible en servidor interno

---

## 11. HERRAMIENTAS DE DESARROLLO

### 11.1 IDEs y Editores

**Principal**: **Cursor AI** (fork de VSCode con IA integrada)

**Extensiones Obligatorias**:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- Prisma
- GitLens

**Configuración VSCode/Cursor** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### 11.2 Control de Versiones

**Git**:
- Versión: ≥ 2.30
- Configuración SSH requerida
- GPG signing recomendado

**GitHub**:
- Repositorio: `https://github.com/sergiobleynat1969/monorepo-bca`
- Branch principal: `main`
- Branch protection: PRs obligatorios, CI verde, 1 aprobación

### 11.3 Cliente de Base de Datos

**Recomendado**: HeidiSQL (Windows) o DBeaver (cross-platform)

**Alternativas**:
- pgAdmin 4
- Adminer (web, incluido en docker-compose.dev.yml)
- Prisma Studio (`npm run prisma:studio`)

### 11.4 Testing de APIs

**Herramientas**:
- **Postman**: Testing manual, colecciones compartidas
- **cURL**: Testing rápido en terminal
- **Playwright**: Tests E2E automatizados

**Colección Postman**: `docs/postman/monorepo-bca.postman_collection.json` (si existe)

### 11.5 Cliente MinIO

**Opciones**:
1. **MinIO Console** (web): `http://localhost:9001`
2. **MinIO Client (mc)**: CLI oficial
3. **Cyberduck**: Cliente S3 visual

### 11.6 Redis Client

**Opciones**:
1. **Redis Insight**: UI oficial de Redis
2. **redis-cli**: CLI incluido en contenedor Redis
3. **Medis**: Cliente macOS

### 11.7 Docker UI

**Opciones**:
1. **Docker Desktop**: UI oficial (Mac/Windows)
2. **Portainer**: UI web para Docker/Swarm (opcional)
3. **Lazydocker**: TUI en terminal

---

## 12. CONFIGURACIÓN Y VARIABLES DE ENTORNO

### 12.1 Estructura de .env

**Ubicación**: Raíz del monorepo (`/home/administrador/monorepo-bca/.env`)

**Plantilla**: `.env.example` (versionado en Git)

**Secciones**:

#### Aplicación
```bash
NODE_ENV=development              # development | staging | production
BACKEND_PORT=4800
FRONTEND_PORT=8550
DOCUMENTOS_PORT=4802
```

#### Base de Datos
```bash
DATABASE_URL=postgresql://evo:phoenix@localhost:5432/monorepo-bca?schema=platform
DOCUMENTOS_DATABASE_URL=postgresql://evo:phoenix@localhost:5432/monorepo-bca?schema=documentos
```

#### Frontend (Vite)
```bash
VITE_API_URL=http://localhost:4800
VITE_DOCUMENTOS_API_URL=http://localhost:4802
VITE_DOCUMENTOS_WS_URL=ws://localhost:4802
```

#### JWT (RS256)
```bash
JWT_PUBLIC_KEY_PATH=./keys/jwt-dev-public.pem
JWT_PRIVATE_KEY_PATH=./keys/jwt-dev-private.pem
```

#### MinIO
```bash
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_PREFIX=bca-dev-
MINIO_PUBLIC_BASE_URL=http://localhost:9000
```

#### Redis
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379
```

#### Flowise AI
```bash
FLOWISE_ENDPOINT=http://localhost:3000/api/v1/extract
FLOWISE_API_KEY=
FLOWISE_FLOW_ID=
FLOWISE_USERNAME=admin
FLOWISE_PASSWORD=admin123
FLOWISE_SECRET_KEY=dev-flowise-secret-2025
```

#### Rate Limiting
```bash
RATE_LIMIT_WINDOW=15    # minutos
RATE_LIMIT_MAX=200      # requests por ventana
```

#### Logging
```bash
LOG_LEVEL=debug         # debug | info | warn | error
```

#### CORS
```bash
FRONTEND_URLS=http://localhost:8550    # comma-separated
```

#### Monitoring
```bash
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=development
```

### 12.2 Variables por Servicio

**Backend** (`apps/backend`):
- Lee: `DATABASE_URL`, `JWT_*`, `REDIS_*`, `BACKEND_PORT`, `FRONTEND_URLS`, `LOG_LEVEL`, `SENTRY_DSN`

**Frontend** (`apps/frontend`):
- Lee: `VITE_API_URL`, `VITE_DOCUMENTOS_API_URL`, `VITE_DOCUMENTOS_WS_URL`, `VITE_SENTRY_DSN`
- Nota: Solo variables con prefijo `VITE_` son expuestas al navegador

**Documentos** (`apps/documentos`):
- Lee: `DOCUMENTOS_DATABASE_URL`, `DOCUMENTOS_PORT`, `JWT_PUBLIC_KEY_PATH`, `MINIO_*`, `REDIS_*`, `FLOWISE_*`, `LOG_LEVEL`

### 12.3 Gestión de Secretos

**Desarrollo Local**:
- Archivo `.env` en raíz (NO versionado)
- Copiar desde `.env.example` y ajustar

**CI/CD (GitHub Actions)**:
- GitHub Secrets:
  - `SONAR_TOKEN`
  - `SONAR_HOST_URL`
  - `DEPLOY_SSH_KEY`
  - `SENTRY_DSN`

**Servidores (Staging/Prod)**:
- Archivo `.env` en servidor (NO en Git)
- 1Password o Bitwarden para compartir entre equipo
- Rotación periódica de secretos críticos

---

## 13. SCRIPTS Y AUTOMATIZACIÓN

### 13.1 Scripts de Desarrollo

**Ubicación**: `scripts/`

| Script | Descripción | Uso |
|--------|-------------|-----|
| `dev.sh` | Levantar apps en desarrollo | `npm run dev` (alias) |
| `clean-dev.sh` | Limpiar node_modules, dist, caches | Manual cuando hay problemas |
| `setup-npm-automated.js` | Setup inicial de npm (first-time) | `npm run setup-npm` |

### 13.2 Scripts de Despliegue

| Script | Descripción | Uso |
|--------|-------------|-----|
| `deploy-prod.sh` | Deploy a producción (Docker Swarm) | GitHub Actions o manual |
| `deploy-hybrid.sh` | Deploy híbrido (PM2 + Docker) | Desarrollo avanzado |

### 13.3 Scripts de Monitoreo

| Script | Descripción | Uso |
|--------|-------------|-----|
| `health-check-all.sh` | Verifica health de todos los servicios | `bash scripts/health-check-all.sh` |
| `monitor-resources.sh` | Monitorea CPU, RAM, Disco | `bash scripts/monitor-resources.sh` |
| `daily-report.sh` | Reporte diario del sistema | Cron diario (2:30 AM) |

**Ejemplo `health-check-all.sh`**:
```bash
#!/bin/bash

SERVICES=(
  "http://localhost:4800/api/health"
  "http://localhost:8550/health"
  "http://localhost:4802/api/docs/health"
)

for service in "${SERVICES[@]}"; do
  if curl -sf "$service" > /dev/null; then
    echo "✅ $service OK"
  else
    echo "❌ $service FAILED"
  fi
done
```

### 13.4 Scripts de Base de Datos

| Script | Descripción | Uso |
|--------|-------------|-----|
| `backup.sh` | Backup de PostgreSQL | `bash scripts/backup.sh` (cron diario) |
| `restore.sh` | Restore desde backup | `bash scripts/restore.sh backup_file.sql` |

**Ejemplo `backup.sh`**:
```bash
#!/bin/bash
BACKUP_DIR=/home/administrador/backups
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/monorepo-bca_$DATE.sql"

pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
gzip "$BACKUP_FILE"

# Retención: 30 días
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
```

### 13.5 Scripts de Mantenimiento

| Script | Descripción | Uso |
|--------|-------------|-----|
| `cleanup-docker.sh` | Limpiar Docker (imágenes, contenedores, volúmenes no usados) | `bash scripts/cleanup-docker.sh` |
| `coverage-report.sh` | Generar reporte de cobertura consolidado | `npm run test:coverage` |

---

## 14. METODOLOGÍA Y PROCESO DE TRABAJO

### 14.1 Modelo de Branching (Git Flow Simplificado)

**Branch Principal**: `main` (siempre desplegable)

**Branches de Trabajo**:
```
feat/<issue-number>-<descripcion>   # Nueva funcionalidad
fix/<issue-number>-<descripcion>    # Corrección de bug
chore/<descripcion>                 # Tareas de mantenimiento
docs/<descripcion>                  # Documentación
refactor/<descripcion>              # Refactorización
```

**Reglas**:
- ❌ NO push directo a `main` (protegido)
- ✅ PRs obligatorios con mínimo 1 aprobación
- ✅ CI verde (lint + test + build) obligatorio
- ✅ PRs ≤ 300 líneas (dividir si es más grande)
- ✅ Commits con Conventional Commits

### 14.2 Conventional Commits

**Formato**: `<tipo>(<scope>): <descripción corta>`

**Tipos**:
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `refactor`: Refactorización (sin cambio de funcionalidad)
- `docs`: Documentación
- `test`: Tests
- `chore`: Tareas de mantenimiento (deps, config, scripts)
- `perf`: Mejora de rendimiento
- `style`: Cambios de estilo (sin lógica)

**Ejemplos**:
```
feat(backend): agregar endpoint de usuarios
fix(frontend): corregir validación de formulario
refactor(documentos): simplificar servicio de clasificación
docs(readme): actualizar instrucciones de setup
chore(deps): actualizar dependencias de seguridad
```

### 14.3 Flujo de Pull Request

1. **Crear branch** desde `main`
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/123-nueva-funcionalidad
   ```

2. **Desarrollar y validar localmente**
   ```bash
   npm ci
   npm run lint
   npm test
   npm run build
   ```

3. **Commits atómicos** (uno o varios)
   ```bash
   git add .
   git commit -m "feat(backend): agregar endpoint de usuarios"
   ```

4. **Push y abrir PR**
   ```bash
   git push origin feat/123-nueva-funcionalidad
   ```
   Abrir PR en GitHub con template completo

5. **PR Template** (incluir):
   - 📝 Descripción del cambio
   - ✅ Checklist de validación
   - 🖼️ Screenshots (si es UI)
   - 🧪 Cómo probar
   - 📚 Links a issues relacionados

6. **Code Review**
   - Mínimo 1 aprobación requerida
   - Si toca seguridad/infra: 2da aprobación de DevOps/Lead
   - Responder a comentarios en < 24h
   - Resolver conversaciones antes de merge

7. **Merge** (después de CI verde + aprobaciones)
   - Estrategia: **Squash and Merge** (recomendado)
   - Título del commit de merge = título del PR
   - Eliminar branch después de merge

### 14.4 Cadencia Semanal (Sprints)

**Manual Operativo Microsyst**:

| Día | Hora | Actividad | Responsable |
|-----|------|-----------|-------------|
| **Lunes** | - | Planificación Sprint (30min) | PM propone tareas, Lead prioriza |
| **Diario** | - | Daily Standup (10min) | Todos: qué haré hoy, bloqueos |
| **Miércoles** | 11:00 | **Deploy a Staging** | DevOps + PM validación |
| **Jueves** | 11:00 | **Deploy a Producción** | DevOps + Lead aprobación |
| **Viernes** | - | Demo/Retrospectiva (30min) | Todos: logros, aprendizajes |

**Regla de Oro**: Nada llega a Producción sin pasar por Staging y tener E2E + smoke tests OK + 30 min sin errores en Sentry.

### 14.5 Definition of Done (DoD)

**Para considerar una tarea DONE**:

- ✅ Código implementado y funcionando
- ✅ Tests unitarios escritos (coverage ≥ 80%)
- ✅ Lint pasa (0 errores, 0 warnings)
- ✅ Typecheck pasa (TypeScript strict)
- ✅ Build exitoso
- ✅ PR aprobado por peer
- ✅ Merge a `main`
- ✅ Deploy a DEV exitoso
- ✅ Validación QA en DEV
- ✅ README actualizado (si aplica)
- ✅ Changelog actualizado

**Para considerar un Sprint DONE**:

- ✅ Todas las tareas comprometidas DONE
- ✅ Deploy a Staging OK
- ✅ Smoke tests + E2E críticos pasan
- ✅ 0 errores críticos en Sentry (30 min)
- ✅ Demo realizada con stakeholders
- ✅ Documentación actualizada

---

## 15. ROADMAP Y PLANES DE IMPLEMENTACIÓN FUTURA

### 15.1 Single Sign-On (SSO) Centralizado

**Estado**: En evaluación / Planificación

**Objetivo**: Implementar un sistema de autenticación centralizado (SSO) para:
- Este sistema (Monorepo BCA)
- Otros monorepos independientes en desarrollo para la organización BCA
- Autorización de ingreso a la red corporativa (posible integración)

#### 15.1.1 Beneficios del SSO

**Para Usuarios**:
- ✅ Una única credencial para todas las aplicaciones BCA
- ✅ Experiencia de login unificada
- ✅ Reducción de fatiga de contraseñas
- ✅ Acceso simplificado entre sistemas

**Para Organización**:
- ✅ Gestión centralizada de identidades
- ✅ Políticas de seguridad uniformes
- ✅ Auditoría consolidada de accesos
- ✅ Onboarding/offboarding simplificado
- ✅ Integración con Active Directory / LDAP (si aplica)

#### 15.1.2 Opciones Tecnológicas Evaluadas

**Opción 1: Keycloak (Open Source)**
- **Pros**: 
  - Solución madura y probada
  - Open source, sin costos de licencia
  - Compatible con SAML 2.0, OpenID Connect, OAuth 2.0
  - Gestión completa de usuarios, roles, grupos
  - Interfaz de administración robusta
  - Federación de identidades (LDAP, Active Directory)
  - Temas personalizables
- **Contras**: 
  - Requiere infraestructura adicional (JVM)
  - Curva de aprendizaje
  - Consumo de recursos (Java)
- **Complejidad**: Media-Alta
- **Costo**: Gratis (solo infraestructura)

**Opción 2: Auth0 / Okta (SaaS)**
- **Pros**: 
  - Implementación rápida
  - Mantenimiento mínimo
  - Escalabilidad garantizada
  - Soporte 24/7
  - Multi-factor auth incluido
  - Integraciones pre-construidas
- **Contras**: 
  - Costo por usuario activo mensual
  - Dependencia de proveedor externo
  - Datos de autenticación en cloud externo
- **Complejidad**: Baja
- **Costo**: $$$

**Opción 3: Ory Kratos + Ory Hydra (Open Source)**
- **Pros**: 
  - Moderno, cloud-native (Go)
  - Arquitectura de microservicios
  - Ligero y performante
  - OpenID Connect / OAuth 2.0
  - Diseñado para Kubernetes
- **Contras**: 
  - Menos maduro que Keycloak
  - Documentación en desarrollo
  - Comunidad más pequeña
- **Complejidad**: Alta
- **Costo**: Gratis (solo infraestructura)

**Opción 4: Solución Custom con JWT Centralizado**
- **Pros**: 
  - Control total
  - Adaptado a necesidades exactas
  - Sin dependencias externas pesadas
- **Contras**: 
  - Desarrollo y mantenimiento propio
  - Riesgo de seguridad si no se hace bien
  - Reinventar la rueda
- **Complejidad**: Alta
- **Costo**: Tiempo de desarrollo

#### 15.1.3 Recomendación Tentativa

**Keycloak** es la opción más equilibrada para BCA:
- ✅ Solución enterprise-grade probada
- ✅ Sin costos de licencia
- ✅ Integración sencilla con stack actual (JWT RS256)
- ✅ Posibilidad de integrar con red corporativa (LDAP/AD)
- ✅ Escalable para múltiples aplicaciones

#### 15.1.4 Arquitectura Propuesta con SSO

```
┌─────────────────────────────────────────────────────────────┐
│                     KEYCLOAK (SSO Server)                    │
│  - Gestión de usuarios centralizada                          │
│  - OpenID Connect / OAuth 2.0                                │
│  - Multi-tenant (realms por cliente si aplica)               │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │Monorepo  │ │Monorepo  │ │Monorepo  │
    │BCA       │ │Logística │ │Inventario│
    │(actual)  │ │(futuro)  │ │(futuro)  │
    └──────────┘ └──────────┘ └──────────┘
          │            │            │
          └────────────┼────────────┘
                       │
                       ▼
          ┌─────────────────────────┐
          │   Red Corporativa BCA   │
          │  (VPN / Firewall)       │
          └─────────────────────────┘
```

**Flujo de Autenticación SSO**:
1. Usuario accede a Monorepo BCA → Redirige a Keycloak
2. Usuario se autentica en Keycloak (una sola vez)
3. Keycloak emite token JWT (OpenID Connect)
4. Monorepo BCA valida token con clave pública de Keycloak
5. Usuario accede a Monorepo Logística → Ya autenticado (SSO)
6. Todas las apps confían en tokens de Keycloak

#### 15.1.5 Plan de Implementación SSO

**Fase 1: Setup y Prueba de Concepto (2-3 semanas)**
- Instalar Keycloak en servidor de desarrollo
- Configurar realm "BCA"
- Migrar usuarios existentes de BD actual a Keycloak
- Integrar Monorepo BCA con Keycloak (OpenID Connect)
- Testing exhaustivo

**Fase 2: Configuración de Roles y Permisos (1-2 semanas)**
- Mapear roles actuales (SUPERADMIN, ADMIN, USER) a Keycloak
- Configurar grupos y permisos por aplicación
- Implementar custom claims en tokens JWT
- Sincronización bidireccional (si aplica)

**Fase 3: Deploy a Staging (1 semana)**
- Keycloak en Docker Swarm (alta disponibilidad)
- Base de datos PostgreSQL para Keycloak
- Testing con usuarios reales
- Validación de integración con red corporativa (si aplica)

**Fase 4: Migración Gradual a Producción (2 semanas)**
- Deploy de Keycloak a producción
- Migración de usuarios (con notificación y reset de contraseñas)
- Rollout gradual: 10% usuarios → 50% → 100%
- Monitoreo intensivo

**Fase 5: Integración de Nuevas Apps (continuo)**
- Onboarding de Monorepo Logística
- Onboarding de Monorepo Inventario
- Integración con red corporativa (VPN/Firewall)

**Tiempo Estimado Total**: 2-3 meses

**Recursos Requeridos**:
- 1 DevOps/Backend Senior (tiempo completo)
- 1 Developer Backend (50%)
- 1 Tester QA (25%)

### 15.2 Cifrado de Datos

**Estado**: En evaluación

**Objetivo**: Proteger datos sensibles mediante cifrado en reposo y tránsito, con posible marca de agua en archivos.

#### 15.2.1 Cifrado de PostgreSQL

**Opciones Evaluadas**:

**Opción A: Cifrado a Nivel de Disco (LUKS)**
- **Descripción**: Cifrar todo el disco donde reside PostgreSQL
- **Ventaja**: Transparente para la aplicación, protege ante robo físico
- **Desventaja**: No protege ante acceso no autorizado con servidor encendido
- **Rendimiento**: Impacto mínimo (< 5%)
- **Complejidad**: Baja
- **Uso recomendado**: Baseline de seguridad

**Opción B: Cifrado Nativo de PostgreSQL (TDE - Transparent Data Encryption)**
- **Descripción**: PostgreSQL 15+ con extensión pgcrypto o soluciones comerciales
- **Ventaja**: Cifrado a nivel de tablespace o tabla
- **Desventaja**: No disponible en versión community sin extensiones
- **Rendimiento**: Impacto moderado (10-15%)
- **Complejidad**: Media-Alta
- **Uso recomendado**: Datos críticos específicos

**Opción C: Cifrado a Nivel de Aplicación (Column-Level Encryption)**
- **Descripción**: Cifrar columnas específicas antes de guardar en BD
- **Ventaja**: Control granular, portabilidad
- **Desventaja**: Complejidad en queries, gestión de claves
- **Rendimiento**: Impacto alto en columnas cifradas (20-30%)
- **Complejidad**: Alta
- **Uso recomendado**: Datos ultra-sensibles (DNI, CUIL, tarjetas)

**Recomendación**: Estrategia híbrida
1. **Baseline**: LUKS (cifrado de disco) en todos los ambientes
2. **Datos sensibles**: Cifrado de columnas específicas (DNI, CUIL, passwords, datos financieros)
3. **Claves**: Gestión con HashiCorp Vault o AWS KMS

#### 15.2.2 Cifrado de Archivos en MinIO

**Opciones Evaluadas**:

**Opción A: Cifrado del Lado del Servidor (SSE-S3)**
- **Descripción**: MinIO cifra automáticamente al almacenar
- **Ventaja**: Transparente, sin cambios en aplicación
- **Desventaja**: Claves gestionadas por MinIO
- **Rendimiento**: Impacto mínimo (< 5%)
- **Complejidad**: Baja
- **Configuración**: 
  ```bash
  export MINIO_KMS_SECRET_KEY="my-secret-key"
  minio server /data --sse
  ```

**Opción B: Cifrado del Lado del Cliente (CSE)**
- **Descripción**: App cifra antes de subir a MinIO
- **Ventaja**: Control total de claves, zero-trust
- **Desventaja**: Complejidad en aplicación, no se puede buscar
- **Rendimiento**: Impacto moderado (10-15%)
- **Complejidad**: Media-Alta

**Opción C: Cifrado Híbrido**
- **Descripción**: SSE-S3 + cifrado adicional para archivos críticos
- **Ventaja**: Doble capa de protección
- **Desventaja**: Mayor complejidad
- **Complejidad**: Alta

**Recomendación**: 
- **Baseline**: SSE-S3 en MinIO para todos los archivos
- **Archivos críticos**: Cifrado adicional del lado del cliente antes de upload
- **Claves**: Rotación automática cada 90 días

#### 15.2.3 Marca de Agua en Archivos (Watermarking)

**Objetivo**: Rastrear origen y prevenir uso no autorizado de documentos

**Tipos de Marca de Agua**:

**1. Marca de Agua Visible**
- **Descripción**: Texto/logo superpuesto en documento (ej: "Confidencial - BCA 2026")
- **Uso**: Documentos públicos o semi-públicos
- **Tecnología**: Sharp (imágenes), PDF-Lib (PDFs)
- **Ventaja**: Disuasión visual inmediata
- **Desventaja**: Puede ocultar contenido importante

**2. Marca de Agua Invisible (Steganografía)**
- **Descripción**: Información oculta en bits menos significativos de imagen
- **Uso**: Rastreo forense de filtración de documentos
- **Tecnología**: Librerías de steganografía (stegano, steghide)
- **Ventaja**: No afecta apariencia, rastreable
- **Desventaja**: Puede perderse con conversiones de formato

**3. Metadata Embedding**
- **Descripción**: Información en metadatos EXIF/XMP (usuario, fecha, empresa)
- **Uso**: Auditoría y trazabilidad
- **Tecnología**: ExifTool, sharp (metadata)
- **Ventaja**: Estándar, fácil de implementar
- **Desventaja**: Fácil de remover

**Implementación Propuesta**:

```typescript
// Ejemplo: Marca de agua en imagen con Sharp
import sharp from 'sharp';

async function addWatermark(
  inputPath: string,
  outputPath: string,
  watermarkText: string
) {
  const svg = `
    <svg width="800" height="600">
      <style>
        .watermark {
          font-size: 48px;
          font-family: Arial;
          fill: rgba(255,255,255,0.3);
          transform: rotate(-45deg);
        }
      </style>
      <text x="200" y="300" class="watermark">
        ${watermarkText}
      </text>
    </svg>
  `;

  await sharp(inputPath)
    .composite([{
      input: Buffer.from(svg),
      gravity: 'center'
    }])
    .toFile(outputPath);
}

// Uso
await addWatermark(
  '/path/to/document.jpg',
  '/path/to/watermarked.jpg',
  'CONFIDENCIAL - BCA - Usuario: juan.perez@bca.com.ar - 2026-01-14'
);
```

**Plan de Implementación**:

**Fase 1: Marca de Agua Básica (2 semanas)**
- Implementar marca visible en imágenes (Sharp)
- Implementar marca visible en PDFs (PDF-Lib)
- Configuración por tipo de documento y usuario
- Testing

**Fase 2: Metadata Embedding (1 semana)**
- Agregar metadata a todos los uploads (usuario, empresa, fecha, hash)
- Logging de metadatos en BD
- Herramienta de extracción de metadata

**Fase 3: Steganografía (3-4 semanas, opcional)**
- Investigación de librerías de steganografía
- Implementación de marca invisible
- Herramienta de detección/extracción
- Testing forense

**Tiempo Total**: 1-2 meses

#### 15.2.4 Gestión de Claves Criptográficas

**Problema**: Gestión segura de claves de cifrado

**Opciones**:

**Opción A: HashiCorp Vault (Recomendado)**
- Gestión centralizada de secretos
- Rotación automática de claves
- Auditoría completa
- Integración con Kubernetes/Docker
- Dynamic secrets
- **Complejidad**: Media
- **Costo**: Gratis (open source) o Enterprise ($$$)

**Opción B: AWS KMS / Azure Key Vault**
- Solución cloud managed
- Integración nativa con servicios cloud
- HSM (Hardware Security Module) incluido
- **Complejidad**: Baja
- **Costo**: Pay-per-use

**Opción C: Filesystem + Environment Variables (Actual)**
- Claves en archivos protegidos por permisos OS
- Variables de entorno
- **Complejidad**: Muy baja
- **Seguridad**: Limitada
- **Uso actual**: OK para desarrollo, mejorar para producción

**Recomendación para Producción**: HashiCorp Vault

#### 15.2.5 Resumen de Recomendaciones de Cifrado

| Capa | Solución | Prioridad | Complejidad | Tiempo |
|------|----------|-----------|-------------|--------|
| **Disco** | LUKS (full disk encryption) | Alta | Baja | 1 semana |
| **BD - Baseline** | PostgreSQL + LUKS | Alta | Baja | 1 semana |
| **BD - Columnas sensibles** | pgcrypto (DNI, CUIL) | Media | Media | 3 semanas |
| **MinIO - Baseline** | SSE-S3 (server-side) | Alta | Baja | 1 semana |
| **MinIO - Archivos críticos** | Cifrado cliente (CSE) | Media | Media | 2 semanas |
| **Marca de agua visible** | Sharp + PDF-Lib | Alta | Baja | 2 semanas |
| **Metadata embedding** | EXIF/XMP | Media | Baja | 1 semana |
| **Steganografía** | Marca invisible | Baja | Alta | 4 semanas |
| **Gestión de claves** | HashiCorp Vault | Media | Media | 3 semanas |

**Roadmap Sugerido**:
1. **Fase 1 (1 mes)**: LUKS + MinIO SSE-S3 + Marca de agua visible
2. **Fase 2 (1.5 meses)**: Cifrado de columnas BD + Metadata embedding
3. **Fase 3 (1.5 meses)**: HashiCorp Vault + Cifrado cliente MinIO
4. **Fase 4 (1 mes, opcional)**: Steganografía

**Total**: 4-5 meses

### 15.3 Otros Planes Futuros

**Microservicio de Notificaciones**
- Email (SMTP)
- SMS (Twilio/similar)
- Push notifications (FCM)
- Webhooks

**Dashboard de Métricas (Prometheus + Grafana)**
- Métricas de rendimiento
- Alertas proactivas
- Capacidad de planificación

**Backup Offsite Automático**
- S3 compatible (Backblaze B2, AWS S3)
- Replicación geográfica
- Disaster recovery

**API Gateway (Kong / Traefik)**
- Rate limiting avanzado
- API versioning
- Circuit breaker
- Transformaciones de request/response

---

## 16. REFERENCIAS Y DOCUMENTACIÓN

### 16.1 Documentación Interna

**Ubicación**: `docs/`

#### Operativa
- `MANUAL_OPERATIVO_MICROSYST.md` - Manual completo del equipo
- `CICD_PIPELINE_3_SERVICES.md` - Flujo CI/CD detallado
- `ENVIRONMENTS.md` - Configuración de ambientes
- `RESOURCES_HARDWARE.md` - Especificación de recursos

#### Roles y Equipo
- `ESTRUCTURA_ROLES_ATOMIZADA.md` - Definición de 7 roles
- `PLAN_IMPLEMENTACION_ROLES.md` - Plan de crecimiento del equipo
- `roles/01_DESARROLLADOR.md` - Guía para desarrolladores
- `roles/02_TECH_LEAD.md` - Guía para tech lead
- `roles/03_PRODUCT_MANAGER.md` - Guía para PM
- `roles/04_QA_ANALYST.md` - Guía para QA
- `roles/05_DEVOPS_ENGINEER.md` - Guía para DevOps

#### Técnica
- `TOOLS_STACK.md` - Stack de herramientas completo
- `PRISMA_CONFIGURATION.md` - Arquitectura Prisma
- `PRISMA_QUICK_REFERENCE.md` - Comandos esenciales
- `MANUAL_MICROSERVICIO_DOCUMENTOS.md` - Documentación del microservicio
- `FLOWISE_PROMPT_DOCUMENTOS.md` - Prompts de Flowise

#### Planificación
- `PLAN_IMPLEMENTACION_PORTALES.md` - Roadmap de portales
- `HISTORIAS_USUARIO.md` - User stories
- `LISTADO_FUNCIONALIDADES_REQUERIDAS.md` - Features requeridas

### 15.2 ADRs (Architecture Decision Records)

**Ubicación**: `docs/ADRS.md`

**Decisiones Arquitectónicas Documentadas**:
1. Uso de JWT RS256 vs HS256
2. Multi-schema en PostgreSQL vs múltiples BD
3. Monorepo vs múltiples repos
4. Docker Swarm vs Kubernetes
5. Flowise vs soluciones propias de IA

### 15.3 Recursos Externos

#### Tecnologías Core
- **Node.js**: https://nodejs.org/docs/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **React**: https://react.dev/
- **Vite**: https://vitejs.dev/
- **Express**: https://expressjs.com/
- **Prisma**: https://www.prisma.io/docs/
- **PostgreSQL**: https://www.postgresql.org/docs/16/

#### Librerías Principales
- **Redux Toolkit**: https://redux-toolkit.js.org/
- **React Router**: https://reactrouter.com/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Shadcn/UI**: https://ui.shadcn.com/
- **Zod**: https://zod.dev/
- **Winston**: https://github.com/winstonjs/winston
- **BullMQ**: https://docs.bullmq.io/
- **MinIO**: https://min.io/docs/minio/linux/developers/javascript/API.html
- **Socket.io**: https://socket.io/docs/

#### DevOps
- **Docker**: https://docs.docker.com/
- **Docker Swarm**: https://docs.docker.com/engine/swarm/
- **GitHub Actions**: https://docs.github.com/en/actions
- **SonarQube**: https://docs.sonarsource.com/sonarqube/

#### Monitoring
- **Sentry**: https://docs.sentry.io/
- **Uptime Kuma**: https://github.com/louislam/uptime-kuma

---

## 📌 RESUMEN EJECUTIVO

### Stack Principal

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | React 18 + Vite + TypeScript + Tailwind + Shadcn/UI + Redux Toolkit |
| **Backend** | Node.js 20 + Express + TypeScript + Prisma |
| **Base de Datos** | PostgreSQL 16 (multi-schema) |
| **Cache/Queues** | Redis 7 + BullMQ |
| **Storage** | MinIO (S3-compatible) |
| **IA** | Flowise AI (opcional) |
| **Contenedores** | Docker + Docker Compose (dev) + Docker Swarm (prod) |
| **CI/CD** | GitHub Actions |
| **Monorepo** | npm workspaces + Turborepo |
| **Reverse Proxy** | Nginx |
| **Monitoring** | Sentry + Uptime Kuma + Winston |
| **Code Quality** | ESLint + Prettier + SonarQube |

### Aplicaciones

1. **Backend** (puerto 4800) - API principal, autenticación, RBAC
2. **Frontend** (puerto 8550) - SPA React con múltiples portales
3. **Documentos** (puerto 4802) - Microservicio documental con IA
4. **Remitos** (puerto 4803) - Microservicio de remitos (en desarrollo)

### Ambientes

1. **DEV Local** - Scripts locales + Docker Compose para infra
2. **DEV Server** - Docker Compose, deploy automático
3. **Staging** - Docker Swarm, deploy manual miércoles 11:00
4. **Producción** - Docker Swarm, deploy manual jueves 11:00 con aprobación

### Metodología

- **Sprints semanales** con cadencia fija (Manual Operativo Microsyst)
- **Git Flow simplificado** con PRs obligatorios
- **CI/CD completo** con GitHub Actions
- **Quality gates** con SonarQube
- **Monitoring continuo** con Sentry + Uptime Kuma

---

**Documento generado**: 14 Enero 2026  
**Mantenido por**: Founder/Lead + DevOps  
**Próxima revisión**: Cada 3 meses o ante cambios arquitectónicos significativos

---

Para preguntas o aclaraciones sobre este documento, contactar al equipo técnico en Slack #dev o crear un issue en GitHub.
