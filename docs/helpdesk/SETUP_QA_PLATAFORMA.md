# Setup QA — Plataforma Mesa de Ayuda

Guía para levantar **todo lo necesario** y testear la pantalla `/helpdesk` (HD-033 en adelante) y los casos E2E (HD-048 a HD-051).

---

## 1. Qué levanta este setup

- **PostgreSQL** (puerto 5432): schemas `platform` y `helpdesk`
- **Redis** (6379)
- **MinIO** (9000, consola 9001)
- **Backend** (plataforma): login y API principal
- **Helpdesk**: microservicio de tickets (API + bot Telegram si está configurado)
- **Frontend**: SPA servida por Nginx interno en 8550
- **Nginx** (puerto 80): proxy a frontend, `/api/` → backend, `/api/helpdesk/` → helpdesk

Acceso final: **http://localhost:8080/helpdesk**.

---

## 2. Prerrequisitos

- Docker y Docker Compose
- Carpeta **`keys/`** en la raíz con `jwt_private.pem` y `jwt_public.pem`
- Archivo **`.env`** en la raíz (DB_USER, DB_PASSWORD, DB_NAME; el compose inyecta host `postgres` para los servicios)
- **`apps/helpdesk/.env.docker.local`** con variables del helpdesk (token Telegram, etc.); ver `apps/helpdesk/docs/SETUP_Y_TESTING.md` sección 3.2

Si no tenés claves JWT:

```powershell
New-Item -ItemType Directory -Force -Path .\keys | Out-Null
docker run --rm -v "${PWD}\keys:/work" -w /work alpine:3.20 sh -c "apk add --no-cache openssl && openssl genrsa -out jwt_private.pem 2048 && openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem"
```

---

## 3. Levantar el stack

Desde la **raíz del monorepo**:

```powershell
.\scripts\helpdesk-qa-up.ps1
```

Para forzar rebuild de imágenes:

```powershell
.\scripts\helpdesk-qa-up.ps1 -Build
```

O sin script:

```powershell
docker compose -f docker-compose.helpdesk-qa.yml up -d --build
```

---

## 4. Migraciones

Si la base está vacía o es la primera vez, ejecutá las migraciones **desde el host** (PostgreSQL está en localhost:5432):

```powershell
# Backend (schema platform)
cd apps/backend
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/monorepo-bca?schema=platform"
npx prisma migrate deploy
cd ../..

# Helpdesk (schema helpdesk)
cd apps/helpdesk
$env:HELPDESK_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/monorepo-bca?schema=helpdesk"
npx prisma migrate deploy
cd ../..
```

Necesitás al menos un usuario de plataforma con rol **ADMIN** o **SUPERADMIN** para acceder a `/helpdesk` y a las estadísticas. Si la plataforma ya tiene usuarios, usá uno existente; si no, crealo por el flujo de registro o por DB/Prisma Studio.

---

## 5. Probar

1. Abrí **http://localhost:8080/helpdesk**.
2. Iniciá sesión con un usuario ADMIN/SUPERADMIN.
3. Deberías ver el listado de tickets (vacío si no hay datos) y las estadísticas si el backend/helpdesk responden bien.

Para validar la matriz de QA (HD-033 a HD-047 y E2E HD-048 a HD-051), seguí los pasos de [`MATRIZ_QA_MESA_DE_AYUDA.md`](./MATRIZ_QA_MESA_DE_AYUDA.md).

---

## 6. Comandos útiles

| Acción              | Comando                                                                 |
|---------------------|-------------------------------------------------------------------------|
| Ver estado          | `docker compose -f docker-compose.helpdesk-qa.yml ps`                  |
| Logs                | `docker compose -f docker-compose.helpdesk-qa.yml logs -f`            |
| Bajar todo          | `docker compose -f docker-compose.helpdesk-qa.yml down`                |
| Bajar y eliminar volúmenes | `docker compose -f docker-compose.helpdesk-qa.yml down -v`     |

---

## 7. Backend `unhealthy` en Compose (wget)

La imagen `node:20-alpine` del backend **no trae `wget`**. El healthcheck del `docker-compose.helpdesk-qa.yml` usa **Node** (`http.get` a `/health`). Si sigue unhealthy, revisá logs: `docker compose -f docker-compose.helpdesk-qa.yml logs backend --tail 80` (suele ser DB sin migrar o claves JWT).

## 8. Build del frontend: `nginx.conf` not found

El `Dockerfile.frontend` copia `deploy/stack-ip-192.168.15.136/nginx.conf`. Esa carpeta estaba excluida por `.dockerignore`; en el repo se usa el patrón `deploy/stack-ip-192.168.15.136/*` con excepción `!.../nginx.conf` para que el archivo entre al contexto de build.

## 9. Conflictos con otros contenedores

- Este compose **no** usa el mismo nombre de proyecto que el helpdesk standalone que venías usando. Si tenés **postgres, redis, minio, backend, frontend, helpdesk o nginx** ya corriendo con otros compose o `docker run`, puede haber conflicto de puertos. Este setup ya usa **8080** para el proxy público (`http://localhost:8080/helpdesk`), pero mantiene `5432`, `6379`, `9000` y `9001` para facilitar migraciones locales.
