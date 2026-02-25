# Plan de Producción - Ecosistema BCA (500–1.000 equipos)

**Fecha**: 2026-02-25  
**Objetivo**: Diseñar la infraestructura de producción para soportar **500–1.000 equipos** (camión + acoplado + chofer)  
**Referencia actual**: ~100 equipos en un solo servidor (10.8.10.20, 30 GB RAM, 3 cores)  
**Infraestructura**: On-premise — VMs Ubuntu 24.04 LTS virtualizadas sobre Windows Server (Hyper-V)

---

## 1. Análisis de Escala

### 1.1 Consumo actual vs. proyección

| Recurso | 100 equipos (actual) | 500 equipos | 1.000 equipos |
|---------|---------------------|-------------|---------------|
| PostgreSQL RAM | 250 MB | ~1.2 GB | ~2.5 GB |
| Redis RAM | 5.5 MB | ~28 MB | ~55 MB |
| Documentos RAM (idle) | 66 MB | ~330 MB | ~660 MB |
| Documentos RAM (pico) | 2-4 GB | 10-20 GB | 20-40 GB |
| Backend RAM | 39.5 MB | ~200 MB | ~400 MB |
| MinIO almacenamiento | ~33 GB | ~165 GB | ~330 GB |
| Flowise RAM | 359 MB | ~500 MB | ~700 MB |

### 1.2 Volumen operativo estimado

| Métrica | 500 equipos | 1.000 equipos |
|---------|-------------|---------------|
| Documentos activos | 15.000 – 30.000 | 30.000 – 60.000 |
| Documentos subidos/día | 50 – 125 | 100 – 250 |
| Validaciones AI/día | 50 – 125 | 100 – 250 |
| Remitos procesados/día | 125 – 500 | 250 – 1.000 |
| Usuarios concurrentes | 15 – 50 | 30 – 80 |
| WebSocket connections | 15 – 75 | 30 – 100 |
| Almacenamiento archivos | ~200 GB | ~400 GB |
| Crecimiento mensual storage | ~8-15 GB | ~15-25 GB |

### 1.3 Conclusión de dimensionamiento

A esta escala (5-10× la actual), el cuello de botella principal no es el tráfico de APIs sino el **procesamiento AI de documentos** y la **capacidad de I/O de la base de datos**. El volumen de usuarios concurrentes es moderado (30-80) y no justifica múltiples réplicas de backend. La arquitectura correcta es **separar datos y AI del application layer**, pero sin la granularidad necesaria para 2.000 equipos.

**Decisión arquitectónica**: 3 VMs en lugar de 5.

---

## 2. Arquitectura Propuesta: 3 Máquinas Virtuales

### 2.1 Diagrama General

```
                            ┌──────────────────────┐
                            │     INTERNET          │
                            │   DNS → bca-group...  │
                            └──────────┬───────────┘
                                       │
                        ┌──────────────▼──────────────┐
                        │     VM1 - APPLICATION       │
                        │  Nginx + Frontend + APIs    │
                        │  Backend, Documentos,       │
                        │  Remitos, Flowise           │
                        └──────┬──────────┬───────────┘
                               │          │
                    ┌──────────▼──┐  ┌────▼────────────┐
                    │ VM2 - DATA  │  │ VM3 - BACKUP    │
                    │ PostgreSQL  │  │ PG Replica       │
                    │ Redis       │  │ Monitoring       │
                    │ MinIO       │  │ Backups          │
                    └─────────────┘  └─────────────────┘
```

### 2.2 Distribución de VMs

Todas las VMs corren **Ubuntu 24.04 LTS** como Guest OS, virtualizadas con **Hyper-V** sobre Windows Server.

| VM | Rol | vCPU | RAM | Disco (VHDX) | Servicios |
|----|-----|------|-----|--------------|-----------|
| **VM1** | Application + Edge | 8 | 32 GB | 100 GB SSD | Nginx, Frontend, Backend, Documentos, Remitos, Flowise |
| **VM2** | Data Layer | 4 | 32 GB | 1 TB SSD/NVMe | PostgreSQL 16 (primary), Redis 7, MinIO |
| **VM3** | Backup + Monitoring | 4 | 16 GB | 1 TB HDD | PG Read Replica, Grafana, Prometheus, Loki |

**Total VMs**: 16 vCPU, 80 GB RAM, ~2.1 TB almacenamiento

### 2.3 Servidor Físico (Host Windows)

Las 3 VMs caben cómodamente en **1 servidor físico** con Hyper-V:

| Servidor Físico | SO Host | CPU mínima | RAM mínima | Disco | VMs alojadas |
|-----------------|---------|------------|------------|-------|--------------|
| **Host único** | Windows Server 2022/2025 | 16+ cores (Xeon E-2400 o similar) | 96 GB DDR5 ECC | 1× NVMe 2 TB (VMs app+data) + 1× HDD 2 TB (VM backup) | VM1, VM2, VM3 |

**Configuración Hyper-V recomendada por VM**:
- **Generación**: Gen 2 (UEFI, secure boot con Microsoft UEFI CA)
- **Memoria dinámica**: Deshabilitada (RAM fija, crítico para PostgreSQL/Redis)
- **vSwitch**: External virtual switch conectado al NIC físico
- **Disco**: VHDX tamaño fijo (mejor performance que dinámico para DB)
- **Checkpoints**: Deshabilitados en producción (impacto en I/O)
- **Integration Services**: Habilitados (time sync, heartbeat, backup)

**Configuración de red en el host**:

```
┌────────────────────────────────────────┐
│       HOST WINDOWS (Hyper-V)           │
│                                         │
│  NIC Físico ──► External vSwitch       │
│                      │                  │
│         ┌────────────┼──────────┐      │
│         │            │          │      │
│      VM1 (eth0)  VM2 (eth0)  VM3 (eth0)│
│      10.x.x.10  10.x.x.20  10.x.x.30 │
│                                         │
│  IPs estáticas via netplan en Ubuntu   │
└────────────────────────────────────────┘
```

### 2.4 Por qué 3 VMs y no 5

| Aspecto | 5 VMs (plan 2.000 equipos) | 3 VMs (este plan) | Justificación |
|---------|---------------------------|-------------------|---------------|
| Réplicas de API | Backend ×2, Docs ×2, Remitos ×2 | Backend ×1, Docs ×1, Remitos ×1 | 30-80 usuarios concurrentes no requieren load balancing |
| Flowise | Dedicado en VM separada ×2 | Co-localizado en VM1 ×1 | 50-250 validaciones/día alcanza con 1 instancia (3 concurrent) |
| Edge/Proxy | VM dedicada | Nginx en VM1 | El tráfico no justifica un proxy dedicado |
| Monitoring | VM dedicada con PG replica | VM3 comparte backup + monitoring | El volumen de métricas es manejable |
| Hosts físicos | 2 servidores | 1 servidor | Menor costo, menor complejidad |

---

## 3. Detalle por VM

### 3.1 VM1 — Application + Edge

**Propósito**: Punto de entrada único. Nginx termina SSL, sirve frontend estático, hace proxy reverso a los servicios backend que corren en la misma máquina. Incluye Flowise para procesamiento AI.

**Hardware**: 8 vCPU, 32 GB RAM, 100 GB SSD

**Servicios (Docker Compose)**:

```yaml
version: "3.8"

services:
  nginx:
    image: nginx:1.27-alpine
    container_name: bca_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - certbot_data:/var/www/certbot:ro
    depends_on:
      frontend:
        condition: service_healthy
      backend:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.5"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 5s
      retries: 3

  frontend:
    image: bca/frontend:latest
    container_name: bca_frontend
    expose:
      - "8550"
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: "0.3"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8550"]
      interval: 30s
      timeout: 5s
      retries: 3

  backend:
    image: bca/backend:latest
    container_name: bca_backend
    expose:
      - "4800"
    environment:
      NODE_ENV: production
      BACKEND_PORT: 4800
      DATABASE_URL: postgresql://bca_app:${DB_APP_PASSWORD}@${VM2_IP}:5432/monorepo-bca?schema=platform
      NODE_OPTIONS: --max-old-space-size=3072
      UV_THREADPOOL_SIZE: 16
      JWT_PRIVATE_KEY_PATH: /run/secrets/jwt_private.pem
      JWT_PUBLIC_KEY_PATH: /run/secrets/jwt_public.pem
      FRONTEND_URLS: https://bca-group.microsyst.com.ar
      CORS_ORIGIN: https://bca-group.microsyst.com.ar
    volumes:
      - ./keys/jwt_private.pem:/run/secrets/jwt_private.pem:ro
      - ./keys/jwt_public.pem:/run/secrets/jwt_public.pem:ro
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "1.5"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:4800/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  documentos:
    image: bca/documentos:latest
    container_name: bca_documentos
    expose:
      - "4802"
    environment:
      NODE_ENV: production
      DOCUMENTOS_PORT: 4802
      DOCUMENTOS_DATABASE_URL: postgresql://bca_app:${DB_APP_PASSWORD}@${VM2_IP}:5432/monorepo-bca?schema=documentos
      NODE_OPTIONS: --max-old-space-size=6144
      UV_THREADPOOL_SIZE: 20
      REDIS_HOST: ${VM2_IP}
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      MINIO_ENDPOINT: ${VM2_IP}:9000
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
      MINIO_PUBLIC_BASE_URL: https://bca-group.microsyst.com.ar/storage
      SEED: "false"
      PDF_RASTERIZE_ENABLED: "true"
      PDF_RASTERIZE_DPI: 300
      PDF_RASTERIZE_MAX_CONCURRENCY: 4
      FLOWISE_ENDPOINT: http://flowise:3005/api/v1/extract
      FLOWISE_VALIDATION_BASE_URL: http://flowise:3005
      FLOWISE_VALIDATION_ENABLED: "true"
      FLOWISE_VALIDATION_CONCURRENCY: 3
      BACKEND_API_URL: http://backend:4800
      JWT_PRIVATE_KEY_PATH: /keys/jwt_private.pem
      JWT_PUBLIC_KEY_PATH: /keys/jwt_public.pem
      FRONTEND_URLS: https://bca-group.microsyst.com.ar
    volumes:
      - ./keys/jwt_private.pem:/keys/jwt_private.pem:ro
      - ./keys/jwt_public.pem:/keys/jwt_public.pem:ro
      - /tmp/documentos-processing:/tmp/documentos-processing
    deploy:
      resources:
        limits:
          memory: 8G
          cpus: "2.0"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:4802/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  remitos:
    image: bca/remitos:latest
    container_name: bca_remitos
    expose:
      - "4803"
    environment:
      NODE_ENV: production
      REMITOS_PORT: 4803
      REMITOS_DATABASE_URL: postgresql://bca_app:${DB_APP_PASSWORD}@${VM2_IP}:5432/monorepo-bca?schema=remitos
      REDIS_HOST: ${VM2_IP}
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      MINIO_ENDPOINT: ${VM2_IP}
      MINIO_PORT: 9000
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
      MINIO_BUCKET: remitos
      JWT_PUBLIC_KEY_PATH: /keys/jwt_public.pem
      FRONTEND_URLS: https://bca-group.microsyst.com.ar
      FLOWISE_ENABLED: "true"
      FLOWISE_BASE_URL: http://flowise:3005
      FLOWISE_FLOW_ID: ${FLOWISE_REMITOS_FLOW_ID}
    volumes:
      - ./keys/jwt_public.pem:/keys/jwt_public.pem:ro
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "1.0"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:4803/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  flowise:
    image: flowiseai/flowise:latest
    container_name: bca_flowise
    expose:
      - "3005"
    environment:
      PORT: 3005
      FLOWISE_USERNAME: admin
      FLOWISE_PASSWORD: ${FLOWISE_PASSWORD}
      DATABASE_TYPE: postgres
      DATABASE_HOST: ${VM2_IP}
      DATABASE_PORT: 5432
      DATABASE_NAME: monorepo-bca
      DATABASE_SCHEMA: flowise
      DATABASE_USER: bca_flowise
      DATABASE_PASSWORD: ${DB_FLOWISE_PASSWORD}
      NODE_OPTIONS: --max-old-space-size=4096
    volumes:
      - flowise_data:/root/.flowise
    deploy:
      resources:
        limits:
          memory: 6G
          cpus: "1.5"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3005"]
      interval: 30s
      timeout: 10s
      retries: 3

  certbot:
    image: certbot/certbot
    container_name: bca_certbot
    volumes:
      - certbot_data:/var/www/certbot
      - ./nginx/ssl:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h; done'"
    restart: unless-stopped

networks:
  default:
    name: bca_network
    driver: bridge

volumes:
  certbot_data:
  flowise_data:
```

**Distribución de recursos en VM1**:

| Contenedor | RAM | CPU |
|------------|-----|-----|
| Nginx | 512 MB | 0.5 cores |
| Frontend | 256 MB | 0.3 cores |
| Backend | 4 GB | 1.5 cores |
| Documentos | 8 GB | 2.0 cores |
| Remitos | 2 GB | 1.0 cores |
| Flowise | 6 GB | 1.5 cores |
| Certbot | 64 MB | 0.1 cores |
| **Total asignado** | **~21 GB** | **~7 cores** |
| **Buffer libre** | **~11 GB** | **~1 core** |

El buffer de 11 GB es importante: los picos de procesamiento de documentos (PDF rasterization + AI) pueden consumir RAM adicional temporalmente. Con 1.000 equipos, un pico de 50 documentos simultáneos consumiría ~5-8 GB extra, cubierto por el buffer.

**Configuración Nginx** (`nginx/conf.d/bca.conf`):

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

limit_req_zone $binary_remote_addr zone=general:10m rate=60r/m;
limit_req_zone $binary_remote_addr zone=login:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=upload:10m rate=20r/m;

server {
    listen 80;
    server_name bca-group.microsyst.com.ar;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bca-group.microsyst.com.ar;

    ssl_certificate /etc/nginx/ssl/live/bca-group.microsyst.com.ar/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/bca-group.microsyst.com.ar/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    client_max_body_size 50m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    # Frontend (SPA)
    location / {
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://frontend:8550;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets cache
    location /assets/ {
        proxy_pass http://frontend:8550;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Backend API
    location /api/platform/ {
        limit_req zone=general burst=30 nodelay;
        proxy_pass http://backend:4800;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location /api/empresas {
        limit_req zone=general burst=30 nodelay;
        proxy_pass http://backend:4800;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api/config/ {
        proxy_pass http://backend:4800;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Documentos API
    location /api/docs/ {
        limit_req zone=upload burst=10 nodelay;
        proxy_pass http://documentos:4802;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        client_max_body_size 50m;
    }

    # Remitos API
    location /api/remitos/ {
        limit_req zone=upload burst=10 nodelay;
        proxy_pass http://remitos:4803;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        client_max_body_size 50m;
    }

    # WebSocket (Socket.IO)
    location /socket.io/ {
        proxy_pass http://documentos:4802;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # MinIO proxy (presigned URLs)
    location /storage/ {
        rewrite ^/storage/(.*) /$1 break;
        proxy_pass http://${VM2_IP}:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
    }

    # Health check
    location /health {
        access_log off;
        return 200 '{"status":"ok","server":"nginx"}';
        add_header Content-Type application/json;
    }

    # Block source maps
    location ~* \.map$ {
        return 404;
    }
}
```

---

### 3.2 VM2 — Data Layer

**Propósito**: Concentra todos los servicios de estado. Optimizada para I/O con NVMe. Separar los datos de la aplicación garantiza que un crash o redeploy de la VM1 no afecte la persistencia.

**Hardware**: 4 vCPU, 32 GB RAM, 1 TB NVMe

**Servicios (Docker Compose)**:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16
    container_name: bca_postgres
    ports:
      - "${VM2_IP}:5432:5432"
    environment:
      POSTGRES_USER: evo
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: monorepo-bca
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d:ro
    command: >
      postgres
        -c shared_buffers=8GB
        -c effective_cache_size=24GB
        -c work_mem=256MB
        -c maintenance_work_mem=1GB
        -c max_connections=200
        -c random_page_cost=1.1
        -c effective_io_concurrency=200
        -c wal_buffers=64MB
        -c checkpoint_completion_target=0.9
        -c max_wal_size=2GB
        -c min_wal_size=512MB
        -c wal_level=replica
        -c max_wal_senders=3
        -c wal_keep_size=1GB
        -c hot_standby=on
        -c log_min_duration_statement=1000
        -c log_checkpoints=on
        -c log_lock_waits=on
        -c autovacuum_max_workers=3
        -c autovacuum_naptime=30s
        -c track_activities=on
        -c track_counts=on
        -c huge_pages=try
        -c jit=on
    deploy:
      resources:
        limits:
          memory: 24G
          cpus: "2.5"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U evo -d monorepo-bca"]
      interval: 10s
      timeout: 5s
      retries: 5
    shm_size: '2g'

  redis:
    image: redis:7-alpine
    container_name: bca_redis
    ports:
      - "${VM2_IP}:6379:6379"
    command: >
      redis-server
        --maxmemory 4gb
        --maxmemory-policy allkeys-lru
        --appendonly yes
        --appendfsync everysec
        --tcp-keepalive 60
        --timeout 300
        --save 900 1
        --save 300 10
        --save 60 10000
        --requirepass ${REDIS_PASSWORD}
        --maxclients 5000
        --tcp-backlog 511
        --hz 10
    volumes:
      - redis_data:/data
    deploy:
      resources:
        limits:
          memory: 5G
          cpus: "0.5"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  minio:
    image: minio/minio:latest
    container_name: bca_minio
    ports:
      - "${VM2_IP}:9000:9000"
      - "${VM2_IP}:9001:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      MINIO_API_REQUESTS_MAX: 1000
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "1.0"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  default:
    name: bca_data_network
    driver: bridge

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
```

**Distribución de recursos en VM2**:

| Contenedor | RAM | CPU | Disco estimado |
|------------|-----|-----|----------------|
| PostgreSQL | 24 GB | 2.5 cores | ~50-100 GB |
| Redis | 5 GB | 0.5 cores | ~500 MB |
| MinIO | 4 GB | 1.0 cores | ~400 GB |
| **Total asignado** | **33 GB** | **4.0 cores** | ~500 GB |

**Justificación del sizing de PostgreSQL**:
- `shared_buffers=8GB` (25% de 32 GB RAM)
- `effective_cache_size=24GB` (el OS aprovecha RAM libre para page cache)
- Con 60.000 documentos activos + materialized views, 8 GB de shared_buffers mantiene el dataset caliente
- `max_connections=200` es suficiente: 1 backend (pool ~20), 1 documentos (pool ~30), 1 remitos (pool ~15), 1 flowise (~10), replicación (~3), monitoring (~5) = ~83 conexiones activas

**Script de inicialización** (`postgres/init/01-users.sql`):

```sql
-- Usuarios separados por servicio (menor superficie de ataque)
CREATE USER bca_app WITH PASSWORD :'DB_APP_PASSWORD';
CREATE USER bca_flowise WITH PASSWORD :'DB_FLOWISE_PASSWORD';
CREATE USER bca_readonly WITH PASSWORD :'DB_READONLY_PASSWORD';
CREATE USER replicator WITH REPLICATION LOGIN PASSWORD :'REPL_PASSWORD';

-- Schemas
CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS documentos;
CREATE SCHEMA IF NOT EXISTS remitos;
CREATE SCHEMA IF NOT EXISTS flowise;

-- Permisos: app user (backend, documentos, remitos)
GRANT USAGE ON SCHEMA platform TO bca_app;
GRANT ALL ON ALL TABLES IN SCHEMA platform TO bca_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL ON TABLES TO bca_app;

GRANT USAGE ON SCHEMA documentos TO bca_app;
GRANT ALL ON ALL TABLES IN SCHEMA documentos TO bca_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA documentos GRANT ALL ON TABLES TO bca_app;

GRANT USAGE ON SCHEMA remitos TO bca_app;
GRANT ALL ON ALL TABLES IN SCHEMA remitos TO bca_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA remitos GRANT ALL ON TABLES TO bca_app;

-- Permisos: flowise (solo su schema)
GRANT USAGE ON SCHEMA flowise TO bca_flowise;
GRANT ALL ON ALL TABLES IN SCHEMA flowise TO bca_flowise;
ALTER DEFAULT PRIVILEGES IN SCHEMA flowise GRANT ALL ON TABLES TO bca_flowise;

-- Permisos: readonly (monitoring, reporting)
GRANT USAGE ON SCHEMA platform TO bca_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA platform TO bca_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT SELECT ON TABLES TO bca_readonly;

GRANT USAGE ON SCHEMA documentos TO bca_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA documentos TO bca_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA documentos GRANT SELECT ON TABLES TO bca_readonly;

GRANT USAGE ON SCHEMA remitos TO bca_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA remitos TO bca_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA remitos GRANT SELECT ON TABLES TO bca_readonly;
```

**PostgreSQL `pg_hba.conf`** (configurar en el host):

```
# TYPE  DATABASE    USER          ADDRESS         METHOD
local   all         evo           trust
host    all         bca_app       VM1_IP/32       scram-sha-256
host    all         bca_flowise   VM1_IP/32       scram-sha-256
host    all         bca_readonly  VM3_IP/32       scram-sha-256
host    replication replicator    VM3_IP/32       scram-sha-256
host    all         all           0.0.0.0/0       reject
```

---

### 3.3 VM3 — Backup + Monitoring

**Propósito**: Read replica de PostgreSQL para failover y reporting, backups automatizados, y stack de observabilidad.

**Hardware**: 4 vCPU, 16 GB RAM, 1 TB HDD

**Servicios (Docker Compose)**:

```yaml
version: "3.8"

services:
  # --- PostgreSQL Read Replica ---
  postgres-replica:
    image: postgres:16
    container_name: bca_postgres_replica
    ports:
      - "5433:5432"
    environment:
      POSTGRES_USER: evo
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pg_replica_data:/var/lib/postgresql/data
    command: >
      postgres
        -c shared_buffers=2GB
        -c effective_cache_size=6GB
        -c hot_standby=on
        -c max_connections=50
        -c primary_conninfo='host=${VM2_IP} port=5432 user=replicator password=${REPL_PASSWORD}'
        -c primary_slot_name=replica_slot_1
    deploy:
      resources:
        limits:
          memory: 6G
          cpus: "1.0"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U evo -d monorepo-bca"]
      interval: 15s
      timeout: 5s
      retries: 3

  # --- Monitoring ---
  prometheus:
    image: prom/prometheus:latest
    container_name: bca_prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./prometheus/alerts:/etc/prometheus/alerts:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=60d'
      - '--storage.tsdb.retention.size=30GB'
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "0.5"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: bca_grafana
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_INSTALL_PLUGINS: grafana-clock-panel,grafana-piechart-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "0.5"
    restart: unless-stopped

  loki:
    image: grafana/loki:latest
    container_name: bca_loki
    ports:
      - "3100:3100"
    volumes:
      - loki_data:/loki
      - ./loki/config.yml:/etc/loki/config.yml:ro
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "0.3"
    restart: unless-stopped

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: bca_pg_exporter
    ports:
      - "9187:9187"
    environment:
      DATA_SOURCE_NAME: postgresql://bca_readonly:${DB_READONLY_PASSWORD}@${VM2_IP}:5432/monorepo-bca?sslmode=disable
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: "0.1"
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: bca_node_exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--path.rootfs=/rootfs'
    deploy:
      resources:
        limits:
          memory: 128M
          cpus: "0.1"
    restart: unless-stopped

networks:
  default:
    name: bca_monitoring_network
    driver: bridge

volumes:
  pg_replica_data:
  prometheus_data:
  grafana_data:
  loki_data:
```

**Distribución de recursos en VM3**:

| Contenedor | RAM | CPU |
|------------|-----|-----|
| PG Replica | 6 GB | 1.0 cores |
| Prometheus | 2 GB | 0.5 cores |
| Grafana | 1 GB | 0.5 cores |
| Loki | 1 GB | 0.3 cores |
| Exporters | 384 MB | 0.2 cores |
| **Total asignado** | **~10.5 GB** | **~2.5 cores** |
| **Buffer libre** | **~5.5 GB** | **~1.5 cores** |

El buffer permite que la réplica absorba picos de queries sin impactar el monitoring.

---

## 4. Red y Conectividad

### 4.1 Topología de Red

```
┌──────────────────────────────────────────────────────────┐
│                   RED INTERNA (10.x.x.x/24)              │
│                                                           │
│  VM1 (App+Edge)        VM2 (Data)       VM3 (Backup/Mon)│
│  10.x.x.10             10.x.x.20        10.x.x.30      │
│  ├─ :80  (HTTP→301)    ├─ :5432 (PG)    ├─ :5433 (PG R)│
│  ├─ :443 (HTTPS)       ├─ :6379 (Redis) ├─ :3000 (Graf)│
│  │   ├─ / (frontend)   └─ :9000 (MinIO) ├─ :9090 (Prom)│
│  │   ├─ /api/platform  :9001 (MinIO UI) └─ :3100 (Loki)│
│  │   ├─ /api/docs                                        │
│  │   ├─ /api/remitos                                     │
│  │   ├─ /socket.io                                       │
│  │   └─ /storage                                         │
│  └───────────────────────────────────────────────────────│
│                                                           │
└──────────────────────────────────────────────────────────┘
                     │
               INTERNET (solo VM1 expone 80/443)
```

### 4.2 Reglas de Firewall

| Origen | Destino | Puertos | Propósito |
|--------|---------|---------|-----------|
| Internet | VM1 | 80, 443 | Tráfico web |
| VM1 | VM2 | 5432, 6379, 9000 | App → Data |
| VM2 | VM3 | 5432 (repl) | WAL streaming |
| VM3 | VM2 | 5432, 9000 | Backup pulls |
| VM1, VM2 | VM3 | 3100 | Log shipping a Loki |
| Admin VPN | VM3 | 3000, 9090 | Acceso a Grafana/Prometheus |
| Admin VPN | VM2 | 9001 | Acceso a MinIO Console |

**Solo VM1 tiene IP pública**. VM2 y VM3 solo son accesibles desde la red interna. Grafana y MinIO Console se acceden vía VPN o túnel SSH.

### 4.3 DNS

| Dominio | Destino | Servicio |
|---------|---------|----------|
| `bca-group.microsyst.com.ar` | VM1 IP pública | Todo (frontend, APIs, storage proxy) |

A esta escala, un solo dominio con rutas diferenciadas en Nginx es suficiente. No se necesitan subdominios separados.

---

## 5. Estrategia de Backups

### 5.1 PostgreSQL

| Tipo | Frecuencia | Retención | Herramienta |
|------|-----------|-----------|-------------|
| Full dump | Diario (02:00 AR) | 14 días | `pg_dump` comprimido |
| WAL streaming | Continuo | 3 días | Replicación nativa PG |

**RPO**: < 5 minutos (WAL streaming continuo a VM3)  
**RTO**: < 15 minutos (promover réplica a primary)

A esta escala (base de ~1-5 GB), `pg_dump` es suficiente y más simple que pgBackRest. La réplica de VM3 actúa como hot standby para failover rápido.

**Script de backup diario** (`/opt/bca/scripts/backup-postgres.sh`):

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/bca/backups/postgres"
RETENTION_DAYS=14
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

docker exec bca_postgres pg_dump \
  -U evo \
  -d monorepo-bca \
  --format=custom \
  --compress=9 \
  > "${BACKUP_DIR}/monorepo-bca_${DATE}.dump"

# Limpiar backups viejos
find "$BACKUP_DIR" -name "*.dump" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: monorepo-bca_${DATE}.dump ($(du -h ${BACKUP_DIR}/monorepo-bca_${DATE}.dump | cut -f1))"
```

Cron en VM3: `0 2 * * * /opt/bca/scripts/backup-postgres.sh >> /var/log/bca-backup.log 2>&1`

### 5.2 MinIO

| Tipo | Frecuencia | Herramienta |
|------|-----------|-------------|
| Incremental sync | Diario (03:00 AR) | `mc mirror` de VM2 a VM3 |

```bash
#!/bin/bash
set -euo pipefail

mc alias set source http://${VM2_IP}:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}
mc mirror --preserve --watch source/ /opt/bca/backups/minio/
```

### 5.3 Redis

Redis es reconstituible. AOF + RDB snapshots en VM2 son suficientes. Si Redis se pierde, los workers de BullMQ re-procesan jobs pendientes.

### 5.4 Configs y Secretos

| Qué | Frecuencia | Destino |
|-----|-----------|---------|
| docker-compose files | Cada cambio | Git (monorepo-bca/deploy/) |
| .env files | Diario | VM3, encriptados con `age` |
| JWT keys | Cada rotación | VM3, encriptados |

---

## 6. Seguridad

### 6.1 Credenciales

| Secreto | Gestión |
|---------|---------|
| DB passwords (3 usuarios) | `.env` por VM, permisos 600, diferentes por servicio |
| JWT RS256 keys | Montados read-only en contenedores |
| MinIO root | `.env` con password fuerte (no `minioadmin`) |
| Redis password | `.env` con REQUIREPASS |
| Flowise admin | `.env` con password fuerte |
| Grafana admin | `.env` |

**Rotación**: passwords cada 90 días, JWT keys cada 365 días.

### 6.2 Hardening

**Todas las VMs**:
- SSH solo por key (`PasswordAuthentication no`)
- `fail2ban` activo (SSH + Nginx)
- `unattended-upgrades` para security patches
- UFW con default deny, whitelist explícita
- No root login vía SSH
- Usuarios no-root para Docker

**VM1 (Edge)**:
- Nginx: rate limiting (3 zonas), body size limit (50 MB)
- SSL: TLS 1.2 mínimo, HSTS
- Source maps bloqueados
- Headers de seguridad (CSP, X-Frame, etc.)

**VM2 (Data)**:
- Servicios bind solo a IP interna (no `0.0.0.0`)
- `pg_hba.conf` con whitelist de IPs
- Redis: `requirepass` obligatorio
- MinIO Console: solo accesible vía VPN

---

## 7. Monitoreo y Alertas

### 7.1 Stack de Monitoring

**Prometheus** scrape targets (`prometheus.yml`):

```yaml
global:
  scrape_interval: 30s
  evaluation_interval: 30s

rule_files:
  - "alerts/*.yml"

scrape_configs:
  - job_name: 'node-vm1'
    static_configs:
      - targets: ['VM1_IP:9100']

  - job_name: 'node-vm2'
    static_configs:
      - targets: ['VM2_IP:9100']

  - job_name: 'node-vm3'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'bca-backend'
    metrics_path: /health
    static_configs:
      - targets: ['VM1_IP:4800']

  - job_name: 'bca-documentos'
    metrics_path: /health
    static_configs:
      - targets: ['VM1_IP:4802']

  - job_name: 'bca-remitos'
    metrics_path: /health
    static_configs:
      - targets: ['VM1_IP:4803']
```

### 7.2 Alertas

| Alerta | Condición | Severidad |
|--------|-----------|-----------|
| VM no responde | No scrape en 3 min | CRITICAL |
| CPU > 85% | 5 min sostenido | WARNING |
| RAM > 90% | 2 min | CRITICAL |
| Disco > 80% | - | WARNING |
| Disco > 90% | - | CRITICAL |
| PG replication lag > 30s | 2 min | WARNING |
| PG replication lag > 120s | 1 min | CRITICAL |
| PG connections > 160/200 | - | WARNING |
| Redis memory > 80% | - | WARNING |
| Health check fail | 3 checks seguidos | CRITICAL |
| Error rate > 5% | 5 min | CRITICAL |
| Response time p95 > 5s | 5 min | WARNING |
| SSL cert < 14 days | - | WARNING |
| MinIO > 75% | - | WARNING |

### 7.3 Dashboards Grafana

1. **Overview**: Estado de las 3 VMs (CPU, RAM, disco, red)
2. **Application**: Response times, error rates, throughput por servicio
3. **Database**: Queries, connections, cache hit ratio, replication lag
4. **Storage**: MinIO usage + growth trend

---

## 8. Proceso de Deploy

### 8.1 Deploy workflow

A esta escala con una sola instancia por servicio, el deploy es más simple que con réplicas. Se usa una **ventana de mantenimiento breve** o **restart rápido** (los contenedores Node.js arrancan en 2-5 segundos).

```bash
#!/bin/bash
# deploy.sh - Deploy de un servicio en VM1
set -euo pipefail

SERVICE=$1
VERSION=$2

echo "=== Deploying ${SERVICE} v${VERSION} ==="

# 1. Build
docker build \
  -f deploy/Dockerfile.${SERVICE} \
  -t bca/${SERVICE}:${VERSION} \
  -t bca/${SERVICE}:latest \
  .

# 2. Stop + Start (downtime: 2-5 segundos)
cd /opt/bca/vm1
docker compose stop ${SERVICE}
docker compose up -d ${SERVICE}

# 3. Wait for health
echo "Waiting for health check..."
for i in $(seq 1 30); do
  if docker inspect --format='{{.State.Health.Status}}' bca_${SERVICE} 2>/dev/null | grep -q healthy; then
    echo "Service ${SERVICE} is healthy"
    exit 0
  fi
  sleep 2
done

echo "WARNING: Health check timeout. Check logs:"
docker logs --tail 50 bca_${SERVICE}
exit 1
```

### 8.2 Migración de Base de Datos

```bash
# Ejecutar migraciones ANTES del deploy
docker exec bca_backend npx prisma migrate deploy --schema=./prisma/schema.prisma
```

### 8.3 Rollback

```bash
# Re-tag imagen anterior y restart
docker tag bca/backend:previous bca/backend:latest
docker compose stop backend && docker compose up -d backend
```

**Retención**: mantener las últimas 3 versiones taggeadas por servicio.

---

## 9. Escalamiento Futuro

### 9.1 Señales de que se necesita escalar

| Señal | Umbral | Acción |
|-------|--------|--------|
| CPU VM1 > 80% sostenido | 1 semana | Separar Flowise a VM dedicada |
| RAM VM1 > 85% | Pico recurrente | Agregar réplica de documentos |
| PG CPU > 70% sostenido | 1 semana | Mover reporting a read replica |
| MinIO > 80% disco | - | Expandir disco VM2 |
| Equipos > 1.000 | - | Migrar al plan de 5 VMs |

### 9.2 Path de crecimiento

```
500-1.000 equipos          1.000-1.500 equipos         1.500-2.000 equipos
┌────────────────┐         ┌────────────────┐          ┌────────────────┐
│  3 VMs          │  ──▶   │  4 VMs          │  ──▶    │  5 VMs          │
│  Este plan      │        │  +VM Flowise    │         │  Plan completo  │
│  16 vCPU, 80 GB │        │  20 vCPU, 96 GB │         │  32 vCPU, 152 GB│
└────────────────┘         └────────────────┘          └────────────────┘

Paso intermedio: separar Flowise de VM1 a una VM dedicada (4 vCPU, 16 GB).
Esto libera ~8 GB de RAM y 1.5 cores en VM1 para más réplicas de API.
```

### 9.3 Qué NO se necesita a esta escala

| Componente | Necesario para 500-1.000? | Cuándo sí |
|------------|--------------------------|-----------|
| Load balancer dedicado | No | > 1.500 equipos |
| Múltiples réplicas de API | No | > 80 usuarios concurrentes |
| PgBouncer | No | > 150 conexiones activas |
| Redis Cluster | No | > 4 GB de queue data |
| CDN / Varnish | No | > 100 req/s a MinIO |
| pgBackRest (vs pg_dump) | No | Base > 50 GB |
| WireGuard mesh | No | Requisito de compliance |
| Docker registry privado | No | > 5 VMs |

---

## 10. Migración desde Producción Actual

### 10.1 Provisioning del Host Windows + Hyper-V

| Paso | Acción | Duración |
|------|--------|----------|
| 1 | Instalar Windows Server 2022/2025 en host físico | 1 hora |
| 2 | Habilitar rol Hyper-V + herramientas de administración | 30 min |
| 3 | Crear External vSwitch vinculado al NIC físico | 15 min |
| 4 | Descargar ISO Ubuntu 24.04 LTS Server | 10 min |
| 5 | Crear las 3 VMs Gen2 con specs definidas (VHDX fijo) | 1 hora |
| 6 | Instalar Ubuntu 24.04 en cada VM | 45 min |
| 7 | Configurar IPs estáticas (netplan), hostname, SSH keys | 30 min |
| 8 | Instalar Docker + Docker Compose v2 en cada VM | 30 min |
| 9 | Deshabilitar checkpoints Hyper-V en todas las VMs | 5 min |

**Comandos Hyper-V (PowerShell en host Windows)** para crear una VM ejemplo:

```powershell
# Crear VM2 (Data Layer) - 4 vCPU, 32 GB RAM, 1 TB disco fijo
New-VM -Name "BCA-VM2-DATA" -Generation 2 -MemoryStartupBytes 32GB -SwitchName "BCA-vSwitch"
Set-VM -Name "BCA-VM2-DATA" -ProcessorCount 4 -StaticMemory -AutomaticCheckpointsEnabled $false
New-VHD -Path "D:\VMs\BCA-VM2-DATA\disk-os.vhdx" -SizeBytes 80GB -Fixed
New-VHD -Path "D:\VMs\BCA-VM2-DATA\disk-data.vhdx" -SizeBytes 1TB -Fixed
Add-VMHardDiskDrive -VMName "BCA-VM2-DATA" -Path "D:\VMs\BCA-VM2-DATA\disk-os.vhdx"
Add-VMHardDiskDrive -VMName "BCA-VM2-DATA" -Path "D:\VMs\BCA-VM2-DATA\disk-data.vhdx"
Set-VMFirmware -VMName "BCA-VM2-DATA" -SecureBootTemplate "MicrosoftUEFICertificateAuthority"
Add-VMDvdDrive -VMName "BCA-VM2-DATA" -Path "C:\ISOs\ubuntu-24.04-live-server-amd64.iso"
```

### 10.2 Plan de migración

| Paso | Acción | Duración | Downtime |
|------|--------|----------|----------|
| 1 | Provisioning host Windows + Hyper-V + 3 VMs Ubuntu | 0.5 día | 0 |
| 2 | Configurar red interna, firewall, SSH | 2 horas | 0 |
| 3 | Levantar VM2 (data layer) vacía | 1 hora | 0 |
| 4 | pg_dump → pg_restore + mc mirror MinIO | 1-2 horas | 0 |
| 5 | Levantar VM1 (apps), apuntando a VM2 | 1 hora | 0 |
| 6 | Test completo (sin tráfico real) | 0.5 día | 0 |
| 7 | Levantar VM3 (monitoring + replica) | 2 horas | 0 |
| 8 | **Cutover**: DNS switch + último pg_dump delta | 10-15 min | **10-15 min** |
| 9 | Verificación post-migración | 1 hora | 0 |
| 10 | Mantener servidor viejo como fallback | 7 días | 0 |

**Downtime total**: 10-15 minutos (solo el cutover).

La migración es más rápida que el plan de 5 VMs porque hay menos componentes que coordinar y la base de datos es pequeña (~1-5 GB).

### 10.3 Checklist pre-migración

- [ ] Host Windows Server con Hyper-V habilitado
- [ ] vSwitch externo configurado, conectividad verificada
- [ ] 3 VMs Ubuntu 24.04 LTS creadas e instaladas (Gen2, VHDX fijo)
- [ ] Checkpoints deshabilitados en las 3 VMs
- [ ] Todas las VMs accesibles por SSH
- [ ] Docker y Docker Compose v2 instalados en cada VM
- [ ] Red interna funcional (ping entre VMs)
- [ ] UFW configurado en las 3 VMs
- [ ] JWT keys copiadas a VM1
- [ ] `.env` files creados (VM1, VM2, VM3)
- [ ] Certificado SSL disponible (o Certbot listo)
- [ ] DNS TTL reducido a 60s (1 semana antes)
- [ ] Backup completo del servidor actual verificado
- [ ] Flowise flows exportados como JSON

### 10.4 Checklist post-migración

- [ ] `curl -sf https://bca-group.microsyst.com.ar/health` → 200
- [ ] Login de usuario funcional
- [ ] Upload de documento → aparece en MinIO
- [ ] Validación AI procesa correctamente (check BullMQ)
- [ ] WebSocket notifications llegan al frontend
- [ ] Remitos procesando (upload + analysis)
- [ ] Cron jobs ejecutándose (check logs documentos)
- [ ] PG replication lag < 5s
- [ ] Grafana muestra métricas de las 3 VMs
- [ ] Backups automatizados (pg_dump + mc mirror)

---

## 11. Infraestructura Física (On-Premise)

### 11.1 Plataforma de Virtualización

| Componente | Especificación |
|------------|---------------|
| **Hypervisor** | Hyper-V (incluido en Windows Server 2022/2025) |
| **Guest OS** | Ubuntu 24.04 LTS Server |
| **VM Generation** | Gen 2 (UEFI, Secure Boot) |
| **Disco VM** | VHDX tamaño fijo |
| **Memoria** | Estática (sin dynamic memory) |
| **Checkpoints** | Deshabilitados en producción |

### 11.2 Servidor Físico Recomendado

| Componente | Especificación mínima |
|------------|----------------------|
| **CPU** | 16+ cores (Intel Xeon E-2400 o similar) |
| **RAM** | 96 GB DDR5 ECC |
| **Disco rápido** | 1× NVMe 2 TB (VMs de app y data) |
| **Disco backup** | 1× HDD 2 TB (VM de backup/monitoring) |
| **Red** | 1× NIC 1 Gbps mínimo (10 Gbps ideal) |
| **SO Host** | Windows Server 2022/2025 Standard |

Un solo servidor físico con 96 GB de RAM aloja las 3 VMs (16 vCPU, 80 GB asignados) con margen para el host Windows (~16 GB libres).

### 11.3 Costos Estimados

| Item | Costo estimado |
|------|---------------|
| 1× Servidor (16+ cores, 96 GB RAM) | ~USD 4.000-6.000 |
| RAM adicional (si no incluida) | ~USD 300-800 |
| Storage NVMe 2 TB | ~USD 200-300 |
| Storage HDD 2 TB | ~USD 60-100 |
| Licencia Windows Server 2022 Standard | ~USD 1.000-1.200 |
| Networking (switch, cables) | ~USD 100-200 |
| UPS | ~USD 300-500 |
| **Total estimado** | **~USD 6.000-9.100** |

**Costo operativo mensual**: electricidad (~USD 30-60/mes), sin licencias recurrentes.

---

## 12. Comparativa: Este Plan vs. Plan de 2.000 Equipos

| Aspecto | 3 VMs (500-1.000) | 5 VMs (1.500-2.000) |
|---------|-------------------|---------------------|
| **VMs totales** | 3 | 5 |
| **vCPU total** | 16 | 32 |
| **RAM total** | 80 GB | 152 GB |
| **Disco total** | 2.1 TB | 4.3 TB |
| **Hosts físicos** | 1 servidor | 1-2 servidores |
| **Costo HW estimado** | ~USD 6.000-9.000 | ~USD 9.000-17.000 |
| **Réplicas de API** | 1 por servicio | 2 por servicio |
| **Instancias Flowise** | 1 | 2 |
| **Zero-downtime deploy** | No (restart 2-5s) | Sí (rolling deploy) |
| **PG Backup** | pg_dump diario | pgBackRest (WAL continuo) |
| **Complejidad operativa** | Baja | Media |
| **Tiempo de setup** | 2-3 días | 4-5 días |
| **Path de crecimiento** | Agregar VM Flowise → 4 VMs | Agregar VM2b/VM3b |

---

## 13. Resumen Ejecutivo

### Lo que se gana vs. el setup actual

| Aspecto | Actual (1 servidor, 100 eq.) | Propuesto (3 VMs, 500-1.000 eq.) |
|---------|------------------------------|----------------------------------|
| Capacidad | ~100 equipos | 500-1.000 equipos |
| Separación de datos | Todo junto | Datos aislados en VM2 |
| Monitoring | Ninguno | Prometheus + Grafana + Loki |
| Backups | Manual | Automatizado (pg_dump + mc mirror + WAL) |
| RPO | Horas/días | < 5 minutos |
| RTO | Horas | < 15 minutos (promover réplica) |
| Seguridad | Básica, credenciales default | Hardened (firewall, credenciales separadas, SSL) |
| Escalabilidad | Vertical | Horizontal (path claro a 4-5 VMs) |

### Diagrama final

```
                    INTERNET
                       │
                 ┌─────▼──────────────────────────┐
                 │         VM1 - APPLICATION       │
                 │    8 vCPU │ 32 GB │ 100 GB SSD  │
                 │                                  │
                 │  ┌───────────────────────────┐  │
                 │  │  Nginx (:443)             │  │
                 │  │  ├─ / → Frontend          │  │
                 │  │  ├─ /api/platform → Backend│  │
                 │  │  ├─ /api/docs → Documentos│  │
                 │  │  ├─ /api/remitos → Remitos│  │
                 │  │  ├─ /socket.io → Docs WS  │  │
                 │  │  └─ /storage → MinIO proxy│  │
                 │  └───────────────────────────┘  │
                 │                                  │
                 │  Backend (4GB) │ Documentos (8GB)│
                 │  Remitos (2GB) │ Flowise (6GB)   │
                 │  Frontend (256MB) │ Certbot       │
                 └────────────┬────────────────────┘
                              │ 5432, 6379, 9000
                              ▼
                 ┌──────────────────────────────────┐
                 │          VM2 - DATA              │
                 │    4 vCPU │ 32 GB │ 1 TB NVMe   │
                 │                                  │
                 │  PostgreSQL 16  shared_buffers=8GB│
                 │  Redis 7        maxmemory=4GB    │
                 │  MinIO           ~400 GB files   │
                 └────────────┬────────────────────┘
                              │ WAL streaming
                              ▼
                 ┌──────────────────────────────────┐
                 │      VM3 - BACKUP / MONITOR     │
                 │    4 vCPU │ 16 GB │ 1 TB HDD    │
                 │                                  │
                 │  PG Read Replica (failover ready)│
                 │  Prometheus + Grafana + Loki     │
                 │  pg_dump backups (14d retention) │
                 │  MinIO mirror (diario)           │
                 └─────────────────────────────────┘
```

---

**Próximos pasos**:
1. Adquirir servidor físico con las specs definidas (16+ cores, 96 GB RAM)
2. Instalar Windows Server 2022/2025 + habilitar Hyper-V
3. Crear las 3 VMs Ubuntu 24.04 LTS (Gen2, VHDX fijo, memoria estática)
4. Definir IPs estáticas y configurar red (vSwitch + netplan)
5. Generar los docker-compose y `.env` definitivos para cada VM
6. Ejecutar plan de migración (2-3 días de setup + 10-15 min de downtime)
7. Monitorear 30 días y evaluar si se necesita separar Flowise (paso a 4 VMs)
