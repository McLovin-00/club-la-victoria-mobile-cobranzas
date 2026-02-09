# Despliegue BCA - Servidor 10.3.0.243

**Servidor**: 10.3.0.243  
**Última actualización**: 2026-02-07 16:38 UTC  
**Stack**: Staging / Desarrollo

---

## Estado actual del despliegue

### Servicios desplegados

| Servicio | Imagen | Puerto | Estado | Build (UTC) | Último commit incluido |
|----------|--------|--------|--------|-------------|------------------------|
| **Backend** | bca/backend:latest | 4800 | Healthy | 2026-02-07 16:36:47 | `969c5ea` (07/02 perf: optimize) |
| **Frontend** | bca/frontend:latest | 8550 | Healthy | 2026-02-07 15:39:10 | `969c5ea` (07/02 perf: optimize) |
| **Documentos** | bca/documentos:latest | 4802 | Healthy | 2026-02-07 15:50:37 | `969c5ea` (07/02 perf: optimize) |
| **Remitos** | bca/remitos:latest | 4803 | Healthy | 2026-02-07 15:41:36 | `969c5ea` (07/02 perf: optimize) |
| **Postgres** | postgres:16 | 5432 | Healthy | — | — |
| **Redis** | redis:7-alpine | 6379 | Healthy | — | — |
| **MinIO** | minio/minio:latest | 9000-9001 | Healthy | — | — |
| **Flowise** | flowiseai/flowise:latest | 3005 | Healthy | — | — |

---

## Cotejo commits vs despliegue

Horarios en zona local (-0300). Build = hora de creación de la imagen en el servidor (UTC).

### Estado de sincronización (2026-02-07 16:38 UTC)

**Todos los servicios sincronizados con `main`** (commit `969c5ea`)

| Servicio | Commit desplegado | Estado |
|----------|------------------|--------|
| **Backend** | `969c5ea` | ✅ Sincronizado |
| **Frontend** | `969c5ea` | ✅ Sincronizado |
| **Documentos** | `969c5ea` | ✅ Sincronizado |
| **Remitos** | `969c5ea` | ✅ Sincronizado |

### Timeline de builds (07 feb 2026)

```
07/02 12:XX  969c5ea  perf: optimize Dockerfiles and deploy scripts for faster builds
           |
07/02 15:39  ─────────── FRONTEND build ────────────────────────
07/02 15:41  ─────────── REMITOS build ─────────────────────────
07/02 15:50  ─────────── DOCUMENTOS build ──────────────────────
07/02 16:36  ─────────── BACKEND build ─────────────────────────
```

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

### 3. Tamaños de imágenes actuales

| Imagen       | Tamaño  | Notas |
|--------------|---------|-------|
| Backend      | 879 MB  | Incluye node_modules completos del monorepo (requerido para npm workspaces) |
| Frontend     | 69 MB   | Imagen nginx optimizada con assets estáticos |
| Documentos   | 553 MB  | Multi-stage con pruning de dev deps |
| Remitos      | 586 MB  | Multi-stage con pruning de dev deps |

**Nota**: El backend requiere el monorepo completo para resolver dependencias hoisted de npm workspaces correctamente.

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
