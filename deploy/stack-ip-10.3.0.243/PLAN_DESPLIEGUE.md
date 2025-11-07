# 📋 PLAN COMPLETO DE REPLICACIÓN: 10.8.10.20 → 10.3.0.243

## 🎯 Objetivo
Replicar el despliegue completo del servidor **10.8.10.20** al servidor **10.3.0.243**, adaptando todas las configuraciones de red, IPs y asegurando compatibilidad total.

---

## ✅ FASES COMPLETADAS

### ✅ Fase 1: Auditoría del servidor origen (10.8.10.20)
**Estado:** Completada mediante documentación

**Servicios identificados:**
1. **Backend Core** (Puerto 4800)
   - Node.js 20
   - Express API
   - 4GB RAM, 1.5 vCPU
   - Health: `/health`

2. **Microservicio Documentos** (Puerto 4802)
   - Node.js 20 con WebSockets
   - Procesamiento PDF con rasterización
   - 8GB RAM, 2.5 vCPU
   - Health: `/health`

3. **Frontend** (Puerto 8550)
   - Vite + React (SPA)
   - Servido con goStatic
   - 1GB RAM, 0.5 vCPU

4. **PostgreSQL 16** (Puerto 5432)
   - Base de datos compartida
   - 3 esquemas: platform, documentos, flowise
   - 16GB RAM, 2 vCPU
   - Usuario: `evo`, Password: `phoenix`

5. **Redis 7** (Puerto 6379 - interno)
   - Caché y sesiones
   - 3GB RAM, 0.5 vCPU
   - Persistencia AOF + RDB

6. **MinIO** (Puertos 9000, 9001)
   - Object storage S3-compatible
   - 6GB RAM, 1 vCPU
   - Usuario: `minioadmin`, Password: `minioadmin`

7. **Flowise** (Puerto 3005)
   - AI/LLM workflow automation
   - 6GB RAM, 1.5 vCPU
   - Usuario: `admin`, Password: `change-me`

**Recursos totales:** 3 vCPU, 32GB RAM, 800GB disco

---

### ✅ Fase 2: Extracción de configuraciones
**Estado:** Completada

**Archivos extraídos:**
- ✅ `docker-compose.yml` - Configuración completa de servicios
- ✅ `Dockerfile.backend` - Build backend core
- ✅ `Dockerfile.frontend` - Build frontend con Vite
- ✅ `Dockerfile.documentos` - Build microservicio documentos
- ✅ `postgres/init/01-pg_hba.sh` - Script init PostgreSQL
- ✅ `keys/jwt_private.pem` - Clave JWT privada
- ✅ `keys/jwt_public.pem` - Clave JWT pública
- ✅ `README.md` - Documentación completa

---

### ✅ Fase 3: Análisis de volúmenes persistentes
**Estado:** Completada

**Volúmenes identificados:**
1. **postgres_data** → `/var/lib/postgresql/data`
   - Tamaño esperado: ~120 GB
   - Crítico: Contiene todas las bases de datos

2. **redis_data** → `/data`
   - Tamaño esperado: ~5 GB
   - Persistencia: AOF + snapshots

3. **minio_data** → `/data`
   - Tamaño esperado: ~650 GB
   - Contiene documentos subidos

4. **flowise_data** → `/root/.flowise`
   - Tamaño esperado: ~10 GB
   - Workflows y configuraciones AI

**Volúmenes temporales (no persistentes):**
- `/tmp/minio-cache` - Caché temporal MinIO
- `/tmp/documentos-processing` - Procesamiento temporal PDFs
- `/tmp/flowise-uploads` - Uploads temporales Flowise

---

### ✅ Fase 4: Secrets y variables de entorno
**Estado:** Completada

**Secrets/Credenciales:**
```
PostgreSQL:
  - Usuario: evo
  - Password: phoenix
  - DB: monorepo-bca

MinIO:
  - Usuario: minioadmin
  - Password: minioadmin

Flowise:
  - Usuario: admin
  - Password: change-me

JWT:
  - Private Key: /keys/jwt_private.pem
  - Public Key: /keys/jwt_public.pem
```

**Variables de entorno críticas adaptadas:**
- `FRONTEND_URLS`: `http://10.3.0.243:8550`
- `CORS_ORIGIN`: `http://10.3.0.243:8550`
- `VITE_API_URL`: `http://10.3.0.243:4800`
- `VITE_DOCUMENTOS_API_URL`: `http://10.3.0.243:4802`
- `VITE_DOCUMENTOS_WS_URL`: `http://10.3.0.243:4802`
- `MINIO_ENDPOINT`: `10.3.0.243:9000`
- `MINIO_PUBLIC_BASE_URL`: `http://10.3.0.243:9000`
- `FLOWISE_ENDPOINT`: `http://10.3.0.243:3005/api/v1/extract`

---

### ✅ Fase 5: Redes y puertos
**Estado:** Completada

**Redes Docker:**
1. **core_net** (bridge) - Red interna para servicios backend
2. **edge_net** (bridge) - Red para servicios con acceso externo

**Puertos expuestos:**
| Puerto | Servicio | Protocolo | Acceso |
|--------|----------|-----------|--------|
| 4800 | Backend | HTTP | Público |
| 4802 | Documentos | HTTP/WS | Público |
| 8550 | Frontend | HTTP | Público |
| 5432 | PostgreSQL | TCP | Público |
| 9000 | MinIO API | HTTP | Público |
| 9001 | MinIO Console | HTTP | Público |
| 3005 | Flowise | HTTP | Público |
| 6379 | Redis | TCP | Solo localhost |

**Configuración UFW requerida:**
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 4800/tcp # Backend
sudo ufw allow 4802/tcp # Documentos
sudo ufw allow 8550/tcp # Frontend
sudo ufw allow 9000/tcp # MinIO
sudo ufw allow 3005/tcp # Flowise
sudo ufw allow 5432/tcp # PostgreSQL
sudo ufw enable
```

---

### ✅ Fase 6: Imágenes Docker
**Estado:** Completada

**Imágenes base:**
- `postgres:16` - Base de datos
- `redis:7-alpine` - Caché
- `minio/minio:latest` - Object storage
- `flowiseai/flowise:latest` - AI workflows
- `node:20-alpine` - Runtime Node.js (backend/documentos)
- `pierrezemb/gostatic:latest` - Servidor estático (frontend)

**Imágenes personalizadas a construir:**
- `bca/backend:latest` - Backend core
- `bca/documentos:latest` - Microservicio documentos
- `bca/frontend:latest` - Frontend React

---

### ✅ Fase 7: Adaptación de configuraciones
**Estado:** Completada

**Cambios realizados:**
1. ✅ Creado directorio `/home/administrador/monorepo-bca/deploy/stack-ip-10.3.0.243/`
2. ✅ Copiadas claves JWT a `keys/`
3. ✅ Copiado script init PostgreSQL a `postgres/init/`
4. ✅ Copiados todos los Dockerfiles
5. ✅ Creado `docker-compose.yml` con IP `10.3.0.243`
6. ✅ Creado `README.md` actualizado
7. ✅ Todas las referencias de `10.8.10.20` reemplazadas por `10.3.0.243`

**Diferencias con el origen:**
- IP actualizada: `10.8.10.20` → `10.3.0.243`
- CORS en documentos simplificado (removidas URLs de producción)
- Mismas claves JWT y credenciales
- Misma configuración de recursos

---

## 🚀 FASES PENDIENTES DE EJECUCIÓN

### ⏳ Fase 8: Desplegar servicios en 10.3.0.243
**Estado:** Pendiente (requiere ejecución)

**Pasos a ejecutar:**

#### 8.1. Preparar el servidor destino
```bash
# Copiar stack completo al servidor
scp -r /home/administrador/monorepo-bca/deploy/stack-ip-10.3.0.243 \
    administrador@10.3.0.243:~/

# También copiar código fuente completo (necesario para builds)
scp -r /home/administrador/monorepo-bca \
    administrador@10.3.0.243:~/
```

#### 8.2. Conectarse al servidor
```bash
ssh administrador@10.3.0.243
```

#### 8.3. Verificar prerrequisitos
```bash
# Verificar Docker instalado
docker --version
docker compose version

# Verificar UFW configurado
sudo ufw status

# Si no está configurado, ejecutar:
sudo ufw allow 22/tcp
sudo ufw allow 4800/tcp
sudo ufw allow 4802/tcp
sudo ufw allow 8550/tcp
sudo ufw allow 9000/tcp
sudo ufw allow 3005/tcp
sudo ufw allow 5432/tcp
sudo ufw enable
```

#### 8.4. Construir imágenes
```bash
cd ~/monorepo-bca/deploy/stack-ip-10.3.0.243

# Build (puede tardar 10-20 minutos)
docker compose build --no-cache
```

#### 8.5. Levantar servicios
```bash
# Levantar en modo detached
docker compose up -d

# Monitorear logs
docker compose logs -f
```

#### 8.6. Verificar servicios iniciados
```bash
docker compose ps
```

Esperar que todos los servicios estén "healthy".

---

### ⏳ Fase 9: Verificar health checks
**Estado:** Pendiente (requiere ejecución)

**Checklist de verificación:**

#### 9.1. PostgreSQL
```bash
# Health check
docker exec bca_postgres pg_isready -U evo -d monorepo-bca

# Verificar conexión externa
psql postgresql://evo:phoenix@10.3.0.243:5432/monorepo-bca -c "SELECT version();"
```

#### 9.2. Redis
```bash
docker exec bca_redis redis-cli ping
# Debe responder: PONG
```

#### 9.3. MinIO
```bash
curl http://10.3.0.243:9000/minio/health/ready
# Debe responder: OK

# Acceder a console
firefox http://10.3.0.243:9001
# Login: minioadmin / minioadmin
```

#### 9.4. Backend
```bash
curl http://10.3.0.243:4800/health
# Debe responder JSON con status: ok
```

#### 9.5. Documentos
```bash
curl http://10.3.0.243:4802/health
# Debe responder JSON con status: ok

# Verificar WebSocket (desde browser console)
# new WebSocket('ws://10.3.0.243:4802')
```

#### 9.6. Flowise
```bash
curl http://10.3.0.243:3005/
# Debe responder HTML de Flowise

# Acceder a UI
firefox http://10.3.0.243:3005
# Login: admin / change-me
```

#### 9.7. Frontend
```bash
curl http://10.3.0.243:8550
# Debe responder HTML del frontend

# Acceder desde browser
firefox http://10.3.0.243:8550
```

---

### ⏳ Fase 10: Migraciones y configuración post-despliegue
**Estado:** Pendiente (requiere ejecución)

#### 10.1. Ejecutar migraciones Prisma
```bash
cd ~/monorepo-bca

# Migración backend
npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma

# Migración documentos
npx prisma migrate deploy --schema=apps/documentos/prisma/schema.prisma
```

#### 10.2. Seed inicial (si es necesario)
```bash
# El servicio documentos tiene SEED=true, se ejecuta automáticamente
# Verificar logs
docker compose logs documentos | grep -i seed
```

#### 10.3. Crear bucket en MinIO
```bash
# Acceder a MinIO Console: http://10.3.0.243:9001
# Login: minioadmin / minioadmin
# Crear bucket: "documentos-empresa-1" (o según DEFAULT_TENANT_ID)
```

#### 10.4. Configurar Flowise (si es necesario)
```bash
# Acceder a Flowise UI: http://10.3.0.243:3005
# Login: admin / change-me
# Importar workflows si existen desde 10.8.10.20
```

---

## 📊 REPORTE DE DIFERENCIAS

### Configuraciones idénticas
- ✅ Credenciales de bases de datos
- ✅ Claves JWT (compartidas)
- ✅ Configuración de recursos (CPU/RAM)
- ✅ Dockerfiles y lógica de build
- ✅ Puertos expuestos
- ✅ Volúmenes y persistencia

### Configuraciones adaptadas
- 🔄 IP: `10.8.10.20` → `10.3.0.243` (16 cambios)
- 🔄 CORS documentos: URLs de producción removidas
- 🔄 Paths en docker-compose: `stack-ip-192.168.15.136` → `stack-ip-10.3.0.243`

### Datos NO replicados (iniciará limpio)
- ⚠️ Base de datos PostgreSQL (vacía, se poblará con migraciones)
- ⚠️ Volúmenes MinIO (sin documentos previos)
- ⚠️ Caché Redis (vacío)
- ⚠️ Workflows Flowise (vacío)

**Si necesitas copiar datos del servidor origen, ver sección siguiente.**

---

## 💾 OPCIONAL: Migración de datos desde 10.8.10.20

### Si necesitas replicar datos existentes:

#### Opción A: Backup/Restore PostgreSQL
```bash
# En servidor origen (10.8.10.20)
docker exec bca_postgres pg_dump -U evo -Fc monorepo-bca > backup.dump

# Copiar a servidor destino
scp backup.dump administrador@10.3.0.243:~/

# En servidor destino (10.3.0.243)
docker exec -i bca_postgres pg_restore -U evo -d monorepo-bca -c < backup.dump
```

#### Opción B: Copiar volúmenes Docker
```bash
# Detener servicios en destino
ssh administrador@10.3.0.243 "cd ~/stack-ip-10.3.0.243 && docker compose down"

# Copiar volumen postgres_data
ssh administrador@10.8.10.20 \
  "docker run --rm -v postgres_data:/data -v /tmp:/backup alpine tar czf /backup/postgres.tar.gz -C /data ."
scp administrador@10.8.10.20:/tmp/postgres.tar.gz /tmp/
scp /tmp/postgres.tar.gz administrador@10.3.0.243:/tmp/
ssh administrador@10.3.0.243 \
  "docker run --rm -v postgres_data:/data -v /tmp:/backup alpine tar xzf /backup/postgres.tar.gz -C /data"

# Repetir para minio_data, redis_data, flowise_data
```

---

## 🛠️ COMANDOS ÚTILES POST-DESPLIEGUE

### Monitoreo
```bash
# Ver estado de servicios
docker compose ps

# Logs en tiempo real
docker compose logs -f

# Logs específicos
docker compose logs -f backend
docker compose logs -f documentos

# Recursos utilizados
docker stats
```

### Troubleshooting
```bash
# Reiniciar servicio específico
docker compose restart backend

# Reconstruir y reiniciar
docker compose up -d --build backend

# Ver configuración aplicada
docker compose config

# Entrar a contenedor
docker exec -it bca_backend sh
```

### Mantenimiento
```bash
# Actualizar imágenes base
docker compose pull

# Limpiar volúmenes huérfanos
docker volume prune

# Ver uso de disco
docker system df

# Backup manual volumen
docker run --rm -v postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres-$(date +%Y%m%d).tar.gz -C /data .
```

---

## ✅ CHECKLIST FINAL

Antes de dar por completado el despliegue, verificar:

- [ ] Todos los servicios están "healthy" en `docker compose ps`
- [ ] Backend responde en `http://10.3.0.243:4800/health`
- [ ] Documentos responde en `http://10.3.0.243:4802/health`
- [ ] Frontend carga correctamente en `http://10.3.0.243:8550`
- [ ] MinIO accesible en `http://10.3.0.243:9000` y `9001`
- [ ] Flowise accesible en `http://10.3.0.243:3005`
- [ ] PostgreSQL acepta conexiones externas en puerto `5432`
- [ ] Migraciones Prisma ejecutadas sin errores
- [ ] Buckets MinIO creados correctamente
- [ ] CORS funciona (probar desde frontend)
- [ ] WebSockets funcionan en documentos
- [ ] Logs no muestran errores críticos

---

## 📞 SOPORTE

Si encuentras problemas durante el despliegue:

1. **Verificar logs:** `docker compose logs -f`
2. **Verificar recursos:** `docker stats` (RAM/CPU suficiente?)
3. **Verificar red:** ¿Puertos abiertos en UFW?
4. **Verificar conectividad:** ¿Servicios pueden resolverse entre sí?

**Archivos de configuración:**
- Docker Compose: `/home/administrador/monorepo-bca/deploy/stack-ip-10.3.0.243/docker-compose.yml`
- README: `/home/administrador/monorepo-bca/deploy/stack-ip-10.3.0.243/README.md`

---

**Fecha de creación:** 2025-11-06  
**Origen:** 10.8.10.20  
**Destino:** 10.3.0.243  
**Versión:** 1.0

