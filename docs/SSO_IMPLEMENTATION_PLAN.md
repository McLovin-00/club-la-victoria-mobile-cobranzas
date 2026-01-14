# PLAN DE IMPLEMENTACIÓN: SINGLE SIGN-ON (SSO) CENTRALIZADO

> **Proyecto**: Sistema de Autenticación Unificada para BCA  
> **Fecha**: Enero 2026  
> **Estado**: En planificación  
> **Owner**: DevOps/Backend Lead  

---

## 📋 RESUMEN EJECUTIVO

### Objetivo

Implementar un sistema de **Single Sign-On (SSO)** centralizado que permita a los usuarios de BCA autenticarse una sola vez y acceder a todas las aplicaciones de la organización:

- ✅ Monorepo BCA (sistema actual)
- 🔄 Monorepo Logística (en desarrollo)
- 🔄 Monorepo Inventario (planificado)
- 🔄 Otras aplicaciones futuras
- 🔄 Acceso a la red corporativa (opcional)

### Solución Propuesta

**Zitadel** - Plataforma moderna de Identity and Access Management (IAM) open source con multi-tenancy nativo

### Beneficios Clave

| Beneficio | Descripción | Impacto |
|-----------|-------------|---------|
| **UX Mejorada** | Una sola credencial para todas las apps | Alto |
| **Seguridad** | Gestión centralizada de políticas | Alto |
| **Administración** | Onboarding/offboarding simplificado | Alto |
| **Auditoría** | Logs centralizados de accesos | Medio |
| **Escalabilidad** | Soporte para múltiples aplicaciones | Alto |
| **Cumplimiento** | Integración con AD/LDAP corporativo | Medio |

### Timeline

**Estimado**: 2-3 meses

**Fases**:
1. Setup y POC (2-3 semanas)
2. Configuración roles/permisos (1-2 semanas)
3. Deploy Staging (1 semana)
4. Migración Producción (2 semanas)
5. Integración apps futuras (continuo)

---

## 🎯 ALCANCE DEL PROYECTO

### En Alcance

- ✅ Instalación y configuración de Zitadel
- ✅ Integración con Monorepo BCA (actual)
- ✅ Migración de usuarios existentes
- ✅ Configuración de roles y permisos
- ✅ Setup de organizations, projects y applications
- ✅ Documentación completa
- ✅ Training para administradores

### Fuera de Alcance (Fase 1)

- ❌ Integración con Active Directory (Fase 2)
- ❌ Multi-factor Authentication (MFA) (Fase 2)
- ❌ Integración con otras apps (se hará gradualmente)
- ❌ Single Logout federado completo (Fase 2)

---

## 🏗️ ARQUITECTURA PROPUESTA

### Diagrama de Alto Nivel

```
                    USUARIOS
                       │
                       ▼
        ┌──────────────────────────┐
        │    NAVEGADOR WEB         │
        └──────────┬───────────────┘
                   │
                   │ HTTPS
                   ▼
        ┌──────────────────────────┐
        │    NGINX (Reverse Proxy) │
        │    sso.bca.com.ar        │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │    ZITADEL               │
        │    Puerto: 8080          │
        │    OpenID Connect        │
        │    OAuth 2.0             │
        │    Multi-Tenant Nativo   │
        └──────────┬───────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────┐    ┌──────────────┐
│ PostgreSQL   │    │ Redis (opt)  │
│ (Zitadel DB) │    │ (Cache)      │
│ Event-Source │    │              │
└──────────────┘    └──────────────┘


APLICACIONES CLIENTE:
════════════════════

┌─────────────────────────────────────┐
│  app.bca.com.ar (Monorepo BCA)     │
│  Client Type: public (SPA)          │
│  Flow: Authorization Code + PKCE   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  logistica.bca.com.ar (Futuro)     │
│  Client Type: public                │
│  Flow: Authorization Code + PKCE   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  api.bca.com.ar (Backend API)      │
│  Client Type: bearer-only           │
│  Validación de tokens solamente     │
└─────────────────────────────────────┘
```

### Flujo de Autenticación (Authorization Code Flow con PKCE)

```
1. Usuario accede a app.bca.com.ar
   │
2. Frontend detecta no autenticado
   │
3. Genera code_verifier y code_challenge (PKCE)
   │
4. Redirige a Zitadel:
   GET https://sso.bca.com.ar/oauth/v2/authorize
   ?client_id=<client_id>
   &redirect_uri=https://app.bca.com.ar/callback
   &response_type=code
   &scope=openid profile email urn:zitadel:iam:org:project:id:zitadel:aud
   &code_challenge=<hash>
   &code_challenge_method=S256
   │
5. Usuario ingresa credenciales en Zitadel
   │
6. Zitadel valida credenciales
   │
7. Zitadel redirige a app con authorization code:
   https://app.bca.com.ar/callback?code=abc123...
   │
8. Frontend intercambia code por tokens:
   POST https://sso.bca.com.ar/oauth/v2/token
   {
     grant_type: "authorization_code",
     code: "abc123...",
     redirect_uri: "https://app.bca.com.ar/callback",
     client_id: "<client_id>",
     code_verifier: "<original>"
   }
   │
9. Zitadel responde con tokens:
   {
     access_token: "eyJhbGc...",  (1 hora)
     refresh_token: "eyJhbGc...", (30 días)
     id_token: "eyJhbGc...",
     token_type: "Bearer",
     expires_in: 3600
   }
   │
10. Frontend almacena tokens (httpOnly cookie preferido o localStorage)
    │
11. Frontend hace requests a API con Access Token:
    Authorization: Bearer <access_token>
    │
12. API valida token con JWKS de Zitadel o introspección
    │
13. API responde con datos
```

---

## 🛠️ ESPECIFICACIÓN TÉCNICA

### Zitadel

**Versión**: v2.x (latest stable)

**Stack**:
- Go (lenguaje nativo)
- gRPC + HTTP/2
- PostgreSQL 16 (base de datos con event-sourcing)
- Redis (opcional, para cache de proyecciones)

**Características Diferenciales**:
- Multi-tenancy nativo (organizations)
- Event-sourcing architecture
- API-first design (gRPC + REST)
- UI moderna y responsive
- Actions (webhooks y custom logic)
- Rendimiento superior vs Keycloak

**Requisitos de Hardware**:

| Ambiente | CPU | RAM | Disco |
|----------|-----|-----|-------|
| **Development** | 2 cores | 1 GB | 10 GB |
| **Staging** | 2 cores | 2 GB | 20 GB |
| **Producción** | 4 cores | 4 GB | 50 GB |

**Configuración Docker**:

```yaml
# docker-compose.zitadel.yml
version: '3.9'

services:
  zitadel:
    image: ghcr.io/zitadel/zitadel:latest
    container_name: zitadel
    command: 'start-from-init --masterkeyFromEnv --tlsMode external'
    environment:
      # Database
      ZITADEL_DATABASE_POSTGRES_HOST: postgres
      ZITADEL_DATABASE_POSTGRES_PORT: 5432
      ZITADEL_DATABASE_POSTGRES_DATABASE: zitadel
      ZITADEL_DATABASE_POSTGRES_USER_USERNAME: zitadel
      ZITADEL_DATABASE_POSTGRES_USER_PASSWORD: ${ZITADEL_DB_PASSWORD}
      ZITADEL_DATABASE_POSTGRES_USER_SSL_MODE: disable
      ZITADEL_DATABASE_POSTGRES_ADMIN_USERNAME: postgres
      ZITADEL_DATABASE_POSTGRES_ADMIN_PASSWORD: ${POSTGRES_PASSWORD}
      ZITADEL_DATABASE_POSTGRES_ADMIN_SSL_MODE: disable
      
      # External Domain
      ZITADEL_EXTERNALDOMAIN: sso.bca.com.ar
      ZITADEL_EXTERNALPORT: 443
      ZITADEL_EXTERNALSECURE: true
      ZITADEL_TLS_ENABLED: false  # TLS terminado en Nginx
      
      # Master Key (encryption at rest)
      ZITADEL_MASTERKEY: ${ZITADEL_MASTERKEY}
      
      # First Instance (admin)
      ZITADEL_FIRSTINSTANCE_ORG_NAME: BCA
      ZITADEL_FIRSTINSTANCE_ORG_HUMAN_USERNAME: admin
      ZITADEL_FIRSTINSTANCE_ORG_HUMAN_PASSWORD: ${ZITADEL_ADMIN_PASSWORD}
      
      # Logging
      ZITADEL_LOG_LEVEL: info
      ZITADEL_LOG_FORMATTER_FORMAT: json
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - zitadel_data:/data
    networks:
      - zitadel-net
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8080/debug/healthz"]
      interval: 30s
      timeout: 10s
      retries: 5

  postgres:
    image: postgres:16-alpine
    container_name: zitadel-postgres
    environment:
      POSTGRES_DB: zitadel
      POSTGRES_USER: zitadel
      POSTGRES_PASSWORD: ${KEYCLOAK_DB_PASSWORD}
    volumes:
      - zitadel_pg_data:/var/lib/postgresql/data
    networks:
      - zitadel-net

volumes:
  zitadel_data:
  zitadel_pg_data:

networks:
  zitadel-net:
    driver: bridge
```

### Configuración de Organization y Project

**Organization**: `BCA` (organización principal)

**Project**: `BCA-Apps` (proyecto que agrupa todas las aplicaciones)

**Configuración de Organization**:
```yaml
Organization:
  Name: BCA
  Domain: bca.com.ar
  
  # Políticas de Seguridad
  Password Policy:
    MinLength: 8
    RequireUppercase: true
    RequireLowercase: true
    RequireNumber: true
    RequireSymbol: false
    MaxAgeDays: 90
    
  Lockout Policy:
    MaxPasswordAttempts: 5
    ShowLockoutFailures: true
    
  Privacy Policy:
    TOSLink: https://bca.com.ar/terms
    PrivacyLink: https://bca.com.ar/privacy
    HelpLink: https://soporte.bca.com.ar
    
  # Branding
  LoginSettings:
    AllowUsernamePassword: true
    AllowRegister: false
    AllowExternalIDP: false
    ForceMFA: false  # Fase 2
    HidePasswordReset: false
    
  # Session Configuration
  AccessTokenLifetime: 3600s  # 1 hora
  IDTokenLifetime: 3600s
  RefreshTokenIdleExpiration: 2592000s  # 30 días
  RefreshTokenExpiration: 7776000s  # 90 días
```

**Configuración de Project**:
```yaml
Project:
  Name: BCA-Apps
  HasProjectCheck: true  # Validar proyecto en tokens
  PrivateLabelingSetting: ENFORCE_PROJECT_RESOURCE_OWNER_POLICY
  
  # Roles del Proyecto (sincronizados con sistema actual)
  Roles:
    - SUPERADMIN
    - ADMIN
    - OPERATOR
    - OPERADOR_INTERNO
    - ADMIN_INTERNO
    - DADOR_DE_CARGA
    - TRANSPORTISTA
    - CHOFER
    - CLIENTE
```

### Configuración de Clients

**Client 1: bca-frontend**

```json
{
  "clientId": "bca-frontend",
  "name": "BCA Frontend SPA",
  "description": "Monorepo BCA - Frontend React",
  "rootUrl": "https://app.bca.com.ar",
  "adminUrl": "https://app.bca.com.ar",
  "baseUrl": "/",
  "enabled": true,
  "clientAuthenticatorType": "client-secret",
  "redirectUris": [
    "https://app.bca.com.ar/*",
    "http://localhost:8550/*"
  ],
  "webOrigins": [
    "https://app.bca.com.ar",
    "http://localhost:8550"
  ],
  "publicClient": true,
  "protocol": "openid-connect",
  "attributes": {
    "pkce.code.challenge.method": "S256"
  },
  "standardFlowEnabled": true,
  "implicitFlowEnabled": false,
  "directAccessGrantsEnabled": false,
  "serviceAccountsEnabled": false,
  "defaultClientScopes": [
    "web-origins",
    "roles",
    "profile",
    "email"
  ]
}
```

**Client 2: bca-backend**

```json
{
  "clientId": "bca-backend",
  "name": "BCA Backend API",
  "description": "Monorepo BCA - Backend Express",
  "enabled": true,
  "bearerOnly": true,
  "protocol": "openid-connect"
}
```

### Configuración de Roles

**Project Roles** (aplicables a todas las apps del proyecto BCA-Apps):
- `SUPERADMIN` - Acceso total a todo el ecosistema BCA
- `ADMIN` - Administrador de su empresa
- `ADMIN_INTERNO` - Administrador interno de BCA
- `OPERATOR` - Operador estándar
- `OPERADOR_INTERNO` - Operador interno de BCA
- `DADOR_DE_CARGA` - Gestiona equipos y transportistas
- `TRANSPORTISTA` - Gestiona su flota
- `CHOFER` - Acceso limitado a sus datos
- `CLIENTE` - Consulta compliance documental

**Application-Specific Grants** (permisos por aplicación):

**bca-frontend**:
- `admin_interno` - Admin interno de plataforma
- `admin_dador` - Admin de empresa dadora de carga
- `transportista` - Usuario transportista
- `chofer` - Chofer

**Mapeo de Roles Actuales**:

| Rol Actual (Monorepo BCA) | Realm Role | Client Role |
|---------------------------|------------|-------------|
| SUPERADMIN | superadmin | admin_interno |
| ADMIN (empresa) | admin | admin_dador |
| USER | user | transportista |

---

## 📋 PLAN DE IMPLEMENTACIÓN

### Fase 1: Setup y Prueba de Concepto (2-3 semanas)

**Objetivos**:
- ✅ Zitadel funcionando en desarrollo
- ✅ Organization BCA configurada
- ✅ Frontend integrado con Zitadel
- ✅ Backend validando tokens de Zitadel
- ✅ POC completo con usuario de prueba

**Tareas**:

**Semana 1**:
1. Instalar Zitadel en servidor DEV (Docker Compose)
2. Configurar PostgreSQL para Zitadel
3. Acceder a Admin Console (http://localhost:8080)
4. Crear Realm "BCA"
5. Configurar clients (bca-frontend, bca-backend)
6. Crear usuario de prueba
7. Documentar configuración

**Semana 2**:
1. Integrar frontend con Zitadel
   - Instalar `@zitadel/react` o `oidc-client-ts`
   - Configurar redirect URIs
   - Implementar login/logout
   - Almacenar tokens
2. Probar flujo de autenticación completo
3. Implementar refresh token automático

**Semana 3**:
1. Adaptar backend para validar tokens de Zitadel
   - Obtener JWKS de Zitadel (https://sso.bca.com.ar/oauth/v2/keys)
   - Validar firma JWT
   - Extraer claims (roles, email, sub)
2. Mantener compatibilidad con sistema actual (dual mode)
3. Testing exhaustivo de integración
4. Ajustar configuración según resultados

**Entregables**:
- ✅ Keycloak funcionando en DEV
- ✅ Documentación de setup
- ✅ POC con flujo completo
- ✅ Report de testing

### Fase 2: Migración de Usuarios y Configuración de Roles (1-2 semanas)

**Objetivos**:
- ✅ Todos los usuarios migrados a Zitadel
- ✅ Roles mapeados correctamente
- ✅ Custom attributes configurados

**Tareas**:

**Semana 1**:
1. Exportar usuarios de BD actual (PostgreSQL)
   ```sql
   SELECT id, email, username, role, empresa_id, created_at
   FROM users
   WHERE active = true;
   ```
2. Transformar a formato de importación de Zitadel (API)
3. Importar usuarios a Zitadel via Management API o bulk import
4. Verificar importación correcta
5. Configurar custom attributes:
   - `empresaId`
   - `tenantId`
6. Mapear roles actuales a Zitadel project roles

**Semana 2**:
1. Configurar organizations en Zitadel (por empresa si multi-tenant)
2. Asignar usuarios a grupos
3. Configurar role mappings
4. Testing de permisos con diferentes roles
5. Ajustes finales

**Entregables**:
- ✅ Script de migración de usuarios
- ✅ Usuarios migrados exitosamente
- ✅ Roles configurados
- ✅ Documentación de mapeo de roles

### Fase 3: Deploy a Staging (1 semana)

**Objetivos**:
- ✅ Zitadel corriendo en Staging
- ✅ Aplicación Monorepo BCA integrada
- ✅ Testing con usuarios reales

**Tareas**:

**Días 1-2**:
1. Provisionar infraestructura en Staging:
   - Servidor Zitadel (Docker Swarm)
   - PostgreSQL dedicado para Zitadel
   - Redis para sesiones (opcional)
2. Configurar DNS: sso.staging.bca.com.ar
3. Configurar certificados SSL (Let's Encrypt)
4. Deploy de Zitadel

**Días 3-4**:
1. Importar configuración de DEV (Realm export)
2. Importar usuarios de producción (anonimizados)
3. Configurar Nginx para proxy a Zitadel
4. Deploy de Monorepo BCA apuntando a Zitadel
5. Smoke tests

**Día 5**:
1. Testing con usuarios del equipo (QA)
2. Validar flujos:
   - Login/Logout
   - Refresh token
   - Acceso a recursos protegidos
   - Manejo de errores
3. Ajustes y fixes

**Entregables**:
- ✅ Zitadel en Staging operativo
- ✅ App integrada y funcionando
- ✅ Report de testing en Staging

### Fase 4: Migración Gradual a Producción (2 semanas)

**Objetivos**:
- ✅ Zitadel en producción
- ✅ Migración gradual de usuarios
- ✅ Rollback plan listo
- ✅ 0 downtime

**Estrategia**: Blue-Green deployment con rollout gradual

**Semana 1: Preparación**:
1. Provisionar infraestructura en Producción:
   - Servidor Zitadel (Docker Swarm, 2+ réplicas)
   - PostgreSQL con replicación
   - Backups automáticos
2. Configurar DNS: sso.bca.com.ar
3. SSL/TLS configurado
4. Deploy de Zitadel
5. Importar configuración final
6. Testing exhaustivo

**Semana 2: Rollout Gradual**:

**Día 1-2: 10% usuarios (Canary)**:
1. Seleccionar 10% usuarios para migración inicial (equipo interno)
2. Notificar cambio (email + in-app notification)
3. Forzar logout de sistema actual
4. Usuarios hacen login con Zitadel
5. Monitoreo intensivo (Sentry, logs)
6. Recolectar feedback

**Día 3-4: 50% usuarios**:
1. Si canary OK, migrar 50% usuarios restantes
2. Notificación masiva
3. Monitoreo continuo
4. Soporte activo para dudas

**Día 5: 100% usuarios**:
1. Migración de todos los usuarios restantes
2. Deshabilitar sistema de auth antiguo (mantener como fallback 1 semana)
3. Monitoreo intensivo 24h
4. Celebración del equipo 🎉

**Rollback Plan**:
- Si falla > 5% de logins: Rollback inmediato
- Revertir a sistema antiguo (switch en backend)
- Investigar y resolver issues
- Reintento de migración cuando esté estable

**Entregables**:
- ✅ Zitadel en Producción operativo
- ✅ 100% usuarios migrados exitosamente
- ✅ Sistema antiguo deprecado
- ✅ Documentación de troubleshooting

### Fase 5: Integración de Apps Futuras (Continuo)

**Objetivo**: Onboarding de nuevas aplicaciones al SSO

**Proceso Estándar**:

1. **Registrar Application en Zitadel Project**
   - Crear nuevo client (ej: `logistica-frontend`)
   - Configurar redirect URIs
   - Configurar roles específicos

2. **Integrar App**
   - Usar librerías estándar (@zitadel/react, oidc-client-ts)
   - Implementar login/logout
   - Validar tokens

3. **Testing**
   - Flujo completo de autenticación
   - SSO funcionando (login en una app = login en todas)

4. **Deploy**

**Tiempo Estimado por App**: 1-2 semanas

---

## 🔐 SEGURIDAD

### Configuración de Seguridad Recomendada

**Zitadel**:
- ✅ HTTPS obligatorio (sslRequired: external)
- ✅ PKCE habilitado para SPAs
- ✅ Brute force protection activado
- ✅ Tokens con expiración corta (15 min access, 30 días refresh)
- ✅ Refresh token rotation habilitado
- ✅ Session idle timeout: 30 min
- ✅ Session max lifespan: 10 horas

**Network**:
- ✅ Zitadel en red privada, expuesto solo via Nginx
- ✅ PostgreSQL no expuesto públicamente
- ✅ Firewall rules estrictas

**Auditoría**:
- ✅ Zitadel events activados (login, logout, token refresh)
- ✅ Admin events activados (cambios de configuración)
- ✅ Logs centralizados (Winston + Sentry)

### Gestión de Credenciales

**Admin Password**:
- Mínimo 20 caracteres
- Almacenado en 1Password / Bitwarden
- Rotación cada 90 días

**Database Password**:
- Generado aleatoriamente (64 caracteres)
- Almacenado en .env (no versionado)
- Rotación cada 90 días

**Client Secrets** (si aplica):
- Generados aleatoriamente
- Almacenados en vault (HashiCorp Vault en futuro)

---

## 📊 MONITOREO Y OBSERVABILIDAD

### Métricas Clave

| Métrica | Threshold | Acción |
|---------|-----------|--------|
| **Tasa de Éxito de Login** | > 95% | Alerta si < 95% |
| **Response Time Login** | < 1s (p95) | Alerta si > 2s |
| **Disponibilidad Zitadel** | > 99.5% | Alerta si down |
| **Tokens Expirados/Revocados** | < 1% | Investigar si > 2% |

### Dashboards

**Grafana Dashboard** (futuro):
- Logins por hora
- Logins fallidos
- Usuarios activos
- Sessions concurrentes
- Response time de endpoints

### Alertas

**Críticas** (PagerDuty / Slack):
- Zitadel down
- PostgreSQL down
- Tasa de login fallidos > 10%

**Warnings** (Slack):
- Response time alto
- CPU/RAM alto
- Disco > 80%

---

## 🧪 TESTING

### Test Cases Críticos

**Login Flow**:
1. Login exitoso con credenciales válidas
2. Login fallido con credenciales inválidas
3. Login con usuario bloqueado (brute force)
4. Login con usuario inactivo
5. Redirect correcto después de login

**Token Management**:
1. Access token válido permite acceso
2. Access token expirado retorna 401
3. Refresh token renueva access token
4. Refresh token expirado requiere re-login
5. Logout invalida tokens

**SSO (Multiple Apps)**:
1. Login en App A → acceso directo a App B
2. Logout en App A → logout en App B (si single logout habilitado)

**Roles y Permisos**:
1. SUPERADMIN accede a todo
2. ADMIN accede solo a su empresa
3. USER accede solo a sus datos
4. Intento de acceso no autorizado retorna 403

### Herramientas de Testing

- **Postman**: Testing de flujos OAuth/OIDC
- **Playwright**: Tests E2E automatizados
- **Jest**: Tests unitarios de integración

---

## 📚 DOCUMENTACIÓN

### Documentos a Crear

1. **Admin Guide** - Cómo administrar Zitadel (crear usuarios, roles, applications)
2. **Developer Guide** - Cómo integrar nuevas apps con Zitadel
3. **User Guide** - Cómo usar el nuevo sistema de login (FAQ)
4. **Troubleshooting Guide** - Problemas comunes y soluciones
5. **Runbook** - Procedimientos operativos (backup, restore, upgrade)

### Training

**Administradores** (2 horas):
- Overview de Zitadel
- Cómo crear/editar usuarios
- Cómo gestionar roles y permisos
- Cómo revisar logs y eventos
- Troubleshooting básico

**Desarrolladores** (4 horas):
- Arquitectura de SSO
- OpenID Connect / OAuth 2.0
- Cómo integrar nuevas apps
- Best practices
- Debugging

**Usuarios Finales**:
- Video tutorial (5 min)
- FAQ page
- Email de onboarding

---

## 💰 ESTIMACIÓN DE COSTOS

### Infraestructura

| Recurso | Costo Mensual (USD) | Costo Anual (USD) |
|---------|---------------------|-------------------|
| **Servidor Zitadel** (4 cores, 4GB RAM) | $30 | $360 |
| **PostgreSQL** (para Zitadel) | $20 | $240 |
| **Disco** (50 GB SSD) | $10 | $120 |
| **Bandwidth** | $5 | $60 |
| **Backups** | $5 | $60 |
| **Total Infraestructura** | **$90** | **$1,080** |

### Recursos Humanos

| Rol | Horas | Costo/Hora | Total |
|-----|-------|------------|-------|
| **DevOps/Backend Senior** | 320h | $50 | $16,000 |
| **Developer Backend** | 160h | $35 | $5,600 |
| **QA Tester** | 80h | $25 | $2,000 |
| **Total RRHH** | 560h | - | **$23,600** |

### Costo Total del Proyecto

**One-time**: $23,600 (implementación)  
**Recurrente**: $90/mes ($1,080/año) (infraestructura)

---

## 🚧 RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Usuarios no pueden loguearse** | Media | Alto | Mantener sistema antiguo como fallback 1 semana |
| **Performance issues de Zitadel** | Baja | Alto | Testing de carga previo, 2+ réplicas en prod (Zitadel es más eficiente que Keycloak) |
| **Migración de usuarios falla** | Media | Alto | Script de migración testeado en staging primero |
| **Integración rompe app actual** | Baja | Alto | Feature flag para habilitar/deshabilitar SSO |
| **Zitadel down en producción** | Baja | Crítico | Alta disponibilidad (2+ réplicas), monitoreo 24/7 |

---

## ✅ CRITERIOS DE ÉXITO

| Criterio | Target | Medición |
|----------|--------|----------|
| **Tasa de Éxito de Login** | > 95% | Zitadel events logs |
| **Response Time Login** | < 2s (p95) | Monitoring (Grafana) |
| **Usuarios Migrados** | 100% | Count en Zitadel |
| **Downtime** | 0 minutos | Uptime monitoring |
| **Satisfacción de Usuarios** | > 80% | Encuesta post-migración |
| **Reducción en Tickets de Soporte** | > 20% | Comparar con mes anterior |

---

## 📞 CONTACTOS Y RESPONSABLES

| Rol | Nombre | Email | Responsabilidad |
|-----|--------|-------|-----------------|
| **Project Owner** | DevOps Lead | devops@bca.com.ar | Implementación técnica |
| **Stakeholder** | CTO / Founder | cto@bca.com.ar | Aprobaciones y decisiones |
| **Developer** | Backend Dev | backend@bca.com.ar | Integración de apps |
| **QA** | QA Lead | qa@bca.com.ar | Testing y validación |

---

## 🗓️ CRONOGRAMA CONSOLIDADO

```
MES 1                           MES 2                           MES 3
│                               │                               │
├─ Semana 1-3: POC              ├─ Semana 5-6: Migración       ├─ Semana 9-10: Producción
│  • Setup Zitadel              │  • Exportar usuarios          │  • Deploy Prod
│  • Configurar organization    │  • Importar a Zitadel         │  • Rollout 10% (Day 1-2)
│  • Integrar frontend          │  • Mapear roles               │  • Rollout 50% (Day 3-4)
│  • Adaptar backend            │  • Testing permisos           │  • Rollout 100% (Day 5)
│  • Testing POC                │                               │  • Monitoreo 24h
│                               │                               │
├─ Semana 4: Staging            ├─ Semana 7: Preparación Prod  ├─ Semana 11-12: Post-Launch
│  • Deploy Staging             │  • Provisionar infra          │  • Monitoreo continuo
│  • Importar config            │  • Deploy Zitadel             │  • Soporte usuarios
│  • Testing con equipo         │  • Testing exhaustivo         │  • Docs finales
│  • Ajustes finales            │  • Backup plan                │  • Training
│                               │                               │  • Retro del proyecto
```

---

**Documento elaborado**: 14 Enero 2026  
**Próxima revisión**: Post-implementación  
**Versión**: 1.0  

---

Para consultas sobre este plan, contactar al equipo de DevOps en Slack #devops o vía email.
