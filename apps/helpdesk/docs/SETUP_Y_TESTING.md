<!-- Propósito: guía Docker-only para levantar y revisar el estado real del helpdesk, con variables exactas y un flujo de prueba desde el frontend. -->

# Setup y Testing Docker-Only - Helpdesk

## 1. Alcance real de esta guía

Esta guía está alineada con el código actual del repo y deja afuera el flujo host-local con `npm run dev`.

### Lo que sí cubre
- Levantar PostgreSQL, Redis, MinIO, backend principal, helpdesk, frontend y proxy usando solo Docker.
- Definir exactamente qué variables de entorno poner y con qué valor inicial.
- Probar el helpdesk desde la UI del frontend en `http://localhost/helpdesk`.

### Lo que no puedo asegurar solo leyendo el código
- Credenciales reales de un usuario `ADMIN` o `SUPERADMIN`.
- Que una base vacía tenga ya migrado el schema `platform` y un usuario con acceso al login.
- Que un token ficticio de Telegram funcione de forma estable. El código exige `TELEGRAM_BOT_TOKEN` no vacío.

### Limitaciones actuales detectadas
- No existe un stack local full-Docker ya resuelto en los `docker-compose` del repo para `frontend + backend + helpdesk + nginx`.
- La UI actual no tiene botón ni formulario visible para crear tickets (solo listado/detalle y acciones sobre tickets existentes).

Por eso esta guía usa un arranque Docker local explícito cuando hace falta reproducir el mismo entorno que QA.

---

## 2. Prerrequisitos

- Docker Desktop funcionando.
- PowerShell.
- Una carpeta `keys` en la raíz del repo con `jwt_private.pem` y `jwt_public.pem`.
- Una base de datos donde el backend principal pueda autenticar usuarios.
- Un usuario existente con rol `ADMIN` o `SUPERADMIN` para entrar a `/helpdesk`.

Si no tenés las claves JWT, podés generarlas con Docker:

```powershell
New-Item -ItemType Directory -Force -Path .\keys | Out-Null

docker run --rm `
  -v "${PWD}\keys:/work" `
  -w /work `
  alpine:3.20 `
  sh -lc "apk add --no-cache openssl >/dev/null && openssl genrsa -out jwt_private.pem 2048 && openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem"
```

---

## 3. Variables de entorno exactas

### 3.1 Archivo raíz `.env`

Crear `.\.env` con este contenido exacto:

```dotenv
NODE_ENV=production

DB_NAME=monorepo-bca
DB_USER=postgres
DB_PASSWORD=postgres

DATABASE_URL=postgresql://postgres:postgres@postgres:5432/monorepo-bca?schema=platform

REDIS_URL=redis://redis:6379

MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_PUBLIC_BASE_URL=http://localhost:9000

FRONTEND_URL=http://localhost
FRONTEND_URLS=http://localhost,http://localhost:8550

VITE_API_URL=http://localhost
VITE_API_BASE_URL=http://localhost
VITE_DOCUMENTOS_API_URL=http://localhost
VITE_DOCUMENTOS_WS_URL=ws://localhost/socket.io/

JWT_PRIVATE_KEY_PATH=/app/keys/jwt_private.pem
JWT_PUBLIC_KEY_PATH=/app/keys/jwt_public.pem

LOG_LEVEL=info
ENABLE_HELPDESK=true
```

### 3.2 Archivo `apps/helpdesk/.env.docker.local`

Crear `.\apps\helpdesk\.env.docker.local` con este contenido exacto:

```dotenv
ENABLE_HELPDESK=true
NODE_ENV=production
HELPDESK_PORT=4803

DATABASE_URL=postgresql://postgres:postgres@postgres:5432/monorepo-bca?schema=platform
HELPDESK_DATABASE_URL=postgresql://postgres:postgres@postgres:5432/monorepo-bca?schema=helpdesk

JWT_PUBLIC_KEY_PATH=/app/keys/jwt_public.pem

REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379

MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_REGION=us-east-1
MINIO_BUCKET_PREFIX=helpdesk-local

FRONTEND_URL=http://localhost
FRONTEND_URLS=http://localhost,http://localhost:8550

AUTO_CLOSE_HOURS=72
REOPEN_ALLOWED_HOURS=72
LOG_LEVEL=debug

TELEGRAM_BOT_TOKEN=<PONE_AQUI_TU_TOKEN_REAL_DE_BOTFATHER>
```

### 3.3 Por qué el helpdesk usa archivo propio

El helpdesk necesita un `MINIO_BUCKET_PREFIX` distinto al de otros servicios y además hoy valida `DATABASE_URL` aunque Prisma use `HELPDESK_DATABASE_URL`.

---

## 4. Bot de Telegram

### 4.1 Para qué sirve el bot

El bot forma parte del diseño actual del helpdesk y cubre estos flujos:

- Recibir mensajes directos de usuarios para crear tickets.
- Crear un topic en un grupo de resolutores según la categoría del ticket.
- Permitir que los resolutores respondan desde ese topic.
- Vincular usuarios de Telegram con registros de `platform.usuarios`.

### 4.2 Qué valor poner en `TELEGRAM_BOT_TOKEN`

En `apps/helpdesk/.env.docker.local` tenés que poner un token real entregado por `@BotFather`.

Ejemplo de formato:

```dotenv
TELEGRAM_BOT_TOKEN=1234567890:AAExampleRealTokenFromBotFather
```

No uses un valor vacío porque el servicio no arranca correctamente si la variable falta o queda vacía.

### 4.3 Cómo obtener el token

1. Abrí Telegram.
2. Buscá `@BotFather`.
3. Ejecutá `/newbot`.
4. Elegí nombre y username del bot.
5. Copiá el token que te devuelve.
6. Pegalo en `apps/helpdesk/.env.docker.local`.

### 4.4 Qué pasa si solo querés probar frontend y API

Para el estado actual del código:

- `TELEGRAM_BOT_TOKEN` sigue siendo obligatorio a nivel configuración.
- Si el token es real, el bot intentará iniciar polling normalmente.
- Si el token es inválido pero no vacío, el contenedor puede seguir levantando el servicio HTTP, pero vas a tener errores del bot en logs.
- Si querés una prueba limpia del helpdesk, conviene usar un token real.

### 4.5 Qué más hace falta además del token

El token solo no alcanza para que el circuito Telegram quede operativo. También necesitás:

- Que exista la tabla `platform.usuarios` en la misma base.
- Que los usuarios tengan `telegram_username` para poder vincularse.
- Que el bot esté agregado a los grupos de resolutores.
- Que esos grupos tengan topics habilitados.
- Que exista configuración en `helpdesk.resolver_configs`.

### 4.6 Configuración mínima de grupos resolutores

El código busca una configuración activa por categoría en `helpdesk.resolver_configs`.

Campos clave:

- `category`: `TECHNICAL` o `OPERATIONAL`
- `telegram_group_id`: ID real del grupo o supergrupo
- `telegram_group_name`: nombre descriptivo
- `is_active`: `true`

Ejemplo:

```sql
INSERT INTO helpdesk.resolver_configs (
  category,
  telegram_group_id,
  telegram_group_name,
  resolver_names,
  is_active
)
VALUES
  ('TECHNICAL', '-1001234567890', 'Helpdesk Técnico', ARRAY['Resolver Técnico'], true),
  ('OPERATIONAL', '-1001234567891', 'Helpdesk Operativo', ARRAY['Resolver Operativo'], true);
```

### 4.7 Cómo obtener el `telegram_group_id`

Opciones prácticas:

1. Crear el grupo o supergrupo.
2. Agregar el bot.
3. Enviar un mensaje al grupo.
4. Consultar:

```powershell
Invoke-RestMethod "https://api.telegram.org/bot<TU_TOKEN_REAL>/getUpdates"
```

En la respuesta buscá el `chat.id` del grupo. Suele verse con formato similar a `-1001234567890`.

### 4.8 Qué validar si querés probar Telegram de verdad

1. El bot responde `/start` por DM.
2. Un usuario identificado puede iniciar conversación con el bot.
3. Al crear un ticket por DM se genera un topic en el grupo correcto.
4. Los mensajes enviados en el topic impactan el ticket asociado.

### 4.9 Cuándo podés ignorar Telegram

Si tu objetivo inmediato es solo revisar la pantalla `/helpdesk` y sus requests HTTP:

- no necesitás probar DM, topics ni grupos;
- pero sí necesitás dejar `TELEGRAM_BOT_TOKEN` configurado;
- y si el token no es real, asumí ruido en logs del bot.

---

## 5. Levantar todo con Docker

### Paso 1: Crear redes y volúmenes

```powershell
docker network create bca-frontend
docker network create bca-backend

docker volume create bca-pg-data
docker volume create bca-redis-data
docker volume create bca-minio-data
```

### Paso 2: Levantar PostgreSQL

```powershell
docker rm -f postgres 2>$null

docker run -d `
  --name postgres `
  --restart unless-stopped `
  --network bca-backend `
  -p 5432:5432 `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=monorepo-bca `
  -v bca-pg-data:/var/lib/postgresql/data `
  postgres:16-alpine
```

### Paso 3: Levantar Redis

```powershell
docker rm -f redis 2>$null

docker run -d `
  --name redis `
  --restart unless-stopped `
  --network bca-backend `
  -p 6379:6379 `
  -v bca-redis-data:/data `
  redis:7-alpine `
  redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
```

### Paso 4: Levantar MinIO

```powershell
docker rm -f minio 2>$null

docker run -d `
  --name minio `
  --restart unless-stopped `
  --network bca-backend `
  -p 9000:9000 `
  -p 9001:9001 `
  -e MINIO_ROOT_USER=minioadmin `
  -e MINIO_ROOT_PASSWORD=minioadmin `
  -e MINIO_SERVER_URL=http://localhost:9000 `
  -v bca-minio-data:/data `
  minio/minio:latest `
  server /data --console-address ":9001"
```

### Paso 5: Esperar la infraestructura

```powershell
docker ps
```

Opcionalmente podés mirar logs:

```powershell
docker logs postgres --tail 50
docker logs redis --tail 50
docker logs minio --tail 50
```

### Paso 6: Compilar imágenes

Desde la raíz del repo:

```powershell
docker build -t bca-backend-local -f .\deploy\stack-ip-192.168.15.136\Dockerfile.backend .

docker build `
  -t bca-frontend-local `
  -f .\deploy\stack-ip-192.168.15.136\Dockerfile.frontend `
  --build-arg VITE_API_URL=http://localhost `
  --build-arg VITE_API_BASE_URL=http://localhost `
  --build-arg VITE_DOCUMENTOS_API_URL=http://localhost `
  --build-arg VITE_DOCUMENTOS_WS_URL=ws://localhost/socket.io/ `
  .

docker build -t bca-helpdesk-local .\apps\helpdesk
```

### Paso 7: Levantar backend principal

```powershell
docker rm -f backend 2>$null

docker run -d `
  --name backend `
  --restart unless-stopped `
  --network bca-backend `
  -p 4800:4800 `
  --env-file .\.env `
  -e PORT=4800 `
  -e NODE_ENV=production `
  -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/monorepo-bca?schema=platform `
  -e REDIS_URL=redis://redis:6379 `
  -e FRONTEND_URLS=http://localhost,http://localhost:8550 `
  -v "${PWD}\keys:/app/keys:ro" `
  bca-backend-local

docker network connect bca-frontend backend
```

### Paso 8: Levantar helpdesk

```powershell
docker rm -f helpdesk 2>$null

docker run -d `
  --name helpdesk `
  --restart unless-stopped `
  --network bca-backend `
  -p 4803:4803 `
  --env-file .\apps\helpdesk\.env.docker.local `
  -v "${PWD}\keys:/app/keys:ro" `
  bca-helpdesk-local

docker network connect bca-frontend helpdesk
```

### Paso 9: Levantar frontend

```powershell
docker rm -f frontend 2>$null

docker run -d `
  --name frontend `
  --restart unless-stopped `
  --network bca-frontend `
  bca-frontend-local
```

### Paso 10: Levantar proxy Nginx

```powershell
docker rm -f nginx-helpdesk 2>$null

docker run -d `
  --name nginx-helpdesk `
  --restart unless-stopped `
  --network bca-frontend `
  -p 80:80 `
  -v "${PWD}\nginx\nginx.conf:/etc/nginx/nginx.conf:ro" `
  nginx:alpine

docker network connect bca-backend nginx-helpdesk
```

### Paso 11: Verificaciones mínimas

```powershell
Invoke-WebRequest http://localhost:4803/health | Select-Object -ExpandProperty Content
Invoke-WebRequest http://localhost:4803/health/ready | Select-Object -ExpandProperty Content
Invoke-WebRequest http://localhost | Select-Object -ExpandProperty StatusCode
```

Si algo no levanta:

```powershell
docker logs backend --tail 100
docker logs helpdesk --tail 100
docker logs frontend --tail 100
docker logs nginx-helpdesk --tail 100
```

---

## 6. Estado esperado antes de probar la UI

Antes de abrir `/helpdesk` validá esto:

- El backend principal deja iniciar sesión.
- El contenedor `helpdesk` responde `200` en `http://localhost:4803/health`.
- El contenedor `helpdesk` responde `200` o `503` estructurado en `http://localhost:4803/health/ready`.
- Existe al menos un usuario válido con rol `ADMIN` o `SUPERADMIN`.
- Existe al menos un ticket para ese usuario, o sabés cómo crearlo por API.

Importante: la UI actual no ofrece creación visible de ticket. Si entrás sin tickets previos, solo vas a poder validar que la pantalla carga y que los requests salen.

---

## 7. Paso a paso para testear desde el frontend

### 7.1 Iniciar sesión

1. Abrí `http://localhost/login`.
2. Ingresá con un usuario existente de rol `ADMIN` o `SUPERADMIN`.
3. Confirmá que la sesión queda activa.

No conozco tus credenciales reales desde el repo, así que este dato lo tenés que completar vos.

### 7.2 Abrir la pantalla de helpdesk

1. Abrí `http://localhost/helpdesk`.
2. Si no aparece en el menú, entrá por URL directa.
3. Abrí DevTools en la pestaña `Network`.

### 7.3 Validar requests iniciales

Al cargar la pantalla deberían dispararse estos requests:

- `GET /api/helpdesk/admin/stats`
- `GET /api/helpdesk/tickets`

### 7.4 Qué deberías revisar en la pantalla

- Que la ruta no redirija a login.
- Que el listado principal cargue o al menos intente cargar.
- Que los filtros disparen nuevas llamadas a `GET /api/helpdesk/tickets?...`.
- Que no haya errores `401`, `403`, `404` o `500` inesperados en la consola de red.

### 7.5 Casos que hoy es razonable validar

1. Entrar a `/helpdesk`.
2. Cambiar filtros.
3. Hacer clic sobre un ticket existente.
4. Navegar a `/helpdesk/:id`.
5. Ver si salen estos requests:
   - `GET /api/helpdesk/tickets/:id`
   - `GET /api/helpdesk/tickets/:id/messages`

### 7.6 Notas de contrato frontend / backend

- El frontend desempaqueta respuestas `{ success, data, pagination? }` en `apps/frontend/src/features/helpdesk/api/helpdeskResponseParsers.ts` (listado, detalle, mensajes, stats, mutaciones).
- Cerrar y reabrir ticket usan `PATCH` alineado con `apps/helpdesk/src/routes/ticket.routes.ts`.
- `ADMIN_INTERNO` sin `empresaId` en el JWT puede ver stats vacías (alcance `none`), no necesariamente `403`.

### 7.7 Cómo registrar el resultado de cada prueba

Usá esta tabla simple:

| Prueba | Request esperado | Resultado esperado |
|------|-------------------|------------------------|
| Abrir `/helpdesk` | `GET /api/helpdesk/tickets` | Lista y stats coherentes con el rol |
| Cargar stats | `GET /api/helpdesk/admin/stats` | Tarjetas con números si hay datos y rol admin |
| Abrir ticket | `GET /api/helpdesk/tickets/:id` | Detalle del ticket |
| Ver mensajes | `GET /api/helpdesk/tickets/:id/messages` | Lista de mensajes |
| Enviar mensaje | `POST /api/helpdesk/tickets/:id/messages` | Mensaje creado (`201`, cuerpo en `data`) |
| Cerrar ticket | `PATCH /api/helpdesk/tickets/:id/close` | Ticket cerrado |
| Reabrir ticket | `PATCH /api/helpdesk/tickets/:id/reopen` | Ticket reabierto |

---

## 8. Si necesitás un ticket de prueba

Como la UI actual no lo crea, necesitás tener uno ya existente o crearlo por API.

Ejemplo mínimo desde PowerShell contra el helpdesk directo:

```powershell
$token = "<PONE_AQUI_UN_JWT_VALIDO>"

$body = @{
  category = "TECHNICAL"
  subcategory = "ERROR"
  subject = "Ticket de prueba frontend"
  priority = "HIGH"
  message = "Ticket creado para probar la UI del helpdesk"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4803/api/helpdesk/tickets" `
  -Headers @{
    Authorization = "Bearer $token"
  } `
  -ContentType "application/json" `
  -Body $body
```

Después de eso, recargá `http://localhost/helpdesk`.

---

## 9. Troubleshooting rápido

### El contenedor `helpdesk` termina apenas arranca

Revisá primero:

- `DATABASE_URL`
- `HELPDESK_DATABASE_URL`
- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `JWT_PUBLIC_KEY_PATH`
- `TELEGRAM_BOT_TOKEN`

Comando:

```powershell
docker logs helpdesk --tail 200
```

### `health/ready` devuelve `503`

El `ready` actual chequea solo base y Redis.

Revisá:

```powershell
docker logs postgres --tail 100
docker logs redis --tail 100
docker logs helpdesk --tail 100
```

### El login funciona pero `/helpdesk` rompe

Revisá:

- Si el usuario tiene rol `ADMIN` o `SUPERADMIN`.
- Si existe al menos un ticket.
- Si los requests a `/api/helpdesk/...` salen por `localhost`.

### El frontend abre pero no muestra datos correctos

Revisá la consola de red: si las respuestas traen `success`/`data` y la UI sigue vacía, verificá que el bundle incluya los parsers del helpdesk (build reciente).

### El bot de Telegram falla

Si solo querés probar frontend y API, que el bot falle al iniciar no bloquea necesariamente el resto del servicio. Igual conviene usar un token real para evitar ruido en logs.

---

## 10. Apagar y limpiar

```powershell
docker rm -f nginx-helpdesk frontend helpdesk backend minio redis postgres
```

Si también querés limpiar datos:

```powershell
docker volume rm bca-minio-data bca-redis-data bca-pg-data
docker network rm bca-frontend bca-backend
```
