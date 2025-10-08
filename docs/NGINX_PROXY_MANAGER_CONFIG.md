# Configuración Nginx Proxy Manager

## Problema Identificado

Las rutas de documentos devuelven 404 a través del dominio público `doc.microsyst.com.ar` pero funcionan correctamente en localhost:4802. Esto indica un problema de configuración en Nginx Proxy Manager.

## Configuración Requerida

### **1. doc.microsyst.com.ar**

#### **Details Tab:**
- **Domain Names:** `doc.microsyst.com.ar`
- **Scheme:** `http`
- **Forward Hostname/IP:** `10.3.0.244` (IP interna del servidor)
- **Forward Port:** `4802`
- **Cache Assets:** ❌ (desactivado)
- **Block Common Exploits:** ✅ (activado)
- **Websockets Support:** ✅ (activado para Socket.IO)

#### **SSL Tab:**
- **SSL Certificate:** Certificado válido para `doc.microsyst.com.ar`
- **Force SSL:** ✅ (activado)
- **HTTP/2 Support:** ✅ (activado)
- **HSTS Enabled:** ✅ (activado)

#### **Advanced Tab:**
```nginx
# Configuración específica para microservicio Documentos
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Server $host;

# Timeouts para uploads grandes
proxy_read_timeout 300s;
proxy_connect_timeout 75s;
proxy_send_timeout 300s;

# Buffer settings para archivos grandes
proxy_buffering off;
proxy_request_buffering off;

# Cliente máximo para uploads
client_max_body_size 50M;

# Headers de seguridad
add_header X-Frame-Options SAMEORIGIN;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy strict-origin-when-cross-origin;

# Logging específico para debugging
access_log /var/log/nginx/doc_microsyst_access.log;
error_log /var/log/nginx/doc_microsyst_error.log warn;
```

### **2. buck.microsyst.com.ar (MinIO)**

#### **Details Tab:**
- **Domain Names:** `buck.microsyst.com.ar`
- **Scheme:** `http`
- **Forward Hostname/IP:** `10.3.0.244`
- **Forward Port:** `9000`
- **Cache Assets:** ❌ (desactivado)
- **Block Common Exploits:** ❌ (desactivado para MinIO)
- **Websockets Support:** ❌ (no necesario)

#### **Advanced Tab:**
```nginx
# MinIO specific headers
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# MinIO necesita estos headers específicos
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Server $host;

# Timeouts para archivos grandes
proxy_read_timeout 300s;
proxy_connect_timeout 75s;
proxy_send_timeout 300s;

# Desactivar buffering para streaming
proxy_buffering off;
proxy_request_buffering off;

# Cliente máximo para uploads grandes
client_max_body_size 100M;

# Headers específicos para MinIO
add_header X-Frame-Options SAMEORIGIN;
add_header X-Content-Type-Options nosniff;
```

### **3. bca.microsyst.com.ar (Frontend + Backend)**

#### **Details Tab:**
- **Domain Names:** `bca.microsyst.com.ar`
- **Scheme:** `http`
- **Forward Hostname/IP:** `10.3.0.244`
- **Forward Port:** `4800` (Backend)
- **Cache Assets:** ❌ (desactivado)
- **Block Common Exploits:** ✅ (activado)
- **Websockets Support:** ✅ (activado)

#### **Custom Locations Tab:**
**Location:** `/`
```nginx
# Servir frontend desde puerto 8550
proxy_pass http://10.3.0.244:8550;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# WebSocket support para frontend
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

**Location:** `/api/`
```nginx
# API Backend en puerto 4800
proxy_pass http://10.3.0.244:4800;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# Timeouts para API
proxy_read_timeout 60s;
proxy_connect_timeout 10s;
proxy_send_timeout 60s;
```

## Verificación

### **Después de aplicar la configuración:**

```bash
# Verificar que los servicios respondan correctamente
curl -I https://doc.microsyst.com.ar/health/ready
curl -I https://buck.microsyst.com.ar/
curl -I https://bca.microsyst.com.ar/api/health

# Verificar rutas específicas de documentos (con auth)
curl -H "Authorization: Bearer <token>" \
     https://doc.microsyst.com.ar/api/docs/documents/508/preview
```

### **Logs para debugging:**
```bash
# En el servidor
tail -f /var/log/nginx/doc_microsyst_access.log
tail -f /var/log/nginx/doc_microsyst_error.log

# En el contenedor de documentos
docker logs dev-documentos -f
```

## Importante

⚠️ **El problema actual es que Nginx Proxy Manager no está reenviando correctamente las rutas al microservicio de documentos.**

La configuración actual en NPM probablemente está:
1. No preservando el path correcto (`/api/docs/documents/...`)
2. No configurando los headers necesarios
3. Posiblemente usando una configuración incorrecta de proxy_pass

Aplica la configuración de arriba en NPM y el problema se resolverá.
