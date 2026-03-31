# Runbook local no-build para QA de Helpdesk

## Para que sirve

Este flujo sirve para probar cambios del frontend y del microservicio de Helpdesk en `http://localhost:8080` sin hacer build de imagenes Docker.

En vez de reconstruir contenedores, se hace esto:

- `nginx` sigue siendo la puerta de entrada en `:8080`
- el frontend corre desde codigo fuente con Vite en `:8551`
- el microservicio `helpdesk` corre desde codigo fuente en `:4803`
- backend, auth y resto del stack siguen entrando por Docker

Esto permite validar rapido fixes locales, por ejemplo:

- creacion de tickets
- visualizacion de mensajes iniciales
- adjuntos en detalle de ticket
- errores de UI que solo aparecen en source mode

## Cuando usarlo

Usalo cuando se cumplan estas condiciones:

- queres probar un fix local de Helpdesk o frontend
- NO queres hacer build de imagenes
- queres seguir entrando por `http://localhost:8080`
- necesitas validar el flujo real con login, nginx y APIs integradas

## Cuando NO usarlo

No lo uses para esto:

- produccion
- QA formal de release final
- pruebas donde necesites una imagen identica a la deployada
- cambios que dependan de rebuild de assets o containers definitivos

Si queres el flujo mas limpio y definitivo, ahi corresponde build + deploy normal.

## Que resuelve este modo

Este modo existe porque el stack Docker en `:8080` puede estar sirviendo codigo viejo aunque el repo ya tenga fixes nuevos.

Sin build, la forma de ver el codigo nuevo es:

1. levantar frontend source
2. levantar helpdesk source
3. hacer que `nginx` siga apuntando a `:8080`, pero por atras proxy a esos procesos locales

## Prerrequisitos

Antes de usar este flujo, verifica:

- Docker Desktop levantado
- contenedores base disponibles:
  - `monorepo-bca-backend-1`
  - `monorepo-bca-helpdesk-1`
  - `monorepo-bca-nginx-1`
- base de datos local accesible en `localhost:5432`
- Redis local accesible en `localhost:6379`
- MinIO local accesible en `localhost:9000`
- dependencias npm ya instaladas en el repo

## Scripts disponibles

### Levantar

Desde la raiz del repo:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\helpdesk-local-no-build-up.ps1"
```

### Bajar

Desde la raiz del repo:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\helpdesk-local-no-build-down.ps1"
```

## Que hace el script de subida

`scripts/helpdesk-local-no-build-up.ps1` hace esto automaticamente:

1. exporta la clave publica JWT desde `monorepo-bca-backend-1`
2. mata procesos previos que usen `:8551` y `:4803`
3. mata procesos previos trackeados por PID si existen
4. corre `npm run prisma:generate` en `apps/helpdesk`
5. levanta frontend source en `:8551`
6. levanta helpdesk source en `:4803`
7. recarga `nginx`
8. deja `http://localhost:8080` listo para entrar

## Que hace el script de bajada

`scripts/helpdesk-local-no-build-down.ps1` hace esto:

1. baja los procesos source locales del frontend y helpdesk
2. recarga `nginx`

## Credenciales de prueba

Para entrar rapido en local:

- email: `admin@empresa.com`
- password: `password123`

## Como validar que realmente levanto

Despues del script de subida:

1. abri `http://localhost:8080/login`
2. inicia sesion con `admin@empresa.com / password123`
3. entra a `/helpdesk/nuevo`
4. crea un ticket con un adjunto
5. verifica que el detalle del ticket muestre:
   - el mensaje inicial
   - el nombre del archivo adjunto

Si eso pasa, el flujo local no-build esta funcionando.

## Donde mirar logs

Cada corrida crea logs nuevos con timestamp en `.artifacts/`.

Ejemplos:

- `.artifacts/frontend-dev-YYYYMMDD-HHMMSS.log`
- `.artifacts/helpdesk-dev-YYYYMMDD-HHMMSS.log`

Ademas, el script deja punteros al ultimo log generado:

- `.artifacts/frontend-dev.latest.txt`
- `.artifacts/helpdesk-dev.latest.txt`

## Problemas comunes

### 1. `process is not defined`

Si aparece eso en browser, el frontend no esta corriendo con el runtime esperado o no estas entrando al stack source correcto por `:8080`.

Accion:

- bajar con `helpdesk-local-no-build-down.ps1`
- subir de nuevo con `helpdesk-local-no-build-up.ps1`

### 2. El ticket se crea pero no aparece el adjunto en el detalle

Ese fue el bug original que se corrigio.

El detalle depende de:

- `apps/helpdesk/src/routes/message.routes.ts`
- `apps/helpdesk/src/routes/attachment.routes.ts`
- `apps/frontend/src/pages/TicketDetailPage.tsx`

Si vuelve a pasar, revisa primero si realmente estas entrando al stack source por `:8080` y no a un bundle viejo.

### 3. `Port 8551 is already in use`

Normalmente el script ya lo limpia. Si igual queda clavado, corre:

```powershell
Get-NetTCPConnection -LocalPort 8551 -State Listen | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

### 4. `Port 4803 is already in use`

Corre:

```powershell
Get-NetTCPConnection -LocalPort 4803 -State Listen | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

### 5. Error de Prisma tipo `EPERM` o lock sobre `query_engine-windows.dll.node`

Eso suele pasar cuando el proceso viejo del helpdesk no murio y Windows sigue agarrando el binario.

Accion:

1. corre `helpdesk-local-no-build-down.ps1`
2. espera unos segundos
3. volve a correr `helpdesk-local-no-build-up.ps1`

### 6. Error de login o CORS raro

Eso suele indicar que el frontend no esta usando bien `http://localhost:8080` como base URL.

El script ya levanta Vite con estas variables:

- `VITE_API_URL=http://localhost:8080`
- `VITE_API_BASE_URL=http://localhost:8080`
- `VITE_DOCUMENTOS_API_URL=http://localhost:8080`
- `VITE_DOCUMENTOS_WS_URL=` vacio

Si tocaste algo a mano y despues rompio, volve al flujo por script.

## Que quedo especial en este modo local

Para que el QA no se ensucie con ruido ajeno al fix de helpdesk, el stack local quedo ajustado asi:

- `AuthInitializer` solo intenta WebSocket si existe `VITE_DOCUMENTOS_WS_URL`
- el frontend source corre en modo development real
- `nginx` sigue exponiendo todo por `:8080`

## Flujo recomendado de uso

1. correr `helpdesk-local-no-build-down.ps1` si tenes dudas del estado actual
2. correr `helpdesk-local-no-build-up.ps1`
3. probar manual o con Playwright
4. cuando termines, correr `helpdesk-local-no-build-down.ps1`

## Si queres repetir una prueba Playwright

Este modo esta pensado para eso: levantar rapido, probar el flujo en `:8080`, bajar y listo.

Especialmente util para:

- smoke tests de login
- creacion de tickets
- validacion de adjuntos
- regresiones del detalle de Helpdesk

## Resumen corto

Si no te queres acordar de nada, acordate solo de esto:

### Subir

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\helpdesk-local-no-build-up.ps1"
```

### Bajar

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\helpdesk-local-no-build-down.ps1"
```

### Probar

- `http://localhost:8080/login`
- `admin@empresa.com / password123`
