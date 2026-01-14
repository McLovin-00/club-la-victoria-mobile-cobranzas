# ARQUITECTURA VISUAL - MONOREPO BCA

> **Diagramas y Visualizaciones de la Arquitectura**  
> **Fecha**: 14 Enero 2026  

---

## 📐 ARQUITECTURA GENERAL DEL SISTEMA

```
                                 USUARIOS
                                    │
                                    ▼
                              ┌──────────┐
                              │  NGINX   │  (Reverse Proxy + SSL)
                              │  :80/443 │
                              └────┬─────┘
                                   │
                   ┌───────────────┼───────────────┐
                   │               │               │
                   ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌────────────┐
            │ FRONTEND  │   │  BACKEND  │   │ DOCUMENTOS │
            │  :8550    │   │   :4800   │   │   :4802    │
            │ React 18  │   │  Express  │   │  Express   │
            └───────────┘   └─────┬─────┘   └──────┬─────┘
                                  │                 │
                                  ├─────────────────┤
                                  │                 │
                      ┌───────────┼─────────────────┼─────────┐
                      │           │                 │         │
                      ▼           ▼                 ▼         ▼
                ┌──────────┐  ┌──────┐       ┌───────┐  ┌─────────┐
                │PostgreSQL│  │ Redis│       │ MinIO │  │ Flowise │
                │   :5432  │  │ :6379│       │ :9000 │  │  :3000  │
                │  (BD)    │  │(Cache│       │ (S3)  │  │  (IA)   │
                └──────────┘  │Queue)│       └───────┘  └─────────┘
                              └──────┘
```

---

## 🏗️ ARQUITECTURA DE MONOREPO

```
monorepo-bca/
│
├─ apps/                           ◄── APLICACIONES
│  ├─ backend/
│  │  ├─ src/
│  │  │  ├─ config/                (DB, Redis, JWT)
│  │  │  ├─ controllers/           (Express handlers)
│  │  │  ├─ middlewares/           (Auth, Validation)
│  │  │  ├─ routes/                (API routes)
│  │  │  ├─ services/              (Business logic)
│  │  │  └─ utils/                 (Logger, Helpers)
│  │  └─ prisma/
│  │     ├─ schema.prisma          (Schema platform)
│  │     └─ migrations/            (DB migrations)
│  │
│  ├─ frontend/
│  │  ├─ src/
│  │  │  ├─ components/            (UI components)
│  │  │  ├─ features/              (Features por dominio)
│  │  │  ├─ pages/                 (Páginas routing)
│  │  │  ├─ store/                 (Redux store)
│  │  │  └─ utils/                 (Utilidades)
│  │  └─ vite.config.ts
│  │
│  ├─ documentos/
│  │  ├─ src/
│  │  │  ├─ controllers/
│  │  │  ├─ routes/
│  │  │  │  ├─ documents.routes.ts
│  │  │  │  ├─ maestros.routes.ts (choferes, camiones, acoplados)
│  │  │  │  ├─ dadores.routes.ts
│  │  │  │  ├─ empresas-transportistas.routes.ts
│  │  │  │  ├─ equipos.routes.ts
│  │  │  │  ├─ clients.routes.ts
│  │  │  │  ├─ approval.routes.ts
│  │  │  │  ├─ compliance.routes.ts
│  │  │  │  ├─ entity-data.routes.ts
│  │  │  │  ├─ portal-transportista.routes.ts
│  │  │  │  ├─ portal-cliente.routes.ts
│  │  │  │  └─ ...
│  │  │  ├─ services/
│  │  │  │  ├─ document-validation.service.ts
│  │  │  │  ├─ flowise.service.ts
│  │  │  │  ├─ minio.service.ts
│  │  │  │  ├─ websocket.service.ts
│  │  │  │  ├─ notification.service.ts
│  │  │  │  └─ ...
│  │  │  └─ prisma/
│  │  │     ├─ schema.prisma       (Schema documentos)
│  │  │     │   Modelos: Chofer, Camion, Acoplado,
│  │  │     │            DadorCarga, EmpresaTransportista,
│  │  │     │            Cliente, Equipo, Document, etc.
│  │  │     └─ migrations/
│  │  └─ openapi.yaml
│  │
│  └─ remitos/                     (En desarrollo)
│     ├─ src/
│     │  ├─ controllers/
│     │  ├─ routes/
│     │  ├─ services/
│     │  │  └─ flowise.service.ts (OCR de remitos)
│     │  └─ prisma/
│     │     └─ schema.prisma       (Schema remitos)
│     │         Modelos: Remito, RemitoImagen, RemitoHistory
│     └─ package.json
│
├─ packages/                       ◄── CÓDIGO COMPARTIDO
│  ├─ types/                       (@workspace/types)
│  └─ utils/                       (@workspace/utils)
│
├─ docs/                           ◄── DOCUMENTACIÓN
│  ├─ roles/                       (Guías por rol)
│  ├─ env/                         (Plantillas .env)
│  └─ procedures/                  (Procedimientos)
│
├─ scripts/                        ◄── AUTOMATIZACIÓN
│  ├─ deploy-*.sh
│  ├─ health-check-all.sh
│  └─ backup.sh
│
├─ .github/workflows/              ◄── CI/CD
│  ├─ monorepo-ci.yml
│  └─ deploy-*.yml
│
└─ docker-compose.*.yml            ◄── ORQUESTACIÓN
```

---

## 🔄 FLUJO DE AUTENTICACIÓN (JWT RS256)

```
┌─────────┐                                    ┌─────────┐
│ Cliente │                                    │ Backend │
│(Browser)│                                    │         │
└────┬────┘                                    └────┬────┘
     │                                              │
     │  1. POST /api/auth/login                    │
     │     { email, password }                     │
     │─────────────────────────────────────────────>│
     │                                              │
     │                    2. Verificar credenciales│
     │                       (bcrypt.compare)      │
     │                                              │
     │                    3. Generar tokens (RS256)│
     │                       - Access Token (15min)│
     │                       - Refresh Token (7d)  │
     │                                              │
     │  4. Response: { accessToken, refreshToken } │
     │<─────────────────────────────────────────────│
     │                                              │
     │  5. Almacenar tokens (localStorage)         │
     │                                              │
     │  6. GET /api/users                          │
     │     Header: Authorization: Bearer <token>   │
     │─────────────────────────────────────────────>│
     │                                              │
     │                    7. Verificar token       │
     │                       (JWT verify con clave │
     │                        pública RS256)       │
     │                                              │
     │                    8. Extraer payload       │
     │                       { sub, email, role }  │
     │                                              │
     │  9. Response: { users: [...] }              │
     │<─────────────────────────────────────────────│
     │                                              │
     │  10. Si token expira (401)                  │
     │      POST /api/auth/refresh                 │
     │      { refreshToken }                       │
     │─────────────────────────────────────────────>│
     │                                              │
     │  11. Response: { accessToken, refreshToken }│
     │<─────────────────────────────────────────────│
     │                                              │
```

---

## 📦 FLUJO DE UPLOAD Y CLASIFICACIÓN DE DOCUMENTOS

```
┌─────────┐         ┌──────────┐         ┌───────┐         ┌─────────┐
│ Cliente │         │Documentos│         │ MinIO │         │ Flowise │
│         │         │   API    │         │       │         │   IA    │
└────┬────┘         └────┬─────┘         └───┬───┘         └────┬────┘
     │                   │                   │                   │
     │  1. POST /upload  │                   │                   │
     │   (multipart)     │                   │                   │
     │──────────────────>│                   │                   │
     │                   │                   │                   │
     │      2. Validar   │                   │                   │
     │      (multer)     │                   │                   │
     │                   │                   │                   │
     │      3. Guardar   │                   │                   │
     │      temp file    │                   │                   │
     │                   │                   │                   │
     │            4. Upload a MinIO          │                   │
     │                   │──────────────────>│                   │
     │                   │                   │                   │
     │            5. Obtener URL             │                   │
     │                   │<──────────────────│                   │
     │                   │                   │                   │
     │      6. Crear     │                   │                   │
     │      Document en  │                   │                   │
     │      BD (Prisma)  │                   │                   │
     │                   │                   │                   │
     │  7. Response: { documentId, status: "PENDIENTE" }        │
     │<──────────────────│                   │                   │
     │                   │                   │                   │
     │      8. [BullMQ Job] Clasificar documento                │
     │                   │                   │                   │
     │            9. Descargar de MinIO      │                   │
     │                   │──────────────────>│                   │
     │                   │<──────────────────│                   │
     │                   │                   │                   │
     │           10. POST /api/v1/prediction/{flowId}           │
     │                   │      (base64 image)                   │
     │                   │──────────────────────────────────────>│
     │                   │                   │                   │
     │                   │           11. Clasificar con LLM     │
     │                   │               (OpenAI/Anthropic)      │
     │                   │                   │                   │
     │           12. Response: { tipo, confianza, datos }       │
     │                   │<──────────────────────────────────────│
     │                   │                   │                   │
     │     13. Guardar   │                   │                   │
     │     Classification│                   │                   │
     │     en BD         │                   │                   │
     │                   │                   │                   │
     │     14. Actualizar│                   │                   │
     │     status a      │                   │                   │
     │     "CLASIFICADO" │                   │                   │
     │                   │                   │                   │
     │     15. Emitir evento WebSocket                          │
     │        "document:classified"                              │
     │<──────────────────│                   │                   │
     │                   │                   │                   │
```

---

## 🌐 ARQUITECTURA DE REDES (DOCKER SWARM)

```
                         INTERNET
                             │
                             ▼
                    ┌────────────────┐
                    │     NGINX      │  Puerto 80/443 (público)
                    │ (Reverse Proxy)│
                    └───────┬────────┘
                            │
            ┌───────────────┴───────────────┐
            │     RED: frontend             │
            │   (overlay, interno)          │
            └───────────────┬───────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
      ┌──────────┐    ┌──────────┐    ┌──────────┐
      │ frontend │    │ backend  │    │documentos│
      │ x2 replic│    │ x2 replic│    │ x2 replic│
      └────┬─────┘    └────┬─────┘    └────┬─────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
           ┌───────────────┴───────────────┐
           │      RED: backend             │
           │    (overlay, interno)         │
           └───────────────┬───────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
      ┌─────────┐    ┌─────────┐    ┌─────────┐
      │PostgreSQL│   │  Redis  │    │  MinIO  │
      │  :5432  │    │  :6379  │    │  :9000  │
      │1 replica│    │1 replica│    │1 replica│
      └─────────┘    └─────────┘    └─────────┘

NOTAS:
- Servicios en red "frontend": accesibles desde nginx
- Servicios en red "backend": accesibles solo internamente
- Ningún puerto de backend expuesto directamente al exterior
- Nginx es el único punto de entrada (80/443)
```

---

## 🗄️ ARQUITECTURA DE BASE DE DATOS (MULTI-SCHEMA)

```
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL 16 - Database: monorepo-bca     │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐  ┌────────────────┐  ┌──────────────┐
│SCHEMA platform│  │SCHEMA documentos│ │SCHEMA flowise│
│               │  │                │  │              │
│ • Empresa     │  │ • DocumentTemplate│ • Flows      │
│ • User        │  │ • Document      │  │ • Credentials│
│ • EndUser     │  │ • Classification│  │ • Tools      │
│ • Service     │  │ • Driver        │  │ • ChatFlow   │
│ • Instance    │  │ • Truck         │  │              │
│ • Permiso     │  │ • Trailer       │  │ (Gestionado  │
│ • AuditLog    │  │ • Notification  │  │  por Flowise)│
│ • Payment     │  │                │  │              │
│ • Schedule    │  │                │  │              │
└───────────────┘  └────────────────┘  └──────────────┘
       ▲                  ▲
       │                  │
       │                  │
┌──────┴───────┐  ┌───────┴────────┐
│   Backend    │  │   Documentos   │
│   Prisma     │  │   Prisma       │
│   Client     │  │   Client       │
└──────────────┘  └────────────────┘

BENEFICIOS:
✓ Aislamiento lógico de datos por dominio
✓ Migraciones independientes por schema
✓ Backups selectivos por schema
✓ Multi-tenant seguro (tenant_empresa_id en todas las tablas)
```

---

## 🔄 PIPELINE CI/CD

```
┌──────────────────────────────────────────────────────────────┐
│                      GITHUB REPOSITORY                       │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    DESARROLLADOR CREA PR                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              GITHUB ACTIONS - CI Pipeline                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  1. Checkout código (fetch-depth: 0)                  │ │
│  │  2. Setup Node.js 20 + npm cache                      │ │
│  │  3. npm ci (clean install)                            │ │
│  │  4. npm run lint (ESLint v9)                  ✓/✗    │ │
│  │  5. npm run type-check (TypeScript strict)   ✓/✗    │ │
│  │  6. npm test -- --coverage (Jest)             ✓/✗    │ │
│  │  7. npm run build (Turborepo)                 ✓/✗    │ │
│  │  8. SonarQube Scan                            ✓/✗    │ │
│  │  9. Quality Gate check                        ✓/⚠    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────┴────────┐
                    │   CI VERDE?    │
                    └───────┬────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼ NO                    ▼ SI
        ┌──────────────┐        ┌─────────────┐
        │ PR BLOQUEADO │        │CODE REVIEW  │
        │   (Red X)    │        │  + Approve  │
        └──────────────┘        └──────┬──────┘
                                       │
                                       ▼
                                ┌──────────────┐
                                │ MERGE A MAIN │
                                └──────┬───────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│              GITHUB ACTIONS - CD Pipeline (DEV)              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  1. SSH a servidor DEV                                 │ │
│  │  2. git pull origin main                               │ │
│  │  3. npm ci                                             │ │
│  │  4. npx prisma migrate deploy (ambos schemas)          │ │
│  │  5. npm run build                                      │ │
│  │  6. Restart servicios (Docker Compose)                │ │
│  │  7. Health checks                                      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  DEV DEPLOYED ✓  │
                  └──────────────────┘
                            │
                            ▼
        ┌─────────────────────────────────────┐
        │    MIÉRCOLES 11:00 - DEPLOY STAGING │
        │         (MANUAL TRIGGER)             │
        └──────────────────┬──────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ E2E Tests + Smoke Tests + Sentry 30min│
        └──────────────────┬───────────────────┘
                           │
                ┌──────────┴──────────┐
                │ STAGING OK?         │
                └──────────┬──────────┘
                           │
                 ┌─────────┴─────────┐
                 │                   │
                 ▼ NO                ▼ SI
          ┌──────────┐      ┌────────────────┐
          │ROLLBACK  │      │ JUEVES 11:00   │
          │          │      │ DEPLOY PROD    │
          └──────────┘      │ (MANUAL +      │
                            │  APROBACIÓN)   │
                            └────────┬───────┘
                                     │
                                     ▼
                          ┌──────────────────┐
                          │ PRODUCCIÓN ✓     │
                          │ Monitoreo 1h     │
                          └──────────────────┘
```

---

## 🔀 FLUJO DE TRABAJO GIT

```
                              main
                               │
                               │ (protegida, solo PRs)
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
  feat/123-login      fix/124-validation    chore/deps
        │                      │                      │
        │                      │                      │
        ▼                      ▼                      ▼
   [Commits]             [Commits]             [Commits]
        │                      │                      │
        │                      │                      │
        ▼                      ▼                      ▼
   [Push origin]         [Push origin]         [Push origin]
        │                      │                      │
        │                      │                      │
        ▼                      ▼                      ▼
  [Abrir PR]            [Abrir PR]            [Abrir PR]
        │                      │                      │
        │                      │                      │
        ▼                      ▼                      ▼
  [CI Pipeline]         [CI Pipeline]         [CI Pipeline]
   Lint + Test           Lint + Test           Lint + Test
   + Build + SQ          + Build + SQ          + Build + SQ
        │                      │                      │
        ├──────────────────────┼──────────────────────┤
        │                      │                      │
        ▼                      ▼                      ▼
  [Code Review]         [Code Review]         [Code Review]
   (1+ approval)         (1+ approval)         (1+ approval)
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                               ▼
                        [Merge a main]
                      (Squash and Merge)
                               │
                               ▼
                    [Deploy automático a DEV]
                               │
                               ▼
                          [main updated]


REGLAS:
✓ PRs obligatorios (NO push directo a main)
✓ CI verde requerido
✓ 1+ aprobación requerida
✓ PRs ≤ 300 líneas
✓ Conventional Commits
✗ NO skip de validaciones
✗ NO commits de merge (usar squash)
```

---

## 🎭 SISTEMA DE ROLES Y PERMISOS (RBAC)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ROLES DE PLATAFORMA (UserRole)                    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────────┐
│ SUPERADMIN   │        │ADMIN / ADMIN_│        │ OPERADOR_INTERNO │
│              │        │    INTERNO   │        │   / OPERATOR     │
│ • Full access│        │              │        │                  │
│ • Crear todo │        │ • Gestionar  │        │ • Operaciones    │
│ • Ver todo   │        │   su empresa │        │   diarias        │
└──────────────┘        │ • Crear roles│        │ • Sin gestión    │
                        │   inferiores │        │   crítica        │
                        └──────────────┘        └──────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────────┐
│ DADOR_DE_    │        │TRANSPORTISTA │        │     CHOFER       │
│    CARGA     │        │              │        │                  │
│              │        │              │        │ • Ver sus docs   │
│ • Gestiona   │        │ • Gestiona   │        │ • Upload remitos │
│   equipos    │        │   su flota   │        │ • Portal         │
│ • Crea       │        │ • Crea       │        │   simplificado   │
│   transportis│        │   choferes   │        │ • Notificaciones │
│   tas        │        │ • Docs propios│       │   vencimiento    │
│ • Crea       │        └──────────────┘        └──────────────────┘
│   choferes   │                  │
└──────────────┘                  ▼
                        ┌──────────────┐
                        │   CLIENTE    │
                        │              │
                        │ • Ver equipos│
                        │   asignados  │
                        │ • Compliance │
                        │   documental │
                        │ • Portal     │
                        │   cliente    │
                        └──────────────┘


┌─────────────────────────────────────────────────────────────┐
│                  PERMISOS POR INSTANCIA                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Permiso     │
                    ├───────────────┤
                    │ userId        │
                    │ instanciaId   │
                    │ esWhitelist   │◄── true: acceso ilimitado
                    │ limiteTotal   │◄── 100 requests/mes
                    │ consumido     │◄── 50 (usado)
                    │ periodoReseteo│◄── MENSUAL
                    └───────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  Whitelist │  │Con Límite  │  │  Temporal  │
    │            │  │            │  │            │
    │ esWhitelist│  │ limite:100 │  │ fechaInicio│
    │ = true     │  │ consumido:│  │ fechaFin   │
    │            │  │ 50         │  │            │
    │ Acceso     │  │ periodoReset│ │ Acceso solo│
    │ ilimitado  │  │ = MENSUAL  │  │ en rango   │
    └────────────┘  └────────────┘  └────────────┘


FLUJO DE AUTORIZACIÓN:
1. Usuario hace request → Backend extrae JWT
2. Backend verifica: ¿Qué role tiene?
3. Si es SUPERADMIN → acceso total ✓
4. Si es ADMIN/ADMIN_INTERNO → verifica empresaId coincida
5. Si es DADOR_DE_CARGA → puede crear TRANSPORTISTA, CHOFER
6. Si es TRANSPORTISTA → puede crear CHOFER (solo de su empresa)
7. Si es CHOFER → acceso limitado a sus propios datos
8. Si es CLIENTE → acceso a equipos asignados y compliance
9. Verificar permisos específicos por instancia (si aplica):
   - ¿Tiene permiso para esta instancia?
   - ¿Es whitelist? → acceso ✓
   - ¿Tiene límite? → verificar consumido < limiteTotal
   - ¿Límite alcanzado? → 403 Forbidden
   - ¿Dentro de período temporal? → acceso ✓
10. Registrar en AuditLog

MATRIZ DE PERMISOS DE CREACIÓN:
- SUPERADMIN: puede crear cualquier rol
- ADMIN, ADMIN_INTERNO: pueden crear OPERATOR, OPERADOR_INTERNO, DADOR_DE_CARGA, CLIENTE
- DADOR_DE_CARGA: puede crear TRANSPORTISTA, CHOFER
- TRANSPORTISTA: puede crear CHOFER (solo de su empresa transportista)
```

---

## 📊 FLUJO DE DATOS (DATA FLOW)

```
┌─────────┐
│ Browser │
└────┬────┘
     │ 1. User Action (click, submit, etc.)
     ▼
┌────────────────┐
│ React Component│
└────┬───────────┘
     │ 2. Dispatch Redux Action
     ▼
┌────────────────┐
│  Redux Store   │
│  (RTK Slice)   │
└────┬───────────┘
     │ 3. Async Thunk / API Call
     ▼
┌────────────────┐
│  Axios Client  │
│  (HTTP Request)│
└────┬───────────┘
     │ 4. POST /api/endpoint + JWT
     ▼
┌────────────────┐
│     Nginx      │ (Reverse Proxy)
└────┬───────────┘
     │ 5. Forward a backend/microservicio
     ▼
┌────────────────┐
│  Express API   │
│  (Backend)     │
└────┬───────────┘
     │ 6. Middleware: Auth + Validation (Zod)
     ▼
┌────────────────┐
│   Controller   │
└────┬───────────┘
     │ 7. Llamar Service
     ▼
┌────────────────┐
│    Service     │ (Business Logic)
└────┬───────────┘
     │ 8. Operación en BD (Prisma)
     ▼
┌────────────────┐
│   PostgreSQL   │
└────┬───────────┘
     │ 9. Resultado
     ▼
┌────────────────┐
│    Service     │
└────┬───────────┘
     │ 10. Retornar a Controller
     ▼
┌────────────────┐
│   Controller   │
└────┬───────────┘
     │ 11. Response JSON
     ▼
┌────────────────┐
│     Nginx      │
└────┬───────────┘
     │ 12. Forward response
     ▼
┌────────────────┐
│  Axios Client  │
└────┬───────────┘
     │ 13. Dispatch Redux Action (success/error)
     ▼
┌────────────────┐
│  Redux Store   │
└────┬───────────┘
     │ 14. Update state
     ▼
┌────────────────┐
│ React Component│ (Re-render con nuevos datos)
└────┬───────────┘
     │ 15. Update UI
     ▼
┌─────────┐
│ Browser │ (Usuario ve cambios)
└─────────┘
```

---

## 🧩 COMPONENTES DEL FRONTEND (REACT)

```
┌────────────────────────────────────────────────────────────┐
│                       APP.TSX (ROOT)                        │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│                   REDUX PROVIDER (RTK)                      │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│              REACT ROUTER (Browser Router)                  │
└────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
     ┌───────────┐   ┌───────────┐   ┌───────────┐
     │ PUBLIC    │   │ PROTECTED │   │   ADMIN   │
     │ ROUTES    │   │  ROUTES   │   │  ROUTES   │
     └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
           │               │               │
           ▼               ▼               ▼
      /login          /dashboard       /admin
      /register       /documentos      /usuarios
                      /perfil          /empresas


┌────────────────────────────────────────────────────────────┐
│                  ESTRUCTURA DE COMPONENTES                  │
└────────────────────────────────────────────────────────────┘

src/
├── components/              ◄── COMPONENTES REUTILIZABLES
│   ├── ui/                  (Shadcn/UI: Button, Input, Dialog...)
│   ├── layout/              (Header, Sidebar, Footer)
│   └── shared/              (Loading, ErrorBoundary, Toast)
│
├── features/                ◄── FEATURES POR DOMINIO
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── authSlice.ts     (Redux slice)
│   │
│   ├── usuarios/
│   │   ├── UserList.tsx
│   │   ├── UserForm.tsx
│   │   └── usersSlice.ts
│   │
│   ├── documentos/
│   │   ├── DocumentUpload.tsx
│   │   ├── DocumentList.tsx
│   │   ├── DocumentViewer.tsx
│   │   └── documentsSlice.ts
│   │
│   └── empresas/
│       ├── EmpresaList.tsx
│       ├── EmpresaForm.tsx
│       └── empresasSlice.ts
│
├── pages/                   ◄── PÁGINAS (ROUTING)
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Documentos.tsx
│   └── AdminPanel.tsx
│
├── store/                   ◄── REDUX STORE
│   ├── store.ts             (configureStore)
│   └── hooks.ts             (useAppDispatch, useAppSelector)
│
├── api/                     ◄── AXIOS CLIENTS
│   ├── axios.ts             (instance configurada)
│   ├── auth.api.ts
│   ├── users.api.ts
│   └── documents.api.ts
│
└── utils/                   ◄── UTILIDADES
    ├── constants.ts
    ├── validators.ts
    └── formatters.ts
```

---

## 🔗 INTEGRACIÓN CON SERVICIOS EXTERNOS

```
┌───────────────────────────────────────────────────────────────┐
│                    MONOREPO BCA (SISTEMA)                      │
└───────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   FLOWISE    │    │   SENTRY     │    │   GITHUB     │
│     (IA)     │    │   (Errors)   │    │  (CI/CD)     │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        │ API REST          │ SDK               │ Webhooks
        │ /api/v1/          │ @sentry/node      │ Actions
        │ prediction/       │ @sentry/react     │
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Clasificación│    │ Error Track  │    │ Deploy Auto  │
│ Documental   │    │ + APM        │    │ + Quality    │
│ + OCR        │    │ + Alerts     │    │   Gate       │
└──────────────┘    └──────────────┘    └──────────────┘


        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  SONARQUBE   │    │ UPTIME KUMA  │    │   MINIO      │
│ (Quality)    │    │ (Monitoring) │    │  (Storage)   │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        │ API REST          │ HTTP Pings        │ S3 API
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Code Scan    │    │ Health Checks│    │ Archivos de  │
│ + Security   │    │ + Alerts     │    │ documentos   │
│ + Coverage   │    │ + Uptime     │    │ + backups    │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 🕒 CRONOGRAMA SEMANAL (SPRINTS)

```
LUNES                 Sprint Planning (30min)
│                     - PM propone 5-15 tareas
│                     - Lead prioriza top 10
│                     - Asignación de tareas
▼

MARTES - MIÉRCOLES    Desarrollo Activo
│                     - Daily standup (10min) cada día
│                     - Desarrollo de features
│                     - Code reviews
│                     - PRs y merges a main
▼

MIÉRCOLES 11:00       🚀 DEPLOY A STAGING
│                     - Deploy manual
│                     - QA: E2E + Smoke tests
│                     - Monitoreo: Sentry 30 min
▼

JUEVES 11:00          🚀 DEPLOY A PRODUCCIÓN
│                     (Solo si Staging OK + Aprobación Lead)
│                     - Backup de BD
│                     - Deploy manual
│                     - Monitoreo intensivo 1h
▼

VIERNES               Demo + Retrospectiva (30min)
│                     - Demo de features completadas
│                     - Qué funcionó / qué mejorar
│                     - Plan siguiente sprint
▼

FIN DE SPRINT ─────────────────────────────────────────►
```

---

---

## 🔮 PLANES FUTUROS - ARQUITECTURAS PROPUESTAS

### Single Sign-On (SSO) con Keycloak

```
                  ┌────────────────────────────────────┐
                  │    KEYCLOAK (SSO Server)          │
                  │    OpenID Connect / OAuth 2.0     │
                  │                                    │
                  │  • Gestión centralizada usuarios  │
                  │  • Realms por organización        │
                  │  • Federación LDAP/AD             │
                  │  • MFA (Multi-Factor Auth)        │
                  │  • Rotación de claves automática  │
                  └─────────────┬──────────────────────┘
                                │
                                │ JWT Tokens (RS256)
                                │
        ┌───────────────────────┼────────────────────────┐
        │                       │                        │
        ▼                       ▼                        ▼
┌───────────────┐      ┌────────────────┐      ┌────────────────┐
│  Monorepo BCA │      │   Monorepo     │      │   Monorepo     │
│   (Actual)    │      │   Logística    │      │  Inventario    │
│               │      │  (En desarrollo)│      │  (Planificado) │
└───────────────┘      └────────────────┘      └────────────────┘
        │                       │                        │
        └───────────────────────┼────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Red Corporativa BCA  │
                    │  • VPN                │
                    │  • Firewall           │
                    │  • Active Directory   │
                    └───────────────────────┘


FLUJO DE AUTENTICACIÓN SSO:
════════════════════════════

1. Usuario → app.bca.com.ar
   │
2. App detecta no autenticado → Redirige a Keycloak
   │
3. Usuario ingresa credenciales en Keycloak (UNA SOLA VEZ)
   │
4. Keycloak valida contra:
   - BD interna de usuarios
   - Active Directory / LDAP (si está federado)
   - MFA (si está habilitado)
   │
5. Keycloak emite JWT Token (RS256) con claims:
   {
     "sub": "user-id-123",
     "email": "juan.perez@bca.com.ar",
     "realm": "BCA",
     "roles": ["admin"],
     "empresaId": 1,
     "iss": "https://sso.bca.com.ar/realms/BCA",
     "exp": 1704067200
   }
   │
6. App valida token con clave pública de Keycloak
   │
7. Usuario accede a logistica.bca.com.ar
   │
8. Ya tiene token válido → Acceso directo (SSO funcionando!)
   │
9. Usuario accede a inventario.bca.com.ar
   │
10. Ya tiene token válido → Acceso directo


BENEFICIOS:
═══════════
✓ Una sola credencial para todas las apps BCA
✓ Timeout de sesión centralizado
✓ Logout propagado a todas las apps
✓ Gestión centralizada de permisos
✓ Auditoría unificada de accesos
✓ Onboarding/Offboarding simplificado
```

---

### Arquitectura de Cifrado de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                   CAPAS DE CIFRADO                           │
└─────────────────────────────────────────────────────────────┘

CAPA 1: CIFRADO DE DISCO (LUKS)
════════════════════════════════
┌──────────────────────────────────────────┐
│        SERVIDOR FÍSICO / VM              │
│  ┌────────────────────────────────────┐  │
│  │  Disco Encriptado (LUKS/dm-crypt) │  │
│  │  AES-256-XTS                       │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │   /var/lib/postgresql/       │  │  │
│  │  │   /var/lib/minio/            │  │  │
│  │  │   /var/lib/docker/volumes/   │  │  │
│  │  └──────────────────────────────┘  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘

Protege contra: Robo físico de discos


CAPA 2: CIFRADO DE BASE DE DATOS (PostgreSQL)
══════════════════════════════════════════════
┌─────────────────────────────────────────────┐
│        PostgreSQL 16                        │
│  ┌───────────────────────────────────────┐  │
│  │  TABLAS CON DATOS PÚBLICOS           │  │
│  │  (sin cifrado adicional)             │  │
│  │  • empresas.nombre                   │  │
│  │  • services.descripcion              │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  COLUMNAS CIFRADAS (pgcrypto)        │  │
│  │  AES-256-CBC                         │  │
│  │  • users.password → bcrypt           │  │
│  │  • drivers.dni → encrypt(dni, key)   │  │
│  │  • drivers.cuil → encrypt(cuil, key) │  │
│  │  • payment.card_number               │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘

Ejemplo:
INSERT INTO drivers (nombre, dni_encrypted)
VALUES (
  'Juan Pérez',
  pgp_sym_encrypt('12345678', current_setting('app.encryption_key'))
);

SELECT nombre, pgp_sym_decrypt(dni_encrypted, ...) AS dni
FROM drivers;


CAPA 3: CIFRADO DE ARCHIVOS (MinIO)
════════════════════════════════════
┌─────────────────────────────────────────────┐
│           MinIO S3 Storage                  │
│  ┌───────────────────────────────────────┐  │
│  │  BUCKET: bca-documentos-empresa-1    │  │
│  │  SSE-S3 Encryption (AES-256)         │  │
│  │                                      │  │
│  │  /drivers/123/dni.pdf [ENCRYPTED]   │  │
│  │  /trucks/456/seguro.pdf [ENCRYPTED] │  │
│  │                                      │  │
│  │  Claves rotadas cada 90 días        │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  ARCHIVOS CRÍTICOS                   │  │
│  │  Doble cifrado (Client + Server)    │  │
│  │  • Contratos firmados                │  │
│  │  • Datos financieros                 │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘


CAPA 4: CIFRADO EN TRÁNSITO
════════════════════════════
┌────────────────────────────────────┐
│   Cliente (Browser)                │
└────────┬───────────────────────────┘
         │ HTTPS (TLS 1.3)
         │ AES-256-GCM
         ▼
┌────────────────────────────────────┐
│   Nginx (Reverse Proxy)            │
│   • Certificate válido             │
│   • HSTS habilitado                │
│   • Perfect Forward Secrecy        │
└────────┬───────────────────────────┘
         │ HTTP interno (red privada)
         ▼
┌────────────────────────────────────┐
│   Backend / Microservicios         │
└────────────────────────────────────┘


GESTIÓN DE CLAVES (HashiCorp Vault - Futuro)
═════════════════════════════════════════════
┌──────────────────────────────────────────────┐
│         HashiCorp Vault                      │
│  ┌────────────────────────────────────────┐  │
│  │  SECRETS                               │  │
│  │  • database-encryption-key             │  │
│  │  • minio-root-password                 │  │
│  │  • jwt-private-key                     │  │
│  │  • api-keys (flowise, sentry)          │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  DYNAMIC SECRETS                       │  │
│  │  • PostgreSQL temporal credentials     │  │
│  │  • AWS S3 temporal access keys         │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  AUDIT LOG                             │  │
│  │  • Quién accedió a qué secreto         │  │
│  │  • Cuándo y desde dónde                │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
         │
         │ API: GET /v1/secret/data/db-key
         ▼
┌──────────────────────────────────────────────┐
│  Aplicaciones (Backend, Documentos)          │
│  Obtienen claves al inicio                   │
│  Rotación automática sin downtime            │
└──────────────────────────────────────────────┘
```

---

### Marca de Agua en Documentos

```
TIPOS DE MARCA DE AGUA
══════════════════════

1. VISIBLE (Disuasión Visual)
   ┌──────────────────────────────────────┐
   │  DOCUMENTO ORIGINAL                  │
   │                                      │
   │  Lorem ipsum dolor sit amet...       │
   │                                      │
   │          CONFIDENCIAL                │ ← Marca
   │          BCA 2026                    │   visible
   │          juan.perez@bca.com.ar       │
   │                                      │
   │  ...consectetur adipiscing elit      │
   └──────────────────────────────────────┘


2. METADATA (EXIF/XMP)
   ┌──────────────────────────────────────┐
   │  ARCHIVO: documento.pdf              │
   │  ┌────────────────────────────────┐  │
   │  │ Metadata Ocultos:              │  │
   │  │ • Author: Juan Pérez           │  │
   │  │ • Company: BCA SA              │  │
   │  │ • Download Date: 2026-01-14    │  │
   │  │ • Download IP: 10.3.0.100      │  │
   │  │ • Hash: a3f2e9...              │  │
   │  │ • Document ID: DOC-12345       │  │
   │  └────────────────────────────────┘  │
   └──────────────────────────────────────┘


3. STEGANOGRAFÍA (Marca Invisible)
   ┌──────────────────────────────────────┐
   │  IMAGEN (bits menos significativos)  │
   │                                      │
   │  Pixel[0] = RGB(128, 200, 64)       │
   │  Pixel[1] = RGB(129, 199, 65) ← Info│
   │  Pixel[2] = RGB(127, 201, 63)   oculta│
   │                                      │
   │  Datos ocultos: "USER:123 TIME:..."  │
   │  Invisible al ojo humano             │
   │  Sobrevive screenshots               │
   └──────────────────────────────────────┘


FLUJO DE IMPLEMENTACIÓN
═══════════════════════

Usuario sube documento
         │
         ▼
┌──────────────────────┐
│ Microservicio        │
│ Documentos           │
└──────┬───────────────┘
       │
       │ 1. Procesar documento
       ▼
┌──────────────────────────────────┐
│  Sharp (imágenes)                │
│  PDF-Lib (PDFs)                  │
│  ┌────────────────────────────┐  │
│  │ • Agregar marca visible    │  │
│  │ • Insertar metadata        │  │
│  │ • Aplicar steganografía    │  │
│  └────────────────────────────┘  │
└──────┬───────────────────────────┘
       │
       │ 2. Documento marcado
       ▼
┌──────────────────────┐
│  MinIO Storage       │
│  (cifrado SSE-S3)    │
└──────┬───────────────┘
       │
       │ 3. Registrar en BD
       ▼
┌──────────────────────────────────┐
│  PostgreSQL                      │
│  documents table:                │
│  • watermark_applied: true       │
│  • watermark_user_id: 123        │
│  • watermark_timestamp: ...      │
│  • watermark_hash: abc123...     │
└──────────────────────────────────┘


CASO DE USO: RASTREO DE FILTRACIÓN
═══════════════════════════════════

1. Documento confidencial aparece en internet
   │
2. Se extrae metadata/steganografía del archivo
   │
3. Se identifica: "USER:juan.perez EMPRESA:bca-1 TIME:2026-01-14"
   │
4. Auditoría revela quién descargó el documento
   │
5. Acción correctiva / legal
```

---

**Última actualización**: 14 Enero 2026  
**Mantenido por**: Founder/Lead + DevOps  

Para documentación textual completa ver:
- `RACONTO_COMPLETO_STACK_TECNICO.md` (detallado)
- `STACK_RESUMEN_EJECUTIVO.md` (resumen)
- `API_ENDPOINTS_REFERENCE.md` (endpoints API)
