# Despliegue BCA - Servidor 10.3.0.243

**Servidor**: 10.3.0.243  
**Última actualización**: 2026-02-07  
**Stack**: Staging / Desarrollo

---

## Estado actual del despliegue

### Servicios desplegados

| Servicio | Imagen | Puerto | Estado | Build (UTC) | Último commit incluido |
|----------|--------|--------|--------|-------------|------------------------|
| **Backend** | bca/backend:latest | 4800 | Healthy | 2026-02-07 05:24:52 | `9800564` (07/02 01:28 -03) |
| **Frontend** | bca/frontend:latest | 8550 | Healthy | 2026-02-07 01:20:09 | `cd90d82` (06/02 21:00 -03) |
| **Documentos** | bca/documentos:latest | 4802 | Healthy | 2026-02-06 15:09:40 | `b3ed485` (06/02 11:01 -03) |
| **Remitos** | bca/remitos:latest | 4803 | Healthy | 2026-02-06 17:08:03 | `b3ed485` (06/02 11:01 -03) |
| **Postgres** | postgres:16 | 5432 | Healthy | — | — |
| **Redis** | redis:7-alpine | 6379 | Healthy | — | — |
| **MinIO** | minio/minio:latest | 9000-9001 | Healthy | — | — |
| **Flowise** | flowiseai/flowise:latest | 3005 | Healthy | — | — |

---

## Cotejo commits vs despliegue

Horarios en zona local (-0300). Build = hora de creación de la imagen en el servidor (UTC).

### Timeline de builds (06–07 feb 2026)

```
06/02 11:01  b3ed485  fix: copy full monorepo in builder for proper type resolution
           |
06/02 15:09  ─────────── DOCUMENTOS build ──────────────────────
06/02 17:08  ─────────── REMITOS build ─────────────────────────
           |
06/02 21:00  cd90d82   fix: backend Dockerfile path structure for docker-compose compatibility
           |
07/02 01:20  ─────────── FRONTEND build ────────────────────────
           |
07/02 01:28  9800564   chore: add SonarQube configuration file
           |
07/02 05:24  ─────────── BACKEND build ─────────────────────────
```

### Commits no incluidos por servicio

| Servicio | Último incluido | Commits posteriores NO desplegados |
|----------|-----------------|-----------------------------------|
| **Documentos** | `b3ed485` | `d1797c9` (perf Dockerfiles), `cd90d82`, `4ddf443`, `c8819c7`, `2dc6859`, `847e9cb`, `3b7203b`, `2fd021b`, `9800564` |
| **Remitos** | `b3ed485` | Igual que documentos |
| **Frontend** | `cd90d82` | `4ddf443`, `c8819c7`, `2dc6859`, `847e9cb`, `3b7203b`, `2fd021b`, `9800564` |
| **Backend** | `9800564` | Ninguno (sincronizado) |

### Resumen

- **Backend**: al día con `main` (commit `9800564`).
- **Frontend**: 8 commits atrasado (principalmente Dockerfile/backend; no cambian app frontend).
- **Documentos / Remitos**: 9 commits atrasado; incluyen cambios en `9426970` (dotenv documentos) y Dockerfiles.

---

## URLs de acceso

| Recurso | URL |
|---------|-----|
| Frontend | http://10.3.0.243:8550 |
| Alta Completa | http://10.3.0.243:8550/documentos/equipos/alta-completa |
| Backend API | http://10.3.0.243:4800 |
| Documentos API | http://10.3.0.243:4802 |
| Remitos API | http://10.3.0.243:4803 |
| MinIO | http://10.3.0.243:9000 |
| Flowise | http://10.3.0.243:3005 |

---

## Comandos de verificación

### Estado de contenedores

```bash
ssh -i ~/.ssh/id_rsa_bca_243 administrador@10.3.0.243 \
  'docker ps -a --filter name=bca_ --format "table {{.Names}}\t{{.Status}}"'
```

### Fechas de imágenes

```bash
ssh -i ~/.ssh/id_rsa_bca_243 administrador@10.3.0.243 \
  'docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}" | grep bca'
```

### Health checks

```bash
curl -s -o /dev/null -w "%{http_code}" http://10.3.0.243:4800/health  # Backend
curl -s -o /dev/null -w "%{http_code}" http://10.3.0.243:4802/health  # Documentos
curl -s -o /dev/null -w "%{http_code}" http://10.3.0.243:4803/health  # Remitos
curl -s -o /dev/null -w "%{http_code}" http://10.3.0.243:8550/        # Frontend
```

---

## Proceso de despliegue

### Opción 1: Script automatizado (recomendado)

```bash
# Desde máquina local con acceso SSH
./scripts/deploy-to-243.sh                    # Frontend, documentos, remitos
./scripts/deploy-to-243.sh --all              # Todos los servicios
./scripts/deploy-to-243.sh frontend backend   # Solo los especificados
```

El script:
- Sincroniza código con `git pull`
- Usa BuildKit para cache de layers
- Muestra progreso y tiempos
- Verifica health después del deploy

### Opción 2: Manual en servidor

```bash
# Conectar
ssh -i ~/.ssh/id_rsa_bca_243 administrador@10.3.0.243

# Sincronizar código
cd ~/monorepo-bca
git fetch origin && git reset --hard origin/main

# Migraciones (si hay cambios de schema)
npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma
npx prisma migrate deploy --schema=apps/documentos/src/prisma/schema.prisma
npx prisma db push --schema=apps/remitos/src/prisma/schema.prisma

# Build optimizado (con BuildKit)
export DOCKER_BUILDKIT=1
cd ~/stack-ip-10.3.0.243
docker compose build frontend documentos remitos
docker compose up -d --no-build frontend documentos remitos
```

### Tiempos esperados (con optimizaciones)

| Servicio   | Primera vez | Con cache |
|------------|-------------|-----------|
| Frontend   | ~3 min      | ~30 seg   |
| Backend    | ~4 min      | ~1 min    |
| Documentos | ~3 min      | ~45 seg   |
| Remitos    | ~2 min      | ~30 seg   |

---

## Optimizaciones aplicadas (2026-02-07)

### 1. .dockerignore en raíz
Excluye ~250MB innecesarios:
- `import-data/` (195MB)
- `docs/`, `.git/`, `__tests__/`
- Archivos .md, .xlsx, .pdf

### 2. Dockerfiles multi-stage optimizados
- **Layer caching**: package.json primero, código después
- **BuildKit cache mounts**: `--mount=type=cache,target=/root/.npm`
- **Prune dev deps**: `npm prune --omit=dev`
- **Limpieza agresiva**: eliminar tests, docs de node_modules

### 3. Tamaños objetivo

| Imagen       | Antes   | Después  | Reducción |
|--------------|---------|----------|-----------|
| Backend      | 899 MB  | ~300 MB  | -66%      |
| Frontend     | 69 MB   | ~50 MB   | -27%      |
| Documentos   | 498 MB  | ~400 MB  | -20%      |
| Remitos      | 472 MB  | ~380 MB  | -20%      |

---

## Histórico: despliegue original (2024-11-16)

El primer despliegue documentado incluyó:

- **Frontend**: Alta Completa de Equipos (`DocumentoField.tsx`, `SeccionDocumentos.tsx`, `AltaEquipoCompletaPage.tsx`)
- **Dockerfile.frontend**: `npm install --legacy-peer-deps`
- **Servicios**: Frontend, Backend, Documentos, MinIO, Postgres, Redis, Flowise (sin Remitos)

Desde entonces el stack ha evolucionado:

- Frontend pasa de goStatic a **nginx** con proxy a APIs
- Añadido **Remitos** (puerto 4803)
- Validación IA en Documentos (`FLOWISE_VALIDATION_ENABLED`)

---

## Contacto

**Servidor**: administrador@10.3.0.243  
**SSH Key**: `~/.ssh/id_rsa_bca_243`  
**Documentación**: `/home/administrador/monorepo-bca/docs/`
