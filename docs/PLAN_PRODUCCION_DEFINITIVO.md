# Plan de Producción Definitivo - Ecosistema BCA

**Fecha**: 2026-02-25  
**Objetivo**: Diseñar la infraestructura de producción para soportar **1.500–2.000 equipos** (camión + acoplado + chofer)  
**Referencia actual**: ~100 equipos en un solo servidor (10.8.10.20, 30 GB RAM, 3 cores)  
**Infraestructura**: On-premise — VMs Ubuntu 24.04 LTS virtualizadas sobre Windows Server (Hyper-V)

---

## 1. Análisis de la Situación Actual

### 1.1 Capacidad del sistema actual (100 equipos)

| Recurso | Consumo actual (100 equipos) | Proyección lineal (2.000 equipos) |
|---------|------------------------------|-----------------------------------|
| PostgreSQL RAM | 250 MB | ~5 GB |
| Redis RAM | 5.5 MB | ~110 MB |
| Documentos RAM | 66 MB (idle) / picos 2-4 GB | ~1.3 GB idle / picos 40-80 GB |
| MinIO almacenamiento | ~33 GB (uso actual) | ~660 GB – 1 TB |
| Backend RAM | 39.5 MB | ~800 MB |

### 1.2 Operaciones críticas que escalan NO linealmente

| Operación | Complejidad de escalado | Motivo |
|-----------|------------------------|--------|
| Validación AI (Flowise) | **Exponencial en cola** | Cada equipo sube ~20-30 documentos, todos pasan por AI |
| PDF Rasterization | **CPU-bound** | Poppler consume 100-500 MB por PDF, 1 core completo |
| Compliance Evaluation | **Cuadrática** | Cruza equipos × clientes × requisitos × documentos |
| WebSocket broadcasts | **Fan-out** | Más usuarios conectados = más mensajes simultáneos |
| Cron: expiración docs | **Lineal en DB** | Full scan de documentos cada hora |

### 1.3 Estimación de volumen para 2.000 equipos

| Métrica | Estimación |
|---------|-----------|
| Documentos activos | 60.000 – 120.000 (30-60 docs × 2.000 equipos) |
| Documentos subidos/día | 200 – 500 (renovaciones, nuevos) |
| Validaciones AI/día | 200 – 500 |
| Remitos procesados/día | 500 – 2.000 |
| Usuarios concurrentes | 50 – 150 |
| WebSocket connections | 50 – 200 |
| Almacenamiento archivos | ~800 GB – 1.5 TB |
| Crecimiento mensual storage | ~30-50 GB |

---

## 2. Arquitectura Propuesta: 5 Máquinas Virtuales

### 2.1 Diagrama General

```
                            ┌──────────────────────┐
                            │     INTERNET          │
                            │   DNS → bca-group...  │
                            └──────────┬───────────┘
                                       │
                              ┌────────▼────────┐
                              │   VM1 - EDGE    │
                              │  Nginx + Frontend│
                              │  Load Balancer   │
                              └──┬────┬────┬────┘
                     ┌───────────┘    │    └───────────┐
                     ▼                ▼                ▼
              ┌──────────┐    ┌──────────┐    ┌──────────┐
              │VM2 - APP │    │VM3 - APP │    │VM4 - DATA│
              │Backend   │    │Workers   │    │PostgreSQL│
              │Documentos│    │Flowise   │    │Redis     │
              │Remitos   │    │AI/Cron   │    │MinIO     │
              └──────────┘    └──────────┘    └──────────┘
                                                   │
                                            ┌──────▼──────┐
                                            │VM5 - BACKUP │
                                            │Monitoring   │
                                            │DR / Replica │
                                            └─────────────┘
```

### 2.2 Distribución de VMs

Todas las VMs corren **Ubuntu 24.04 LTS** como Guest OS, virtualizadas con **Hyper-V** sobre Windows Server.

| VM | Rol | vCPU | RAM | Disco (VHDX) | Servicios |
|----|-----|------|-----|--------------|-----------|
| **VM1** | Edge / Proxy / Frontend | 4 | 8 GB | 50 GB SSD | Nginx, Frontend (static), Certbot |
| **VM2** | Application Layer | 8 | 32 GB | 100 GB SSD | Backend ×2, Documentos ×2, Remitos ×2 |
| **VM3** | Workers + AI | 8 | 32 GB | 100 GB SSD | Flowise ×2, Workers AI, Scheduler, PDF processing |
| **VM4** | Data Layer | 8 | 64 GB | 2 TB SSD/NVMe | PostgreSQL (primary), Redis, MinIO |
| **VM5** | Backup + Monitoring | 4 | 16 GB | 2 TB HDD | PG replica (read), Grafana, Prometheus, Loki, pg_backrest |

**Total VMs**: 32 vCPU, 152 GB RAM, ~4.3 TB almacenamiento

### 2.3 Servidor Físico (Host Windows)

Para alojar las 5 VMs se recomienda **2 servidores físicos** con Windows Server y Hyper-V habilitado, distribuyendo las VMs para redundancia:

| Servidor Físico | SO Host | CPU mínima | RAM mínima | Disco | VMs alojadas |
|-----------------|---------|------------|------------|-------|--------------|
| **Host A** | Windows Server 2022/2025 | 20+ cores | 160 GB | 2× SSD 1 TB + 1× HDD 2 TB | VM1, VM2, VM3, VM4 |
| **Host B** | Windows Server 2022/2025 | 8+ cores | 32 GB | 1× SSD 500 GB + 1× HDD 2 TB | VM5 (backup/monitoring) |

**Alternativa con 1 solo servidor** (sin redundancia de host):

| Servidor Físico | CPU mínima | RAM mínima | Disco |
|-----------------|------------|------------|-------|
| **Host único** | 32+ cores (ej. Xeon W o dual Xeon) | 192 GB | 2× NVMe 2 TB (VM1-4) + 1× HDD 4 TB (VM5) |

**Configuración Hyper-V recomendada por VM**:
- **Generación**: Gen 2 (UEFI, secure boot con Microsoft UEFI CA)
- **Memoria dinámica**: Deshabilitada (RAM fija para PostgreSQL/Redis)
- **vSwitch**: External virtual switch conectado al NIC físico (red interna)
- **Disco**: VHDX tamaño fijo (mejor performance que dinámico para DB)
- **Checkpoints**: Deshabilitados en producción (impacto en I/O)
- **Integration Services**: Habilitados (time sync, heartbeat, backup)
- **Secure Boot**: Habilitado con template "Microsoft UEFI Certificate Authority" (compatible con Ubuntu)

---

## 3. Detalle por VM

### 3.1 VM1 — Edge / Reverse Proxy / Frontend

**Propósito**: Punto de entrada único. Termina SSL, balancea carga, sirve frontend estático, protege la red interna.

**Hardware**: 4 vCPU, 8 GB RAM, 50 GB SSD

**Servicios (Docker Compose)**:

```yaml
services:
  nginx:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
      - certbot_data:/var/www/certbot
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s

  frontend:
    image: bca/frontend:latest
    expose:
      - "8550"
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 256M
          cpus: "0.5"

  certbot:
    image: certbot/certbot
    volumes:
      - certbot_data:/var/www/certbot
      - ./nginx/ssl:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h; done'"
```

**Configuración Nginx relevante**:
- **Upstream pools**: backend_pool (VM2:4800), documentos_pool (VM2:4802), remitos_pool (VM2:4803)
- **SSL termination**: TLS 1.2+, HSTS, OCSP stapling
- **Rate limiting**: zona por IP (60 req/min general, 10 req/min login)
- **Gzip + Brotli**: compresión de assets
- **WebSocket**: upgrade para Socket.IO
- **Security headers**: CSP, X-Frame-Options, HSTS, etc.
- **Cache**: assets estáticos (1 año), imágenes (30 días)
- **Buffer tuning**: proxy_buffer_size 16k, proxy_buffers 8 16k

**Nginx upstream example**:
```nginx
upstream backend_pool {
    least_conn;
    server VM2_IP:4800 max_fails=3 fail_timeout=30s;
    server VM2_IP:4801 max_fails=3 fail_timeout=30s;  # segunda instancia
    keepalive 32;
}

upstream documentos_pool {
    least_conn;
    server VM2_IP:4802 max_fails=3 fail_timeout=30s;
    server VM2_IP:4803_docs max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

---

### 3.2 VM2 — Application Layer

**Propósito**: Corre todas las instancias de las APIs (backend, documentos, remitos). Stateless. Escala horizontalmente agregando más réplicas o VMs idénticas.

**Hardware**: 8 vCPU, 32 GB RAM, 100 GB SSD

**Servicios (Docker Compose)**:

```yaml
services:
  backend-1:
    image: bca/backend:latest
    container_name: bca_backend_1
    ports:
      - "4800:4800"
    environment:
      NODE_ENV: production
      INSTANCE_ID: backend-1
      DATABASE_URL: postgresql://bca_app:${DB_PASSWORD}@VM4_IP:5432/monorepo-bca?schema=platform
      NODE_OPTIONS: --max-old-space-size=3072
      UV_THREADPOOL_SIZE: 16
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "1.5"

  backend-2:
    image: bca/backend:latest
    container_name: bca_backend_2
    ports:
      - "4801:4800"
    environment:
      NODE_ENV: production
      INSTANCE_ID: backend-2
      DATABASE_URL: postgresql://bca_app:${DB_PASSWORD}@VM4_IP:5432/monorepo-bca?schema=platform
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "1.5"

  documentos-1:
    image: bca/documentos:latest
    container_name: bca_documentos_1
    ports:
      - "4802:4802"
    environment:
      NODE_ENV: production
      INSTANCE_ID: documentos-1
      IS_SCHEDULER: "true"     # Solo esta instancia corre cron jobs
      DOCUMENTOS_DATABASE_URL: postgresql://bca_app:${DB_PASSWORD}@VM4_IP:5432/monorepo-bca?schema=documentos
      REDIS_HOST: VM4_IP
      MINIO_ENDPOINT: VM4_IP:9000
      FLOWISE_ENDPOINT: http://VM3_IP:3005/api/v1/extract
      FLOWISE_VALIDATION_BASE_URL: http://VM3_IP:3005
      NODE_OPTIONS: --max-old-space-size=6144
      UV_THREADPOOL_SIZE: 20
    deploy:
      resources:
        limits:
          memory: 8G
          cpus: "2.0"

  documentos-2:
    image: bca/documentos:latest
    container_name: bca_documentos_2
    ports:
      - "4812:4802"
    environment:
      NODE_ENV: production
      INSTANCE_ID: documentos-2
      IS_SCHEDULER: "false"    # No corre cron jobs
      DOCUMENTOS_DATABASE_URL: postgresql://bca_app:${DB_PASSWORD}@VM4_IP:5432/monorepo-bca?schema=documentos
      REDIS_HOST: VM4_IP
      MINIO_ENDPOINT: VM4_IP:9000
      FLOWISE_ENDPOINT: http://VM3_IP:3005/api/v1/extract
    deploy:
      resources:
        limits:
          memory: 8G
          cpus: "2.0"

  remitos-1:
    image: bca/remitos:latest
    container_name: bca_remitos_1
    ports:
      - "4803:4803"
    environment:
      NODE_ENV: production
      REMITOS_DATABASE_URL: postgresql://bca_app:${DB_PASSWORD}@VM4_IP:5432/monorepo-bca?schema=remitos
      REDIS_HOST: VM4_IP
      MINIO_ENDPOINT: VM4_IP
      MINIO_PORT: 9000
      FLOWISE_BASE_URL: http://VM3_IP:3005
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "1.0"

  remitos-2:
    image: bca/remitos:latest
    container_name: bca_remitos_2
    ports:
      - "4813:4803"
    environment:
      NODE_ENV: production
      REMITOS_DATABASE_URL: postgresql://bca_app:${DB_PASSWORD}@VM4_IP:5432/monorepo-bca?schema=remitos
      REDIS_HOST: VM4_IP
      MINIO_ENDPOINT: VM4_IP
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "1.0"
```

**Distribución de recursos en VM2**:

| Contenedor | RAM | CPU | Cantidad |
|------------|-----|-----|----------|
| backend | 4 GB | 1.5 cores | ×2 = 8 GB, 3 cores |
| documentos | 8 GB | 2.0 cores | ×2 = 16 GB, 4 cores |
| remitos | 2 GB | 1.0 core | ×2 = 4 GB, 2 cores |
| **Total** | **28 GB** | **9 cores** | **buffer: 4 GB RAM libre** |

**Notas clave**:
- Solo `documentos-1` tiene `IS_SCHEDULER=true` para evitar duplicación de cron jobs
- Ambas instancias de documentos corren BullMQ workers (la distribución la maneja Redis/BullMQ)
- Los puertos de la segunda instancia usan offset (+10) para evitar conflictos
- Sticky sessions en Nginx para WebSocket (Socket.IO necesita que el cliente se mantenga en la misma instancia durante el handshake)

---

### 3.3 VM3 — Workers + AI Processing

**Propósito**: Aísla las operaciones CPU-intensivas (AI, PDF rasterization) del application layer. Evita que un pico de procesamiento de documentos degrade las APIs.

**Hardware**: 8 vCPU, 32 GB RAM, 100 GB SSD

**Servicios (Docker Compose)**:

```yaml
services:
  flowise-1:
    image: flowiseai/flowise:latest
    container_name: bca_flowise_1
    ports:
      - "3005:3005"
    environment:
      PORT: 3005
      FLOWISE_USERNAME: admin
      FLOWISE_PASSWORD: ${FLOWISE_PASSWORD}
      DATABASE_TYPE: postgres
      DATABASE_HOST: VM4_IP
      DATABASE_PORT: 5432
      DATABASE_NAME: monorepo-bca
      DATABASE_SCHEMA: flowise
      DATABASE_USER: bca_flowise
      DATABASE_PASSWORD: ${FLOWISE_DB_PASSWORD}
      NODE_OPTIONS: --max-old-space-size=8192
    deploy:
      resources:
        limits:
          memory: 10G
          cpus: "3.0"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3005/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  flowise-2:
    image: flowiseai/flowise:latest
    container_name: bca_flowise_2
    ports:
      - "3006:3005"
    environment:
      PORT: 3005
      FLOWISE_USERNAME: admin
      FLOWISE_PASSWORD: ${FLOWISE_PASSWORD}
      DATABASE_TYPE: postgres
      DATABASE_HOST: VM4_IP
      DATABASE_PORT: 5432
      DATABASE_NAME: monorepo-bca
      DATABASE_SCHEMA: flowise
      DATABASE_USER: bca_flowise
      DATABASE_PASSWORD: ${FLOWISE_DB_PASSWORD}
      NODE_OPTIONS: --max-old-space-size=8192
    deploy:
      resources:
        limits:
          memory: 10G
          cpus: "3.0"
```

**Por qué dos Flowise**: Con 200-500 validaciones/día a 10-60 seg cada una, una sola instancia procesa secuencialmente y genera colas. Dos instancias permiten ~6 validaciones simultáneas con concurrency 3 por worker.

**Balanceo de Flowise desde documentos**: Implementar round-robin en el servicio, o usar Nginx en VM3 como LB interno:

```nginx
upstream flowise_pool {
    least_conn;
    server 127.0.0.1:3005;
    server 127.0.0.1:3006;
}

server {
    listen 3010;
    location / {
        proxy_pass http://flowise_pool;
        proxy_read_timeout 120s;
    }
}
```

**Distribución de recursos en VM3**:

| Contenedor | RAM | CPU |
|------------|-----|-----|
| flowise-1 | 10 GB | 3.0 cores |
| flowise-2 | 10 GB | 3.0 cores |
| nginx (LB interno) | 256 MB | 0.5 cores |
| **Total** | **~20 GB** | **6.5 cores** |
| **Buffer libre** | **12 GB** | **1.5 cores** |

El buffer libre es intencional: si el volumen crece, se agrega un flowise-3 sin necesidad de migración.

---

### 3.4 VM4 — Data Layer

**Propósito**: Todos los servicios de estado (bases de datos, cache, almacenamiento de objetos) en una sola VM optimizada para I/O.

**Hardware**: 8 vCPU, 64 GB RAM, 2 TB NVMe (RAID-1 si es posible)

**Servicios (Docker Compose)**:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: bca_postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: evo
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: monorepo-bca
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/conf.d:/etc/postgresql/conf.d
      - ./postgres/init:/docker-entrypoint-initdb.d
    command: >
      postgres
        -c shared_buffers=16GB
        -c effective_cache_size=48GB
        -c work_mem=512MB
        -c maintenance_work_mem=2GB
        -c max_connections=400
        -c random_page_cost=1.1
        -c effective_io_concurrency=200
        -c wal_buffers=128MB
        -c checkpoint_completion_target=0.9
        -c max_wal_size=4GB
        -c min_wal_size=1GB
        -c wal_level=replica
        -c max_wal_senders=5
        -c wal_keep_size=2GB
        -c hot_standby=on
        -c log_min_duration_statement=1000
        -c log_checkpoints=on
        -c log_connections=off
        -c log_disconnections=off
        -c log_lock_waits=on
        -c autovacuum_max_workers=4
        -c autovacuum_naptime=30s
        -c track_activities=on
        -c track_counts=on
        -c huge_pages=try
        -c jit=on
    deploy:
      resources:
        limits:
          memory: 48G
          cpus: "4.0"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U evo -d monorepo-bca"]
      interval: 10s
      timeout: 5s
      retries: 5
    shm_size: '4g'

  redis:
    image: redis:7-alpine
    container_name: bca_redis
    ports:
      - "6379:6379"
    command: >
      redis-server
        --maxmemory 8gb
        --maxmemory-policy allkeys-lru
        --appendonly yes
        --appendfsync everysec
        --tcp-keepalive 60
        --timeout 300
        --save 900 1
        --save 300 10
        --save 60 10000
        --requirepass ${REDIS_PASSWORD}
        --maxclients 10000
        --tcp-backlog 511
        --hz 10
    volumes:
      - redis_data:/data
    deploy:
      resources:
        limits:
          memory: 10G
          cpus: "1.0"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s

  minio:
    image: minio/minio:latest
    container_name: bca_minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      MINIO_API_REQUESTS_MAX: 2000
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    deploy:
      resources:
        limits:
          memory: 8G
          cpus: "2.0"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 30s

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
```

**Distribución de recursos en VM4**:

| Contenedor | RAM | CPU | Disco estimado |
|------------|-----|-----|----------------|
| PostgreSQL | 48 GB | 4.0 cores | ~100-200 GB |
| Redis | 10 GB | 1.0 cores | ~1-2 GB |
| MinIO | 8 GB | 2.0 cores | ~800 GB – 1.5 TB |
| **Total** | **66 GB** | **7.0 cores** | ~1.5 TB |

**Justificación de 64 GB RAM para PostgreSQL**:
- `shared_buffers=16GB` (25% de RAM, regla de oro PG)
- `effective_cache_size=48GB` (el OS caché usa RAM libre)
- Con 120.000 documentos activos + joins de compliance, la base necesita mantener hot data en RAM
- Los materialized views (refresh cada 5 min) requieren work_mem alto

**Configuración adicional de PostgreSQL**:

Script de inicialización para crear usuarios con privilegios separados:

```sql
-- Usuarios separados por servicio
CREATE USER bca_app WITH PASSWORD '${DB_APP_PASSWORD}';
CREATE USER bca_flowise WITH PASSWORD '${DB_FLOWISE_PASSWORD}';
CREATE USER bca_readonly WITH PASSWORD '${DB_READONLY_PASSWORD}';

-- Permisos por schema
GRANT USAGE ON SCHEMA platform TO bca_app;
GRANT ALL ON ALL TABLES IN SCHEMA platform TO bca_app;
GRANT USAGE ON SCHEMA documentos TO bca_app;
GRANT ALL ON ALL TABLES IN SCHEMA documentos TO bca_app;
GRANT USAGE ON SCHEMA remitos TO bca_app;
GRANT ALL ON ALL TABLES IN SCHEMA remitos TO bca_app;

GRANT USAGE ON SCHEMA flowise TO bca_flowise;
GRANT ALL ON ALL TABLES IN SCHEMA flowise TO bca_flowise;

-- Replica usuario de solo lectura
GRANT USAGE ON SCHEMA platform TO bca_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA platform TO bca_readonly;
GRANT USAGE ON SCHEMA documentos TO bca_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA documentos TO bca_readonly;
```

---

### 3.5 VM5 — Backup + Monitoring + Read Replica

**Propósito**: Observabilidad del ecosistema, backup automatizado y réplica de lectura para reportes pesados.

**Hardware**: 4 vCPU, 16 GB RAM, 2 TB HDD

**Servicios (Docker Compose)**:

```yaml
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
        -c shared_buffers=4GB
        -c effective_cache_size=8GB
        -c hot_standby=on
        -c max_connections=100
        -c primary_conninfo='host=VM4_IP port=5432 user=replicator password=${REPL_PASSWORD}'
        -c primary_slot_name=replica_slot_1
    deploy:
      resources:
        limits:
          memory: 8G
          cpus: "1.5"

  # --- Monitoring Stack ---
  prometheus:
    image: prom/prometheus:latest
    container_name: bca_prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=90d'
      - '--storage.tsdb.retention.size=50GB'
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "0.5"

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
      - ./grafana/provisioning:/etc/grafana/provisioning
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "0.5"

  loki:
    image: grafana/loki:latest
    container_name: bca_loki
    ports:
      - "3100:3100"
    volumes:
      - loki_data:/loki
      - ./loki/config.yml:/etc/loki/config.yml
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "0.5"

  promtail:
    image: grafana/promtail:latest
    container_name: bca_promtail
    volumes:
      - /var/log:/var/log:ro
      - ./promtail/config.yml:/etc/promtail/config.yml
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.25"

  node-exporter:
    image: prom/node-exporter:latest
    container_name: bca_node_exporter
    ports:
      - "9100:9100"
    deploy:
      resources:
        limits:
          memory: 128M
          cpus: "0.1"

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: bca_pg_exporter
    ports:
      - "9187:9187"
    environment:
      DATA_SOURCE_NAME: postgresql://bca_readonly:${DB_READONLY_PASSWORD}@VM4_IP:5432/monorepo-bca?sslmode=disable
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: "0.1"

  # --- Backup ---
  pgbackrest:
    image: pgbackrest/pgbackrest:latest
    container_name: bca_pgbackrest
    volumes:
      - pgbackrest_data:/var/lib/pgbackrest
      - ./pgbackrest/pgbackrest.conf:/etc/pgbackrest/pgbackrest.conf
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "0.5"

volumes:
  pg_replica_data:
  prometheus_data:
  grafana_data:
  loki_data:
  pgbackrest_data:
```

**Distribución de recursos en VM5**:

| Contenedor | RAM | CPU |
|------------|-----|-----|
| PG Replica | 8 GB | 1.5 cores |
| Prometheus | 2 GB | 0.5 cores |
| Grafana | 1 GB | 0.5 cores |
| Loki | 2 GB | 0.5 cores |
| Promtail | 512 MB | 0.25 cores |
| pgBackRest | 1 GB | 0.5 cores |
| Exporters | 384 MB | 0.2 cores |
| **Total** | **~15 GB** | **~4 cores** |

---

## 4. Red y Conectividad

### 4.1 Topología de Red

```
┌─────────────────────────────────────────────────────────────────┐
│                        RED INTERNA (10.x.x.x/24)                │
│                                                                  │
│  VM1 (Edge)           VM2 (App)           VM3 (Workers)         │
│  10.x.x.10            10.x.x.20           10.x.x.30            │
│  ├─ :80  (HTTP→HTTPS) ├─ :4800 (backend)  ├─ :3005 (flowise)   │
│  ├─ :443 (HTTPS)      ├─ :4801 (backend)  ├─ :3006 (flowise)   │
│  └─ :8550 (frontend)  ├─ :4802 (docs)     └─ :3010 (LB flowise)│
│                        ├─ :4812 (docs)                           │
│                        ├─ :4803 (remitos)                        │
│                        └─ :4813 (remitos)                        │
│                                                                  │
│  VM4 (Data)            VM5 (Backup/Mon)                          │
│  10.x.x.40             10.x.x.50                                │
│  ├─ :5432 (postgres)   ├─ :5433 (pg replica)                    │
│  ├─ :6379 (redis)      ├─ :3000 (grafana)                       │
│  ├─ :9000 (minio api)  ├─ :9090 (prometheus)                    │
│  └─ :9001 (minio ui)   └─ :3100 (loki)                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                          │
                    INTERNET (solo VM1 expone 80/443)
```

### 4.2 Reglas de Firewall (iptables / nftables)

| Origen | Destino | Puertos | Protocolo |
|--------|---------|---------|-----------|
| Internet | VM1 | 80, 443 | TCP |
| VM1 | VM2 | 4800-4813 | TCP |
| VM2 | VM4 | 5432, 6379, 9000 | TCP |
| VM2 | VM3 | 3005, 3006, 3010 | TCP |
| VM3 | VM4 | 5432, 6379, 9000 | TCP |
| VM4 | VM5 | 5432 (streaming replication) | TCP |
| VM5 | VM4 | 5432, 9000 (backup pulls) | TCP |
| VM5 | VM2, VM3 | 9100 (node-exporter) | TCP |
| Todas | VM5 | 3100 (loki logs) | TCP |

**Principio**: solo VM1 tiene IP pública. VM2-VM5 solo accesibles desde la red interna.

### 4.3 DNS

| Dominio | Apunta a | Servicio |
|---------|----------|----------|
| `bca-group.microsyst.com.ar` | VM1 IP pública | Frontend + API |
| `api.bca-group.microsyst.com.ar` | VM1 IP pública | API directa (opcional) |
| `minio.bca-group.microsyst.com.ar` | VM1 IP pública | MinIO (presigned URLs) |
| `grafana.bca-group.internal` | VM5 IP interna | Monitoring (solo VPN) |

---

## 5. Estrategia de Backups

### 5.1 PostgreSQL (pgBackRest)

| Tipo | Frecuencia | Retención | Destino |
|------|-----------|-----------|---------|
| Full backup | Semanal (domingo 02:00 AR) | 4 semanas | VM5 local + offsite |
| Differential | Diario (02:00 AR) | 14 días | VM5 local |
| WAL archiving | Continuo (streaming) | 7 días | VM5 local |

**RPO** (Recovery Point Objective): < 5 minutos (WAL streaming)  
**RTO** (Recovery Time Objective): < 30 minutos (restore de backup + WAL replay)

### 5.2 MinIO

| Tipo | Frecuencia | Retención | Herramienta |
|------|-----------|-----------|-------------|
| Incremental sync | Diario (03:00 AR) | N/A | `mc mirror` a VM5 |
| Full sync | Semanal (domingo 04:00 AR) | 2 copias | `mc mirror --overwrite` |

### 5.3 Redis

| Tipo | Frecuencia | Retención |
|------|-----------|-----------|
| RDB snapshot | Cada 15 min (si >100 keys changed) | 7 días |
| AOF | Continuo | Último archivo |

Redis es reconstituible: si se pierde, los workers de BullMQ re-procesan jobs pendientes. Los datos de cache se reconstruyen naturalmente.

### 5.4 Configuraciones y Secretos

| Qué | Frecuencia | Destino |
|-----|-----------|---------|
| docker-compose files | En cada cambio (git) | Repositorio Git |
| .env files | Diario | VM5 encrypted (age/sops) |
| JWT keys | En cada rotación | VM5 encrypted |
| Nginx configs | En cada cambio (git) | Repositorio Git |

---

## 6. Seguridad

### 6.1 Credenciales (NUNCA hardcodeadas)

| Secreto | Método de gestión |
|---------|-------------------|
| DB passwords | `.env` en cada VM, permisos 600 |
| JWT private/public keys | Montados como secrets de Docker |
| MinIO root password | `.env` con password fuerte |
| Redis password | `.env` (REQUIREPASS habilitado) |
| Flowise admin password | `.env` |
| Grafana admin password | `.env` |

**Rotación**: passwords cada 90 días, JWT keys cada 365 días.

### 6.2 Hardening por VM

**Todas las VMs**:
- SSH solo por key (PasswordAuthentication no)
- fail2ban activo
- unattended-upgrades para security patches
- UFW/nftables con default deny
- No root login vía SSH

**VM4 (Data)**:
- PostgreSQL: `pg_hba.conf` con whitelist de IPs (VM2, VM3, VM5)
- Redis: `requirepass` + bind solo a la interfaz interna
- MinIO: credenciales dedicadas, no `minioadmin:minioadmin`

**VM1 (Edge)**:
- Nginx: rate limiting, body size limit (50 MB max)
- SSL: TLS 1.2 mínimo, cipher suites modernos
- Headers de seguridad completos (CSP, HSTS, X-Frame, etc.)

### 6.3 Comunicación entre VMs

- Fase 1 (MVP): Red privada sin cifrado (confianza en la red interna)
- Fase 2: WireGuard mesh entre VMs para cifrar tráfico interno
- Fase 3: mTLS entre servicios (certificados por servicio)

---

## 7. Monitoreo y Alertas

### 7.1 Métricas a recolectar

**Infraestructura** (node-exporter en cada VM):
- CPU usage, load average
- RAM usage, swap usage
- Disco: uso, IOPS, latencia
- Red: throughput, errores, conexiones

**PostgreSQL** (postgres-exporter):
- Conexiones activas vs max_connections
- Queries por segundo
- Tuplas inserted/updated/deleted
- Cache hit ratio (debe ser >99%)
- Replication lag (VM4 → VM5)
- Table bloat, dead tuples
- Lock waits

**Redis** (redis-exporter):
- Memoria usada vs maxmemory
- Keys por DB
- Evictions por segundo
- Connected clients
- BullMQ queue lengths (jobs waiting, active, completed, failed)

**Aplicación** (endpoints /health + custom metrics):
- Response time p50, p95, p99
- Requests por segundo
- Error rate (5xx)
- WebSocket connections activas
- Queue backlog (jobs pendientes)
- Document validation throughput

**MinIO**:
- Espacio usado vs total
- Requests por segundo
- Errores de I/O

### 7.2 Dashboards Grafana

1. **Overview**: Estado general de las 5 VMs
2. **Application**: Response times, error rates, throughput
3. **Database**: Queries, connections, replication lag
4. **Queues**: BullMQ job lifecycle, backlogs, processing time
5. **Storage**: MinIO usage, growth trend
6. **Alerts**: Historial de alertas

### 7.3 Alertas Críticas

| Alerta | Condición | Severidad | Acción |
|--------|-----------|-----------|--------|
| VM down | No responde en 3 min | CRITICAL | Notificar + auto-restart |
| CPU > 90% | 5 min sostenido | WARNING | Investigar |
| RAM > 95% | 1 min | CRITICAL | Investigar, posible OOM |
| Disco > 85% | - | WARNING | Limpiar/expandir |
| Disco > 95% | - | CRITICAL | Expandir urgente |
| PG replication lag > 60s | 2 min | WARNING | Verificar red/carga |
| PG replication lag > 300s | 1 min | CRITICAL | Intervenir |
| PG connections > 350/400 | - | WARNING | Revisar connection pooling |
| Redis memory > 90% | - | WARNING | Revisar evictions |
| BullMQ backlog > 500 jobs | 10 min | WARNING | Escalar workers |
| BullMQ backlog > 2000 jobs | 5 min | CRITICAL | Investigar bloqueo |
| Error rate > 5% | 5 min | CRITICAL | Investigar |
| Response time p95 > 5s | 5 min | WARNING | Optimizar |
| Health check fail | 3 checks | CRITICAL | Auto-restart container |
| SSL cert < 14 days | - | WARNING | Renovar |
| MinIO > 80% | - | WARNING | Planificar expansión |

---

## 8. Proceso de Deploy (CI/CD)

### 8.1 Pipeline de Deploy

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Git Push │───▶│   Build  │───▶│   Test   │───▶│  Deploy  │───▶│  Verify  │
│  (main)  │    │ (Docker) │    │(Jest+E2E)│    │(Rolling) │    │ (Health) │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### 8.2 Rolling Deploy (Zero Downtime)

Para cada servicio con 2 réplicas:

```bash
# 1. Build nueva imagen
docker build -t bca/backend:v${VERSION} .

# 2. Deploy réplica 1 (mientras réplica 2 atiende tráfico)
docker stop bca_backend_1
docker rm bca_backend_1
docker run -d --name bca_backend_1 bca/backend:v${VERSION} ...

# 3. Esperar health check OK
until curl -sf http://localhost:4800/health; do sleep 2; done

# 4. Deploy réplica 2
docker stop bca_backend_2
docker rm bca_backend_2
docker run -d --name bca_backend_2 bca/backend:v${VERSION} ...

# 5. Verificar ambas réplicas
curl -sf http://localhost:4800/health
curl -sf http://localhost:4801/health
```

### 8.3 Rollback

```bash
# Rollback inmediato (imagen anterior taggeada)
docker stop bca_backend_1 bca_backend_2
docker run -d --name bca_backend_1 bca/backend:v${PREV_VERSION} ...
docker run -d --name bca_backend_2 bca/backend:v${PREV_VERSION} ...
```

**Política de retención de imágenes**: mantener las últimas 5 versiones taggeadas.

### 8.4 Migración de Base de Datos

```bash
# Las migraciones de Prisma se ejecutan ANTES del deploy de contenedores
# Solo desde una instancia (evitar race conditions)
docker exec bca_backend_1 npx prisma migrate deploy
```

---

## 9. Escalamiento Futuro

### 9.1 Escenarios de crecimiento

| Escenario | Equipos | Cambios necesarios |
|-----------|---------|-------------------|
| **Actual** | 100 | 1 servidor todo-en-uno |
| **Fase 1 (este plan)** | 1.500-2.000 | 5 VMs como se describe |
| **Fase 2** | 3.000-5.000 | Agregar VM2b (segundo app server), VM3b (más Flowise) |
| **Fase 3** | 5.000-10.000 | PG Cluster (Patroni), Redis Cluster, MinIO distributed |
| **Fase 4** | 10.000+ | Kubernetes, auto-scaling, CDN para archivos |

### 9.2 Cuellos de botella previsibles y soluciones

| Cuello de botella | Señal | Solución |
|-------------------|-------|----------|
| API saturada | p95 > 5s sostenido | Agregar VM2b con más réplicas |
| Flowise lento | Backlog > 1000 jobs | Agregar flowise-3 en VM3, o VM3b |
| PostgreSQL CPU | CPU > 80% sostenido | Mover reporting a read replica, optimizar queries |
| PostgreSQL conexiones | > 350 activas | Agregar PgBouncer (connection pooler) |
| MinIO lleno | > 80% disco | Expandir disco VM4 o agregar nodo MinIO |
| Redis memory | > 90% usado | Aumentar maxmemory, evaluar Redis Cluster |

### 9.3 Componentes opcionales para Fase 2

| Componente | Propósito | Cuándo agregar |
|------------|-----------|----------------|
| **PgBouncer** | Connection pooling para PG | >300 conexiones simultáneas |
| **Varnish/CDN** | Cache HTTP para archivos estáticos y presigned URLs | >100 req/s a MinIO |
| **WireGuard** | Cifrado de tráfico interno | Requisito de compliance |
| **Vault (HashiCorp)** | Gestión de secretos centralizada | Más de 5 VMs |
| **Registry privado** | Docker registry local | Si el build se hace en CI |

---

## 10. Migración desde Producción Actual

### 10.1 Provisioning del Host Windows + Hyper-V

| Paso | Acción | Duración |
|------|--------|----------|
| 1 | Instalar Windows Server 2022/2025 en host(s) físico(s) | 1 hora |
| 2 | Habilitar rol Hyper-V + herramientas de administración | 30 min |
| 3 | Crear External vSwitch vinculado al NIC físico | 15 min |
| 4 | Descargar ISO Ubuntu 24.04 LTS Server | 10 min |
| 5 | Crear las 5 VMs Gen2 con specs definidas (VHDX fijo) | 2 horas |
| 6 | Instalar Ubuntu 24.04 en cada VM | 1 hora |
| 7 | Configurar IPs estáticas (netplan), hostname, SSH keys | 1 hora |
| 8 | Instalar Docker + Docker Compose v2 en cada VM | 30 min |
| 9 | Deshabilitar checkpoints Hyper-V en todas las VMs | 10 min |

**Comandos Hyper-V (PowerShell en host Windows)** para crear una VM ejemplo:

```powershell
# Crear VM4 (Data Layer) - 8 vCPU, 64 GB RAM, 2 TB disco fijo
New-VM -Name "BCA-VM4-DATA" -Generation 2 -MemoryStartupBytes 64GB -SwitchName "BCA-vSwitch"
Set-VM -Name "BCA-VM4-DATA" -ProcessorCount 8 -StaticMemory -AutomaticCheckpointsEnabled $false
New-VHD -Path "D:\VMs\BCA-VM4-DATA\disk-os.vhdx" -SizeBytes 100GB -Fixed
New-VHD -Path "D:\VMs\BCA-VM4-DATA\disk-data.vhdx" -SizeBytes 2TB -Fixed
Add-VMHardDiskDrive -VMName "BCA-VM4-DATA" -Path "D:\VMs\BCA-VM4-DATA\disk-os.vhdx"
Add-VMHardDiskDrive -VMName "BCA-VM4-DATA" -Path "D:\VMs\BCA-VM4-DATA\disk-data.vhdx"
Set-VMFirmware -VMName "BCA-VM4-DATA" -SecureBootTemplate "MicrosoftUEFICertificateAuthority"
Add-VMDvdDrive -VMName "BCA-VM4-DATA" -Path "C:\ISOs\ubuntu-24.04-live-server-amd64.iso"
```

### 10.2 Plan de migración paso a paso

| Paso | Acción | Duración estimada | Downtime |
|------|--------|--------------------|----------|
| 1 | Provisioning host(s) Windows + Hyper-V + 5 VMs Ubuntu | 1 día | 0 |
| 2 | Configurar red interna, firewall, SSH keys en cada VM | 0.5 día | 0 |
| 3 | Levantar VM4 (data layer) vacía | 0.5 día | 0 |
| 4 | Migrar datos: pg_dump → pg_restore, mc mirror MinIO | 2-4 horas | 0 |
| 5 | Levantar VM3 (Flowise), restaurar flows | 1 hora | 0 |
| 6 | Levantar VM2 (apps), apuntando a VM4 | 1 hora | 0 |
| 7 | Test completo del ecosistema nuevo (sin tráfico real) | 1 día | 0 |
| 8 | Levantar VM5 (monitoring + replica) | 0.5 día | 0 |
| 9 | Configurar VM1 (Nginx), SSL, DNS | 0.5 día | 0 |
| 10 | **Cutover**: DNS switch + último pg_dump delta | 15-30 min | **15-30 min** |
| 11 | Verificación post-migración | 2 horas | 0 |
| 12 | Mantener servidor viejo como fallback 7 días | 7 días | 0 |

**Downtime total estimado**: 15-30 minutos (solo durante el cutover DNS).

### 10.3 Checklist pre-migración

- [ ] Host(s) Windows Server con Hyper-V habilitado
- [ ] vSwitch externo configurado, conectividad de red verificada
- [ ] 5 VMs Ubuntu 24.04 LTS creadas e instaladas (Gen2, VHDX fijo)
- [ ] Checkpoints deshabilitados en todas las VMs
- [ ] Todas las VMs accesibles por SSH desde la máquina de desarrollo
- [ ] Docker y Docker Compose v2 instalados en cada VM
- [ ] Red interna configurada y testeada (ping entre VMs)
- [ ] Firewall rules (UFW) aplicadas en cada VM
- [ ] JWT keys generadas/copiadas
- [ ] `.env` files creados en cada VM
- [ ] Certificados SSL disponibles (o Certbot configurado)
- [ ] DNS preparado (TTL reducido a 60s una semana antes)
- [ ] Backup completo del servidor actual verificado
- [ ] Plan de rollback documentado y testeado

### 10.4 Checklist post-migración

- [ ] Health checks de todos los servicios OK
- [ ] Login de usuario funcional
- [ ] Upload de documento funciona
- [ ] Validación AI procesa correctamente
- [ ] WebSocket connections activas
- [ ] Remitos procesando
- [ ] Cron jobs ejecutándose (solo en documentos-1)
- [ ] Monitoring recolectando métricas
- [ ] PG replication funcionando (lag < 10s)
- [ ] Backups automáticos configurados y testeados
- [ ] SSL funcionando correctamente
- [ ] Performance comparable o mejor que el servidor anterior

---

## 11. Infraestructura Física (On-Premise)

### 11.1 Plataforma de Virtualización

| Componente | Especificación |
|------------|---------------|
| **Hypervisor** | Hyper-V (incluido en Windows Server 2022/2025) |
| **Guest OS** | Ubuntu 24.04 LTS Server |
| **VM Generation** | Gen 2 (UEFI, Secure Boot) |
| **Disco VM** | VHDX tamaño fijo (mejor I/O que dinámico) |
| **Memoria** | Estática (sin dynamic memory, crítico para PostgreSQL) |
| **Checkpoints** | Deshabilitados en producción |

### 11.2 Opción recomendada: 2 Servidores Físicos

| Servidor | CPU | RAM | Disco | Licencia Windows | VMs |
|----------|-----|-----|-------|-------------------|-----|
| **Host A** (principal) | 20+ cores (Xeon E-2400 o similar) | 160 GB DDR5 ECC | 2× NVMe 2 TB + 1× HDD 4 TB | Windows Server 2022 Standard | VM1, VM2, VM3, VM4 |
| **Host B** (backup) | 8+ cores (Xeon E-2300 o similar) | 32 GB DDR5 ECC | 1× SSD 500 GB + 1× HDD 2 TB | Windows Server 2022 Standard | VM5 |

Separar VM5 (backup/monitoring) en un host diferente garantiza que si Host A falla, la réplica de PostgreSQL y los backups están a salvo.

### 11.3 Opción alternativa: 1 Servidor Físico

| Servidor | CPU | RAM | Disco | Licencia Windows |
|----------|-----|-----|-------|-------------------|
| **Host único** | 32+ cores (dual Xeon o Xeon W) | 192 GB DDR5 ECC | 2× NVMe 2 TB (RAID-1) + 1× HDD 4 TB | Windows Server 2022 Standard |

Menor costo pero sin redundancia de host. Si el servidor falla, todo el ecosistema se detiene.

### 11.4 Configuración de Red en Host Windows

```
┌─────────────────────────────────────────────┐
│           HOST WINDOWS (Hyper-V)            │
│                                              │
│  NIC Físico ──► External vSwitch "BCA-vSw"  │
│                      │                       │
│         ┌────────────┼────────────┐          │
│         │            │            │          │
│      VM1 (eth0)  VM2 (eth0)  VM3 (eth0)    │
│      10.x.x.10  10.x.x.20  10.x.x.30      │
│                  VM4 (eth0)  VM5 (eth0)     │
│                  10.x.x.40  10.x.x.50      │
│                                              │
│  Todas las VMs conectadas al mismo vSwitch  │
│  IPs estáticas configuradas con netplan     │
└─────────────────────────────────────────────┘
```

**Netplan ejemplo** (en cada VM Ubuntu):

```yaml
# /etc/netplan/00-installer-config.yaml
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - 10.x.x.10/24     # IP estática de la VM
      routes:
        - to: default
          via: 10.x.x.1    # Gateway
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

### 11.5 Costos Estimados (Hardware)

| Item | Opción 2 hosts | Opción 1 host |
|------|---------------|---------------|
| Servidor(es) | ~USD 8.000-12.000 | ~USD 6.000-9.000 |
| RAM adicional (si no incluida) | ~USD 500-1.500 | ~USD 800-2.000 |
| Storage NVMe 4 TB total | ~USD 400-600 | ~USD 400-600 |
| Storage HDD 4-6 TB | ~USD 150-300 | ~USD 100-200 |
| Licencia Windows Server 2022 Std | ~USD 1.000-1.200 ×2 | ~USD 1.000-1.200 |
| Networking (switch, cables, UPS) | ~USD 700-1.200 | ~USD 500-800 |
| **Total estimado** | **~USD 11.000-17.000** | **~USD 9.000-14.000** |

**Costo operativo mensual**: electricidad (~USD 50-100/mes por servidor), sin licencias recurrentes (Windows Server es perpetua).

---

## 12. Resumen Ejecutivo

### Lo que se gana vs. el setup actual

| Aspecto | Actual (1 servidor) | Propuesto (5 VMs) |
|---------|---------------------|-------------------|
| Capacidad | ~100 equipos | 1.500-2.000 equipos |
| Alta disponibilidad | No (SPOF) | Parcial (réplicas de app, PG replica) |
| Zero-downtime deploy | No | Sí (rolling deploy) |
| Monitoring | Ninguno | Prometheus + Grafana + Loki |
| Backups | Manual (pg_dump) | Automatizado (pgBackRest + WAL) |
| RPO | Horas/días | < 5 minutos |
| RTO | Horas | < 30 minutos |
| Seguridad | Básica | Hardened (firewall, separación, credentials) |
| AI throughput | 1 Flowise (3 concurrent) | 2 Flowise (6 concurrent) |
| Escalabilidad | Vertical (limitada) | Horizontal (agregar VMs) |

### Diagrama final de la arquitectura

```
                    INTERNET
                       │
                 ┌─────▼─────┐
                 │   VM1      │  4 vCPU │ 8 GB
                 │   EDGE     │  Nginx + SSL + Frontend
                 │ :80 :443   │  Rate limiting, Security headers
                 └──┬──┬──┬──┘
            ┌──────┘  │  └──────┐
            ▼         ▼         ▼
     ┌──────────┐          ┌──────────┐
     │   VM2    │          │   VM3    │  8 vCPU │ 32 GB
     │   APP    │ 8 vCPU   │ WORKERS  │  Flowise ×2
     │ 32 GB    │          │   AI     │  PDF processing
     │          │          │          │
     │ Backend  ×2         │ flowise-1│
     │ Docs     ×2 ◄──────│ flowise-2│
     │ Remitos  ×2         └────┬─────┘
     └────┬─────┘               │
          │                     │
          ▼                     ▼
     ┌──────────────────────────────┐
     │          VM4 - DATA          │  8 vCPU │ 64 GB │ 2 TB NVMe
     │                              │
     │  PostgreSQL 16 (primary)     │  shared_buffers=16GB
     │  Redis 7 (8 GB maxmem)      │  BullMQ queues
     │  MinIO (object storage)      │  ~1 TB archivos
     │                              │
     └──────────┬───────────────────┘
                │ WAL streaming
                ▼
     ┌──────────────────────────────┐
     │      VM5 - BACKUP/MON       │  4 vCPU │ 16 GB │ 2 TB HDD
     │                              │
     │  PG Read Replica             │  Reporting queries
     │  pgBackRest                  │  Full + diff + WAL
     │  Prometheus + Grafana + Loki │  Dashboards + Alerts
     │                              │
     └──────────────────────────────┘
```

---

**Próximos pasos**:
1. Adquirir servidor(es) físico(s) con las specs definidas
2. Instalar Windows Server 2022/2025 + habilitar Hyper-V
3. Crear las 5 VMs Ubuntu 24.04 LTS (Gen2, VHDX fijo, memoria estática)
4. Definir IPs estáticas y configurar red (vSwitch + netplan)
5. Generar los docker-compose y `.env` definitivos para cada VM
6. Ejecutar plan de migración
7. Planificar ventana de cutover (15-30 min de downtime)
