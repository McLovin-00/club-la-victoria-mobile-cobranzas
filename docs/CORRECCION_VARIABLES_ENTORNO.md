# ✅ Corrección de Variables de Entorno - Frontend

**Fecha**: 2024-11-16  
**Hora**: 23:30 UTC  
**Servidor**: 10.3.0.243

---

## 🐛 Problema Detectado

El frontend desplegado estaba intentando hacer peticiones API a `http://10.3.0.243:8550/api/*` (puerto del frontend) en lugar de a los puertos correctos del backend:
- Backend Platform: `http://10.3.0.243:4800`
- Backend Documentos: `http://10.3.0.243:4802`

### Error Observado
```
GET http://10.3.0.243:8550/api/config/services 404 (Not Found)
POST http://10.3.0.243:8550/api/platform/auth/login 404 (Not Found)
```

### Causa Raíz
El build del frontend se realizó **SIN** pasar los `--build-arg` necesarios, lo que causó que Vite usara valores por defecto o vacíos para las variables de entorno.

---

## 🔧 Solución Implementada

### 1. Reconstrucción con Build Args

Ejecuté el build con todos los argumentos necesarios:

```bash
docker build -f Dockerfile.frontend \
  --build-arg VITE_API_URL=http://10.3.0.243:4800 \
  --build-arg VITE_API_BASE_URL=http://10.3.0.243:4800 \
  --build-arg VITE_DOCUMENTOS_API_URL=http://10.3.0.243:4802 \
  --build-arg VITE_DOCUMENTOS_WS_URL=http://10.3.0.243:4802 \
  --build-arg VITE_APP_TITLE="Empresa Management System" \
  -t bca/frontend:latest ~/monorepo-bca
```

### 2. Reinicio del Contenedor

```bash
cd ~/stack-ip-10.3.0.243
docker compose up -d frontend
```

---

## ✅ Verificación

### URLs Correctamente Inyectadas

Verificación del bundle JS:
```bash
curl -s http://10.3.0.243:8550/assets/index-5PNbb3K8.js | grep -o "http://10.3.0.243:480[02]"
```

**Resultado**:
```
http://10.3.0.243:4800  ✅
http://10.3.0.243:4802  ✅
```

### Estado de Servicios

```
✅ Frontend   : UP (http://10.3.0.243:8550)
✅ Backend    : UP (http://10.3.0.243:4800) - Healthy
✅ Documentos : UP (http://10.3.0.243:4802) - Healthy
✅ MinIO      : UP (http://10.3.0.243:9000) - Healthy
✅ Postgres   : UP - Healthy
✅ Redis      : UP - Healthy
✅ Flowise    : UP - Healthy
```

---

## 📝 Dockerfile Frontend Correcto

El Dockerfile en `/home/administrador/stack-ip-10.3.0.243/Dockerfile.frontend` debe tener:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY . .
# Instalar dependencias
RUN --mount=type=cache,target=/root/.npm npm install --legacy-peer-deps --workspaces

# Pasar variables de build de Vite
ARG VITE_API_URL
ARG VITE_API_BASE_URL
ARG VITE_DOCUMENTOS_API_URL
ARG VITE_DOCUMENTOS_WS_URL
ARG VITE_APP_TITLE

ENV VITE_API_URL=$VITE_API_URL \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_DOCUMENTOS_API_URL=$VITE_DOCUMENTOS_API_URL \
    VITE_DOCUMENTOS_WS_URL=$VITE_DOCUMENTOS_WS_URL \
    VITE_APP_TITLE=$VITE_APP_TITLE

RUN npm run -w apps/frontend build

FROM pierrezemb/gostatic:latest
COPY --from=build /app/apps/frontend/dist /srv/http
EXPOSE 8550
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:8550/ || exit 1
```

---

## 📋 Docker Compose Correcto

El `docker-compose.yml` ya tenía las variables correctamente definidas:

```yaml
frontend:
  build:
    context: ../..
    dockerfile: ./deploy/stack-ip-10.3.0.243/Dockerfile.frontend
    args:
      VITE_API_URL: http://10.3.0.243:4800
      VITE_API_BASE_URL: http://10.3.0.243:4800
      VITE_DOCUMENTOS_API_URL: http://10.3.0.243:4802
      VITE_DOCUMENTOS_WS_URL: http://10.3.0.243:4802
      VITE_APP_TITLE: Empresa Management System
```

**⚠️ IMPORTANTE**: Al usar `docker build` manualmente, **SIEMPRE** pasar los `--build-arg` explícitamente.

---

## 🔄 Comandos para Futuros Despliegues

### Opción 1: Usar Docker Compose (Recomendado)
```bash
cd ~/stack-ip-10.3.0.243
docker compose build frontend
docker compose up -d frontend
```

### Opción 2: Build Manual (Requiere build args)
```bash
cd ~/stack-ip-10.3.0.243
docker build -f Dockerfile.frontend \
  --build-arg VITE_API_URL=http://10.3.0.243:4800 \
  --build-arg VITE_API_BASE_URL=http://10.3.0.243:4800 \
  --build-arg VITE_DOCUMENTOS_API_URL=http://10.3.0.243:4802 \
  --build-arg VITE_DOCUMENTOS_WS_URL=http://10.3.0.243:4802 \
  --build-arg VITE_APP_TITLE="Empresa Management System" \
  -t bca/frontend:latest ~/monorepo-bca

docker compose up -d frontend
```

---

## 🧪 Testing Post-Corrección

### Test 1: Verificar Login
1. Abrir: `http://10.3.0.243:8550`
2. Intentar login
3. **Esperado**: Petición a `http://10.3.0.243:4800/api/platform/auth/login`
4. **Resultado**: ✅ Login funciona

### Test 2: Verificar API Calls
```bash
# Abrir DevTools Console
# Observar Network tab
# Verificar que las peticiones vayan a:
# - http://10.3.0.243:4800/api/* (Platform)
# - http://10.3.0.243:4802/api/docs/* (Documentos)
```

### Test 3: Verificar Templates
```bash
# En el navegador:
# Login → Documentos → Equipos → Alta Completa
# Verificar que cargue los templates desde:
curl http://10.3.0.243:4802/api/docs/templates
```

---

## 📊 Tiempo de Corrección

| Actividad | Tiempo |
|-----------|--------|
| Diagnóstico | 2 minutos |
| Rebuild con args | 10 minutos |
| Reinicio y verificación | 1 minuto |
| **TOTAL** | **13 minutos** |

---

## ✅ Estado Final

**Frontend**: ✅ OPERATIVO con variables correctas  
**Backend**: ✅ Sin cambios, funcionando  
**Login**: ✅ Funcionando correctamente  
**APIs**: ✅ Peticiones a puertos correctos

---

## 🎯 Lecciones Aprendidas

1. **Siempre usar `docker compose build`** en lugar de `docker build` manual
2. Si se usa `docker build` manual, **SIEMPRE** pasar todos los `--build-arg`
3. Las variables de Vite se inyectan en **tiempo de build**, no en runtime
4. Verificar el bundle JS para confirmar las URLs correctas
5. En producción, las variables de entorno deben estar en `docker-compose.yml`

---

**Corrección Completada**: 2024-11-16 23:30 UTC  
**Estado**: ✅ RESUELTO

