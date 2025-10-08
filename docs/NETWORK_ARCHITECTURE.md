# Arquitectura de Red - Separación Interna/Externa

## Problema Resuelto

El monorepo tenía problemas de acceso entre servicios internos y externos:
- **Desde dentro**: Los microservicios no podían acceder a URLs públicas de MinIO
- **Desde fuera**: Los navegadores no podían visualizar imágenes de buckets
- **Confusión**: Mezcla de endpoints internos (10.3.0.244:9000) y externos (buck.microsyst.com.ar)

## Solución Implementada

### 🏗️ **Arquitectura de Dos Capas**

```
┌─────────────────────────────────────────────────────────┐
│                    INTERNET / USUARIOS                  │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                 NGINX REVERSE PROXY                     │
│  ✓ SSL Termination    ✓ Rate Limiting                  │
│  ✓ Load Balancing     ✓ Security Headers               │
│                                                         │
│  🌐 bca.microsyst.com.ar    → Frontend + Backend API   │
│  📄 doc.microsyst.com.ar    → Documentos Microservice  │
│  🪣 buck.microsyst.com.ar   → MinIO Storage            │
│  📊 bac-bca.microsyst.com.ar → Calidad Microservice    │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                 FRONTEND NETWORK                        │
│  🖥️  Frontend (React)                                   │
│  🔗 Backend (Express)                                   │
│  📄 Documentos (Express)                                │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                 BACKEND NETWORK                         │
│  🗄️  PostgreSQL                                         │
│  ⚡ Redis                                               │
│  🪣 MinIO                                               │
│  📊 Calidad (cuando está habilitado)                    │
└─────────────────────────────────────────────────────────┘
```

### 🔐 **Separación de Acceso**

#### **EXTERNOS (a través de nginx)**
- ✅ **Frontend**: https://bca.microsyst.com.ar
- ✅ **API Backend**: https://bca.microsyst.com.ar/api/
- ✅ **Documentos**: https://doc.microsyst.com.ar/api/
- ✅ **MinIO Buckets**: https://buck.microsyst.com.ar/
- ✅ **Calidad**: https://bac-bca.microsyst.com.ar/api/

#### **INTERNOS (solo red Docker)**
- 🔒 **PostgreSQL**: `postgres:5432` (solo backend network)
- 🔒 **Redis**: `redis:6379` (solo backend network)
- 🔒 **MinIO Interno**: `minio:9000` (solo backend network)
- 🔒 **Frontend Interno**: `frontend:8550` (solo frontend network)
- 🔒 **Backend Interno**: `backend:4800` (solo frontend network)

## 📋 Configuración por Entorno

### **Desarrollo (docker-compose.dev.yml)**
```bash
# Acceso directo para desarrollo
MINIO_ENDPOINT=minio:9000
MINIO_PUBLIC_BASE_URL=http://10.3.0.244:9000
MINIO_INTERNAL_BASE_URL=http://minio:9000
FRONTEND_URLS=http://localhost:8550,http://10.3.0.244:8550
```

### **Producción (docker-compose.prod.yml)**
```bash
# Solo a través de nginx proxy
MINIO_ENDPOINT=minio:9000
MINIO_PUBLIC_BASE_URL=https://buck.microsyst.com.ar
MINIO_INTERNAL_BASE_URL=http://minio:9000
FRONTEND_URLS=https://bca.microsyst.com.ar
```

## 🔧 MinIO - Doble Configuración

### **Cliente Interno (microservicios)**
```typescript
// Para operaciones CRUD internas
this.client = new MinIOClient({
  endPoint: 'minio',           // Nombre del servicio Docker
  port: 9000,
  useSSL: false,
  accessKey: '...',
  secretKey: '...'
});
```

### **Cliente Público (URLs firmadas)**
```typescript
// Para generar URLs públicas
this.publicSignerClient = new MinIOClient({
  endPoint: 'buck.microsyst.com.ar',  // Dominio público
  port: 443,
  useSSL: true,
  accessKey: '...',
  secretKey: '...'
});
```

## 🚀 Despliegue

### **Desarrollo**
```bash
npm run dev
# o
docker-compose -f docker-compose.dev.yml up -d
```

### **Producción**
```bash
./scripts/deploy-prod.sh
```

## 🔍 Verificación

### **Servicios Externos Funcionando**
```bash
curl -I https://bca.microsyst.com.ar
curl -I https://doc.microsyst.com.ar/api/health
curl -I https://buck.microsyst.com.ar
```

### **Servicios Internos Bloqueados**
```bash
# Estos deben fallar desde internet
curl postgres:5432     # ❌ No accesible
curl redis:6379        # ❌ No accesible  
curl minio:9000        # ❌ No accesible
```

### **Logs de Servicios**
```bash
# Desarrollo
docker-compose logs nginx frontend backend documentos

# Producción
docker service logs monorepo-prod_nginx
docker service logs monorepo-prod_frontend
docker service logs monorepo-prod_backend
docker service logs monorepo-prod_documentos
```

## 🔒 Seguridad

### **Headers de Seguridad (nginx)**
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### **Rate Limiting**
- API: 10 req/s con burst de 20
- Upload: 5 req/s con burst de 10

### **Networks Aisladas**
- **Frontend Network**: Solo servicios web
- **Backend Network**: Solo servicios de datos
- **No puertos expuestos**: Todos los servicios internos sin acceso directo

## 🎯 Beneficios

1. **✅ Imágenes de buckets visibles**: URLs públicas funcionan desde navegadores
2. **✅ Flowise funciona**: Acceso interno a MinIO para procesamiento
3. **✅ Seguridad mejorada**: Servicios de datos no expuestos
4. **✅ Escalabilidad**: Nginx maneja load balancing
5. **✅ SSL centralizado**: Un solo punto para certificados
6. **✅ Monitoreo simple**: Logs centralizados en nginx

## 🔧 Troubleshooting

### **Imágenes no cargan**
1. Verificar que nginx proxy esté funcionando
2. Comprobar que MinIO tenga `MINIO_SERVER_URL` configurado
3. Revisar que las URLs firmadas usen el dominio público

### **Servicios internos no se conectan**
1. Verificar que estén en la misma red Docker
2. Usar nombres de servicio, no IPs
3. Comprobar que los puertos internos sean correctos

### **CORS errors**
1. Verificar `FRONTEND_URLS` en variables de entorno
2. Asegurar que nginx preserve headers de origen
3. Comprobar configuración de `trust proxy` en Express
