# Plan de Implementación de Single Sign-On (SSO)

> **Documento de Arquitectura y Decisión (ADR)**  
> **Fecha**: 26 de Diciembre, 2025  
> **Estado**: En Evaluación  
> **Autor**: Equipo de Desarrollo

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Contexto y Motivación](#2-contexto-y-motivación)
3. [Introspección del Stack Tecnológico Actual](#3-introspección-del-stack-tecnológico-actual)
4. [Análisis de Opciones de SSO](#4-análisis-de-opciones-de-sso)
5. [Evaluación Detallada: Zitadel](#5-evaluación-detallada-zitadel)
6. [Arquitectura Propuesta](#6-arquitectura-propuesta)
7. [Guía de Instalación](#7-guía-de-instalación)
8. [Plan de Migración](#8-plan-de-migración)
9. [Consideraciones de Seguridad](#9-consideraciones-de-seguridad)
10. [Cronograma Estimado](#10-cronograma-estimado)
11. [Riesgos y Mitigaciones](#11-riesgos-y-mitigaciones)
12. [Referencias](#12-referencias)

---

## 1. Resumen Ejecutivo

### Objetivo

Implementar un **Identity Provider (IdP) centralizado y autónomo** que sirva como fuente única de autenticación para todas las aplicaciones desarrolladas por el equipo, tanto actuales como futuras.

### Decisión

Después de evaluar múltiples opciones, se recomienda **Zitadel** como la solución de SSO por las siguientes razones:

- ✅ Arquitectura cloud-native (Go, binario único)
- ✅ Multi-tenancy nativo (Organizations)
- ✅ Ligero (~256MB RAM vs 1GB+ de Keycloak)
- ✅ UI moderna y developer-friendly
- ✅ Soporte completo de OIDC/OAuth 2.0/SAML
- ✅ Passkeys/WebAuthn incluido
- ✅ Open Source (AGPL-3.0)
- ✅ Self-hosted sin costos de licencia

### Alcance

| Aplicación | Estado | Integración SSO |
|------------|--------|-----------------|
| Monorepo BCA | Producción | Prioritaria |
| Futuras apps | Planificadas | Desde inicio |

---

## 2. Contexto y Motivación

### Situación Actual

El sistema actual de autenticación presenta las siguientes características:

**Fortalezas:**
- JWT con RS256 (firma asimétrica)
- bcrypt 12 rounds para hashing
- Sistema RBAC robusto con múltiples roles
- Multi-tenant con `empresaId`/`tenantEmpresaId`

**Debilidades:**
- No hay refresh tokens (token único de larga duración)
- Sin SSO real entre aplicaciones
- Sin MFA/2FA
- Sin OAuth externo (Google, Microsoft, Azure AD)
- Sesiones no revocables (JWT stateless)
- Cada aplicación futura requeriría reimplementar auth

### Necesidad

Se requiere un **Identity Provider autónomo** que:

1. Sea independiente de las aplicaciones que sirve
2. Permita SSO real entre múltiples aplicaciones
3. Centralice la gestión de usuarios e identidades
4. Soporte métodos de autenticación modernos (Passkeys, MFA)
5. Escale para futuras aplicaciones sin retrabajar
6. Opcionalmente integre con IdPs corporativos (Azure AD, Google Workspace)

---

## 3. Introspección del Stack Tecnológico Actual

### Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           NGINX (Reverse Proxy)                         │
│                    bca.microsyst.com.ar │ doc.microsyst.com.ar          │
└────────────────────────────┬───────────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    Frontend     │ │    Backend      │ │   Documentos    │
│   React 18 TS   │ │  Express 4.x    │ │   Express 5.x   │
│   Vite + Redux  │ │  Prisma + JWT   │ │  BullMQ + MinIO │
│   TailwindCSS   │ │    RS256        │ │   Socket.io     │
└─────────────────┘ └────────┬────────┘ └────────┬────────┘
                             │                   │
                    ┌────────┴───────────────────┴────────┐
                    ▼                                     ▼
            ┌───────────────┐                     ┌───────────────┐
            │  PostgreSQL   │                     │     Redis     │
            │      16       │                     │       7       │
            └───────────────┘                     └───────────────┘
```

### Stack Detallado

#### Frontend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 18.2 | UI Framework |
| TypeScript | 5.x | Tipado estático |
| Vite | 6.2 | Build tool |
| Redux Toolkit | 2.6 | Estado global + RTK Query |
| TailwindCSS | 3.4 | Estilos |
| Radix UI | 1.x | Componentes accesibles |
| React Router DOM | 7.5 | Routing |
| Zod | 3.x | Validación |
| Socket.io Client | 4.8 | WebSockets |

#### Backend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | ≥20 | Runtime |
| Express | 4.18 | Framework HTTP |
| TypeScript | 5.x | Tipado |
| Prisma | 6.12 | ORM |
| jsonwebtoken | 9.x | JWT RS256 |
| bcrypt | 6.0 | Hashing (12 rounds) |
| Winston | 3.x | Logging |
| Zod | 3.x | Validación |
| express-rate-limit | 7.x | Rate limiting |

#### Microservicios
| Servicio | Stack | Función |
|----------|-------|---------|
| `documentos` | Express 5, Prisma, MinIO, BullMQ | Gestión documental |
| `remitos` | Express 5, Prisma, Flowise | OCR e IA |

#### Infraestructura
| Componente | Tecnología |
|------------|------------|
| Contenedores | Docker + Docker Compose |
| Reverse Proxy | Nginx |
| Base de datos | PostgreSQL 16 |
| Cache/Queue | Redis 7 |
| Storage | MinIO (S3-compatible) |
| IA | Flowise |
| Process Manager | PM2 |

### Sistema de Autenticación Actual

#### Modelo de Datos (Prisma)

```prisma
model User {
  id                     Int        @id @default(autoincrement())
  email                  String     @unique
  password               String
  role                   UserRole   @default(OPERATOR)
  empresaId              Int?
  nombre                 String?
  apellido               String?
  activo                 Boolean    @default(true)
  mustChangePassword     Boolean    @default(false)
  
  // Asociaciones por rol
  dadorCargaId           Int?
  empresaTransportistaId Int?
  choferId               Int?
  clienteId              Int?
  
  @@map("platform_users")
}

enum UserRole {
  SUPERADMIN
  ADMIN
  OPERATOR
  OPERADOR_INTERNO
  ADMIN_INTERNO
  DADOR_DE_CARGA
  TRANSPORTISTA
  CHOFER
  CLIENTE
}
```

#### Flujo de Autenticación Actual

```
Usuario                    Frontend                   Backend
   │                          │                          │
   │── Ingresa credenciales ──►                          │
   │                          │── POST /api/auth/login ──►
   │                          │                          │
   │                          │◄── { token, user } ──────│
   │                          │                          │
   │                          │── Guarda en localStorage │
   │                          │                          │
   │◄── Redirect a dashboard ─│                          │
   │                          │                          │
   │    (Cada request)        │                          │
   │                          │── Authorization: Bearer ─►
   │                          │                          │
   │                          │── Verifica JWT RS256 ────│
   │                          │                          │
```

#### Middlewares de Autenticación

```typescript
// apps/backend/src/middlewares/auth.middleware.ts
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, getPublicKey(), { algorithms: ['RS256'] }) as TokenPayload;
  } catch {
    // Fallback legacy HS256
    const legacy = getLegacySecret();
    if (legacy) {
      try {
        return jwt.verify(token, legacy, { algorithms: ['HS256'] }) as TokenPayload;
      } catch {
        return null;
      }
    }
    return null;
  }
};
```

---

## 4. Análisis de Opciones de SSO

### Opciones Evaluadas

#### Self-Hosted (Open Source)

| Solución | Lenguaje | RAM Mínima | Multi-tenant | SAML | Madurez |
|----------|----------|------------|--------------|------|---------|
| **Keycloak** | Java | ~1GB | Realms | ✅ | ⭐⭐⭐⭐⭐ |
| **Zitadel** | Go | ~256MB | Organizations | ✅ | ⭐⭐⭐⭐ |
| **Authentik** | Python | ~512MB | Tenants | ✅ | ⭐⭐⭐⭐ |
| **Ory Stack** | Go | ~128MB | Manual | ❌ | ⭐⭐⭐⭐ |
| **Logto** | TypeScript | ~256MB | Organizations | ❌ | ⭐⭐⭐ |

#### SaaS (Gestionados)

| Servicio | Precio Inicial | MAU Gratis | Enterprise SSO |
|----------|---------------|------------|----------------|
| **Auth0** | $23/mes | 7K | ✅ |
| **Clerk** | Gratis | 10K | ✅ |
| **WorkOS** | $125/mes | - | ✅ |
| **Descope** | Gratis | 7.5K | ✅ |

### Matriz de Decisión

| Criterio | Peso | Keycloak | Zitadel | Authentik | Logto |
|----------|------|----------|---------|-----------|-------|
| Ligereza (recursos) | 20% | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Facilidad de setup | 20% | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Multi-tenant nativo | 15% | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| UI moderna | 10% | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Documentación | 10% | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Madurez/estabilidad | 15% | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Enterprise SSO (SAML) | 10% | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **TOTAL** | 100% | **72%** | **88%** | **80%** | **78%** |

### Decisión: Zitadel

**Zitadel** es la opción recomendada por:

1. **Arquitectura moderna**: Go, binario único, cloud-native
2. **Multi-tenancy desde el diseño**: "Organizations" como ciudadano de primera clase
3. **Recursos mínimos**: ~256MB RAM en producción
4. **Developer experience**: SDKs para Node.js y React
5. **Autenticación moderna**: Passkeys/WebAuthn nativo
6. **Sin vendor lock-in**: Open source, self-hosted

---

## 5. Evaluación Detallada: Zitadel

### Ficha Técnica

| Aspecto | Detalle |
|---------|---------|
| **Nombre** | Zitadel |
| **Origen** | Suiza (Zitadel Cloud GmbH) |
| **Licencia** | AGPL-3.0 (Open Source) |
| **Lenguaje** | Go |
| **Base de datos** | PostgreSQL ≥14 o CockroachDB |
| **Protocolos** | OIDC, OAuth 2.0, SAML 2.0 |
| **GitHub** | github.com/zitadel/zitadel (~9K stars) |

### Arquitectura de Zitadel

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ZITADEL                                       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Single Binary (Go)                         │   │
│  │                     ~50MB, sin JVM, sin Node                    │   │
│  │                                                                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │   │
│  │  │ gRPC API    │  │ REST API    │  │ Login UI (embebida)     │ │   │
│  │  │ (Admin)     │  │ (OIDC/OAuth)│  │ Personalizable          │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                 │                                       │
│                                 ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Event Store (CQRS)                           │   │
│  │              Arquitectura basada en eventos                     │   │
│  │          (Auditoría completa, replay de estados)                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                 │                                       │
│                                 ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              PostgreSQL 14+ / CockroachDB                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Modelo de Datos Jerárquico

```
Instance (instalación de Zitadel)
  │
  ├── Organization 1 (Empresa BCA)
  │     ├── Users (empleados, admins)
  │     ├── Projects
  │     │     ├── App: Monorepo BCA (client_id, client_secret)
  │     │     ├── App: Portal Clientes (client_id)
  │     │     └── App: API Móvil (client_id)
  │     └── Policies (MFA, password, branding)
  │
  ├── Organization 2 (Otra empresa)
  │     ├── Users
  │     └── Projects
  │           └── App: CRM (client_id)
  │
  └── Organization N...
```

### Características Principales

#### Métodos de Autenticación

| Método | Soportado | Notas |
|--------|-----------|-------|
| Email/Password | ✅ | Políticas de complejidad configurables |
| Passkeys (WebAuthn/FIDO2) | ✅ | Nativo, sin plugins |
| TOTP (Google Authenticator) | ✅ | MFA |
| SMS OTP | ✅ | Requiere proveedor SMS |
| Magic Links | ✅ | Passwordless |
| Social Login | ✅ | Google, GitHub, Microsoft, etc. |
| Enterprise SSO (SAML/OIDC) | ✅ | Azure AD, Google Workspace, Okta |
| LDAP/Active Directory | ✅ | Sync de usuarios |

#### Actions (Extensibilidad)

Zitadel permite ejecutar JavaScript en sandbox para personalizar flujos:

```javascript
// Ejemplo: Agregar claims custom al token
function enrich(ctx, api) {
  // Leer metadata del usuario
  const empresaId = ctx.user.metadata['empresa_id'];
  const role = ctx.user.metadata['role'];
  
  // Agregar al token
  api.claims.setClaim('custom:empresa_id', empresaId);
  api.claims.setClaim('custom:role', role);
}
```

**Eventos disponibles:**
- Pre/Post Registration
- Pre/Post Login
- Pre Token Creation
- Password Change
- User Deactivation

### Requisitos de Infraestructura

| Recurso | Mínimo | Recomendado Producción |
|---------|--------|------------------------|
| RAM | 256MB | 512MB - 1GB |
| CPU | 1 core | 2 cores |
| Disco | 1GB | 10GB+ (eventos) |
| PostgreSQL | 14+ | 16 |

### Comparativa de Recursos: Zitadel vs Keycloak

| Métrica | Zitadel | Keycloak |
|---------|---------|----------|
| RAM en reposo | ~200MB | ~500MB-1GB |
| Tiempo de inicio | ~5 segundos | ~30-60 segundos |
| Tamaño imagen Docker | ~50MB | ~400MB+ |
| Runtime | Go (nativo) | Java (JVM) |

### Modelo de Precios

#### Self-Hosted (AGPL-3.0)
- **Costo**: $0 (Gratis)
- **Límites**: Ninguno
- **Requisito AGPL**: Si modificas código, debes publicar cambios

#### Cloud (Gestionado)
| Plan | Precio | Incluye |
|------|--------|---------|
| Free | $0 | 25K MAU, 3 organizaciones |
| Pro | Desde $100/mes | MAU ilimitados, SLA 99.9% |
| Enterprise | Custom | Dedicated, compliance, support |

**Recomendación**: Self-hosted (ya existe infraestructura Docker + PostgreSQL).

---

## 6. Arquitectura Propuesta

### Diagrama General

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     ZITADEL (IdP Autónomo)                              │
│                   auth.microsyst.com.ar                                 │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Instancia Docker independiente                                 │   │
│  │  DB: PostgreSQL (schema separado: zitadel)                      │   │
│  │  Puerto: 8080 (interno) → 443 (nginx con SSL)                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Org: BCA    │  │ Org: CRM    │  │ Org: ERP    │  │ Org: ...    │   │
│  │ (Tenant 1)  │  │ (Tenant 2)  │  │ (Tenant 3)  │  │             │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                    OIDC/OAuth 2.0    │
       ┌──────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                              ▼
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│ Monorepo BCA     │        │ Proyecto CRM     │        │ App Móvil        │
│ bca.microsyst    │        │ crm.microsyst    │        │ (iOS/Android)    │
│                  │        │                  │        │                  │
│ - Backend valida │        │ - Mismo flujo    │        │ - PKCE flow      │
│   tokens OIDC    │        │   OIDC           │        │                  │
│ - Frontend usa   │        │                  │        │                  │
│   SDK React      │        │                  │        │                  │
└──────────────────┘        └──────────────────┘        └──────────────────┘
```

### Flujo de SSO

```
Usuario accede a bca.microsyst.com.ar
        │
        ▼
┌─────────────────────────┐
│ ¿Tiene token válido?    │──── Sí ────► Acceso directo a la app
└───────────┬─────────────┘
            │ No
            ▼
Redirect a auth.microsyst.com.ar/oauth/v2/authorize
        │
        ▼
┌─────────────────────────┐
│ ¿Sesión activa en       │
│ Zitadel?                │──── Sí ────► SSO: No pide credenciales
└───────────┬─────────────┘              │
            │ No                         │
            ▼                            │
┌─────────────────────────┐              │
│ Login UI de Zitadel     │              │
│ (Passkey, Password,     │              │
│  Google, etc.)          │              │
└───────────┬─────────────┘              │
            │                            │
            ▼                            │
Usuario se autentica (una sola vez)      │
            │                            │
            └──────────┬─────────────────┘
                       ▼
Redirect a bca.microsyst.com.ar/callback?code=xxx
        │
        ▼
Frontend intercambia code por tokens (access_token, id_token, refresh_token)
        │
        ▼
Usuario accede a BCA
        │
        ▼
Si luego va a crm.microsyst.com.ar → SSO automático (no login)
```

### Integración con Aplicaciones

#### Backend (Node.js/Express)

```
Backend                                 Zitadel
   │                                       │
   │  1. Recibe request con Bearer token   │
   │                                       │
   │  2. Obtiene JWKS ─────────────────────►│
   │     GET /.well-known/jwks.json        │
   │                                       │
   │◄────── { keys: [...] } ───────────────│
   │                                       │
   │  3. Verifica firma JWT localmente     │
   │     (no necesita llamar a Zitadel     │
   │      en cada request)                 │
   │                                       │
   │  4. Extrae claims: userId, email,     │
   │     role, empresaId, etc.             │
   │                                       │
   │  5. Autoriza según RBAC local         │
   └───────────────────────────────────────┘
```

**Librerías recomendadas:**
- `openid-client` - Cliente OIDC oficial para Node.js
- `jose` - Validación de JWTs y JWKS
- `@zitadel/node` - SDK oficial (opcional)

#### Frontend (React)

**Librerías recomendadas:**
- `@zitadel/react` - SDK oficial
- `oidc-client-ts` - Cliente OIDC genérico
- `react-oidc-context` - Context wrapper

**Flujo:**
1. Usuario clickea "Login"
2. Redirect a Zitadel (`/oauth/v2/authorize`)
3. Usuario se autentica
4. Redirect de vuelta con `code`
5. Intercambio code → tokens
6. `access_token` en memoria, `refresh_token` en httpOnly cookie

### Mapeo de Roles

| Rol en Zitadel | Rol en App BCA | Permisos |
|----------------|----------------|----------|
| `org:admin` | SUPERADMIN | Acceso total |
| `project:bca:admin` | ADMIN | Admin de BCA |
| `project:bca:operator` | OPERATOR | Operador |
| `project:bca:dador` | DADOR_DE_CARGA | Solo su dador |
| `project:bca:transportista` | TRANSPORTISTA | Solo su empresa |
| `project:bca:chofer` | CHOFER | Solo su perfil |
| `project:bca:cliente` | CLIENTE | Solo lectura |

---

## 7. Guía de Instalación

### Opción A: Docker Compose (PoC Rápido)

#### Estructura de archivos

```
zitadel/
├── docker-compose.yml
├── machinekey/           # Se genera automáticamente
└── data/                 # Persistencia PostgreSQL
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  zitadel:
    image: ghcr.io/zitadel/zitadel:latest
    container_name: zitadel
    restart: unless-stopped
    command: start-from-init --masterkey "MustBe32CharactersLongMasterKey!" --tlsMode disabled
    environment:
      # Base de datos
      ZITADEL_DATABASE_POSTGRES_HOST: zitadel-db
      ZITADEL_DATABASE_POSTGRES_PORT: 5432
      ZITADEL_DATABASE_POSTGRES_DATABASE: zitadel
      ZITADEL_DATABASE_POSTGRES_USER_USERNAME: zitadel
      ZITADEL_DATABASE_POSTGRES_USER_PASSWORD: zitadel-password
      ZITADEL_DATABASE_POSTGRES_USER_SSL_MODE: disable
      ZITADEL_DATABASE_POSTGRES_ADMIN_USERNAME: postgres
      ZITADEL_DATABASE_POSTGRES_ADMIN_PASSWORD: postgres-password
      ZITADEL_DATABASE_POSTGRES_ADMIN_SSL_MODE: disable
      
      # URLs externas
      ZITADEL_EXTERNALDOMAIN: localhost
      ZITADEL_EXTERNALPORT: 8080
      ZITADEL_EXTERNALSECURE: "false"
      
      # Primer usuario admin
      ZITADEL_FIRSTINSTANCE_ORG_HUMAN_USERNAME: admin@localhost
      ZITADEL_FIRSTINSTANCE_ORG_HUMAN_PASSWORD: Admin123!
    ports:
      - "8080:8080"
    volumes:
      - ./machinekey:/machinekey
    depends_on:
      zitadel-db:
        condition: service_healthy
    networks:
      - zitadel-network

  zitadel-db:
    image: postgres:16-alpine
    container_name: zitadel-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres-password
      POSTGRES_DB: zitadel
    volumes:
      - ./data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d zitadel"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - zitadel-network

networks:
  zitadel-network:
    driver: bridge
```

#### Comandos

```bash
# Crear directorio
mkdir -p ~/zitadel && cd ~/zitadel

# Crear docker-compose.yml
nano docker-compose.yml

# Iniciar
docker compose up -d

# Ver logs
docker compose logs -f zitadel

# Acceso: http://localhost:8080/ui/console
# Usuario: admin@localhost
# Password: Admin123!
```

### Opción B: Usar PostgreSQL Existente

#### Preparar la base de datos

```sql
-- Conectar a PostgreSQL
psql -h 10.3.0.244 -U postgres

-- Crear base de datos y usuario
CREATE DATABASE zitadel;
CREATE USER zitadel_user WITH PASSWORD 'password_seguro';
GRANT ALL PRIVILEGES ON DATABASE zitadel TO zitadel_user;

-- Permisos para crear schema (temporal)
ALTER USER zitadel_user WITH SUPERUSER;
-- Después del primer inicio: ALTER USER zitadel_user WITH NOSUPERUSER;
```

#### docker-compose.yml (Solo Zitadel)

```yaml
version: '3.8'

services:
  zitadel:
    image: ghcr.io/zitadel/zitadel:latest
    container_name: zitadel
    restart: unless-stopped
    command: start-from-init --masterkey "${ZITADEL_MASTERKEY}" --tlsMode disabled
    environment:
      ZITADEL_DATABASE_POSTGRES_HOST: ${DB_HOST}
      ZITADEL_DATABASE_POSTGRES_PORT: 5432
      ZITADEL_DATABASE_POSTGRES_DATABASE: zitadel
      ZITADEL_DATABASE_POSTGRES_USER_USERNAME: zitadel_user
      ZITADEL_DATABASE_POSTGRES_USER_PASSWORD: ${ZITADEL_DB_PASSWORD}
      ZITADEL_DATABASE_POSTGRES_USER_SSL_MODE: disable
      ZITADEL_DATABASE_POSTGRES_ADMIN_USERNAME: ${DB_USER}
      ZITADEL_DATABASE_POSTGRES_ADMIN_PASSWORD: ${DB_PASSWORD}
      ZITADEL_DATABASE_POSTGRES_ADMIN_SSL_MODE: disable
      
      ZITADEL_EXTERNALDOMAIN: auth.microsyst.com.ar
      ZITADEL_EXTERNALPORT: 443
      ZITADEL_EXTERNALSECURE: "true"
      
      ZITADEL_FIRSTINSTANCE_ORG_HUMAN_USERNAME: admin@microsyst.com.ar
      ZITADEL_FIRSTINSTANCE_ORG_HUMAN_PASSWORD: ${ZITADEL_ADMIN_PASSWORD}
    ports:
      - "8080:8080"
    volumes:
      - ./machinekey:/machinekey
    networks:
      - backend

networks:
  backend:
    external: true
```

### Opción C: Producción con Nginx SSL

#### Agregar a nginx.conf

```nginx
# ================================
# ZITADEL IDENTITY PROVIDER
# ================================
server {
    listen 80;
    server_name auth.microsyst.com.ar;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name auth.microsyst.com.ar;
    
    ssl_certificate /etc/nginx/ssl/auth.microsyst.com.ar.crt;
    ssl_certificate_key /etc/nginx/ssl/auth.microsyst.com.ar.key;
    
    # Security headers
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://zitadel:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

### Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `ZITADEL_EXTERNALDOMAIN` | Dominio público | `auth.microsyst.com.ar` |
| `ZITADEL_EXTERNALPORT` | Puerto público | `443` |
| `ZITADEL_EXTERNALSECURE` | HTTPS | `true` |
| `ZITADEL_MASTERKEY` | Clave encriptación (32 chars) | `MustBe32CharactersLong...` |
| `ZITADEL_DATABASE_POSTGRES_HOST` | Host PostgreSQL | `10.3.0.244` |
| `ZITADEL_FIRSTINSTANCE_ORG_HUMAN_USERNAME` | Admin inicial | `admin@microsyst.com.ar` |
| `ZITADEL_FIRSTINSTANCE_ORG_HUMAN_PASSWORD` | Password admin | `SecurePassword123!` |

---

## 8. Plan de Migración

### Fase 1: Instalación y Configuración (Semana 1)

| Tarea | Duración | Responsable |
|-------|----------|-------------|
| Instalar Zitadel en ambiente de desarrollo | 1 día | DevOps |
| Configurar SSL y DNS | 1 día | DevOps |
| Crear Organization "BCA" | 0.5 día | Dev |
| Registrar app BCA como cliente OIDC | 0.5 día | Dev |
| Documentar configuración | 1 día | Dev |

### Fase 2: Integración Backend (Semana 2)

| Tarea | Duración | Responsable |
|-------|----------|-------------|
| Instalar librerías OIDC (openid-client, jose) | 0.5 día | Backend |
| Crear middleware de validación OIDC | 1 día | Backend |
| Mantener compatibilidad con JWT actual (dual mode) | 1 día | Backend |
| Mapear claims de Zitadel a roles locales | 1 día | Backend |
| Tests de integración | 1.5 días | Backend |

### Fase 3: Integración Frontend (Semana 3)

| Tarea | Duración | Responsable |
|-------|----------|-------------|
| Instalar SDK Zitadel React | 0.5 día | Frontend |
| Refactorizar AuthSlice para OIDC | 1.5 días | Frontend |
| Implementar flujo de login con redirect | 1 día | Frontend |
| Manejar refresh tokens silenciosos | 1 día | Frontend |
| Tests E2E | 1 día | Frontend |

### Fase 4: Migración de Usuarios (Semana 4)

| Tarea | Duración | Responsable |
|-------|----------|-------------|
| Script de exportación de usuarios actuales | 1 día | Backend |
| Importar usuarios a Zitadel (API o CSV) | 1 día | Backend |
| Enviar emails de reset password | 0.5 día | Backend |
| Período de migración gradual (dual auth) | 2 días | Equipo |
| Desactivar auth legacy | 0.5 día | Backend |

### Fase 5: Producción (Semana 5)

| Tarea | Duración | Responsable |
|-------|----------|-------------|
| Deploy Zitadel en producción | 1 día | DevOps |
| Configurar backups de Zitadel DB | 0.5 día | DevOps |
| Monitoreo y alertas | 0.5 día | DevOps |
| Comunicación a usuarios | 1 día | PM |
| Go-live y soporte | 2 días | Equipo |

---

## 9. Consideraciones de Seguridad

### Buenas Prácticas

| Aspecto | Recomendación |
|---------|---------------|
| **MASTERKEY** | Generar con `openssl rand -hex 16` y guardar en vault |
| **SSL/TLS** | Obligatorio en producción (Let's Encrypt o certs propios) |
| **Cookies** | `httpOnly`, `Secure`, `SameSite=Strict` |
| **Tokens** | Access token corto (15min), refresh largo (7d) |
| **MFA** | Habilitar TOTP o Passkeys para admins |
| **Rate Limiting** | Configurar en nginx y Zitadel |
| **Audit Logs** | Habilitar y retener por compliance |

### Checklist de Seguridad Pre-Go-Live

- [ ] MASTERKEY almacenada en vault/secrets manager
- [ ] SSL/TLS configurado con certificado válido
- [ ] Headers de seguridad en nginx (HSTS, X-Frame-Options, etc.)
- [ ] MFA habilitado para usuarios administrativos
- [ ] Políticas de password configuradas (mínimo 12 chars, complejidad)
- [ ] Rate limiting activo
- [ ] Backups automáticos de la DB de Zitadel
- [ ] Monitoreo de logs de autenticación
- [ ] Plan de respuesta a incidentes documentado

---

## 10. Cronograma Estimado

```
Semana 1      Semana 2      Semana 3      Semana 4      Semana 5
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Instalación │ Integración │ Integración │ Migración   │ Go-Live     │
│ y Config    │ Backend     │ Frontend    │ Usuarios    │ Producción  │
│             │             │             │             │             │
│ - Zitadel   │ - Middleware│ - SDK React │ - Export    │ - Deploy    │
│ - SSL/DNS   │ - OIDC      │ - AuthSlice │ - Import    │ - Backups   │
│ - Org BCA   │ - Mapeo     │ - Redirect  │ - Dual auth │ - Monitor   │
│ - App OIDC  │ - Tests     │ - Refresh   │ - Cutover   │ - Soporte   │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

Total estimado: 5 semanas
```

---

## 11. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Downtime durante migración** | Media | Alto | Período de dual auth, rollback plan |
| **Usuarios no migran passwords** | Media | Medio | Magic links, comunicación clara |
| **Incompatibilidad con apps legacy** | Baja | Alto | Mantener endpoint legacy temporal |
| **Zitadel tiene vulnerabilidad** | Baja | Alto | Monitorear CVEs, actualizar rápido |
| **Performance degradado** | Baja | Medio | Cache de JWKS, validación local |
| **Pérdida de MASTERKEY** | Muy baja | Crítico | Backup en múltiples lugares seguros |

---

## 12. Referencias

### Documentación Oficial

- [Zitadel Docs](https://zitadel.com/docs)
- [Zitadel Self-Hosting Guide](https://zitadel.com/docs/self-hosting/deploy/overview)
- [Zitadel Node.js SDK](https://github.com/zitadel/zitadel-node)
- [Zitadel React SDK](https://github.com/zitadel/zitadel-react)

### Especificaciones

- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)

### Recursos Internos

- [ADR: RS256 y Tenant](./ADR_RS256_TENANT.md)
- [Permisos y Roles del Sistema](./PERMISOS_Y_ROLES_SISTEMA.md)
- [Docker Compose Dev](./docker-compose.dev.yml)

---

## Apéndice A: Glosario

| Término | Definición |
|---------|------------|
| **IdP** | Identity Provider - Servicio que gestiona identidades y autenticación |
| **SSO** | Single Sign-On - Autenticación única para múltiples aplicaciones |
| **OIDC** | OpenID Connect - Protocolo de identidad sobre OAuth 2.0 |
| **OAuth 2.0** | Protocolo de autorización para acceso delegado |
| **SAML** | Security Assertion Markup Language - Protocolo enterprise SSO |
| **JWT** | JSON Web Token - Token firmado para transmitir claims |
| **JWKS** | JSON Web Key Set - Conjunto de claves públicas para verificar JWTs |
| **PKCE** | Proof Key for Code Exchange - Extensión OAuth para apps públicas |
| **MFA** | Multi-Factor Authentication - Autenticación de múltiples factores |
| **Passkeys** | Credenciales WebAuthn/FIDO2 sin contraseña |

---

## Apéndice B: Checklist de Implementación

### Pre-requisitos
- [ ] Dominio `auth.microsyst.com.ar` apuntando al servidor
- [ ] Certificado SSL para el dominio
- [ ] PostgreSQL 16 disponible
- [ ] Docker y Docker Compose instalados

### Instalación
- [ ] Zitadel desplegado y accesible
- [ ] Admin puede iniciar sesión
- [ ] Organization creada
- [ ] Project y App OIDC configurados

### Backend
- [ ] Middleware OIDC implementado
- [ ] Dual auth funcionando (legacy + OIDC)
- [ ] Claims mapeados a roles
- [ ] Tests pasando

### Frontend
- [ ] SDK instalado y configurado
- [ ] Login redirect funcionando
- [ ] Refresh token automático
- [ ] Logout funciona correctamente

### Migración
- [ ] Script de migración probado
- [ ] Usuarios importados
- [ ] Comunicación enviada
- [ ] Legacy auth desactivado

### Producción
- [ ] Deploy en producción
- [ ] Backups configurados
- [ ] Monitoreo activo
- [ ] Documentación actualizada

---

**Documento creado**: 26 de Diciembre, 2025  
**Última actualización**: 26 de Diciembre, 2025  
**Versión**: 1.0  
**Estado**: En Evaluación

