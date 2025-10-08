# Entornos y Normas Operativas

> **Alineado con**: Manual Operativo Microsyst (Startup + Staging)  
> **Principio**: DEV → Staging → Producción (nada llega a Prod sin pasar por Staging)

Este documento define cómo trabajamos en cada ambiente, cuál es la fuente de verdad para orquestación, variables y despliegues. La meta es tener entornos **reproducibles, seguros y predecibles**.

---

## Principios Fundamentales

### 1. Simplicidad (KISS)
- Sin sobre-ingeniería
- Scripts directos y comprensibles
- Configuración explícita sobre convención mágica

### 2. Paridad (Staging ≈ Producción)
- Staging debe ser lo más cercano posible a Producción
- Mismo stack de contenedores (Docker Swarm)
- Mismas configuraciones (solo difieren datos y secretos)

### 3. Determinismo
- `.env` en la raíz del repo (plantillas versionadas)
- Nunca credenciales hardcodeadas en código
- Variables explícitas, documentadas en `.env.example`

### 4. No Mezclar
- **PM2**: NUNCA se usa en este proyecto
- **Producción/Staging**: 100% contenedores (Docker Swarm)
- **DEV/Testing**: Opciones flexibles (scripts locales o Docker Compose)

---

## Puertos y Variables Clave (Política)

### Puertos Estándar
```bash
BACKEND_PORT=4800          # API principal
FRONTEND_PORT=8550         # SPA React
DOCUMENTOS_PORT=4802       # Microservicio documental
```

### Variables Core
- Cargar con `dotenv-cli` en scripts locales
- Claves JWT RS256 vía `JWT_PUBLIC_KEY_PATH` / `JWT_PRIVATE_KEY_PATH`
- **Nunca** en código fuente

---

## 1. Development (Local de cada Dev)

### Objetivo
Escribir código y probar rápidamente con feedback inmediato.

### Configuración

**Orquestación de Apps**:
- ❌ **NO PM2**
- ❌ **NO Docker** para aplicaciones
- ✅ **Scripts locales** del monorepo: `npm run dev`
- ✅ **Turborepo** orquesta hot-reload de 3 servicios

**Infraestructura**:
- Opcional en Docker: `docker-compose.dev.yml`
- PostgreSQL, Redis, MinIO en contenedores (opcional)
- Flowise AI en contenedor (opcional, solo si necesitas IA local)
- O instalación local (según preferencia del dev)

**Base de Datos**:
- PostgreSQL local o remoto de desarrollo
- **Database**: `monorepo-bca`
- **Schemas**: `platform` (backend) + `documentos` (microservicio)
- Datos sintéticos, **nunca datos reales**

### Archivos de Referencia
```
docker-compose.dev.yml    # Infra opcional (Postgres, Redis, MinIO)
.env                      # Variables locales (raíz del repo)
.env.example              # Plantilla versionada
```

### Comandos Típicos

```bash
# 1. Copiar plantilla
cp .env.example .env

# 2. Ajustar variables (.env)
DATABASE_URL=postgresql://evo:phoenix@localhost:5432/monorepo-bca?schema=platform
DOCUMENTOS_DATABASE_URL=postgresql://evo:phoenix@localhost:5432/monorepo-bca?schema=documentos
FRONTEND_URLS=http://localhost:8550

# 3. Levantar infraestructura opcional
npm run compose:dev:infra:up

# 4. Ejecutar apps en local
npm run dev

# 5. Parar todo
CTRL+C                           # Apps
npm run compose:dev:infra:down   # Infra
```

### URLs de Desarrollo
| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:8550 |
| Backend | http://localhost:4800 |
| Documentos | http://localhost:4802 |
| MinIO Console | http://localhost:9001 (si aplica) |

### Variables Mínimas DEV

```bash
# Frontend
VITE_API_URL=http://localhost:4800
VITE_DOCUMENTOS_API_URL=http://localhost:4802
VITE_DOCUMENTOS_WS_URL=ws://localhost:4802

# Backend/Microservicios
BACKEND_PORT=4800
DOCUMENTOS_PORT=4802
FRONTEND_URLS=http://localhost:8550

# Base de Datos
DATABASE_URL=postgresql://evo:phoenix@localhost:5432/monorepo-bca?schema=platform
DOCUMENTOS_DATABASE_URL=postgresql://evo:phoenix@localhost:5432/monorepo-bca?schema=documentos

# JWT (claves de prueba)
JWT_PUBLIC_KEY_PATH=./keys/jwt-dev-public.pem
JWT_PRIVATE_KEY_PATH=./keys/jwt-dev-private.pem

# MinIO (opcional)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false

# Flowise AI (opcional - solo si necesitas IA local)
FLOWISE_ENDPOINT=http://localhost:3000/api/v1/extract
FLOWISE_USERNAME=admin
FLOWISE_PASSWORD=admin123
FLOWISE_SECRET_KEY=dev-flowise-secret-2025

# Logging
LOG_LEVEL=debug
NODE_ENV=development
```

---

## 2. Testing (Integración y QA Internos)

### Objetivo
Correr tests y pruebas exploratorias con servicios estables y reproducibles.

### Política Estricta

**Orquestación**:
- ✅ **TODO en Docker Compose** (apps + dependencias)
- ❌ **PM2 NO se usa en Testing**
- Archivo de referencia: `docker-compose.hybrid.yml`

**Seguridad**:
- Sin exposición pública
- Puertos accesibles solo dentro de red interna del equipo
- JWT RS256 con claves de prueba
- Datasets sintéticos

**Migraciones**:
- Gestionadas como en prod: `prisma migrate deploy`
- Datos de prueba mediante seeds

### Archivos de Referencia
```
docker-compose.hybrid.yml    # Stack completo de testing
.env.testing.example         # Plantilla de variables
```

### Comandos Típicos

```bash
# 1. Copiar plantilla
cp docs/env/.env.testing.example .env

# 2. Ajustar dominios/IPs internas
# Editar .env según infraestructura de testing

# 3. Levantar stack completo
npm run compose:test:up

# 4. Ver logs/estado
npm run compose:test:logs
npm run compose:test:ps

# 5. Parar
npm run compose:test:down
```

### URLs de Testing (Ejemplo)
| Servicio | URL |
|----------|-----|
| Frontend | https://app.test.local |
| Backend | https://api.test.local |
| Documentos | https://doc.test.local |

### Variables Mínimas TESTING

```bash
# Frontend
VITE_API_URL=https://api.test.local
VITE_DOCUMENTOS_API_URL=https://doc.test.local
VITE_DOCUMENTOS_WS_URL=wss://doc.test.local

# Backend/Microservicios
FRONTEND_URLS=https://app.test.local,https://doc.test.local

# Base de Datos (testing)
DATABASE_URL=postgresql://testuser:testpass@db:5432/monorepo-bca-test?schema=platform
DOCUMENTOS_DATABASE_URL=postgresql://testuser:testpass@db:5432/monorepo-bca-test?schema=documentos

# TLS
# Certificados autofirmados o CA interna
# Navegadores/CI deben confiar en la CA
```

---

## 3. Staging (Pre-Producción)

### Objetivo
Validar releases con **máxima paridad con Producción**.

### Configuración

**Orquestación**:
- ✅ **Docker Swarm** (idéntico a Producción)
- Despliegue automatizado por CI: `.github/workflows/deploy-staging.yml`
- Usa mismo compose: `docker-compose.prod.yml` (con replicas mínimas)

**Datos**:
- **NUNCA datos reales** de producción
- Datos anonimizados o semillas realistas
- Validar privacidad: sin PII en logs

**Migraciones**:
- `prisma migrate deploy` antes de publicar servicios
- Probadas primero en DEV y Testing

**Secretos**:
- Gestionados por entorno (no compartir con Producción)
- GitHub Secrets + 1Password/Bitwarden

### Cadencia de Deploy
- **Cuando**: Miércoles 11:00
- **Responsable**: DevOps/Back ssr
- **Validación**: PM/Analista (smoke + E2E + Sentry 30min)

### Archivos/Automatización
```
.github/workflows/deploy-staging.yml    # Workflow de deploy
scripts/deploy-prod.sh                  # Script de deploy (Swarm)
docker-compose.prod.yml                 # Compose de producción
```

### URLs de Staging (Ejemplo)
| Servicio | URL |
|----------|-----|
| Frontend | https://app.staging.microsyst.com.ar |
| Backend | https://api.staging.microsyst.com.ar |
| Documentos | https://doc.staging.microsyst.com.ar |

### Variables Mínimas STAGING

```bash
# Frontend
VITE_API_URL=https://api.staging.microsyst.com.ar
VITE_DOCUMENTOS_API_URL=https://doc.staging.microsyst.com.ar
VITE_DOCUMENTOS_WS_URL=wss://doc.staging.microsyst.com.ar

# Backend/Microservicios
FRONTEND_URLS=https://app.staging.microsyst.com.ar,https://doc.staging.microsyst.com.ar

# Base de Datos (staging)
DATABASE_URL=postgresql://staginguser:stagingpass@db:5432/monorepo-bca-staging?schema=platform
DOCUMENTOS_DATABASE_URL=postgresql://staginguser:stagingpass@db:5432/monorepo-bca-staging?schema=documentos

# JWT (claves específicas de staging)
JWT_PUBLIC_KEY_PATH=/run/secrets/jwt_public_staging.pem
JWT_PRIVATE_KEY_PATH=/run/secrets/jwt_private_staging.pem

# MinIO
MINIO_PUBLIC_BASE_URL=https://storage.staging.microsyst.com.ar
MINIO_USE_SSL=true

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx  # Proyecto de staging

# Monitoreo
NODE_ENV=staging
LOG_LEVEL=info
```

---

## 4. Producción

### Objetivo
Robustez, seguridad y observabilidad para usuarios finales.

### Configuración

**Orquestación**:
- ✅ **100% contenedores** (Docker Swarm)
- ❌ **PM2 NO se usa**
- Alta disponibilidad con replicas

**Despliegue**:
- CI/CD: `.github/workflows/deploy-prod.yml`
- Script: `scripts/deploy-prod.sh`
- Compose: `docker-compose.prod.yml`
- Migraciones: `prisma migrate deploy` antes del despliegue

**Redes**:
- Separación frontend/backend (overlay networks)
- Definido en `docker-compose.prod.yml`

**Monitoreo**:
- Endpoints `/health` en todos los servicios
- **Sentry**: error tracking
- **Uptime Kuma**: health checks
- Logs controlados (Docker logs + Winston, sin PII)

**Seguridad**:
- Claves JWT RS256 montadas como secretos/volúmenes
- CORS restringido por `FRONTEND_URLS` (sin `*`)
- SSH: solo por llave
- Firewall: `ufw` activo
- Protección: `fail2ban`

**Backups**:
- Diarios automatizados (cron)
- Prueba de restore mensual documentada
- Retención: 7/14/30 días según política

### Cadencia de Deploy
- **Cuando**: Jueves 11:00
- **Aprobación**: Founder/Lead (Staging debe estar estable)
- **Responsable**: DevOps/Back ssr
- **Validación**: Lead/PM (health + flujo real)

### Archivos/Automatización
```
.github/workflows/deploy-prod.yml    # Workflow de deploy
scripts/deploy-prod.sh               # Script de deploy (Swarm)
docker-compose.prod.yml              # Compose de producción
scripts/backup.sh                    # Backup automático
```

### URLs de Producción
| Servicio | URL |
|----------|-----|
| Frontend | https://app.microsyst.com.ar (o dominio configurado) |
| Backend | https://api.microsyst.com.ar |
| Documentos | https://doc.microsyst.com.ar |

### Variables Mínimas PRODUCCIÓN

```bash
# Frontend
VITE_API_URL=https://api.microsyst.com.ar
VITE_DOCUMENTOS_API_URL=https://doc.microsyst.com.ar
VITE_DOCUMENTOS_WS_URL=wss://doc.microsyst.com.ar

# Backend/Microservicios
FRONTEND_URLS=https://app.microsyst.com.ar,https://doc.microsyst.com.ar
BACKEND_PORT=4800
DOCUMENTOS_PORT=4802

# Base de Datos (producción)
DATABASE_URL=postgresql://produser:prodpass@db:5432/monorepo-bca-prod?schema=platform
DOCUMENTOS_DATABASE_URL=postgresql://produser:prodpass@db:5432/monorepo-bca-prod?schema=documentos

# JWT (claves de producción, rotadas periódicamente)
JWT_PUBLIC_KEY_PATH=/run/secrets/jwt_public_prod.pem
JWT_PRIVATE_KEY_PATH=/run/secrets/jwt_private_prod.pem

# MinIO
MINIO_PUBLIC_BASE_URL=https://storage.microsyst.com.ar
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=<secreto>
MINIO_SECRET_KEY=<secreto>

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx  # Proyecto de producción

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=60

# Monitoreo
NODE_ENV=production
LOG_LEVEL=warn
```

---

## Matriz de Ejecución (Resumen)

| Componente | Development (local) | Testing (Compose) | Staging (Swarm) | Producción (Swarm) |
|------------|---------------------|-------------------|-----------------|--------------------|
| **Frontend** | Scripts locales (npm run dev) | Docker Compose | Docker Swarm | Docker Swarm |
| **Backend** | Scripts locales (npm run dev) | Docker Compose | Docker Swarm | Docker Swarm |
| **Documentos** | Scripts locales (npm run dev) | Docker Compose | Docker Swarm | Docker Swarm |
| **PostgreSQL** | Local o Docker | Docker Compose | Docker Swarm | Docker Swarm |
| **Redis** | Local o Docker | Docker Compose | Docker Swarm | Docker Swarm |
| **MinIO** | Local o Docker | Docker Compose | Docker Swarm | Docker Swarm |
| **Flowise AI** | Docker (opcional) | Docker (opcional) | Docker (opcional) | Docker (opcional) |
| **Nginx** | - | Docker Compose | Docker Swarm | Docker Swarm |
| **SonarQube** | Docker (dev/local) | - | - | - |

**Notas**:
- PM2 **NO se utiliza en ningún entorno** de la plataforma
- Puertos por defecto: Backend 4800, Frontend 8550, Documentos 4802
- Flowise (3000/3005) es opcional, habilitar con profile `--profile ai` o descomentando en docker-compose
- SonarQube (9000) solo para análisis de código local, no se despliega en ambientes

---

## Fuentes de Verdad en este Repo

```
Orquestación producción/staging:
├── docker-compose.prod.yml           # Swarm stack
└── scripts/deploy-prod.sh            # Script de deploy

Orquestación testing:
└── docker-compose.hybrid.yml         # Testing completo

Orquestación dev:
└── docker-compose.dev.yml            # Infra opcional

Variables:
├── .env                              # Local (raíz, no versionar valores reales)
├── .env.example                      # Plantilla versionada
└── docs/env/                         # Plantillas por ambiente
    ├── .env.development.example
    ├── .env.testing.example
    ├── .env.staging.example
    └── .env.production.example
```

---

## CORS por Entorno

### Development
```bash
FRONTEND_URLS=http://localhost:8550
```
- Permitir `credentials: true`
- Métodos: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
- Headers estándar

### Testing
```bash
FRONTEND_URLS=https://app.test.local,https://doc.test.local
```
- **Sin comodines** (`*`)
- Incluir hosts de CI si aplican

### Staging
```bash
FRONTEND_URLS=https://app.staging.microsyst.com.ar,https://doc.staging.microsyst.com.ar
```
- Auditar consola por orígenes faltantes
- Agregar explícitamente si es necesario

### Producción
```bash
FRONTEND_URLS=https://app.microsyst.com.ar,https://doc.microsyst.com.ar
```
- **Sin `*`** nunca en producción
- No exponer `Access-Control-Allow-Origin: *`
- Validar en cada deploy

---

## Rate Limiting Recomendado

| Entorno | RATE_LIMIT_WINDOW | RATE_LIMIT_MAX | Notas |
|---------|-------------------|----------------|-------|
| **Development** | 15 min | 200 | Desarrollo sin restricciones |
| **Testing** | 15 min | 100 | Testing realista |
| **Staging** | 15 min | 100 | Igual que testing |
| **Producción** | 15 min | 60 | Ajustar por carga real |

---

## Checklist Mínimo por Entorno

### Development
- [ ] Compila sin errores
- [ ] Tests locales pasan (`npm test`)
- [ ] Linters en verde (`npm run lint`)
- [ ] Build exitoso (`npm run build`)

### Testing
- [ ] Levantar infraestructura Docker Compose
- [ ] Migraciones aplicadas
- [ ] Suite de tests automatizados pasa
- [ ] Smoke tests manuales OK

### Staging
- [ ] Despliegue vía CI (miércoles 11:00)
- [ ] Migraciones aplicadas
- [ ] **E2E Playwright** pasó (3-5 pruebas)
- [ ] **Smoke manual** del flujo crítico OK
- [ ] **Sentry**: 0 errores nuevos (30 min)
- [ ] Health checks OK
- [ ] Validación manual básica por PM/Analista

### Producción
- [ ] Despliegue vía CI (jueves 11:00)
- [ ] Aprobación de Founder/Lead ✅
- [ ] Backup de BD reciente (< 24h)
- [ ] Migraciones aplicadas
- [ ] Health checks OK
- [ ] Alertas limpias (Sentry, Uptime Kuma)
- [ ] Validación post-deploy (Lead/PM)
- [ ] Smoke test de flujo real
- [ ] Monitoreo activo (30 min)

---

## Cómo Trabajar en Cada Entorno (Guía Rápida)

### Development (Local)

```bash
# 1. Copiar plantilla
cp .env.example .env

# 2. Ajustar variables (DATABASE_URL, claves JWT de prueba, etc.)

# 3. Levantar infraestructura opcional
npm run compose:dev:infra:up

# 4. Ejecutar apps
npm run dev

# 5. Parar
CTRL+C                           # Apps
npm run compose:dev:infra:down   # Infra
```

---

### Testing (Docker Compose)

```bash
# 1. Copiar plantilla
cp docs/env/.env.testing.example .env

# 2. Ajustar dominios *.test.local o IPs internas

# 3. Levantar stack completo
npm run compose:test:up

# 4. Ver logs/estado
npm run compose:test:logs
npm run compose:test:ps

# 5. Parar
npm run compose:test:down
```

---

### Staging (Swarm)

```bash
# En servidor de staging (SSH)
cd /home/administrador/monorepo-bca

# 1. Configurar .env (copiar de plantilla)
cp docs/env/.env.staging.example .env
# Editar .env con valores de staging

# 2. Deploy (ejecutado por DevOps via GitHub Actions o manual)
npm ci
npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma
npx prisma migrate deploy --schema=apps/documentos/src/prisma/schema.prisma
bash scripts/deploy-prod.sh

# 3. Validar
docker service ls
curl https://api.staging.microsyst.com.ar/health
```

---

### Producción (Swarm)

```bash
# En servidor de producción (SSH)
cd /home/administrador/monorepo-bca

# 1. Configurar .env (copiar de plantilla)
cp docs/env/.env.production.example .env
# Editar .env con valores de producción (secretos seguros)

# 2. Backup pre-deploy
/home/administrador/scripts/backup.sh

# 3. Deploy (ejecutado por DevOps via GitHub Actions con aprobación)
npm ci
npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma
npx prisma migrate deploy --schema=apps/documentos/src/prisma/schema.prisma
bash scripts/deploy-prod.sh

# 4. Validar
docker service ls
docker service logs monorepo-bca_backend --tail 100
curl https://api.microsyst.com.ar/health

# 5. Post-deploy
# Founder/Lead o PM/Analista valida smoke test manual
```

---

## Recetas Operativas (Resumen Práctico)

### Cambiar Dominios
1. Editar `VITE_*` y `FRONTEND_URLS` en `.env`
2. Desplegar con Swarm/Compose según entorno
3. Validar CORS/health endpoints

### Depurar CORS
1. Verificar `FRONTEND_URLS` (sin comodines)
2. Revisar logs de backend/NGINX
3. Inspeccionar headers en navegador (Network tab)

### TLS en MinIO
1. Certificados válidos en `nginx/ssl/`
2. `MINIO_PUBLIC_BASE_URL=https://...`
3. `MINIO_USE_SSL=true`
4. Redeploy servicios

### Migraciones Prisma
```bash
# Desarrollo
npx dotenv-cli -e .env -- npx prisma migrate dev --schema=apps/backend/prisma/schema.prisma

# Staging/Producción
npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma
```

### Escalar Servicios (Swarm)
```bash
docker service scale monorepo-bca_backend=3
docker service ls
docker service ps monorepo-bca_backend
```

---

## Configuración de Variables (Detalles)

### Frontend (Vite)
```bash
VITE_API_URL               # Base HTTP del backend
VITE_API_BASE_URL          # Alias de VITE_API_URL
VITE_DOCUMENTOS_API_URL    # Base HTTP del microservicio documentos
VITE_DOCUMENTOS_WS_URL     # Base WS/WSS para sockets de documentos
```

### Backend/Microservicios
```bash
BACKEND_PORT=4800          # Puerto del backend
DOCUMENTOS_PORT=4802       # Puerto del microservicio documentos
FRONTEND_URLS              # Lista de orígenes permitidos (CORS), coma-separados
DATABASE_URL               # Conexión Prisma (backend)
DOCUMENTOS_DATABASE_URL    # Conexión Prisma (documentos)
JWT_PRIVATE_KEY_PATH       # Ruta a clave privada RS256
JWT_PUBLIC_KEY_PATH        # Ruta a clave pública RS256
RATE_LIMIT_WINDOW          # Ventana de rate limiting (minutos)
RATE_LIMIT_MAX             # Máximo de requests por ventana
LOG_LEVEL                  # debug | info | warn | error
NODE_ENV                   # development | staging | production
```

### Infraestructura
```bash
# MinIO
MINIO_ENDPOINT             # Hostname de MinIO
MINIO_PORT=9000            # Puerto de MinIO
MINIO_ACCESS_KEY           # Access key
MINIO_SECRET_KEY           # Secret key
MINIO_PUBLIC_BASE_URL      # URL pública para acceso a archivos
MINIO_USE_SSL              # true | false
MINIO_BUCKET_PREFIX        # Prefijo de buckets

# Redis
REDIS_URL                  # URL de conexión Redis (si aplica)

# Flowise AI (opcional)
FLOWISE_ENDPOINT           # URL del servidor Flowise (ej: http://flowise:3005/api/v1/extract)
FLOWISE_API_KEY            # API Key de Flowise (opcional)
FLOWISE_USERNAME           # Usuario de la UI de Flowise
FLOWISE_PASSWORD           # Contraseña de la UI de Flowise
FLOWISE_SECRET_KEY         # Secret key para encriptación interna
FLOWISE_PORT=3000          # Puerto del servicio (3000 dev, 3005 staging/prod)

# SMTP
SMTP_HOST                  # Servidor SMTP
SMTP_PORT                  # Puerto SMTP (587, 465, 25)
SMTP_SECURE                # true | false
SMTP_USER                  # Usuario SMTP
SMTP_PASSWORD              # Contraseña SMTP
SMTP_FROM                  # Email remitente
```

### Convenciones
- **No usar comodín `*`** en CORS; enumerar dominios explícitamente
- En dev usar `localhost` con puertos estándar
- En testing/staging/prod usar dominios dedicados
- **Nunca versionar valores reales** en Git; solo plantillas (`.env.example`)

---

## Documentos Relacionados

- **[CI/CD Pipeline](./CICD_PIPELINE_3_SERVICES.md)** - Flujo completo de CI/CD
- **[Manual Operativo Microsyst](./MANUAL_OPERATIVO_MICROSYST.md)** - Manual operativo completo
- **[Roles y Responsabilidades](./roles/README.md)** - Guías por rol
- **[Arquitectura](./ARCHITECTURE.md)** - Arquitectura del sistema
- **[README Principal](../README.md)** - Información general

---

**Documento Versión**: 2.0  
**Última Actualización**: 8 Octubre 2025  
**Próxima Revisión**: Trimestral  
**Mantenido por**: DevOps/Back (ssr) + Founder/Lead  
**Alineado con**: Manual Operativo Microsyst
