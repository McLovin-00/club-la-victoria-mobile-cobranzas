# Documentación de Despliegue - Servidor 10.8.10.20

**Fecha:** 2025-12-08  
**Autor:** Asistente AI  
**Servidor:** 10.8.10.20 (ubuntu1)

---

## Resumen de Servicios Desplegados

| Servicio | Puerto | Estado | Descripción |
|----------|--------|--------|-------------|
| bca_frontend | 8550 | ✅ Running | Frontend React/Vite |
| bca_backend | 4800 | ✅ Healthy | API Backend (Express) |
| bca_documentos | 4802 | ✅ Healthy | API Documentos |
| bca_flowise | 3005 | ✅ Healthy | Flowise AI |
| bca_minio | 9000-9001 | ✅ Healthy | MinIO Storage |
| bca_postgres | 5432 | ✅ Healthy | PostgreSQL 16 |
| bca_redis | 6379 | ✅ Healthy | Redis (solo localhost) |

---

## Configuración de Nginx Proxy Manager

### Proxy Hosts configurados para 10.8.10.20

#### 1. bca-group.microsyst.com.ar (ID: 17)

| Parámetro | Valor |
|-----------|-------|
| Dominio | `bca-group.microsyst.com.ar` |
| Forward Host | `10.8.10.20` |
| Forward Port | `8550` |
| SSL | ❌ No (Let's Encrypt challenge falló) |
| WebSocket | ✅ Habilitado |

**Configuración Avanzada (Custom Locations):**

```nginx
# Proxy para Backend API
location /api/platform/ {
    proxy_pass http://10.8.10.20:4800/api/platform/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Proxy para Documentos API
location /api/docs/ {
    proxy_pass http://10.8.10.20:4802/api/docs/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Proxy para WebSocket
location /socket.io/ {
    proxy_pass http://10.8.10.20:4802/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

#### 2. documentos.microsyst.com.ar (ID: 16)

| Parámetro | Valor |
|-----------|-------|
| Dominio | `documentos.microsyst.com.ar` |
| Forward Host | `10.8.10.20` |
| Forward Port | `4802` |
| SSL | ❌ No |

---

## Cambios Realizados (2025-12-08)

### 1. Corrección de Puerto - documentos.microsyst.com.ar

**Problema:** El proxy host `documentos.microsyst.com.ar` apuntaba al puerto incorrecto (4002).

**Solución:** Se corrigió el puerto de `4002` a `4802`.

```bash
# Antes
forward_port: 4002

# Después  
forward_port: 4802
```

### 2. Creación de Proxy Host - bca-group.microsyst.com.ar

Se creó un nuevo proxy host con configuración avanzada para manejar:
- Frontend estático en `/`
- Backend API en `/api/platform/`
- Documentos API en `/api/docs/`
- WebSocket en `/socket.io/`

### 3. Reconstrucción del Frontend

**Problema:** El frontend tenía URLs hardcodeadas apuntando a `http://10.8.10.20:4800` y `http://10.8.10.20:4802`, lo que causaba errores de Mixed Content cuando se accedía desde el dominio.

**Solución:** Se actualizaron las variables de build de Vite para usar el dominio del proxy:

```yaml
# Antes
VITE_API_URL: http://10.8.10.20:4800
VITE_API_BASE_URL: http://10.8.10.20:4800
VITE_DOCUMENTOS_API_URL: http://10.8.10.20:4802
VITE_DOCUMENTOS_WS_URL: http://10.8.10.20:4802

# Después
VITE_API_URL: http://bca-group.microsyst.com.ar
VITE_API_BASE_URL: http://bca-group.microsyst.com.ar
VITE_DOCUMENTOS_API_URL: http://bca-group.microsyst.com.ar
VITE_DOCUMENTOS_WS_URL: http://bca-group.microsyst.com.ar
```

---

## Usuarios de Prueba

| Email | Rol | Contraseña |
|-------|-----|------------|
| admin@bca.com | SUPERADMIN | Test1234 |
| admin.interno@bca.com | ADMIN_INTERNO | Test1234 |
| dador_de_carga@empresa.com | DADOR_DE_CARGA | Test1234 |
| cliente@empresa.com | CLIENTE | Test1234 |
| transportista@empresa.com | TRANSPORTISTA | Test1234 |
| chofer@empresa.com | CHOFER | Test1234 |

---

## URLs de Acceso

| Servicio | URL |
|----------|-----|
| Frontend (vía proxy) | http://bca-group.microsyst.com.ar |
| Frontend (directo) | http://10.8.10.20:8550 |
| Backend API | http://10.8.10.20:4800 |
| Documentos API | http://10.8.10.20:4802 |
| Flowise | http://10.8.10.20:3005 |
| MinIO Console | http://10.8.10.20:9001 |

---

## Problemas Conocidos y Pendientes

### 1. Nginx Proxy Manager - Rutas de API no funcionan

**Problema:** El proxy host `bca-group.microsyst.com.ar` está configurado con advanced_config para las rutas `/api/platform` y `/api/docs`, pero las peticiones a estas rutas devuelven el frontend (HTML) en lugar de ser proxy a los backends.

**Causa probable:** 
- NPM tiene una configuración de redirect forzado a HTTPS que interfiere
- Existe un certificado SSL antiguo (del 27/10/2025) que no aparece en la API de NPM
- Las custom locations no tienen precedencia sobre el location principal

**Workaround actual:** Acceder directamente a `http://10.8.10.20:8550` para evitar el proxy.

**Acciones necesarias:**
1. Revisar manualmente la configuración de nginx en el servidor NPM
2. Eliminar certificados/configuraciones huérfanas
3. Verificar si hay una regla global de redirect a HTTPS

### 2. SSL/HTTPS

**Estado:** Hay un certificado Let's Encrypt válido para `bca-group.microsyst.com.ar` (vence 25/01/2026) pero no aparece en la API de NPM.

### 3. Health Check del Frontend

El frontend muestra estado "unhealthy" pero está funcionando. Es un problema cosmético de goStatic.

---

## Acceso Recomendado (Temporal)

Mientras se resuelven los problemas del proxy, usar acceso directo:

| Servicio | URL Directa |
|----------|-------------|
| **Frontend** | http://10.8.10.20:8550 |
| Backend API | http://10.8.10.20:4800 |
| Documentos API | http://10.8.10.20:4802 |

---

## Comandos Útiles

```bash
# Conectar al servidor
ssh -i ~/.ssh/bca_10_8_10_20 administrador@10.8.10.20

# Ver estado de contenedores
docker ps

# Ver logs de un servicio
docker logs bca_frontend --tail 50
docker logs bca_backend --tail 50
docker logs bca_documentos --tail 50

# Reiniciar un servicio
cd /home/administrador/monorepo/deploy/stack-ip-192.168.15.136
docker compose restart frontend

# Reconstruir un servicio
docker compose build --no-cache frontend
docker compose up -d frontend
```

---

## Archivos de Configuración

- **Docker Compose:** `/home/administrador/monorepo/deploy/stack-ip-192.168.15.136/docker-compose.yml`
- **JWT Keys:** `/home/administrador/monorepo/deploy/stack-ip-192.168.15.136/keys/`
- **Nginx Proxy Manager:** http://10.3.0.237:81

---

*Documentación generada automáticamente - 2025-12-08*

